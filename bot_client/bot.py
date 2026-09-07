import asyncio
import logging
import os

import httpx
from aiogram import Bot, Dispatcher, F
from aiogram.types import Message, CallbackQuery, ReplyKeyboardMarkup, KeyboardButton, InlineKeyboardMarkup, InlineKeyboardButton
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
awaiting_reset_phone: set[int] = set()  # user_id, ожидающие ввода телефона для сброса пароля
user_flow: dict[int, dict] = {}  # user_id -> состояние многошаговых сценариев (статус/поиск/отмена)
MAX_HISTORY_MESSAGES = 12  # храним последние N сообщений диалога (и user, и assistant)

MENU_ORDER_STATUS = "📦 Статус заказа"
MENU_CANCEL_RETURN = "❌ Отмена / возврат заказа"
MENU_EXCHANGE = "🔄 Обмен размера/цвета"
MENU_SEARCH = "🔍 Найти товар"
MENU_RESET_PASS = "🔑 Забыли пароль"
MENU_ASK = "💬 Задать вопрос"
MENU_TEXTS = {MENU_ORDER_STATUS, MENU_CANCEL_RETURN, MENU_EXCHANGE, MENU_SEARCH, MENU_RESET_PASS, MENU_ASK}

MAIN_MENU = ReplyKeyboardMarkup(
    keyboard=[
        [KeyboardButton(text=MENU_ORDER_STATUS), KeyboardButton(text=MENU_CANCEL_RETURN)],
        [KeyboardButton(text=MENU_EXCHANGE), KeyboardButton(text=MENU_SEARCH)],
        [KeyboardButton(text=MENU_RESET_PASS), KeyboardButton(text=MENU_ASK)],
    ],
    resize_keyboard=True,
)

CONTACT_SHARE_MENU = ReplyKeyboardMarkup(
    keyboard=[
        [KeyboardButton(text="📱 Поделиться номером телефона", request_contact=True)],
        [KeyboardButton(text=MENU_ORDER_STATUS), KeyboardButton(text=MENU_CANCEL_RETURN)],
        [KeyboardButton(text=MENU_EXCHANGE), KeyboardButton(text=MENU_SEARCH)],
        [KeyboardButton(text=MENU_RESET_PASS), KeyboardButton(text=MENU_ASK)],
    ],
    resize_keyboard=True,
)

STATUS_LABELS_RU = {
    "new": "Новый",
    "awaiting_payment": "Ожидает оплаты",
    "paid": "Оплачен",
    "confirmed": "Подтверждён",
    "shipped": "Отправлен",
    "delivered": "Доставлен",
    "cancelled": "Отменён",
    "returned": "Возврат",
}

# Сценарии, внутри которых свободный текст (не команда меню) не должен уходить в ИИ-чат,
# а должен либо обрабатываться самим сценарием, либо получать напоминание вернуться к кнопкам.
CANCEL_FLOW_STATES = {"cancel_order_number", "cancel_phone", "cancel_choose", "cancel_qty", "cancel_confirm"}
EXCHANGE_FLOW_STATES = {"exchange_order_number", "exchange_phone", "exchange_item_choose", "exchange_city", "exchange_size", "exchange_color"}


async def fetch_backend(path: str, params: dict | None = None) -> dict | list | None:
    """GET-запрос к backend с повторными попытками при 429 (временный троттлинг Render free-тарифа)."""
    delays = [3, 6, 10]
    async with httpx.AsyncClient(timeout=15) as client:
        for attempt in range(len(delays) + 1):
            try:
                response = await client.get(f"{API_URL}{path}", params=params or {})
            except Exception as e:
                logging.error(f"Backend request error: {e}")
                return None
            if response.status_code == 200:
                return response.json()
            if response.status_code == 429 and attempt < len(delays):
                await asyncio.sleep(delays[attempt])
                continue
            logging.error(f"Backend request failed: {response.status_code} {response.text}")
            return None
    return None


