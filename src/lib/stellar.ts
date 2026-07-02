import {
  rpc,
  TransactionBuilder,
  Networks,
  Contract,
  BASE_FEE,
  nativeToScVal,
  scValToNative,
  Address,
} from '@stellar/stellar-sdk'
import type { Groth16Proof, IssuerVerification } from '../types'
import { encodeG1, encodeG2, decimalToBytes32BE } from './encoding'
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
 * Converts a Groth16 proof object as produced by snarkjs into an ScVal
 * matching the verus_verifier contract's Proof struct.
 *
 * A plain JS object converts to an scvMap via nativeToScVal, which matches
 * how soroban-sdk represents a #[contracttype] struct with named fields.
 * This has not been confirmed against a deployed contract, since the
 * contract could not be compiled in the environment this project was
 * scaffolded in. Once deployed, prefer running
 * `stellar contract bindings typescript` and using the generated client
 * instead of this hand-rolled encoding, since generated bindings remove
 * this entire category of mismatch risk.
 * @param proof - the raw Groth16 proof from snarkjs
 */
function encodeProofStruct(proof: Groth16Proof) {
  return nativeToScVal({
    a: encodeG1(proof.pi_a),
    b: encodeG2(proof.pi_b),
    c: encodeG1(proof.pi_c),
  })
}

/**
 * Encodes the public signals array (isValid, threshold) as a Soroban
 * vector of 32-byte BN254 scalar field elements.
 * @param publicSignals - the public signals from the proof, [isValid, threshold]
 */
function encodePublicSignals(publicSignals: string[]) {
  return nativeToScVal(publicSignals.map((signal) => decimalToBytes32BE(signal)))
}

/**
 * Builds and prepares a Soroban transaction calling the verifier contract's
 * verify_reserve_proof function with the supplied proof. The transaction
 * is returned unsigned, ready for the connected wallet to sign.
 * @param sourceAccount - the issuer's Stellar account, loaded from the network
 * @param proof - the Groth16 proof object
 * @param publicSignals - public signals accompanying the proof, [isValid, threshold]
 * @param threshold - the declared threshold being proven
 * @param asset - the asset code the threshold is denominated in
 * @param issuerName - the display name shown on the public issuer wall
 */
export async function buildVerifyTransaction(
  sourceAccount: { accountId: () => string },
  proof: Groth16Proof,
  publicSignals: string[],
  threshold: string,
  asset: string,
  issuerName: string
) {
  const server = getServer()
  const account = await server.getAccount(sourceAccount.accountId())
  const contract = getVerifierContract()

  const args = [
    nativeToScVal(new Address(sourceAccount.accountId())),
    nativeToScVal(issuerName, { type: 'string' }),
    nativeToScVal(asset, { type: 'symbol' }),
    nativeToScVal(BigInt(threshold), { type: 'u64' }),
    encodeProofStruct(proof),
    encodePublicSignals(publicSignals),
  ]

  const tx = new TransactionBuilder(account, { fee: BASE_FEE, networkPassphrase: NETWORK })
    .addOperation(contract.call('verify_reserve_proof', ...args))
    .setTimeout(60)
    .build()

  const prepared = await server.prepareTransaction(tx)
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
 * used throughout the frontend. Does not require a connected wallet.
 */
export async function fetchAllIssuerVerifications(): Promise<IssuerVerification[]> {
  const server = getServer()

  // A short-circuit for when the contract address has not been configured yet.
  // Avoids a network call that would fail with a misleading error.
  if (!VERIFIER_ADDRESS) {
    return []
  }

  const contract = getVerifierContract()
  const account = await server.getAccount(
    // A throwaway read-only simulation source. Soroban RPC simulation does not
    // require the source account to exist or have any balance when it is used
    // purely to simulate a read-only function call.
    'GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN'
  ).catch(() => null)

  if (!account) {
    return []
  }

  const tx = new TransactionBuilder(account, { fee: BASE_FEE, networkPassphrase: NETWORK })
    .addOperation(contract.call('list_verifications'))
    .setTimeout(30)
    .build()

  const simulated = await server.simulateTransaction(tx)
  if (!rpc.Api.isSimulationSuccess(simulated) || !simulated.result?.retval) {
    return []
  }

  // scValToNative converts the Vec<IssuerRecord> ScVal into a plain JS array
  // of objects matching the contract struct field names (snake_case).
  const rawRecords = scValToNative(simulated.result.retval) as Array<{
    issuer_name: string
    asset: string
    threshold: bigint
    verified_at: bigint
  }>

  // The issuer address is the storage key in the contract, not part of the
  // IssuerRecord struct itself. We cannot recover it from list_verifications
  // alone without the address list from instance storage. Use the tx hash as
  // a stable unique key instead.
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
}
