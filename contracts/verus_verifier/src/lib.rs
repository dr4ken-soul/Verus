#![no_std]
use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype,
    crypto::bn254::{Bn254G1Affine, Bn254G2Affine, Fr},
    symbol_short, vec, Address, Bytes, Env, String, Symbol, Vec,
};

// Verus reserve proof verifier — flat-argument edition.
//
// DESIGN NOTE: THE TYPE-COMPATIBILITY PROBLEM
// ────────────────────────────────────────────────────────────────────────────
// Soroban host types (Bn254G1Affine, Bn254G2Affine, Fr, BytesN<N>) are
// OPAQUE HOST OBJECTS.  The host function map_unpack_to_linear_memory, which
// #[contracttype] uses internally to unpack struct fields from a ScvMap, only
// accepts RawVal handles of the EXACT host-object subtype for each field.
//
// JavaScript callers using @stellar/stellar-sdk can only produce ScvBytes
// values (from Uint8Array / Buffer).  ScvBytes is converted by the host to a
// HOT_BYTES object handle, which is REJECTED whenever a field is declared as
// Bn254G1Affine or BytesN<N> because those expect different subtypes.
//
// The solution used here is to accept the proof fields as TOP-LEVEL Bytes
// arguments to verify_reserve_proof (NOT inside a #[contracttype] struct).
// Direct function arguments are passed as plain ScvBytes, which the host
// converts to Bytes host objects before handing them to WASM — no struct
// unpacking is involved and no subtype mismatch can occur.
//
// The circuit verification key (alpha, beta, gamma, delta, IC) is compiled
// directly into the contract as byte-array constants so that the initialize
// function only needs to accept an admin Address, eliminating the original
// VerificationKey struct argument that had the same type-compatibility issue.

// ── Error codes ──────────────────────────────────────────────────────────────

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum VerusError {
    NotInitialized = 0,
    AlreadyInitialized = 1,
    MalformedProof = 2,
    ThresholdMismatch = 4,
    ClaimNotMet = 5,
    ProofInvalid = 6,
}

// ── On-chain issuer record ───────────────────────────────────────────────────

#[derive(Clone)]
#[contracttype]
pub struct IssuerRecord {
    pub issuer_name: String,
    pub asset: Symbol,
    pub threshold: u64,
    pub verified_at: u64,
}

const ADMIN: Symbol = symbol_short!("ADMIN");
const ISSUERS: Symbol = symbol_short!("ISSUERS");

// ── Hardcoded circuit verification key ───────────────────────────────────────
//
// These byte arrays were computed from circuits/verification_key.json after
// compiling circuits/reserveProof.circom with the Groth16 trusted setup.
// Each G1 point is 64 bytes: be32(x) ‖ be32(y).
// Each G2 point is 128 bytes: be32(x_c1) ‖ be32(x_c0) ‖ be32(y_c1) ‖ be32(y_c0).
// (Soroban Fp2 convention: imaginary component first.)

const VK_ALPHA: [u8; 64] = [
    0x25, 0x36, 0xff, 0xe8, 0x5f, 0x16, 0x33, 0x89, 0xd3, 0xe4, 0x93, 0xce, 0x30, 0x6e, 0x99,
    0xd5, 0x4a, 0xbc, 0xa7, 0xff, 0xd2, 0x91, 0xf7, 0xea, 0x0a, 0xb5, 0x43, 0xad, 0xd4, 0xaa,
    0xb9, 0x9d, 0x09, 0x3b, 0x9f, 0x1d, 0xba, 0x8b, 0x81, 0xd3, 0x81, 0x5a, 0x77, 0xb6, 0x67,
    0x41, 0xee, 0xb1, 0xf5, 0xf5, 0x27, 0x4f, 0x12, 0x5d, 0xc9, 0xc6, 0xae, 0xa8, 0xe2, 0x64,
    0x08, 0x86, 0xba, 0xe4,
];