async def post_backend(path: str, json_body: dict) -> tuple[int, dict | None]:
    """POST-запрос к backend, возвращает (статус_код, тело_ответа)."""
    delays = [3, 6, 10]
    async with httpx.AsyncClient(timeout=15) as client:
        for attempt in range(len(delays) + 1):
            try:
                response = await client.post(f"{API_URL}{path}", json=json_body)
            except Exception as e:
                logging.error(f"Backend POST error: {e}")
                return 0, None
            if response.status_code == 429 and attempt < len(delays):
                await asyncio.sleep(delays[attempt])
                continue
            try:
                body = response.json()
            except Exception:
                body = None
            return response.status_code, body
    return 0, None


async def patch_backend(path: str) -> tuple[int, dict | None]:
    """PATCH-запрос к backend без тела (query-параметры уже в path), возвращает (статус_код, тело_ответа)."""
    delays = [3, 6, 10]
    async with httpx.AsyncClient(timeout=15) as client:
        for attempt in range(len(delays) + 1):
            try:
                response = await client.patch(f"{API_URL}{path}")
            except Exception as e:
                logging.error(f"Backend PATCH error: {e}")
                return 0, None
            if response.status_code == 429 and attempt < len(delays):
                await asyncio.sleep(delays[attempt])
                continue
            try:
                body = response.json()
            except Exception:
                body = None
            return response.status_code, body
    return 0, None


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
    delays = [3, 6, 10]
    async with httpx.AsyncClient(timeout=15) as client:
        for attempt in range(len(delays) + 1):
            try:
                response = await client.post(f"{API_URL}/orders/", json=payload)
            except Exception as e:
                logging.error(f"Order placement error: {e}")
                return {"error": "Ошибка соединения с сервером"}
            if response.status_code == 200:
                return response.json()
            if response.status_code == 429 and attempt < len(delays):
                await asyncio.sleep(delays[attempt])
                continue
            try:
                detail = response.json().get("detail", response.text)
            except Exception:
                detail = response.text
            return {"error": detail}
    return {"error": "Не удалось оформить заказ, попробуйте позже"}


async def link_telegram_silent(phone: str, telegram_id: int) -> dict | None:
    delays = [3, 6, 10]
    async with httpx.AsyncClient(timeout=15) as client:
        for attempt in range(len(delays) + 1):
            try:
                response = await client.post(
                    f"{API_URL}/auth/link-telegram-silent",
                    json={"phone": phone, "telegram_id": telegram_id},
                )
            except Exception as e:
                logging.error(f"Silent link telegram error: {e}")
                return None
            if response.status_code == 200:
                return response.json()
            if response.status_code == 429 and attempt < len(delays):
                await asyncio.sleep(delays[attempt])
                continue
            logging.error(f"Silent link telegram failed: {response.status_code} {response.text}")
            return None
    return None


async def link_telegram_and_get_code(phone: str, telegram_id: int) -> dict | None:
    delays = [3, 6, 10]
    async with httpx.AsyncClient(timeout=15) as client:
        for attempt in range(len(delays) + 1):
            try:
                response = await client.post(
                    f"{API_URL}/auth/link-telegram",
                    json={"phone": phone, "telegram_id": telegram_id},
                )
            except Exception as e:
                logging.error(f"Link telegram error: {e}")
                return None
            if response.status_code == 200:
                return response.json()
            if response.status_code == 429 and attempt < len(delays):
                await asyncio.sleep(delays[attempt])
                continue
            if response.status_code == 404:
                return {"error": "not_found"}
            logging.error(f"Link telegram failed: {response.status_code} {response.text}")
            return None
    return None


async def request_exchange(order_id: int, phone: str, is_dushanbe: bool, current_item: str, desired_size: str, desired_color: str, availability_note: str) -> tuple[int, dict | None]:
    return await post_backend(
        f"/orders/{order_id}/exchange-request",
        {
            "phone": phone,
            "is_dushanbe": is_dushanbe,
            "current_item": current_item,
            "desired_size": desired_size,
            "desired_color": desired_color,
            "availability_note": availability_note,
        },
    )


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


