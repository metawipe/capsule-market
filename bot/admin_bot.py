import os
import sys
import asyncio
from typing import Optional
from datetime import datetime

from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import Application, CommandHandler, ContextTypes, MessageHandler, filters
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

# Импортируем модели (теперь они в той же папке bot/)
from models import User, UserGift, Transaction, Base

# Загружаем переменные окружения
load_dotenv()

# Токен бота из переменных окружения
BOT_TOKEN = os.getenv('ADMIN_BOT_TOKEN', '')
ADMIN_USER_IDS = os.getenv('ADMIN_USER_IDS', '').split(',')  # Список ID админов через запятую

# Подключение к базе данных
# Для Railway используем DATABASE_URL из переменных окружения
# Для локальной разработки используем SQLite
DATABASE_URL = os.getenv('DATABASE_URL', '')

if not DATABASE_URL:
    # Локальная разработка - используем SQLite
    default_db_path = os.path.join(os.path.dirname(__file__), '..', 'backend', 'db.sqlite3')
    DATABASE_URL = f'sqlite:///{os.path.abspath(default_db_path)}'
    print("⚠️ [ADMIN_BOT] DATABASE_URL not set, using SQLite:", DATABASE_URL)
else:
    # Скрываем пароль в логах
    db_url_display = DATABASE_URL
    if '@' in db_url_display:
        parts = db_url_display.split('@')
        if len(parts) == 2:
            user_pass = parts[0].split('://')
            if len(user_pass) == 2:
                protocol = user_pass[0]
                user_part = user_pass[1]
                if ':' in user_part:
                    user = user_part.split(':')[0]
                    db_url_display = f"{protocol}://{user}:***@{parts[1]}"
    print(f"✅ [ADMIN_BOT] Using DATABASE_URL: {db_url_display}")

if DATABASE_URL.startswith('postgresql'):
    print("✅ [ADMIN_BOT] Using PostgreSQL")
    engine = create_engine(DATABASE_URL)
else:
    print("⚠️ [ADMIN_BOT] Using SQLite (local development)")
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})

# Инициализируем базу данных (создаем таблицы если их нет)
try:
    Base.metadata.create_all(bind=engine)
    print("✅ База данных инициализирована")
    
    # Миграция: обновляем user_id на BigInteger если используется PostgreSQL
    if DATABASE_URL.startswith('postgresql'):
        try:
            from sqlalchemy import text
            with engine.connect() as conn:
                # Проверяем текущий тип user_id
                result = conn.execute(text("""
                    SELECT data_type 
                    FROM information_schema.columns 
                    WHERE table_name = 'users' AND column_name = 'user_id'
                """))
                row = result.fetchone()
                if row and row[0] == 'integer':
                    print("🔄 Обновление user_id на BigInteger...")
                    conn.execute(text("ALTER TABLE users ALTER COLUMN user_id TYPE BIGINT"))
                    conn.execute(text("ALTER TABLE user_gifts ALTER COLUMN user_id TYPE BIGINT"))
                    conn.execute(text("ALTER TABLE transactions ALTER COLUMN user_id TYPE BIGINT"))
                    conn.commit()
                    print("✅ Миграция user_id завершена")
        except Exception as e:
            print(f"⚠️ Ошибка миграции (возможно уже выполнена): {e}")
except Exception as e:
    print(f"⚠️ Ошибка инициализации БД: {e}")

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    """Получить сессию БД"""
    return SessionLocal()


def is_admin(user_id: int) -> bool:
    """Проверка, является ли пользователь админом"""
    if not ADMIN_USER_IDS or ADMIN_USER_IDS == ['']:
        return True  # Если не указаны админы, разрешаем всем (для теста)
    return str(user_id) in ADMIN_USER_IDS


