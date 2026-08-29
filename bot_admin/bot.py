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
        "📦 Добавить товар — создать черновик товара\n"
        "📋 Мои черновики — список неопубликованных товаров\n"
        "🛒 Новые заказы — последние заказы\n"
        "📊 Категории — список категорий"
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
    async with httpx.AsyncClient() as client:
        res = await client.get(f"{API_BASE_URL}/products/")
        products = res.json()
    drafts = [p for p in products if not p.get("is_active", True)]
    if not drafts:
        await message.answer("Черновиков нет.")
        return
    for p in drafts:
        await message.answer(f"№{p['catalog_number']} — {p['title_ru']} — {p['price']} смн (черновик)")


# ===== Добавление товара =====

@dp.message(F.text == "📦 Добавить товар")
async def add_product_start(message: Message):
    if not is_admin(message.from_user.id):
        return
    await message.answer("Нажми кнопку ниже, чтобы открыть форму:", reply_markup=webapp_inline_button)
    if not is_admin(message.from_user.id):
        return
    async with httpx.AsyncClient() as client:
        res = await client.get(f"{API_BASE_URL}/categories/")
        categories = res.json()
    if not categories:
        await message.answer("Сначала создай хотя бы одну категорию в админке.")
        return
    text = "Выбери категорию (напиши номер):\n" + "\n".join(f"{c['id']}. {c['name']}" for c in categories)
    await state.set_state(AddProduct.category)
    await message.answer(text, reply_markup=cancel_menu)





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