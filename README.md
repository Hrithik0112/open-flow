# open-flow

open-flow is a local-first macOS dictation app.

Hold a hotkey, speak, release, and the transcript is pasted into the field you were already typing in. The app is designed to keep speech processing on the machine instead of sending audio to a cloud API.

## What It Does

- Records speech while a push-to-talk hotkey is held.
- Transcribes speech locally through the Swift sidecar.
- Pastes the final transcript into the focused macOS text field.
- Stores settings, dictionary entries, and history locally.
- Provides a desktop app, settings UI, and landing page from one pnpm workspace.

## Requirements

- macOS 13 or newer.
- Apple Silicon Mac.
- Node.js 20 or newer.
- pnpm.
- Swift toolchain for building the sidecar.

## Setup

Install dependencies from the repository root:

```sh
pnpm install
```

Build the Swift sidecar before packaging or running a full production build:

```sh
pnpm build:sidecar
```

The sidecar binary is copied into `apps/desktop/resources/bin/open-flow-sidecar`.

## Commands

```sh
pnpm dev              # run the Electron desktop app
pnpm dev:landing      # run the landing page
pnpm build:sidecar    # build the Swift sidecar
pnpm build:desktop    # build the desktop app
pnpm build:landing    # build the landing page
pnpm build            # build everything
pnpm lint             # run lint checks
pnpm typecheck        # run TypeScript checks
pnpm test             # run tests
```

## Project Layout

```text
open-flow/
  apps/
    desktop/    Electron app, renderer UI, tray, settings, IPC, storage
    landing/    Vite landing page
    sidecar/    Swift binary for macOS-native work
  packages/
    shared/     Shared TypeScript types and IPC contracts
  scripts/      Build scripts
  spec.md       Product and architecture notes
```

## How It Works

The Electron app owns the UI, settings, dictionary, history, and app lifecycle. It starts the Swift sidecar as a child process and talks to it using newline-delimited JSON over stdin/stdout.

The sidecar handles the macOS-specific pieces that Electron should not own directly: global hotkeys, microphone capture, local transcription, accessibility permissions, and pasting text into the active field.

## Privacy Model

open-flow is built around local processing. Audio, transcripts, models, settings, and dictionary data are intended to stay on the user's Mac.