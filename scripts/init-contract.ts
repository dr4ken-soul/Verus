/**
 * Initialises the deployed Verus Soroban verifier contract with the
 * fixed verification key from the compiled reserveProof circuit.
 *
 * Run once after the contract is deployed to testnet:
 *   node --loader ts-node/esm scripts/init-contract.ts
 *   or: npx ts-node --esm scripts/init-contract.ts
 *
 * Requires:
 *   VITE_SOROBAN_VERIFIER_ADDRESS set in .env (the deployed contract ID)
 *   DEPLOYER_SECRET set as an env var (the deployer Stellar secret key)
 *
 * Example:
 *   VITE_SOROBAN_VERIFIER_ADDRESS=CXXX... DEPLOYER_SECRET=SXXX... \
 *     npx tsx scripts/init-contract.ts
 */

import {
  rpc,
  TransactionBuilder,
  Networks,
  Contract,
  BASE_FEE,
  nativeToScVal,
  Address,
  Keypair,
  xdr,
} from '@stellar/stellar-sdk'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const RPC_URL = 'https://soroban-testnet.stellar.org'
const NETWORK = Networks.TESTNET
const VERIFIER_ADDRESS = process.env.VITE_SOROBAN_VERIFIER_ADDRESS ?? ''
const ADMIN_SECRET = process.env.DEPLOYER_SECRET ?? ''

if (!VERIFIER_ADDRESS) {
  console.error('VITE_SOROBAN_VERIFIER_ADDRESS is not set')
  console.error('Set it to the contract ID returned by stellar contract deploy')
  process.exit(1)
}

if (!ADMIN_SECRET) {
  console.error('DEPLOYER_SECRET is not set')
  console.error('Set it to the secret key of the deployer identity')
  process.exit(1)
}

/**
 * Converts a decimal field element string to a 32-byte big-endian buffer.
 * Matches the encoding Stellar BN254 host functions expect.
 * @param decimal - a decimal string representing a BN254 scalar
 */
function decimalToBytes32BE(decimal: string): Buffer {
  let value = BigInt(decimal)
  const bytes = Buffer.alloc(32)
  for (let i = 31; i >= 0; i--) {
    bytes[i] = Number(value & 0xffn)
    value >>= 8n
  }
  return bytes
}

/**
 * Encodes a G1 affine point (x, y) as a raw bytes ScVal for Soroban's
 * Bn254G1Affine::from_array, which expects a 64-byte big-endian buffer.
 * @param x - x coordinate decimal string
 * @param y - y coordinate decimal string
 */
function g1ScVal(x: string, y: string): xdr.ScVal {
  const buf = Buffer.concat([decimalToBytes32BE(x), decimalToBytes32BE(y)])
  return xdr.ScVal.scvBytes(buf)
}

/**
 * Encodes a G2 affine point as a 128-byte ScVal.
 * snarkjs exports G2 as [[x_c0, x_c1], [y_c0, y_c1]].
 * If the pairing check fails after a successful deployment, swap c0 and c1
 * in all four arguments here and retry.
 * @param xc0 - x Fp2 component 0
 * @param xc1 - x Fp2 component 1
 * @param yc0 - y Fp2 component 0
 * @param yc1 - y Fp2 component 1
 */
function g2ScVal(xc0: string, xc1: string, yc0: string, yc1: string): xdr.ScVal {
  const buf = Buffer.concat([
    decimalToBytes32BE(xc0),
    decimalToBytes32BE(xc1),
    decimalToBytes32BE(yc0),
    decimalToBytes32BE(yc1),
  ])
  return xdr.ScVal.scvBytes(buf)
}

async function main(): Promise<void> {
  const vkPath = path.join(__dirname, '..', 'circuits', 'verification_key.json')
  const vkRaw = fs.readFileSync(vkPath, 'utf-8')
  const vk = JSON.parse(vkRaw) as {
    vk_alpha_1: string[]
    vk_beta_2: string[][]
    vk_gamma_2: string[][]
    vk_delta_2: string[][]
    IC: string[][]
  }

  const keypair = Keypair.fromSecret(ADMIN_SECRET)
  const adminAddress = keypair.publicKey()

  console.log('Admin address:', adminAddress)
  console.log('Contract address:', VERIFIER_ADDRESS)
  console.log('Building verification key struct from', vkPath)

  const alpha = g1ScVal(vk.vk_alpha_1[0], vk.vk_alpha_1[1])
  const beta = g2ScVal(vk.vk_beta_2[0][0], vk.vk_beta_2[0][1], vk.vk_beta_2[1][0], vk.vk_beta_2[1][1])
  const gamma = g2ScVal(vk.vk_gamma_2[0][0], vk.vk_gamma_2[0][1], vk.vk_gamma_2[1][0], vk.vk_gamma_2[1][1])
  const delta = g2ScVal(vk.vk_delta_2[0][0], vk.vk_delta_2[0][1], vk.vk_delta_2[1][0], vk.vk_delta_2[1][1])
  const icPoints = vk.IC.map((point) => g1ScVal(point[0], point[1]))
  const ic = xdr.ScVal.scvVec(icPoints)

  // Build as a map matching the VerificationKey struct field names
  const vkScVal = xdr.ScVal.scvMap([
    new xdr.ScMapEntry({ key: xdr.ScVal.scvSymbol('alpha'), val: alpha }),
    new xdr.ScMapEntry({ key: xdr.ScVal.scvSymbol('beta'), val: beta }),
    new xdr.ScMapEntry({ key: xdr.ScVal.scvSymbol('delta'), val: delta }),
    new xdr.ScMapEntry({ key: xdr.ScVal.scvSymbol('gamma'), val: gamma }),
    new xdr.ScMapEntry({ key: xdr.ScVal.scvSymbol('ic'), val: ic }),
  ])

  const adminScVal = nativeToScVal(new Address(adminAddress), { type: 'address' })

  const server = new rpc.Server(RPC_URL)
  const account = await server.getAccount(adminAddress)
  const contract = new Contract(VERIFIER_ADDRESS)

  const tx = new TransactionBuilder(account, { fee: BASE_FEE, networkPassphrase: NETWORK })
    .addOperation(contract.call('initialize', adminScVal, vkScVal))
    .setTimeout(60)
    .build()

  console.log('Preparing transaction...')
  const prepared = await server.prepareTransaction(tx)
  prepared.sign(keypair)

  console.log('Submitting initialize transaction...')
  const result = await server.sendTransaction(prepared)

  if (result.status === 'ERROR') {
    console.error('Transaction submission failed:', JSON.stringify(result, null, 2))
    process.exit(1)
  }

  console.log('Transaction submitted. Hash:', result.hash)
  console.log('Waiting for confirmation...')

  let response = await server.getTransaction(result.hash)
  while (response.status === 'NOT_FOUND') {
    await new Promise((resolve) => setTimeout(resolve, 1500))
    response = await server.getTransaction(result.hash)
  }

  if (response.status === 'SUCCESS') {
    console.log('Contract initialised successfully.')
    console.log('Transaction hash:', result.hash)
    console.log('')
    console.log('Update .env: VITE_SOROBAN_VERIFIER_ADDRESS=' + VERIFIER_ADDRESS)
  } else {
    console.error('Transaction failed:', JSON.stringify(response, null, 2))
    process.exit(1)
  }
}

main().catch((err: unknown) => {
  console.error(err)
  process.exit(1)
})
