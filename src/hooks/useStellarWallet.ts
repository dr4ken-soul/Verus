import { useCallback, useEffect } from 'react'
import {
  StellarWalletsKit,
  WalletNetwork,
  allowAllModules,
  FREIGHTER_ID,
} from '@creit.tech/stellar-wallets-kit'
import { useAppStore } from '../store/useAppStore'
import { logger } from '../lib/utils'

const WALLET_STORAGE_KEY = 'verus_wallet_connected'

const kit = new StellarWalletsKit({
  network: import.meta.env.VITE_STELLAR_NETWORK === 'mainnet' ? WalletNetwork.PUBLIC : WalletNetwork.TESTNET,
  selectedWalletId: FREIGHTER_ID,
  modules: allowAllModules(),
})

/**
 * Hook for connecting and disconnecting a Stellar wallet via Stellar Wallets Kit.
 * Wraps the kit's connect flow and writes the resulting address into the
 * global store so any page can read the current connection state.
 *
 * Wallet state is persisted in localStorage so the connection survives
 * page refreshes without requiring the user to re-approve in Freighter.
 */
export function useStellarWallet() {
  const setWallet = useAppStore((state) => state.setWallet)
  const resetWallet = useAppStore((state) => state.resetWallet)
  const wallet = useAppStore((state) => state.wallet)

  // On first mount, silently restore the wallet session if the user previously
  // connected and Freighter still has the site whitelisted (isAllowed).
  useEffect(() => {
    if (wallet.isConnected) return  // already connected in store, nothing to do

    const wasConnected = localStorage.getItem(WALLET_STORAGE_KEY) === 'true'
    if (!wasConnected) return

    // Attempt a silent reconnect — getAddress() resolves immediately if
    // Freighter is unlocked and the site is still allowed, no popup shown.
    kit.setWallet(FREIGHTER_ID)
    kit.getAddress()
      .then(({ address }) => {
        if (address) {
          setWallet({ address, isConnected: true })
        }
      })
      .catch(() => {
        // Freighter was removed or locked — clear the stale flag so the
        // next visit starts fresh rather than attempting reconnect in a loop.
        localStorage.removeItem(WALLET_STORAGE_KEY)
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])  // intentionally empty — runs once on mount only

  /**
   * Opens the wallet selection modal and connects the chosen wallet.
   * Persists the connection flag to localStorage so it survives refresh.
   */
  const connect = useCallback(async () => {
    try {
      await kit.openModal({
        onWalletSelected: async (option) => {
          kit.setWallet(option.id)
          const { address } = await kit.getAddress()
          setWallet({ address, isConnected: true })
          localStorage.setItem(WALLET_STORAGE_KEY, 'true')
        },
      })
    } catch (error) {
      logger.error('Wallet connection failed', { error })
      throw new Error('Could not connect to your wallet. Check that it is unlocked and try again')
    }
  }, [setWallet])

  /**
   * Disconnects the current wallet and clears the connection flag.
   */
  const disconnect = useCallback(() => {
    resetWallet()
    localStorage.removeItem(WALLET_STORAGE_KEY)
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
