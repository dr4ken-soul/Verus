import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { GhostNav } from '../layout/GhostNav'
import { GeometricGrid } from './GeometricGrid'
import { useStellarWallet } from '../../hooks/useStellarWallet'
import { useAppStore } from '../../store/useAppStore'
import { shortenAddress } from '../../lib/utils'

/**
 * Landing hero section.
 * Full-bleed 16:9 hero image with a bottom-left anchored copy stack,
 * a coded geometric grid overlay, and the ghost nav floating above
 * everything. This is the confirmed hero gate: full-bleed editorial,
 * not the split layout used on prior projects.
 */
export function Hero() {
  const navigate = useNavigate()
  const { wallet, connect } = useStellarWallet()
  const [connecting, setConnecting] = useState(false)
  const [confirmed, setConfirmed] = useState(false)

  async function handleCta() {
    if (wallet.isConnected) {
      navigate('/app/verify')
      return
    }
    setConnecting(true)
    try {
      await connect()
      // Read store synchronously — only navigate if a wallet was actually selected.
      // connect() resolves when the modal closes, not when a wallet is picked.
      const { wallet: current } = useAppStore.getState()
      if (!current.isConnected) {
        // Modal was closed without selecting — do nothing.
        return
      }
      setConfirmed(true)
      // Brief confirmation flash (1.2 s) so user sees their address, then enter app.
      setTimeout(() => navigate('/app/verify'), 1200)
    } catch {
      // connect() already surfaces errors via the wallet kit modal
    } finally {
      setConnecting(false)
    }
  }
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
          <button
            onClick={handleCta}
            disabled={connecting}
            className="inline-block liquid-glass-strong rounded-full px-6 py-3 mt-6 font-body
              text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors
              disabled:opacity-60 disabled:cursor-wait"
          >
            {confirmed ? 'Wallet connected — entering app...' : connecting ? 'Connecting wallet...' : 'Generate a proof'}
          </button>
        </motion.div>
      </div>
      {/* Wallet connected confirmation overlay */}
      <AnimatePresence>
        {confirmed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center"
            style={{ background: 'rgba(5,5,8,0.7)', backdropFilter: 'blur(8px)' }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="liquid-glass-dark rounded-[var(--radius-lg)] p-10 max-w-sm w-full text-center"
              style={{ border: '1px solid rgba(255,255,255,0.08)' }}
            >
              {/* Check circle */}
              <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-5"
                style={{ background: 'rgba(var(--success-rgb, 74 222 128) / 0.15)' }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--success, #4ade80)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <p className="font-display text-xl text-[var(--text-primary)] mb-2">Wallet connected</p>
              <p className="font-mono text-sm text-[var(--accent)] mb-4">
                {shortenAddress(useAppStore.getState().wallet.address ?? '')}
              </p>
              <p className="font-body text-sm text-[var(--text-secondary)]">Entering app...</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}
