/**
 * deploy-and-init.ts
 *
 * Deploys the verus_verifier contract (flat-argument, hardcoded-VK edition)
 * to Stellar testnet, initialises it with just the admin address (the VK is
 * compiled into the contract), and writes the new contract ID to .env.
 *
 * Usage:
 *   npx tsx scripts/deploy-and-init.ts
 *
 * Set DEPLOY_SECRET_KEY in env to reuse an existing funded keypair,
 * otherwise a fresh one is generated and funded from Friendbot.
 */

import {
  Keypair,
  Networks,
  TransactionBuilder,
  rpc,
  Operation,
  nativeToScVal,
  Address,
  xdr,
  Contract,
} from '@stellar/stellar-sdk'
import * as fs from 'fs'
import * as path from 'path'
import * as https from 'https'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')

const RPC_URL = 'https://soroban-testnet.stellar.org'
const FRIENDBOT_URL = 'https://friendbot.stellar.org'
const server = new rpc.Server(RPC_URL, { allowHttp: false })

// ── Utilities ─────────────────────────────────────────────────────────────────

function httpsGet(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = ''
      res.on('data', (chunk) => (data += chunk))
      res.on('end', () => resolve(data))
      res.on('error', reject)
    })
  })
}

async function fundAccount(publicKey: string): Promise<void> {
  console.log(`  Funding ${publicKey} via Friendbot…`)
  await httpsGet(`${FRIENDBOT_URL}?addr=${publicKey}`)
  console.log('  Funded ✓')
}

async function waitForTx(hash: string): Promise<rpc.Api.GetTransactionResponse> {
  for (let i = 0; i < 30; i++) {
    const result = await server.getTransaction(hash)
    if (result.status !== 'NOT_FOUND') return result
    await new Promise((r) => setTimeout(r, 2000))
  }
  throw new Error(`Transaction ${hash} did not confirm in time`)
}

