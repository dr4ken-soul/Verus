import { Link, useLocation } from 'react-router-dom'
import { useStellarWallet } from '../../hooks/useStellarWallet'
import { shortenAddress } from '../../lib/utils'

const TABS = [
  { label: 'Dashboard', path: '/app' },
  { label: 'Issuers', path: '/app/issuers' },
  { label: 'Verify', path: '/app/verify' },
  { label: 'About', path: '/app/about' },
]

/**
 * App interior navigation bar.
 * Minimal top bar with the wordmark and wallet status left, four tab
 * links right, no sidebar, per the confirmed nav gate.
 */
export function AppNav() {
  const location = useLocation()
  const { wallet } = useStellarWallet()

  return (
    <nav className="liquid-glass-dark fixed top-0 inset-x-0 z-50 px-8 py-4">
      <div className="flex items-center justify-between max-w-6xl mx-auto">
        <div className="flex items-center gap-4">
          <Link to="/app" className="flex items-center gap-2">
            <img
              src="/logo.png"
              alt="Verus"
              className="h-8 w-8 object-contain"
            />
            <span className="font-display text-lg text-[var(--text-primary)]">Verus</span>
          </Link>
          {wallet.address && (
            <span className="font-mono text-xs text-[var(--text-muted)]">
              {shortenAddress(wallet.address)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-6">
          {TABS.map((tab) => {
            const isActive = location.pathname === tab.path
            return (
              <Link
                key={tab.path}
                to={tab.path}
                className={`font-body text-sm transition-colors pb-1 ${
                  isActive
                    ? 'text-[var(--accent)] border-b border-[var(--accent)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {tab.label}
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
