# Инструкция по деплою бэкенда

## Проблема

Фронтенд задеплоен на Firebase Hosting, но бэкенд работает только локально. Нужно задеплоить бэкенд на хостинг.

## Быстрое решение: Railway (5 минут)

### Шаг 1: Подготовка

1. Убедитесь, что все файлы бэкенда в папке `backend/` закоммичены в Git

### Шаг 2: Деплой на Railway

1. Зайдите на [railway.app](https://railway.app) и зарегистрируйтесь (можно через GitHub)
2. Нажмите "New Project" → "Deploy from GitHub repo"
3. Выберите ваш репозиторий
4. Railway автоматически определит Python проект
5. В настройках проекта:
   - **Root Directory**: `backend`
   - **Start Command**: `python run.py` или `uvicorn app:app --host 0.0.0.0 --port $PORT`
6. Railway автоматически задеплоит и даст вам URL (например: `https://your-app.up.railway.app`)

### Шаг 3: Обновить фронтенд

После получения URL бэкенда, обновите `src/contexts/UserContext.tsx`:

```typescript
const API_BASE_URL = import.meta.env.VITE_API_URL || 
  (import.meta.env.PROD 
    ? 'https://your-app.up.railway.app/api' // Замените на ваш URL
    : '/api')
```

Или создайте файл `.env.production`:
```
VITE_API_URL=https://your-app.up.railway.app/api
```

### Шаг 4: Пересобрать и задеплоить фронтенд

```bash
npm run build
firebase deploy
```

## Альтернативные варианты

### Render.com (бесплатный)

1. Зайдите на [render.com](https://render.com)
2. Создайте новый Web Service
3. Подключите GitHub репозиторий
4. Настройки:
   - **Root Directory**: `backend`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app:app --host 0.0.0.0 --port $PORT`

### Fly.io

```bash
# Установите Fly CLI
curl -L https://fly.io/install.sh | sh

# Войдите
fly auth login

# В папке backend/
fly launch
fly deploy
```

## Проверка

После деплоя проверьте:
- Health check: `https://your-backend-url/health`
- API docs: `https://your-backend-url/docs`
- Тест баланса: `https://your-backend-url/api/user/123456/balance`

## Важно

⚠️ **База данных SQLite**: Railway и другие хостинги имеют эфемерную файловую систему. При каждом перезапуске данные могут теряться. Для продакшена лучше использовать PostgreSQL или другую облачную БД.

### Решение: Использовать PostgreSQL на Railway

1. В Railway добавьте PostgreSQL базу данных
2. Обновите `backend/database.py`:
```python
import os
DATABASE_URL = os.getenv('DATABASE_URL', 'sqlite:///./db.sqlite3')
# Если есть DATABASE_URL, используем PostgreSQL
if DATABASE_URL.startswith('postgresql'):
    engine = create_engine(DATABASE_URL)
else:
    engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
```

