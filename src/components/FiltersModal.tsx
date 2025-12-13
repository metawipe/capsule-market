import { motion, AnimatePresence } from 'framer-motion'
import { hapticLight } from '../twa'
import { Modal } from '../ui/Modal'
import './filters-modal.css'
import { useState, useEffect } from 'react'
import type { SortOption } from './SortModal'

interface FiltersModalProps {
  isOpen: boolean
  onClose: () => void
  onOpenCollection: () => void
  onOpenBackground: () => void
  onOpenSymbol: () => void
  selectedSort: SortOption | null
  onSortChange: (sort: SortOption | null) => void
  minPrice: string
  maxPrice: string
  onPriceChange: (min: string, max: string) => void
}

const sortOptions: { value: SortOption; label: string }[] = [
  { value: 'latest', label: 'Latest' },
  { value: 'price-low', label: 'Price: Low to High' },
  { value: 'price-high', label: 'Price: High to Low' },
  { value: 'id-asc', label: 'Gift ID: Ascending' },
  { value: 'id-desc', label: 'Gift ID: Descending' },
  { value: 'rarity-asc', label: 'Model rarity: Ascending' },
  { value: 'rarity-desc', label: 'Model rarity: Descending' },
]

export function FiltersModal({ 
  isOpen, 
  onClose, 
  onOpenCollection,
  onOpenBackground,
  onOpenSymbol,
  selectedSort,
  onSortChange,
  minPrice,
  maxPrice,
  onPriceChange
}: FiltersModalProps) {
  const [expandedFilter, setExpandedFilter] = useState<string | null>(null)
  
  // Локальный стейт для цены, чтобы применять только по кнопке Show results
  const [localPrice, setLocalPrice] = useState({ min: minPrice, max: maxPrice })
  const [localSort, setLocalSort] = useState<SortOption | null>(selectedSort)

  // Синхронизация при открытии
  useEffect(() => {
    if (isOpen) {
      setLocalPrice({ min: minPrice, max: maxPrice })
      setLocalSort(selectedSort)
    }
  }, [isOpen, minPrice, maxPrice, selectedSort])

  const isSortOpen = expandedFilter === 'sort'
  const isPriceOpen = expandedFilter === 'price'
  const rangeMin = 0
  const rangeMax = 100000

  const handleFilterClick = (filterId: string) => {
    hapticLight()
    if (filterId === 'sort') {
      setExpandedFilter(isSortOpen ? null : filterId)
    } else if (filterId === 'price') {
      setExpandedFilter(isPriceOpen ? null : filterId)
    } else if (filterId === 'collection') {
      onOpenCollection()
    } else if (filterId === 'background') {
      onOpenBackground()
    } else if (filterId === 'symbol') {
      onOpenSymbol()
    }
  }

  const handleSortSelect = (sort: SortOption) => {
    hapticLight()
    setLocalSort(sort)
    setExpandedFilter(null)
  }

  const handleClearAll = () => {
    hapticLight()
    setLocalSort(null)
    setLocalPrice({ min: '0', max: '100000' })
    // Не закрываем модалку, пользователь должен нажать Show results
  }

  const handleShowResults = () => {
    hapticLight()
    onSortChange(localSort)
    onPriceChange(localPrice.min, localPrice.max)
    onClose()
  }

  const clampToRange = (value: number) => Math.min(Math.max(value, rangeMin), rangeMax)

  const applyMin = (value: number) => {
    setLocalPrice((prev) => ({ ...prev, min: String(clampToRange(value)) }))
  }

  const applyMax = (value: number) => {
    setLocalPrice((prev) => ({ ...prev, max: String(clampToRange(value)) }))
  }

  const handleMinChange = (value: string) => {
    setLocalPrice((prev) => ({ ...prev, min: value }))
    // Можно валидировать на лету, но лучше при блюре или сабмите
  }

  const handleMaxChange = (value: string) => {
    setLocalPrice((prev) => ({ ...prev, max: value }))
  }

  const handleMinBlur = () => {
    if (localPrice.min === '') return
    const numeric = Number(localPrice.min)
    const fallback = Number.isNaN(numeric) ? rangeMin : numeric
    applyMin(fallback)
  }

  const handleMaxBlur = () => {
    if (localPrice.max === '') return
    const numeric = Number(localPrice.max)
    const fallback = Number.isNaN(numeric) ? rangeMax : numeric
    applyMax(fallback)
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Filters"
      className="filters-modal__content"
      bodyClassName="filters-modal__body"
    >
      {/* Sort by */}
      <div className={`filters-modal__filter-item ${isSortOpen ? 'filters-modal__filter-item--open' : ''}`}>
        <button
          className={`filters-modal__filter-btn ${isSortOpen ? 'filters-modal__filter-btn--open' : ''}`}
          onClick={() => handleFilterClick('sort')}
        >
          <span className="material-symbols-outlined filters-modal__filter-icon">swap_vert</span>
          <span className="filters-modal__filter-label">Sort by</span>
          <motion.span
            className="mdi mdi-chevron-down filters-modal__filter-chevron"
            animate={{
              rotate: isSortOpen ? 180 : 0
            }}
            transition={{ duration: 0.2 }}
          />
        </button>
        
        <AnimatePresence>
          {isSortOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="filters-modal__filter-content"
            >
              <div className="filters-modal__sort-list">
                {sortOptions.map((option) => (
                  <button
                    key={option.value}
                    className="filters-modal__sort-item"
                    onClick={() => handleSortSelect(option.value)}
                  >
                    <input
                      type="radio"
                      name="sort"
                      className="filters-modal__radio"
                      checked={localSort === option.value}
                      onChange={() => {}}
                    />
                    <span className="filters-modal__sort-label">{option.label}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Price */}
      <div className={`filters-modal__filter-item ${isPriceOpen ? 'filters-modal__filter-item--open' : ''}`}>
        <button
          className={`filters-modal__filter-btn ${isPriceOpen ? 'filters-modal__filter-btn--open' : ''}`}
          onClick={() => handleFilterClick('price')}
        >
          <span className="material-symbols-outlined filters-modal__filter-icon">sell</span>
          <span className="filters-modal__filter-label">Price</span>
          <motion.span
            className="mdi mdi-chevron-down filters-modal__filter-chevron"
            animate={{
              rotate: isPriceOpen ? 180 : 0
            }}
            transition={{ duration: 0.2 }}
          />
        </button>

        <AnimatePresence>
          {isPriceOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="filters-modal__filter-content filters-modal__filter-content--price"
            >
              <div className="filters-modal__price-inputs">
                <input
                  type="number"
                  min={rangeMin}
                  max={rangeMax}
                  value={localPrice.min}
                  onChange={(e) => handleMinChange(e.target.value)}
                  onBlur={handleMinBlur}
                  className="filters-modal__price-input"
                  placeholder="Min"
                />
                <input
                  type="number"
                  min={rangeMin}
                  max={rangeMax}
                  value={localPrice.max}
                  onChange={(e) => handleMaxChange(e.target.value)}
                  onBlur={handleMaxBlur}
                  className="filters-modal__price-input"
                  placeholder="Max"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Collection */}
      <div className="filters-modal__filter-item">
        <button
          className="filters-modal__filter-btn"
          onClick={() => handleFilterClick('collection')}
        >
          <span className="material-symbols-outlined filters-modal__filter-icon">auto_awesome_mosaic</span>
          <span className="filters-modal__filter-label">Collection</span>
          <span className="mdi mdi-chevron-down filters-modal__filter-chevron"></span>
        </button>
      </div>

      {/* Model */}
      <div className="filters-modal__filter-item">
        <button
          className="filters-modal__filter-btn"
          onClick={() => handleFilterClick('model')}
        >
          <span className="material-symbols-outlined filters-modal__filter-icon">trail_length_short</span>
          <span className="filters-modal__filter-label">Model</span>
          <span className="mdi mdi-chevron-down filters-modal__filter-chevron"></span>
        </button>
      </div>

      {/* Background */}
      <div className="filters-modal__filter-item">
        <button
          className="filters-modal__filter-btn"
          onClick={() => handleFilterClick('background')}
        >
          <span className="material-symbols-outlined filters-modal__filter-icon">palette</span>
          <span className="filters-modal__filter-label">Background</span>
          <span className="mdi mdi-chevron-down filters-modal__filter-chevron"></span>
        </button>
      </div>

      {/* Symbol */}
      <div className="filters-modal__filter-item">
        <button
          className="filters-modal__filter-btn"
          onClick={() => handleFilterClick('symbol')}
        >
          <span className="material-symbols-outlined filters-modal__filter-icon">add_reaction</span>
          <span className="filters-modal__filter-label">Symbol</span>
          <span className="mdi mdi-chevron-down filters-modal__filter-chevron"></span>
        </button>
      </div>

      <div className="filters-modal__footer">
        <button 
          className="filters-modal__btn filters-modal__btn--clear"
          onClick={handleClearAll}
        >
          Clear all
        </button>
        <button 
          className="filters-modal__btn filters-modal__btn--apply"
          onClick={handleShowResults}
        >
          Show results
        </button>
      </div>
    </Modal>
  )
}
