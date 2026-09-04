import asyncio
import logging
import os

import httpx
from aiogram import Bot, Dispatcher, F
from aiogram.types import Message
from dotenv import load_dotenv

from knowledge_base import SYSTEM_PROMPT

load_dotenv()

logging.basicConfig(level=logging.INFO)

BOT_TOKEN = os.getenv("BOT_TOKEN_CLIENT")
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
CLAUDE_MODEL = "claude-sonnet-4-6"

bot = Bot(token=BOT_TOKEN)
dp = Dispatcher()

# Простая память диалога в оперативной памяти процесса: user_id -> список сообщений.
# Сбрасывается при перезапуске бота. Для продакшена этого достаточно на первом этапе.
conversation_history: dict[int, list[dict]] = {}
MAX_HISTORY_MESSAGES = 12  # храним последние N сообщений диалога (и user, и assistant)


async def ask_claude(user_id: int, user_message: str) -> str:
    history = conversation_history.setdefault(user_id, [])
    history.append({"role": "user", "content": user_message})
    history = history[-MAX_HISTORY_MESSAGES:]

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
                "max_tokens": 500,
                "system": SYSTEM_PROMPT,
                "messages": history,
            },
        )

    if response.status_code != 200:
        logging.error(f"Claude API error: {response.status_code} {response.text}")
        return "Извините, сейчас не могу ответить. Попробуйте чуть позже или напишите нам напрямую."

    data = response.json()
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


async def health_check(request):
    return web.Response(text="Bot is running")


async def start_web_server():
    app = web.Application()
    app.router.add_get("/", health_check)
    runner = web.AppRunner(app)
    await runner.setup()
    port = int(os.getenv("PORT", 8080))
    site = web.TCPSite(runner, "0.0.0.0", port)
    await site.start()


async def main():
    await start_web_server()
    await dp.start_polling(bot)


if __name__ == "__main__":
    asyncio.run(main())
