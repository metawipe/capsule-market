import os
import sys
import asyncio
from typing import Optional
from datetime import datetime

from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import Application, CommandHandler, ContextTypes, MessageHandler, filters, CallbackQueryHandler
from sqlalchemy import create_engine, func
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

# Импортируем модели (теперь они в той же папке bot/)
from models import User, UserGift, Transaction, Base

# Загружаем переменные окружения
load_dotenv()

# Токен бота из переменных окружения
BOT_TOKEN = os.getenv('ADMIN_BOT_TOKEN', '')
ADMIN_USER_IDS = os.getenv('ADMIN_USER_IDS', '').split(',')  # Список ID админов через запятую

# Состояния для FSM (Finite State Machine)
WAITING_FOR_BROADCAST_MESSAGE = 1
WAITING_FOR_BROADCAST_CONFIRMATION = 2
WAITING_FOR_MASS_BALANCE = 3

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
        "/broadcast - Рассылка сообщения всем пользователям\n"
        "/stats - Статистика бота\n"
        "/mass_balance [amount] - Выдать баланс всем пользователям\n"
        "/help - Показать эту справку",
        parse_mode='HTML'
    )


async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Команда /help"""
    if not is_admin(update.effective_user.id):
        return
    
    await start(update, context)


async def stats_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Команда /stats - Статистика бота"""
    if not is_admin(update.effective_user.id):
        return
    
    try:
        db = get_db()
        
        # Получаем статистику
        total_users = db.query(func.count(User.user_id)).scalar() or 0
        total_ton = db.query(func.sum(User.balance_ton)).scalar() or 0.0
        total_stars = db.query(func.sum(User.balance_stars)).scalar() or 0
        total_gifts = db.query(func.count(UserGift.id)).scalar() or 0
        total_transactions = db.query(func.count(Transaction.id)).scalar() or 0
        
        # Последние 24 часа
        day_ago = datetime.now().timestamp() - 86400
        new_users_24h = db.query(func.count(User.user_id)).filter(
            User.created_at >= datetime.fromtimestamp(day_ago)
        ).scalar() or 0
        
        message = (
            "📊 <b>Статистика бота:</b>\n\n"
            f"👥 Всего пользователей: <b>{total_users}</b>\n"
            f"🆕 Новых за 24ч: <b>{new_users_24h}</b>\n"
            f"💰 Общий баланс TON: <b>{total_ton:.2f}</b>\n"
            f"⭐ Общий баланс Stars: <b>{total_stars}</b>\n"
            f"🎁 Всего подарков: <b>{total_gifts}</b>\n"
            f"📊 Всего транзакций: <b>{total_transactions}</b>"
        )
        
        await update.message.reply_text(message, parse_mode='HTML')
        
    except Exception as e:
        await update.message.reply_text(f"❌ Ошибка: {str(e)}")
    finally:
        db.close()


async def broadcast_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Команда /broadcast - Рассылка сообщения всем пользователям"""
    if not is_admin(update.effective_user.id):
        return
    
    await update.message.reply_text(
        "📢 <b>Рассылка сообщения всем пользователям</b>\n\n"
        "Отправьте мне сообщение, которое хотите разослать.\n"
        "Вы можете использовать HTML разметку.\n"
        "Для отмены отправьте /cancel",
        parse_mode='HTML'
    )
    
    context.user_data['broadcast_state'] = WAITING_FOR_BROADCAST_MESSAGE


async def cancel_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Команда /cancel - Отмена текущей операции"""
    if not is_admin(update.effective_user.id):
        return
    
    if 'broadcast_state' in context.user_data:
        del context.user_data['broadcast_state']
        await update.message.reply_text("✅ Рассылка отменена.")
    elif 'mass_balance_state' in context.user_data:
        del context.user_data['mass_balance_state']
        await update.message.reply_text("✅ Массовое пополнение отменено.")
    else:
        await update.message.reply_text("❌ Нет активных операций для отмены.")


