# Деплой бэкенда

## Варианты деплоя

### 1. Railway (Рекомендуется - простой и бесплатный)

1. Зарегистрируйтесь на [Railway.app](https://railway.app)
2. Создайте новый проект
3. Подключите GitHub репозиторий или загрузите код
4. Railway автоматически определит Python проект
5. Установите переменные окружения (если нужно)
6. Railway автоматически задеплоит и даст URL

**Команды для Railway:**
```bash
# Railway автоматически установит зависимости из requirements.txt
# И запустит через: python run.py или uvicorn app:app
```

### 2. Render

1. Зарегистрируйтесь на [Render.com](https://render.com)
2. Создайте новый Web Service
3. Подключите репозиторий
4. Настройки:
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app:app --host 0.0.0.0 --port $PORT`
   - **Environment**: Python 3

### 3. Fly.io

1. Установите Fly CLI: `curl -L https://fly.io/install.sh | sh`
2. Войдите: `fly auth login`
3. Инициализируйте: `fly launch`
4. Задеплойте: `fly deploy`

### 4. PythonAnywhere

1. Зарегистрируйтесь на [PythonAnywhere.com](https://www.pythonanywhere.com)
2. Загрузите файлы через веб-интерфейс
3. Настройте Web App с WSGI
4. Укажите путь к `app.py`

### 5. Heroku

1. Установите Heroku CLI
2. Создайте `Procfile`:
```
web: uvicorn app:app --host 0.0.0.0 --port $PORT
```
3. Задеплойте:
```bash
heroku create your-app-name
git push heroku main
```

## После деплоя

После деплоя получите URL вашего бэкенда (например: `https://your-app.railway.app`)

Обновите переменную окружения в Firebase или в коде:

### Вариант 1: Через переменные окружения Vite

Создайте файл `.env.production`:
```
VITE_API_URL=https://your-backend-url.railway.app/api
```

### Вариант 2: Обновить код напрямую

В `src/contexts/UserContext.tsx`:
```typescript
const API_BASE_URL = import.meta.env.VITE_API_URL || 
  (import.meta.env.PROD 
    ? 'https://your-backend-url.railway.app/api' 
    : '/api')
```

## Проверка работы

После деплоя проверьте:
1. Health check: `https://your-backend-url.railway.app/health`
2. API docs: `https://your-backend-url.railway.app/docs`
3. Тестовый запрос: `https://your-backend-url.railway.app/api/user/123456/balance`

