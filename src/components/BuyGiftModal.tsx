import { Modal } from '../ui/Modal'
import './buy-gift-modal.css'
import { useTonWallet } from '@tonconnect/ui-react'
import { hapticLight } from '../twa'
import { useMemo, useState, useEffect, useRef } from 'react'
import type { GiftPreview } from '../api/types'
import lottie from 'lottie-web'
import { useUserContext } from '../contexts/UserContext'

// Используем тот же кеш, что и в MarketContent
const lottieCache = new Map<string, any>()

interface BuyGiftModalProps {
  isOpen: boolean
  onClose: () => void
  gift: GiftPreview | null
}

export function BuyGiftModal({ isOpen, onClose, gift }: BuyGiftModalProps) {
  const wallet = useTonWallet()
  const { balance, addGift } = useUserContext()
  const cashback = 0 // TODO: Получить реальный cashback
  
  const lottieRef = useRef<HTMLDivElement>(null)
  const animationRef = useRef<any>(null)
  const [shouldLoadLottie, setShouldLoadLottie] = useState(false)
  const isLottie = useMemo(() => {
    if (!gift?.preview) return false
    return gift.preview.endsWith('.lottie.json') || gift.preview.includes('lottie')
  }, [gift?.preview])
  
  // Устанавливаем флаг загрузки когда модалка открыта и это Lottie
  useEffect(() => {
    if (isOpen && isLottie && gift?.preview) {
      setShouldLoadLottie(true)
    } else {
      setShouldLoadLottie(false)
    }
  }, [isOpen, isLottie, gift?.preview])

  const handleBuy = async () => {
    if (!gift || !wallet) return
    hapticLight()
    
    // Проверяем баланс
    if (balance < gift.price) {
      return
    }
    
    try {
      // Покупаем подарок через API (баланс списывается на бэкенде)
      await addGift(gift)
      
      // Закрываем модалку
      onClose()
    } catch (error) {
      console.error('Error purchasing gift:', error)
      // Можно показать уведомление об ошибке
      alert(error instanceof Error ? error.message : 'Failed to purchase gift')
    }
  }

  const handleClose = () => {
    hapticLight()
    onClose()
  }

  const insufficientBalance = useMemo(() => {
    if (!gift) return false
    return balance < gift.price
  }, [balance, gift])

  // Загружаем Lottie только когда флаг установлен и ref готов
  useEffect(() => {
    if (!shouldLoadLottie || !isLottie || !gift?.preview || !lottieRef.current) return

    let isMounted = true

    const loadLottie = async () => {
      try {
        // Проверяем кеш
        let animationData = lottieCache.get(gift.preview!)
        
        if (!animationData) {
          // Загружаем только если нет в кеше
          const response = await fetch(gift.preview!)
          animationData = await response.json()
          // Сохраняем в кеш
          lottieCache.set(gift.preview!, animationData)
        }
        
        // Проверяем, что компонент еще смонтирован
        if (!isMounted || !lottieRef.current) return
        
        if (animationRef.current) {
          animationRef.current.destroy()
          animationRef.current = null
        }
        
        if (lottieRef.current) {
          // Используем кешированные данные
          animationRef.current = lottie.loadAnimation({
            container: lottieRef.current,
            renderer: 'svg',
            loop: true,
            autoplay: true, // Автозапуск в модалке
            animationData,
          })
        }
      } catch (error) {
        console.error('Ошибка загрузки Lottie:', error)
      }
    }
    
    loadLottie()
    
    return () => {
      isMounted = false
      if (animationRef.current) {
        try {
          animationRef.current.destroy()
        } catch (e) {
          // Игнорируем ошибки при уничтожении
        }
        animationRef.current = null
      }
    }
  }, [shouldLoadLottie, isLottie, gift?.preview])

  // Не рендерим модалку если нет гифта
  if (!gift) return null

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Buy Gift" bodyClassName="buy-gift-modal__body">
      <div className="buy-gift-modal__content">
        {/* Gift Info */}
        <div className="buy-gift-modal__gift-info">
              <div className="buy-gift-modal__gift-icon">
                {gift.preview ? (
                  isLottie ? (
                    <div ref={lottieRef} style={{ width: '100%', height: '100%' }} />
                  ) : (
                    <img src={gift.preview} alt={gift.name} />
                  )
                ) : (
                  <div className="buy-gift-modal__gift-icon-placeholder">
                    <span className="mdi mdi-gift"></span>
                  </div>
                )}
              </div>
              <div className="buy-gift-modal__gift-details">
                <div className="buy-gift-modal__gift-name">{gift.name}</div>
                <div className="buy-gift-modal__gift-id">#{gift.id}</div>
              </div>
              <div className="buy-gift-modal__gift-price">
                <div className="buy-gift-modal__price-label">Price</div>
                <div className="buy-gift-modal__price-value">
                  <span>{gift.price.toFixed(2)}</span>
                  <svg className="buy-gift-modal__ton-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 19 26">
                    <title>Ton SVG Icon</title>
                    <path fill="currentColor" d="M19.012 9.201L12.66 19.316a.857.857 0 0 1-1.453-.005L4.98 9.197a1.8 1.8 0 0 1-.266-.943a1.856 1.856 0 0 1 1.882-1.826h10.817c1.033 0 1.873.815 1.873 1.822a1.8 1.8 0 0 1-.274.951M6.51 8.863l4.633 7.144V8.143H6.994c-.48 0-.694.317-.484.72m6.347 7.144l4.633-7.144c.214-.403-.004-.72-.484-.72h-4.149z"/>
                  </svg>
                </div>
              </div>
            </div>

            {/* Balance Info */}
            <div className="buy-gift-modal__balance-section">
          <div className="buy-gift-modal__balance-item">
            <div className="buy-gift-modal__balance-label">Available balance</div>
            <div className="buy-gift-modal__balance-value">
              <span>{balance.toFixed(2)}</span>
              <svg className="buy-gift-modal__ton-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 19 26">
                <title>Ton SVG Icon</title>
                <path fill="currentColor" d="M19.012 9.201L12.66 19.316a.857.857 0 0 1-1.453-.005L4.98 9.197a1.8 1.8 0 0 1-.266-.943a1.856 1.856 0 0 1 1.882-1.826h10.817c1.033 0 1.873.815 1.873 1.822a1.8 1.8 0 0 1-.274.951M6.51 8.863l4.633 7.144V8.143H6.994c-.48 0-.694.317-.484.72m6.347 7.144l4.633-7.144c.214-.403-.004-.72-.484-.72h-4.149z"/>
              </svg>
            </div>
          </div>

          <div className="buy-gift-modal__balance-item">
            <div className="buy-gift-modal__balance-label">
              Cashback
            </div>
            <div className="buy-gift-modal__balance-value buy-gift-modal__balance-value--cashback">
              <span>{cashback.toFixed(2)}</span>
              <svg className="buy-gift-modal__ton-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 19 26">
                <title>Ton SVG Icon</title>
                <path fill="#35AFF1" d="M19.012 9.201L12.66 19.316a.857.857 0 0 1-1.453-.005L4.98 9.197a1.8 1.8 0 0 1-.266-.943a1.856 1.856 0 0 1 1.882-1.826h10.817c1.033 0 1.873.815 1.873 1.822a1.8 1.8 0 0 1-.274.951M6.51 8.863l4.633 7.144V8.143H6.994c-.48 0-.694.317-.484.72m6.347 7.144l4.633-7.144c.214-.403-.004-.72-.484-.72h-4.149z"/>
              </svg>
            </div>
          </div>
        </div>

        {/* Insufficient Balance Message - показываем только если баланс недостаточен */}
        {insufficientBalance && (
          <div className="buy-gift-modal__error">
            Insufficient balance
          </div>
        )}
      </div>

      {/* Footer with buttons */}
      <div className="buy-gift-modal__footer">
        <button 
          className="buy-gift-modal__btn buy-gift-modal__btn--close"
          onClick={handleClose}
        >
          Close
        </button>
        <button 
          className="buy-gift-modal__btn buy-gift-modal__btn--buy" 
          onClick={handleBuy}
          disabled={insufficientBalance || !wallet}
        >
          <span>Buy gift</span>
          <span className="buy-gift-modal__buy-price">{gift.price.toFixed(2)} TON</span>
        </button>
      </div>
    </Modal>
  )
}

