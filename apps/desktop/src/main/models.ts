import { mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { dataDir, modelsDir } from './paths.js';
import type { WhisperModelId } from '@open-flow/shared';

export interface ModelManifestEntry {
  id: WhisperModelId;
  displayName: string;
  approxSizeMb: number;
  description: string;
}

export const MODEL_MANIFEST: ModelManifestEntry[] = [
  {
    id: 'openai_whisper-tiny.en',
    displayName: 'Whisper Tiny (English)',
    approxSizeMb: 39,
    description: 'Smallest, fastest, lower accuracy.',
  },
  {
    id: 'openai_whisper-base.en',
    displayName: 'Whisper Base (English)',
    approxSizeMb: 74,
    description: 'Good balance for English dictation. Recommended.',
  },
  {
    id: 'openai_whisper-small.en',
    displayName: 'Whisper Small (English)',
    approxSizeMb: 244,
    description: 'Best accuracy, noticeably slower.',
  },
];

// WhisperKit (via swift-transformers Hub API) downloads under
// <downloadBase>/models/argmaxinc/whisperkit-coreml/<variant>/
// We point downloadBase at the app data dir so the cache lives under
// ~/Library/Application Support/open-flow/models/argmaxinc/whisperkit-coreml/<variant>/.
export const WHISPER_REPO = 'argmaxinc/whisperkit-coreml';

export function downloadBase(): string {
  return dataDir();
}

export function modelDirFor(id: WhisperModelId): string {
  return join(modelsDir(), 'argmaxinc', 'whisperkit-coreml', id);
}

export function isModelInstalled(id: WhisperModelId): boolean {
  const dir = modelDirFor(id);
  if (!existsSync(dir)) return false;
  // Require the three .mlmodelc folders. If any are missing, treat as not installed.
  return (
    existsSync(join(dir, 'AudioEncoder.mlmodelc')) &&
    existsSync(join(dir, 'TextDecoder.mlmodelc')) &&
    existsSync(join(dir, 'MelSpectrogram.mlmodelc'))
  );
}

export function ensureModelsDir(): void {
  mkdirSync(modelsDir(), { recursive: true });
}
