import { useCallback } from 'react'
import {
  StellarWalletsKit,
  WalletNetwork,
  allowAllModules,
  FREIGHTER_ID,
} from '@creit.tech/stellar-wallets-kit'
import { useAppStore } from '../store/useAppStore'
import { logger } from '../lib/utils'

const kit = new StellarWalletsKit({
  network: import.meta.env.VITE_STELLAR_NETWORK === 'mainnet' ? WalletNetwork.PUBLIC : WalletNetwork.TESTNET,
  selectedWalletId: FREIGHTER_ID,
  modules: allowAllModules(),
})

/**
 * Hook for connecting and disconnecting a Stellar wallet via Stellar Wallets Kit.
 * Wraps the kit's connect flow and writes the resulting address into the
 * global store so any page can read the current connection state.
 */
export function useStellarWallet() {
  const setWallet = useAppStore((state) => state.setWallet)
  const resetWallet = useAppStore((state) => state.resetWallet)
  const wallet = useAppStore((state) => state.wallet)

  /**
   * Opens the wallet selection modal and connects the chosen wallet.
   * Updates the global wallet state once an address is returned.
   */
  const connect = useCallback(async () => {
    try {
      await kit.openModal({
        onWalletSelected: async (option) => {
          kit.setWallet(option.id)
          const { address } = await kit.getAddress()
          setWallet({ address, isConnected: true })
        },
      })
    } catch (error) {
      logger.error('Wallet connection failed', { error })
      throw new Error('Could not connect to your wallet. Check that it is unlocked and try again')
    }
  }, [setWallet])

  /**
   * Disconnects the current wallet and clears the global wallet state.
   */
  const disconnect = useCallback(() => {
    resetWallet()
  }, [resetWallet])

  /**
   * Signs an unsigned transaction XDR with the connected wallet.
   * @param xdr - the unsigned transaction in base64 XDR form
   * @returns the signed transaction XDR ready for submission
   */
  const signTransaction = useCallback(
    async (xdr: string) => {
      if (!wallet.address) {
        throw new Error('Connect your wallet before signing a transaction')
      }
      const { signedTxXdr } = await kit.signTransaction(xdr, {
        address: wallet.address,
        networkPassphrase:
          import.meta.env.VITE_STELLAR_NETWORK === 'mainnet'
            ? WalletNetwork.PUBLIC
            : WalletNetwork.TESTNET,
      })
      return signedTxXdr
    },
    [wallet.address]
  )

  return { wallet, connect, disconnect, signTransaction }
}
