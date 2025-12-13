# Инструкция по деплою на Railway

## Шаг 1: Создать GitHub репозиторий

### 1.1. Инициализировать Git (если еще не сделано)

```bash
git init
git add .
git commit -m "Initial commit"
```

### 1.2. Создать репозиторий на GitHub

1. Зайдите на [github.com](https://github.com)
2. Нажмите "New repository" (зеленая кнопка справа)
3. Название: `capsule-market` (или любое другое)
4. Выберите **Private** или **Public**
5. НЕ ставьте галочки (README, .gitignore, license) - у нас уже есть файлы
6. Нажмите "Create repository"

### 1.3. Подключить локальный репозиторий к GitHub

GitHub покажет команды. Выполните:

```bash
git remote add origin https://github.com/YOUR_USERNAME/capsule-market.git
git branch -M main
git push -u origin main
```

Замените `YOUR_USERNAME` на ваш GitHub username.

## Шаг 2: Деплой на Railway

1. Зайдите на [railway.app](https://railway.app)
2. Войдите через GitHub
3. Нажмите "New Project"
4. Выберите "Deploy from GitHub repo"
5. Выберите ваш репозиторий `capsule-market`
6. Railway автоматически определит Python проект

## Шаг 3: Настройка Railway

1. В настройках сервиса найдите "Settings"
2. Установите:
   - **Root Directory**: `backend`
   - **Start Command**: `uvicorn app:app --host 0.0.0.0 --port $PORT`

Или Railway может автоматически определить команду запуска.

## Шаг 4: Получить URL

1. В Railway нажмите на ваш сервис
2. Перейдите на вкладку "Settings"
3. Найдите "Domains" или "Public URL"
4. Скопируйте URL (например: `https://capsule-market.up.railway.app`)

## Шаг 5: Обновить фронтенд

Обновите `src/contexts/UserContext.tsx`:

```typescript
const API_BASE_URL = import.meta.env.VITE_API_URL || 
  (import.meta.env.PROD 
    ? 'https://capsule-market.up.railway.app/api' // ← Ваш URL
    : '/api')
```

Пересоберите и задеплойте:
```bash
npm run build
firebase deploy
```

## Альтернатива: Деплой без GitHub (через Railway CLI)

Если не хотите использовать GitHub:

1. Установите Railway CLI:
```bash
npm i -g @railway/cli
```

2. Войдите:
```bash
railway login
```

3. В папке `backend/`:
```bash
cd backend
railway init
railway up
```

Но проще через GitHub!

