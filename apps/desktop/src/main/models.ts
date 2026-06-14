import { mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { modelsDir } from './paths.js';
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

export function modelDirFor(id: WhisperModelId): string {
  return join(modelsDir(), id);
}

export function isModelInstalled(id: WhisperModelId): boolean {
  return existsSync(modelDirFor(id));
}

export function ensureModelsDir(): void {
  mkdirSync(modelsDir(), { recursive: true });
}

// Actual download logic is intentionally deferred. The download will pull the
// pinned set of .mlmodelc / config files from huggingface.co/argmaxinc/whisperkit-coreml
// and place them under modelDirFor(id). See scripts/download-model.ts.
export async function downloadModel(_id: WhisperModelId, _onProgress?: (pct: number) => void): Promise<void> {
  throw new Error('downloadModel is not implemented yet. See scripts/download-model.ts.');
}
