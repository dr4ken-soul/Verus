import { useState } from 'react'
import { AppNav } from '../components/layout/AppNav'
import { GrainOverlay } from '../components/ui/GrainOverlay'
import { FadeIn } from '../components/ui/FadeIn'
import { useStellarWallet } from '../hooks/useStellarWallet'
import { useReserveProof } from '../hooks/useReserveProof'
import { useSorobanVerifier } from '../hooks/useSorobanVerifier'
import { useAppStore } from '../store/useAppStore'

/**
 * Verify page, the core product flow.
 * Issuer connects a wallet, declares a threshold and asset, enters their
 * balance for proof generation, generates a Groth16 proof entirely in the
 * browser, then submits it to the Soroban verifier contract. The balance
 * field is local component state only and is cleared once the proof exists,
 * it is never sent anywhere outside the circuit computation.
 */
export function Verify() {
  const { wallet, connect } = useStellarWallet()
  const { proof, publicSignals, error: proofError, generate, reset } = useReserveProof()
  const { submit, txHash, error: submitError } = useSorobanVerifier()
  const proofStatus = useAppStore((state) => state.proofStatus)

  const [threshold, setThreshold] = useState('')
  const [asset, setAsset] = useState('USDC')
  const [balance, setBalance] = useState('')
  const [issuerName, setIssuerName] = useState('')

  const isGenerating = proofStatus === 'generating'
  const isSubmitting = proofStatus === 'submitting'
  const hasValidProof = proofStatus === 'valid' && proof && publicSignals

  async function handleGenerate() {
    if (!threshold || !balance) return
    await generate(BigInt(balance), BigInt(threshold))
    setBalance('') // cleared immediately once the proof computation has run
  }

  async function handleSubmit() {
    if (!proof || !publicSignals) return
    await submit(proof, publicSignals, threshold, asset, issuerName || 'Unnamed issuer')
  }

  return (
    <GrainOverlay>
      <AppNav />
      <div className="pt-32 px-8 pb-24 max-w-2xl mx-auto">
        <FadeIn>
          <h1 className="font-display text-2xl text-[var(--text-primary)] mb-2">Generate a proof</h1>
          <p className="font-body text-[var(--text-secondary)] mb-10">
            Your balance is used only to build the proof in your browser. It is never
            sent anywhere and never stored.
          </p>
        </FadeIn>

        {!wallet.isConnected && (
          <FadeIn delay={0.1}>
            <button
              onClick={connect}
              className="liquid-glass-strong rounded-full px-6 py-3 font-body
                text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors"
            >
              Connect wallet
            </button>
          </FadeIn>
        )}

        {wallet.isConnected && (
          <FadeIn delay={0.1}>
            <div className="space-y-6">
              <div>
                <label className="font-mono text-xs text-[var(--text-muted)] uppercase tracking-widest">
                  Issuer name
                </label>
                <input
                  type="text"
                  placeholder="Shown on the public issuer wall"
                  value={issuerName}
                  onChange={(event) => setIssuerName(event.target.value)}
                  className="w-full mt-2 liquid-glass rounded-[var(--radius-md)] px-4 py-3
                    font-body text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none"
                />
              </div>

              <div>
                <label className="font-mono text-xs text-[var(--text-muted)] uppercase tracking-widest">
                  Asset
                </label>
                <input
                  type="text"
                  value={asset}
                  onChange={(event) => setAsset(event.target.value)}
                  className="w-full mt-2 liquid-glass rounded-[var(--radius-md)] px-4 py-3
                    font-body text-[var(--text-primary)] outline-none"
                />
              </div>

              <div>
                <label className="font-mono text-xs text-[var(--text-muted)] uppercase tracking-widest">
                  Threshold you are claiming
                </label>
                <input
                  type="number"
                  placeholder="500000"
                  value={threshold}
                  onChange={(event) => setThreshold(event.target.value)}
                  className="w-full mt-2 liquid-glass rounded-[var(--radius-md)] px-4 py-3
                    font-body text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none"
                />
              </div>

              <div>
                <label className="font-mono text-xs text-[var(--text-muted)] uppercase tracking-widest">
                  Your actual balance (private, never transmitted)
                </label>
                <input
                  type="number"
                  placeholder="Used only to build the proof"
                  value={balance}
                  onChange={(event) => setBalance(event.target.value)}
                  className="w-full mt-2 liquid-glass rounded-[var(--radius-md)] px-4 py-3
                    font-body text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none"
                />
              </div>

              {!hasValidProof && (
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating || !threshold || !balance}
                  className="liquid-glass-strong rounded-full px-6 py-3 font-body
                    text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors
                    disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isGenerating ? 'Generating proof...' : 'Generate proof'}
                </button>
              )}

              {isGenerating && (
                <div className="skeleton-shimmer h-24 rounded-[var(--radius-md)]" />
              )}

              {proofError && (
                <p className="font-body text-sm text-[var(--error)]">{proofError}</p>
              )}

              {hasValidProof && (
                <div className="liquid-glass-dark rounded-[var(--radius-lg)] p-6 font-mono text-sm">
                  <p className="text-[var(--success)]">Proof valid. Ready to submit on-chain.</p>
                  <button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="liquid-glass-strong rounded-full px-6 py-3 mt-4 font-body
                      text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors
                      disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? 'Submitting...' : 'Submit on-chain'}
                  </button>
                  <button
                    onClick={reset}
                    className="ml-3 font-body text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  >
                    Start over
                  </button>
                </div>
              )}

              {submitError && (
                <p className="font-body text-sm text-[var(--error)]">{submitError}</p>
              )}

              {txHash && (
                <div className="liquid-glass-dark rounded-[var(--radius-lg)] p-6">
                  <p className="font-body text-[var(--success)]">Verified on Stellar.</p>
                  <a
                    href={`https://stellar.expert/explorer/testnet/tx/${txHash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="font-mono text-xs text-[var(--accent)] hover:text-[var(--accent-hover)] mt-2 inline-block"
                  >
                    View transaction
                  </a>
                </div>
              )}
            </div>
          </FadeIn>
        )}
      </div>
    </GrainOverlay>
  )
}
