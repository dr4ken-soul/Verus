import { useEffect, useState } from 'react'
import { AppNav } from '../components/layout/AppNav'
import { GrainOverlay } from '../components/ui/GrainOverlay'
import { FadeIn } from '../components/ui/FadeIn'
import { useAppStore } from '../store/useAppStore'
import { relativeTime } from '../lib/utils'
import { fetchAllIssuerVerifications } from '../lib/stellar'
import { logger } from '../lib/utils'

/**
 * Issuers page.
 * A searchable, public table of every verified issuer on Verus, showing
 * threshold claimed, status and last verified date. No wallet connection
 * is required to view this page since the data is entirely public.
 */
export function Issuers() {
  const issuers = useAppStore((state) => state.issuers)
  const setIssuers = useAppStore((state) => state.setIssuers)
  const [isLoading, setIsLoading] = useState(true)
  const [query, setQuery] = useState('')

  useEffect(() => {
    async function loadIssuers() {
      try {
        const records = await fetchAllIssuerVerifications()
        setIssuers(records)
      } catch (error) {
        logger.error('Could not load issuer verifications', { error })
      } finally {
        setIsLoading(false)
      }
    }
    loadIssuers()
  }, [setIssuers])

  const filtered = issuers.filter(
    (issuer) =>
      issuer.issuerName.toLowerCase().includes(query.toLowerCase()) ||
      issuer.asset.toLowerCase().includes(query.toLowerCase())
  )

  return (
    <GrainOverlay>
      <AppNav />
      <div className="pt-32 px-8 pb-24 max-w-6xl mx-auto">
        <FadeIn>
          <div className="flex items-center justify-between mb-8">
            <h1 className="font-display text-2xl text-[var(--text-primary)]">Verified issuers</h1>
            <input
              type="text"
              placeholder="Search by issuer or asset"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="liquid-glass rounded-[var(--radius-md)] px-4 py-2 font-body text-sm
                text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none"
            />
          </div>
        </FadeIn>

        {isLoading && (
          <div className="space-y-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="skeleton-shimmer h-14 rounded-[var(--radius-md)]" />
            ))}
          </div>
        )}

        {!isLoading && filtered.length === 0 && (
          <p className="font-body text-[var(--text-secondary)]">
            No issuers match that search yet.
          </p>
        )}

        {!isLoading && filtered.length > 0 && (
          <div className="divide-y divide-[var(--border-subtle)] border-t border-[var(--border-subtle)]">
            {filtered.map((issuer, index) => (
              <FadeIn key={issuer.issuerAddress} delay={index * 0.03}>
                {issuer.proofTxHash ? (
                  <a
                    href={`https://stellar.expert/explorer/testnet/tx/${issuer.proofTxHash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between py-4 hover:bg-[var(--bg-surface)] transition-colors px-2 -mx-2 rounded-[var(--radius-sm)]"
                  >
                    <div>
                      <p className="font-body text-[var(--text-primary)]">{issuer.issuerName}</p>
                      <p className="font-mono text-xs text-[var(--text-muted)] mt-1">
                        At least {issuer.threshold} {issuer.asset}
                      </p>
                    </div>
                    <div className="text-right">
                      <span
                        className={`font-mono text-xs ${
                          issuer.isStale ? 'text-[var(--error)]' : 'text-[var(--success)]'
                        }`}
                      >
                        {issuer.isStale ? 'Stale' : 'Verified'}
                      </span>
                      <p className="font-mono text-xs text-[var(--text-secondary)] mt-1">
                        {relativeTime(issuer.verifiedAt)}
                      </p>
                    </div>
                  </a>
                ) : (
                  <div className="flex items-center justify-between py-4 px-2 -mx-2">
                    <div>
                      <p className="font-body text-[var(--text-primary)]">{issuer.issuerName}</p>
                      <p className="font-mono text-xs text-[var(--text-muted)] mt-1">
                        At least {issuer.threshold} {issuer.asset}
                      </p>
                    </div>
                    <div className="text-right">
                      <span
                        className={`font-mono text-xs ${
                          issuer.isStale ? 'text-[var(--error)]' : 'text-[var(--success)]'
                        }`}
                      >
                        {issuer.isStale ? 'Stale' : 'Verified'}
                      </span>
                      <p className="font-mono text-xs text-[var(--text-secondary)] mt-1">
                        {relativeTime(issuer.verifiedAt)}
                      </p>
                    </div>
                  </div>
                )}
              </FadeIn>
            ))}
          </div>
        )}
      </div>
    </GrainOverlay>
  )
}
