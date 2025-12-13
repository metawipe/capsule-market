import { motion } from 'framer-motion'
import { hapticLight } from '../twa'
import { Modal } from '../ui/Modal'
import './collection-modal.css'
import { useState, useEffect, useMemo } from 'react'

interface CollectionItem {
  name: string
  slug: string
  icon: string
  href?: string
}

interface CollectionModalProps {
  isOpen: boolean
  onClose: () => void
  selectedGifts: string[]
  onGiftsChange: (gifts: string[]) => void
}

// Глобальный кеш для коллекций, чтобы не загружать их каждый раз при открытии модалки
let collectionsCache: CollectionItem[] | null = null

export function CollectionModal({ 
  isOpen, 
  onClose, 
  selectedGifts,
  onGiftsChange
}: CollectionModalProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [collections, setCollections] = useState<CollectionItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<string[]>(selectedGifts)

  useEffect(() => {
    setSelected(selectedGifts)
  }, [selectedGifts])

  useEffect(() => {
    if (isOpen) {
      // Если коллекции уже загружены в кеше, используем их сразу
      if (collectionsCache && collectionsCache.length > 0) {
        setCollections(collectionsCache)
        setLoading(false)
      } else {
        // Загружаем только если кеш пуст
        loadCollections()
      }
    }
  }, [isOpen])

  const loadCollections = async () => {
    try {
      setLoading(true)
      const response = await fetch('/collections_list.json')
      if (!response.ok) {
        throw new Error('Failed to load collections')
      }
      const data: CollectionItem[] = await response.json()
      
      // Сохраняем в кеш
      collectionsCache = data
      setCollections(data)
    } catch (error) {
      console.error('Error loading collections:', error)
    } finally {
      setLoading(false)
    }
  }

  // Сортируем: выбранные сверху, остальные по названию
  const sortedCollections = useMemo(() => {
    const selectedList = collections.filter(c => selected.includes(c.name))
    const unselectedList = collections.filter(c => !selected.includes(c.name))
    
    // Сортируем выбранные по позиции в selected
    selectedList.sort((a, b) => {
      const indexA = selected.indexOf(a.name)
      const indexB = selected.indexOf(b.name)
      return indexA - indexB
    })
    
    // Сортируем невыбранные по названию
    unselectedList.sort((a, b) => a.name.localeCompare(b.name))
    
    return [...selectedList, ...unselectedList]
  }, [collections, selected])

  const filteredCollections = useMemo(() => {
    if (!searchQuery.trim()) return sortedCollections
    const query = searchQuery.toLowerCase()
    return sortedCollections.filter(c => c.name.toLowerCase().includes(query))
  }, [sortedCollections, searchQuery])

  const handleToggleCollection = (name: string) => {
    hapticLight()
    // Находим коллекцию по имени и используем slug для фильтрации
    const collection = collections.find(c => c.name === name)
    const identifier = collection?.slug || name // Используем slug если есть, иначе name
    
    const newSelected = selected.includes(identifier)
      ? selected.filter(id => id !== identifier)
      : [...selected, identifier]
    setSelected(newSelected)
    // Сразу применяем изменения без кнопки Apply
    onGiftsChange(newSelected)
  }

  const handleClear = () => {
    hapticLight()
    setSelected([])
    // Сразу применяем очистку
    onGiftsChange([])
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
      title="Collection"
      className="collection-modal__content"
      bodyClassName="collection-modal__body"
    >
      <div className="collection-modal__search">
        <div className="collection-modal__search-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M21 21L15 15M17 10C17 13.866 13.866 17 10 17C6.13401 17 3 13.866 3 10C3 6.13401 6.13401 3 10 3C13.866 3 17 6.13401 17 10Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <input
          type="text"
          className="collection-modal__search-input"
          placeholder="Search by collection"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="collection-modal__body">
      {loading ? (
        <div className="collection-modal__loading">
          <p>Loading collections...</p>
        </div>
      ) : (
        <div className="collection-modal__list">
            {filteredCollections.map((collection) => (
            <motion.div
                key={collection.name}
                className={`collection-modal__item ${selected.includes(collection.slug || collection.name) ? 'collection-modal__item--selected' : ''}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
                onClick={() => handleToggleCollection(collection.name)}
            >
                <div className="collection-modal__item-label">
                <input
                  type="checkbox"
                  className="collection-modal__checkbox"
                    checked={selected.includes(collection.slug || collection.name)}
                    readOnly
                />
                <div className="collection-modal__item-icon">
                  {collection.icon ? (
                    <img src={collection.icon} alt={collection.name} loading="lazy" />
                  ) : (
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ color: '#8E8E93' }}>
                      <path d="M20 12V22H4V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M22 7H2V12H22V7Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M12 22V7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M12 7H7.5C6.83696 7 6.20107 6.73661 5.73223 6.26777C5.26339 5.79893 5 5.16304 5 4.5C5 3.83696 5.26339 3.20107 5.73223 2.73223C6.20107 2.26339 6.83696 2 7.5 2C11 2 12 7 12 7Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M12 7H16.5C17.163 7 17.7989 6.73661 18.2678 6.26777C18.7366 5.79893 19 5.16304 19 4.5C19 3.83696 18.7366 3.20107 18.2678 2.73223C17.7989 2.26339 17.163 2 16.5 2C13 2 12 7 12 7Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>
                <div className="collection-modal__item-content">
                    <div className="collection-modal__item-name">{collection.name}</div>
                  </div>
                </div>
            </motion.div>
          ))}
        </div>
      )}
      </div>

      <div className="collection-modal__footer">
        <button 
          className="collection-modal__btn collection-modal__btn--close"
          onClick={handleClose}
        >
          Close
        </button>
        <button 
          className="collection-modal__btn collection-modal__btn--clear"
          onClick={handleClear}
        >
          Clear all
        </button>
      </div>
    </Modal>
  )
}
