# Verus — App Blueprint

## Product Summary

Verus lets any Stellar issuer prove their reserves exceed a declared threshold without revealing what they actually hold. An issuer connects their Stellar wallet, states a public claim such as "at least 500,000 USDC", and a Circom range proof circuit running in their browser generates a Groth16 proof that their balance meets or exceeds that figure. A Soroban smart contract verifies the proof on-chain and records the result. Anyone can browse the public issuer wall and independently confirm a verification without ever seeing the underlying balance.

The product is built for the Stellar Hacks: Real-World ZK hackathon (Jun 15 to Jul 3 2026, extended). ZK does the entire mechanism here. Remove the circuit and there is no product, only an unverifiable claim.

---

## Market Context

**Who this is for:**

1. Stablecoin and RWA issuers on Stellar who need to demonstrate solvency to users and partners without disclosing exact treasury positions
2. DeFi protocols and lending platforms holding pooled reserves that want a public, verifiable proof-of-reserves without a costly third-party audit cycle
3. Compliance teams and auditors who need a lightweight, ongoing verification signal between full audits

**What they currently use:** Manual attestations published as PDFs, third-party audit firms with quarterly reporting cycles, or full transparency where exact balances are published publicly, exposing competitive and security-sensitive information.

**Why they switch:** None of the current options give a continuous, cryptographically verifiable signal that costs nothing beyond gas to refresh. A PDF attestation is trusted on reputation, not maths. Full transparency leaks information issuers would rather keep private. Verus sits in between: provable, public, but not exposing.

---

## MVP Feature Set

### Feature 1: Issuer Onboarding

**User story:** As an issuer I want to connect my Stellar wallet and declare a public reserve threshold so that I can begin the verification process.

**How it works:** The issuer connects via Stellar Wallets Kit on the Verify page. They enter a threshold claim (asset and amount) which becomes the public input to the proof circuit. This claim and the wallet address are stored once the first proof is generated, not before.

**Acceptance criteria:** Wallet connects successfully, threshold input validates as a positive number with a recognised asset code, and the issuer cannot proceed to proof generation without both fields complete.

**Complexity:** Low

---

### Feature 2: Proof Generation

**User story:** As an issuer I want to generate a zero-knowledge proof that my balance meets my declared threshold so that I never expose the actual figure.

**How it works:** The issuer's actual balance is read client-side (from their connected wallet or a manually entered value during testnet phase) and fed as a private input to the Circom circuit alongside the public threshold. snarkjs generates a Groth16 proof entirely in the browser. The balance is never transmitted anywhere, logged, or stored in any form.

**Acceptance criteria:** Proof generation completes within a reasonable time in-browser, the proof verifies locally before submission, and no balance value appears in any network request, console output or component state outside the circuit computation itself.

**Complexity:** High

---

### Feature 3: On-Chain Verification

**User story:** As an issuer I want my proof checked on Stellar so that the verification is publicly auditable and not dependent on trusting Verus as a service.

**How it works:** The generated proof and public threshold are submitted to a Soroban Groth16 verifier contract. The contract checks the proof and, if valid, records the issuer address, threshold, asset and a block timestamp. The transaction is signed by the issuer's own wallet.

**Acceptance criteria:** Valid proofs are accepted and recorded on-chain, invalid proofs are rejected with a clear on-chain revert, and the verification record is independently queryable by anyone with the contract address.

**Complexity:** High

---

### Feature 4: Public Issuer Wall

**User story:** As anyone checking an issuer's claim I want to see their verification status without needing to trust Verus or the issuer directly.

**How it works:** The Issuers page queries the Soroban contract for all recorded verifications and displays them as a searchable list. Each entry shows the issuer address, asset, threshold claimed, verification status and proof age. Clicking an entry shows the on-chain transaction reference for independent confirmation.

**Acceptance criteria:** All verified issuers appear within a few seconds of page load, search filters correctly by issuer or asset, and every entry links to a verifiable on-chain record.

**Complexity:** Medium

---

### Feature 5: Re-Verification

**User story:** As an issuer I want to refresh my proof periodically so that my verification stays current and trustworthy.

**How it works:** Issuers can return to the Verify page at any time and generate a new proof against their current balance. The on-chain record updates with the latest timestamp. Proofs older than a configurable interval are flagged as stale on the issuer wall rather than removed, so history remains visible.

**Acceptance criteria:** A new proof updates the existing record rather than duplicating it, and proofs past the staleness threshold display a clear stale indicator on the public wall.

**Complexity:** Low

---

## Tech Stack

