import { createContext, useContext, useState, useEffect } from 'react'
import type { ReactNode } from 'react'
import type { GiftPreview } from '../api/types'
import { getTelegramUserSafe } from '../twa'

interface UserContextType {
  balance: number
  myGifts: GiftPreview[]
  setBalance: (balance: number) => void
  addGift: (gift: GiftPreview) => Promise<void>
  subtractBalance: (amount: number) => boolean
  refreshBalance: () => Promise<void>
  isLoading: boolean
}

const UserContext = createContext<UserContextType | undefined>(undefined)

// Базовый URL API
// В dev режиме используем прокси через vite.config.ts
// В продакшене используем переменную окружения или прямой URL
const API_BASE_URL = import.meta.env.VITE_API_URL || 
  (import.meta.env.PROD 
    ? 'https://capsule-market-production.up.railway.app/api'
    : '/api')

export function UserProvider({ children }: { children: ReactNode }) {
  const [balance, setBalanceState] = useState<number>(0.00)
  const [myGifts, setMyGifts] = useState<GiftPreview[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [userId, setUserId] = useState<number | null>(null)

  // Получаем user_id из Telegram при монтировании
  useEffect(() => {
    const user = getTelegramUserSafe()
    if (user?.id) {
      setUserId(user.id)
    }
  }, [])

  // Загружаем баланс и подарки при изменении userId
  useEffect(() => {
    if (userId) {
      loadUserData()
    }
  }, [userId])

  const loadUserData = async () => {
    if (!userId) return

    try {
      setIsLoading(true)
      
      // Загружаем баланс
      const balanceResponse = await fetch(`${API_BASE_URL}/user/${userId}/balance`)
      if (balanceResponse.ok) {
        const balanceData = await balanceResponse.json()
        setBalanceState(balanceData.balance_ton || 0.00)
      }

      // Загружаем подарки
      const giftsResponse = await fetch(`${API_BASE_URL}/user/${userId}/gifts`)
      if (giftsResponse.ok) {
        const giftsData = await giftsResponse.json()
        // Преобразуем данные из API в формат GiftPreview
        const formattedGifts: GiftPreview[] = giftsData.map((g: any) => ({
          id: g.gift_id,
          name: g.gift_name,
          price: g.gift_price,
          preview: g.gift_preview || undefined,
          models_count: 0,
          in_stock: true,
          rating: 0,
          tags: []
        }))
        setMyGifts(formattedGifts)
      }
    } catch (error) {
      console.error('Error loading user data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const setBalance = (newBalance: number) => {
    setBalanceState(newBalance)
  }

  const addGift = async (gift: GiftPreview): Promise<void> => {
    if (!userId) {
      throw new Error('User ID not available')
    }

    try {
      // Отправляем запрос на покупку подарка
      const response = await fetch(`${API_BASE_URL}/user/${userId}/purchase`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          gift_id: gift.id,
          gift_name: gift.name,
          gift_preview: gift.preview || null,
          gift_price: gift.price,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.detail || 'Failed to purchase gift')
      }

      // Обновляем локальное состояние
      setMyGifts(prev => {
        if (prev.some(g => g.id === gift.id)) {
          return prev
        }
        return [...prev, gift]
      })

      // Обновляем баланс (списываем цену)
      setBalanceState(prev => prev - gift.price)
    } catch (error) {
      console.error('Error purchasing gift:', error)
      throw error
    }
  }

  const subtractBalance = (amount: number): boolean => {
    if (balance >= amount) {
      // Баланс будет обновлен после успешной покупки через API
      return true
    }
    return false
  }

  const refreshBalance = async () => {
    if (!userId) return

    try {
      const response = await fetch(`${API_BASE_URL}/user/${userId}/balance`)
      if (response.ok) {
        const data = await response.json()
        setBalanceState(data.balance_ton || 0.00)
      }
    } catch (error) {
      console.error('Error refreshing balance:', error)
    }
  }

  return (
    <UserContext.Provider
      value={{
        balance,
        myGifts,
        setBalance,
        addGift,
        subtractBalance,
        refreshBalance,
        isLoading,
      }}
    >
      {children}
    </UserContext.Provider>
  )
}

export function useUserContext() {
  const context = useContext(UserContext)
  if (context === undefined) {
    throw new Error('useUserContext must be used within a UserProvider')
  }
  return context
}

