#!/usr/bin/env bash
set -euo pipefail

# Placeholder for codesigning + notarization. Filled in when we have a Developer ID Application cert.
# Will use `codesign` for both the Electron .app and the Swift sidecar binary inside it,
# then `xcrun notarytool submit` followed by `xcrun stapler staple`.

echo "notarize.sh: not implemented yet. Requires Developer ID Application certificate."
exit 1
