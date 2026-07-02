/**
 * Converts a decimal field element string, exactly as produced by snarkjs,
 * into a 32-byte big-endian Uint8Array. BN254 values on Stellar use the
 * Ethereum-compatible big-endian fixed-width format, confirmed against
 * the Soroban SDK's BN254 migration guide, not arkworks' little-endian
 * default serialisation.
 * @param decimal - a decimal string representing a field element
 * @returns a 32-byte big-endian encoded value
 */
export function decimalToBytes32BE(decimal: string): Uint8Array {
  let value = BigInt(decimal)
  const bytes = new Uint8Array(32)
  for (let i = 31; i >= 0; i -= 1) {
    bytes[i] = Number(value & 0xffn)
    value >>= 8n
  }
  return bytes
}

/**
 * Encodes a Groth16 G1 point (x, y), ignoring the projective z coordinate
 * snarkjs includes, into the 64-byte format Stellar's BN254 host
 * functions expect.
 * @param point - a snarkjs G1 point as [x, y, z] decimal strings
 */
export function encodeG1(point: string[]): Uint8Array {
  const out = new Uint8Array(64)
  out.set(decimalToBytes32BE(point[0]), 0)
  out.set(decimalToBytes32BE(point[1]), 32)
  return out
}

/**
 * Encodes a Groth16 G2 point into the 128-byte format Stellar's BN254
 * host functions expect.
 *
 * snarkjs exports G2 points as [[x_c0, x_c1], [y_c0, y_c1], [1, 0]] where
 * c0 is the real component and c1 is the imaginary component of each Fp2
 * element. The Soroban SDK BN254 serialisation format stores each Fp2
 * element as be_bytes(c1) || be_bytes(c0), i.e. imaginary before real.
 * This is confirmed from the SDK source in soroban-sdk-25.3.1/src/crypto/bn254.rs
 * and matches the Ethereum alt_bn128 precompile convention.
 * @param point - a snarkjs G2 point as [[x_c0, x_c1], [y_c0, y_c1], [1, 0]]
 */
export function encodeG2(point: string[][]): Uint8Array {
  const out = new Uint8Array(128)
  // Soroban Fp2 order: c1 (imaginary) before c0 (real)
  out.set(decimalToBytes32BE(point[0][1]), 0)
  out.set(decimalToBytes32BE(point[0][0]), 32)
  out.set(decimalToBytes32BE(point[1][1]), 64)
  out.set(decimalToBytes32BE(point[1][0]), 96)
  return out
}