const VK_BETA: [u8; 128] = [
    0x1e, 0xac, 0xeb, 0x4f, 0xa5, 0x40, 0x60, 0x5a, 0x99, 0xb5, 0x12, 0x0d, 0x81, 0x40, 0xaa,
    0x0b, 0x41, 0xa9, 0x46, 0xea, 0x44, 0x27, 0x80, 0xc8, 0xd8, 0x85, 0x0b, 0xa4, 0xac, 0xb9,
    0x6e, 0x91, 0x18, 0xd4, 0x5f, 0x39, 0x6b, 0x5d, 0x7e, 0x54, 0x6d, 0x5c, 0xa9, 0xa8, 0x84,
    0xc6, 0xdb, 0x2c, 0xa1, 0x2a, 0xa0, 0xe0, 0xeb, 0xf5, 0x24, 0xbd, 0xb2, 0xbb, 0xe8, 0xb3,
    0xe9, 0x9c, 0xac, 0x68, 0x25, 0xa6, 0xe9, 0xe0, 0x04, 0xce, 0xef, 0x51, 0xb0, 0x69, 0xcb,
    0xba, 0x99, 0x9a, 0xb0, 0x27, 0xe5, 0x57, 0x82, 0x4f, 0x91, 0x6c, 0x04, 0x56, 0xed, 0xec,
    0x4c, 0xb5, 0x9b, 0xa0, 0x06, 0x31, 0x25, 0xbd, 0x82, 0x8e, 0x5d, 0x98, 0x65, 0xe3, 0xb7,
    0x8a, 0xe1, 0x1e, 0x29, 0x7b, 0x2d, 0x17, 0xa7, 0x58, 0x4d, 0xbe, 0xcf, 0xd4, 0xe3, 0xe3,
    0xa8, 0x96, 0xc3, 0x34, 0xfd, 0x5e, 0x37, 0x5f,
];

const VK_GAMMA: [u8; 128] = [
    0x19, 0x8e, 0x93, 0x93, 0x92, 0x0d, 0x48, 0x3a, 0x72, 0x60, 0xbf, 0xb7, 0x31, 0xfb, 0x5d,
    0x25, 0xf1, 0xaa, 0x49, 0x33, 0x35, 0xa9, 0xe7, 0x12, 0x97, 0xe4, 0x85, 0xb7, 0xae, 0xf3,
    0x12, 0xc2, 0x18, 0x00, 0xde, 0xef, 0x12, 0x1f, 0x1e, 0x76, 0x42, 0x6a, 0x00, 0x66, 0x5e,
    0x5c, 0x44, 0x79, 0x67, 0x43, 0x22, 0xd4, 0xf7, 0x5e, 0xda, 0xdd, 0x46, 0xde, 0xbd, 0x5c,
    0xd9, 0x92, 0xf6, 0xed, 0x09, 0x06, 0x89, 0xd0, 0x58, 0x5f, 0xf0, 0x75, 0xec, 0x9e, 0x99,
    0xad, 0x69, 0x0c, 0x33, 0x95, 0xbc, 0x4b, 0x31, 0x33, 0x70, 0xb3, 0x8e, 0xf3, 0x55, 0xac,
    0xda, 0xdc, 0xd1, 0x22, 0x97, 0x5b, 0x12, 0xc8, 0x5e, 0xa5, 0xdb, 0x8c, 0x6d, 0xeb, 0x4a,
    0xab, 0x71, 0x80, 0x8d, 0xcb, 0x40, 0x8f, 0xe3, 0xd1, 0xe7, 0x69, 0x0c, 0x43, 0xd3, 0x7b,
    0x4c, 0xe6, 0xcc, 0x01, 0x66, 0xfa, 0x7d, 0xaa,
];

const VK_DELTA: [u8; 128] = [
    0x1b, 0xb3, 0x5c, 0x4f, 0xf8, 0xce, 0xfe, 0x8b, 0xfc, 0x67, 0xf1, 0xf9, 0xb1, 0xab, 0x5e,
    0xdf, 0x59, 0x69, 0x34, 0x36, 0xe0, 0x48, 0x6d, 0xe9, 0x90, 0x77, 0x11, 0x80, 0x64, 0x39,
    0x83, 0xa0, 0x0d, 0x2c, 0x80, 0x3c, 0xb2, 0x89, 0x1b, 0x0a, 0x6e, 0x36, 0x13, 0xfc, 0x49,
    0x7e, 0x59, 0x84, 0x26, 0x33, 0xb6, 0x39, 0xb7, 0xaa, 0x21, 0xc8, 0x88, 0x5c, 0x50, 0x40,
    0xc8, 0x4c, 0x9d, 0x61, 0x1c, 0x99, 0xe3, 0xc0, 0xd3, 0xd2, 0xe6, 0x4c, 0x8e, 0x3e, 0xf9,
    0x08, 0x17, 0xde, 0xac, 0xe9, 0x87, 0x8c, 0x81, 0x3f, 0x2d, 0x86, 0x77, 0xa2, 0x40, 0x92,
    0x59, 0xce, 0x88, 0x8b, 0xa7, 0x6c, 0x0c, 0x44, 0x15, 0xb5, 0x75, 0x5d, 0x43, 0xcd, 0x98,
    0x38, 0x21, 0x34, 0x2b, 0xe8, 0x8b, 0x3d, 0xd4, 0x6a, 0xce, 0xe2, 0x19, 0x67, 0xea, 0x18,
    0x60, 0x4d, 0xd8, 0xdc, 0x1c, 0x28, 0x61, 0x7e,
];

