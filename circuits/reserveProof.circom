pragma circom 2.0.0;

include "circomlib/circuits/comparators.circom";

// Verus reserve proof circuit.
//
// Proves that an issuer's actual reserve balance meets or exceeds a
// publicly declared threshold, without revealing the balance itself.
//
// Private input:  balance   — the issuer's actual reserve balance
// Public input:   threshold — the publicly claimed minimum
// Public output:  isValid   — 1 if balance >= threshold, 0 otherwise
//
// The balance never appears in any public signal. Only the threshold
// and the single boolean result are exposed to the verifier.
template ReserveProof() {
    signal input balance;
    signal input threshold;
    signal output isValid;

    // GreaterEqThan(64) supports balances and thresholds up to 2^64 - 1,
    // comfortably covering any realistic stroop-denominated reserve figure.
    component gte = GreaterEqThan(64);
    gte.in[0] <== balance;
    gte.in[1] <== threshold;
    isValid <== gte.out;
}

component main {public [threshold]} = ReserveProof();
