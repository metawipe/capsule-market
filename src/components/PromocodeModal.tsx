import { Modal } from '../ui/Modal'
import './promocode-modal.css'
import { hapticSuccess, hapticLight } from '../twa'
import { useState, useMemo } from 'react'
import { Toast } from './Toast'
import { getTelegramUserSafe } from '../twa'
import { useUserContext } from '../contexts/UserContext'

// Базовый URL API
const API_BASE_URL = import.meta.env.VITE_API_URL || 
  (import.meta.env.PROD 
    ? 'https://capsule-market-production.up.railway.app/api'
    : '/api')

interface PromocodeModalProps {
  isOpen: boolean
  onClose: () => void
}

export function PromocodeModal({ isOpen, onClose }: PromocodeModalProps) {
  const [promocode, setPromocode] = useState<string>('')
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [toastType, setToastType] = useState<'success' | 'error'>('success')
  const [isLoading, setIsLoading] = useState(false)
  const { refreshBalance } = useUserContext()

  const parsedPromocode = useMemo(() => {
    const trimmed = promocode.trim().toUpperCase()
    if (trimmed.length < 9) return null
    
    // Проверяем первые 8 символов - должны быть большие английские буквы
    const codePart = trimmed.slice(0, 8)
    const amountPart = trimmed.slice(8)
    
    if (!/^[A-Z]{8}$/.test(codePart)) return null
    
    const amount = Number(amountPart)
    if (!Number.isFinite(amount) || amount <= 0) return null
    
    return {
      code: trimmed, // Используем полный код (8 букв + цифры)
      amount: amount
    }
  }, [promocode])

  const handleSubmit = async () => {
    if (!parsedPromocode) return
    
    const user = getTelegramUserSafe()
    if (!user?.id) {
      hapticLight()
      setToastMessage('User ID not found')
      setToastType('error')
      setShowToast(true)
      return
    }
    
    setIsLoading(true)
    
    try {
      const response = await fetch(`${API_BASE_URL}/promo/activate?code=${encodeURIComponent(parsedPromocode.code)}&user_id=${user.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }))
        throw new Error(errorData.detail || 'Failed to activate promo code')
      }
      
      const data = await response.json()
      hapticSuccess()
      
      // Обновляем баланс
      await refreshBalance()
      
      // Показываем уведомление
      setToastMessage(`Successfully activated! You received ${data.amount.toFixed(2)} TON`)
      setToastType('success')
      setShowToast(true)
      
      // Закрываем модалку и очищаем поле
      setTimeout(() => {
        onClose()
        setPromocode('')
      }, 2000)
    } catch (error: any) {
      hapticLight()
      setToastMessage(error.message || 'Failed to activate promo code')
      setToastType('error')
      setShowToast(true)
    } finally {
      setIsLoading(false)
    }
  }

  const canSubmit = !!parsedPromocode

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="Promocode">
        <div className="promocode-modal__panel">
          <div className="promocode-modal__input-wrap">
            <label className="promocode-modal__label">
              Enter promocode
            </label>
            <input
              type="text"
              value={promocode}
              onChange={(e) => setPromocode(e.target.value)}
              className="promocode-modal__input"
              placeholder="Enter promocode"
              autoFocus
            />
          </div>
          <button
            className="promocode-modal__submit-btn"
            disabled={!canSubmit || isLoading}
            onClick={handleSubmit}
          >
            {isLoading ? 'Activating...' : 'Apply'}
          </button>
        </div>
      </Modal>
      <Toast
        message={toastMessage}
        type={toastType}
        isVisible={showToast}
        onClose={() => setShowToast(false)}
        duration={4000}
      />
    </>
  )
}

