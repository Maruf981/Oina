import asyncio
import logging
import os

import httpx
from aiogram import Bot, Dispatcher, F
from aiogram.types import Message
from dotenv import load_dotenv

from knowledge_base import SYSTEM_PROMPT, TOOLS

load_dotenv()

logging.basicConfig(level=logging.INFO)

BOT_TOKEN = os.getenv("BOT_TOKEN_CLIENT")
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
CLAUDE_MODEL = "claude-sonnet-4-6"
API_URL = os.getenv("API_URL", "https://oina.onrender.com")

bot = Bot(token=BOT_TOKEN)
dp = Dispatcher()

# Простая память диалога в оперативной памяти процесса: user_id -> список сообщений.
# Сбрасывается при перезапуске бота. Для продакшена этого достаточно на первом этапе.
conversation_history: dict[int, list[dict]] = {}
MAX_HISTORY_MESSAGES = 12  # храним последние N сообщений диалога (и user, и assistant)


async def fetch_backend(path: str, params: dict) -> dict | list | None:
    """GET-запрос к backend с повторными попытками при 429 (временный троттлинг Render free-тарифа)."""
    async with httpx.AsyncClient(timeout=15) as client:
        for attempt in range(3):
            try:
                response = await client.get(f"{API_URL}{path}", params=params)
            except Exception as e:
                logging.error(f"Backend request error: {e}")
                return None
            if response.status_code == 200:
                return response.json()
            if response.status_code == 429 and attempt < 2:
                await asyncio.sleep(1.5 * (attempt + 1))
                continue
            logging.error(f"Backend request failed: {response.status_code} {response.text}")
            return None
    return None


async def lookup_order_by_phone(phone: str) -> list:
    result = await fetch_backend("/orders/lookup", {"phone": phone})
    return result if isinstance(result, list) else []


async def search_products(query: str = "", color: str = "", size: str = "") -> list:
    params = {}
    if query:
        params["search"] = query
    if color:
        params["color"] = color
    if size:
        params["size"] = size

    products = await fetch_backend("/products/", params)
    if not isinstance(products, list):
        return []

    simplified = []
    for p in products[:10]:
        available = [
            {"variant_id": v["id"], "size": v["size"], "color": v["color"]}
            for v in p.get("variants", [])
            if v.get("stock", 0) > 0
        ]
        simplified.append({
            "title": p.get("title_ru"),
            "catalog_number": p.get("catalog_number"),
            "price": p.get("price"),
            "available_variants": available,
        })
    return simplified


async def place_order(variant_id: int, quantity: int, customer_name: str, customer_phone: str, delivery_address: str) -> dict:
    payload = {
        "customer_name": customer_name,
        "customer_phone": customer_phone,
        "delivery_address": delivery_address,
        "comment": "",
        "payment_method": "qr",
        "items": [{"product_variant_id": variant_id, "quantity": quantity}],
    }
    async with httpx.AsyncClient(timeout=15) as client:
        for attempt in range(3):
            try:
                response = await client.post(f"{API_URL}/orders/", json=payload)
            except Exception as e:
                logging.error(f"Order placement error: {e}")
                return {"error": "Ошибка соединения с сервером"}
            if response.status_code == 200:
                return response.json()
            if response.status_code == 429 and attempt < 2:
                await asyncio.sleep(1.5 * (attempt + 1))
                continue
            try:
                detail = response.json().get("detail", response.text)
            except Exception:
                detail = response.text
            return {"error": detail}
    return {"error": "Не удалось оформить заказ, попробуйте позже"}


async def call_claude_api(history: list[dict]) -> dict:
    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.post(
            "https://api.anthropic.com/v1/messages",
            headers={
                "x-api-key": ANTHROPIC_API_KEY,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            },
            json={
                "model": CLAUDE_MODEL,
                "max_tokens": 700,
                "system": SYSTEM_PROMPT,
                "tools": TOOLS,
                "messages": history,
            },
        )
    if response.status_code != 200:
        logging.error(f"Claude API error: {response.status_code} {response.text}")
        return {}
    return response.json()


