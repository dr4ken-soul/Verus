# Verus — Build Guide

## Hackathon Timeline

| Date | Milestone |
|---|---|
| Jun 29, 12:00 PST | Original submission deadline |
| Jul 3, 18:00 UTC | Extended submission deadline |

This guide assumes roughly four days from today to the extended deadline. Adjust day numbers if your actual start date differs, the sequence stays the same regardless of which agent or IDE you build with.

---

## Environment Setup

```bash
npm create vite@latest verus -- --template react-ts
cd verus
npm install
npm install tailwindcss @tailwindcss/vite
npm install framer-motion
npm install zustand
npm install react-router-dom
npm install lucide-react
npm install @stellar/stellar-sdk
npm install @creit.tech/stellar-wallets-kit
npm install snarkjs
npm install -D circom_runtime
npx tailwindcss init -p
```

Circom itself is installed separately as a Rust binary, not an npm package:

```bash
curl --proto '=https' --tlsv1.2 https://sh.rustup.rs -sSf | sh
git clone https://github.com/iden3/circom.git
cd circom && cargo build --release && cargo install --path circom
```

Create `.env` from `.env.example` and fill in Stellar testnet values before any contract calls are made.

Stellar testnet RPC: `https://soroban-testnet.stellar.org`
Stellar testnet Horizon: `https://horizon-testnet.stellar.org`

---

## Day 1: Circuit First, Not Frontend First

**Goal:** A working, tested Circom circuit before any UI exists.

This is the one place where the usual frontend-first build order is wrong. The proof is the entire product. If the circuit does not work, nothing downstream matters.

### Step 1: Write and compile the circuit

Build `circuits/reserveProof.circom` per the design in APP_BLUEPRINT.md. Compile it:

```bash
circom reserveProof.circom --r1cs --wasm --sym
```

### Step 2: Trusted setup (testnet, Groth16)

```bash
snarkjs powersoftau new bn128 14 pot14_0000.ptau
snarkjs powersoftau contribute pot14_0000.ptau pot14_final.ptau
snarkjs groth16 setup reserveProof.r1cs pot14_final.ptau reserveProof_0000.zkey
snarkjs zkey contribute reserveProof_0000.zkey reserveProof.zkey
snarkjs zkey export verificationkey reserveProof.zkey verification_key.json
```

### Step 3: Test the proof in isolation

Write a small Node script that generates a proof for `balance = 750000, threshold = 500000` and confirms `isValid = 1`. Then test the failure case where `balance = 300000, threshold = 500000` and confirm the circuit either fails to produce a valid proof or `isValid = 0` depending on how the comparator is wired. Do this before touching the frontend at all.

### Step 4: Fork and review the Soroban verifier

Clone `stellar/soroban-examples`, locate the `groth16_verifier` directory, and review how it expects the proof and public signals to be formatted. The format must match exactly what snarkjs outputs, this is the most common point of friction in this stack.

---

## Day 2: Frontend Scaffold and Landing Page

**Goal:** A live, deployed landing page that looks complete.

### Step 1: Project scaffold

Set up the folder structure from CLAUDE.md. Configure Tailwind with the design tokens from FRONTEND_SPEC.md. Add fonts to `index.html`. Add CSS variables and liquid glass classes to `globals.css`.

### Step 2: Ghost nav

Build `GhostNav.tsx`. Verus wordmark left, Connect Wallet button right, no background, no border, floats directly on the hero image.

```tsx
/**
 * Ghost navigation bar for the landing page.
 * Floats transparently over the hero with no background or border.
 */
export function GhostNav() {
  return (
    <nav className="fixed top-0 inset-x-0 z-50 px-8 py-6">
      <div className="flex items-center justify-between max-w-6xl mx-auto">
        {/* Logo slot: replace with public/logo.svg once provided */}
        <span className="font-display text-xl text-[var(--text-primary)] tracking-tight">Verus</span>
        <button className="liquid-glass rounded-full px-5 py-2.5 text-sm font-body
          text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors">
          Connect wallet
        </button>
      </div>
    </nav>
  )
}
```

### Step 3: Hero section

Build `Hero.tsx`. Full-bleed image at 16:9, dark gradient bleeding from the left edge to roughly 50 percent across, copy anchored bottom-left.

Stagger sequence:
- Badge chip: delay 0.3s
- Headline (Fraunces, large, tight leading): delay 0.4s
- Subline: delay 0.7s
- CTA button: delay 1.0s

Place the hero image at `public/images/hero-sphere.webp`. Until the real asset is placed, use a `bg-[var(--bg-surface)]` placeholder div at the correct aspect ratio.

### Step 4: Proof statement section

