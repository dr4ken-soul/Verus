/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_STELLAR_NETWORK: string
  readonly VITE_STELLAR_RPC_URL: string
  readonly VITE_STELLAR_HORIZON_URL: string
  readonly VITE_SOROBAN_VERIFIER_ADDRESS: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
