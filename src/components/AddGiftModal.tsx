import { Modal } from '../ui/Modal'
import { hapticLight } from '../twa'
import './add-gift-modal.css'

interface AddGiftModalProps {
  isOpen: boolean
  onClose: () => void
}

export function AddGiftModal({ isOpen, onClose }: AddGiftModalProps) {
  const handleAddGift = () => {
    hapticLight()
    if (window.Telegram?.WebApp?.openTelegramLink) {
      window.Telegram.WebApp.openTelegramLink('https://t.me/GiftsToCapsule')
    } else {
      window.open('https://t.me/GiftsToCapsule', '_blank')
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Gifts">
      <div className="add-gift-modal">
        <div className="add-gift-modal__panel">
          <div className="add-gift-modal__step">
            <div className="add-gift-modal__icon add-gift-modal__icon--blue">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22 2L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="add-gift-modal__content">
              <div className="add-gift-modal__title">
                Go to the bot using the button below
              </div>
              <div className="add-gift-modal__subtitle">
                Username of the bot <span className="add-gift-modal__link">@GiftsToCapsule</span>
              </div>
            </div>
          </div>

          <div className="add-gift-modal__separator" />

          <div className="add-gift-modal__step">
            <div className="add-gift-modal__icon add-gift-modal__icon--purple">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M20 12V22H4V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M22 7H2V12H22V7Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M12 22V7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M12 7H7.5C6.83696 7 6.20107 6.73661 5.73223 6.26777C5.26339 5.79893 5 5.16304 5 4.5C5 3.83696 5.26339 3.20107 5.73223 2.73223C6.20107 2.26339 6.83696 2 7.5 2C11 2 12 7 12 7Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M12 7H16.5C17.163 7 17.7989 6.73661 18.2678 6.26777C18.7366 5.79893 19 5.16304 19 4.5C19 3.83696 18.7366 3.20107 18.2678 2.73223C17.7989 2.26339 17.163 2 16.5 2C13 2 12 7 12 7Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="add-gift-modal__content">
              <div className="add-gift-modal__title">
                Send your gift to the bot
              </div>
              <div className="add-gift-modal__subtitle">
                Quantity unlimited
              </div>
            </div>
          </div>

          <div className="add-gift-modal__separator" />

          <div className="add-gift-modal__step">
            <div className="add-gift-modal__icon add-gift-modal__icon--green">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="add-gift-modal__content">
              <div className="add-gift-modal__title">
                The gift will appear in Unlisted
              </div>
              <div className="add-gift-modal__subtitle">
                Processing time takes no more than 2 minutes
              </div>
            </div>
          </div>
        </div>

        <div className="add-gift-modal__action">
          <button className="add-gift-modal__btn" onClick={handleAddGift}>
            Add gift
          </button>
        </div>
      </div>
    </Modal>
  )
}
