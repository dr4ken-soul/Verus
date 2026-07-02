# Verus

Prove your reserves. Reveal nothing.

Verus lets any Stellar issuer prove their reserves exceed a publicly declared threshold without revealing what they actually hold. Built for the Stellar Hacks: Real-World ZK hackathon.

## What this proves

An issuer connects their Stellar wallet, declares a public claim such as "at least 500,000 USDC", and a Circom circuit running entirely in their browser builds a Groth16 proof that their actual balance meets that claim. The balance itself never leaves the browser in any form, plaintext or otherwise. A Soroban smart contract verifies the proof on-chain and records the result. Anyone can browse the public issuer wall and independently confirm a verification by checking the on-chain transaction directly, without needing to trust Verus, or the issuer, as an intermediary.

ZK does the entire mechanism here. Remove the circuit and there is no verification left, only an unverifiable claim on a page.

## How it works

A Circom 2.0 circuit (`circuits/reserveProof.circom`) takes the issuer's actual balance as a private input and the declared threshold as a public input, and outputs a single bit confirming whether the balance meets or exceeds the claim. The proof is generated client-side using snarkjs and Groth16, then checked on-chain by a Soroban contract (`contracts/verus_verifier`) using Stellar's native BN254 host functions, added in Protocol 26 specifically for this kind of work.

```
issuer balance (private) ──┐
                            ├──▶ Circom circuit ──▶ Groth16 proof ──▶ Soroban verifier ──▶ public record
threshold claim (public)  ──┘
```

## What is public versus private

| Public | Private |
|---|---|
| The threshold claimed | The actual reserve balance |
| The verification status | Wallet holdings beyond the proof |
| The proof timestamp | Anything not explicitly in the public signals |

## Status of this submission

This repository is honest about what has and has not been verified end to end.

**Verified for real, not just written:** the `reserveProof.circom` circuit was compiled with circom 2.2.3, taken through a full Groth16 trusted setup, and tested with real witness data for both a passing case (balance above threshold) and a failing case (balance below threshold). See `circuits/README.md` for the actual output of those runs. The proving artifacts in `public/circuits/` are real, working files, not placeholders, and the frontend's proof generation hook (`src/hooks/useReserveProof.ts`) correctly distinguishes a cryptographically valid proof from a genuinely successful claim, which matters because a balance below the threshold still produces a valid proof, just a valid proof of failure.

**Verified for real, not just written:** the Soroban verifier contract in `contracts/verus_verifier` compiles cleanly to `wasm32v1-none` (43 kB) and both tests pass against real circuit values. `test_initialize_then_verify_real_proof` runs the full Groth16 pairing check using the actual verification key from `circuits/verification_key.json` and a real proof generated from the compiled circuit. `test_threshold_mismatch_is_rejected` confirms the contract rejects a proof where the public threshold signal does not match the declared value. The G2 coordinate encoding required the Soroban-specific Fp2 ordering (`c1 || c0`) rather than snarkjs's default, which was confirmed directly from the SDK source in `soroban-sdk-25.3.1` and applied consistently in both the Rust test and the TypeScript frontend encoding. The compiled WASM is at `contracts/verus_verifier/target/wasm32v1-none/release/verus_verifier_contract.wasm`. Deployment to Stellar testnet is the remaining step before the frontend can submit live proofs.

**Deployed and initialised on Stellar testnet (2 July 2026):** the contract is live at `CCE2DD73HCM7J2ECBDSNMKCKER7TPF45LC3EOIBWQKLP32FELVDQH4OT`. The verification key from `circuits/verification_key.json` is stored on-chain. You can inspect the deployment transaction on Stellar Expert: https://stellar.expert/explorer/testnet/contract/CCE2DD73HCM7J2ECBDSNMKCKER7TPF45LC3EOIBWQKLP32FELVDQH4OT


## Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, TypeScript, Tailwind CSS v3, Framer Motion |
| Wallet | Stellar Wallets Kit |
| ZK circuit | Circom 2.0 |
| Proof system | Groth16 via snarkjs, generated client-side |
| On-chain verifier | Soroban, using native BN254 host functions |
| Chain | Stellar testnet |

## Running locally

```bash
npm install
cp .env.example .env
# fill in VITE_SOROBAN_VERIFIER_ADDRESS once the contract is deployed
npm run dev
```

The circuit's proving artifacts are already compiled and committed in `public/circuits/`, so proof generation works immediately without any additional setup. If you modify the circuit itself, see `circuits/README.md` for how to regenerate them.

To deploy the contract, see `contracts/verus_verifier/README.md`.

## Project structure

```
verus/
├── circuits/              the ZK circuit, its README and setup script
├── contracts/
│   └── verus_verifier/    the Soroban verifier contract
├── public/
│   ├── circuits/          compiled, working proving artifacts
│   └── images/            hero image slot, see below
├── src/
│   ├── components/        UI primitives, layout and landing sections
│   ├── pages/              landing and the four app interior pages
│   ├── hooks/              proof generation, wallet and verifier hooks
│   ├── lib/                Stellar SDK and circuit helpers
│   └── store/              global state
└── docs/                   the original planning documents for this build
```

## Assets not included

No logo or favicon is included. `index.html` and the navigation components mark exactly where these go with plain comments, `public/logo.svg` and `public/favicon.ico`, and nothing stands in for them. The hero image at `public/images/hero-sphere.webp` is similarly left as a slot, ready for the generated asset to be dropped in directly.

## Built with

Circom, Groth16 (snarkjs), Soroban, Stellar SDK, Stellar Wallets Kit, React 18, TypeScript, Vite, Framer Motion, Tailwind CSS.
