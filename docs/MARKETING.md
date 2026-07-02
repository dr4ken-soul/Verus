# Verus — Marketing Plan

## Goal

Keep Verus visible during the Stellar Hacks ZK window without sounding like a pitch deck.

The story is simple: an issuer should be able to prove solvency without showing their hand. Verus makes that possible using a Circom range proof verified on a Soroban contract. Every post proves the product works, not that the idea is interesting.

Core proof to show in public: a real proof generated in the browser, a real Soroban verification transaction, and the issuer wall updating with the result.

---

## Posting Style

- all lowercase
- builder voice, not company voice
- one clear idea per post
- short lines with space between thoughts
- show what works, do not explain what you plan to build
- screenshots or screen recordings whenever possible

---

## Post Plan

### post 1 — project announcement

```
building verus for stellar hacks real world zk

the idea: an issuer should be able to prove they hold enough reserves without showing the actual number

a circom circuit checks balance against a threshold and outputs one bit, yes or no

a soroban contract verifies that proof on stellar

the balance never leaves the browser
```

Attach a screenshot of the landing page hero once it is deployed.

---

### post 2 — first working proof

```
verus just verified its first proof on stellar testnet

typed in a threshold claim, generated a groth16 proof in the browser, submitted it to the soroban verifier

it checked out and the issuer wall updated with the verification

nobody including me can see the actual balance, only that it cleared the bar
```

Attach a screen recording of the proof generation and the on-chain confirmation.

---

### post 3 — final submission

```
submitted verus to stellar hacks real world zk

a proof of reserves portal where issuers prove solvency without revealing what they hold

circom builds the range proof
groth16 keeps it cheap to verify
soroban checks it on stellar, fully on-chain

the issuer wall shows every verified claim, never the underlying numbers

repo and demo in the submission
```

Attach the repo link and a 2 to 3 minute demo video showing the full flow end to end.

---

## Submission Notes

**Project title:** Verus

**Tagline:** Prove your reserves. Reveal nothing.

**Built with:**
- Circom
- Groth16 (snarkjs)
- Soroban
- Stellar SDK
- Stellar Wallets Kit
- React 18
- TypeScript
- Vite
- Framer Motion
- Tailwind CSS

**Project description (under 200 words):**

Verus lets any Stellar issuer prove their reserves exceed a declared threshold without revealing the actual figure. An issuer connects their wallet, states a public claim such as "at least 500,000 USDC", and a Circom range proof circuit running in their browser generates a Groth16 proof that the balance meets that claim. The balance itself never leaves the device in any form.

A Soroban smart contract verifies the proof on-chain and records the result with a timestamp. The public issuer wall lets anyone browse verified issuers, see their threshold claim and proof age, and independently confirm the on-chain record, all without trusting Verus as an intermediary or ever seeing the underlying balance.

ZK does the entire mechanism here. Remove the circuit and there is no verification, only an unverifiable claim on a page. Built for stablecoin issuers, RWA platforms and DeFi protocols who need a continuous, cryptographically backed solvency signal that costs nothing beyond gas to refresh.

**Demo video flow:**
1. Open the Verus landing page
2. Connect a Stellar wallet
3. Enter a threshold claim and a balance, generate a proof in the browser
4. Submit the proof, show the Soroban transaction confirming
5. Open the issuer wall, show the new verification appearing with status and proof age
6. Briefly explain on the About page what stays private and what does not

---

## Checklist

- [ ] Landing page live and screenshot-ready before post 1
- [ ] Circuit tested and proving correctly in isolation before post 2
- [ ] Soroban verifier deployed to testnet and accepting real proofs before post 2
- [ ] Post 1 goes out early in the build window
- [ ] Post 2 goes out once the first real on-chain verification succeeds
- [ ] Post 3 goes out at submission
- [ ] Repo is public before any post goes out
- [ ] Demo video under three minutes
