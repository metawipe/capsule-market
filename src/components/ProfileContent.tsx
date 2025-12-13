import { motion } from 'framer-motion'
import { useTelegramUser, hapticLight } from '../twa'
import './profile-content.css'
import { useMemo, useState } from 'react'
import defaultAvatar from '../assets/Capsule.jpg'
import { useTonConnectUI, useTonWallet } from '@tonconnect/ui-react'

interface ProfileContentProps {
  onTermsClick?: () => void
}

export function ProfileContent({ onTermsClick }: ProfileContentProps) {
  const user = useTelegramUser()
  const [balance] = useState(0.00)
  const [referrals] = useState(0)
  const [tonConnectUI] = useTonConnectUI()
  const wallet = useTonWallet()

  const truncatedAddress = useMemo(() => {
    const raw = wallet?.account?.address
    if (!raw) return ''
    return `${raw.slice(0, 4)}...${raw.slice(-4)}`
  }, [wallet])

  const handleCopyClick = () => {
    navigator.clipboard.writeText(`https://t.me/CapsuleMarketBot?start=ref_${user!.id}`)
  }

  const handleInviteClick = async () => {
    const userId = user!.id
    const inviteLink = `https://t.me/CapsuleMarketBot?start=ref_${userId}`
    
    if (window.Telegram?.WebApp?.openTelegramLink) {
      const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(inviteLink)}`
      window.Telegram.WebApp.openTelegramLink(shareUrl)
    } else {

    }
  }

  const handleConnectWallet = () => {
    hapticLight()
    tonConnectUI.openModal()
  }

  const handleDisconnectWallet = async () => {
    hapticLight()
    try {
      await tonConnectUI.disconnect()
    } catch (e) {
      console.error('TON disconnect error', e)
    }
  }

  const handleWithdrawClick = () => {
    if (balance > 0) {
      // Логика вывода средств
    }
  }

  return (
    <div className="profile-content">
      <motion.div 
        className="profile-avatar-section"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="profile-avatar-container">
          <motion.img 
            src={user?.photo_url || defaultAvatar}
            alt={user?.username || user?.first_name}
            className="profile-avatar"
            transition={{ type: "spring", stiffness: 400, damping: 10 }}
          />
        </div>
        
        <motion.h2 
          className="profile-username"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          {user?.username || user?.first_name || 'Capsule'}
        </motion.h2>
      </motion.div>

      <div className="profile-content-bars">
        <motion.div 
          className="profile-content-bar"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="profile-wallet-section">
            <div className="profile-wallet-info">
              <p className="profile-wallet-title">Wallet</p>
              <p className="profile-wallet-address">
                {wallet ? (truncatedAddress || '—') : 'Not connected'}
              </p>
            </div>
            <div className="profile-wallet-actions">
              {wallet ? (
                <button
                  className="profile-wallet-btn profile-wallet-btn--disconnect"
                  onClick={handleDisconnectWallet}
                >
                  Disconnect
                </button>
              ) : (
                <button
                  className="profile-wallet-btn"
                  onClick={handleConnectWallet}
                >
                  Connect wallet
                </button>
              )}
            </div>
          </div>
        </motion.div>

        <motion.div 
          className="profile-content-bar"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="profile-referral-section">
            <div className="profile-invite-header">
              <p className="profile-invite-text">
                Invite friends and earn 10% of their deposit
              </p>
              <button className="profile-terms-btn" onClick={onTermsClick}>
                Terms
              </button>
            </div>
            <div className="profile-invite-buttons">
              <button className="profile-invite-btn" onClick={handleInviteClick}>
                Invite
              </button>
              <button className="profile-copy-btn" onClick={handleCopyClick}>
                <span className="profile-copy-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
                  </svg>
                </span>
              </button>
            </div>
          </div>

          <div className="profile-content-divider"></div>
          <div className="profile-content-section">
            <div className="profile-stats-section">
              <div className="profile-stats-rows">
                <div className="profile-stats-row">
                  <div className="profile-stats-item">
                    <span className="profile-stats-label">Balance:</span>
                    <span className="profile-stats-value">
                      {balance.toFixed(2)}
                      <span className="profile-token-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
                          <title>Ton SVG Icon</title>
                          <path fill="currentColor" d="M19.012 9.201L12.66 19.316a.857.857 0 0 1-1.453-.005L4.98 9.197a1.8 1.8 0 0 1-.266-.943a1.856 1.856 0 0 1 1.882-1.826h10.817c1.033 0 1.873.815 1.873 1.822a1.8 1.8 0 0 1-.274.951M6.51 8.863l4.633 7.144V8.143H6.994c-.48 0-.694.317-.484.72m6.347 7.144l4.633-7.144c.214-.403-.004-.72-.484-.72h-4.149z"/>
                        </svg>
                      </span>
                    </span>
                  </div>
                </div>

                <div className="profile-stats-row">
                  <div className="profile-stats-item">
                    <span className="profile-stats-label">Referrals:</span>
                    <span className="profile-stats-value">{referrals}</span>
                  </div>
                </div>
              </div>

              <button 
                className="profile-withdraw-btn" 
                onClick={handleWithdrawClick}
                disabled={balance === 0}
              >
                Withdraw
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}