#!/usr/bin/env node
import { Command } from 'commander';
import { runInspect } from './commands/inspect.js';
import { runRecord } from './commands/record.js';
import { runReplay } from './commands/replay.js';

const program = new Command();

program
  .name('stellar-cassette')
  .description('Record and replay Stellar JSON-RPC interactions for deterministic offline tests.')
  .version('0.1.0');

program
  .command('record')
  .requiredOption('--upstream <url>', 'Upstream Stellar RPC URL')
  .requiredOption('--cassette <path>', 'Cassette JSON file')
  .option('--host <host>', 'Local host', '127.0.0.1')
  .option('--port <port>', 'Local port', '6969')
  .argument('[command...]', 'Test command to run with STELLAR_RPC_URL injected')
  .action((command, options) => runRecord({ ...options, command }));

program
  .command('replay')
  .requiredOption('--cassette <path>', 'Cassette JSON file')
  .option('--host <host>', 'Local host', '127.0.0.1')
  .option('--port <port>', 'Local port', '6969')
  .option('--match-mode <mode>', 'Replay matching mode: sequential or strict', 'sequential')
  .action(runReplay);

program.command('inspect <cassette>').action(runInspect);

await program.parseAsync(process.argv);
