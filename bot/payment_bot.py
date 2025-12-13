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
    # Округляем до ближайшего целого, но минимум 1
    amount_part = str(max(1, round(amount)))
    return f"{random_part}{amount_part}"

async def start_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Обработка команды /start"""
    if not context.args:
        await update.message.reply_text(
            "Welcome to Capsule Pay! @CapsuleMarketBot"
        )
        return
    
    # Парсим аргументы: stars_<amount>
    args = ' '.join(context.args)
    if not args.startswith('stars_'):
        await update.message.reply_text(
            "Welcome to Capsule Pay! @CapsuleMarketBot"
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
        # Сумма в Stars: для Stars amount указывается в минимальных единицах (1 Star = 1 единица)
        # Конвертация: 50 Stars = 0.46 TON
        stars_amount = int(amount)  # Количество Stars (целое число)
        
        if stars_amount <= 0:
            await update.message.reply_text("Amount must be greater than 0")
            return
        
        # Конвертируем Stars в TON для отображения
        # 50 Stars = 0.46 TON, значит 1 Star = 0.0092 TON
        ton_amount = stars_amount * 0.46 / 50
        
        prices = [LabeledPrice(label=f"Top up {ton_amount:.2f} TON ({stars_amount} Stars)", amount=stars_amount)]
        
        print(f"[PAYMENT_BOT] Creating invoice: stars_amount={stars_amount}, ton_amount={ton_amount:.2f}, user_id={update.effective_user.id}")
        
        # Отправляем инвойс
        try:
            # Для Stars (XTR) нужно использовать специальный формат
            # provider_token должен быть пустой строкой или None для Stars
            # ton_amount уже вычислен выше
            
            invoice_result = await context.bot.send_invoice(
                chat_id=update.effective_chat.id,
                title=f"Top up {ton_amount:.2f} TON",
                description=f"Pay {stars_amount} Stars to receive {ton_amount:.2f} TON on your Capsule account",
                payload=f"stars_{stars_amount}_{update.effective_user.id}",
                provider_token="",  # Для Stars используем пустую строку
                currency="XTR",  # Telegram Stars currency
                prices=prices,
                start_parameter=f"stars_{stars_amount}",
            )
            print(f"[PAYMENT_BOT] Invoice sent successfully: {invoice_result}")
        except Exception as invoice_error:
            print(f"[PAYMENT_BOT] Error sending invoice: {invoice_error}")
            import traceback
            traceback.print_exc()
            # Показываем более детальную ошибку пользователю
            error_msg = str(invoice_error)
            if "Bad Request" in error_msg or "400" in error_msg:
                await update.message.reply_text(
                    f"❌ Invalid invoice parameters.\n\n"
                    f"Error: {error_msg}\n\n"
                    f"Please try with a different amount or contact support."
                )
            else:
                await update.message.reply_text(
                    f"❌ Error creating payment invoice: {error_msg}\n\n"
                    "Please try again later or contact support."
                )
        
    except ValueError as ve:
        print(f"[PAYMENT_BOT] ValueError: {ve}")
        await update.message.reply_text(
            "Invalid amount. Use a number.\n\n"
            "Example: /start stars_500"
        )
    except Exception as e:
        print(f"[PAYMENT_BOT] Unexpected error creating invoice: {e}")
        import traceback
        traceback.print_exc()
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
        stars_amount = float(parts[1])  # Количество Stars, которое заплатил пользователь
        user_id = int(parts[2]) if len(parts) > 2 else update.effective_user.id
        
        # Конвертируем Stars в TON: 50 Stars = 0.46 TON
        ton_amount = stars_amount * 0.46 / 50
        
        # Генерируем промокод с суммой в TON
        db = get_db()
        promo_code = None
        
        # Генерируем уникальный промокод
        max_attempts = 10
        for _ in range(max_attempts):
            code = generate_promo_code(ton_amount)  # Используем TON для генерации промокода
            existing = db.query(PromoCode).filter(PromoCode.code == code).first()
            if not existing:
                promo_code = PromoCode(
                    code=code,
                    amount=ton_amount,  # Сохраняем сумму в TON
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
            f"💳 Paid: {int(stars_amount)} Stars\n"
            f"💰 You will receive: {ton_amount:.2f} TON\n\n"
            f"🎁 Your promo code: <code>{promo_code.code}</code>\n\n"
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