async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Команда /start"""
    user_id = update.effective_user.id
    
    if not is_admin(user_id):
        # Создаем инлайн кнопки
        keyboard = [
            [InlineKeyboardButton("Open Capsule", web_app={"url": "https://capsule-market.web.app"})],
            [InlineKeyboardButton("Join the community", url="https://t.me/CapsuleMarket")]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)
        
        await update.message.reply_text(
            "Welcome to Capsule! Discover, trade, and collect unique digital gifts in our marketplace. Start exploring now!",
            reply_markup=reply_markup
        )
        return
    
    await update.message.reply_text(
        "🤖 <b>Админ-бот Capsule Market</b>\n\n"
        "Доступные команды:\n"
        "/balance [user_id] [amount] - Выдать баланс пользователю\n"
        "/users - Список всех пользователей\n"
        "/user [user_id] - Информация о пользователе\n"
        "/gifts [user_id] - Подарки пользователя\n"
        "/transactions [user_id] - Транзакции пользователя\n"
        "/add_gift [user_id] [gift_id] [gift_name] [price] - Добавить подарок пользователю\n"
        "/help - Показать эту справку",
        parse_mode='HTML'
    )


async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Команда /help"""
    if not is_admin(update.effective_user.id):
        return
    
    await start(update, context)


async def balance_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Команда /balance [user_id] [amount] - Выдать баланс"""
    if not is_admin(update.effective_user.id):
        return
    
    if len(context.args) < 2:
        await update.message.reply_text(
            "❌ Использование: /balance [user_id] [amount]\n"
            "Пример: /balance 123456 100.5"
        )
        return
    
    try:
        user_id = int(context.args[0])
        amount = float(context.args[1])
        
        db = get_db()
        user = db.query(User).filter(User.user_id == user_id).first()
        
        if not user:
            # Создаем пользователя если его нет
            user = User(user_id=user_id, balance_ton=0.0, balance_stars=0)
            db.add(user)
            db.commit()
            db.refresh(user)
        
        # Пополняем баланс
        old_balance = user.balance_ton
        user.balance_ton += amount
        
        print(f"[ADMIN_BOT] Updating balance for user {user_id}:")
        print(f"  - Old balance: {old_balance}")
        print(f"  - Adding: {amount}")
        print(f"  - New balance: {user.balance_ton}")
        print(f"  - Database URL: {DATABASE_URL[:50]}..." if len(DATABASE_URL) > 50 else f"  - Database URL: {DATABASE_URL}")
        
        # Создаем транзакцию
        transaction = Transaction(
            user_id=user_id,
            transaction_type='deposit',
            amount=amount,
            currency='TON',
            status='completed',
            tx_hash=f'admin_{update.effective_user.id}_{datetime.now().timestamp()}'
        )
        db.add(transaction)
        db.commit()
        db.refresh(user)
        
        print(f"[ADMIN_BOT] Balance updated successfully. Final balance: {user.balance_ton}")
        
        await update.message.reply_text(
            f"✅ Баланс обновлен!\n\n"
            f"👤 Пользователь: {user_id}\n"
            f"💰 Выдано: {amount} TON\n"
            f"💵 Новый баланс: {user.balance_ton:.2f} TON"
        )
        
    except ValueError:
        await update.message.reply_text("❌ Неверный формат. user_id должен быть числом, amount - числом.")
    except Exception as e:
        await update.message.reply_text(f"❌ Ошибка: {str(e)}")
    finally:
        db.close()


async def users_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Команда /users - Список пользователей"""
    if not is_admin(update.effective_user.id):
        return
    
    try:
        db = get_db()
        users = db.query(User).order_by(User.created_at.desc()).limit(50).all()
        
        if not users:
            await update.message.reply_text("📭 Пользователей пока нет.")
            return
        
        message = "👥 <b>Список пользователей:</b>\n\n"
        for user in users:
            username = user.username or user.first_name or "Без имени"
            message += f"• <b>{user.user_id}</b> - {username}\n"
            message += f"  💰 {user.balance_ton:.2f} TON | ⭐ {user.balance_stars} Stars\n\n"
        
        # Разбиваем на части если сообщение слишком длинное
        if len(message) > 4000:
            parts = [message[i:i+4000] for i in range(0, len(message), 4000)]
            for part in parts:
                await update.message.reply_text(part, parse_mode='HTML')
        else:
            await update.message.reply_text(message, parse_mode='HTML')
            
    except Exception as e:
        await update.message.reply_text(f"❌ Ошибка: {str(e)}")
    finally:
        db.close()