| Layer | Choice | Reason |
|---|---|---|
| Frontend | React 18 + Vite + TypeScript | Fast build, strong typing, standard for dApp frontends |
| Styling | Tailwind CSS v3 | Utility-first, no runtime overhead, pairs with Framer Motion |
| Animations | Framer Motion | Production-grade entrance animations and stagger support |
| Wallet | Stellar Wallets Kit | Unified API across Stellar-compatible wallets, purpose-built for this chain |
| ZK circuit | Circom 2.0 | Approachable DSL with strong tooling and AI assistance, used by the reference Stellar Private Payments PoC |
| Proof system | Groth16 via snarkjs | Cheapest verification cost on Stellar's existing verifier contracts, proven E2E tutorial available |
| On-chain verifier | Soroban Groth16 verifier (forked from stellar/soroban-examples) | Battle-tested reference contract, avoids building a verifier from scratch under time pressure |
| Chain | Stellar SDK (JS) | Standard library for reading and writing to Stellar and Soroban |
| State | Zustand | Lightweight global state with no boilerplate |
| Routing | React Router v6 | Standard SPA routing |
| Icons | Lucide React | Clean outline icons, tree-shakeable |

No backend server for MVP. Proof generation happens entirely client-side, and on-chain submission is signed directly by the connected wallet.

---

## ZK Integration Detail

### Circuit

```
// reserveProof.circom
pragma circom 2.0.0;
include "circomlib/comparators.circom";

template ReserveProof() {
    signal input balance;      // private: actual reserve balance
    signal input threshold;    // public: declared claim
    signal output isValid;     // public: 1 if balance >= threshold

    component gte = GreaterEqThan(64);
    gte.in[0] <== balance;
    gte.in[1] <== threshold;
    isValid <== gte.out;
}

component main {public [threshold]} = ReserveProof();
```

### Proof generation (client-side)

```typescript
/**
 * Generates a Groth16 proof that the issuer's balance meets the declared threshold.
 * The balance never leaves this function in plaintext form.
 * @param balance - the issuer's actual reserve balance, used only as a circuit input
 * @param threshold - the public threshold the issuer is claiming to meet
 * @returns the proof and public signals ready for on-chain submission
 */
async function generateReserveProof(balance: bigint, threshold: bigint) {
  const { proof, publicSignals } = await snarkjs.groth16.fullProve(
    { balance, threshold },
    '/circuits/reserveProof.wasm',
    '/circuits/reserveProof.zkey'
  )
  return { proof, publicSignals }
}
```

### On-chain submission

```typescript
/**
 * Submits a generated proof to the Soroban verifier contract.
 * @param proof - the Groth16 proof object
 * @param publicSignals - the public signals including the threshold and validity output
 * @param signer - the connected Stellar wallet signer
 * @returns the transaction hash once confirmed
 */
async function submitProofOnChain(proof: Groth16Proof, publicSignals: string[], signer: StellarSigner) {
  const tx = buildVerifyTransaction(proof, publicSignals)
  const signedTx = await signer.sign(tx)
  return submitTransaction(signedTx)
}
```

---

## App Pages and Routes

| Route | Page | Description |
|---|---|---|
| `/` | Landing | Marketing landing page. Wallet connection not required |
| `/app` | Dashboard | Overview of recent proof activity and quick-start action. Wallet required |
| `/app/issuers` | Issuers | Public, searchable wall of all verified issuers. No wallet required to view |
| `/app/verify` | Verify | Core flow: declare threshold, generate proof, submit on-chain. Wallet required |
| `/app/about` | About | Plain-language explanation of the circuit, links to repo and verifier contract |

---

## Environment Variables

```
VITE_STELLAR_NETWORK=testnet
VITE_STELLAR_RPC_URL=
VITE_SOROBAN_VERIFIER_ADDRESS=
VITE_STELLAR_HORIZON_URL=
```

---

## Data Structures

```typescript
interface IssuerVerification {
  issuerAddress: string
  asset: string
  threshold: string         // public claim, never the actual balance
  proofTxHash: string
  verifiedAt: number        // unix timestamp from on-chain block
  isStale: boolean          // true if past the re-verification interval
}

interface ProofSubmission {
  proof: Groth16Proof
  publicSignals: string[]   // includes threshold and isValid output, never the balance
  issuerAddress: string
}

interface Groth16Proof {
  pi_a: string[]
  pi_b: string[][]
  pi_c: string[]
  protocol: string
  curve: string
}
```

---

## What Is Not Being Built in MVP

- Multi-asset thresholds per single issuer
- Automated scheduled re-proofs
- A third-party API for querying verification status outside the public wall
- Regulator-facing audit export tooling
- Mobile app
- Notification system for stale proofs

These are deferred until after the hackathon if the product gains traction.

---

## Hackathon Build Priority

The deadline is Jul 3 2026, 18:00 UTC (extended). Judges score against ZK being load-bearing, Stellar integration depth, code quality and clarity of the demo.

Priority order:
1. Landing page live and deployed
2. Circuit compiling and proving correctly in isolation, tested outside the UI first
3. Wallet connection working via Stellar Wallets Kit
4. Proof generation working end-to-end in the browser
5. Soroban verifier deployed to testnet and accepting valid proofs
6. Verify page functional end-to-end
7. Issuer wall displaying real on-chain verification records

Everything else, including dashboard polish and re-verification staleness logic, ships after the core proof and verification loop is solid.
