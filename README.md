# NonceVector

[![CI](https://github.com/centxyz/NonceVector/actions/workflows/ci.yml/badge.svg)](https://github.com/centxyz/NonceVector/actions/workflows/ci.yml)

NonceVector is a bounded, multi-worker SHA-256 proof-of-work CLI for education, test fixtures, and Hashcash-style challenges. It mines a nonce for a message, verifies proofs without trusting the miner, measures local SHA-256 throughput, and always supports an explicit work limit.

It is not a Bitcoin pool client, does not use a wallet, and does not promise mining income.

## Features

- Exact leading-zero-bit difficulty (not just hexadecimal zeroes)
- Parallel mining with Node.js worker threads
- Configurable worker and maximum-attempt limits
- Independently verifiable proof records
- Cancellation through `AbortSignal` in the library API
- Local SHA-256 benchmark
- No network access or mining-pool credentials

## Install

```bash
git clone https://github.com/centxyz/NonceVector.git
cd NonceVector
npm install
```

## Mine and verify

```bash
npm start -- mine 'demo-challenge' --difficulty 20 --workers 4 --max-attempts 50000000

npm start -- verify 'demo-challenge' \
  --nonce 12345 \
  --hash 00000abc... \
  --difficulty 20
```

The `mine` result contains the message, nonce, digest, bit difficulty, attempts observed, elapsed time, and approximate hash rate. Exit code `2` means the bound was exhausted without a proof or a supplied proof was invalid.

## Benchmark

```bash
npm start -- benchmark --duration 2000
```

Higher difficulties grow exponentially. Use conservative limits: proof-of-work consumes CPU and energy by design.

## Test

```bash
npm test
```

## License

MIT © cent
