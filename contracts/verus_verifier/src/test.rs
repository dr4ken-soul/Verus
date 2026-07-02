#![cfg(test)]
extern crate std;

use num_bigint::BigUint;
use soroban_sdk::{
    testutils::Address as _,
    Address, Bytes, Env, String, Symbol,
};

use crate::{IssuerRecord, VerusVerifier, VerusVerifierClient};

// ── Encoding helpers ──────────────────────────────────────────────────────────

fn decimal_to_be32(decimal: &str) -> [u8; 32] {
    let n = BigUint::parse_bytes(decimal.as_bytes(), 10)
        .expect("valid decimal field element");
    let bytes = n.to_bytes_be();
    let mut out = [0u8; 32];
    out[32 - bytes.len()..].copy_from_slice(&bytes);
    out
}

/// Encodes a BN254 G1 affine point as 64 bytes: be32(x) ‖ be32(y).
fn g1(env: &Env, x: &str, y: &str) -> Bytes {
    let mut buf = [0u8; 64];
    buf[0..32].copy_from_slice(&decimal_to_be32(x));
    buf[32..64].copy_from_slice(&decimal_to_be32(y));
    Bytes::from_array(env, &buf)
}

/// Encodes a BN254 G2 affine point as 128 bytes.
/// snarkjs order (c0=real first, c1=imaginary second); Soroban wants c1 ‖ c0.
fn g2(env: &Env, x_c0: &str, x_c1: &str, y_c0: &str, y_c1: &str) -> Bytes {
    let mut buf = [0u8; 128];
    buf[0..32].copy_from_slice(&decimal_to_be32(x_c1));
    buf[32..64].copy_from_slice(&decimal_to_be32(x_c0));
    buf[64..96].copy_from_slice(&decimal_to_be32(y_c1));
    buf[96..128].copy_from_slice(&decimal_to_be32(y_c0));
    Bytes::from_array(env, &buf)
}

// ── Client factory ────────────────────────────────────────────────────────────

fn create_client(e: &Env) -> VerusVerifierClient<'_> {
    VerusVerifierClient::new(e, &e.register(VerusVerifier {}, ()))
}

// ── Proof data ────────────────────────────────────────────────────────────────
//
// The proof values below were produced by running the Verus witness generator
// (circuits/generate_witness.js) for balance=750000, threshold=500000, then
// running `snarkjs groth16 prove` with the circuit's zkey.  They were verified
// locally with `snarkjs groth16 verify` before being committed here.

fn proof_a(env: &Env) -> Bytes {
    g1(
        env,
        "21793186613080514918686568387268571181546966112971951908556235385796177970724",
        "827193115795569886959035604922394678127723261832600103638367863774953075696",
    )
}

fn proof_b(env: &Env) -> Bytes {
    g2(
        env,
        "10505632022178701401410031707333467194839617729551337582562990591763717312703",
        "21125361751973730651579911887637193316118212330687224590551792978447129575040",
        "19780050952527146307022054296812073904351006909822913786489735440210571907985",
        "10492476353484736971790922498310877261815198932132838907750179702997280975304",
    )
}

fn proof_c(env: &Env) -> Bytes {
    g1(
        env,
        "11440897988511548653234015754124878229206937976548722337611093604494625793911",
        "3928307094254927995426530902570321435274740727837863191522367561220089750222",
    )
}

// ── Tests ─────────────────────────────────────────────────────────────────────

#[test]
fn test_initialize_then_verify_real_proof() {
    let env = Env::default();
    env.mock_all_auths();

    let client = create_client(&env);
    let admin = Address::generate(&env);
    let issuer = Address::generate(&env);

    // initialize only needs an admin address; VK is hardcoded in the contract.
    client.initialize(&admin);

    client.verify_reserve_proof(
        &issuer,
        &String::from_str(&env, "Meridian Capital Reserve"),
        &Symbol::new(&env, "USDC"),
        &500000u64,
        &proof_a(&env),
        &proof_b(&env),
        &proof_c(&env),
    );

    let record: IssuerRecord = client.get_verification(&issuer).unwrap();
    assert_eq!(record.threshold, 500000u64);

    let all = client.list_verifications();
    assert_eq!(all.len(), 1);
}

#[test]
fn test_wrong_proof_is_rejected() {
    let env = Env::default();
    env.mock_all_auths();

    let client = create_client(&env);
    let admin = Address::generate(&env);
    let issuer = Address::generate(&env);

    client.initialize(&admin);

    // Corrupt proof_a by zeroing it — pairing check must fail.
    let bad_a = Bytes::from_array(&env, &[0u8; 64]);

    let result = client.try_verify_reserve_proof(
        &issuer,
        &String::from_str(&env, "Bad Actor Inc"),
        &Symbol::new(&env, "USDC"),
        &500000u64,
        &bad_a,
        &proof_b(&env),
        &proof_c(&env),
    );

    assert!(result.is_err());
}
