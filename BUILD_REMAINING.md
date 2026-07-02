# Verus — Remaining Build Tasks

Read `docs/CLAUDE.md`, `docs/APP_BLUEPRINT.md`, `docs/BUILD_GUIDE.md` and `docs/FRONTEND_SPEC.md` before doing anything. Every decision in those files is final and locked. Follow them without deviation.

---

## Context: What Is Already Done

The following are complete and must not be touched or regenerated:

- The full React 18 + Vite + TypeScript frontend with all five pages and all six landing sections, type-checked and production-built clean
- The Circom 2.0 `circuits/reserveProof.circom` circuit, compiled with circom 2.2.3, proven against real witness data for both a passing case and a failing case, and confirmed with `snarkjs groth16 verify`
- The compiled circuit artifacts already in `public/circuits/`: `reserveProof.wasm`, `reserveProof.zkey`, `verification_key.json`. These are real, working files
- The Soroban verifier contract source in `contracts/verus_verifier/src/lib.rs` and the test file in `contracts/verus_verifier/src/test.rs`. Both are correctly written using BN254 host functions and real circuit values. They just have not been compiled or run yet
- The five planning documents in `docs/`

---

## What Needs to Be Done

Work through these in the exact order listed. Each step depends on the previous one being complete.

---

### Step 1: Install Rust and Stellar CLI

The Soroban contract requires a Rust toolchain and the Stellar CLI. Install them:

```bash
# Install Rust via rustup
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source "$HOME/.cargo/env"

# Add the wasm32 target needed to compile Soroban contracts
rustup target add wasm32v1-none

# Install the Stellar CLI
cargo install --locked stellar-cli --features opt
```

Confirm both are working:

```bash
rustc --version
stellar --version
```

---

### Step 2: Build and Test the Soroban Contract

```bash
cd contracts/verus_verifier
cargo test
```

**If `cargo test` passes:** move to Step 3.

**If `cargo test` fails with a pairing check error despite the proof inputs looking correct:** there is one flagged point of potential misalignment in `src/test.rs` documented in `contracts/verus_verifier/README.md`. The G2 coordinate ordering from snarkjs may need to be swapped. In `src/test.rs`, find the `g2_from_decimal` function calls inside `verus_verification_key` and `proof_balance_meets_threshold` and swap each `(x_c0, x_c1, y_c0, y_c1)` argument pair to `(x_c1, x_c0, y_c1, y_c0)`. Re-run `cargo test` and it should pass.

Do not proceed to Step 3 until `cargo test` passes.

---

### Step 3: Deploy the Contract to Stellar Testnet

```bash
# Fund a testnet identity for deployment (one-time setup)
stellar keys generate deployer --network testnet
stellar keys fund deployer --network testnet

# Build the contract wasm
cd contracts/verus_verifier
stellar contract build

# Deploy to testnet
stellar contract deploy \
  --wasm target/wasm32v1-none/release/verus_verifier_contract.wasm \
  --source deployer \
  --network testnet
```

The deploy command will return a contract ID. It looks like `CXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX`. Copy it.

---

### Step 4: Initialise the Contract

The contract must be initialised once before it can accept any proofs. Use the `initialize` function to set the admin and the fixed verification key.

The verification key values are in `circuits/verification_key.json`. You will need to pass them in the format the contract expects. Check `contracts/verus_verifier/src/test.rs` for the exact field mapping, specifically `verus_verification_key()`, which shows how each JSON field maps to the contract's `VerificationKey` struct.

```bash
stellar contract invoke \
  --id <YOUR_DEPLOYED_CONTRACT_ID> \
  --source deployer \
  --network testnet \
  -- initialize \
  --admin <YOUR_DEPLOYER_ADDRESS> \
  --vk <VERIFICATION_KEY_AS_JSON>
```

If the Stellar CLI does not accept the struct directly via the command line, write a small TypeScript invocation script using the Stellar SDK instead, using the same encoding pattern that is already in `src/lib/stellar.ts`.

---

### Step 5: Update the Environment File

Once the contract is deployed and initialised, update `.env` (copy from `.env.example` if it does not exist yet):

```
VITE_STELLAR_NETWORK=testnet
VITE_STELLAR_RPC_URL=https://soroban-testnet.stellar.org
VITE_STELLAR_HORIZON_URL=https://horizon-testnet.stellar.org
VITE_SOROBAN_VERIFIER_ADDRESS=<YOUR_DEPLOYED_CONTRACT_ID>
```

---

### Step 6: Add the Hero Image

The hero image has been designed but not yet generated. The user will run the following Google Flow prompt with the Black Murano Glass Sphere image attached as a reference, with the generation aspect ratio set to 16:9 in the settings:

