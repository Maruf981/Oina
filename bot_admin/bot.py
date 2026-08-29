import asyncio
import os

from aiogram import Bot, Dispatcher, F
from aiogram.filters import Command
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.fsm.storage.memory import MemoryStorage
from aiogram.types import Message, ReplyKeyboardMarkup, KeyboardButton, WebAppInfo
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
        [KeyboardButton(text="📦 Добавить товар (форма)", web_app=WebAppInfo(url=WEBAPP_URL))],
        [KeyboardButton(text="📋 Мои черновики"), KeyboardButton(text="🛒 Новые заказы")],
        [KeyboardButton(text="📊 Категории"), KeyboardButton(text="ℹ️ Помощь")],
    ],
    resize_keyboard=True,
)

cancel_menu = ReplyKeyboardMarkup(
    keyboard=[[KeyboardButton(text="❌ Отмена")]],
    resize_keyboard=True,
)

done_menu = ReplyKeyboardMarkup(
    keyboard=[[KeyboardButton(text="✅ Готово")], [KeyboardButton(text="❌ Отмена")]],
    resize_keyboard=True,
)


class AddProduct(StatesGroup):
    category = State()
    title = State()
    price = State()
    photos = State()
    variant_size = State()
    variant_color = State()
    variant_stock = State()
    more_variants = State()


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
async def add_product_start(message: Message, state: FSMContext):
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


@dp.message(AddProduct.category)
async def add_product_category(message: Message, state: FSMContext):
    if not message.text.isdigit():
        await message.answer("Напиши номер категории цифрой.")
        return
    await state.update_data(category_id=int(message.text))
    await state.set_state(AddProduct.title)
    await message.answer("Название товара (на русском):", reply_markup=cancel_menu)


@dp.message(AddProduct.title)
async def add_product_title(message: Message, state: FSMContext):
    await state.update_data(title_ru=message.text)
    await state.set_state(AddProduct.price)
    await message.answer("Цена (в смн, только число):", reply_markup=cancel_menu)


@dp.message(AddProduct.price)
async def add_product_price(message: Message, state: FSMContext):
    try:
        price = float(message.text)
    except ValueError:
        await message.answer("Введи число, например: 250")
        return
    await state.update_data(price=price, photos=[])
    await state.set_state(AddProduct.photos)
    await message.answer(
        "Пришли фото товара (можно несколько подряд). Когда закончишь — нажми «Готово».",
        reply_markup=done_menu,
    )


@dp.message(AddProduct.photos, F.photo)
async def add_product_photo(message: Message, state: FSMContext):
    data = await state.get_data()
    photos = data.get("photos", [])
    photos.append(message.photo[-1].file_id)
    await state.update_data(photos=photos)
    await message.answer(f"Фото добавлено ({len(photos)}). Ещё, или «Готово».")


@dp.message(AddProduct.photos, F.text == "✅ Готово")
async def add_product_photos_done(message: Message, state: FSMContext):
    await state.update_data(variants=[])
    await state.set_state(AddProduct.variant_size)
    await message.answer("Размер (например M):", reply_markup=cancel_menu)


@dp.message(AddProduct.variant_size)
async def add_variant_size(message: Message, state: FSMContext):
    await state.update_data(current_size=message.text)
    await state.set_state(AddProduct.variant_color)
    await message.answer("Цвет:", reply_markup=cancel_menu)


@dp.message(AddProduct.variant_color)
async def add_variant_color(message: Message, state: FSMContext):
    await state.update_data(current_color=message.text)
    await state.set_state(AddProduct.variant_stock)
    await message.answer("Сколько штук в наличии?", reply_markup=cancel_menu)


@dp.message(AddProduct.variant_stock)
async def add_variant_stock(message: Message, state: FSMContext):
    if not message.text.isdigit():
        await message.answer("Введи число.")
        return
    data = await state.get_data()
    variants = data.get("variants", [])
    variants.append({
        "size": data["current_size"],
        "color": data["current_color"],
        "stock": int(message.text),
        "sku": f"draft-{len(variants)+1}",
    })
    await state.update_data(variants=variants)
    await state.set_state(AddProduct.more_variants)
    await message.answer(
        f"Вариант добавлен ({len(variants)}). Добавить ещё размер/цвет, или «Готово»?",
        reply_markup=done_menu,
    )


@dp.message(AddProduct.more_variants, F.text == "✅ Готово")
async def finish_product(message: Message, state: FSMContext):
    data = await state.get_data()

    token = await get_admin_token()
    payload = {
        "category_id": data["category_id"],
        "title_ru": data["title_ru"],
        "price": data["price"],
        "is_active": False,
        "variants": data["variants"],
    }

    async with httpx.AsyncClient() as client:
        res = await client.post(
            f"{API_BASE_URL}/products/",
            json=payload,
            headers={"Authorization": f"Bearer {token}"},
        )
        if res.status_code != 200:
            await message.answer(f"Ошибка сохранения: {res.text}", reply_markup=main_menu)
            await state.clear()
            return
        product = res.json()

        for file_id in data.get("photos", []):
            file = await bot.get_file(file_id)
            file_bytes = await bot.download_file(file.file_path)
            files = {"file": ("photo.jpg", file_bytes.read(), "image/jpeg")}
            await client.post(
                f"{API_BASE_URL}/upload/product-image/{product['id']}",
                files=files,
                headers={"Authorization": f"Bearer {token}"},
            )

    await state.clear()
    await message.answer(
        f"Готово! Черновик «{product['title_ru']}» (№{product['catalog_number']}) сохранён.\n"
        f"Дома в админке дозаполни материал, перевод и опубликуй.",
        reply_markup=main_menu,
    )


@dp.message(AddProduct.more_variants)
async def add_more_variant(message: Message, state: FSMContext):
    await state.set_state(AddProduct.variant_size)
    await add_variant_size(message, state)


async def main():
    await dp.start_polling(bot)


if __name__ == "__main__":
    asyncio.run(main())