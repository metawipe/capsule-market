import { useEffect, useState, useLayoutEffect, useRef, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import './profile-header.css'
import { hapticLight, getTelegramUserSafe } from '../twa'
import ENFlag from '../assets/US.tgs?url'
import RUFlag from '../assets/RU.tgs?url'
import type { BottomTab } from '../ui/BottomNav'
import { BalanceModal } from './BalanceModal'
import { FiltersModal } from './FiltersModal'
import { CollectionModal } from './CollectionModal'
import { BackgroundModal } from './BackgroundModal'
import { SymbolModal } from './SymbolModal'
import { TgsPlayer } from './TgsPlayer'
import defaultAvatar from '../assets/Capsule.jpg'
import { useMarketContext } from '../contexts/MarketContext'
import { useUserContext } from '../contexts/UserContext'

import './profile-header-badge.css' // Import styles for badge

type Lang = 'en' | 'ru'

function useTelegramUser() {
  const [user, setUser] = useState(() => getTelegramUserSafe())

  useEffect(() => {
    let cancelled = false

    const readOnce = () => {
      try {
        const u = getTelegramUserSafe()
        if (!cancelled && u) setUser(u)
      } catch {}
    }

    readOnce()
    const timers = [120, 300, 800].map((ms) => setTimeout(readOnce, ms))

    const onFocus = () => readOnce()
    document.addEventListener('visibilitychange', onFocus)
    window.addEventListener('focus', onFocus)

    return () => {
      cancelled = true
      timers.forEach(clearTimeout)
      document.removeEventListener('visibilitychange', onFocus)
      window.removeEventListener('focus', onFocus)
    }
  }, [])

  return {
    username: user?.username ?? user?.first_name ?? 'username',
    avatarUrl: user?.photo_url || defaultAvatar,
    firstName: user?.first_name || '',
    lastName: user?.last_name || '',
    userId: user?.id,
    isPremium: user?.is_premium || false,
  }
}

interface ProfileHeaderProps {
  activeTab: BottomTab
  onTabChange?: (tab: BottomTab) => void
}

export function ProfileHeader({ activeTab, onTabChange }: ProfileHeaderProps) {
  const [lang, setLang] = useState('en' as Lang)
  const [isBalanceModalOpen, setIsBalanceModalOpen] = useState(false)
  const [currency, setCurrency] = useState<'ton' | 'stars'>('ton')
  const { balance: tonBalance, refreshBalance } = useUserContext()
  const [starsBalance] = useState(0)
  const [activeFilter, setActiveFilter] = useState<'collection' | 'backdrop' | 'symbol'>('collection')
  const [showLeftBlur, setShowLeftBlur] = useState(false)
  const [showRightBlur, setShowRightBlur] = useState(false)
  const [filtersModalOpen, setFiltersModalOpen] = useState(false)
  const [collectionModalOpen, setCollectionModalOpen] = useState(false)
  const [backgroundModalOpen, setBackgroundModalOpen] = useState(false)
  const [symbolModalOpen, setSymbolModalOpen] = useState(false)
  
  const underlineRef = useRef<HTMLDivElement | null>(null)
  const tabsRef = useRef<HTMLDivElement | null>(null)
  const unlistedRef = useRef<HTMLSpanElement | null>(null)
  const listedRef = useRef<HTMLSpanElement | null>(null)
  const [underlineStyle, setUnderlineStyle] = useState<{ width: number; left: number; ready: boolean }>({ width: 0, left: 0, ready: false })
  // Храним кеш вне жизненного цикла компонента (в useRef он сбрасывается при размонтировании родителя, если он внутри)
  // Но ProfileHeader не размонтируется, так что useRef ок.
  const underlineCache = useRef<{ width: number; left: number } | null>(null)
  const { username, avatarUrl, firstName, userId, isPremium } = useTelegramUser()
  
  // Используем контекст для поиска и табов
  const marketContext = useMarketContext()
  const giftsTab = marketContext.activeTab
  const setGiftsTab = marketContext.setActiveTab
  const searchQuery = marketContext.searchQuery
  const setSearchQuery = marketContext.setSearchQuery
  const { 
    sort, setSort, 
    minPrice, setMinPrice, 
    maxPrice, setMaxPrice,
    selectedCollections, setSelectedCollections,
    selectedBackdrops, setSelectedBackdrops,
    selectedSymbols, setSelectedSymbols
  } = marketContext

  // Подсчет активных фильтров
  const activeFiltersCount = useMemo(() => {
    let count = 0
    if (sort && sort !== 'latest') count++
    if (minPrice !== '0' || maxPrice !== '100000') count++
    if (selectedCollections.length > 0) count++
    if (selectedBackdrops.length > 0) count++
    if (selectedSymbols.length > 0) count++
    return count
  }, [sort, minPrice, maxPrice, selectedCollections, selectedBackdrops, selectedSymbols])

  useEffect(() => {

  }, [username, firstName, userId, isPremium, avatarUrl])

  const updateUnderline = useCallback(() => {
    const activeRef = giftsTab === 'unlisted' ? unlistedRef.current : listedRef.current
    const container = tabsRef.current
    if (activeRef && container) {
      const { width } = activeRef.getBoundingClientRect()
      const { width: containerWidth, left: tabsLeft } = container.getBoundingClientRect()
      const { left: labelLeft } = activeRef.getBoundingClientRect()
      
      // Вычисляем относительную позицию
      const relativeLeft = labelLeft - tabsLeft
      
      if (width > 0 && containerWidth > 0) {
        const next = { width, left: relativeLeft }
        
        // Обновляем только если значения изменились
        if (!underlineCache.current || 
            Math.abs(underlineCache.current.left - next.left) > 0.5 || 
            Math.abs(underlineCache.current.width - next.width) > 0.5) {
        underlineCache.current = next
        setUnderlineStyle({ ...next, ready: true })
        }
      } else if (underlineCache.current && !underlineStyle.ready) {
        // Если размеры пока 0, но есть кеш, используем его
        setUnderlineStyle({ ...underlineCache.current, ready: true })
      }
    }
  }, [giftsTab, underlineStyle.ready])

  // Сброс состояния при смене таба
  useEffect(() => {
    if (activeTab === 'my-gifts') {
      // Пытаемся сразу восстановить из кеша, если он есть
        if (underlineCache.current) {
          setUnderlineStyle({ ...underlineCache.current, ready: true })
        } else {
        // Иначе сбрасываем, чтобы скрыть прыжок
        setUnderlineStyle(prev => ({ ...prev, ready: false }))
        }
      
      // Форсируем обновление через RAF
      requestAnimationFrame(() => {
        updateUnderline()
        setTimeout(updateUnderline, 50)
      })
    }
  }, [activeTab, updateUnderline])

  useLayoutEffect(() => {
    if (activeTab !== 'my-gifts') return

    const raf = requestAnimationFrame(updateUnderline)
    const timer1 = setTimeout(updateUnderline, 50)
    const timer2 = setTimeout(updateUnderline, 150)
    
    const onResize = () => updateUnderline()
    window.addEventListener('resize', onResize)
    
    const tabs = tabsRef.current
    let observer: ResizeObserver | undefined
    if (tabs && 'ResizeObserver' in window) {
      observer = new ResizeObserver(() => updateUnderline())
      observer.observe(tabs)
    }
    
    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(timer1)
      clearTimeout(timer2)
      window.removeEventListener('resize', onResize)
      if (observer && tabs) observer.disconnect()
    }
  }, [updateUnderline, activeTab])

  useEffect(() => {
    if (activeTab !== 'market' && activeTab !== 'my-gifts') {
      setShowLeftBlur(false)
      setShowRightBlur(false)
      return
    }

    const updateBlur = () => {
      const filterButtons = document.querySelector('.ph__filterButtons') as HTMLElement
      if (!filterButtons) return

      const scrollLeft = filterButtons.scrollLeft
      const scrollWidth = filterButtons.scrollWidth
      const clientWidth = filterButtons.clientWidth
      const maxScroll = scrollWidth - clientWidth

      setShowLeftBlur(scrollLeft > 5)
      setShowRightBlur(scrollLeft < maxScroll - 5)
    }

    // Небольшая задержка для правильной инициализации после рендера
    const timer = setTimeout(updateBlur, 100)
    
    const filterButtons = document.querySelector('.ph__filterButtons') as HTMLElement
    if (filterButtons) {
      filterButtons.addEventListener('scroll', updateBlur)
      window.addEventListener('resize', updateBlur)
    }

    return () => {
      clearTimeout(timer)
      if (filterButtons) {
        filterButtons.removeEventListener('scroll', updateBlur)
        window.removeEventListener('resize', updateBlur)
      }
    }
  }, [activeTab])

  const handleBalanceClick = () => {
    hapticLight()
    // Обновляем баланс при клике
    if (refreshBalance) {
      refreshBalance()
    }
    setIsBalanceModalOpen(true)
  }

  const handleAvatarClick = () => {
    hapticLight()
    if (onTabChange) {
      onTabChange('profile')
    }
  }

  const toggleCurrency = () => {
    hapticLight()
    setCurrency(prev => prev === 'ton' ? 'stars' : 'ton')
  }

  const displayBalance = currency === 'ton' ? tonBalance : starsBalance
  const displayBalanceFormatted = currency === 'ton' 
    ? displayBalance.toFixed(2) 
    : Math.round(displayBalance).toString()

  const handleFilterClick = (type: 'filters' | 'collection' | 'backdrop' | 'symbol') => {
    hapticLight()
    if (type === 'filters') {
      setFiltersModalOpen(true)
    } else if (type === 'collection') {
      setCollectionModalOpen(true)
    } else if (type === 'backdrop') {
      setBackgroundModalOpen(true)
    } else if (type === 'symbol') {
      setSymbolModalOpen(true)
    }
  }

  return (
    <>
      <div className="ph">
        <div className="ph__row">
          <div className="ph__left">
            <AnimatePresence mode="wait">
              {activeTab === 'profile' ? (
                <motion.div
                  key="settings"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.2 }}
                  className="ph__settings"
                >
                  <motion.button
                    className="ph__lang"
                    aria-label="Switch language"
                    onClick={() => { 
                      hapticLight(); 
                      setLang(p => p === 'en' ? 'ru' : 'en') 
                    }}
                  >
                    <div className="ph__langBox">
                      <AnimatePresence mode="wait" initial={false}>
                        <motion.div
                          key={lang}
                          initial={{ opacity: 0, y: -20, scale: 0.9 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 20, scale: 0.9 }}
                          transition={{ duration: 0.25, ease: "easeInOut" }}
                        >
                          <FlagTgs iso={lang} />
                        </motion.div>
                      </AnimatePresence>
                    </div>
                  </motion.button>
                  
                  <motion.button
                    className="ph__currency"
                    aria-label={`Switch to ${currency === 'ton' ? 'Stars' : 'TON'}`}
                    onClick={toggleCurrency}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <div className="ph__currencyBox">
                      <AnimatePresence mode="wait" initial={false}>
                        <motion.div
                          key={currency}
                          initial={{ opacity: 0, y: -20, scale: 0.9 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 20, scale: 0.9 }}
                          transition={{ duration: 0.25, ease: "easeInOut" }}
                        >
                          <CurrencyIcon currency={currency} />
                        </motion.div>
                      </AnimatePresence>
                    </div>
                  </motion.button>
                </motion.div>
              ) : (
                <motion.div
                  key="avatar"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="ph__userInfo"
                  onClick={handleAvatarClick}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="ph__miniAvatarWrap">
                    {avatarUrl ? (
                      <motion.img 
                        src={avatarUrl} 
                        className="ph__miniAvatar" 
                        alt={username || 'user'}
                        whileHover={{ scale: 1.1 }}
                        transition={{ type: "spring", stiffness: 400, damping: 10 }}
                      />
                    ) : (
                      <div className="ph__miniAvatar ph__miniAvatar--placeholder" />
                    )}
                  </div>
                  <span className="ph__username">{username}</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div 
            className="ph__balance" 
            aria-live="polite"
            onClick={handleBalanceClick}
            style={{ cursor: 'pointer' }}
          >
            <span className="ph__tokenWrap">
              {currency === 'ton' ? (
                <span className="ph__token ph__token--ton" />
              ) : (
                <span className="ph__token ph__token--stars">
                  <span className="material-icons-round">star</span>
                </span>
              )}
            </span>
            <span className="ph__amount">{displayBalanceFormatted}</span>
            <button className="ph__add" aria-label="Deposit">+</button>
          </div>
        </div>

        {(activeTab === 'market' || activeTab === 'my-gifts') && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="ph__marketControls"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: 0.1, ease: "easeOut" }}
              className="ph__searchContainer"
            >
              <div className="ph__searchIcon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"></circle>
                  <path d="m21 21-4.35-4.35"></path>
                </svg>
              </div>
              <input
                type="text"
                className="ph__searchInput"
                placeholder="Search by ID"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.15, ease: "easeOut" }}
              className="ph__filterButtonsContainer"
            >
              <motion.button
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.2, ease: "easeOut" }}
                className="ph__filterBtn ph__filterBtn--icon ph__filterBtn--left"
                onClick={() => handleFilterClick('filters')}
              >
                <span className="mdi mdi-tune"></span>
                {activeFiltersCount > 0 && (
                  <span className="ph__filterBadge">{activeFiltersCount}</span>
                )}
              </motion.button>

              <div className={`ph__filterButtonsWrapper ${showLeftBlur ? 'ph__filterButtonsWrapper--showLeft' : ''} ${showRightBlur ? 'ph__filterButtonsWrapper--showRight' : ''}`}>
                <div className="ph__filterButtons">
                  <motion.button
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3, delay: 0.25, ease: "easeOut" }}
                    className={`ph__filterBtn ph__filterBtn--large ${activeFilter === 'collection' ? 'ph__filterBtn--active' : ''} ${selectedCollections.length > 0 ? 'ph__filterBtn--hasSelection' : ''}`}
                    onClick={() => {
                      hapticLight()
                      setActiveFilter('collection')
                      handleFilterClick('collection')
                    }}
                  >
                    <span className="ph__filterBtnText">
                      Collection
                      {selectedCollections.length > 0 && (
                        <span className="ph__filterBtnCount"> ({selectedCollections.length})</span>
                      )}
                    </span>
                    <span className="mdi mdi-unfold-more-horizontal"></span>
                  </motion.button>

                  <motion.button
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3, delay: 0.3, ease: "easeOut" }}
                    className={`ph__filterBtn ph__filterBtn--large ${activeFilter === 'backdrop' ? 'ph__filterBtn--active' : ''} ${selectedBackdrops.length > 0 ? 'ph__filterBtn--hasSelection' : ''}`}
                    onClick={() => {
                      hapticLight()
                      setActiveFilter('backdrop')
                      handleFilterClick('backdrop')
                    }}
                  >
                    <span className="ph__filterBtnText">
                      Backdrop
                      {selectedBackdrops.length > 0 && (
                        <span className="ph__filterBtnCount"> ({selectedBackdrops.length})</span>
                      )}
                    </span>
                    <span className="mdi mdi-unfold-more-horizontal"></span>
                  </motion.button>

                  <motion.button
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3, delay: 0.35, ease: "easeOut" }}
                    className={`ph__filterBtn ph__filterBtn--large ${activeFilter === 'symbol' ? 'ph__filterBtn--active' : ''} ${selectedSymbols.length > 0 ? 'ph__filterBtn--hasSelection' : ''}`}
                    onClick={() => {
                      hapticLight()
                      setActiveFilter('symbol')
                      handleFilterClick('symbol')
                    }}
                  >
                    <span className="ph__filterBtnText">
                      Symbol
                      {selectedSymbols.length > 0 && (
                        <span className="ph__filterBtnCount"> ({selectedSymbols.length})</span>
                      )}
                    </span>
                    <span className="mdi mdi-unfold-more-horizontal"></span>
                  </motion.button>
                </div>
              </div>

              <motion.button
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.4, ease: "easeOut" }}
                className="ph__filterBtn ph__filterBtn--icon ph__filterBtn--right"
                onClick={() => hapticLight()}
              >
                <span className="mdi mdi-view-list"></span>
              </motion.button>
            </motion.div>

            {activeTab === 'my-gifts' && (
              <motion.div
                className="ph__giftsTabs"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                ref={tabsRef}
              >
                <button
                  type="button"
                  className={`ph__giftsTab ${giftsTab === 'unlisted' ? 'ph__giftsTab--active' : ''}`}
                  onClick={() => {
                    if (giftsTab !== 'unlisted') {
                      hapticLight()
                      setGiftsTab('unlisted')
                    }
                  }}
                >
                  <span ref={unlistedRef} className="ph__giftsTabLabel">Unlisted</span>
                </button>
                <button
                  type="button"
                  className={`ph__giftsTab ${giftsTab === 'listed' ? 'ph__giftsTab--active' : ''}`}
                  onClick={() => {
                    if (giftsTab !== 'listed') {
                      hapticLight()
                      setGiftsTab('listed')
                    }
                  }}
                >
                  <span ref={listedRef} className="ph__giftsTabLabel">Listed</span>
                </button>
                <motion.div
                  className="ph__giftsTabUnderline"
                  layout
                  initial={false} // Отключаем начальную анимацию Framer Motion
                  animate={{
                    width: underlineStyle.width,
                    x: underlineStyle.left, // Используем x вместо left для лучшей производительности
                    opacity: underlineStyle.ready ? 1 : 0,
                  }}
                  style={{
                    position: 'absolute',
                    left: 0, // Фиксируем left в 0, двигаем через x
                  }}
                  transition={{ 
                    type: 'spring', 
                    stiffness: 500, 
                    damping: 30,
                    opacity: { duration: 0.2 } // Плавное появление
                  }}
                  ref={underlineRef}
                />
              </motion.div>
            )}
          </motion.div>
        )}
      </div>

      <BalanceModal 
        isOpen={isBalanceModalOpen}
        onClose={() => setIsBalanceModalOpen(false)}
      />
      <FiltersModal
        isOpen={filtersModalOpen}
        onClose={() => setFiltersModalOpen(false)}
        onOpenCollection={() => {
          setFiltersModalOpen(false)
          setCollectionModalOpen(true)
        }}
        onOpenBackground={() => {
          setFiltersModalOpen(false)
          setBackgroundModalOpen(true)
        }}
        onOpenSymbol={() => {
          setFiltersModalOpen(false)
          setSymbolModalOpen(true)
        }}
        selectedSort={sort}
        onSortChange={setSort}
        minPrice={minPrice}
        maxPrice={maxPrice}
        onPriceChange={(min, max) => {
          setMinPrice(min)
          setMaxPrice(max)
        }}
      />
      <CollectionModal
        isOpen={collectionModalOpen}
        onClose={() => setCollectionModalOpen(false)}
        selectedGifts={selectedCollections}
        onGiftsChange={setSelectedCollections}
      />
      <BackgroundModal
        isOpen={backgroundModalOpen}
        onClose={() => setBackgroundModalOpen(false)}
        selectedBackgrounds={selectedBackdrops}
        onBackgroundsChange={setSelectedBackdrops}
      />
      <SymbolModal
        isOpen={symbolModalOpen}
        onClose={() => setSymbolModalOpen(false)}
        selectedSymbols={selectedSymbols}
        onSymbolsChange={setSelectedSymbols}
      />
    </>
  )
}

function FlagTgs({ iso }: { iso: 'en' | 'ru' }) {
  const src = iso === 'en' ? ENFlag : RUFlag
  return (
    <TgsPlayer 
      key={iso}
      src={src}
      className="ph__flag"
      width={36}
      height={26}
      loop={true}
      autoplay={true}
    />
  )
}

function CurrencyIcon({ currency }: { currency: 'ton' | 'stars' }) {
  return (
    <div className="ph__currencyIcon">
      {currency === 'ton' ? (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19.012 9.201L12.66 19.316a.857.857 0 0 1-1.453-.005L4.98 9.197a1.8 1.8 0 0 1-.266-.943a1.856 1.856 0 0 1 1.882-1.826h10.817c1.033 0 1.873.815 1.873 1.822a1.8 1.8 0 0 1-.274.951M6.51 8.863l4.633 7.144V8.143H6.994c-.48 0-.694.317-.484.72m6.347 7.144l4.633-7.144c.214-.403-.004-.72-.484-.72h-4.149z"/>
        </svg>
      ) : (
        <span className="material-icons-round">star</span>
      )}
    </div>
  )
}