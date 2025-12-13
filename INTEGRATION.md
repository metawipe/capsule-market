# Интеграция Backend и Frontend

## Быстрый старт

### 1. Запуск Backend

```bash
cd backend

# Создать виртуальное окружение
python -m venv venv

# Активировать (Windows)
venv\Scripts\activate

# Активировать (Linux/Mac)
source venv/bin/activate

# Обновить pip до последней версии
python -m pip install --upgrade pip

# Установить зависимости
# Если возникают ошибки компиляции, попробуйте:
pip install --upgrade pip setuptools wheel
pip install -r requirements.txt

# Запустить сервер
python main.py
```

Backend будет доступен по адресу: `http://localhost:8000`

### 2. Настройка Frontend

Создайте файл `.env` в корне проекта (рядом с `package.json`):

```env
VITE_API_URL=http://localhost:8000
```

### 3. Запуск Frontend

```bash
# Установить зависимости (если еще не установлены)
npm install

# Запустить dev сервер
npm run dev
```

Frontend будет доступен по адресу: `http://localhost:5173` (или другой порт, указанный Vite)

## Структура интеграции

### API Клиент
- `src/api/client.ts` - основной клиент для работы с API
- `src/api/config.ts` - конфигурация API (URL, таймауты)
- `src/api/types.ts` - TypeScript типы для данных API

### React Hooks
- `src/hooks/useMarket.ts` - хук для загрузки маркетплейса
- `src/hooks/useGiftDetail.ts` - хук для детальной информации о гифте
- `src/hooks/useSearch.ts` - хук для поиска гифтов

### Контекст
- `src/contexts/MarketContext.tsx` - контекст для управления состоянием маркетплейса (поиск, табы)

### Компоненты
- `src/components/MarketContent.tsx` - отображает список гифтов из API
- `src/components/MyGiftsContent.tsx` - отображает "мои гифты" с поддержкой поиска
- `src/components/ProfileHeader.tsx` - интегрирован поиск через контекст

## API Эндпоинты

### GET /api/market
Получить список гифтов для маркетплейса

**Параметры:**
- `limit` (query, optional) - количество гифтов (по умолчанию 25)

**Ответ:**
```json
{
  "total": 25,
  "gifts": [
    {
      "id": "scared-cat",
      "name": "Scared Cat",
      "price": 45.5,
      "preview": "https://api.changes.tg/model/scared-cat/1.png",
      "models_count": 5,
      "in_stock": true,
      "rating": 4.7,
      "tags": ["animal", "cute"]
    }
  ]
}
```

### GET /api/gift/{gift_name}
Получить детальную информацию о гифте

**Ответ:**
```json
{
  "id": "scared-cat",
  "name": "Scared Cat",
  "api_name": "Scared Cat",
  "price": 45.5,
  "in_stock": true,
  "rating": 4.7,
  "models_count": 5,
  "symbols_count": 3,
  "backdrops_count": 2,
  "models": [...],
  "symbols": [...],
  "backdrops": [...],
  "previews": [...]
}
```

### GET /api/search?query=...
Поиск гифтов по названию

### GET /api/filter?min_price=...&max_price=...
Фильтрация гифтов по цене

### GET /api/random
Получить случайный гифт с деталями

### GET /api/stats
Статистика маркетплейса

## Особенности

1. **Автоматическая загрузка данных**: Backend загружает все гифты из changes.tg при старте
2. **Кэширование**: Данные кэшируются в памяти на 1 час
3. **Rate Limiting**: 100 запросов в минуту на IP
4. **CORS**: Настроен для работы с фронтендом
5. **Обработка ошибок**: Все ошибки обрабатываются и отображаются пользователю
6. **Состояния загрузки**: Показываются спиннеры и сообщения об ошибках

## Отладка

### Проверка работы Backend
```bash
# Проверить здоровье сервиса
curl http://localhost:8000/health

# Получить список гифтов
curl http://localhost:8000/api/market
```

### Проверка работы Frontend
1. Откройте DevTools (F12)
2. Перейдите на вкладку Network
3. Проверьте запросы к `/api/*`
4. Проверьте консоль на наличие ошибок

### Частые проблемы

**CORS ошибки:**
- Убедитесь, что `VITE_API_URL` в `.env` указывает на правильный адрес backend
- Проверьте настройки CORS в `backend/app/config.py`

**Ошибки подключения:**
- Убедитесь, что backend запущен и доступен
- Проверьте, что порт 8000 не занят другим процессом

**Пустые результаты:**
- Backend может еще загружать данные при первом запуске
- Проверьте логи backend для диагностики

