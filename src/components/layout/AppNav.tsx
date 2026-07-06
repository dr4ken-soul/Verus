import { useEffect, useRef, useState } from 'react'
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
  const { wallet, disconnect } = useStellarWallet()
  const [showDropdown, setShowDropdown] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false)
      }
    }
    if (showDropdown) {
      document.addEventListener('mousedown', handleOutsideClick)
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [showDropdown])

  return (
    <nav className="liquid-glass-dark fixed top-0 inset-x-0 z-50 px-8 py-4">
      <div className="flex items-center justify-between max-w-6xl mx-auto">
        <div className="flex items-center gap-4">
          <Link to="/app" className="flex items-center gap-2">
            {/* overflow-hidden crops the bottom ~30% where VERUS text sits */}
            <div style={{ width: 36, height: 36, overflow: 'hidden', flexShrink: 0 }}>
              <img
                src="/logo.png"
                alt="Verus logo"
                style={{ width: 36, height: 50, objectFit: 'cover', objectPosition: 'top' }}
              />
            </div>
            <span className="font-display text-lg text-[var(--text-primary)]">Verus</span>
          </Link>

          {wallet.address && (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setShowDropdown((prev) => !prev)}
                className="font-mono text-xs text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors px-2 py-1 rounded"
              >
                {shortenAddress(wallet.address)}
              </button>

              {showDropdown && (
                <div className="absolute top-full left-0 mt-2 w-72 liquid-glass-dark rounded-[var(--radius-md)] p-5 shadow-2xl border border-white/5 z-50">
                  <p className="font-mono text-[10px] text-[var(--text-muted)] uppercase tracking-widest mb-2">
                    Connected wallet
                  </p>
                  <p className="font-mono text-sm text-[var(--text-primary)] break-all mb-4">
                    {wallet.address}
                  </p>
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-mono text-[10px] text-[var(--text-muted)] uppercase tracking-widest">Network</span>
                    <span className="font-mono text-xs text-[var(--accent)]">Testnet</span>
                  </div>
                  <div className="flex justify-between items-center mb-5">
                    <span className="font-mono text-[10px] text-[var(--text-muted)] uppercase tracking-widest">Status</span>
                    <span className="font-mono text-xs text-[var(--success)]">Active</span>
                  </div>
                  <button
                    onClick={() => { disconnect(); setShowDropdown(false) }}
                    className="w-full liquid-glass rounded-full px-4 py-2 text-sm font-body
                      text-[var(--text-secondary)] hover:text-[var(--error)] transition-colors text-center"
                  >
                    Disconnect
                  </button>
                </div>
              )}
            </div>
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

