"""
Разовый скрипт: публикует пост с кликабельной кнопкой-ссылкой на клиентского
ИИ-ассистента (@Oina_help_bot) в канал Oina.tj.
Запускается один раз вручную: python post_assistant_button.py
"""
import asyncio
import os

from aiogram import Bot
from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton
from dotenv import load_dotenv

load_dotenv()

BOT_TOKEN = os.getenv("BOT_TOKEN")
CHANNEL_USERNAME = "@oina_channel_tj"  # поменяй, если username канала другой

button = InlineKeyboardMarkup(
    inline_keyboard=[
        [InlineKeyboardButton(text="💬 Написать ассистенту", url="https://t.me/Oina_help_bot")]
    ]
)


async def main():
    bot = Bot(token=BOT_TOKEN)
    await bot.send_message(
        chat_id=CHANNEL_USERNAME,
        text=(
            "🤖 <b>Есть вопросы?</b>\n\n"
            "Наш ИИ-помощник ответит мгновенно про доставку, оплату, "
            "статус заказа и наличие товара — в любое время суток."
        ),
        parse_mode="HTML",
        reply_markup=button,
    )
    await bot.session.close()
    print("Готово! Пост с кнопкой опубликован в канале.")


if __name__ == "__main__":
    asyncio.run(main())
