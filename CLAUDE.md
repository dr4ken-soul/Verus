# Verus — Agent Context

## What This Is

Verus lets any Stellar issuer prove their reserves exceed a threshold on-chain without revealing what they actually hold.

Built for the Stellar Hacks: Real-World ZK hackathon, Jun 15 to Jul 3 2026 (extended deadline 2026/07/03 18:00 UTC). Single open innovation track, $10,000 prize pool split across top five.

---

## One-Line Pitch

Verus lets any Stellar issuer prove their reserves exceed a threshold on-chain without revealing what they actually hold.

---

## MVP Features

1. Issuer onboarding — connect a Stellar wallet, declare a public threshold claim (for example "at least 500,000 USDC")
2. Proof generation — a Circom range proof circuit runs client-side comparing actual balance against the declared threshold, producing a Groth16 proof without exposing the balance itself
3. On-chain verification — a Soroban smart contract verifies the Groth16 proof on Stellar and records the verification result and timestamp
4. Public issuer wall — anyone can browse verified issuers, see their threshold claim, verification status and proof age, without ever seeing the underlying balance
5. Re-verification — issuers can generate a fresh proof at any time to keep their verification current; stale proofs are flagged after a set interval

Post-hackathon: multi-asset thresholds per issuer, scheduled automatic re-proofs, an API for third parties to query verification status, audit export for regulators.

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite + TypeScript |
| Styling | Tailwind CSS v3 |
| Animations | Framer Motion |
| Wallet connection | Stellar Wallets Kit |
| ZK circuit | Circom 2.0 |
| Proof system | Groth16 (snarkjs, client-side proof generation) |
| On-chain verifier | Soroban Groth16 verifier (stellar/soroban-examples base) |
| Chain interaction | Stellar SDK (JS) |
| State management | Zustand |
| Routing | React Router v6 |
| Icons | Lucide React |

No backend server required for MVP. Proof generation happens client-side in the browser. The wallet signs the verification transaction directly to the Soroban contract.

---

## Project Structure

```
verus/
├── public/
│   ├── images/
│   │   └── hero-sphere.webp         (hero image — user provides)
│   ├── logo.svg                     (logo — user provides, plain comment slot until then)
│   └── favicon.ico                  (favicon — user provides, plain comment slot until then)
├── circuits/
│   ├── reserveProof.circom          (the range proof circuit)
│   ├── reserveProof.zkey            (generated proving key)
│   └── verification_key.json
├── contracts/
│   └── groth16_verifier/            (forked from stellar/soroban-examples)
├── src/
│   ├── components/
│   │   ├── ui/
│   │   │   ├── FadeIn.tsx
│   │   │   ├── BlurText.tsx
│   │   │   └── GrainOverlay.tsx
│   │   ├── layout/
│   │   │   ├── GhostNav.tsx
│   │   │   └── AppNav.tsx
│   │   └── sections/
│   │       ├── Hero.tsx
│   │       ├── ProofStatement.tsx
│   │       ├── IssuerWall.tsx
│   │       ├── TrustEquation.tsx
│   │       ├── ProtocolStrip.tsx
│   │       └── TerminalCta.tsx
│   ├── pages/
│   │   ├── Landing.tsx
│   │   ├── Dashboard.tsx
│   │   ├── Issuers.tsx
│   │   ├── Verify.tsx
│   │   └── About.tsx
│   ├── hooks/
│   │   ├── useReserveProof.ts
│   │   ├── useSorobanVerifier.ts
│   │   └── useStellarWallet.ts
│   ├── lib/
│   │   ├── circuit.ts                (snarkjs proof generation helpers)
│   │   ├── stellar.ts                (Stellar SDK config and helpers)
│   │   └── utils.ts
│   ├── store/
│   │   └── useAppStore.ts            (Zustand global state)
│   ├── types/
│   │   └── index.ts
│   ├── styles/
│   │   └── globals.css
│   ├── App.tsx
│   └── main.tsx
├── index.html
├── package.json
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── .env.example
```

---

## Design System

All design decisions are confirmed across seven gates. Do not deviate from these values.

**Aesthetic:** Dark editorial

**Fonts:**
- Display: Fraunces (variable serif, optical sizing)
- Body: Barlow
- Mono: JetBrains Mono

Load via Google Fonts:
```html
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;0,9..144,600;1,9..144,300&family=Barlow:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
```

**Colour palette — Platinum Steel:**
```css
--bg-primary:     #08090f;
--bg-secondary:   #0e0f18;
--bg-surface:     #14151f;
--bg-elevated:    #1c1d2a;
--accent:         #c2cfe0;
--accent-hover:   #dde6f4;
--accent-glow:    rgba(194, 207, 224, 0.10);
--accent-dim:     #5a6a80;
--text-primary:   #eaecf2;
--text-secondary: #7a8098;
--text-muted:     #3a3f58;
--border-subtle:  rgba(255, 255, 255, 0.04);
--border-default: rgba(255, 255, 255, 0.08);
--success:        #22c55e;
--error:          #ef4444;
```

**Nav:**
- Landing: ghost nav floating transparently over the hero. Verus wordmark left, Connect Wallet right. No background, no blur, no border. Sits directly on the hero image
- App interior: minimal top bar with tabs. Wordmark and wallet status left, four tab links right (Dashboard, Issuers, Verify, About)

