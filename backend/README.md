# Capsule Market Backend API

Бэкенд для маркетплейса подарков Telegram на FastAPI с SQLite базой данных.

## Установка

1. Перейдите в директорию backend:
```bash
cd backend
```

2. Создайте виртуальное окружение (рекомендуется):
```bash
python -m venv venv
source venv/bin/activate  # Linux/Mac
# или
venv\Scripts\activate  # Windows
```

3. Установите зависимости:
```bash
pip install -r requirements.txt
```

4. Инициализируйте базу данных (опционально, создастся автоматически):
```bash
python init_db.py
```

5. Запустите сервер:
```bash
python run.py
```

Или напрямую:
```bash
python app.py
```

Или с помощью uvicorn:
```bash
uvicorn app:app --reload --host 0.0.0.0 --port 8000
```

База данных `db.sqlite3` будет создана автоматически при первом запуске.

## API Endpoints

### Пользователи

- `GET /api/user/{user_id}` - Получить информацию о пользователе
- `POST /api/user` - Создать нового пользователя
- `GET /api/user/{user_id}/balance` - Получить баланс пользователя
- `POST /api/user/{user_id}/deposit` - Пополнить баланс

### Подарки

- `GET /api/user/{user_id}/gifts` - Получить список подарков пользователя
- `POST /api/user/{user_id}/purchase` - Купить подарок

### Транзакции

- `GET /api/user/{user_id}/transactions` - Получить историю транзакций

## База данных

База данных SQLite создается автоматически при первом запуске в файле `db.sqlite3`.

### Таблицы

- **users** - Пользователи (user_id, wallet_address, balance_ton, balance_stars)
- **user_gifts** - Подарки пользователей (gift_id, gift_name, gift_price, purchase_date)
- **transactions** - Транзакции (type, amount, currency, status)

## Примеры запросов

### Получить баланс
```bash
curl http://localhost:8000/api/user/123456/balance
```

### Купить подарок
```bash
curl -X POST http://localhost:8000/api/user/123456/purchase \
  -H "Content-Type: application/json" \
  -d '{
    "gift_id": "gift-123",
    "gift_name": "Cool Gift",
    "gift_price": 10.5,
    "gift_preview": "https://example.com/preview.png"
  }'
```

### Пополнить баланс
```bash
curl -X POST http://localhost:8000/api/user/123456/deposit \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 100.0,
    "currency": "TON",
    "tx_hash": "0x123..."
  }'
```

## Документация API

После запуска сервера документация доступна по адресу:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