async def user_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Команда /user [user_id] - Информация о пользователе"""
    if not is_admin(update.effective_user.id):
        return
    
    if len(context.args) < 1:
        await update.message.reply_text("❌ Использование: /user [user_id]")
        return
    
    try:
        user_id = int(context.args[0])
        db = get_db()
        user = db.query(User).filter(User.user_id == user_id).first()
        
        if not user:
            await update.message.reply_text(f"❌ Пользователь {user_id} не найден.")
            return
        
        gifts_count = db.query(UserGift).filter(UserGift.user_id == user_id).count()
        transactions_count = db.query(Transaction).filter(Transaction.user_id == user_id).count()
        
        message = (
            f"👤 <b>Информация о пользователе:</b>\n\n"
            f"🆔 ID: {user.user_id}\n"
            f"👤 Имя: {user.first_name or 'Не указано'}\n"
            f"📝 Username: @{user.username or 'Не указано'}\n"
            f"💰 Баланс TON: {user.balance_ton:.2f}\n"
            f"⭐ Баланс Stars: {user.balance_stars}\n"
            f"🎁 Подарков: {gifts_count}\n"
            f"📊 Транзакций: {transactions_count}\n"
            f"📅 Регистрация: {user.created_at.strftime('%Y-%m-%d %H:%M') if user.created_at else 'Не указано'}"
        )
        
        await update.message.reply_text(message, parse_mode='HTML')
        
    except ValueError:
        await update.message.reply_text("❌ user_id должен быть числом.")
    except Exception as e:
        await update.message.reply_text(f"❌ Ошибка: {str(e)}")
    finally:
        db.close()


async def gifts_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Команда /gifts [user_id] - Подарки пользователя"""
    if not is_admin(update.effective_user.id):
        return
    
    if len(context.args) < 1:
        await update.message.reply_text("❌ Использование: /gifts [user_id]")
        return
    
    try:
        user_id = int(context.args[0])
        db = get_db()
        gifts = db.query(UserGift).filter(UserGift.user_id == user_id).order_by(UserGift.purchase_date.desc()).all()
        
        if not gifts:
            await update.message.reply_text(f"📭 У пользователя {user_id} нет подарков.")
            return
        
        message = f"🎁 <b>Подарки пользователя {user_id}:</b>\n\n"
        for gift in gifts:
            message += f"• <b>{gift.gift_name}</b> (ID: {gift.gift_id})\n"
            message += f"  💰 {gift.gift_price:.2f} TON\n"
            message += f"  📅 {gift.purchase_date.strftime('%Y-%m-%d %H:%M')}\n\n"
        
        if len(message) > 4000:
            parts = [message[i:i+4000] for i in range(0, len(message), 4000)]
            for part in parts:
                await update.message.reply_text(part, parse_mode='HTML')
        else:
            await update.message.reply_text(message, parse_mode='HTML')
            
    except ValueError:
        await update.message.reply_text("❌ user_id должен быть числом.")
    except Exception as e:
        await update.message.reply_text(f"❌ Ошибка: {str(e)}")
    finally:
        db.close()


