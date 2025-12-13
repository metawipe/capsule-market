# Быстрый деплой на Railway

## Что нужно сделать:

### 1. Создать репозиторий на GitHub

1. Зайдите на [github.com](https://github.com) и войдите
2. Нажмите зеленую кнопку **"New"** (или "+" → "New repository")
3. Название: `capsule-market` (или любое другое)
4. Выберите **Private** или **Public**
5. **НЕ ставьте галочки** (README, .gitignore, license) - у нас уже есть файлы
6. Нажмите **"Create repository"**

### 2. Загрузить код на GitHub

Выполните в терминале (в папке проекта):

```bash
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/capsule-market.git
git push -u origin main
```

**Замените `YOUR_USERNAME` на ваш GitHub username!**

Например, если ваш username `ivan123`, то:
```bash
git remote add origin https://github.com/ivan123/capsule-market.git
```

### 3. Деплой на Railway

1. Зайдите на [railway.app](https://railway.app)
2. Нажмите **"Login"** → выберите **"Login with GitHub"**
3. Нажмите **"New Project"**
4. Выберите **"Deploy from GitHub repo"**
5. Выберите ваш репозиторий `capsule-market`
6. Railway автоматически определит Python проект

### 4. Настройка Railway

1. В Railway нажмите на ваш сервис
2. Перейдите в **"Settings"**
3. Найдите **"Root Directory"** и укажите: `backend`
4. Найдите **"Start Command"** и укажите: `uvicorn app:app --host 0.0.0.0 --port $PORT`

### 5. Получить URL

1. В Railway перейдите на вкладку **"Settings"**
2. Найдите раздел **"Domains"** или **"Public URL"**
3. Скопируйте URL (например: `https://capsule-market-production.up.railway.app`)

### 6. Обновить фронтенд

Откройте `src/contexts/UserContext.tsx` и замените строку 19:

```typescript
const API_BASE_URL = import.meta.env.VITE_API_URL || 
  (import.meta.env.PROD 
    ? 'https://ВАШ-URL-ИЗ-RAILWAY.up.railway.app/api' // ← Вставьте ваш URL
    : '/api')
```

Затем:
```bash
npm run build
firebase deploy
```

## Готово! 🎉

Теперь ваш бэкенд работает в продакшене!

