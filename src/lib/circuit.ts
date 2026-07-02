import * as snarkjs from 'snarkjs'
import type { Groth16Proof } from '../types'

const WASM_PATH = '/circuits/reserveProof.wasm'
const ZKEY_PATH = '/circuits/reserveProof.zkey'
const VKEY_PATH = '/circuits/verification_key.json'

/**
 * Generates a Groth16 proof that the issuer's balance meets or exceeds
 * the declared threshold, without ever exposing the balance itself.
 * The balance exists only as a local function argument for the duration
 * of this call and is discarded once the proof is returned.
 * @param balance - the issuer's actual reserve balance, used only as a circuit input
 * @param threshold - the public threshold the issuer is claiming to meet
 * @returns the Groth16 proof and its public signals, ready for on-chain submission
 */
export async function generateReserveProof(
  balance: bigint,
  threshold: bigint
): Promise<{ proof: Groth16Proof; publicSignals: string[] }> {
  const { proof, publicSignals } = await snarkjs.groth16.fullProve(
    { balance: balance.toString(), threshold: threshold.toString() },
    WASM_PATH,
    ZKEY_PATH
  )
  return { proof: proof as Groth16Proof, publicSignals }
}

/**
 * Verifies a generated proof locally in the browser before it is ever
 * submitted on-chain, catching malformed proofs early with a clear message
 * rather than spending gas on a transaction that will fail.
 *
 * This only confirms the proof is a genuine proof of the circuit's
 * statement. It does not confirm the statement was true, since a balance
 * below the threshold still produces a perfectly valid proof of that
 * fact. Callers must separately check isValidClaim below.
 * @param proof - the Groth16 proof to check
 * @param publicSignals - the public signals accompanying the proof
 * @returns true if the proof is cryptographically well-formed
 */
export async function verifyProofLocally(proof: Groth16Proof, publicSignals: string[]): Promise<boolean> {
  const vkeyResponse = await fetch(VKEY_PATH)
  const vkey = await vkeyResponse.json()
  return snarkjs.groth16.verify(vkey, publicSignals, proof)
}

/**
 * Reads the circuit's isValid output from the public signals array.
 * The circuit emits public signals in the order [isValid, threshold],
 * confirmed against the compiled reserveProof circuit's actual output.
 * @param publicSignals - the public signals returned alongside the proof
 * @returns true only if the balance genuinely met or exceeded the threshold
 */
export function isValidClaim(publicSignals: string[]): boolean {
  return publicSignals[0] === '1'
}