def format_order_summary(order: dict) -> str:
    status = STATUS_LABELS_RU.get(order.get("status"), order.get("status"))
    lines = [f"Заказ №{order.get('id')} — {status} — {order.get('total')} смн"]
    for item in order.get("items", []):
        v = item.get("variant") or {}
        title = v.get("title_ru", "Товар")
        returned_qty = item.get("returned_quantity", 0)
        qty = item.get("quantity", 1)
        note = f" (возвращено {returned_qty} из {qty})" if returned_qty else ""
        lines.append(f"  — {title} ({v.get('color', '')}, {v.get('size', '')}) x{qty}{note}")
    return "\n".join(lines)


def build_cancel_keyboard(order: dict, items: list[dict]) -> InlineKeyboardMarkup | None:
    buttons = []
    if order.get("status") in ("new", "awaiting_payment", "paid", "confirmed"):
        buttons.append([InlineKeyboardButton(text="Отменить весь заказ", callback_data="cancel_whole")])
    for item in items:
        remaining = item["quantity"] - item["returned_quantity"]
        if remaining <= 0:
            continue
        label = f"Вернуть: {item['title']} (x{remaining})" if remaining > 1 else f"Вернуть: {item['title']}"
        buttons.append([InlineKeyboardButton(text=label, callback_data=f"return_item:{item['id']}")])
    if not buttons:
        return None
    return InlineKeyboardMarkup(inline_keyboard=buttons)


@dp.message(F.text == "/start")
async def start_handler(message: Message):
    conversation_history.pop(message.from_user.id, None)
    user_flow.pop(message.from_user.id, None)
    awaiting_reset_phone.discard(message.from_user.id)
    await message.answer(
        "Здравствуйте! 👋 Я помощник Oina.tj.\n\n"
        "Поделитесь номером телефона (кнопка ниже) — тогда мы сможем присылать вам "
        "уведомления о статусе заказа прямо сюда. Это необязательно, можно и без этого.\n\n"
        "Выберите нужный пункт в меню, или просто напишите свой вопрос.",
        reply_markup=CONTACT_SHARE_MENU,
    )


@dp.message(F.contact)
async def contact_handler(message: Message):
    contact = message.contact
    if contact.user_id and contact.user_id != message.from_user.id:
        # прислан контакт другого человека, а не свой — игнорируем
        await message.answer("Пожалуйста, поделитесь именно своим номером через кнопку.")
        return

    phone = contact.phone_number.lstrip("+")
    if phone.startswith("992"):
        phone = phone[3:]

    result = await link_telegram_silent(phone, message.from_user.id)
    if result and result.get("linked"):
        await message.answer(
            "Спасибо! Теперь мы сможем присылать вам уведомления о статусе заказа сюда.",
            reply_markup=MAIN_MENU,
        )
    else:
        await message.answer(
            "Не нашли аккаунт с таким номером на сайте — ничего страшного, можно продолжить и без этого.",
            reply_markup=MAIN_MENU,
        )


@dp.message(F.text == "/reset")
async def reset_handler(message: Message):
    conversation_history.pop(message.from_user.id, None)
    await message.answer("Диалог сброшен. Задайте новый вопрос.")


@dp.message(F.text == "/resetpass")
async def reset_password_handler(message: Message):
    user_flow.pop(message.from_user.id, None)
    awaiting_reset_phone.add(message.from_user.id)
    await message.answer(
        "Введите номер телефона, привязанный к вашему аккаунту на сайте Oina.tj "
        "(например 900123456), чтобы получить код для сброса пароля."
    )


@dp.message(F.text == MENU_ORDER_STATUS)
async def menu_order_status(message: Message):
    awaiting_reset_phone.discard(message.from_user.id)
    user_flow[message.from_user.id] = {"flow": "order_status_phone"}
    await message.answer("Введите номер телефона, на который оформлен заказ.")


@dp.message(F.text == MENU_SEARCH)
async def menu_search(message: Message):
    awaiting_reset_phone.discard(message.from_user.id)
    user_flow[message.from_user.id] = {"flow": "search_query"}
    await message.answer("Что ищем? Напишите название товара (например «куртка»).")


