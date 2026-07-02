import { useCallback, useState } from 'react'
import { generateReserveProof, verifyProofLocally, isValidClaim } from '../lib/circuit'
import { useAppStore } from '../store/useAppStore'
import { logger } from '../lib/utils'
import type { Groth16Proof } from '../types'

/**
 * Hook orchestrating the full client-side proof generation flow.
 * Tracks generation progress and exposes the resulting proof once ready.
 * The balance entered by the issuer is held only in local component state
 * for the duration of generation and is never persisted, logged or sent
 * anywhere outside the circuit computation itself.
 */
export function useReserveProof() {
  const setProofStatus = useAppStore((state) => state.setProofStatus)
  const [proof, setProof] = useState<Groth16Proof | null>(null)
  const [publicSignals, setPublicSignals] = useState<string[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  /**
   * Runs the circuit to produce a proof for the balance and threshold given,
   * then performs two distinct checks before exposing the proof to the
   * caller. First, that the proof is cryptographically well-formed. Second,
   * that the circuit's isValid output is actually 1, since a balance below
   * the threshold still produces a perfectly valid proof of that fact and
   * must not be treated as a successful claim.
   * @param balance - the issuer's actual reserve balance, discarded after this call
   * @param threshold - the public threshold being claimed
   */
  const generate = useCallback(
    async (balance: bigint, threshold: bigint) => {
      setError(null)
      setProofStatus('generating')
      try {
        const result = await generateReserveProof(balance, threshold)
        const isWellFormed = await verifyProofLocally(result.proof, result.publicSignals)

        if (!isWellFormed) {
          setProofStatus('invalid')
          setError('The generated proof could not be verified locally. Check your inputs and try again')
          return
        }

        if (!isValidClaim(result.publicSignals)) {
          setProofStatus('invalid')
          setError('Your balance does not meet the declared threshold. Lower the threshold or check your balance')
          return
        }

        setProof(result.proof)
        setPublicSignals(result.publicSignals)
        setProofStatus('valid')
      } catch (caughtError) {
        logger.error('Proof generation failed', { caughtError })
        setProofStatus('failed')
        setError('Could not generate the proof. Check your inputs and try again')
      }
    },
    [setProofStatus]
  )

  /**
   * Clears the current proof state, used when the issuer changes their
   * threshold or balance and needs to regenerate.
   */
  const reset = useCallback(() => {
    setProof(null)
    setPublicSignals(null)
    setError(null)
    setProofStatus('idle')
  }, [setProofStatus])

  return { proof, publicSignals, error, generate, reset }
}
