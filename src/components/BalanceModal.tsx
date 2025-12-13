import { Modal } from '../ui/Modal'
import './balance-modal.css'
import { useTonConnectUI, useTonWallet } from '@tonconnect/ui-react'
import { hapticLight } from '../twa'
import { useMemo, useState } from 'react'
import { PromocodeModal } from './PromocodeModal'

interface BalanceModalProps {
  isOpen: boolean
  onClose: () => void
}

export function BalanceModal({ isOpen, onClose }: BalanceModalProps) {
  const [tonConnectUI] = useTonConnectUI()
  const wallet = useTonWallet()
  const [activeTab, setActiveTab] = useState<'gifts' | 'ton' | 'stars'>('ton')
  const [amount, setAmount] = useState<string>('')
  const [isPromocodeModalOpen, setIsPromocodeModalOpen] = useState(false)

  const handleConnect = () => {
    hapticLight()
    tonConnectUI.openModal()
  }

  const truncatedAddress = useMemo(() => {
    const raw = wallet?.account?.address
    if (!raw) return ''
    return `${raw.slice(0, 4)}...${raw.slice(-4)}`
  }, [wallet])

  const amountValue = useMemo(() => {
    const n = Number(amount)
    return Number.isFinite(n) && n > 0 ? n : 0
  }, [amount])

  const TON_DEPOSIT_ADDRESS = import.meta.env.VITE_TON_DEPOSIT_ADDRESS || 'UQDD9qBiVAP0eo55QoKtg90Pr5D_pw45j4iAccxZsXfbFH1W'
  const canDepositTon = !!wallet && amountValue > 0 && !!TON_DEPOSIT_ADDRESS
  const starsRateText = '1 Stars = 0.5 ₽'
  const canDepositStars = !!wallet && amountValue > 0

  const handleDepositTon = async () => {
    if (!canDepositTon) return
    hapticLight()
    try {
      const nanoAmount = Math.round(amountValue * 1e9).toString()
      await tonConnectUI.sendTransaction({
        validUntil: Math.floor(Date.now() / 1000) + 300,
        messages: [
          {
            address: TON_DEPOSIT_ADDRESS,
            amount: nanoAmount,
          },
        ],
      })
    } catch (e) {
      console.error('TON deposit error', e)
    }
  }

  const handleDepositStars = async () => {
    if (!canDepositStars) return
    hapticLight()
    
    const starsLink = `https://t.me/CapsulePayBot?start=stars_${Math.round(amountValue)}`
    
    if (window.Telegram?.WebApp?.openTelegramLink) {
      window.Telegram.WebApp.openTelegramLink(starsLink)
    } else {
      window.open(starsLink, '_blank')
    }
  }

  const handlePromocodeClick = () => {
    hapticLight()
    setIsPromocodeModalOpen(true)
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Deposit">
      {!wallet ? (
        <div className="balance-modal__wallet-section">
          <div className="balance-modal__wallet-info">
            <h3 className="balance-modal__wallet-title">
              Connect wallet
            </h3>
            <p className="balance-modal__wallet-description">
              Connect your wallet to manage your balance and make transactions.
            </p>
            <button className="balance-modal__connect-btn" onClick={handleConnect}>
              Connect Wallet
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="balance-modal__tabs">
            <button
              className={`balance-modal__tab ${activeTab === 'ton' ? 'balance-modal__tab--active' : ''}`}
              onClick={() => setActiveTab('ton')}
            >
              TON
            </button>
            <button
              className={`balance-modal__tab ${activeTab === 'stars' ? 'balance-modal__tab--active' : ''}`}
              onClick={() => setActiveTab('stars')}
            >
              Stars
            </button>
          </div>

          {activeTab === 'ton' && (
            <div className="balance-modal__panel">
              <div className="balance-modal__line">
                <span className="balance-modal__label">
                  <span className="material-symbols-outlined balance-modal__icon">account_balance_wallet</span>
                  Address:
                </span>
                <span className="balance-modal__value">
                  {wallet ? (truncatedAddress || '—') : 'Not connected'}
                </span>
              </div>
              <div className="balance-modal__input-wrap">
                <label className="balance-modal__label_amount">
                  Amount
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="balance-modal__amount-input"
                  placeholder="0.00"
                />
              </div>
              <button
                className="balance-modal__connect-btn"
                disabled={!canDepositTon}
                onClick={handleDepositTon}
              >
                Deposit
              </button>
            </div>
          )}

          {activeTab === 'stars' && (
            <div className="balance-modal__panel">
              <div className="balance-modal__line">
                <span className="balance-modal__label">
                  <span className="material-symbols-outlined balance-modal__icon">currency_exchange</span>
                  Rate:
                </span>
                <span className="balance-modal__value">{starsRateText}</span>
              </div>
              <div className="balance-modal__input-wrap">
                <label className="balance-modal__label_amount">
                  Amount
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="balance-modal__amount-input"
                  placeholder="0.0"
                />
              </div>
              <div className="balance-modal__buttons-row">
                <button
                  className="balance-modal__connect-btn balance-modal__connect-btn--half"
                  disabled={!canDepositStars}
                  onClick={handleDepositStars}
                >
                  Deposit
                </button>
                <button
                  className="balance-modal__promocode-btn"
                  onClick={handlePromocodeClick}
                >
                  Promocode
                </button>
              </div>
            </div>
          )}
        </>
      )}
      <PromocodeModal
        isOpen={isPromocodeModalOpen}
        onClose={() => setIsPromocodeModalOpen(false)}
      />
    </Modal>
  )
}