**Background:**
- Landing hero: full-bleed premium static image (Black Murano Glass Sphere style) with a coded animated geometric grid overlay at low opacity, plus a dark gradient bleeding from the left edge to roughly 50 percent across
- App interior: static atmospheric. Near-black base with faint grain and a subtle radial glow behind the main content area, no motion

**Liquid glass classes** (defined in globals.css, not Tailwind):
```
.liquid-glass
.liquid-glass-strong
.liquid-glass-dark
```

**Noise grain** (applied via body::after pseudo-element in globals.css, app interior only):
```css
body::after {
  content: '';
  position: fixed;
  inset: 0;
  z-index: 9999;
  pointer-events: none;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  background-size: 128px 128px;
  opacity: 0.035;
}
```

---

## Landing Page Sections (in order)

1. Hero — full-bleed 16:9 image, bottom-left anchored copy, ghost nav, geometric grid overlay at low opacity
2. The proof statement — one large full-width Fraunces sentence stating exactly what Verus proves, with a CSS-drawn annotation marking what is public versus what stays private
3. Issuer wall — live-looking grid of verified issuers showing threshold claimed, verification badge and proof age
4. Trust equation — two dark panels side by side. Left: what anyone can see. Right: what no one sees. The contrast carries the message
5. Protocol strip — three compact columns: Circom circuit, Groth16 proof, Stellar verifier, one sentence each
6. Terminal CTA — a terminal-style mock input showing a proof being generated, Generate Proof button below it

## App Interior Pages

- `/app` — dashboard: stat cards, recent proof activity, quick-start Generate Proof button
- `/app/issuers` — searchable table of all verified issuers with threshold, status badge and last verified date
- `/app/verify` — core flow: wallet connect, threshold input, proof generation, on-chain submission, confirmation
- `/app/about` — what Verus is, how the circuit works in plain language, links to the open-source repo and Stellar verifier contract

---

## Logo and Favicon

No logo or favicon exists yet. Leave both as plain text comment slots:

```tsx
{/* Logo slot: replace with public/logo.svg once provided */}
```

```html
<!-- Favicon slot: replace with public/favicon.ico once provided -->
```

Never substitute a hardcoded placeholder, an AI-generated icon symbol or an emoji in either slot.

---

## ZK Circuit Design

The Circom circuit takes the issuer's actual reserve balance as a private input and the declared threshold as a public input. It outputs a single boolean signal proving `balance >= threshold` without revealing `balance`. This is a standard range proof using a comparator built from bit decomposition, the same pattern used in the Nethermind Stellar Private Payments PoC.

```
circuit ReserveProof {
  signal input balance;      // private
  signal input threshold;    // public
  signal output isValid;     // public, 1 if balance >= threshold

  component gte = GreaterEqThan(64);
  gte.in[0] <== balance;
  gte.in[1] <== threshold;
  isValid <== gte.out;
}
```

The proof is generated entirely in the browser via snarkjs. The balance itself never leaves the issuer's device in any form, plaintext or otherwise. Only the proof and the public threshold are sent to the Soroban contract.

---

## Code Rules (follow without exception)

**TypeScript / React:**
- camelCase for all variables and functions
- JSDoc comments on every function and custom hook
- No inline styles unless a CSS variable or dynamic value requires it. Use Tailwind for layout and spacing
- CSS variables from the design system used directly, never hardcoded hex values in components
- No hardcoded placeholder logos, favicons or icon symbols anywhere. Logo and favicon are provided by the user and placed in public/, referenced only via src path with a comment marking the slot
- No AI-generated icon symbols or emoji used as visual accents anywhere

**Writing rules (apply to all frontend copy, labels, comments, dashboard text, code comments, JSDoc):**
- British English throughout
- No em dashes anywhere
- Periods only when necessary
- Commas only when necessary
- Short direct sentences that flow naturally and connect to the surrounding copy
- No filler phrases: no "seamlessly", "leverage", "powerful", "robust", "cutting-edge", "unlock"
- Dashboard labels are short and precise: "Issuers", "Proofs verified", "Last proof", "Status"
- CTA text is direct: "Generate proof", "Connect wallet", "View issuer", "Re-verify"
- Error messages are plain and helpful: "Could not verify proof on-chain. Check your wallet connection and try again"
- Empty states are honest: "No issuers verified yet. Be the first to generate a proof"

**Component rules:**
- CSS class-based hover states only. No inline JS onMouseEnter or onMouseLeave handlers
- Framer Motion for all entrance animations. No CSS keyframes for entrance effects
- Blur-in entrance: `initial={{ opacity: 0, filter: 'blur(8px)', y: 20 }}` with `animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}`
- Stagger sequences via Framer Motion `staggerChildren` on container, `delayChildren` for offset
- Loading states use skeleton shimmer, not spinners

**Never do these:**
- Never add a logo, favicon or brand mark that the user has not provided
- Never hardcode wallet addresses
- Never write a verification record before the on-chain transaction confirms
- Never use `console.log` in production paths, use a `logger` utility instead
- Never expose the actual balance value anywhere in the frontend, console, network tab or stored state

---

## Hackathon Checklist

- Project name: Verus
- Hackathon: Stellar Hacks: Real-World ZK
- Track: single open innovation track
- Submission deadline: Jul 3 2026, 18:00 UTC (extended)
- Public repo required with README and demo video, 2 to 3 minutes
- ZK must be load-bearing: the range proof is the entire mechanism, not a bolt-on
- Demo must show the full flow: connect wallet, declare threshold, generate proof, verify on-chain, appear on the issuer wall
