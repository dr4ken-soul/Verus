# Verus Circuit

`reserveProof.circom` is the entire cryptographic mechanism behind Verus. It proves that an issuer's reserve balance meets or exceeds a publicly declared threshold without revealing the balance.

This circuit has been compiled and tested for real during development of this repository, not just written and assumed correct. The results below are from an actual run, not a description of what should happen.

## Circuit summary

```
template instances: 4
non-linear constraints: 65
linear constraints: 4
public inputs: 1
private inputs: 1
public outputs: 1
wires: 71
```

Public signals are emitted in the order `[isValid, threshold]`. This was confirmed by inspecting the actual output of `snarkjs groth16 prove`, not assumed from documentation, since this exact ordering matters for both the frontend and the on-chain verifier.

## Verified test cases

**Balance above threshold** (`balance: 750000, threshold: 500000`):
```json
"publicSignals": ["1", "500000"]
```
`isValid = 1`. The proof verifies locally with `snarkjs groth16 verify`.

**Balance below threshold** (`balance: 300000, threshold: 500000`):
```json
"publicSignals": ["0", "500000"]
```
`isValid = 0`. Importantly, this proof also cryptographically verifies, since the circuit is proving the true statement "isValid equals 0 for this balance and threshold", not the claim itself. A balance below the threshold does not produce a broken proof, it produces a valid proof of failure. The application layer must check the `isValid` signal explicitly rather than only checking that the proof verifies. This is implemented in `src/hooks/useReserveProof.ts` via `isValidClaim()` and must be mirrored in the Soroban contract, which it is, in `contracts/verus_verifier`.

## Proving artifacts

The compiled `reserveProof.wasm`, the final `reserveProof.zkey` and `verification_key.json` are already committed in `public/circuits/`, generated through a full Groth16 trusted setup (powers of tau phase 1 and 2, plus a circuit-specific contribution). The circuit is small enough, at 65 constraints, that these files are only tens of kilobytes and ship directly with the repository rather than needing regeneration on first run.

If you modify the circuit, run `bash circuits/setup.sh` to regenerate all three files and copy them back into `public/circuits/`.

## Trusted setup note

The powers of tau ceremony run here used a single contributor for development purposes. For a production deployment handling real issuer claims, a proper multi-party ceremony or a well-known existing ptau file (such as the Hermez ceremony output) should be used instead, since a single-contributor setup relies on that one party having discarded their randomness honestly.
