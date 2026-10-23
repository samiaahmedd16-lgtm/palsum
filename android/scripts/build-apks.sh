#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
: "${PALSUM_SIGNING_DIR:?Set PALSUM_SIGNING_DIR to a private directory outside the checkout.}"
python3 scripts/prepare-signing.py
./gradlew --no-daemon --max-workers=2 lintRelease assembleDebug assembleRelease
mkdir -p outputs
cp app/build/outputs/apk/debug/app-debug.apk outputs/palsum-debug.apk
cp app/build/outputs/apk/release/app-release.apk outputs/palsum-release.apk
python3 - <<'PY'
import hashlib
from pathlib import Path
root = Path('outputs')
(root / 'SHA256SUMS.txt').write_text(''.join(
    hashlib.sha256(p.read_bytes()).hexdigest() + '  ' + p.name + '\n'
    for p in sorted(root.glob('*.apk'))))
print('Signed APKs and checksums are in android/outputs/.')
PY
python3 scripts/verify-apks.py
