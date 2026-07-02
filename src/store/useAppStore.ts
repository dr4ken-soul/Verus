import { create } from 'zustand'
import type { WalletState, IssuerVerification, ProofStatus } from '../types'

interface AppState {
  wallet: WalletState
  issuers: IssuerVerification[]
  proofStatus: ProofStatus
  setWallet: (wallet: Partial<WalletState>) => void
  setIssuers: (issuers: IssuerVerification[]) => void
  setProofStatus: (status: ProofStatus) => void
  resetWallet: () => void
}

/**
 * Global application state for Verus.
 * Holds wallet connection state, the cached list of verified issuers
 * read from the Soroban contract, and the current proof generation status.
 * Never holds an issuer's actual balance at any point.
 */
export const useAppStore = create<AppState>((set) => ({
  wallet: { address: null, isConnected: false, network: 'testnet' },
  issuers: [],
  proofStatus: 'idle',
  setWallet: (wallet) =>
    set((state) => ({ wallet: { ...state.wallet, ...wallet } })),
  setIssuers: (issuers) => set({ issuers }),
  setProofStatus: (proofStatus) => set({ proofStatus }),
  resetWallet: () =>
    set({ wallet: { address: null, isConnected: false, network: 'testnet' } }),
}))
