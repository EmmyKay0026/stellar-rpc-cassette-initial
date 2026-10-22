import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { CassetteSchema, type Cassette } from '@stellar-rpc-cassette/core';

interface ValidationResult {
  valid: boolean;
  version: unknown;
  interactions: number;
  errors: string[];
}

/**
 * Validate a cassette file's structure without starting a proxy or touching
 * the network. Reports malformed JSON, unsupported versions, and schema
 * violations with actionable messages.
 */
export async function validateCassetteFile(cassetteFile: string): Promise<ValidationResult & { path: string }> {
  const path = resolve(cassetteFile);

  let raw: string;
  try {
    raw = await readFile(path, 'utf8');
  } catch (error) {
    return {
      path,
      valid: false,
      version: undefined,
      interactions: 0,
      errors: [`Failed to read cassette: ${(error as Error).message}`],
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    return {
      path,
      valid: false,
      version: undefined,
      interactions: 0,
      errors: [`Malformed JSON: ${(error as Error).message}`],
    };
  }

  const version = (parsed as { version?: unknown }).version;
  if (version !== 1) {
    return {
      path,
      valid: false,
      version,
      interactions: 0,
      errors: [`Unsupported cassette version: ${String(version)} (supported: 1).`],
    };
  }

  const result = CassetteSchema.safeParse(parsed);
  if (!result.success) {
    const errors = result.error.issues.map((issue) => {
      const where = issue.path.length ? issue.path.join('.') : '(root)';
      return `Invalid field ${where}: ${issue.message}`;
    });
    return {
      path,
      valid: false,
      version: 1,
      interactions: 0,
      errors,
    };
  }

  const data = result.data as Cassette;
  return {
    path,
    valid: true,
    version: 1,
    interactions: data.interactions.length,
    errors: [],
  };
}

/** CLI entrypoint for `stellar-cassette validate <cassette>`. */
export async function runValidate(cassetteFile: string): Promise<void> {
  const result = await validateCassetteFile(cassetteFile);

  if (result.valid) {
    console.log(`Valid cassette: ${result.path}`);
    console.log(`Interactions: ${result.interactions}`);
    return;
  }

  console.error(`Invalid cassette: ${result.path}`);
  for (const message of result.errors) {
    console.error(`  - ${message}`);
  }
  process.exitCode = 1;
}
