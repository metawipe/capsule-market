import './App.css'
import type { BottomTab } from './ui/BottomNav'
import { useState } from 'react'
import { BottomNav } from './ui/BottomNav'
import { ProfileHeader } from './components/ProfileHeader'
import { ProfileContent } from './components/ProfileContent'
import { BalanceModal } from './components/BalanceModal'
import { TermsModal } from './components/TermsModal'
import { MarketContent } from './components/MarketContent'
import { MyGiftsContent } from './components/MyGiftsContent'
import { MarketProvider } from './contexts/MarketContext'
import { UserProvider } from './contexts/UserContext'
import { motion, AnimatePresence } from 'framer-motion'

function App() {
  const [tab, setTab] = useState<BottomTab>('market')
  const [isBalanceModalOpen, setIsBalanceModalOpen] = useState(false)
  const [isTermsModalOpen, setIsTermsModalOpen] = useState(false)

  return (
    <UserProvider>
    <MarketProvider>
    <div className="tma-root">
      <ProfileHeader 
        activeTab={tab} 
        onTabChange={setTab}
      />
      
      <div className="tma-container">
        <div className="tab-content">
          <AnimatePresence mode="wait">
            {tab === 'market' && (
              <motion.div
                key="market"
                className="market-scroll-container"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                style={{ 
                  flex: 1,
                  minHeight: 0,
                  maxHeight: '100%',
                  overflowY: 'auto',
                  overflowX: 'hidden',
                  WebkitOverflowScrolling: 'touch',
                  touchAction: 'pan-y',
                  paddingTop: 'calc(var(--header-height, calc(env(safe-area-inset-top, 0px) + 72px)) + 50px)',
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none',
                  background: 'transparent'
                } as React.CSSProperties}
              >
                <MarketContent />
              </motion.div>
            )}
            
            {tab === 'my-gifts' && (
              <motion.div
                key="my-gifts"
                className="my-gifts-scroll-container"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                style={{ 
                  flex: 1,
                  minHeight: 0,
                  maxHeight: '100%',
                  overflowY: 'auto',
                  overflowX: 'hidden',
                  WebkitOverflowScrolling: 'touch',
                  touchAction: 'pan-y',
                  paddingTop: 'calc(var(--header-height, calc(env(safe-area-inset-top, 0px) + 72px)) + 80px)',
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none',
                  background: 'transparent'
                } as React.CSSProperties}
              >
                <MyGiftsContent />
              </motion.div>
            )}
            
            {tab === 'profile' && (
              <motion.div
                key="profile"
                data-tab="profile"
                className="profile-tab-container"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  flex: 1, 
                  minHeight: 0,
                  height: '100%',
                  overflowY: 'auto',
                  overflowX: 'hidden',
                  WebkitOverflowScrolling: 'touch',
                  touchAction: 'pan-y',
                  position: 'relative',
                  paddingTop: 'calc(var(--header-height, calc(env(safe-area-inset-top, 0px) + 72px)) - 20px)'
                }}
              >
                <ProfileContent 
                  onTermsClick={() => setIsTermsModalOpen(true)}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      
      <BottomNav active={tab} onChange={setTab} />
      
      <BalanceModal 
        isOpen={isBalanceModalOpen} 
        onClose={() => setIsBalanceModalOpen(false)} 
      />
      <TermsModal 
        isOpen={isTermsModalOpen} 
        onClose={() => setIsTermsModalOpen(false)} 
      />
    </div>
    </MarketProvider>
    </UserProvider>
  )
}

export default App