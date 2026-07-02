#![no_std]
use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype,
    crypto::bn254::{Bn254G1Affine, Bn254G2Affine, Fr},
    symbol_short, vec, Address, Env, String, Symbol, Vec,
};

// Verus reserve proof verifier.
//
// Verifies a Groth16 proof, generated client-side by the Verus frontend
// from the reserveProof.circom circuit, confirming an issuer's reserve
// balance meets or exceeds a publicly declared threshold without ever
// exposing the balance itself.
//
// The verification key is fixed to the Verus circuit and set once at
// deployment. It is not accepted as a per-call argument, since allowing
// an arbitrary caller-supplied key would let anyone "verify" a proof
// against a key of their own choosing, which defeats the purpose of an
// on-chain verifier entirely.
//
// Public signals are emitted by the compiled circuit in the fixed order
// [isValid, threshold], confirmed against the actual compiled circuit
// output during development, not assumed from documentation alone.

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum VerusError {
    NotInitialized = 0,
    AlreadyInitialized = 1,
    MalformedVerifyingKey = 2,
    MalformedPublicSignals = 3,
    ThresholdMismatch = 4,
    ClaimNotMet = 5,
    ProofInvalid = 6,
}

#[derive(Clone)]
#[contracttype]
pub struct VerificationKey {
    pub alpha: Bn254G1Affine,
    pub beta: Bn254G2Affine,
    pub gamma: Bn254G2Affine,
    pub delta: Bn254G2Affine,
    pub ic: Vec<Bn254G1Affine>,
}

#[derive(Clone)]
#[contracttype]
pub struct Proof {
    pub a: Bn254G1Affine,
    pub b: Bn254G2Affine,
    pub c: Bn254G1Affine,
}

#[derive(Clone)]
#[contracttype]
pub struct IssuerRecord {
    pub issuer_name: String,
    pub asset: Symbol,
    pub threshold: u64,
    pub verified_at: u64,
}

const ADMIN: Symbol = symbol_short!("ADMIN");
const VK: Symbol = symbol_short!("VK");
const ISSUERS: Symbol = symbol_short!("ISSUERS");

#[contract]
pub struct VerusVerifier;

#[contractimpl]
impl VerusVerifier {
    /// One-time setup. Stores the admin address and the fixed verification
    /// key for the Verus reserve proof circuit. Must be called exactly
    /// once before any proof can be verified.
    pub fn initialize(env: Env, admin: Address, vk: VerificationKey) -> Result<(), VerusError> {
        admin.require_auth();
        if env.storage().instance().has(&ADMIN) {
            return Err(VerusError::AlreadyInitialized);
        }
        env.storage().instance().set(&ADMIN, &admin);
        env.storage().instance().set(&VK, &vk);
        env.storage()
            .instance()
            .set(&ISSUERS, &Vec::<Address>::new(&env));
        Ok(())
    }

    /// Verifies a Groth16 proof that the calling issuer's reserve balance
    /// meets or exceeds the declared threshold, and records the result
    /// on-chain if the proof is valid.
    ///
    /// The issuer signs this call directly, so the transaction itself is
    /// the issuer's attestation that the proof concerns their own reserves.
    /// The actual balance is never an argument to this function and never
    /// appears anywhere in the public signals, only in the private witness
    /// the issuer computed off-chain in their own browser.
    pub fn verify_reserve_proof(
        env: Env,
        issuer: Address,
        issuer_name: String,
        asset: Symbol,
        threshold: u64,
        proof: Proof,
        pub_signals: Vec<Fr>,
    ) -> Result<(), VerusError> {
        issuer.require_auth();

        let vk: VerificationKey = env
            .storage()
            .instance()
            .get(&VK)
            .ok_or(VerusError::NotInitialized)?;

        if pub_signals.len() != 2 {
            return Err(VerusError::MalformedPublicSignals);
        }
        if pub_signals.len() + 1 != vk.ic.len() {
            return Err(VerusError::MalformedVerifyingKey);
        }

        // Public signal order is [isValid, threshold], fixed by the
        // compiled circuit's output declaration order.
        let is_valid_signal = pub_signals.get(0).unwrap();
        let threshold_signal = pub_signals.get(1).unwrap();

        let expected_threshold = Fr::from_u256(soroban_sdk::U256::from_u128(&env, threshold as u128));
        if threshold_signal != expected_threshold {
            return Err(VerusError::ThresholdMismatch);
        }

        let one = Fr::from_u256(soroban_sdk::U256::from_u32(&env, 1));
        if is_valid_signal != one {
            return Err(VerusError::ClaimNotMet);
        }

        let bn254 = env.crypto().bn254();

        // vk_x = ic[0] + sum(pub_signals[i] * ic[i+1])
        let mut vk_x = vk.ic.get(0).unwrap();
        for (signal, point) in pub_signals.iter().zip(vk.ic.iter().skip(1)) {
            let scaled = bn254.g1_mul(&point, &signal);
            vk_x = bn254.g1_add(&vk_x, &scaled);
        }

        // e(-A, B) * e(alpha, beta) * e(vk_x, gamma) * e(C, delta) == 1
        let neg_a = -proof.a;
        let g1_points = vec![&env, neg_a, vk.alpha, vk_x, proof.c];
        let g2_points = vec![&env, proof.b, vk.beta, vk.gamma, vk.delta];

        let pairing_ok = bn254.pairing_check(g1_points, g2_points);
        if !pairing_ok {
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

        // events().publish is deprecated in favour of #[contractevent], but the
        // lightweight tuple form is sufficient for this use case and avoids adding
        // a separate event struct just for a timestamp notification.
        #[allow(deprecated)]
        env.events()
            .publish((symbol_short!("verified"), issuer), record.verified_at);

        Ok(())
    }

    /// Returns the verification record for a single issuer, if one exists.
    pub fn get_verification(env: Env, issuer: Address) -> Option<IssuerRecord> {
        env.storage().persistent().get(&issuer)
    }

    /// Returns every recorded verification across all issuers. Used by the
    /// public issuer wall and does not require the caller to be the issuer.
    pub fn list_verifications(env: Env) -> Vec<IssuerRecord> {
        let issuers: Vec<Address> = env
            .storage()
            .instance()
            .get(&ISSUERS)
            .unwrap_or_else(|| Vec::new(&env));

        let mut records = Vec::new(&env);
        for issuer in issuers.iter() {
            if let Some(record) = env.storage().persistent().get::<Address, IssuerRecord>(&issuer) {
                records.push_back(record);
            }
        }
        records
    }
}

mod test;
