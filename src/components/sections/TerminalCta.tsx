import { Link } from 'react-router-dom'
import { FadeIn } from '../ui/FadeIn'

/**
 * Terminal CTA section.
 * A terminal-style mock showing a simulated proof generation sequence,
 * rather than the standard centred headline and button pattern used
 * on previous projects.
 */
export function TerminalCta() {
  return (
    <section className="py-32 px-8 max-w-2xl mx-auto text-center">
      <FadeIn>
        <div className="liquid-glass-dark rounded-[var(--radius-lg)] p-6 text-left font-mono text-sm">
          <p className="text-[var(--text-muted)]">$ verus generate-proof --threshold 500000 --asset USDC</p>
          <p className="text-[var(--text-secondary)] mt-2">Building circuit witness...</p>
          <p className="text-[var(--text-secondary)]">Generating Groth16 proof...</p>
          <p className="text-[var(--success)] mt-2">Proof valid. Ready to submit on-chain.</p>
        </div>
      </FadeIn>
      <FadeIn delay={0.2}>
        <Link
          to="/app/verify"
          className="inline-block liquid-glass-strong rounded-full px-8 py-3.5 mt-8 font-body
            text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors"
        >
          Generate proof
        </Link>
      </FadeIn>
    </section>
  )
}