const VK_IC0: [u8; 64] = [
    0x27, 0x88, 0xd6, 0xe2, 0x01, 0x5e, 0xc6, 0xf7, 0x30, 0x44, 0xad, 0x95, 0xdc, 0x86, 0x09,
    0x4c, 0xdd, 0x2a, 0x8a, 0x1f, 0xaa, 0x67, 0xc4, 0x5a, 0xf0, 0x0b, 0x26, 0xcf, 0x65, 0x5a,
    0x79, 0x74, 0x07, 0xed, 0x51, 0xde, 0xdd, 0xab, 0x70, 0xb3, 0xe6, 0x3d, 0x39, 0x90, 0xd1,
    0xc0, 0x29, 0xbe, 0xb8, 0xb0, 0xc5, 0x27, 0x3d, 0x6d, 0xcf, 0xf6, 0x6a, 0x41, 0xbb, 0xb9,
    0xc4, 0xf1, 0xee, 0x32,
];

const VK_IC1: [u8; 64] = [
    0x21, 0x86, 0x1f, 0x7b, 0x37, 0x7a, 0x9f, 0xad, 0xab, 0x90, 0x4d, 0x3b, 0xec, 0x1b, 0x73,
    0x23, 0x9d, 0xe3, 0x98, 0x07, 0x30, 0xd5, 0x07, 0x2a, 0xa4, 0x1a, 0x7a, 0x80, 0x3c, 0x80,
    0xde, 0x28, 0x27, 0x66, 0x8a, 0x9f, 0x0d, 0x85, 0x85, 0xff, 0x99, 0xde, 0xbd, 0xf6, 0xcc,
    0x5b, 0xe4, 0x34, 0x20, 0xfc, 0xaf, 0x71, 0x48, 0x84, 0x90, 0x77, 0x56, 0x04, 0xb4, 0xce,
    0x2c, 0x53, 0xf0, 0x80,
];

const VK_IC2: [u8; 64] = [
    0x0d, 0x5b, 0x29, 0x57, 0x72, 0x13, 0x25, 0xa6, 0x00, 0x03, 0xe6, 0x09, 0xb6, 0x99, 0x5b,
    0x7d, 0x21, 0x72, 0x82, 0xfe, 0x65, 0x0f, 0x69, 0x07, 0xb5, 0x8b, 0x92, 0x91, 0xb0, 0x6b,
    0x87, 0xd9, 0x01, 0x86, 0xf0, 0xa4, 0xf4, 0x28, 0xff, 0x30, 0x7f, 0xf8, 0xb6, 0xd8, 0x10,
    0x01, 0x6b, 0xfc, 0xb2, 0x5c, 0xc2, 0xf3, 0x86, 0x8d, 0x67, 0xe7, 0x69, 0x66, 0xea, 0x7c,
    0x54, 0x15, 0xed, 0xf6,
];

// ── Helpers ──────────────────────────────────────────────────────────────────

/// Copies bytes out of a Soroban `Bytes` value into a fixed-size `[u8; N]`.
/// Returns `MalformedProof` if the length doesn't match.
fn bytes_to_arr<const N: usize>(b: &Bytes) -> Result<[u8; N], VerusError> {
    if b.len() as usize != N {
        return Err(VerusError::MalformedProof);
    }
    let mut arr = [0u8; N];
    for i in 0..N {
        arr[i] = b.get(i as u32).ok_or(VerusError::MalformedProof)?;
    }
    Ok(arr)
}

#[contract]
pub struct VerusVerifier;

#[contractimpl]
impl VerusVerifier {
    /// One-time setup.  Sets the admin address.  The circuit verification
    /// key is compiled into the contract so no VK argument is required here.
    pub fn initialize(env: Env, admin: Address) -> Result<(), VerusError> {
        admin.require_auth();
        if env.storage().instance().has(&ADMIN) {
            return Err(VerusError::AlreadyInitialized);
        }
        env.storage().instance().set(&ADMIN, &admin);
        env.storage()
            .instance()
            .set(&ISSUERS, &Vec::<Address>::new(&env));
        Ok(())
    }

