# Интеграция Backend с Frontend

## Настройка API URL

В файле `src/contexts/UserContext.tsx` обновите базовый URL API:

```typescript
const API_BASE_URL = 'http://localhost:8000/api'
```

## Обновление UserContext

Замените локальное хранилище на API вызовы:

```typescript
// Получение баланса
const fetchBalance = async (userId: number) => {
  const response = await fetch(`${API_BASE_URL}/user/${userId}/balance`)
  return await response.json()
}

// Покупка подарка
const purchaseGift = async (userId: number, gift: GiftPreview) => {
  const response = await fetch(`${API_BASE_URL}/user/${userId}/purchase`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      gift_id: gift.id,
      gift_name: gift.name,
      gift_preview: gift.preview,
      gift_price: gift.price
    })
  })
  return await response.json()
}

// Получение подарков пользователя
const fetchUserGifts = async (userId: number) => {
  const response = await fetch(`${API_BASE_URL}/user/${userId}/gifts`)
  return await response.json()
}
```

## Получение user_id из Telegram

В компонентах используйте Telegram WebApp для получения user_id:

```typescript
const user = useTelegramUser()
const userId = user?.userId

// Затем используйте userId для API вызовов
```

## Пример обновленного UserContext

```typescript
export function UserProvider({ children }: { children: ReactNode }) {
  const user = useTelegramUser()
  const userId = user?.userId || 0
  
  const [balance, setBalanceState] = useState<number>(0.00)
  const [myGifts, setMyGifts] = useState<GiftPreview[]>([])

  useEffect(() => {
    if (userId) {
      fetchBalance(userId).then(data => {
        setBalanceState(data.balance_ton)
      })
      fetchUserGifts(userId).then(gifts => {
        setMyGifts(gifts.map(g => ({
          id: g.gift_id,
          name: g.gift_name,
          price: g.gift_price,
          preview: g.gift_preview
        })))
      })
    }
  }, [userId])

  const subtractBalance = async (amount: number): Promise<boolean> => {
    if (balance >= amount && userId) {
      // Баланс будет обновлен после успешной покупки
      return true
    }
    return false
  }

  const addGift = async (gift: GiftPreview) => {
    if (!userId) return
    
    try {
      await purchaseGift(userId, gift)
      // Обновляем локальное состояние
      setMyGifts(prev => [...prev, gift])
      setBalanceState(prev => prev - gift.price)
    } catch (error) {
      console.error('Purchase error:', error)
      throw error
    }
  }

  // ... остальной код
}
```