async function buildSignSubmit(
  keypair: Keypair,
  buildOp: (account: rpc.Api.SorobanRpc.Account) => Promise<ReturnType<TransactionBuilder['build']>>,
): Promise<rpc.Api.GetTransactionResponse> {
  const account = await server.getAccount(keypair.publicKey())
  const tx = await buildOp(account)
  const prepared = await server.prepareTransaction(tx)
  prepared.sign(keypair)
  const send = await server.sendTransaction(prepared)
  if (send.status !== 'PENDING') throw new Error(`Send failed: ${send.status} — ${JSON.stringify(send)}`)
  const result = await waitForTx(send.hash)
  if (result.status !== 'SUCCESS') {
    throw new Error(`Transaction failed:\n${JSON.stringify(result, null, 2)}`)
  }
  return result
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  // 1. Deployer keypair
  let keypair: Keypair
  if (process.env.DEPLOY_SECRET_KEY) {
    keypair = Keypair.fromSecret(process.env.DEPLOY_SECRET_KEY)
    console.log(`Using provided keypair: ${keypair.publicKey()}`)
  } else {
    keypair = Keypair.random()
    console.log(`Generated deployer: ${keypair.publicKey()}`)
    console.log(`Secret (save this!): ${keypair.secret()}`)
    await fundAccount(keypair.publicKey())
    await new Promise((r) => setTimeout(r, 5000)) // wait for ledger close
  }

  // 2. Upload WASM
  const wasmPath = path.join(
    ROOT,
    'contracts', 'verus_verifier', 'target', 'wasm32v1-none', 'release',
    'verus_verifier_contract.wasm',
  )
  if (!fs.existsSync(wasmPath)) {
    console.error(`WASM not found at:\n  ${wasmPath}`)
    console.error('Run: cargo build --target wasm32v1-none --release  (inside contracts/verus_verifier/)')
    process.exit(1)
  }
  const wasm = fs.readFileSync(wasmPath)
  console.log(`\n[1/3] Uploading WASM (${wasm.length} bytes)…`)

  const uploadResult = await buildSignSubmit(keypair, async (account) =>
    new TransactionBuilder(account, { fee: '10000000', networkPassphrase: Networks.TESTNET })
      .addOperation(Operation.uploadContractWasm({ wasm }))
      .setTimeout(300)
      .build()
  )

  // Extract WASM hash from return value
  let wasmHash: Buffer
  try {
    wasmHash = Buffer.from((uploadResult.returnValue as xdr.ScVal).bytes())
  } catch {
    // Fallback: scan ledger changes
    const meta = xdr.TransactionMeta.fromXDR(uploadResult.resultMetaXdr!, 'base64')
    wasmHash = Buffer.alloc(32)
    outer:
    for (const op of meta.v3().operations()) {
      for (const change of op.changes()) {
        if (change.switch().name === 'ledgerEntryCreated') {
          const entry = change.created().data()
          if (entry.switch().name === 'contractCode') {
            wasmHash = Buffer.from(entry.contractCode().hash())
            break outer
          }
        }
      }
    }
  }
  console.log(`  WASM hash: ${wasmHash.toString('hex')} ✓`)

  // 3. Create contract instance
  console.log('\n[2/3] Creating contract instance…')
  const salt = Buffer.alloc(32)
  const saltStr = keypair.publicKey() + Date.now().toString()
  for (let i = 0; i < Math.min(32, saltStr.length); i++) salt[i] = saltStr.charCodeAt(i) & 0xff

  const createResult = await buildSignSubmit(keypair, async (account) =>
    new TransactionBuilder(account, { fee: '10000000', networkPassphrase: Networks.TESTNET })
      .addOperation(Operation.createCustomContract({
        wasmHash,
        address: Address.fromString(keypair.publicKey()),
        salt,
      }))
      .setTimeout(300)
      .build()
  )

  // Extract contract ID from return value
  let contractId: string
  try {
    contractId = Address.fromScVal(createResult.returnValue as xdr.ScVal).toString()
  } catch {
    const meta = xdr.TransactionMeta.fromXDR(createResult.resultMetaXdr!, 'base64')
    contractId = ''
    outer:
    for (const op of meta.v3().operations()) {
      for (const change of op.changes()) {
        if (change.switch().name === 'ledgerEntryCreated') {
          const entry = change.created().data()
          if (entry.switch().name === 'contractData') {
            try {
              contractId = Address.contract(
                entry.contractData().contract().contractId()
              ).toString()
              break outer
            } catch {}
          }
        }
      }
    }
    if (!contractId) throw new Error('Could not determine contract ID from ledger changes')
  }
  console.log(`  Contract ID: ${contractId} ✓`)

  // 4. Initialise — just the admin address; VK is hardcoded in the contract
  console.log('\n[3/3] Initialising contract (admin only, VK is hardcoded)…')
  const contract = new Contract(contractId)
  const adminScVal = nativeToScVal(new Address(keypair.publicKey()))

  await buildSignSubmit(keypair, async (account) =>
    new TransactionBuilder(account, { fee: '10000000', networkPassphrase: Networks.TESTNET })
      .addOperation(contract.call('initialize', adminScVal))
      .setTimeout(300)
      .build()
  )
  console.log('  Initialised ✓')

  // 5. Print summary and auto-patch .env
  console.log('\n╔══════════════════════════════════════════════════════════════╗')
  console.log('║  Deployment complete!                                        ║')
  console.log(`║  Contract ID: ${contractId}  ║`)
  console.log('╚══════════════════════════════════════════════════════════════╝')

  const envPath = path.join(ROOT, '.env')
  if (fs.existsSync(envPath)) {
    let envContent = fs.readFileSync(envPath, 'utf8')
    const key = 'VITE_SOROBAN_VERIFIER_ADDRESS'
    if (envContent.includes(`${key}=`)) {
      envContent = envContent.replace(new RegExp(`${key}=.*`), `${key}=${contractId}`)
    } else {
      envContent += `\n${key}=${contractId}\n`
    }
    fs.writeFileSync(envPath, envContent)
    console.log('\n.env updated:')
    console.log(`  ${key}=${contractId}`)
  } else {
    console.log('\nAdd to your .env:')
    console.log(`  VITE_SOROBAN_VERIFIER_ADDRESS=${contractId}`)
  }
}

main().catch((err) => {
  console.error('\nDeployment failed:', err?.message ?? err)
  process.exit(1)
})