async def ask_claude(user_id: int, user_message: str) -> str:
    history = conversation_history.setdefault(user_id, [])
    history.append({"role": "user", "content": user_message})
    history = history[-MAX_HISTORY_MESSAGES:]

    max_tool_rounds = 3
    data = {}
    for _ in range(max_tool_rounds):
        data = await call_claude_api(history)
        if not data:
            return "Извините, сейчас не могу ответить. Попробуйте чуть позже или напишите нам напрямую."

        content_blocks = data.get("content", [])

        if data.get("stop_reason") != "tool_use":
            break

        history.append({"role": "assistant", "content": content_blocks})

        tool_results = []
        for block in content_blocks:
            if block.get("type") != "tool_use":
                continue
            if block.get("name") == "lookup_order_by_phone":
                phone = block.get("input", {}).get("phone", "")
                orders = await lookup_order_by_phone(phone)
                tool_results.append({
                    "type": "tool_result",
                    "tool_use_id": block.get("id"),
                    "content": str(orders) if orders else "Заказов с таким номером не найдено.",
                })
            elif block.get("name") == "place_order":
                tool_input = block.get("input", {})
                order_result = await place_order(
                    variant_id=tool_input.get("variant_id"),
                    quantity=tool_input.get("quantity", 1),
                    customer_name=tool_input.get("customer_name", ""),
                    customer_phone=tool_input.get("customer_phone", ""),
                    delivery_address=tool_input.get("delivery_address", ""),
                )
                tool_results.append({
                    "type": "tool_result",
                    "tool_use_id": block.get("id"),
                    "content": str(order_result),
                })
            elif block.get("name") == "search_products":
                tool_input = block.get("input", {})
                products = await search_products(
                    query=tool_input.get("query", ""),
                    color=tool_input.get("color", ""),
                    size=tool_input.get("size", ""),
                )
                tool_results.append({
                    "type": "tool_result",
                    "tool_use_id": block.get("id"),
                    "content": str(products) if products else "Товары не найдены.",
                })

        history.append({"role": "user", "content": tool_results})

    reply_text = "".join(
        block.get("text", "") for block in data.get("content", []) if block.get("type") == "text"
    ).strip()

    if not reply_text:
        reply_text = "Извините, не удалось сформировать ответ. Попробуйте переформулировать вопрос."

    history.append({"role": "assistant", "content": reply_text})
    conversation_history[user_id] = history[-MAX_HISTORY_MESSAGES:]

    return reply_text


@dp.message(F.text == "/start")
async def start_handler(message: Message):
    conversation_history.pop(message.from_user.id, None)
    await message.answer(
        "Здравствуйте! 👋 Я помощник Oina.tj.\n\n"
        "Могу ответить на вопросы о доставке, оплате, возврате и обмене товара.\n"
        "Просто напишите свой вопрос."
    )


@dp.message(F.text == "/reset")
async def reset_handler(message: Message):
    conversation_history.pop(message.from_user.id, None)
    await message.answer("Диалог сброшен. Задайте новый вопрос.")


@dp.message(F.text)
async def text_handler(message: Message):
    await bot.send_chat_action(message.chat.id, "typing")
    reply = await ask_claude(message.from_user.id, message.text)
    await message.answer(reply)


from aiohttp import web
from aiogram.webhook.aiohttp_server import SimpleRequestHandler, setup_application

WEBHOOK_PATH = "/webhook"
WEBHOOK_BASE_URL = os.getenv("RENDER_EXTERNAL_URL", "https://oina-client-bot.onrender.com")
WEBHOOK_URL = f"{WEBHOOK_BASE_URL}{WEBHOOK_PATH}"


async def health_check(request):
    return web.Response(text="Bot is running")


async def on_startup(bot: Bot):
    await bot.set_webhook(WEBHOOK_URL)
    logging.info(f"Webhook set to {WEBHOOK_URL}")


async def on_shutdown(bot: Bot):
    await bot.delete_webhook()


async def main():
    dp.startup.register(on_startup)
    dp.shutdown.register(on_shutdown)

    app = web.Application()
    app.router.add_get("/", health_check)

    webhook_handler = SimpleRequestHandler(dispatcher=dp, bot=bot)
    webhook_handler.register(app, path=WEBHOOK_PATH)
    setup_application(app, dp, bot=bot)

    runner = web.AppRunner(app)
    await runner.setup()
    port = int(os.getenv("PORT", 8080))
    site = web.TCPSite(runner, "0.0.0.0", port)
    await site.start()

    await asyncio.Event().wait()


if __name__ == "__main__":
    asyncio.run(main())
