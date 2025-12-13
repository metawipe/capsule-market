import { motion } from 'framer-motion'
import cn from 'classnames'
import './button.css'
import type { PropsWithChildren } from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'ghost'
type ButtonSize = 'sm' | 'md' | 'lg'

export interface ButtonProps extends PropsWithChildren {
  variant?: ButtonVariant
  size?: ButtonSize
  disabled?: boolean
  fullWidth?: boolean
  onClick?: () => void
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  disabled,
  fullWidth,
  onClick,
}: ButtonProps) {
  return (
    <motion.button
      whileTap={{ scale: disabled ? 1 : 0.97 }}
      whileHover={{ y: disabled ? 0 : -1 }}
      transition={{ type: 'spring', stiffness: 350, damping: 26 }}
      className={cn('btn', `btn--${variant}`, `btn--${size}`, {
        'btn--block': fullWidth,
        'btn--disabled': disabled,
      })}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
    >
      {children}
    </motion.button>
  )
}


