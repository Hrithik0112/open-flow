# open-flow-sidecar

Swift CLI binary that handles all macOS native work for open-flow: global hotkey, microphone capture, WhisperKit transcription, and clipboard paste.

Communicates with the Electron main process via newline-delimited JSON over stdin/stdout. See `Sources/OpenFlowSidecar/Protocol.swift` for the schema and the matching `packages/shared/src/ipc.ts` on the TypeScript side.

## Build

From the repo root:

```sh
pnpm build:sidecar
```

This runs `swift build -c release` and copies the binary to `apps/desktop/resources/bin/open-flow-sidecar`.

## Test

```sh
swift test --package-path apps/sidecar
```
