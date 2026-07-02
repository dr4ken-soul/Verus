import { Link } from 'react-router-dom'
import { useStellarWallet } from '../../hooks/useStellarWallet'
import { shortenAddress } from '../../lib/utils'

/**
 * Ghost navigation bar for the landing page.
 * Floats transparently over the hero with no background, blur or border,
 * per the confirmed nav gate. Carries only the wordmark and a single
 * Connect wallet action, nothing else.
 */
export function GhostNav() {
  const { wallet, connect } = useStellarWallet()

  return (
    <nav className="fixed top-0 inset-x-0 z-50 px-8 py-6">
      <div className="flex items-center justify-between max-w-6xl mx-auto">
        {/* Logo slot: replace with public/logo.svg once provided */}
        <Link to="/" className="font-display text-xl text-[var(--text-primary)] tracking-tight">
          Verus
        </Link>
        {wallet.isConnected ? (
          <Link
            to="/app"
            className="liquid-glass rounded-full px-5 py-2.5 text-sm font-body
              text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors"
          >
            {shortenAddress(wallet.address ?? '')}
          </Link>
        ) : (
          <button
            onClick={connect}
            className="liquid-glass rounded-full px-5 py-2.5 text-sm font-body
              text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors"
          >
            Connect wallet
          </button>
        )}
      </div>
    </nav>
  )
}
