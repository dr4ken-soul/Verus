import { FadeIn } from '../ui/FadeIn'

/**
 * Issuer wall section.
 * A live-looking grid of verified issuers showing threshold claimed,
 * verification status and proof age. Uses realistic placeholder data
 * during development, never generic names or round numbers, so the
 * section reads as a real product rather than a template.
 */
export function IssuerWall() {
  const issuers = [
    { name: 'Meridian Capital Reserve', asset: 'USDC', threshold: '500,000', age: '2 hours ago' },
    { name: 'Tideline Settlement Fund', asset: 'XLM', threshold: '2,100,000', age: '11 hours ago' },
    { name: 'Northgate Treasury', asset: 'USDC', threshold: '1,250,000', age: '1 day ago' },
  ]

  return (
    <section className="py-24 px-8 max-w-6xl mx-auto">
      <FadeIn>
        <h2 className="font-display text-2xl text-[var(--text-primary)] mb-8">Verified on Stellar</h2>
      </FadeIn>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {issuers.map((issuer, index) => (
          <FadeIn key={issuer.name} delay={index * 0.1}>
            <div className="liquid-glass rounded-[var(--radius-lg)] p-6 h-full">
              <span className="font-mono text-xs text-[var(--success)]">Verified</span>
              <h3 className="font-display text-lg text-[var(--text-primary)] mt-2">{issuer.name}</h3>
              <p className="font-body text-sm text-[var(--text-secondary)] mt-1">
                At least {issuer.threshold} {issuer.asset}
              </p>
              <p className="font-mono text-xs text-[var(--text-muted)] mt-4">{issuer.age}</p>
            </div>
          </FadeIn>
        ))}
      </div>
    </section>
  )
}
