from aiogram import Bot, Dispatcher, types
from aiogram.filters import CommandStart
from aiogram.enums import ParseMode
from aiogram.utils.keyboard import InlineKeyboardBuilder
import asyncio
import os
import html
from os import path

BOT_TOKEN = os.getenv('BOT_TOKEN', '8309506716:AAF7CWJgIPDgB4OBkH-xerRWIfVhLad3238')

_default_tgs = path.join(path.dirname(__file__), 'AnimatedSticker.tgs')
START_STICKER = os.getenv('START_STICKER') or _default_tgs

bot = Bot(BOT_TOKEN)
dp = Dispatcher()


@dp.message(CommandStart())
async def start_command(message: types.Message):
    try:
        if START_STICKER.startswith('http://') or START_STICKER.startswith('https://'):
            sticker_input = START_STICKER
        elif path.isfile(START_STICKER):
            sticker_input = types.FSInputFile(START_STICKER)
        else:
            sticker_input = START_STICKER
        await bot.send_sticker(chat_id=message.chat.id, sticker=sticker_input)
    except Exception as e:
        print(f"send_sticker error: {e}")

    username = message.from_user.username or 'User'
    safe_username = html.escape(username)

    text = (
        f"Hi, {safe_username}! <b>Welcome to GiftTweak.</b>\n\n"
        "Discover, Customize and Search for gifts. Start exploring now!"
    )

    kb = InlineKeyboardBuilder()
    kb.button(text='Open GiftTweak', url='https://t.me/GiftTweakBot/?startapp')
    kb.button(text='Community Channel', url='https://t.me/GiftTweak')
    kb.adjust(1)

    await message.answer(text, parse_mode=ParseMode.HTML, reply_markup=kb.as_markup(), disable_web_page_preview=True)


async def main():
    await dp.start_polling(bot)


if __name__ == '__main__':
    asyncio.run(main())