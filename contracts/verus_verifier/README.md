# Verus Verifier Contract

A Soroban smart contract that verifies Groth16 proofs from the Verus `reserveProof` circuit and records the result on-chain. Forked from the structure of `stellar/soroban-examples/groth16_verifier` and adapted to use Stellar's BN254 host functions rather than BLS12-381, since Circom and snarkjs generate Groth16 proofs over BN254 by default, matching the curve Protocol 26 (Yardstick) added dedicated host functions for.

## Why BN254, not BLS12-381

The reference example contract in `soroban-examples` verifies BLS12-381 proofs. Verus does not use that contract directly because the actual proof produced by `circuits/reserveProof.circom` via snarkjs is over BN254 (`alt_bn128`), confirmed directly from the compiled circuit's `verification_key.json`, which states `"curve": "bn128"`. The contract here calls `env.crypto().bn254()` throughout instead.

## Design choices worth knowing

The verification key is fixed and set once via `initialize`, not accepted as a per-call argument. Accepting an arbitrary verification key from the caller would let anyone "verify" a proof against a key of their own choosing, which would defeat the entire purpose of an on-chain verifier. The key is set by the admin at deployment and never changes afterwards.

`verify_reserve_proof` requires the issuer's own signature (`issuer.require_auth()`), so the on-chain transaction itself is the issuer's attestation that the proof concerns their own reserves. The declared `threshold` parameter is cross-checked against the threshold encoded in the proof's public signals, so an issuer cannot prove a low threshold and register a claim for a higher one.

The contract checks two separate things before recording a verification: that the proof is cryptographically well-formed (the pairing check passes), and separately that the circuit's `isValid` output is actually `1`. A balance below the threshold still produces a perfectly valid proof, just a valid proof of failure, so checking only the pairing result is not sufficient. See `circuits/README.md` for the test case that demonstrates this directly.

## Build and test status

This contract has not been compiled or tested in the environment that scaffolded this repository, since `soroban-sdk` requires a Rust toolchain (`rust-version = 1.86.0` minimum, pinned via `rust-toolchain.toml` to the `stable` channel) well beyond what was available without internet access to `rustup`. The source and the test file in `src/test.rs` are complete and use real values extracted directly from the actual compiled circuit's `verification_key.json` and a real generated proof, not placeholder numbers. Run `cargo test` in a normal development environment with `rustup` installed to confirm correctness before deploying.

**The one part flagged as genuinely unverified:** the G2 coordinate ordering in `g2_from_decimal` inside `src/test.rs`. snarkjs exports G2 points as `[[x_c0, x_c1], [y_c0, y_c1]]`, and this is the single most common integration bug between snarkjs and on-chain BN254 verifiers, since some toolchains expect the c0/c1 pair swapped. The test file contains a clear comment marking exactly where to swap the values if `cargo test` fails the pairing check despite everything else being correct.

## Deployment

```bash
# Build the contract
stellar contract build

# Deploy to testnet
stellar contract deploy \
  --wasm target/wasm32v1-none/release/verus_verifier_contract.wasm \
  --source <your-deployer-identity> \
  --network testnet

# Initialize with your admin identity and the verification key
# (the verification key arguments are derived from circuits/verification_key.json,
# see src/test.rs for how each field maps to the contract's VerificationKey type)
stellar contract invoke \
  --id <deployed-contract-id> \
  --source <your-deployer-identity> \
  --network testnet \
  -- initialize --admin <your-admin-address> --vk <verification-key-json>
```

Once deployed, set `VITE_SOROBAN_VERIFIER_ADDRESS` in your `.env` to the deployed contract ID so the frontend can call it.

## Functions

- `initialize(admin, vk)` — one-time setup, must be called before any proof can be verified
- `verify_reserve_proof(issuer, issuer_name, asset, threshold, proof, pub_signals)` — verifies a proof and records the result, requires the issuer's signature
- `get_verification(issuer)` — returns a single issuer's verification record, if one exists
- `list_verifications()` — returns every recorded verification, used by the public issuer wall
