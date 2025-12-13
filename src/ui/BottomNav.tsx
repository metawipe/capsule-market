import { motion } from 'framer-motion'
import { hapticLight } from '../twa'
import './bottom-nav.css'

export type BottomTab = 'market' | 'my-gifts' | 'profile'

interface BottomNavProps {
  active: BottomTab
  onChange: (tab: BottomTab) => void
}

const tabs: Array<{ key: BottomTab; label: string; icon: string }> = [
  { key: 'market', label: 'Market', icon: 'material-icons-round' },
  { key: 'my-gifts', label: 'My Gifts', icon: 'material-icons-round' },
  { key: 'profile', label: 'Profile', icon: 'material-icons-round' },
]

export function BottomNav({ active, onChange }: BottomNavProps) {
  return (
    <nav className="bottom-nav" role="navigation" aria-label="Bottom Navigation">
      <ul className="bottom-nav__list">
        {tabs.map(({ key, label }) => {
          const isActive = key === active
          return (
            <li key={key} className="bottom-nav__item">
              <button
                className={`bottom-nav__btn ${isActive ? 'is-active' : ''}`}
                onClick={() => { hapticLight(); onChange(key) }}
                aria-current={isActive ? 'page' : undefined}
              >
                <motion.span 
                  className={key === 'my-gifts' ? 'mdi mdi-gift' : 'material-icons-round'} 
                  aria-hidden="true"
                  animate={{ 
                    scale: isActive ? [1, 1.2, 1] : 1,
                  }}
                  transition={{ 
                    duration: 0.4,
                    ease: "easeOut"
                  }}
                >
                  {key === 'market' ? 'storefront' : key === 'my-gifts' ? 'gift' : 'account_circle'}
                </motion.span>
                <motion.span
                  layout
                  className="bottom-nav__label"
                  transition={{ type: 'spring', stiffness: 450, damping: 36 }}
                >
                  {label}
                </motion.span>
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}