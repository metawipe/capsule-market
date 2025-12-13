import { createPortal } from 'react-dom'
import { AnimatePresence, motion, type PanInfo } from 'framer-motion'
import cn from 'classnames'
import { hapticLight } from '../twa'
import type { ReactNode, MouseEvent } from 'react'
import { useState, useEffect } from 'react'
import './modal.css'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  className?: string
  bodyClassName?: string
  hideHandle?: boolean
  closeOnBackdrop?: boolean
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  className,
  bodyClassName,
  hideHandle = false,
  closeOnBackdrop = true,
}: ModalProps) {
  const [isDragging, setIsDragging] = useState(false)

  const handleBackdropClick = (e: MouseEvent<HTMLDivElement>) => {
    if (!closeOnBackdrop) return
    if (e.target === e.currentTarget) {
      hapticLight()
      onClose()
    }
  }

  const handleDragEnd = (_event: unknown, info: PanInfo) => {
    setIsDragging(false)

    if (info.offset.y > 100 || info.velocity.y > 500) {
      hapticLight()
      onClose()
    }
  }

  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  if (!mounted) return null

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="modal__backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleBackdropClick}
        >
          <motion.div
            className={cn('modal__content', className)}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{
              type: 'spring',
              damping: 30,
              stiffness: 300,
            }}
            onClick={(e) => e.stopPropagation()}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.5 }}
            onDragStart={() => {
              setIsDragging(true)
              hapticLight()
            }}
            onDragEnd={handleDragEnd}
            style={{
              cursor: isDragging ? 'grabbing' : 'grab',
            }}
          >
            {!hideHandle && (
              <motion.div
                className="modal__handle"
                animate={{
                  opacity: isDragging ? 0.6 : 0.3,
                  scale: isDragging ? 0.95 : 1,
                }}
                transition={{ duration: 0.2 }}
              />
            )}

            {title && (
              <div className="modal__header">
                <h2 className="modal__title">{title}</h2>
              </div>
            )}

            <div className={cn('modal__body', bodyClassName)}>{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  )
}

