import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AppNav } from '../components/layout/AppNav'
import { GrainOverlay } from '../components/ui/GrainOverlay'
import { FadeIn } from '../components/ui/FadeIn'
import { useAppStore } from '../store/useAppStore'
import { relativeTime } from '../lib/utils'
import { fetchAllIssuerVerifications } from '../lib/stellar'
import { logger } from '../lib/utils'

/**
 * Dashboard page.
 * Three stat cards summarising verification activity, a recent activity
 * list and a quick-start action into the Verify flow.
 */
export function Dashboard() {
  const issuers = useAppStore((state) => state.issuers)
  const setIssuers = useAppStore((state) => state.setIssuers)
  const [isLoading, setIsLoading] = useState(true)

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

  const recent = issuers.slice(0, 5)
  const averageAgeLabel = issuers.length > 0 ? relativeTime(issuers[0].verifiedAt) : 'No proofs yet'

  return (
    <GrainOverlay>
      <AppNav />
      <div className="pt-32 px-8 pb-24 max-w-6xl mx-auto">
        <FadeIn>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="liquid-glass-strong rounded-[var(--radius-lg)] p-6">
              <span className="font-mono text-xs text-[var(--text-muted)] uppercase tracking-widest">
                Issuers verified
              </span>
              <p className="font-display text-3xl text-[var(--text-primary)] mt-2">
                {isLoading ? '—' : issuers.length}
              </p>
            </div>
            <div className="liquid-glass-strong rounded-[var(--radius-lg)] p-6">
              <span className="font-mono text-xs text-[var(--text-muted)] uppercase tracking-widest">
                Proofs generated
              </span>
              <p className="font-display text-3xl text-[var(--text-primary)] mt-2">
                {isLoading ? '—' : issuers.length}
              </p>
            </div>
            <div className="liquid-glass-strong rounded-[var(--radius-lg)] p-6">
              <span className="font-mono text-xs text-[var(--text-muted)] uppercase tracking-widest">
                Last proof
              </span>
              <p className="font-display text-3xl text-[var(--text-primary)] mt-2">
                {isLoading ? '—' : averageAgeLabel}
              </p>
            </div>
          </div>
        </FadeIn>

        <FadeIn delay={0.15}>
          <div className="mt-12">
            <h2 className="font-display text-xl text-[var(--text-primary)] mb-4">Recent activity</h2>
            {isLoading && (
              <div className="space-y-2">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="skeleton-shimmer h-14 rounded-[var(--radius-md)]" />
                ))}
              </div>
            )}
            {!isLoading && recent.length === 0 && (
              <p className="font-body text-[var(--text-secondary)]">
                No issuers verified yet. Be the first to generate a proof.
              </p>
            )}
            {!isLoading && recent.length > 0 && (
              <div className="divide-y divide-[var(--border-subtle)] border-t border-[var(--border-subtle)]">
                {recent.map((issuer) => (
                  <div key={issuer.issuerAddress} className="flex items-center justify-between py-4">
                    <div>
                      <p className="font-body text-[var(--text-primary)]">{issuer.issuerName}</p>
                      <p className="font-mono text-xs text-[var(--text-muted)] mt-1">
                        At least {issuer.threshold} {issuer.asset}
                      </p>
                    </div>
                    <span className="font-mono text-xs text-[var(--text-secondary)]">
                      {relativeTime(issuer.verifiedAt)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </FadeIn>

        <FadeIn delay={0.3}>
          <Link
            to="/app/verify"
            className="inline-block liquid-glass-strong rounded-full px-6 py-3 mt-12 font-body
              text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors"
          >
            Generate proof
          </Link>
        </FadeIn>
      </div>
    </GrainOverlay>
  )
}
