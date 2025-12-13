import os
import asyncio
import random
import string
from datetime import datetime, timedelta
from typing import Optional

from telegram import Update, LabeledPrice, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import Application, CommandHandler, ContextTypes, PreCheckoutQueryHandler, MessageHandler, filters
from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, Boolean, BigInteger
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.sql import func
from dotenv import load_dotenv

# Загружаем переменные окружения
load_dotenv()

# Токен бота оплаты
PAYMENT_BOT_TOKEN = os.getenv('PAYMENT_BOT_TOKEN', '8552103562:AAGpMhknVB7JbiigyB2Z2Iot1L-lI3IlFbY')

# Подключение к базе данных
DATABASE_URL = os.getenv('DATABASE_URL', '')

if not DATABASE_URL:
    # Локальная разработка - используем SQLite
    default_db_path = os.path.join(os.path.dirname(__file__), '..', 'backend', 'db.sqlite3')
    DATABASE_URL = f'sqlite:///{os.path.abspath(default_db_path)}'

if DATABASE_URL.startswith('postgresql'):
    engine = create_engine(DATABASE_URL)
else:
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})

Base = declarative_base()

# Модель для промокодов
class PromoCode(Base):
    __tablename__ = "promo_codes"
    
    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, index=True, nullable=False)
    user_id = Column(BigInteger, nullable=True)  # ID пользователя, который использовал промокод
    amount = Column(Float, nullable=False)  # Сумма пополнения в TON
    is_used = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    used_at = Column(DateTime(timezone=True), nullable=True)
    
    # Связь с транзакцией
    transaction_id = Column(Integer, nullable=True)

# Инициализируем базу данных (с задержкой для избежания конфликтов)
def init_promo_db():
    """Инициализация БД промокодов"""
    try:
        Base.metadata.create_all(bind=engine)
        print("✅ База данных промокодов инициализирована")
    except Exception as e:
        print(f"⚠️ Ошибка инициализации БД промокодов: {e}")
        import traceback
        traceback.print_exc()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    """Получить сессию БД"""
    return SessionLocal()

def generate_promo_code(amount: float) -> str:
    """Генерирует промокод: 8 случайных латинских символов + сумма"""
    # Генерируем 8 случайных заглавных латинских букв
    random_part = ''.join(random.choices(string.ascii_uppercase, k=8))
    # Добавляем сумму (без точки, только целое число)
    amount_part = str(int(amount))
    return f"{random_part}{amount_part}"

async def start_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Обработка команды /start"""
    if not context.args:
        await update.message.reply_text(
            "Welcome to Capsule Pay! Use /start stars_<amount> to create a payment invoice.\n\n"
            "Example: /start stars_500"
        )
        return
    
    # Парсим аргументы: stars_<amount>
    args = ' '.join(context.args)
    if not args.startswith('stars_'):
        await update.message.reply_text(
            "Invalid format. Use: /start stars_<amount>\n\n"
            "Example: /start stars_500"
        )
        return
    
    try:
        # Извлекаем сумму
        amount_str = args.replace('stars_', '').strip()
        amount = float(amount_str)
        
        if amount <= 0:
            await update.message.reply_text("Amount must be greater than 0")
            return
        
        # Создаем инвойс на оплату XTR (Stars)
        # В Telegram Stars используется валюта "XTR"
        # Сумма в Stars: 1 TON = 2 Stars (примерно), но лучше использовать прямую конвертацию
        # Для Stars amount указывается в минимальных единицах (1 Star = 1 единица)
        # Обычно 1 TON ≈ 2 Stars, но для простоты используем 1:1
        stars_amount = int(amount)  # Количество Stars (целое число)
        
        prices = [LabeledPrice(label=f"Top up {amount} TON", amount=stars_amount)]
        
        # Отправляем инвойс
        await context.bot.send_invoice(
            chat_id=update.effective_chat.id,
            title=f"Top up {amount} TON",
            description=f"Top up your Capsule account with {amount} TON",
            payload=f"stars_{amount}_{update.effective_user.id}",
            provider_token=None,  # Для Stars не нужен provider_token
            currency="XTR",  # Telegram Stars currency
            prices=prices,
            start_parameter=f"stars_{amount}",
        )
        
    except ValueError:
        await update.message.reply_text(
            "Invalid amount. Use a number.\n\n"
            "Example: /start stars_500"
        )
    except Exception as e:
        print(f"Error creating invoice: {e}")
        await update.message.reply_text("Error creating payment invoice. Please try again later.")

async def precheckout_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Обработка pre-checkout запроса"""
    query = update.pre_checkout_query
    
    # Всегда подтверждаем запрос
    await query.answer(ok=True)

async def successful_payment_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Обработка успешной оплаты"""
    payment = update.message.successful_payment
    
    # Извлекаем сумму из payload
    payload = payment.invoice_payload
    parts = payload.split('_')
    
    if len(parts) < 3 or parts[0] != 'stars':
        await update.message.reply_text("Error processing payment. Please contact support.")
        return
    
    try:
        amount = float(parts[1])
        user_id = int(parts[2]) if len(parts) > 2 else update.effective_user.id
        
        # Генерируем промокод
        db = get_db()
        promo_code = None
        
        # Генерируем уникальный промокод
        max_attempts = 10
        for _ in range(max_attempts):
            code = generate_promo_code(amount)
            existing = db.query(PromoCode).filter(PromoCode.code == code).first()
            if not existing:
                promo_code = PromoCode(
                    code=code,
                    amount=amount,
                    is_used=False
                )
                db.add(promo_code)
                db.commit()
                db.refresh(promo_code)
                break
        
        if not promo_code:
            await update.message.reply_text(
                "Payment successful, but error generating promo code. Please contact support."
            )
            db.close()
            return
        
        # Отправляем промокод пользователю
        await update.message.reply_text(
            f"✅ Payment successful!\n\n"
            f"💰 Amount: {amount} TON\n\n"
            f"🎁 Your promo code:\n"
            f"<code>{promo_code.code}</code>\n\n"
            f"Use this code in Capsule to top up your balance.",
            parse_mode='HTML'
        )
        
        db.close()
        
    except Exception as e:
        print(f"Error processing payment: {e}")
        await update.message.reply_text("Error processing payment. Please contact support.")

def main():
    """Запуск бота оплаты"""
    if not PAYMENT_BOT_TOKEN:
        print("❌ Ошибка: PAYMENT_BOT_TOKEN не установлен в переменных окружения!")
        return
    
    # Инициализируем БД
    init_promo_db()
    
    try:
        # Создаем приложение
        application = Application.builder().token(PAYMENT_BOT_TOKEN).build()
        
        # Регистрируем обработчики
        application.add_handler(CommandHandler("start", start_command))
        application.add_handler(PreCheckoutQueryHandler(precheckout_callback))
        application.add_handler(MessageHandler(filters.SUCCESSFUL_PAYMENT, successful_payment_callback))
        
        print("💳 Payment bot запущен!")
        
        # Запускаем бота (отключаем обработку сигналов для работы в потоке)
        application.run_polling(
            allowed_updates=Update.ALL_TYPES, 
            drop_pending_updates=True,
            stop_signals=None  # Отключаем обработку сигналов для работы в потоке
        )
    except Exception as e:
        print(f"❌ Критическая ошибка в боте оплаты: {e}")
        import traceback
        traceback.print_exc()
        raise

if __name__ == '__main__':
    main()

