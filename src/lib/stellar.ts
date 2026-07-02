import {
  rpc,
  TransactionBuilder,
  Networks,
  Contract,
  BASE_FEE,
  nativeToScVal,
  scValToNative,
  Address,
  Account,
} from '@stellar/stellar-sdk'
import type { Groth16Proof, IssuerVerification } from '../types'
import { encodeG1, encodeG2 } from './encoding'
import { isVerificationStale } from './utils'

const NETWORK = import.meta.env.VITE_STELLAR_NETWORK === 'mainnet' ? Networks.PUBLIC : Networks.TESTNET
const RPC_URL = import.meta.env.VITE_STELLAR_RPC_URL ?? 'https://soroban-testnet.stellar.org'
const VERIFIER_ADDRESS = import.meta.env.VITE_SOROBAN_VERIFIER_ADDRESS ?? ''

/**
 * Returns a configured Soroban RPC server instance for the active network.
 * Centralised here so every hook and page reads from the same connection settings.
 */
export function getServer(): rpc.Server {
  return new rpc.Server(RPC_URL, { allowHttp: RPC_URL.startsWith('http://') })
}

/**
 * Builds the Soroban contract instance for the Groth16 verifier.
 * Throws clearly if the verifier address has not been configured yet,
 * rather than failing silently further down the call chain.
 */
export function getVerifierContract(): Contract {
  if (!VERIFIER_ADDRESS) {
    throw new Error('Soroban verifier address is not set. Add VITE_SOROBAN_VERIFIER_ADDRESS to .env')
  }
  return new Contract(VERIFIER_ADDRESS)
}

/**
 * Encodes the three components of a Groth16 proof as three separate ScvBytes
 * values that map to the contract's flat Bytes arguments.
 *
 * The contract's verify_reserve_proof function accepts proof_a, proof_b,
 * proof_c as TOP-LEVEL Bytes arguments (not inside a #[contracttype] struct).
 * This avoids the map_unpack_to_linear_memory host-function type-mismatch
 * that occurs when using struct arguments from JavaScript.
 *
 * Public signals (isValid, threshold) are derived on-chain from the threshold
 * u64 argument, so they do not need to be passed from JavaScript.
 */
function encodeProofArgs(proof: Groth16Proof): [ReturnType<typeof nativeToScVal>, ReturnType<typeof nativeToScVal>, ReturnType<typeof nativeToScVal>] {
  return [
    nativeToScVal(encodeG1(proof.pi_a)),   // proof_a: Bytes (64)
    nativeToScVal(encodeG2(proof.pi_b)),   // proof_b: Bytes (128)
    nativeToScVal(encodeG1(proof.pi_c)),   // proof_c: Bytes (64)
  ]
}

/**
 * Builds and prepares a Soroban transaction calling the verifier contract's
 * verify_reserve_proof function with the supplied proof.
 *
 * The new contract API accepts the proof as three separate Bytes arguments
 * (proof_a, proof_b, proof_c) rather than a Proof struct, and derives the
 * public signals (isValid=1, threshold) on-chain from the threshold u64.
 *
 * @param sourceAccount - the issuer's Stellar account, loaded from the network
 * @param proof - the Groth16 proof object from snarkjs
 * @param threshold - the declared threshold being proven (decimal string)
 * @param asset - the asset code the threshold is denominated in
 * @param issuerName - the display name shown on the public issuer wall
 */
