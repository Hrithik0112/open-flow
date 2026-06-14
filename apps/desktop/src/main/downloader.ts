import { createWriteStream } from 'node:fs';
import { mkdir, rm, rename } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

const HF_REPO = 'argmaxinc/whisperkit-coreml';
const HF_API = `https://huggingface.co/api/models/${HF_REPO}`;
const HF_RESOLVE = `https://huggingface.co/${HF_REPO}/resolve/main`;

interface HfTreeEntry {
  type: 'file' | 'directory';
  path: string;
  oid: string;
  size?: number;
}

export interface DownloadProgress {
  bytesDownloaded: number;
  totalBytes: number;
  currentFile: string;
  filesDone: number;
  totalFiles: number;
}

export type ProgressFn = (p: DownloadProgress) => void;

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { 'User-Agent': 'open-flow/0.0.0' } });
  if (!res.ok) throw new Error(`fetch ${url} failed: ${res.status} ${res.statusText}`);
  return (await res.json()) as T;
}

async function listModelFiles(modelId: string): Promise<HfTreeEntry[]> {
  const url = `${HF_API}/tree/main/${encodeURIComponent(modelId)}?recursive=true`;
  const entries = await fetchJson<HfTreeEntry[]>(url);
  return entries.filter(
    (e) =>
      e.type === 'file' &&
      // .mlpackage is the uncompiled source; WhisperKit loads .mlmodelc at runtime.
      !e.path.includes('.mlpackage/'),
  );
}

/**
 * Download a WhisperKit Core ML model from HuggingFace into `targetDir`.
 *
 * Strategy: download into a sibling `.partial` directory then atomically rename
 * on success. On failure the partial directory is cleaned up.
 */
export async function downloadModel(
  modelId: string,
  targetDir: string,
  onProgress?: ProgressFn,
): Promise<void> {
  const files = await listModelFiles(modelId);
  if (files.length === 0) {
    throw new Error(`No files found for model ${modelId} on HuggingFace`);
  }

  const totalBytes = files.reduce((sum, f) => sum + (f.size ?? 0), 0);
  const totalFiles = files.length;
  const partialDir = `${targetDir}.partial`;
  await rm(partialDir, { recursive: true, force: true });
  await mkdir(partialDir, { recursive: true });

  let bytesDownloaded = 0;
  let filesDone = 0;

  for (const entry of files) {
    const relPath = entry.path.startsWith(modelId + '/') ? entry.path.slice(modelId.length + 1) : entry.path;
    const outPath = join(partialDir, relPath);
    await mkdir(dirname(outPath), { recursive: true });

    onProgress?.({ bytesDownloaded, totalBytes, currentFile: relPath, filesDone, totalFiles });

    const fileUrl = `${HF_RESOLVE}/${entry.path.split('/').map(encodeURIComponent).join('/')}`;
    const res = await fetch(fileUrl, { headers: { 'User-Agent': 'open-flow/0.0.0' } });
    if (!res.ok || !res.body) {
      await rm(partialDir, { recursive: true, force: true });
      throw new Error(`fetch ${fileUrl} failed: ${res.status} ${res.statusText}`);
    }

    const sink = createWriteStream(outPath);
    const counted = countingPassthrough(Readable.fromWeb(res.body as unknown as Parameters<typeof Readable.fromWeb>[0]), (chunkBytes) => {
      bytesDownloaded += chunkBytes;
      onProgress?.({ bytesDownloaded, totalBytes, currentFile: relPath, filesDone, totalFiles });
    });
    await pipeline(counted, sink);
    filesDone += 1;
  }

  await rm(targetDir, { recursive: true, force: true });
  await rename(partialDir, targetDir);
  onProgress?.({ bytesDownloaded, totalBytes, currentFile: '', filesDone, totalFiles });
}

function countingPassthrough(input: Readable, onBytes: (n: number) => void): Readable {
  input.on('data', (chunk: Buffer | string) => {
    const len = typeof chunk === 'string' ? Buffer.byteLength(chunk) : chunk.length;
    onBytes(len);
  });
  return input;
}
