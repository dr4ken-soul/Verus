/**
 * Core data structures for Verus.
 * Note that no type here ever carries the issuer's actual balance.
 * The balance exists only transiently inside the proof generation function
 * and is never assigned to a stored or transmitted structure.
 */

export interface Groth16Proof {
  pi_a: string[]
  pi_b: string[][]
  pi_c: string[]
  protocol: string
  curve: string
}

export interface ProofSubmission {
  proof: Groth16Proof
  publicSignals: string[]
  issuerAddress: string
}

export interface IssuerVerification {
  issuerAddress: string
  issuerName: string
  asset: string
  threshold: string
  proofTxHash: string
  verifiedAt: number
  isStale: boolean
}

export interface WalletState {
  address: string | null
  isConnected: boolean
  network: 'testnet' | 'mainnet'
}

export type ProofStatus = 'idle' | 'generating' | 'valid' | 'invalid' | 'submitting' | 'submitted' | 'failed'
