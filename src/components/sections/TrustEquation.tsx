import { FadeIn } from '../ui/FadeIn'

/**
 * Trust equation section.
 * Two dark panels side by side contrasting what is publicly visible
 * against what stays hidden. The contrast itself carries the message,
 * so no connecting copy is needed between the panels.
 */
export function TrustEquation() {
  return (
    <section className="py-24 px-8 max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
      <FadeIn>
        <div className="liquid-glass-dark rounded-[var(--radius-lg)] p-8 h-full">
          <h3 className="font-mono text-xs text-[var(--accent)] uppercase tracking-widest">
            Anyone can see
          </h3>
          <ul className="mt-4 space-y-2 font-body text-[var(--text-secondary)]">
            <li>The threshold claimed</li>
            <li>The verification status</li>
            <li>The proof timestamp</li>
          </ul>
        </div>
      </FadeIn>
      <FadeIn delay={0.15}>
        <div className="liquid-glass-dark rounded-[var(--radius-lg)] p-8 h-full">
          <h3 className="font-mono text-xs text-[var(--text-muted)] uppercase tracking-widest">
            No one sees
          </h3>
          <ul className="mt-4 space-y-2 font-body text-[var(--text-secondary)]">
            <li>The actual reserve balance</li>
            <li>Wallet holdings beyond the proof</li>
            <li>Any transaction history not on the verifier itself</li>
          </ul>
        </div>
      </FadeIn>
    </section>
  )
}
