import { motion } from 'framer-motion'
import type { ReactNode } from 'react'

interface FadeInProps {
  children: ReactNode
  delay?: number
  className?: string
}

/**
 * Reusable blur-in entrance wrapper used across landing sections.
 * Triggers once when the element enters the viewport rather than on mount,
 * so sections animate in as the visitor scrolls rather than all at once.
 * @param children - content to animate in
 * @param delay - optional delay in seconds before the animation starts
 * @param className - optional additional classes applied to the wrapper
 */
export function FadeIn({ children, delay = 0, className }: FadeInProps) {
  return (
    <motion.div
      initial={{ opacity: 0, filter: 'blur(8px)', y: 20 }}
      whileInView={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ delay, duration: 0.6, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.div>
  )
}
