#!/usr/bin/env node
const minimist = require('minimist');
const { CryptoMinerPro } = require('./cryptominerpro');

const help = `CryptoMinerPro — bounded SHA-256 proof-of-work tool

Usage:
  cryptominerpro mine MESSAGE [--difficulty BITS] [--workers N] [--max-attempts N]
  cryptominerpro verify MESSAGE --nonce N --hash HEX --difficulty BITS
  cryptominerpro benchmark [--duration MS]

Difficulty is the number of leading zero bits required (default: 20).
Mining is CPU-intensive and is intended for education, testing, and Hashcash-style proofs.`;

async function main() {
  const args = minimist(process.argv.slice(2), { string: ['hash'], boolean: ['help'], alias: { h: 'help' } });
  if (args.help || !args._[0]) { console.log(help); return; }
  const miner = new CryptoMinerPro({ workers: args.workers == null ? undefined : Number(args.workers) });
  const command = String(args._[0]); const message = String(args._[1] || '');
  let result;
  if (command === 'mine') result = await miner.mine(message, { difficulty: args.difficulty == null ? 20 : Number(args.difficulty), maxAttempts: args['max-attempts'] == null ? 50_000_000 : Number(args['max-attempts']) });
  else if (command === 'verify') result = { valid: miner.verify({ message, nonce: Number(args.nonce), hash: args.hash, difficulty: Number(args.difficulty) }) };
  else if (command === 'benchmark') result = miner.benchmark({ durationMs: args.duration == null ? 1000 : Number(args.duration) });
  else throw new Error(`Unknown command: ${command}`);
  console.log(JSON.stringify(result, null, 2));
  if (command === 'mine' && !result.found) process.exitCode = 2;
  if (command === 'verify' && !result.valid) process.exitCode = 2;
}
if (require.main === module) main().catch(error => { console.error(JSON.stringify({ error: error.message })); process.exitCode = 1; });
module.exports = { main };
