import asyncio
import os

from aiogram import Bot, Dispatcher, F
from aiogram.filters import Command
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.fsm.storage.memory import MemoryStorage
from aiogram.types import Message, ReplyKeyboardMarkup, KeyboardButton, WebAppInfo, InlineKeyboardMarkup, InlineKeyboardButton
from dotenv import load_dotenv
import httpx

load_dotenv()

BOT_TOKEN = os.getenv("BOT_TOKEN")
ADMIN_TELEGRAM_ID = int(os.getenv("ADMIN_TELEGRAM_ID"))
API_BASE_URL = os.getenv("API_BASE_URL")
ADMIN_API_PASSWORD = os.getenv("ADMIN_API_PASSWORD")

bot = Bot(token=BOT_TOKEN)
dp = Dispatcher(storage=MemoryStorage())

WEBAPP_URL = "https://oina-frontend.onrender.com/admin/webapp"

main_menu = ReplyKeyboardMarkup(
    keyboard=[
        [KeyboardButton(text="📦 Добавить товар")],
        [KeyboardButton(text="📋 Мои черновики"), KeyboardButton(text="🛒 Новые заказы")],
        [KeyboardButton(text="🔍 Поиск товара"), KeyboardButton(text="📈 Статистика")],
        [KeyboardButton(text="⚠️ Низкие остатки"), KeyboardButton(text="📦 Поставщики")],
        [KeyboardButton(text="📊 Категории"), KeyboardButton(text="ℹ️ Помощь")],
    ],
    resize_keyboard=True,
)

webapp_inline_button = InlineKeyboardMarkup(
    inline_keyboard=[
        [InlineKeyboardButton(text="📦 Открыть форму", web_app=WebAppInfo(url=WEBAPP_URL))]
    ]
)
cancel_menu = ReplyKeyboardMarkup(
    keyboard=[[KeyboardButton(text="❌ Отмена")]],
    resize_keyboard=True,
)

done_menu = ReplyKeyboardMarkup(
    keyboard=[[KeyboardButton(text="✅ Готово")], [KeyboardButton(text="❌ Отмена")]],
    resize_keyboard=True,
)




class SearchState(StatesGroup):
    waiting_query = State()


def is_admin(user_id: int) -> bool:
    return user_id == ADMIN_TELEGRAM_ID


async def get_admin_token() -> str:
    async with httpx.AsyncClient() as client:
        res = await client.post(
            f"{API_BASE_URL}/auth/admin-login",
            json={"phone": "bot", "password": ADMIN_API_PASSWORD},
        )
        return res.json()["access_token"]


@dp.message(Command("start"))
async def cmd_start(message: Message, state: FSMContext):
    if not is_admin(message.from_user.id):
        await message.answer("Доступ запрещён.")
        return
    await state.clear()
    await message.answer("Добро пожаловать в админ-бот Oina.tj", reply_markup=main_menu)


@dp.message(F.text == "❌ Отмена")
async def cancel_handler(message: Message, state: FSMContext):
    if not is_admin(message.from_user.id):
        return
    await state.clear()
    await message.answer("Отменено.", reply_markup=main_menu)


@dp.message(F.text == "ℹ️ Помощь")
async def help_handler(message: Message):
    if not is_admin(message.from_user.id):
        return
    await message.answer(
        "Доступные команды:\n"
        "📦 Добавить товар — черновик товара через форму\n"
        "📋 Мои черновики — список неопубликованных товаров\n"
        "🛒 Новые заказы — последние заказы\n"
        "🔍 Поиск товара — найти по названию/артикулу\n"
        "📈 Статистика — выручка и заказы за периоды\n"
        "⚠️ Низкие остатки — товары с малым остатком\n"
        "📦 Поставщики — список поставщиков\n"
        "📊 Категории — список категорий\n\n"
        "Ты автоматически получишь уведомление о новом заказе, отмене или возврате."
    )


@dp.message(F.text == "📊 Категории")
async def categories_handler(message: Message):
    if not is_admin(message.from_user.id):
        return
    async with httpx.AsyncClient() as client:
        res = await client.get(f"{API_BASE_URL}/categories/")
        categories = res.json()
    if not categories:
        await message.answer("Категорий пока нет.")
        return
    text = "\n".join(f"{c['id']}. {c['name']}" for c in categories)
    await message.answer(f"Категории:\n{text}")


@dp.message(F.text == "🛒 Новые заказы")
async def orders_handler(message: Message):
    if not is_admin(message.from_user.id):
        return
    token = await get_admin_token()
    async with httpx.AsyncClient() as client:
        res = await client.get(f"{API_BASE_URL}/orders/", headers={"Authorization": f"Bearer {token}"})
        orders = res.json()
    if not orders:
        await message.answer("Заказов пока нет.")
        return
    for order in orders[:5]:
        await message.answer(
            f"Заказ №{order['id']}\n"
            f"Статус: {order['status']}\n"
            f"Сумма: {order['total']} смн\n"
            f"Адрес: {order.get('delivery_address', '—')}"
        )


