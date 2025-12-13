import { useEffect, useRef, memo, useState, useMemo } from 'react'
import lottie from 'lottie-web'
import type { GiftPreview } from '../api/types'
import './market-content.css'
import { useMarketContext } from '../contexts/MarketContext'
import { BuyGiftModal } from './BuyGiftModal'

// Кеш для Lottie анимаций
const lottieCache = new Map<string, any>()

interface GiftCardProps {
  gift: GiftPreview
  index: number
}

interface GiftCardInternalProps extends GiftCardProps {
  onBuyClick: (gift: GiftPreview) => void
}

const GiftCard = memo(function GiftCard({ gift, index, onBuyClick }: GiftCardInternalProps) {
  const lottieRef = useRef<HTMLDivElement>(null)
  const animationRef = useRef<any>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)
  const [shouldLoadLottie, setShouldLoadLottie] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const isLottie = gift.preview?.endsWith('.lottie.json') || gift.preview?.includes('lottie')

  const handleBuyClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onBuyClick(gift)
  }
  
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
        rootMargin: '100px', // Увеличиваем margin для более ранней загрузки
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
      // Очищаем анимацию при размонтировании
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
  }, [isLottie, gift.id]) // Добавляем gift.id для перезапуска при изменении

  // Загружаем Lottie только когда карточка видна (с кешированием)
  useEffect(() => {
    if (shouldLoadLottie && isLottie && gift.preview && lottieRef.current) {
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
              autoplay: false, // Анимация остановлена по умолчанию
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

  // Упрощенная анимация только для первых 15 элементов (первая загрузка)
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
          <button className="gift-card__price-btn" onClick={handleBuyClick}>
            <span className="gift-card__price-icon">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 19 26">
                <title>Ton SVG Icon</title>
                <path fill="currentColor" d="M19.012 9.201L12.66 19.316a.857.857 0 0 1-1.453-.005L4.98 9.197a1.8 1.8 0 0 1-.266-.943a1.856 1.856 0 0 1 1.882-1.826h10.817c1.033 0 1.873.815 1.873 1.822a1.8 1.8 0 0 1-.274.951M6.51 8.863l4.633 7.144V8.143H6.994c-.48 0-.694.317-.484.72m6.347 7.144l4.633-7.144c.214-.403-.004-.72-.484-.72h-4.149z"/>
              </svg>
            </span>
            <span className="gift-card__price">{gift.price.toFixed(2)}</span>
          </button>
        </div>
      </div>
    </div>
  )
})

export function MarketContent() {
  const { 
    searchQuery, 
    searchResults, 
    isSearching, 
    searchError, 
    gifts, 
    isLoadingGifts, 
    giftsError,
    loadMoreGifts,
    hasMoreGifts,
    hasActiveFilters
  } = useMarketContext()
  
  const loadMoreRef = useRef<HTMLDivElement>(null)
  const [selectedGift, setSelectedGift] = useState<GiftPreview | null>(null)
  const [isBuyModalOpen, setIsBuyModalOpen] = useState(false)

  const handleBuyClick = (gift: GiftPreview) => {
    setSelectedGift(gift)
    setIsBuyModalOpen(true)
  }

  const handleCloseBuyModal = () => {
    setIsBuyModalOpen(false)
    // Очищаем selectedGift после завершения анимации закрытия
    setTimeout(() => {
      setSelectedGift(null)
    }, 300) // Время анимации закрытия
  }
  
  // Используем результаты поиска, если есть запрос, иначе используем обычный список
  const displayGifts = useMemo(() => {
    return (searchQuery.trim() || hasActiveFilters) ? searchResults : gifts
  }, [searchQuery, searchResults, gifts, hasActiveFilters])
  
  const displayLoading = (searchQuery.trim() || hasActiveFilters) ? isSearching : isLoadingGifts
  const displayError = (searchQuery.trim() || hasActiveFilters) ? searchError : giftsError
  
  // Intersection Observer для загрузки следующих гифтов (только если нет поиска)
  useEffect(() => {
    if (searchQuery.trim() || hasActiveFilters || !hasMoreGifts) return // Не загружаем при поиске или если все загружено
    
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && hasMoreGifts) {
            loadMoreGifts()
          }
        })
      },
      {
        rootMargin: '200px', // Начинаем загрузку за 200px до конца
        threshold: 0.1,
      }
    )
    
    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current)
    }
    
    return () => {
      observer.disconnect()
    }
  }, [hasMoreGifts, searchQuery, loadMoreGifts])

  if (displayLoading) {
    return (
      <div className="market-content">
        <div className="market-content__loading">
          <div className="market-content__spinner">
            <span className="mdi mdi-loading"></span>
          </div>
          <p>Gifts are loading...</p>
        </div>
      </div>
    )
  }

  if (displayError) {
    return (
      <div className="market-content">
        <div className="market-content__error">
          <p>{displayError}</p>
          <button onClick={() => window.location.reload()} className="market-content__retry-btn">
            Try again
          </button>
        </div>
      </div>
    )
  }

  if (displayGifts.length === 0) {
    return (
      <div className="market-content">
        <div className="market-content__empty">
          <p>{searchQuery.trim() ? 'Gifts not found' : 'Gifts not found'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="market-content">
      <div className="market-content__grid">
        {displayGifts.map((gift, index) => (
          <GiftCard
            key={`${gift.id}-${index}`}
            gift={gift}
            index={index}
            onBuyClick={handleBuyClick}
          />
        ))}
      </div>
      <BuyGiftModal
        isOpen={isBuyModalOpen}
        onClose={handleCloseBuyModal}
        gift={selectedGift}
      />
      {/* Элемент для отслеживания скролла - загружаем следующую порцию */}
      {!searchQuery.trim() && !hasActiveFilters && hasMoreGifts && (
        <div ref={loadMoreRef} className="market-content__load-more" style={{
          height: '10px', 
          width: '100%',
          marginTop: '20px'
        }} />
      )}
    </div>
  )
}

