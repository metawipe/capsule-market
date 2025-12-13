import { hapticLight } from '../twa'
import { Modal } from '../ui/Modal'
import './terms-modal.css'

interface TermsModalProps {
  isOpen: boolean
  onClose: () => void
}

export function TermsModal({ isOpen, onClose }: TermsModalProps) {

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Referral Program Terms"
      className="terms-modal__content"
      bodyClassName="terms-modal__body"
    >
      <div className="terms-modal__terms-content">
        <ul className="terms-modal__terms-list">
          <li className="terms-modal__terms-item">
            <span className="terms-modal__terms-number">1.</span>
            <span className="terms-modal__terms-text">Only real users — multiple accounts are prohibited.</span>
          </li>
          <li className="terms-modal__terms-item">
            <span className="terms-modal__terms-number">2.</span>
            <span className="terms-modal__terms-text">Funds can be withdrawn once the total reaches 5 TON.</span>
          </li>
          <li className="terms-modal__terms-item">
            <span className="terms-modal__terms-number">3.</span>
            <span className="terms-modal__terms-text">Rewards may be revoked if the rules are violated.</span>
          </li>
        </ul>
        
        <div className="terms-modal__divider"></div>
        
        <button 
          className="terms-modal__understood-btn"
          onClick={() => {
            hapticLight()
            onClose()
          }}
        >
          Understood
        </button>
      </div>
    </Modal>
  )
}