@dp.message(F.text == "📋 Мои черновики")
async def drafts_handler(message: Message):
    if not is_admin(message.from_user.id):
        return
    token = await get_admin_token()
    async with httpx.AsyncClient() as client:
        res = await client.get(f"{API_BASE_URL}/products/admin/all", headers={"Authorization": f"Bearer {token}"})
        products = res.json()
    drafts = [p for p in products if not p.get("is_active", True)]
    if not drafts:
        await message.answer("Черновиков нет.")
        return
    for p in drafts[:10]:
        await message.answer(f"№{p['catalog_number']} — {p['title_ru']} — {p['price']} смн (черновик)")


@dp.message(F.text == "🔍 Поиск товара")
async def search_start(message: Message, state: FSMContext):
    if not is_admin(message.from_user.id):
        return
    await state.set_state(SearchState.waiting_query)
    await message.answer("Введи название или артикул товара:", reply_markup=cancel_menu)


@dp.message(SearchState.waiting_query)
async def search_process(message: Message, state: FSMContext):
    if not is_admin(message.from_user.id):
        return
    query = message.text.strip()
    await state.clear()
    async with httpx.AsyncClient() as client:
        res = await client.get(f"{API_BASE_URL}/products/", params={"search": query})
        products = res.json()
    if not products:
        await message.answer("Ничего не найдено.", reply_markup=main_menu)
        return
    for p in products[:5]:
        variants_text = "\n".join(
            f"  {v['color']}, {v['size']}: {v['stock']} шт" for v in p.get("variants", [])
        )
        await message.answer(
            f"<b>{p['title_ru']}</b>\n"
            f"Артикул: {p['catalog_number']}\n"
            f"Цена: {p['price']} смн\n"
            f"{variants_text}",
            parse_mode="HTML",
        )
    await message.answer("Готово.", reply_markup=main_menu)


@dp.message(F.text == "📈 Статистика")
async def stats_handler(message: Message):
    if not is_admin(message.from_user.id):
        return
    token = await get_admin_token()
    async with httpx.AsyncClient() as client:
        res = await client.get(f"{API_BASE_URL}/orders/stats/summary", headers={"Authorization": f"Bearer {token}"})
        stats = res.json()
    await message.answer(
        f"<b>📈 Статистика</b>\n\n"
        f"Сегодня: {stats['today']['count']} заказов, {stats['today']['revenue']:.0f} смн\n"
        f"За неделю: {stats['week']['count']} заказов, {stats['week']['revenue']:.0f} смн\n"
        f"За месяц: {stats['month']['count']} заказов, {stats['month']['revenue']:.0f} смн",
        parse_mode="HTML",
    )


@dp.message(F.text == "⚠️ Низкие остатки")
async def low_stock_handler(message: Message):
    if not is_admin(message.from_user.id):
        return
    token = await get_admin_token()
    async with httpx.AsyncClient() as client:
        res = await client.get(f"{API_BASE_URL}/products/admin/low-stock", headers={"Authorization": f"Bearer {token}"})
        items = res.json()
    if not items:
        await message.answer("Низких остатков нет.")
        return
    text = "\n".join(
        f"№{i['catalog_number']} {i['product_title']} — {i['color']}, {i['size']}: {i['stock']} шт"
        for i in items[:20]
    )
    await message.answer(f"<b>⚠️ Низкие остатки:</b>\n{text}", parse_mode="HTML")


@dp.message(F.text == "📦 Поставщики")
async def suppliers_handler(message: Message):
    if not is_admin(message.from_user.id):
        return
    token = await get_admin_token()
    async with httpx.AsyncClient() as client:
        res = await client.get(f"{API_BASE_URL}/suppliers/", headers={"Authorization": f"Bearer {token}"})
        suppliers = res.json()
    if not suppliers:
        await message.answer("Поставщиков пока нет.")
        return
    text = "\n".join(f"{s['id']}. {s['name']} — {s.get('phone') or '—'}" for s in suppliers)
    await message.answer(f"<b>📦 Поставщики:</b>\n{text}", parse_mode="HTML")


# ===== Добавление товара =====
@dp.message(F.text == "📦 Добавить товар")
async def add_product_start(message: Message):
    if not is_admin(message.from_user.id):
        return
    await message.answer("Нажми кнопку ниже, чтобы открыть форму:", reply_markup=webapp_inline_button)





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