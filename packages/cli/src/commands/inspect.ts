import { resolve } from 'node:path';
import { loadCassette } from '@stellar-rpc-cassette/core';

export async function runInspect(cassetteFile: string): Promise<void> {
  const path = resolve(cassetteFile);
  const cassette = await loadCassette(path);
  const methods = new Map<string, number>();

  for (const interaction of cassette.interactions) {
    methods.set(interaction.request.method, (methods.get(interaction.request.method) ?? 0) + 1);
  }

  console.log(`Cassette: ${path}`);
  console.log(`Format: ${cassette.format} v${cassette.version}`);
  console.log(`Interactions: ${cassette.interactions.length}`);
  console.log('Methods:');
  for (const [method, count] of methods) {
    console.log(`  ${method.padEnd(24)} ${count}`);
  }
}
