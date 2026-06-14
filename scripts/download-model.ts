#!/usr/bin/env -S node --experimental-strip-types
// Download a WhisperKit Core ML model from HuggingFace into the local data dir.
// Usage: node --experimental-strip-types scripts/download-model.ts <model-id>
//
// Stub implementation: actual download will pull the model files from
// https://huggingface.co/argmaxinc/whisperkit-coreml/tree/main/<model-id>
// and place them under ~/Library/Application Support/open-flow/models/<model-id>/.

import { mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const MODELS = ['openai_whisper-tiny.en', 'openai_whisper-base.en', 'openai_whisper-small.en'] as const;
type ModelId = (typeof MODELS)[number];

function isModelId(v: string): v is ModelId {
  return (MODELS as readonly string[]).includes(v);
}

async function main(): Promise<void> {
  const id = process.argv[2];
  if (!id || !isModelId(id)) {
    console.error(`Usage: download-model.ts <${MODELS.join('|')}>`);
    process.exit(1);
  }
  const targetDir = join(homedir(), 'Library', 'Application Support', 'open-flow', 'models', id);
  mkdirSync(targetDir, { recursive: true });
  console.log(`Target: ${targetDir}`);
  console.error('NOT IMPLEMENTED: download not wired yet.');
  console.error('Plan: fetch model files from huggingface.co/argmaxinc/whisperkit-coreml/<id>.');
  process.exit(2);
}

await main();
