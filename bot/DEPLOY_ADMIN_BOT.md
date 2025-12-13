# Деплой админ-бота на Railway

## Быстрая инструкция

### 1. Создайте бота в Telegram

1. Напишите [@BotFather](https://t.me/BotFather)
2. Отправьте `/newbot`
3. Придумайте имя и username для бота
4. Скопируйте токен (например: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`)

### 2. Получите свой Telegram ID

1. Напишите [@userinfobot](https://t.me/userinfobot)
2. Скопируйте ваш ID (например: `123456789`)

### 3. Деплой на Railway

1. В Railway создайте **новый сервис** в том же проекте
2. Выберите "Deploy from GitHub repo"
3. Выберите тот же репозиторий `metawipe/capsule-market`
4. В настройках:
   - **Root Directory**: `bot`
   - **Start Command**: `python admin_bot.py`

### 4. Добавьте переменные окружения в Railway

В настройках сервиса бота добавьте:

- `ADMIN_BOT_TOKEN` = ваш токен от BotFather
- `ADMIN_USER_IDS` = ваш Telegram ID (например: `123456789`)
- `DATABASE_URL` = скопируйте из основного сервиса бэкенда (или используйте `sqlite:///../backend/db.sqlite3` для локальной БД)

### 5. Проверка

После деплоя:
1. Найдите вашего бота в Telegram
2. Отправьте `/start`
3. Попробуйте команду `/users` - должны увидеть список пользователей

## Команды бота

- `/balance [user_id] [amount]` - Выдать баланс
  - Пример: `/balance 123456 100.5`
- `/users` - Список всех пользователей
- `/user [user_id]` - Информация о пользователе
- `/gifts [user_id]` - Подарки пользователя
- `/transactions [user_id]` - Транзакции пользователя
- `/add_gift [user_id] [gift_id] [gift_name] [price]` - Добавить подарок
  - Пример: `/add_gift 123456 gift-123 "Cool Gift" 10.5`

## Важно

⚠️ **Безопасность**: Убедитесь, что `ADMIN_USER_IDS` содержит только ваш ID, иначе другие смогут управлять базой!

