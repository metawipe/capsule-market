import { motion, AnimatePresence } from 'framer-motion'
import { useEffect } from 'react'
import './toast.css'

interface ToastProps {
  message: string
  type?: 'success' | 'error' | 'info'
  isVisible: boolean
  onClose: () => void
  duration?: number
}

export function Toast({ message, type = 'success', isVisible, onClose, duration = 3000 }: ToastProps) {
  useEffect(() => {
    if (isVisible && duration > 0) {
      const timer = setTimeout(() => {
        onClose()
      }, duration)
      return () => clearTimeout(timer)
    }
  }, [isVisible, duration, onClose])

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className={`toast toast--${type}`}
          initial={{ opacity: 0, y: -50, scale: 0.9, x: '-50%' }}
          animate={{ opacity: 1, y: 0, scale: 1, x: '-50%' }}
          exit={{ opacity: 0, y: -50, scale: 0.9, x: '-50%' }}
          transition={{
            type: 'spring',
            stiffness: 300,
            damping: 30
          }}
        >
          <div className="toast__content">
            {type === 'success' && (
              <span className="toast__icon material-icons-round">check_circle</span>
            )}
            {type === 'error' && (
              <span className="toast__icon material-icons-round">error</span>
            )}
            {type === 'info' && (
              <span className="toast__icon material-icons-round">info</span>
            )}
            <span className="toast__message">{message}</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

