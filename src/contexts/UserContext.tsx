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
    console.log('[UserContext] Telegram user:', user)
    if (user?.id) {
      console.log('[UserContext] Setting userId:', user.id)
      setUserId(user.id)
    } else {
      console.warn('[UserContext] No user ID found in Telegram user')
    }
  }, [])

  // Загружаем баланс и подарки при изменении userId
  useEffect(() => {
    console.log('[UserContext] userId changed:', userId)
    if (userId) {
      console.log('[UserContext] Loading user data for userId:', userId)
      loadUserData()
    } else {
      console.warn('[UserContext] No userId, skipping loadUserData')
    }
  }, [userId])

  const loadUserData = async () => {
    if (!userId) return

    try {
      setIsLoading(true)
      
      // Создаем/обновляем пользователя с данными из Telegram
      const telegramUser = getTelegramUserSafe()
      if (telegramUser) {
        try {
          await fetch(`${API_BASE_URL}/user`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              user_id: userId,
              username: telegramUser.username || null,
              first_name: telegramUser.first_name || null,
              last_name: telegramUser.last_name || null,
              is_premium: telegramUser.is_premium || false,
            }),
          })
        } catch (error) {
          console.error('Error creating/updating user:', error)
        }
      }
      
      // Загружаем баланс
      const balanceUrl = `${API_BASE_URL}/user/${userId}/balance`
      console.log('[UserContext] Loading balance from:', balanceUrl)
      console.log('[UserContext] API_BASE_URL:', API_BASE_URL)
      console.log('[UserContext] userId:', userId)
      
      const balanceResponse = await fetch(balanceUrl)
      console.log('[UserContext] Balance response status:', balanceResponse.status)
      console.log('[UserContext] Balance response ok:', balanceResponse.ok)
      
      if (balanceResponse.ok) {
        const balanceData = await balanceResponse.json()
        console.log('[UserContext] Balance loaded (full object):', JSON.stringify(balanceData, null, 2))
        console.log('[UserContext] balance_ton value:', balanceData.balance_ton)
        console.log('[UserContext] balance_ton type:', typeof balanceData.balance_ton)
        const newBalance = parseFloat(balanceData.balance_ton) || 0.00
        console.log('[UserContext] Parsed balance:', newBalance)
        console.log('[UserContext] Setting balance state to:', newBalance)
        setBalanceState(newBalance)
        console.log('[UserContext] Balance state set, current balance should be:', newBalance)
      } else {
        const errorText = await balanceResponse.text()
        console.error('[UserContext] Failed to load balance:', balanceResponse.status, errorText)
        console.error('[UserContext] Response headers:', Object.fromEntries(balanceResponse.headers.entries()))
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
      const balanceUrl = `${API_BASE_URL}/user/${userId}/balance`
      console.log('[UserContext] Refreshing balance from:', balanceUrl)
      const response = await fetch(balanceUrl)
      if (response.ok) {
        const data = await response.json()
        console.log('[UserContext] Balance refreshed (full object):', JSON.stringify(data, null, 2))
        console.log('[UserContext] balance_ton from response:', data.balance_ton)
        const newBalance = parseFloat(data.balance_ton) || 0.00
        console.log('[UserContext] Parsed refreshed balance:', newBalance)
        console.log('[UserContext] Setting balance state to:', newBalance)
        setBalanceState(newBalance)
      } else {
        const errorText = await response.text()
        console.error('[UserContext] Failed to refresh balance:', response.status, errorText)
      }
    } catch (error) {
      console.error('[UserContext] Error refreshing balance:', error)
    }
  }

  // Автоматически обновляем баланс каждые 5 секунд
  useEffect(() => {
    if (!userId) return

    const interval = setInterval(() => {
      refreshBalance()
    }, 5000) // Обновляем каждые 5 секунд

    return () => clearInterval(interval)
  }, [userId])

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