@dp.message(F.text == MENU_RESET_PASS)
async def menu_reset_pass(message: Message):
    user_flow.pop(message.from_user.id, None)
    awaiting_reset_phone.add(message.from_user.id)
    await message.answer(
        "Введите номер телефона, привязанный к вашему аккаунту на сайте Oina.tj "
        "(например 900123456), чтобы получить код для сброса пароля."
    )


@dp.message(F.text == MENU_ASK)
async def menu_ask(message: Message):
    awaiting_reset_phone.discard(message.from_user.id)
    user_flow.pop(message.from_user.id, None)
    await message.answer("Напишите ваш вопрос — я постараюсь помочь.")


@dp.message(F.text == MENU_EXCHANGE)
async def menu_exchange(message: Message):
    awaiting_reset_phone.discard(message.from_user.id)
    user_flow[message.from_user.id] = {"flow": "exchange_order_number"}
    await message.answer(
        "Обмен размера или цвета возможен в течение 24 часов после доставки (для Душанбе) "
        "или 48 часов (для других районов).\n\n"
        "⚠️ Важное условие: товар должен быть в новом состоянии — без следов использования, "
        "с бирками (если они были на товаре изначально). Иначе в обмене может быть отказано.\n\n"
        "Введите номер заказа."
    )


@dp.message(F.text == MENU_CANCEL_RETURN)
async def menu_cancel_return(message: Message):
    awaiting_reset_phone.discard(message.from_user.id)
    user_flow[message.from_user.id] = {"flow": "cancel_order_number"}
    await message.answer("Введите номер заказа, который хотите отменить или вернуть (например 26).")


@dp.callback_query(F.data == "cancel_whole")
async def cb_cancel_whole(callback: CallbackQuery):
    uid = callback.from_user.id
    flow = user_flow.get(uid)
    if not flow or flow.get("flow") != "cancel_choose":
        await callback.answer("Сессия истекла, начните заново.", show_alert=True)
        return
    flow["flow"] = "cancel_confirm"
    flow["pending"] = {"action": "cancel_whole"}
    keyboard = InlineKeyboardMarkup(inline_keyboard=[[
        InlineKeyboardButton(text="Да, отменить весь заказ", callback_data="confirm_yes"),
        InlineKeyboardButton(text="Не надо", callback_data="confirm_no"),
    ]])
    await callback.message.answer(
        f"Подтвердите: отменить заказ №{flow['order_id']} целиком?",
        reply_markup=keyboard,
    )
    await callback.answer()


@dp.callback_query(F.data.startswith("return_item:"))
async def cb_return_item(callback: CallbackQuery):
    uid = callback.from_user.id
    flow = user_flow.get(uid)
    if not flow or flow.get("flow") != "cancel_choose":
        await callback.answer("Сессия истекла, начните заново.", show_alert=True)
        return
    item_id = int(callback.data.split(":")[1])
    item = next((i for i in flow.get("items", []) if i["id"] == item_id), None)
    if not item:
        await callback.answer("Позиция не найдена.", show_alert=True)
        return
    remaining = item["quantity"] - item["returned_quantity"]
    logging.info(f"[DEBUG cb_return_item] uid={uid} item_id={item_id} remaining={remaining}")

    if remaining > 1:
        flow["flow"] = "cancel_qty"
        flow["pending_item_id"] = item_id
        flow["pending_remaining"] = remaining
        await callback.message.answer(
            f"«{item['title']}» — в заказе {remaining} шт. Сколько единиц вернуть? Напишите число от 1 до {remaining}."
        )
        await callback.answer()
        return

    flow["flow"] = "cancel_confirm"
    flow["pending"] = {"action": "return_item", "item_id": item_id, "quantity": 1}
    keyboard = InlineKeyboardMarkup(inline_keyboard=[[
        InlineKeyboardButton(text="Да, вернуть", callback_data="confirm_yes"),
        InlineKeyboardButton(text="Не надо", callback_data="confirm_no"),
    ]])
    await callback.message.answer(
        f"Подтвердите возврат: «{item['title']}»?",
        reply_markup=keyboard,
    )
    await callback.answer()


