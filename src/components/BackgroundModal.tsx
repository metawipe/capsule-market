import { motion } from 'framer-motion'
import { hapticLight } from '../twa'
import { Modal } from '../ui/Modal'
import './background-modal.css'
import { useState, useEffect, useMemo } from 'react'

interface Backdrop {
  name: string
  slug: string
  icon: string
}

interface BackgroundModalProps {
  isOpen: boolean
  onClose: () => void
  selectedBackgrounds: string[]
  onBackgroundsChange: (backgrounds: string[]) => void
}

// Глобальный кеш для бэкдропов
let backdropsCache: Backdrop[] | null = null

export function BackgroundModal({ 
  isOpen, 
  onClose, 
  selectedBackgrounds,
  onBackgroundsChange
}: BackgroundModalProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [backdrops, setBackdrops] = useState<Backdrop[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<string[]>(selectedBackgrounds)

  useEffect(() => {
    setSelected(selectedBackgrounds)
  }, [selectedBackgrounds])

  useEffect(() => {
    if (isOpen) {
      // Если бэкдропы уже загружены в кеше, используем их сразу
      if (backdropsCache && backdropsCache.length > 0) {
        setBackdrops(backdropsCache)
        setLoading(false)
      } else {
        // Загружаем только если кеш пуст
      loadBackdrops()
      }
    }
  }, [isOpen])

  const loadBackdrops = async () => {
    try {
      setLoading(true)
      const response = await fetch('/backdrops_list.json')
      if (!response.ok) {
        throw new Error('Failed to load backdrops')
      }
      const data: Backdrop[] = await response.json()
      
      // Сохраняем в кеш
      backdropsCache = data
      setBackdrops(data)
    } catch (error) {
      console.error('Ошибка загрузки фонов:', error)
    } finally {
      setLoading(false)
    }
  }

  // Сортируем: выбранные сверху, остальные по названию
  const sortedBackdrops = useMemo(() => {
    const selectedList = backdrops.filter(b => selected.includes(b.name))
    const unselectedList = backdrops.filter(b => !selected.includes(b.name))
    
    selectedList.sort((a, b) => {
      const indexA = selected.indexOf(a.name)
      const indexB = selected.indexOf(b.name)
      return indexA - indexB
    })
    
    unselectedList.sort((a, b) => a.name.localeCompare(b.name))
    
    return [...selectedList, ...unselectedList]
  }, [backdrops, selected])

  const filteredBackdrops = useMemo(() => {
    if (!searchQuery.trim()) return sortedBackdrops
    const query = searchQuery.toLowerCase()
    return sortedBackdrops.filter(b => b.name.toLowerCase().includes(query))
  }, [sortedBackdrops, searchQuery])

  const handleToggleBackdrop = (backdropName: string) => {
    hapticLight()
    const newSelected = selected.includes(backdropName)
      ? selected.filter(name => name !== backdropName)
      : [...selected, backdropName]
    setSelected(newSelected)
    // Сразу применяем изменения без кнопки Apply
    onBackgroundsChange(newSelected)
  }

  const handleClear = () => {
    hapticLight()
    setSelected([])
    // Сразу применяем очистку
    onBackgroundsChange([])
  }

  const handleClose = () => {
    hapticLight()
    // Уже применено при изменении, просто закрываем
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Background"
      className="background-modal__content"
      bodyClassName="background-modal__body"
    >
      <div className="background-modal__search">
        <div className="background-modal__search-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M21 21L15 15M17 10C17 13.866 13.866 17 10 17C6.13401 17 3 13.866 3 10C3 6.13401 6.13401 3 10 3C13.866 3 17 6.13401 17 10Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <input
          type="text"
          className="background-modal__search-input"
          placeholder="Search by background"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="background-modal__body">
      {loading ? (
        <div className="background-modal__loading">
          <p>Loading backgrounds...</p>
        </div>
      ) : (
        <div className="background-modal__list">
          {filteredBackdrops.map((backdrop) => (
            <motion.div
              key={backdrop.name}
                className={`background-modal__item ${selected.includes(backdrop.name) ? 'background-modal__item--selected' : ''}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
                onClick={() => handleToggleBackdrop(backdrop.name)}
            >
                <div className="background-modal__item-label">
                <input
                  type="checkbox"
                  className="background-modal__checkbox"
                  checked={selected.includes(backdrop.name)}
                    readOnly
                />
                  <div className="background-modal__item-icon">
                    {backdrop.icon ? (
                      <img src={backdrop.icon} alt={backdrop.name} loading="lazy" />
                    ) : (
                      <div 
                        className="background-modal__item-color"
                        style={{ background: 'linear-gradient(135deg, #363738 0%, #0e0f0f 100%)' }}
                      />
                    )}
                  </div>
                <div className="background-modal__item-content">
                  <div className="background-modal__item-name">{backdrop.name}</div>
                  </div>
                </div>
            </motion.div>
          ))}
        </div>
      )}
      </div>

      <div className="background-modal__footer">
        <button 
          className="background-modal__btn background-modal__btn--close"
          onClick={handleClose}
        >
          Close
        </button>
        <button 
          className="background-modal__btn background-modal__btn--clear"
          onClick={handleClear}
        >
          Clear all
        </button>
      </div>
    </Modal>
  )
}

