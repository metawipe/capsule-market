import { useState, useEffect, useRef, useMemo } from 'react'
import { motion } from 'framer-motion'
import { useMarketContext } from '../contexts/MarketContext'
import { useUserContext } from '../contexts/UserContext'
import type { GiftPreview } from '../api/types'
import lottie from 'lottie-web'
import './my-gifts-content.css'
import '../components/market-content.css'
import { TgsPlayer } from './TgsPlayer'
import Esc from '../assets/Esc.tgs?url'
import { AddGiftModal } from './AddGiftModal'
import { hapticLight } from '../twa'

// Кеш для Lottie анимаций (общий с MarketContent)
const lottieCache = new Map<string, any>()

interface GiftCardProps {
  gift: GiftPreview
  index: number
  onWithdrawClick?: () => void
}

function GiftCard({ gift, index, onWithdrawClick }: GiftCardProps) {
  const lottieRef = useRef<HTMLDivElement>(null)
  const animationRef = useRef<any>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)
  const [shouldLoadLottie, setShouldLoadLottie] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const isLottie = gift.preview?.endsWith('.lottie.json') || gift.preview?.includes('lottie')

  // Обработчик клика для запуска/остановки анимации
  const handleCardClick = () => {
    if (isLottie && animationRef.current) {
      if (isPlaying) {
        animationRef.current.pause()
        setIsPlaying(false)
      } else {
        animationRef.current.play()
        setIsPlaying(true)
      }
    }
  }

  const handleWithdrawClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    hapticLight()
    if (onWithdrawClick) {
      onWithdrawClick()
    }
  }

  // Intersection Observer для ленивой загрузки Lottie анимаций
  useEffect(() => {
    if (!lottieRef.current || !isLottie) return

    let mounted = true

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && mounted) {
            setShouldLoadLottie(true)
            observerRef.current?.disconnect()
          }
        })
      },
      {
        rootMargin: '100px',
        threshold: 0.1,
      }
    )

    observerRef.current.observe(lottieRef.current)

    return () => {
      mounted = false
      if (observerRef.current) {
        observerRef.current.disconnect()
        observerRef.current = null
      }
      if (animationRef.current) {
        try {
          animationRef.current.destroy()
        } catch (e) {
          // Игнорируем ошибки
        }
        animationRef.current = null
      }
      setShouldLoadLottie(false)
      setIsPlaying(false)
    }
  }, [isLottie, gift.id])

  // Загружаем Lottie только когда карточка видна
  useEffect(() => {
    if (shouldLoadLottie && isLottie && gift.preview && lottieRef.current) {
      let isMounted = true
      
      const loadLottie = async () => {
        try {
          let animationData = lottieCache.get(gift.preview!)
          
          if (!animationData) {
            const response = await fetch(gift.preview!)
            animationData = await response.json()
            lottieCache.set(gift.preview!, animationData)
          }
          
          if (!isMounted || !lottieRef.current) return
          
          if (animationRef.current) {
            animationRef.current.destroy()
            animationRef.current = null
          }
          
          if (lottieRef.current) {
            animationRef.current = lottie.loadAnimation({
              container: lottieRef.current,
              renderer: 'svg',
              loop: true,
              autoplay: false,
              animationData,
            })
            setIsPlaying(false)
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
    }
  }, [shouldLoadLottie, isLottie, gift.preview])

  const shouldAnimate = index < 15

  return (
    <div
      className={`gift-card ${shouldAnimate ? 'animate-in' : ''}`}
      onClick={handleCardClick}
      style={{
        animationDelay: shouldAnimate ? `${Math.min(index * 0.05, 0.5)}s` : '0s'
      }}
    >
      <div className="gift-card__image">
        {gift.preview ? (
          isLottie ? (
            <div ref={lottieRef} style={{ width: '100%', height: '100%' }} />
          ) : (
            <img src={gift.preview} alt={gift.name} loading="lazy" decoding="async" />
          )
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
          <button 
            className="gift-card__withdraw-btn" 
            onClick={handleWithdrawClick}
          >
            <span className="gift-card__withdraw-text">Withdraw</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export function MyGiftsContent() {
  const { searchQuery, searchResults, isSearching, searchError, activeTab: giftsTab } = useMarketContext()
  const { myGifts } = useUserContext()
  const [loading, setLoading] = useState(false)
  const [error] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  useEffect(() => {
    setLoading(false)
  }, [])
  
  // Фильтруем подарки по табу (unlisted/listed)
  // Пока что все подарки считаются unlisted, так как нет поля для статуса
  const filteredGifts = useMemo(() => {
    if (giftsTab === 'listed') {
      // TODO: Фильтровать по статусу, когда будет поле is_listed
      return []
    }
    return myGifts
  }, [myGifts, giftsTab])
  
  // Фильтруем результаты поиска только по подаркам пользователя
  const filteredSearchResults = useMemo(() => {
    if (!searchQuery.trim() || searchResults.length === 0) {
      return []
    }
    // Создаем Set из ID подарков пользователя для быстрого поиска
    const myGiftIds = new Set(myGifts.map(g => g.id))
    // Фильтруем результаты поиска, оставляя только те, что есть у пользователя
    return searchResults.filter(gift => myGiftIds.has(gift.id))
  }, [searchResults, myGifts, searchQuery])
  
  // Используем отфильтрованные результаты поиска, если есть запрос
  const displayGifts = searchQuery.trim() ? filteredSearchResults : filteredGifts
  const displayLoading = searchQuery.trim() ? isSearching : loading
  const displayError = searchQuery.trim() ? searchError : error

  const handleWithdraw = (gift: GiftPreview) => {
    // TODO: Реализовать вывод подарка
    console.log('Withdraw gift:', gift)
  }

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
          <h3 className="my-gifts-content__empty-title">
            {giftsTab === 'listed' ? 'No listed gifts' : 'Any Telegram gifts?'}
          </h3>
          <p className="my-gifts-content__empty-subtitle">
            {giftsTab === 'listed' 
              ? 'List your gifts to make them available for sale'
              : 'You can add them through our bot'
            }
          </p>
          {giftsTab !== 'listed' && (
            <button className="my-gifts-content__empty-btn" onClick={() => setIsModalOpen(true)}>
              How do I add gifts?
            </button>
          )}
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
            onWithdrawClick={() => handleWithdraw(gift)}
          />
        ))}
      </div>
    </div>
  )
}
