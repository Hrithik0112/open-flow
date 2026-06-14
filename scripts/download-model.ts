#!/usr/bin/env -S npx tsx
// Download a WhisperKit Core ML model from HuggingFace into the local data dir.
// Usage: pnpm tsx scripts/download-model.ts <model-id>

import { homedir } from 'node:os';
import { join } from 'node:path';
import { downloadModel } from '../apps/desktop/src/main/downloader.ts';

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
  console.log(`Downloading ${id} -> ${targetDir}`);

  let lastPct = -1;
  await downloadModel(id, targetDir, (p) => {
    const pct = p.totalBytes > 0 ? Math.floor((p.bytesDownloaded / p.totalBytes) * 100) : 0;
    if (pct !== lastPct) {
      lastPct = pct;
      process.stderr.write(`\r[${pct.toString().padStart(3, ' ')}%] ${p.filesDone}/${p.totalFiles}  ${p.currentFile}`.padEnd(80));
    }
  });
  process.stderr.write('\n');
  console.log('Done.');
}

main().catch((err: Error) => {
  console.error(err.message);
  process.exit(2);
});
