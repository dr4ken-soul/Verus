import { useCallback, useState } from 'react'
import { buildVerifyTransaction, submitSignedTransaction } from '../lib/stellar'
import { useStellarWallet } from './useStellarWallet'
import { useAppStore } from '../store/useAppStore'
import { logger } from '../lib/utils'
import type { Groth16Proof } from '../types'

/**
 * Hook for submitting a generated proof to the Soroban verifier contract
 * and tracking the on-chain confirmation.
 */
export function useSorobanVerifier() {
  const { wallet, signTransaction } = useStellarWallet()
  const setProofStatus = useAppStore((state) => state.setProofStatus)
  const [txHash, setTxHash] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  /**
   * Builds, signs and submits the verification transaction for a given proof.
   * @param proof - the Groth16 proof to verify on-chain
   * @param publicSignals - the public signals accompanying the proof
   * @param threshold - the declared threshold being proven
   * @param asset - the asset code the threshold is denominated in
   * @param issuerName - the display name shown on the public issuer wall
   * @returns the confirmed transaction hash once the proof is verified on Stellar
   */
  const submit = useCallback(
    async (proof: Groth16Proof, publicSignals: string[], threshold: string, asset: string, issuerName: string) => {
      if (!wallet.address) {
        setError('Connect your wallet before submitting a proof')
        return
      }
      setError(null)
      setProofStatus('submitting')
      try {
        const prepared = await buildVerifyTransaction(
          { accountId: () => wallet.address! },
          proof,
          publicSignals,
          threshold,
          asset,
          issuerName
        )
        const signedXdr = await signTransaction(prepared.toXDR())
        const hash = await submitSignedTransaction(signedXdr)
        setTxHash(hash)
        setProofStatus('submitted')
      } catch (caughtError) {
        logger.error('On-chain submission failed', { caughtError })
        // Keep status 'valid' so the proof stays and the user can retry submit
        // without having to regenerate from scratch.
        setProofStatus('valid')
        setError('Submission failed. Check that Freighter is on Testnet and your account has XLM, then try again.')
      }
    },
    [wallet.address, signTransaction, setProofStatus]
  )

  return { submit, txHash, error }
}
