import { hapticLight } from '../twa'
import { Modal } from '../ui/Modal'
import './filter-modal.css'

interface FilterModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
}

export function FilterModal({ isOpen, onClose, title }: FilterModalProps) {
  const handleClear = () => {
    hapticLight()
  }

  const handleApply = () => {
    hapticLight()
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      className="filter-modal__content"
      bodyClassName="filter-modal__body"
    >
      {/* Контент фильтров будет здесь */}

      <div className="filter-modal__footer">
        <button 
          className="filter-modal__btn filter-modal__btn--clear"
          onClick={handleClear}
        >
          Clear
        </button>
        <button 
          className="filter-modal__btn filter-modal__btn--apply"
          onClick={handleApply}
        >
          Apply
        </button>
      </div>
    </Modal>
  )
}

