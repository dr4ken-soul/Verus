/**
 * snarkjs does not publish TypeScript declarations. This covers only the
 * surface Verus actually calls: groth16.fullProve and groth16.verify.
 */
declare module 'snarkjs' {
  export interface Groth16ProofResult {
    proof: {
      pi_a: string[]
      pi_b: string[][]
      pi_c: string[]
      protocol: string
      curve: string
    }
    publicSignals: string[]
  }

  export const groth16: {
    fullProve: (
      input: Record<string, string>,
      wasmPath: string,
      zkeyPath: string
    ) => Promise<Groth16ProofResult>
    verify: (
      verificationKey: object,
      publicSignals: string[],
      proof: Groth16ProofResult['proof']
    ) => Promise<boolean>
  }
}