export async function buildVerifyTransaction(
  sourceAccount: { accountId: () => string },
  proof: Groth16Proof,
  threshold: string,
  asset: string,
  issuerName: string
) {
  const server = getServer()
  const account = await server.getAccount(sourceAccount.accountId())
  const contract = getVerifierContract()

  const [proofA, proofB, proofC] = encodeProofArgs(proof)

  const args = [
    nativeToScVal(new Address(sourceAccount.accountId())),
    nativeToScVal(issuerName, { type: 'string' }),
    nativeToScVal(asset, { type: 'symbol' }),
    nativeToScVal(BigInt(threshold), { type: 'u64' }),
    proofA,   // proof_a: Bytes (64) — G1 affine point
    proofB,   // proof_b: Bytes (128) — G2 affine point
    proofC,   // proof_c: Bytes (64) — G1 affine point
  ]

  const tx = new TransactionBuilder(account, { fee: BASE_FEE, networkPassphrase: NETWORK })
    .addOperation(contract.call('verify_reserve_proof', ...args))
    .setTimeout(60)
    .build()

  let prepared
  try {
    prepared = await server.prepareTransaction(tx)
  } catch (err: unknown) {
    const detail =
      err instanceof Error
        ? err.message
        : typeof err === 'object' && err !== null && 'message' in err
          ? String((err as { message: unknown }).message)
          : String(err)
    throw new Error(`Soroban simulation failed: ${detail}`)
  }
  return prepared
}

/**
 * Submits a signed transaction to the network and polls until it confirms.
 * @param signedXdr - the base64 signed transaction XDR from the wallet
 * @returns the final transaction hash once confirmed on-chain
 */
export async function submitSignedTransaction(signedXdr: string): Promise<string> {
  const server = getServer()
  const tx = TransactionBuilder.fromXDR(signedXdr, NETWORK)
  const result = await server.sendTransaction(tx)

  if (result.status === 'ERROR') {
    throw new Error('Transaction submission failed. Check your wallet connection and try again')
  }

  let response = await server.getTransaction(result.hash)
  while (response.status === 'NOT_FOUND') {
    await new Promise((resolve) => setTimeout(resolve, 1500))
    response = await server.getTransaction(result.hash)
  }

  if (response.status !== 'SUCCESS') {
    throw new Error('Could not verify proof on-chain. Check your wallet connection and try again')
  }

  return result.hash
}

/**
 * Queries the verifier contract for every recorded issuer verification.
 * Parses the raw Soroban ScVal return into the IssuerVerification shape
 * used throughout the frontend. Does not require a connected wallet, but
 * passing the connected wallet's public key as sourceAddress lets the RPC
 * node use a real funded account for the simulation call, which is more
 * reliable than using a throwaway mock account.
 * @param sourceAddress - optional funded Stellar public key for simulation
 */
export async function fetchAllIssuerVerifications(sourceAddress?: string): Promise<IssuerVerification[]> {
  const server = getServer()

  if (!VERIFIER_ADDRESS) {
    return []
  }

  const contract = getVerifierContract()

  // Prefer the caller's real funded account (more reliable for simulation).
  // Fall back to a mock account with sequence 0 when no wallet is connected.
  let account
  if (sourceAddress) {
    try {
      account = await server.getAccount(sourceAddress)
    } catch {
      account = null
    }
  }
  if (!account) {
    // For read-only simulation the source account does not need to exist on-chain
    // with a real balance — just a valid address and any sequence number.
    account = new Account('GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN', '0')
  }

  const tx = new TransactionBuilder(account, { fee: BASE_FEE, networkPassphrase: NETWORK })
    .addOperation(contract.call('list_verifications'))
    .setTimeout(30)
    .build()

  try {
    const simulated = await server.simulateTransaction(tx)
    if (!rpc.Api.isSimulationSuccess(simulated) || !simulated.result?.retval) {
      return []
    }

    // scValToNative converts Vec<IssuerRecord> into a plain JS array whose
    // keys match the contract struct field names (snake_case).
    const rawRecords = scValToNative(simulated.result.retval) as Array<{
      issuer_name: string
      asset: string
      threshold: bigint
      verified_at: bigint
    }>

    return rawRecords.map((record, index) => {
      const verifiedAt = Number(record.verified_at)
      return {
        issuerAddress: `record-${index}`,
        issuerName: record.issuer_name,
        asset: record.asset,
        threshold: record.threshold.toString(),
        proofTxHash: '',
        verifiedAt,
        isStale: isVerificationStale(verifiedAt),
      } satisfies IssuerVerification
    })
  } catch {
    return []
  }
}
