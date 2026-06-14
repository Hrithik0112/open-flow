import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { EventEmitter } from 'node:events';
import { existsSync } from 'node:fs';
import { type Incoming, type Outgoing, encode, decode } from '@open-flow/shared';
import { sidecarBinaryPath } from './paths.js';

const RESTART_DELAY_MS = 1000;
const MAX_RESTART_DELAY_MS = 30_000;

export class Sidecar extends EventEmitter {
  private child: ChildProcessWithoutNullStreams | null = null;
  private stdoutBuf = '';
  private stderrBuf = '';
  private shuttingDown = false;
  private restartDelay = RESTART_DELAY_MS;

  start(): void {
    const binary = sidecarBinaryPath();
    if (!existsSync(binary)) {
      this.emit('fatal', new Error(`Sidecar binary missing at ${binary}. Run \`pnpm build:sidecar\`.`));
      return;
    }
    this.shuttingDown = false;
    const child = spawn(binary, [], { stdio: ['pipe', 'pipe', 'pipe'] });
    this.child = child;

    child.stdout.setEncoding('utf8');
    child.stdout.on('data', (chunk: string) => this.handleStdout(chunk));
    child.stderr.setEncoding('utf8');
    child.stderr.on('data', (chunk: string) => this.handleStderr(chunk));

    child.on('exit', (code, signal) => {
      this.emit('exit', { code, signal });
      this.child = null;
      if (!this.shuttingDown) this.scheduleRestart();
    });

    child.on('error', (err) => this.emit('childError', err));
    this.restartDelay = RESTART_DELAY_MS;
  }

  send(msg: Outgoing): void {
    if (!this.child || this.child.stdin.destroyed) return;
    this.child.stdin.write(encode(msg));
  }

  shutdown(): void {
    this.shuttingDown = true;
    if (this.child) {
      try {
        this.send({ type: 'shutdown' });
        this.child.stdin.end();
      } catch {
        // ignore
      }
      const child = this.child;
      setTimeout(() => {
        if (!child.killed) child.kill('SIGTERM');
      }, 1000);
    }
  }

  private handleStdout(chunk: string): void {
    this.stdoutBuf += chunk;
    let idx: number;
    while ((idx = this.stdoutBuf.indexOf('\n')) >= 0) {
      const line = this.stdoutBuf.slice(0, idx);
      this.stdoutBuf = this.stdoutBuf.slice(idx + 1);
      const msg = decode(line) as Incoming | null;
      if (msg) this.emit('message', msg);
    }
  }

  private handleStderr(chunk: string): void {
    this.stderrBuf += chunk;
    let idx: number;
    while ((idx = this.stderrBuf.indexOf('\n')) >= 0) {
      const line = this.stderrBuf.slice(0, idx);
      this.stderrBuf = this.stderrBuf.slice(idx + 1);
      if (line) this.emit('log', line);
    }
  }

  private scheduleRestart(): void {
    const delay = this.restartDelay;
    this.restartDelay = Math.min(this.restartDelay * 2, MAX_RESTART_DELAY_MS);
    setTimeout(() => {
      if (!this.shuttingDown) this.start();
    }, delay);
  }
}
