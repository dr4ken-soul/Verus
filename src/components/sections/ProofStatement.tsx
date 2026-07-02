import { FadeIn } from '../ui/FadeIn'

/**
 * The proof statement section.
 * A single full-width sentence stating exactly what Verus proves, with a
 * small annotation marking what stays public against what stays private.
 * No bullets, no numbered steps, as specified in the section gate.
 */
export function ProofStatement() {
  return (
    <section className="py-32 px-8 max-w-5xl mx-auto">
      <FadeIn>
        <p className="font-display text-3xl md:text-4xl text-[var(--text-primary)] leading-snug">
          Verus proves your reserves clear a threshold without ever showing the
          number behind it.
        </p>
      </FadeIn>
      <FadeIn delay={0.15}>
        <div className="flex flex-col sm:flex-row gap-6 sm:gap-12 mt-12">
          <div className="flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-[var(--success)]" />
            <span className="font-mono text-sm text-[var(--text-secondary)]">
              Public: threshold, status, timestamp
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-[var(--text-muted)]" />
            <span className="font-mono text-sm text-[var(--text-secondary)]">
              Private: the actual balance
            </span>
          </div>
        </div>
      </FadeIn>
    </section>
  )
}
