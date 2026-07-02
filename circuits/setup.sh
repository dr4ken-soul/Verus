#!/usr/bin/env bash
set -e

# Verus circuit setup script.
# Reproduces the full Circom compilation and Groth16 trusted setup used to
# produce the proving artifacts already shipped in public/circuits/. Run
# this only if you change reserveProof.circom and need to regenerate the
# wasm, zkey and verification key.
#
# Requires circom 2.x on PATH (see BUILD_GUIDE.md for build instructions)
# and Node.js with snarkjs available via npx.

cd "$(dirname "$0")"

if [ ! -d node_modules/circomlib ]; then
  echo "Installing circomlib and snarkjs..."
  npm install
fi

echo "Compiling reserveProof.circom..."
circom reserveProof.circom --r1cs --wasm --sym -l node_modules

echo "Starting powers of tau ceremony (phase 1)..."
npx snarkjs powersoftau new bn128 12 pot12_0000.ptau -v
npx snarkjs powersoftau contribute pot12_0000.ptau pot12_0001.ptau \
  --name="Verus contribution" -v -e="$(date +%s%N)$RANDOM"
npx snarkjs powersoftau prepare phase2 pot12_0001.ptau pot12_final.ptau -v

echo "Running Groth16 phase 2 setup..."
npx snarkjs groth16 setup reserveProof.r1cs pot12_final.ptau reserveProof_0000.zkey
npx snarkjs zkey contribute reserveProof_0000.zkey reserveProof.zkey \
  --name="Verus final contribution" -e="$(date +%s%N)$RANDOM" -v
npx snarkjs zkey export verificationkey reserveProof.zkey verification_key.json

echo "Copying proving artifacts into public/circuits..."
mkdir -p ../public/circuits
cp reserveProof_js/reserveProof.wasm ../public/circuits/reserveProof.wasm
cp reserveProof.zkey ../public/circuits/reserveProof.zkey
cp verification_key.json ../public/circuits/verification_key.json

echo "Done. Run the test cases below to confirm the circuit behaves correctly."
echo "  echo '{\"balance\": \"750000\", \"threshold\": \"500000\"}' > /tmp/input_valid.json"
echo "  node reserveProof_js/generate_witness.js reserveProof_js/reserveProof.wasm /tmp/input_valid.json /tmp/witness.wtns"
echo "  npx snarkjs groth16 prove reserveProof.zkey /tmp/witness.wtns /tmp/proof.json /tmp/public.json"
echo "  npx snarkjs groth16 verify verification_key.json /tmp/public.json /tmp/proof.json"
