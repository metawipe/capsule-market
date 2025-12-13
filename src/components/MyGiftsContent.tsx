import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useMarketContext } from '../contexts/MarketContext'
import { useUserContext } from '../contexts/UserContext'
import type { GiftPreview } from '../api/types'
import './my-gifts-content.css'
import '../components/market-content.css'
import { TgsPlayer } from './TgsPlayer'
import Esc from '../assets/Esc.tgs?url'
import { AddGiftModal } from './AddGiftModal'

interface GiftCardProps {
  gift: GiftPreview
  index: number
  onClick?: () => void
}

function GiftCard({ gift, index, onClick }: GiftCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className="gift-card"
      onClick={onClick}
    >
      <div className="gift-card__image">
        {gift.preview ? (
          <img src={gift.preview} alt={gift.name} loading="lazy" />
        ) : (
          <div className="gift-card__image-placeholder">
            <span className="mdi mdi-gift"></span>
          </div>
        )}
      </div>
      <div className="gift-card__content">
        <h3 className="gift-card__title">{gift.name}</h3>
        <p className="gift-card__id">#{gift.id}</p>
        <div className="gift-card__actions">
          <button className="gift-card__price-btn">
            <span className="gift-card__price-icon">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,4C16.41,4 20,7.59 20,12C20,16.41 16.41,20 12,20C7.59,20 4,16.41 4,12C4,7.59 7.59,4 12,4M12,6A6,6 0 0,0 6,12A6,6 0 0,0 12,18A6,6 0 0,0 18,12A6,6 0 0,0 12,6M12,8A4,4 0 0,1 16,12A4,4 0 0,1 12,16A4,4 0 0,1 8,12A4,4 0 0,1 12,8Z"/>
              </svg>
            </span>
            <span className="gift-card__price">{gift.price.toFixed(2)}</span>
          </button>
          <button className="gift-card__cart-btn">
            <span className="mdi mdi-cart"></span>
          </button>
        </div>
      </div>
    </motion.div>
  )
}

export function MyGiftsContent() {
  const { searchQuery, searchResults, isSearching, searchError } = useMarketContext()
  const { myGifts } = useUserContext()
  const [loading, setLoading] = useState(false)
  const [error] = useState<string | null>(null)
  const [_selectedGift, setSelectedGift] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  useEffect(() => {
    // Загружаем подарки из контекста
    setLoading(false)
  }, [])
  
  // Используем результаты поиска, если есть запрос
  const displayGifts = searchQuery.trim() ? searchResults : myGifts
  const displayLoading = searchQuery.trim() ? isSearching : loading
  const displayError = searchQuery.trim() ? searchError : error

  if (displayLoading) {
    return (
      <div className="my-gifts-content">
        <div className="market-content__loading">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="market-content__spinner"
          >
            <span className="mdi mdi-loading"></span>
          </motion.div>
          <p>Loading gifts...</p>
        </div>
      </div>
    )
  }

  if (displayError) {
    return (
      <div className="my-gifts-content">
        <div className="market-content__error">
          <p>{displayError}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="market-content__retry-btn"
          >
            Try again
          </button>
        </div>
      </div>
    )
  }

  if (displayGifts.length === 0) {
    return (
      <div className="my-gifts-content">
        <div className="market-content__empty">
          <TgsPlayer src={Esc} autoplay loop className="my-gifts-content__empty-tgs" width={120} height={120} />
          <h3 className="my-gifts-content__empty-title">Any Telegram gifts?</h3>
          <p className="my-gifts-content__empty-subtitle">You can add them through our bot</p>
          <button className="my-gifts-content__empty-btn" onClick={() => setIsModalOpen(true)}>
            How do I add gifts?
          </button>
        </div>
        <AddGiftModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      </div>
    )
  }

  return (
    <div className="my-gifts-content">
      <div className="market-content__grid">
        {displayGifts.map((gift, index) => (
          <GiftCard
            key={gift.id}
            gift={gift}
            index={index}
            onClick={() => setSelectedGift(gift.id)}
          />
        ))}
      </div>
    </div>
  )
}


