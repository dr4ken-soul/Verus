/**
 * Deploys the verus_verifier Soroban contract to Stellar testnet.
 *
 * Requires @stellar/stellar-sdk v13+ (Protocol 23 compatible).
 * Install with: npm install @stellar/stellar-sdk@latest --ignore-scripts
 *
 * Usage (PowerShell from project root):
 *   $env:DEPLOYER_SECRET = "SXXX..."
 *   npx tsx scripts/deploy-contract.ts
 */

import {
  rpc,
  TransactionBuilder,
  Networks,
  Keypair,
  Operation,
  StrKey,
  hash,
  xdr,
} from '@stellar/stellar-sdk'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const RPC_URL = 'https://soroban-testnet.stellar.org'
const NETWORK = Networks.TESTNET
const ADMIN_SECRET = process.env.DEPLOYER_SECRET ?? ''

if (!ADMIN_SECRET) {
  console.error('DEPLOYER_SECRET is not set.')
  process.exit(1)
}

/** Poll until a submitted transaction reaches a terminal state. */
async function waitForTx(server: rpc.Server, txHash: string) {
  let res = await server.getTransaction(txHash)
  while (res.status === rpc.Api.GetTransactionStatus.NOT_FOUND) {
    await new Promise((r) => setTimeout(r, 2000))
    res = await server.getTransaction(txHash)
  }
  return res
}

async function withRetry<T>(label: string, fn: () => Promise<T>, attempts = 3): Promise<T> {
  for (let i = 1; i <= attempts; i++) {
    try {
      return await fn()
    } catch (e) {
      if (i === attempts) throw e
      console.log(`  ${label} attempt ${i} failed: ${(e as Error).message}. Retrying in 3s...`)
      await new Promise((r) => setTimeout(r, 3000))
    }
  }
  throw new Error('unreachable')
}

async function main() {
  const wasmPath = path.join(
    __dirname,
    '..',
    'contracts',
    'verus_verifier',
    'target',
    'wasm32v1-none',
    'release',
    'verus_verifier_contract.wasm'
  )

  if (!fs.existsSync(wasmPath)) {
    console.error('WASM not found at:', wasmPath)
    process.exit(1)
  }

  const wasm = fs.readFileSync(wasmPath)
  console.log(`WASM size: ${wasm.length} bytes`)

  const keypair = Keypair.fromSecret(ADMIN_SECRET)
  const adminAddress = keypair.publicKey()
  console.log('Deployer address:', adminAddress)

  const server = new rpc.Server(RPC_URL)

  // ── Step 1: Upload WASM ────────────────────────────────────────────────────
  console.log('\nStep 1: Uploading WASM bytecode...')

  const account1 = await withRetry('getAccount', () => server.getAccount(adminAddress))
  console.log('  Sequence:', account1.sequenceNumber())

  const uploadTx = new TransactionBuilder(account1, { fee: '100', networkPassphrase: NETWORK })
    .addOperation(Operation.uploadContractWasm({ wasm }))
    .setTimeout(120)
    .build()

  const preparedUpload = await withRetry('prepareTransaction (upload)', () =>
    server.prepareTransaction(uploadTx)
  )
  preparedUpload.sign(keypair)

  const uploadSend = await withRetry('sendTransaction (upload)', () =>
    server.sendTransaction(preparedUpload)
  )
  console.log('  Upload tx hash:', uploadSend.hash)

  if (uploadSend.status === 'ERROR') {
    console.log('  WASM already uploaded (duplicate). Continuing.')
  } else {
    const uploadResult = await withRetry('waitForTx (upload)', () =>
      waitForTx(server, uploadSend.hash)
    )
    if (uploadResult.status !== rpc.Api.GetTransactionStatus.SUCCESS) {
      console.error('  Upload failed:', JSON.stringify(uploadResult, null, 2))
      process.exit(1)
    }
    console.log('  WASM uploaded.')
  }

  const wasmHash = hash(wasm)
  console.log('  WASM hash:', wasmHash.toString('hex'))

  // ── Step 2: Create contract instance ──────────────────────────────────────
  console.log('\nStep 2: Creating contract instance...')

  const account2 = await withRetry('getAccount (fresh)', () => server.getAccount(adminAddress))
  const salt = Buffer.from(crypto.getRandomValues(new Uint8Array(32)))

  const contractIdPreimage = xdr.ContractIdPreimage.contractIdPreimageFromAddress(
    new xdr.ContractIdPreimageFromAddress({
      address: xdr.ScAddress.scAddressTypeAccount(keypair.xdrPublicKey()),
      salt,
    })
  )
  const executable = xdr.ContractExecutable.contractExecutableWasm(
    xdr.Hash.fromXDR(Buffer.from(wasmHash))
  )
  const hostFn = xdr.HostFunction.hostFunctionTypeCreateContract(
    new xdr.CreateContractArgs({ contractIdPreimage, executable })
  )

  const createTx = new TransactionBuilder(account2, { fee: '100', networkPassphrase: NETWORK })
    .addOperation(Operation.invokeHostFunction({ func: hostFn, auth: [] }))
    .setTimeout(120)
    .build()

  const preparedCreate = await withRetry('prepareTransaction (create)', () =>
    server.prepareTransaction(createTx)
  )
  preparedCreate.sign(keypair)

  const createSend = await withRetry('sendTransaction (create)', () =>
    server.sendTransaction(preparedCreate)
  )
  console.log('  Create tx hash:', createSend.hash)

  if (createSend.status === 'ERROR') {
    console.error('  Contract creation failed:', JSON.stringify(createSend, null, 2))
    process.exit(1)
  }

  const createResult = await withRetry('waitForTx (create)', () =>
    waitForTx(server, createSend.hash)
  )
  if (createResult.status !== rpc.Api.GetTransactionStatus.SUCCESS) {
    console.error('  Contract creation failed:', JSON.stringify(createResult, null, 2))
    process.exit(1)
  }

  // ── Extract contract address ───────────────────────────────────────────────
  console.log('\n✅ Contract deployed successfully!')

  // Try to extract contract ID from the return value
  let contractAddress: string | undefined
  try {
    const returnVal = (createResult as rpc.Api.GetSuccessfulTransactionResponse).returnValue
    if (returnVal) {
      const addr = returnVal.address()
      contractAddress = StrKey.encodeContract(addr.contractId())
    }
  } catch {
    // Fall back to the explorer
  }

  if (contractAddress) {
    console.log('\n🎯 Contract address:', contractAddress)
    console.log('\nAdd this to your .env file:')
    console.log(`  VITE_SOROBAN_VERIFIER_ADDRESS=${contractAddress}`)
    console.log('\nThen run init-contract.ts to store the verification key on-chain:')
    console.log(`  $env:VITE_SOROBAN_VERIFIER_ADDRESS="${contractAddress}"`)
    console.log(`  $env:DEPLOYER_SECRET="${ADMIN_SECRET}"`)
    console.log('  npx tsx scripts/init-contract.ts')
  } else {
    console.log('\nFind the contract address at (look for "Contract created"):')
    console.log(`  https://stellar.expert/explorer/testnet/tx/${createSend.hash}`)
    console.log('\nThen run:')
    console.log('  $env:VITE_SOROBAN_VERIFIER_ADDRESS="CXXX..."')
    console.log('  npx tsx scripts/init-contract.ts')
  }
}

main().catch((err: unknown) => {
  console.error(err)
  process.exit(1)
})