async def transactions_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Команда /transactions [user_id] - Транзакции пользователя"""
    if not is_admin(update.effective_user.id):
        return
    
    if len(context.args) < 1:
        await update.message.reply_text("❌ Использование: /transactions [user_id]")
        return
    
    try:
        user_id = int(context.args[0])
        db = get_db()
        transactions = db.query(Transaction).filter(
            Transaction.user_id == user_id
        ).order_by(Transaction.created_at.desc()).limit(20).all()
        
        if not transactions:
            await update.message.reply_text(f"📭 У пользователя {user_id} нет транзакций.")
            return
        
        message = f"📊 <b>Транзакции пользователя {user_id}:</b>\n\n"
        for tx in transactions:
            message += f"• <b>{tx.transaction_type}</b>\n"
            message += f"  💰 {tx.amount} {tx.currency}\n"
            message += f"  📅 {tx.created_at.strftime('%Y-%m-%d %H:%M')}\n"
            message += f"  ✅ {tx.status}\n\n"
        
        if len(message) > 4000:
            parts = [message[i:i+4000] for i in range(0, len(message), 4000)]
            for part in parts:
                await update.message.reply_text(part, parse_mode='HTML')
        else:
            await update.message.reply_text(message, parse_mode='HTML')
            
    except ValueError:
        await update.message.reply_text("❌ user_id должен быть числом.")
    except Exception as e:
        await update.message.reply_text(f"❌ Ошибка: {str(e)}")
    finally:
        db.close()


async def add_gift_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Команда /add_gift [user_id] [gift_id] [gift_name] [price] - Добавить подарок пользователю"""
    if not is_admin(update.effective_user.id):
        return
    
    if len(context.args) < 4:
        await update.message.reply_text(
            "❌ Использование: /add_gift [user_id] [gift_id] [gift_name] [price]\n"
            "Пример: /add_gift 123456 gift-123 \"Cool Gift\" 10.5"
        )
        return
    
    try:
        user_id = int(context.args[0])
        gift_id = context.args[1]
        gift_name = ' '.join(context.args[2:-1])  # Название может быть с пробелами
        price = float(context.args[-1])
        
        db = get_db()
        user = db.query(User).filter(User.user_id == user_id).first()
        
        if not user:
            await update.message.reply_text(f"❌ Пользователь {user_id} не найден.")
            return
        
        # Проверяем, нет ли уже такого подарка
        existing = db.query(UserGift).filter(
            UserGift.user_id == user_id,
            UserGift.gift_id == gift_id
        ).first()
        
        if existing:
            await update.message.reply_text(f"❌ У пользователя уже есть этот подарок.")
            return
        
        # Добавляем подарок
        user_gift = UserGift(
            user_id=user_id,
            gift_id=gift_id,
            gift_name=gift_name,
            gift_price=price
        )
        db.add(user_gift)
        
        # Создаем транзакцию
        transaction = Transaction(
            user_id=user_id,
            transaction_type='purchase',
            amount=price,
            currency='TON',
            gift_id=gift_id,
            status='completed',
            tx_hash=f'admin_gift_{update.effective_user.id}_{datetime.now().timestamp()}'
        )
        db.add(transaction)
        db.commit()
        
        await update.message.reply_text(
            f"✅ Подарок добавлен!\n\n"
            f"👤 Пользователь: {user_id}\n"
            f"🎁 Подарок: {gift_name}\n"
            f"💰 Цена: {price} TON"
        )
        
    except ValueError:
        await update.message.reply_text("❌ Неверный формат. Проверьте параметры.")
    except Exception as e:
        await update.message.reply_text(f"❌ Ошибка: {str(e)}")
    finally:
        db.close()


def main():
    """Запуск бота"""
    if not BOT_TOKEN:
        print("❌ Ошибка: ADMIN_BOT_TOKEN не установлен в переменных окружения!")
        return
    
    # Создаем приложение
    application = Application.builder().token(BOT_TOKEN).build()
    
    # Регистрируем обработчики команд
    application.add_handler(CommandHandler("start", start))
    application.add_handler(CommandHandler("help", help_command))
    application.add_handler(CommandHandler("balance", balance_command))
    application.add_handler(CommandHandler("users", users_command))
    application.add_handler(CommandHandler("user", user_command))
    application.add_handler(CommandHandler("gifts", gifts_command))
    application.add_handler(CommandHandler("transactions", transactions_command))
    application.add_handler(CommandHandler("add_gift", add_gift_command))
    
    print("🤖 Админ-бот запущен!")
    
    # Запускаем бота
    application.run_polling(allowed_updates=Update.ALL_TYPES)


if __name__ == '__main__':
    main()

