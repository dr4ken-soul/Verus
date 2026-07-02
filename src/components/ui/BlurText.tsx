import { motion } from 'framer-motion'

interface BlurTextProps {
  text: string
  delay?: number
  className?: string
  as?: 'h1' | 'h2' | 'p' | 'span'
}

/**
 * Single-line blur-in text element for hero and section headlines.
 * Kept separate from FadeIn since headline copy often needs specific
 * tag semantics (h1 vs p) that a generic wrapper should not assume.
 * @param text - the text content to render and animate
 * @param delay - optional delay in seconds before the animation starts
 * @param className - optional additional classes
 * @param as - the HTML tag to render, defaults to span
 */
export function BlurText({ text, delay = 0, className, as = 'span' }: BlurTextProps) {
  const Tag = motion[as]
  return (
    <Tag
      initial={{ opacity: 0, filter: 'blur(8px)', y: 20 }}
      animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
      transition={{ delay, duration: 0.6, ease: 'easeOut' }}
      className={className}
    >
      {text}
    </Tag>
  )
}
