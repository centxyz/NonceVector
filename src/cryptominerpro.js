const { createHash } = require('node:crypto');
const { cpus } = require('node:os');
const { Worker, isMainThread, parentPort, workerData } = require('node:worker_threads');

function hashCandidate(message, nonce) { return createHash('sha256').update(`${message}:${nonce}`).digest(); }
function meetsDifficulty(hash, bits) {
  const bytes = Math.floor(bits / 8); const remainder = bits % 8;
  for (let index = 0; index < bytes; index += 1) if (hash[index] !== 0) return false;
  return remainder === 0 || (hash[bytes] & (0xff << (8 - remainder))) === 0;
}
function validateDifficulty(bits) {
  if (!Number.isInteger(bits) || bits < 0 || bits > 255) throw new Error('Difficulty must be an integer from 0 to 255 bits');
}
function mineRange({ message, difficulty, start = 0, step = 1, maxAttempts = Infinity }) {
  validateDifficulty(difficulty);
  const startedAt = Date.now();
  for (let attempts = 0, nonce = start; attempts < maxAttempts; attempts += 1, nonce += step) {
    const hash = hashCandidate(message, nonce);
    if (meetsDifficulty(hash, difficulty)) return { found: true, message, difficulty, nonce, hash: hash.toString('hex'), attempts: attempts + 1, elapsedMs: Date.now() - startedAt };
  }
  return { found: false, message, difficulty, attempts: maxAttempts, elapsedMs: Date.now() - startedAt };
}

if (!isMainThread && workerData?.type === 'mine') parentPort.postMessage(mineRange(workerData.options));

class NonceFoundry {
  constructor({ workers = Math.max(1, cpus().length - 1) } = {}) {
    if (!Number.isInteger(workers) || workers < 1 || workers > 64) throw new Error('Workers must be an integer from 1 to 64');
    this.workers = workers;
  }

  async mine(message, { difficulty = 20, maxAttempts = 50_000_000, signal } = {}) {
    if (!message) throw new Error('Message is required');
    validateDifficulty(difficulty);
    if (!Number.isSafeInteger(maxAttempts) || maxAttempts < 1) throw new Error('maxAttempts must be a positive safe integer');
    if (signal?.aborted) throw new Error('Mining cancelled');
    const perWorker = Math.floor(maxAttempts / this.workers);
    const remainder = maxAttempts % this.workers;
    const startedAt = Date.now();
    const workers = [];
    return new Promise((resolve, reject) => {
      let finished = 0; let attempts = 0; let settled = false;
      const cleanup = () => { signal?.removeEventListener('abort', abort); for (const worker of workers) worker.terminate(); };
      const complete = result => { if (settled) return; settled = true; cleanup(); resolve({ ...result, attempts, elapsedMs: Date.now() - startedAt, hashRate: Math.round(attempts / Math.max(0.001, (Date.now() - startedAt) / 1000)) }); };
      const fail = error => { if (settled) return; settled = true; cleanup(); reject(error); };
      const abort = () => fail(new Error('Mining cancelled'));
      signal?.addEventListener('abort', abort, { once: true });
      for (let index = 0; index < this.workers; index += 1) {
        const worker = new Worker(__filename, { workerData: { type: 'mine', options: { message, difficulty, start: index, step: this.workers, maxAttempts: perWorker + (index < remainder ? 1 : 0) } } });
        workers.push(worker);
        worker.once('message', result => {
          attempts += result.attempts; finished += 1;
          if (result.found) complete(result);
          else if (finished === this.workers) complete({ found: false, message, difficulty });
        });
        worker.once('error', fail);
      }
    });
  }

  verify({ message, nonce, hash, difficulty }) {
    validateDifficulty(difficulty);
    if (!Number.isSafeInteger(nonce) || nonce < 0) return false;
    const calculated = hashCandidate(message, nonce);
    return calculated.toString('hex') === String(hash).toLowerCase() && meetsDifficulty(calculated, difficulty);
  }

  benchmark({ durationMs = 1000 } = {}) {
    if (!Number.isInteger(durationMs) || durationMs < 50 || durationMs > 60_000) throw new Error('Benchmark duration must be between 50 and 60000ms');
    const start = Date.now(); let attempts = 0;
    while (Date.now() - start < durationMs) { hashCandidate('noncefoundry-benchmark', attempts); attempts += 1; }
    const elapsedMs = Date.now() - start;
    return { algorithm: 'sha256', attempts, elapsedMs, hashesPerSecond: Math.round(attempts / (elapsedMs / 1000)) };
  }
}

const CryptoMinerPro = NonceFoundry;

module.exports = { NonceFoundry, CryptoMinerPro, hashCandidate, meetsDifficulty, mineRange };
