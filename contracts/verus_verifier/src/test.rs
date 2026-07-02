#![cfg(test)]
extern crate std;

use num_bigint::BigUint;
use soroban_sdk::{
    crypto::bn254::{Bn254G1Affine, Bn254G2Affine, Fr},
    testutils::Address as _,
    Address, Env, String, Symbol, Vec, U256,
};

use crate::{IssuerRecord, Proof, VerificationKey, VerusVerifier, VerusVerifierClient};

/// Converts a decimal field element string, exactly as produced by snarkjs,
/// into a 32-byte big-endian array. BN254 points in Soroban use the
/// Ethereum-compatible big-endian fixed-width format, not arkworks'
/// default little-endian CanonicalSerialize output, so this goes through
/// num-bigint directly rather than an arkworks serialiser.
fn decimal_to_be32(decimal: &str) -> [u8; 32] {
    let n = BigUint::parse_bytes(decimal.as_bytes(), 10).expect("valid decimal field element");
    let bytes = n.to_bytes_be();
    let mut out = [0u8; 32];
    out[32 - bytes.len()..].copy_from_slice(&bytes);
    out
}

fn g1_from_decimal(env: &Env, x: &str, y: &str) -> Bn254G1Affine {
    let mut buf = [0u8; 64];
    buf[0..32].copy_from_slice(&decimal_to_be32(x));
    buf[32..64].copy_from_slice(&decimal_to_be32(y));
    Bn254G1Affine::from_array(env, &buf)
}

/// Builds a G2 point from its four Fp2 coordinates.
///
/// snarkjs exports G2 points as [[x_c0, x_c1], [y_c0, y_c1]] where c0 is
/// the real component and c1 is the imaginary component of each Fp2 element.
/// The Soroban SDK's BN254 serialisation format (confirmed from the SDK
/// source) stores each Fp2 element as be_bytes(c1) || be_bytes(c0), i.e.
/// the imaginary component first. Arguments here are in snarkjs order
/// (c0 first), and the swap to Soroban order is applied internally.
fn g2_from_decimal(env: &Env, x_c0: &str, x_c1: &str, y_c0: &str, y_c1: &str) -> Bn254G2Affine {
    let mut buf = [0u8; 128];
    // Soroban Fp2 order: c1 || c0 (imaginary before real)
    buf[0..32].copy_from_slice(&decimal_to_be32(x_c1));
    buf[32..64].copy_from_slice(&decimal_to_be32(x_c0));
    buf[64..96].copy_from_slice(&decimal_to_be32(y_c1));
    buf[96..128].copy_from_slice(&decimal_to_be32(y_c0));
    Bn254G2Affine::from_array(env, &buf)
}

fn fr_from_decimal(env: &Env, decimal: &str) -> Fr {
    let n: u128 = decimal.parse().expect("threshold and isValid fit in u128");
    Fr::from_u256(U256::from_u128(env, n))
}

fn create_client(e: &Env) -> VerusVerifierClient<'_> {
    VerusVerifierClient::new(e, &e.register(VerusVerifier {}, ()))
}

/// Builds the fixed verification key for the compiled reserveProof circuit.
/// Every value below was read directly from circuits/verification_key.json
/// after compiling circuits/reserveProof.circom and running the full
/// Groth16 trusted setup, not invented or copied from an unrelated example.
fn verus_verification_key(env: &Env) -> VerificationKey {
    VerificationKey {
        alpha: g1_from_decimal(
            env,
            "16832751349118748298901712851578835926324541604995689826722939418570320951709",
            "4176157793224391374182548251427119696679072028889522474570145410516617968356",
        ),
        beta: g2_from_decimal(
            env,
            "11230737157658192123622720484289223816976947355092658274415620047795545484392",
            "13874907210270167276268015266036607279239776359747324121309724895427297898129",
            "17070410558018216545286491743229668473896505825543644774092271982112782825311",
            "17030486156767301033969337607745782142864062821733160591076070838230518335025",
        ),
        gamma: g2_from_decimal(
            env,
            "10857046999023057135944570762232829481370756359578518086990519993285655852781",
            "11559732032986387107991004021392285783925812861821192530917403151452391805634",
            "8495653923123431417604973247489272438418190587263600148770280649306958101930",
            "4082367875863433681332203403145435568316851327593401208105741076214120093531",
        ),
        delta: g2_from_decimal(
            env,
            "5958693362363891081450073188890199177969977901482077238361670438353069972833",
            "12529349653045815577317735763083647724252558762085386724710669743663447901088",
            "5548049612187661212563028420483595010952233365389819063608804154350032675198",
            "12936659256280685835404611899068303014241075647968999392172244914543897847660",
        ),
        ic: Vec::from_array(
            env,
            [
                g1_from_decimal(
                    env,
                    "17881975362367710746204107416732445933269604111914240648349350456496599234932",
                    "3585497744342134832717562487499916261939544114006331485097343005139766734386",
                ),
                g1_from_decimal(
                    env,
                    "15163298785980905407553272983244784949811871446461327111259522711583457336872",
                    "17821376224406149668347417971802815059942769978852932590578184118729893474432",
                ),
                g1_from_decimal(
                    env,
                    "6041135443606352373635935195479086881065605143544590232102487066649201182681",
                    "690731221531117322892584677864570472067061933964271780125153082448324980214",
                ),
            ],
        ),
    }
}

