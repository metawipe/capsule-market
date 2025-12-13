# Админ-бот для Capsule Market

Telegram бот для управления базой данных пользователей.

## Установка

1. Установите зависимости:
```bash
cd bot
pip install -r requirements.txt
```

2. Создайте бота в Telegram:
   - Напишите [@BotFather](https://t.me/BotFather)
   - Отправьте `/newbot`
   - Следуйте инструкциям
   - Скопируйте токен

3. Получите свой Telegram ID:
   - Напишите [@userinfobot](https://t.me/userinfobot)
   - Скопируйте ваш ID

4. Создайте файл `.env`:
```bash
cp .env.example .env
```

5. Заполните `.env`:
```
ADMIN_BOT_TOKEN=ваш_токен_от_BotFather
ADMIN_USER_IDS=ваш_telegram_id
DATABASE_URL=sqlite:///../backend/db.sqlite3
```

## Запуск

```bash
python admin_bot.py
```

## Команды

- `/start` или `/help` - Показать справку
- `/balance [user_id] [amount]` - Выдать баланс пользователю
  - Пример: `/balance 123456 100.5`
- `/users` - Список всех пользователей
- `/user [user_id]` - Информация о пользователе
- `/gifts [user_id]` - Подарки пользователя
- `/transactions [user_id]` - Транзакции пользователя
- `/add_gift [user_id] [gift_id] [gift_name] [price]` - Добавить подарок пользователю
  - Пример: `/add_gift 123456 gift-123 "Cool Gift" 10.5`

## Деплой на Railway

1. В Railway создайте новый сервис
2. Подключите репозиторий
3. Укажите:
   - **Root Directory**: `bot`
   - **Start Command**: `python admin_bot.py`
4. Добавьте переменные окружения:
   - `ADMIN_BOT_TOKEN` - токен бота
   - `ADMIN_USER_IDS` - ваш Telegram ID
   - `DATABASE_URL` - URL базы данных (можно взять из основного сервиса)

## Безопасность

⚠️ **Важно**: Укажите `ADMIN_USER_IDS` в переменных окружения, чтобы только вы могли использовать бота!

