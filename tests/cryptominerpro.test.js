const test = require('node:test');
const assert = require('node:assert/strict');
const { CryptoMinerPro, hashCandidate, meetsDifficulty, mineRange } = require('../src/cryptominerpro');

test('measures difficulty in leading zero bits', () => {
  assert.equal(meetsDifficulty(Buffer.from([0x00, 0x0f]), 12), true);
  assert.equal(meetsDifficulty(Buffer.from([0x00, 0x10]), 12), false);
  assert.equal(meetsDifficulty(Buffer.from([0x7f]), 1), true);
  assert.equal(meetsDifficulty(Buffer.from([0x80]), 1), false);
});

test('mines and verifies a deterministic proof', () => {
  const result = mineRange({ message: 'hello', difficulty: 12, maxAttempts: 100_000 });
  assert.equal(result.found, true);
  assert.equal(meetsDifficulty(Buffer.from(result.hash, 'hex'), 12), true);
  const miner = new CryptoMinerPro({ workers: 1 });
  assert.equal(miner.verify(result), true);
  assert.equal(miner.verify({ ...result, message: 'tampered' }), false);
});

test('coordinates multiple worker threads', async () => {
  const miner = new CryptoMinerPro({ workers: 2 });
  const result = await miner.mine('parallel-work', { difficulty: 12, maxAttempts: 100_000 });
  assert.equal(result.found, true);
  assert.equal(miner.verify(result), true);
  assert.ok(result.hashRate > 0);
});

test('returns a bounded not-found result', async () => {
  const miner = new CryptoMinerPro({ workers: 2 });
  const result = await miner.mine('bounded', { difficulty: 255, maxAttempts: 21 });
  assert.equal(result.found, false);
  assert.equal(result.attempts, 21);
});

test('supports cancellation', async () => {
  const miner = new CryptoMinerPro({ workers: 1 });
  const controller = new AbortController();
  const pending = miner.mine('cancel-me', { difficulty: 255, maxAttempts: 50_000_000, signal: controller.signal });
  controller.abort();
  await assert.rejects(pending, /cancelled/);
});

test('benchmarks SHA-256 throughput', () => {
  const result = new CryptoMinerPro({ workers: 1 }).benchmark({ durationMs: 50 });
  assert.equal(result.algorithm, 'sha256');
  assert.ok(result.attempts > 0);
  assert.ok(result.hashesPerSecond > 0);
  assert.equal(hashCandidate('x', 1).length, 32);
});
