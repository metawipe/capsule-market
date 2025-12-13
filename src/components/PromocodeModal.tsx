import { Modal } from '../ui/Modal'
import './promocode-modal.css'
import { hapticSuccess } from '../twa'
import { useState, useMemo } from 'react'
import { Toast } from './Toast'

interface PromocodeModalProps {
  isOpen: boolean
  onClose: () => void
}

export function PromocodeModal({ isOpen, onClose }: PromocodeModalProps) {
  const [promocode, setPromocode] = useState<string>('')
  const [showToast, setShowToast] = useState(false)
  const [starsAmount, setStarsAmount] = useState(0)

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
      code: codePart,
      amount: Math.round(amount)
    }
  }, [promocode])

  const handleSubmit = () => {
    if (!parsedPromocode) return
    hapticSuccess()
    console.log('Promocode activated:', parsedPromocode.code, 'Amount:', parsedPromocode.amount)
    
    // Показываем уведомление
    setStarsAmount(parsedPromocode.amount)
    setShowToast(true)
    
    // Закрываем модалку и очищаем поле
    setTimeout(() => {
      onClose()
      setPromocode('')
    }, 500)
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
            disabled={!canSubmit}
            onClick={handleSubmit}
          >
            Apply
          </button>
        </div>
      </Modal>
      <Toast
        message={`Successfully activated! You will receive ${starsAmount} Stars`}
        type="success"
        isVisible={showToast}
        onClose={() => setShowToast(false)}
        duration={4000}
      />
    </>
  )
}