"Recreate this exact sphere, keep the same material, reflections and lighting. Reposition it to sit right-of-centre in the frame, vertically centred with slight headroom above. Keep the lower-left area dark and empty with no bright reflections, suitable for text overlay over a near-black background extending in from the left edge."

Once the image is generated, the user will provide it. Place it at:

```
public/images/hero-sphere.webp
```

Do not use any placeholder, generated or AI-slop image. Do not add any other visual asset that the user has not explicitly provided. The landing page hero falls back to a solid dark surface colour until the real file is placed, which is correct behaviour.

---

### Step 7: Add Logo and Favicon

The user will design and provide both of these separately. When provided, place them at:

```
public/logo.svg
public/favicon.ico
```

The code already has comment slots marking exactly where each is referenced. Nothing else in the codebase needs to change. Do not create placeholder icons, emojis or AI-generated symbols for either.

---

### Step 8: Update the About Page GitHub Link

In `src/pages/About.tsx` there is a placeholder comment marking the GitHub link:

```tsx
{/* Repo link slot: update with the actual public GitHub repository URL before submission */}
```

Replace the `href="https://github.com"` with the actual public repository URL once the repo is created in Step 9.

---

### Step 9: Create the GitHub Repository and Push

The hackathon requires a public GitHub, GitLab or Bitbucket repository.

```bash
git init
git add .
git commit -m "initial verus submission"
git branch -M main
git remote add origin <YOUR_NEW_REPO_URL>
git push -u origin main
```

Make sure `.gitignore` is respected and `node_modules`, `dist`, `.env` (not `.env.example`) and the large `.ptau` files are not pushed.

---

### Step 10: Update the README Status Section

Once Steps 1 through 5 are complete and the contract is deployed and confirmed working, update the "Status of this submission" section in `README.md`. Remove the paragraph that says the Soroban contract has not been compiled or tested. Replace it with a clear statement of what was verified and when, including the deployed contract address so judges can inspect it on-chain directly.

This update matters for the submission because the judges score on ZK being genuinely load-bearing and on the clarity of the demo story. A README that still says the contract was not tested after it has been deployed and tested undercuts the submission unnecessarily.

---

### Step 11: Test the Full End-to-End Flow

Before recording anything:

1. Run `npm install && npm run dev`
2. Open the app in a browser
3. Connect a Stellar testnet wallet (Freighter with testnet mode on)
4. Go to the Verify page
5. Enter a name, asset (USDC), a threshold and a balance above the threshold
6. Click Generate proof. This runs the Circom circuit in the browser via snarkjs. It takes several seconds. The loading state should show during this time
7. Once the proof appears as valid, click Submit on-chain
8. Approve the transaction in Freighter
9. Confirm the on-chain transaction confirms and the success state appears with a link to the transaction
10. Go to the Issuers page and confirm the new issuer appears

Fix any issues discovered here before the demo video.

---

### Step 12: Record the Demo Video

The demo must be 2 to 3 minutes. Follow the exact flow in `docs/MARKETING.md` under Demo video flow:

1. Open the Verus landing page and show the hero, sections and how the terminal CTA looks
2. Connect a Stellar testnet wallet
3. Enter a threshold claim and a balance, generate a proof in the browser, show the proof generation completing
4. Submit the proof, show the Soroban transaction confirming
5. Open the issuer wall, show the new verification appearing with status and proof age
6. Briefly show the About page and point to the deployed contract address

Explain briefly in a voiceover or text overlay what the ZK proof is doing. Specifically: that the balance never leaves the browser and the on-chain record only contains the threshold, status and timestamp.

---

### Step 13: Submit on DoraHacks

Go to: https://dorahacks.io/hackathon/stellar-hacks-zk/detail

Click "Submit BUIDL" before July 3 2026, 18:00 UTC (the extended deadline).

Required fields:
- Project name: Verus
- Tagline: Prove your reserves. Reveal nothing.
- GitHub repository: your public repo URL from Step 9
- Demo video: upload the recording from Step 12 or paste a YouTube/Loom link
- Project description: use the description from `docs/MARKETING.md` under Submission Notes

---

## Writing Rules

Apply these to every file you create or modify without exception. British English throughout. No em dashes anywhere. Periods and commas only when necessary. Short direct sentences. No filler phrases such as seamlessly, leverage, powerful, robust or cutting-edge. No AI-generated placeholder icons, symbols or images anywhere.

These rules apply to code comments, JSDoc, dashboard labels, button text, error messages, landing copy and every other piece of text output without exception.