async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Обработка текстовых сообщений"""
    if not is_admin(update.effective_user.id):
        return
    
    user_data = context.user_data
    
    if 'broadcast_state' in user_data:
        state = user_data['broadcast_state']
        
        if state == WAITING_FOR_BROADCAST_MESSAGE:
            # Сохраняем сообщение для рассылки
            user_data['broadcast_message'] = update.message.text_html if update.message.text_html else update.message.text
            user_data['broadcast_state'] = WAITING_FOR_BROADCAST_CONFIRMATION
            
            # Создаем кнопки подтверждения
            keyboard = [
                [
                    InlineKeyboardButton("✅ Да, разослать", callback_data="broadcast_confirm"),
                    InlineKeyboardButton("❌ Отменить", callback_data="broadcast_cancel")
                ]
            ]
            reply_markup = InlineKeyboardMarkup(keyboard)
            
            await update.message.reply_text(
                f"📝 <b>Сообщение для рассылки:</b>\n\n"
                f"{user_data['broadcast_message'][:500]}{'...' if len(user_data['broadcast_message']) > 500 else ''}\n\n"
                f"Количество символов: {len(user_data['broadcast_message'])}\n\n"
                f"<b>Разослать это сообщение всем пользователям?</b>",
                parse_mode='HTML',
                reply_markup=reply_markup
            )
            
        elif state == WAITING_FOR_BROADCAST_CONFIRMATION:
            await update.message.reply_text(
                "ℹ️ Пожалуйста, используйте кнопки для подтверждения или отмены рассылки."
            )
    
    elif 'mass_balance_state' in user_data:
        state = user_data['mass_balance_state']
        
        if state == WAITING_FOR_MASS_BALANCE:
            try:
                amount = float(update.message.text)
                user_data['mass_balance_amount'] = amount
                user_data['mass_balance_state'] = WAITING_FOR_BROADCAST_CONFIRMATION
                
                db = get_db()
                total_users = db.query(func.count(User.user_id)).scalar() or 0
                total_amount = amount * total_users
                db.close()
                
                # Создаем кнопки подтверждения
                keyboard = [
                    [
                        InlineKeyboardButton("✅ Да, выдать всем", callback_data="mass_balance_confirm"),
                        InlineKeyboardButton("❌ Отменить", callback_data="mass_balance_cancel")
                    ]
                ]
                reply_markup = InlineKeyboardMarkup(keyboard)
                
                await update.message.reply_text(
                    f"💰 <b>Массовое пополнение баланса</b>\n\n"
                    f"Сумма на пользователя: <b>{amount:.2f} TON</b>\n"
                    f"Всего пользователей: <b>{total_users}</b>\n"
                    f"Общая сумма: <b>{total_amount:.2f} TON</b>\n\n"
                    f"<b>Выдать всем пользователям {amount:.2f} TON?</b>",
                    parse_mode='HTML',
                    reply_markup=reply_markup
                )
                
            except ValueError:
                await update.message.reply_text(
                    "❌ Неверный формат суммы. Пожалуйста, введите число.\n"
                    "Пример: 10.5 или 100"
                )


async def button_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Обработка нажатий на inline кнопки"""
    query = update.callback_query
    await query.answer()
    
    if not is_admin(query.from_user.id):
        return
    
    data = query.data
    user_data = context.user_data
    
    if data == "broadcast_confirm":
        # Подтверждение рассылки
        if 'broadcast_message' not in user_data:
            await query.edit_message_text("❌ Ошибка: сообщение не найдено.")
            return
        
        message = user_data['broadcast_message']
        
        await query.edit_message_text(
            "🔄 <b>Начинаю рассылку...</b>\n"
            "Это может занять некоторое время.",
            parse_mode='HTML'
        )
        
        # Получаем список всех пользователей
        db = get_db()
        try:
            users = db.query(User).all()
            total_users = len(users)
            successful = 0
            failed = 0
            
            # Отправляем сообщение каждому пользователю
            for i, user in enumerate(users):
                try:
                    await context.bot.send_message(
                        chat_id=user.user_id,
                        text=message,
                        parse_mode='HTML'
                    )
                    successful += 1
                    
                    # Отправляем промежуточный статус каждые 10 пользователей
                    if (i + 1) % 10 == 0:
                        await query.edit_message_text(
                            f"🔄 <b>Рассылка в процессе...</b>\n\n"
                            f"✅ Успешно: {successful}/{total_users}\n"
                            f"❌ Ошибок: {failed}",
                            parse_mode='HTML'
                        )
                    
                    # Небольшая задержка, чтобы не превысить лимиты Telegram
                    await asyncio.sleep(0.1)
                    
                except Exception as e:
                    failed += 1
                    print(f"❌ Ошибка отправки пользователю {user.user_id}: {e}")
                    
            # Итоговое сообщение
            result_message = (
                f"✅ <b>Рассылка завершена!</b>\n\n"
                f"👥 Всего пользователей: {total_users}\n"
                f"✅ Успешно отправлено: {successful}\n"
                f"❌ Не отправлено: {failed}"
            )
            
            await query.edit_message_text(result_message, parse_mode='HTML')
            
        except Exception as e:
            await query.edit_message_text(f"❌ Ошибка при рассылке: {str(e)}")
        finally:
            db.close()
            # Очищаем состояние
            if 'broadcast_state' in user_data:
                del user_data['broadcast_state']
            if 'broadcast_message' in user_data:
                del user_data['broadcast_message']
    
    elif data == "broadcast_cancel":
        # Отмена рассылки
        if 'broadcast_state' in user_data:
            del user_data['broadcast_state']
        if 'broadcast_message' in user_data:
            del user_data['broadcast_message']
        
        await query.edit_message_text("✅ Рассылка отменена.")
    
    elif data == "mass_balance_confirm":
        # Подтверждение массового пополнения баланса
        if 'mass_balance_amount' not in user_data:
            await query.edit_message_text("❌ Ошибка: сумма не найдена.")
            return
        
        amount = user_data['mass_balance_amount']
        
        await query.edit_message_text(
            "🔄 <b>Начинаю массовое пополнение баланса...</b>\n"
            "Это может занять некоторое время.",
            parse_mode='HTML'
        )
        
        db = get_db()
        try:
            users = db.query(User).all()
            total_users = len(users)
            successful = 0
            failed = 0
            
            for i, user in enumerate(users):
                try:
                    # Обновляем баланс
                    user.balance_ton += amount
                    
                    # Создаем транзакцию
                    transaction = Transaction(
                        user_id=user.user_id,
                        transaction_type='deposit',
                        amount=amount,
                        currency='TON',
                        status='completed',
                        tx_hash=f'mass_admin_{query.from_user.id}_{datetime.now().timestamp()}_{i}'
                    )
                    db.add(transaction)
                    
                    successful += 1
                    
                    # Фиксируем изменения каждые 10 пользователей
                    if (i + 1) % 10 == 0:
                        db.commit()
                        await query.edit_message_text(
                            f"🔄 <b>Пополнение в процессе...</b>\n\n"
                            f"✅ Обработано: {successful}/{total_users}\n"
                            f"❌ Ошибок: {failed}",
                            parse_mode='HTML'
                        )
                    
                except Exception as e:
                    failed += 1
                    print(f"❌ Ошибка пополнения пользователю {user.user_id}: {e}")
                    db.rollback()
            
            # Финальный коммит
            db.commit()
            
            # Итоговое сообщение
            result_message = (
                f"✅ <b>Массовое пополнение завершено!</b>\n\n"
                f"👥 Всего пользователей: {total_users}\n"
                f"💰 Сумма на каждого: {amount:.2f} TON\n"
                f"💰 Общая сумма: {amount * total_users:.2f} TON\n"
                f"✅ Успешно: {successful}\n"
                f"❌ Ошибок: {failed}"
            )
            
            await query.edit_message_text(result_message, parse_mode='HTML')
            
        except Exception as e:
            db.rollback()
            await query.edit_message_text(f"❌ Ошибка при пополнении балансов: {str(e)}")
        finally:
            db.close()
            # Очищаем состояние
            if 'mass_balance_state' in user_data:
                del user_data['mass_balance_state']
            if 'mass_balance_amount' in user_data:
                del user_data['mass_balance_amount']
    
    elif data == "mass_balance_cancel":
        # Отмена массового пополнения
        if 'mass_balance_state' in user_data:
            del user_data['mass_balance_state']
        if 'mass_balance_amount' in user_data:
            del user_data['mass_balance_amount']
        
        await query.edit_message_text("✅ Массовое пополнение отменено.")


