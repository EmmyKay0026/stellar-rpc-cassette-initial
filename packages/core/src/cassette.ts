import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';
import { CassetteSchema, type Cassette, type CassetteInteraction } from './types.js';

export function createCassette(): Cassette {
  return {
    format: 'stellar-rpc-cassette',
    version: 1,
    recordedAt: new Date().toISOString(),
    interactions: [],
  };
}

export function appendInteraction(
  cassette: Cassette,
  interaction: Omit<CassetteInteraction, 'sequence'>,
): Cassette {
  return {
    ...cassette,
    interactions: [
      ...cassette.interactions,
      { ...interaction, sequence: cassette.interactions.length + 1 },
    ],
  };
}

export async function loadCassette(path: string): Promise<Cassette> {
  const raw = await readFile(path, 'utf8');
  return CassetteSchema.parse(JSON.parse(raw));
}

export async function saveCassette(path: string, cassette: Cassette): Promise<void> {
  const parsed = CassetteSchema.parse(cassette);
  const directory = dirname(path);
  const temporaryPath = join(directory, `.${basename(path)}.${randomUUID()}.tmp`);

  await mkdir(directory, { recursive: true });

  try {
    await writeFile(temporaryPath, `${JSON.stringify(parsed, null, 2)}\n`, {
      encoding: 'utf8',
      flag: 'wx',
    });
    await rename(temporaryPath, path);
  } catch (error) {
    await rm(temporaryPath, { force: true });
    throw error;
  }
}