@dp.callback_query(F.data.startswith("exchange_item:"))
async def cb_exchange_item(callback: CallbackQuery):
    uid = callback.from_user.id
    flow = user_flow.get(uid)
    if not flow or flow.get("flow") != "exchange_item_choose":
        await callback.answer("Сессия истекла, начните заново.", show_alert=True)
        return
    item_id = int(callback.data.split(":")[1])
    item = next((i for i in flow.get("items", []) if i["id"] == item_id), None)
    if not item:
        await callback.answer("Товар не найден.", show_alert=True)
        return

    flow["current_item"] = f"{item['title']} ({item['color']}, {item['size']})"
    flow["current_catalog_number"] = item.get("catalog_number", "")
    flow["flow"] = "exchange_city"
    keyboard = InlineKeyboardMarkup(inline_keyboard=[[
        InlineKeyboardButton(text="Душанбе", callback_data="exchange_city:dushanbe"),
        InlineKeyboardButton(text="Другой город", callback_data="exchange_city:other"),
    ]])
    await callback.message.answer("Вы находитесь в Душанбе или в другом городе?", reply_markup=keyboard)
    await callback.answer()


@dp.callback_query(F.data.in_(["exchange_city:dushanbe", "exchange_city:other"]))
async def cb_exchange_city(callback: CallbackQuery):
    uid = callback.from_user.id
    flow = user_flow.get(uid)
    if not flow or flow.get("flow") != "exchange_city":
        await callback.answer("Сессия истекла, начните заново.", show_alert=True)
        return
    flow["is_dushanbe"] = callback.data == "exchange_city:dushanbe"
    flow["flow"] = "exchange_size"
    await callback.message.answer("Какой размер вам нужен?")
    await callback.answer()


@dp.callback_query(F.data.in_(["confirm_yes", "confirm_no"]))
async def cb_confirm(callback: CallbackQuery):
    uid = callback.from_user.id
    flow = user_flow.get(uid)
    if not flow or flow.get("flow") != "cancel_confirm":
        await callback.answer("Уже обработано или сессия истекла.", show_alert=True)
        return

    # Сразу убираем состояние сценария — защита от двойного нажатия кнопки
    # или повторной доставки того же callback от Telegram (webhook retry).
    user_flow.pop(uid, None)
    await callback.answer()

    if callback.data == "confirm_no":
        await callback.message.answer("Хорошо, отменено. Ничего не изменилось.")
        return

    pending = flow.get("pending", {})
    order_id = flow["order_id"]
    phone = flow["phone"]
    logging.info(f"[DEBUG cb_confirm] uid={uid} pending={pending}")

    if pending.get("action") == "cancel_whole":
        status_code, body = await post_backend(f"/orders/{order_id}/cancel-request", {"phone": phone})
        if status_code == 200:
            await callback.message.answer(f"✅ Заказ №{order_id} отменён.")
        else:
            detail = (body or {}).get("detail", "Не удалось отменить заказ.")
            await callback.message.answer(f"⚠️ {detail}")
    elif pending.get("action") == "return_item":
        item_id = pending["item_id"]
        quantity = pending.get("quantity")
        status_code, body = await post_backend(
            f"/orders/{order_id}/items/{item_id}/return-request",
            {"phone": phone, "quantity": quantity},
        )
        if status_code == 200:
            await callback.message.answer("✅ Возврат оформлен.")
        else:
            detail = (body or {}).get("detail", "Не удалось оформить возврат.")
            await callback.message.answer(f"⚠️ {detail}")


