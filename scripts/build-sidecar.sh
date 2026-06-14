#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SIDECAR="$ROOT/apps/sidecar"
OUT_DIR="$ROOT/apps/desktop/resources/bin"

echo "==> Building Swift sidecar (release)"
cd "$SIDECAR"
swift build -c release

BUILT="$(swift build -c release --show-bin-path)/open-flow-sidecar"
if [[ ! -x "$BUILT" ]]; then
    echo "ERROR: built binary not found at $BUILT" >&2
    exit 1
fi

mkdir -p "$OUT_DIR"
cp "$BUILT" "$OUT_DIR/open-flow-sidecar"
chmod +x "$OUT_DIR/open-flow-sidecar"

echo "==> Sidecar copied to $OUT_DIR/open-flow-sidecar"