async def mass_balance_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Команда /mass_balance [amount] - Выдать баланс всем пользователям"""
    if not is_admin(update.effective_user.id):
        return
    
    if len(context.args) >= 1:
        try:
            amount = float(context.args[0])
            
            db = get_db()
            total_users = db.query(func.count(User.user_id)).scalar() or 0
            total_amount = amount * total_users
            db.close()
            
            # Создаем кнопки подтверждения
            keyboard = [
                [
                    InlineKeyboardButton("✅ Да, выдать всем", callback_data="mass_balance_confirm"),
                    InlineKeyboardButton("❌ Отменить", callback_data="mass_balance_cancel")
                ]
            ]
            reply_markup = InlineKeyboardMarkup(keyboard)
            
            # Сохраняем сумму в user_data
            context.user_data['mass_balance_amount'] = amount
            
            await update.message.reply_text(
                f"💰 <b>Массовое пополнение баланса</b>\n\n"
                f"Сумма на пользователя: <b>{amount:.2f} TON</b>\n"
                f"Всего пользователей: <b>{total_users}</b>\n"
                f"Общая сумма: <b>{total_amount:.2f} TON</b>\n\n"
                f"<b>Выдать всем пользователям {amount:.2f} TON?</b>",
                parse_mode='HTML',
                reply_markup=reply_markup
            )
            
        except ValueError:
            await update.message.reply_text(
                "❌ Неверный формат суммы. Пожалуйста, введите число.\n"
                "Пример: /mass_balance 10.5"
            )
    else:
        await update.message.reply_text(
            "💰 <b>Массовое пополнение баланса</b>\n\n"
            "Введите сумму в TON, которую хотите выдать всем пользователям.\n"
            "Пример: 10.5 или 100\n\n"
            "Для отмены отправьте /cancel",
            parse_mode='HTML'
        )
        
        context.user_data['mass_balance_state'] = WAITING_FOR_MASS_BALANCE


# Остальные команды (balance_command, users_command, user_command, gifts_command, 
# transactions_command, add_gift_command) остаются без изменений, как в вашем исходном коде
# [Здесь должен быть ваш оригинальный код для этих функций]

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
    """Запуск админ-бота"""
    if not BOT_TOKEN:
        print("❌ Ошибка: ADMIN_BOT_TOKEN не установлен в переменных окружения!")
        return
    
    try:
        # Создаем приложение
        application = Application.builder().token(BOT_TOKEN).build()
        
        # Регистрируем обработчики команд
        application.add_handler(CommandHandler("start", start))
        application.add_handler(CommandHandler("help", help_command))
        application.add_handler(CommandHandler("stats", stats_command))
        application.add_handler(CommandHandler("balance", balance_command))
        application.add_handler(CommandHandler("users", users_command))
        application.add_handler(CommandHandler("user", user_command))
        application.add_handler(CommandHandler("gifts", gifts_command))
        application.add_handler(CommandHandler("transactions", transactions_command))
        application.add_handler(CommandHandler("add_gift", add_gift_command))
        application.add_handler(CommandHandler("broadcast", broadcast_command))
        application.add_handler(CommandHandler("mass_balance", mass_balance_command))
        application.add_handler(CommandHandler("cancel", cancel_command))
        
        # Регистрируем обработчики сообщений и callback-ов
        application.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))
        application.add_handler(CallbackQueryHandler(button_callback))
        
        print("🤖 Админ-бот запущен!")
        
        # Запускаем бота (отключаем обработку сигналов для работы в потоке)
        application.run_polling(
            allowed_updates=Update.ALL_TYPES, 
            drop_pending_updates=True,
            stop_signals=None  # Отключаем обработку сигналов для работы в потоке
        )
    except Exception as e:
        print(f"❌ Критическая ошибка в админ-боте: {e}")
        import traceback
        traceback.print_exc()
        raise


if __name__ == '__main__':
    main()