@dp.message(F.text)
async def text_handler(message: Message):
    uid = message.from_user.id
    text = message.text.strip()

    if text in MENU_TEXTS:
        # Кнопки меню обрабатываются собственными хендлерами выше — сюда не попадём,
        # но на всякий случай не даём такому тексту провалиться в сценарии ниже.
        return

    if uid in awaiting_reset_phone:
        awaiting_reset_phone.discard(uid)
        phone = text
        result = await link_telegram_and_get_code(phone, uid)
        if not result:
            await message.answer("Не удалось связаться с сервером. Попробуйте позже.")
            return
        if result.get("error") == "not_found":
            await message.answer(
                "Клиент с таким номером не найден. Проверьте номер или зарегистрируйтесь на сайте oina.tj."
            )
            return
        code = result.get("code")
        await message.answer(
            f"Ваш код для сброса пароля: {code}\n\n"
            "Введите этот код на сайте, чтобы задать новый пароль. Код действителен 10 минут."
        )
        return

    flow = user_flow.get(uid)

    if flow and flow.get("flow") == "order_status_phone":
        orders = await lookup_order_by_phone(text)
        user_flow.pop(uid, None)
        if not orders:
            await message.answer("Заказов с таким номером не найдено.")
            return
        reply_text = "\n\n".join(format_order_summary(o) for o in orders[:5])
        await message.answer(reply_text)
        return

    if flow and flow.get("flow") == "search_query":
        products = await search_products(query=text)
        user_flow.pop(uid, None)
        if not products:
            await message.answer("Ничего не найдено. Попробуйте другой запрос.")
            return
        lines = []
        for p in products[:8]:
            sizes = ", ".join(sorted({v["size"] for v in p["available_variants"]})) or "нет в наличии"
            lines.append(f"• {p['title']} — {p['price']} смн (размеры: {sizes})")
        await message.answer("\n".join(lines))
        return

    if flow and flow.get("flow") == "cancel_order_number":
        if not text.isdigit():
            await message.answer("Номер заказа должен быть числом. Попробуйте ещё раз (например 26).")
            return
        flow["order_id"] = int(text)
        flow["flow"] = "cancel_phone"
        await message.answer("Теперь введите номер телефона, на который оформлен этот заказ.")
        return

    if flow and flow.get("flow") == "cancel_phone":
        phone = text
        order_id = flow["order_id"]
        order = await fetch_backend(f"/orders/{order_id}/verify", {"phone": phone})
        if not order or not isinstance(order, dict):
            user_flow.pop(uid, None)
            await message.answer(
                "Не удалось найти заказ с таким номером и телефоном. Проверьте данные и попробуйте снова через меню."
            )
            return

        items = [
            {
                "id": item["id"],
                "title": (item.get("variant") or {}).get("title_ru", "Товар"),
                "quantity": item.get("quantity", 1),
                "returned_quantity": item.get("returned_quantity", 0),
            }
            for item in order.get("items", [])
        ]

        keyboard = build_cancel_keyboard(order, items)
        if not keyboard:
            user_flow.pop(uid, None)
            await message.answer(
                "Для этого заказа сейчас недоступна ни отмена, ни возврат через бота. Напишите нам напрямую."
            )
            return

        flow["flow"] = "cancel_choose"
        flow["phone"] = phone
        flow["items"] = items

        await message.answer(
            format_order_summary(order) + "\n\nЧто вы хотите сделать?",
            reply_markup=keyboard,
        )
        return

    if flow and flow.get("flow") == "cancel_qty":
        remaining = flow.get("pending_remaining", 1)
        logging.info(f"[DEBUG cancel_qty] uid={uid} text={text!r} remaining={remaining}")
        if not text.isdigit() or not (1 <= int(text) <= remaining):
            await message.answer(f"Введите число от 1 до {remaining}.")
            return
        quantity = int(text)
        logging.info(f"[DEBUG cancel_qty] parsed quantity={quantity}")
        item_id = flow["pending_item_id"]
        item = next((i for i in flow.get("items", []) if i["id"] == item_id), None)
        title = item["title"] if item else "товар"

        flow["flow"] = "cancel_confirm"
        flow["pending"] = {"action": "return_item", "item_id": item_id, "quantity": quantity}
        keyboard = InlineKeyboardMarkup(inline_keyboard=[[
            InlineKeyboardButton(text="Да, вернуть", callback_data="confirm_yes"),
            InlineKeyboardButton(text="Не надо", callback_data="confirm_no"),
        ]])
        await message.answer(
            f"Подтвердите возврат: «{title}» — {quantity} шт.?",
            reply_markup=keyboard,
        )
        return

    if flow and flow.get("flow") == "exchange_order_number":
        if not text.isdigit():
            await message.answer("Номер заказа должен быть числом. Попробуйте ещё раз.")
            return
        flow["order_id"] = int(text)
        flow["flow"] = "exchange_phone"
        await message.answer("Теперь введите номер телефона, на который оформлен этот заказ.")
        return

    if flow and flow.get("flow") == "exchange_phone":
        phone = text
        order_id = flow["order_id"]
        order = await fetch_backend(f"/orders/{order_id}/verify", {"phone": phone})
        if not order or not isinstance(order, dict):
            user_flow.pop(uid, None)
            await message.answer(
                "Не удалось найти заказ с таким номером и телефоном. Проверьте данные и попробуйте снова через меню."
            )
            return
        if order.get("status") != "delivered":
            user_flow.pop(uid, None)
            await message.answer("Обмен доступен только для уже доставленных заказов.")
            return

        items = [
            {
                "id": item["id"],
                "title": (item.get("variant") or {}).get("title_ru", "Товар"),
                "color": (item.get("variant") or {}).get("color", ""),
                "size": (item.get("variant") or {}).get("size", ""),
                "catalog_number": (item.get("variant") or {}).get("catalog_number", ""),
            }
            for item in order.get("items", [])
        ]
        if not items:
            user_flow.pop(uid, None)
            await message.answer("В этом заказе нет товаров.")
            return

        flow["flow"] = "exchange_item_choose"
        flow["phone"] = phone
        flow["items"] = items

        buttons = [
            [InlineKeyboardButton(
                text=f"{item['title']} ({item['color']}, {item['size']})",
                callback_data=f"exchange_item:{item['id']}",
            )]
            for item in items
        ]
        await message.answer(
            "Нашёл заказ №" + str(order_id) + ". Какой товар хотите обменять?",
            reply_markup=InlineKeyboardMarkup(inline_keyboard=buttons),
        )
        return

    if flow and flow.get("flow") == "exchange_size":
        flow["desired_size"] = text
        flow["flow"] = "exchange_color"
        await message.answer("Какой цвет вам нужен?")
        return

    if flow and flow.get("flow") == "exchange_color":
        desired_color = text
        order_id = flow["order_id"]
        phone = flow["phone"]
        is_dushanbe = flow.get("is_dushanbe", True)
        desired_size = flow.get("desired_size", "")
        current_item = flow.get("current_item", "не указан")
        catalog_number = flow.get("current_catalog_number", "")
        user_flow.pop(uid, None)

        available = False
        if catalog_number:
            found_products = await search_products(query=catalog_number, color=desired_color, size=desired_size)
            for p in found_products:
                for v in p.get("available_variants", []):
                    if v.get("size") == desired_size and v.get("color") == desired_color:
                        available = True
                        break

        availability_note = "В наличии" if available else "Нет в наличии"
        status_code, body = await request_exchange(order_id, phone, is_dushanbe, current_item, desired_size, desired_color, availability_note)

        if status_code == 200:
            if available:
                await message.answer("✅ Такой размер и цвет есть в наличии. Запрос отправлен администратору — с вами свяжутся в ближайшее время.")
            else:
                await message.answer(
                    "😔 К сожалению, размера "
                    f"{desired_size} и цвета {desired_color} сейчас нет в наличии. "
                    "Мы всё равно передали ваш запрос администратору — он свяжется с вами, если сможет помочь."
                )
        else:
            detail = (body or {}).get("detail", "Не удалось отправить запрос на обмен.")
            await message.answer(f"⚠️ {detail}")
        return

    if flow and flow.get("flow") in EXCHANGE_FLOW_STATES:
        await message.answer("Пожалуйста, воспользуйтесь кнопками выше, чтобы продолжить, или напишите /start, чтобы начать заново.")
        return

    if flow and flow.get("flow") in CANCEL_FLOW_STATES:
        # Ждём нажатия inline-кнопки (cancel_choose / cancel_confirm), а пришёл свободный текст.
        await message.answer("Пожалуйста, воспользуйтесь кнопками выше, чтобы продолжить, или напишите /start, чтобы начать заново.")
        return

    await bot.send_chat_action(message.chat.id, "typing")
    reply = await ask_claude(uid, message.text)
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
