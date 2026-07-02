import { FadeIn } from '../ui/FadeIn'

const ITEMS = [
  {
    label: 'Circom circuit',
    body: 'A range proof checks the balance against the threshold without exposing either value in the circuit output.',
  },
  {
    label: 'Groth16 proof',
    body: 'Generated client-side in the browser, cheap to verify and proven on existing Stellar verifier contracts.',
  },
  {
    label: 'Stellar verifier',
    body: 'A Soroban contract checks the proof on-chain and records the result publicly.',
  },
]

/**
 * Protocol strip section.
 * Three compact columns naming the circuit, proof system and verifier
 * contract, one sentence of explanation each, giving technical
 * credibility without over-explaining the mechanism.
 */
export function ProtocolStrip() {
  return (
    <section className="py-24 px-8 max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 border-t border-[var(--border-subtle)]">
      {ITEMS.map((item, index) => (
        <FadeIn key={item.label} delay={index * 0.1}>
          <span className="font-mono text-xs text-[var(--accent-dim)] uppercase tracking-widest">
            {item.label}
          </span>
          <p className="font-body text-sm text-[var(--text-secondary)] mt-3">{item.body}</p>
        </FadeIn>
      ))}
    </section>
  )
}