/// The real proof produced by generating a witness for balance = 750000
/// against threshold = 500000 with the compiled reserveProof circuit,
/// confirmed locally with `snarkjs groth16 verify` before being copied here.
fn proof_balance_meets_threshold(env: &Env) -> Proof {
    Proof {
        a: g1_from_decimal(
            env,
            "21793186613080514918686568387268571181546966112971951908556235385796177970724",
            "827193115795569886959035604922394678127723261832600103638367863774953075696",
        ),
        b: g2_from_decimal(
            env,
            "10505632022178701401410031707333467194839617729551337582562990591763717312703",
            "21125361751973730651579911887637193316118212330687224590551792978447129575040",
            "19780050952527146307022054296812073904351006909822913786489735440210571907985",
            "10492476353484736971790922498310877261815198932132838907750179702997280975304",
        ),
        c: g1_from_decimal(
            env,
            "11440897988511548653234015754124878229206937976548722337611093604494625793911",
            "3928307094254927995426530902570321435274740727837863191522367561220089750222",
        ),
    }
}

#[test]
fn test_initialize_then_verify_real_proof() {
    let env = Env::default();
    env.mock_all_auths();

    let client = create_client(&env);
    let admin = Address::generate(&env);
    let issuer = Address::generate(&env);

    client.initialize(&admin, &verus_verification_key(&env));

    let proof = proof_balance_meets_threshold(&env);

    // Public signals are [isValid, threshold] in that fixed order, matching
    // the compiled circuit's actual output, confirmed via
    // `snarkjs groth16 prove` against input { balance: 750000, threshold: 500000 }.
    let pub_signals = Vec::from_array(
        &env,
        [fr_from_decimal(&env, "1"), fr_from_decimal(&env, "500000")],
    );

    client.verify_reserve_proof(
        &issuer,
        &String::from_str(&env, "Meridian Capital Reserve"),
        &Symbol::new(&env, "USDC"),
        &500000u64,
        &proof,
        &pub_signals,
    );

    let record: IssuerRecord = client.get_verification(&issuer).unwrap();
    assert_eq!(record.threshold, 500000u64);

    let all = client.list_verifications();
    assert_eq!(all.len(), 1);
}

#[test]
fn test_threshold_mismatch_is_rejected() {
    let env = Env::default();
    env.mock_all_auths();

    let client = create_client(&env);
    let admin = Address::generate(&env);
    let issuer = Address::generate(&env);

    client.initialize(&admin, &verus_verification_key(&env));

    let proof = proof_balance_meets_threshold(&env);
    let pub_signals = Vec::from_array(
        &env,
        [fr_from_decimal(&env, "1"), fr_from_decimal(&env, "500000")],
    );

    // Declaring a different threshold than the one actually proven must
    // be rejected, since otherwise an issuer could prove a low threshold
    // and register a claim for a higher one.
    let result = client.try_verify_reserve_proof(
        &issuer,
        &String::from_str(&env, "Meridian Capital Reserve"),
        &Symbol::new(&env, "USDC"),
        &999999u64,
        &proof,
        &pub_signals,
    );

    assert!(result.is_err());
}
