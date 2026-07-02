import { AppNav } from '../components/layout/AppNav'
import { GrainOverlay } from '../components/ui/GrainOverlay'
import { FadeIn } from '../components/ui/FadeIn'

/**
 * About page.
 * Plain-language explanation of what Verus is and how the circuit works,
 * written as prose rather than bullet points, with links to the public
 * repo and the deployed Soroban verifier address.
 */
export function About() {
  const verifierAddress = import.meta.env.VITE_SOROBAN_VERIFIER_ADDRESS || 'Not yet deployed'

  return (
    <GrainOverlay>
      <AppNav />
      <div className="pt-32 px-8 pb-24 max-w-2xl mx-auto">
        <FadeIn>
          <h1 className="font-display text-2xl text-[var(--text-primary)] mb-6">About Verus</h1>
          <p className="font-body text-[var(--text-secondary)] leading-relaxed">
            Verus lets any Stellar issuer prove their reserves exceed a declared
            threshold without revealing what they actually hold. An issuer connects
            their wallet, states a public claim such as at least 500,000 USDC, and a
            Circom circuit running entirely in their browser builds a Groth16 proof
            that their balance meets that claim. The balance itself never leaves the
            device in any form.
          </p>
          <p className="font-body text-[var(--text-secondary)] leading-relaxed mt-4">
            The proof is checked by a Soroban smart contract on Stellar, which
            records the verification result and a timestamp. Anyone can browse the
            issuer wall and independently confirm a verification by looking at the
            on-chain transaction directly, without needing to trust Verus as an
            intermediary at any point in the process.
          </p>
          <p className="font-body text-[var(--text-secondary)] leading-relaxed mt-4">
            The circuit uses a standard range proof comparator built from bit
            decomposition. It takes the actual balance as a private input and the
            threshold as a public input, and outputs a single bit confirming whether
            the balance meets or exceeds the claim. Nothing about the underlying
            balance, including its rough magnitude beyond the claimed threshold, is
            ever exposed by the proof.
          </p>
        </FadeIn>

        <FadeIn delay={0.15}>
          <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-8 border-t border-[var(--border-subtle)] pt-8">
            <div>
              <span className="font-mono text-xs text-[var(--accent-dim)] uppercase tracking-widest">
                Circom circuit
              </span>
              <p className="font-body text-sm text-[var(--text-secondary)] mt-3">
                A range proof checks the balance against the threshold without
                exposing either value in the circuit output.
              </p>
            </div>
            <div>
              <span className="font-mono text-xs text-[var(--accent-dim)] uppercase tracking-widest">
                Groth16 proof
              </span>
              <p className="font-body text-sm text-[var(--text-secondary)] mt-3">
                Generated client-side in the browser, cheap to verify and proven on
                existing Stellar verifier contracts.
              </p>
            </div>
            <div>
              <span className="font-mono text-xs text-[var(--accent-dim)] uppercase tracking-widest">
                Stellar verifier
              </span>
              <p className="font-body text-sm text-[var(--text-secondary)] mt-3">
                A Soroban contract checks the proof on-chain and records the result
                publicly.
              </p>
            </div>
          </div>
        </FadeIn>

        <FadeIn delay={0.3}>
          <div className="mt-12 space-y-2">
            <p className="font-mono text-xs text-[var(--text-muted)]">
              Soroban verifier address: <span className="text-[var(--text-secondary)]">{verifierAddress}</span>
            </p>
            <a
              href="https://github.com/dr4ken-soul/Verus"
              target="_blank"
              rel="noreferrer"
              className="font-mono text-xs text-[var(--accent)] hover:text-[var(--accent-hover)] inline-block"
            >
              View source on GitHub
            </a>
          </div>
        </FadeIn>
      </div>
    </GrainOverlay>
  )
}