Build `ProofStatement.tsx`. One large full-width Fraunces sentence, no bullets, no numbered steps. Add a CSS-drawn annotation beside it (a thin connecting line and small label) marking what is public versus what stays private.

### Step 5: Issuer wall section

Build `IssuerWall.tsx`. A grid of issuer cards showing threshold claimed, verification badge and proof age. Use realistic placeholder data during development, never generic names like "Issuer A" or round numbers like "1,000,000".

### Step 6: Trust equation section

Build `TrustEquation.tsx`. Two dark panels side by side. Left panel lists what is publicly visible. Right panel lists what stays hidden. No connecting copy needed, the contrast does the work.

### Step 7: Protocol strip

Build `ProtocolStrip.tsx`. Three compact columns in JetBrains Mono labels: Circom circuit, Groth16 proof, Stellar verifier. One sentence of body copy per column.

### Step 8: Terminal CTA

Build `TerminalCta.tsx`. A terminal-style mock input box showing a simulated proof generation sequence, with a Generate Proof button below leading into the app.

### Step 9: Deploy

Deploy to Vercel. Push the public repo to GitHub with a README explaining what Verus is, how the circuit works and how to run it locally, being honest about anything still rough or using mock data, per the hackathon's own submission guidance.

---

## Day 3: Wallet Connection and Proof Generation

**Goal:** A real wallet connection and a working end-to-end proof generated in the browser.

### Step 1: Stellar Wallets Kit setup

Set up `src/lib/stellar.ts` with the Stellar Wallets Kit configuration for testnet.

```typescript
/**
 * Stellar Wallets Kit configuration for Verus.
 * Supports Freighter and other Stellar-compatible wallets on testnet.
 */
import { StellarWalletsKit, WalletNetwork, allowAllModules } from '@creit.tech/stellar-wallets-kit'

export const walletKit = new StellarWalletsKit({
  network: WalletNetwork.TESTNET,
  modules: allowAllModules(),
})
```

### Step 2: App nav

Build `AppNav.tsx`. Minimal top bar: Verus wordmark left, wallet address shortened and displayed centre-left, four tab links right (Dashboard, Issuers, Verify, About). Active tab underlined in `--accent`.

### Step 3: Proof generation hook

Build `src/hooks/useReserveProof.ts` implementing `generateReserveProof` from APP_BLUEPRINT.md. Confirm in the browser console (development only, never in production) that no balance value is logged anywhere.

### Step 4: Verify page

Build `Verify.tsx`. Threshold input, balance input (manual entry for testnet phase), Generate Proof button, proof status display, Submit On-Chain button once a valid proof exists.

### Step 5: Test the full generate-and-submit cycle

Generate a real proof in the browser, submit it to the Soroban verifier on testnet, confirm the transaction succeeds and the verification record appears on-chain. This is the single most important technical proof for the judges.

---

## Day 4: Issuer Wall, Dashboard, Final Polish

**Goal:** A complete demo flow ready for submission.

### Step 1: Issuers page

Build `Issuers.tsx`. Query the Soroban contract for all verification records. Display as a searchable table: issuer address, asset, threshold, status, last verified date. Each row links to the on-chain transaction.

### Step 2: Dashboard page

Build `Dashboard.tsx`. Stat cards in liquid-glass-strong style: total issuers verified, proofs generated this week, average proof age. A "Recent activity" list below. A large Generate Proof CTA.

### Step 3: About page

Build `About.tsx`. Plain-language explanation of the circuit, what gets proven, what stays private, links to the public repo and the deployed Soroban verifier address.

### Step 4: Final checks before submission

- Landing page deployed and live
- Wallet connection working on testnet
- Proof generation confirmed working with no balance leakage anywhere in the network tab or console
- Soroban verifier deployed and accepting real proofs
- Issuer wall showing at least one real on-chain verification
- GitHub repo public with a clear README, mock data clearly labelled if any remains
- Demo video recorded, 2 to 3 minutes, showing the full flow and clearly explaining what the ZK proof is doing

---

## Common Issues

**Circuit compiles but proof verification fails on-chain:**
The most common cause is a mismatch between how snarkjs formats the proof object and what the Soroban verifier contract expects as call arguments. Compare the exact field ordering and encoding against the verifier's test fixtures before assuming the circuit itself is wrong.

**Wallet will not sign the verification transaction:**
Confirm the wallet is set to the Stellar testnet, not mainnet, and that the Soroban verifier address in `.env` matches the actually deployed contract address.

**Proof generation is slow in the browser:**
This is expected with Groth16 client-side proving on lower-powered devices. Add a clear loading state with a progress message rather than letting the UI appear frozen.

**Hero image not appearing:**
Confirm the file sits at `public/images/hero-sphere.webp`. Vite serves the public folder at the root, so the src path in the component is `/images/hero-sphere.webp`.
