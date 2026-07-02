import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { GhostNav } from '../layout/GhostNav'
import { GeometricGrid } from './GeometricGrid'

/**
 * Landing hero section.
 * Full-bleed 16:9 hero image with a bottom-left anchored copy stack,
 * a coded geometric grid overlay, and the ghost nav floating above
 * everything. This is the confirmed hero gate: full-bleed editorial,
 * not the split layout used on prior projects.
 */
export function Hero() {
  return (
    <section className="relative min-h-[100dvh] overflow-hidden">
      {/* Hero image: public/images/hero-sphere.webp.jpeg
          Black Murano Glass Sphere, right-of-centre. The image has a dark
          background that matches the page, so we blend the left edge and
          corners with gradients to remove the rectangle boundary. */}
      <div
        className="absolute inset-0 bg-[var(--bg-surface)]"
        style={{
          backgroundImage: "url('/images/hero-sphere.webp.jpeg')",
          backgroundSize: 'cover',
          backgroundPosition: '65% center',
          backgroundRepeat: 'no-repeat',
        }}
      />
      {/* Left blend: fades the dark page bg into the image so text has a clean bg */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(to right, var(--bg-surface) 0%, var(--bg-surface) 20%, rgba(5,5,8,0.7) 50%, transparent 75%)',
        }}
      />
      {/* Top and bottom fade to merge with page sections above/below */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(to bottom, var(--bg-surface) 0%, transparent 15%, transparent 80%, var(--bg-surface) 100%)',
        }}
      />
      <div className="absolute inset-0 hero-gradient" />
      <GeometricGrid />
      <GhostNav />

      <div className="absolute inset-x-8 max-w-xl" style={{ top: '50%', transform: 'translateY(-45%)' }}>
        <motion.span
          initial={{ opacity: 0, filter: 'blur(8px)', y: 20 }}
          animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="font-mono text-xs text-[var(--accent-dim)] tracking-widest uppercase block"
        >
          Real-world ZK on Stellar
        </motion.span>
        <motion.h1
          initial={{ opacity: 0, filter: 'blur(8px)', y: 20 }}
          animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="font-display text-4xl md:text-5xl text-[var(--text-primary)] leading-tight mt-3"
        >
          Prove your reserves.
          <br />
          Reveal nothing.
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, filter: 'blur(8px)', y: 20 }}
          animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
          transition={{ delay: 0.7, duration: 0.6 }}
          className="font-body text-[var(--text-secondary)] mt-4"
        >
          Verus lets any Stellar issuer prove their reserves exceed a threshold
          without ever revealing what they actually hold.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, filter: 'blur(8px)', y: 20 }}
          animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
          transition={{ delay: 1.0, duration: 0.6 }}
        >
          <Link
            to="/app/verify"
            className="inline-block liquid-glass-strong rounded-full px-6 py-3 mt-6 font-body
              text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors"
          >
            Generate a proof
          </Link>
        </motion.div>
      </div>
    </section>
  )
}
