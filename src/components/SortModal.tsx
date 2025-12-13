import { motion } from 'framer-motion'
import { hapticLight } from '../twa'
import { Modal } from '../ui/Modal'
import './sort-modal.css'

export type SortOption = 
  | 'latest'
  | 'price-low'
  | 'price-high'
  | 'id-asc'
  | 'id-desc'
  | 'rarity-asc'
  | 'rarity-desc'

interface SortModalProps {
  isOpen: boolean
  onClose: () => void
  selectedSort: SortOption | null
  onSortChange: (sort: SortOption) => void
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

export function SortModal({ 
  isOpen, 
  onClose, 
  selectedSort,
  onSortChange
}: SortModalProps) {
  const handleSortSelect = (sort: SortOption) => {
    hapticLight()
    onSortChange(sort)
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Sort by"
      className="sort-modal__content"
      bodyClassName="sort-modal__body"
    >
      <div className="sort-modal__list">
        {sortOptions.map((option) => (
          <motion.button
            key={option.value}
            className="sort-modal__item"
            onClick={() => handleSortSelect(option.value)}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2 }}
          >
            <input
              type="radio"
              name="sort"
              className="sort-modal__radio"
              checked={selectedSort === option.value}
              onChange={() => {}}
            />
            <span className="sort-modal__item-label">{option.label}</span>
          </motion.button>
        ))}
      </div>
    </Modal>
  )
}