    /// Verifies a Groth16 proof (generated by the Verus frontend from the
    /// reserveProof.circom circuit) and records a successful verification
    /// on-chain.
    ///
    /// Arguments
    /// ─────────
    /// issuer       – Stellar account of the issuer (must sign the tx).
    /// issuer_name  – Human-readable name, stored in the issuer record.
    /// asset        – Short symbol identifying the reserve asset (e.g. USDC).
    /// threshold    – The publicly declared minimum balance (in the same
    ///               denominator as the private balance in the witness).
    ///               The proof asserts `balance >= threshold`.
    /// proof_a      – Groth16 π_A: 64-byte G1 affine point be32(x)‖be32(y).
    /// proof_b      – Groth16 π_B: 128-byte G2 affine point.
    /// proof_c      – Groth16 π_C: 64-byte G1 affine point.
    ///
    /// All proof bytes come from snarkjs (the standard endianness / component
    /// ordering used by the Verus JS frontend, which matches the Soroban BN254
    /// host-function convention).
    pub fn verify_reserve_proof(
        env: Env,
        issuer: Address,
        issuer_name: String,
        asset: Symbol,
        threshold: u64,
        proof_a: Bytes,
        proof_b: Bytes,
        proof_c: Bytes,
    ) -> Result<(), VerusError> {
        issuer.require_auth();

        if !env.storage().instance().has(&ADMIN) {
            return Err(VerusError::NotInitialized);
        }

        // Convert the proof bytes into BN254 host objects.
        let pa = Bn254G1Affine::from_array(&env, &bytes_to_arr::<64>(&proof_a)?);
        let pb = Bn254G2Affine::from_array(&env, &bytes_to_arr::<128>(&proof_b)?);
        let pc = Bn254G1Affine::from_array(&env, &bytes_to_arr::<64>(&proof_c)?);

        // Build the circuit's verification key from the hardcoded constants.
        let vk_alpha = Bn254G1Affine::from_array(&env, &VK_ALPHA);
        let vk_beta = Bn254G2Affine::from_array(&env, &VK_BETA);
        let vk_gamma = Bn254G2Affine::from_array(&env, &VK_GAMMA);
        let vk_delta = Bn254G2Affine::from_array(&env, &VK_DELTA);
        let ic0 = Bn254G1Affine::from_array(&env, &VK_IC0);
        let ic1 = Bn254G1Affine::from_array(&env, &VK_IC1);
        let ic2 = Bn254G1Affine::from_array(&env, &VK_IC2);

        let bn254 = env.crypto().bn254();

        // Public signal order: [isValid, threshold], as declared in the
        // compiled circuit.  isValid must be 1 (otherwise the balance did
        // not meet the threshold).  threshold is the declared u64 value.
        let fr_one = Fr::from_u256(soroban_sdk::U256::from_u32(&env, 1));
        let fr_threshold =
            Fr::from_u256(soroban_sdk::U256::from_u128(&env, threshold as u128));

        // vk_x = ic0 + isValid·ic1 + threshold·ic2
        let vk_x = {
            let scaled1 = bn254.g1_mul(&ic1, &fr_one);
            let scaled2 = bn254.g1_mul(&ic2, &fr_threshold);
            let sum = bn254.g1_add(&ic0, &scaled1);
            bn254.g1_add(&sum, &scaled2)
        };

        // e(-A, B) · e(alpha, beta) · e(vk_x, gamma) · e(C, delta) == 1
        let neg_a = -pa;
        let g1_points = vec![&env, neg_a, vk_alpha, vk_x, pc];
        let g2_points = vec![&env, pb, vk_beta, vk_gamma, vk_delta];

        if !bn254.pairing_check(g1_points, g2_points) {
            return Err(VerusError::ProofInvalid);
        }

        let record = IssuerRecord {
            issuer_name,
            asset,
            threshold,
            verified_at: env.ledger().timestamp(),
        };

        let is_new_issuer = !env.storage().persistent().has(&issuer);
        env.storage().persistent().set(&issuer, &record);

        if is_new_issuer {
            let mut issuers: Vec<Address> = env
                .storage()
                .instance()
                .get(&ISSUERS)
                .unwrap_or_else(|| Vec::new(&env));
            issuers.push_back(issuer.clone());
            env.storage().instance().set(&ISSUERS, &issuers);
        }

        #[allow(deprecated)]
        env.events()
            .publish((symbol_short!("verified"), issuer), record.verified_at);

        Ok(())
    }

    /// Returns the verification record for a single issuer, if one exists.
    pub fn get_verification(env: Env, issuer: Address) -> Option<IssuerRecord> {
        env.storage().persistent().get(&issuer)
    }

    /// Returns every recorded verification across all issuers.
    pub fn list_verifications(env: Env) -> Vec<IssuerRecord> {
        let issuers: Vec<Address> = env
            .storage()
            .instance()
            .get(&ISSUERS)
            .unwrap_or_else(|| Vec::new(&env));

        let mut records = Vec::new(&env);
        for issuer in issuers.iter() {
            if let Some(record) =
                env.storage().persistent().get::<Address, IssuerRecord>(&issuer)
            {
                records.push_back(record);
            }
        }
        records
    }
}

mod test;
