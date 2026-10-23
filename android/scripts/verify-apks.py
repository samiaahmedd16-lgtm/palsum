#!/usr/bin/env python3
"""Verify installable packages, build variants and certificate/site association."""
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import zipfile

root = Path(__file__).resolve().parents[2]
tools = Path(os.environ['ANDROID_HOME']) / 'build-tools/36.0.0'
statements = json.loads((root / 'public/.well-known/assetlinks.json').read_text())
certificates = {s['target']['package_name']: s['target']['sha256_cert_fingerprints'][0]
                .replace(':', '').lower() for s in statements}
results = []
for variant in ['debug', 'release']:
    apk = root / 'android/outputs' / ('palsum-' + variant + '.apk')
    package = 'app.vercel.palsum' + ('.debug' if variant == 'debug' else '')
    signature = subprocess.check_output([str(tools / 'apksigner'), 'verify', '--verbose',
                                         '--print-certs', str(apk)], text=True)
    digest = re.search(r'Signer #1 certificate SHA-256 digest: ([0-9a-fA-F]+)', signature)
    if not digest or digest.group(1).lower() != certificates[package]:
        raise SystemExit('APK signer does not match the generated association file: ' + variant)
    badging = subprocess.check_output([str(tools / 'aapt'), 'dump', 'badging', str(apk)], text=True)
    if not re.search(r"package: name='" + re.escape(package) + r"' versionCode='1'", badging):
        raise SystemExit('Unexpected package/version: ' + variant)
    is_debug = 'application-debuggable' in badging
    if is_debug != (variant == 'debug'):
        raise SystemExit('Incorrect debuggable flag: ' + variant)
    if 'launchable-activity:' not in badging or "targetSdkVersion:'36'" not in badging:
        raise SystemExit('Missing launcher or incorrect Android target: ' + variant)
    subprocess.run([str(tools / 'zipalign'), '-c', '-P', '16', '4', str(apk)],
                   check=True, capture_output=True)
    with zipfile.ZipFile(apk) as archive:
        if any(n.endswith(('.p12', '.jks', '.keystore', '-password')) for n in archive.namelist()):
            raise SystemExit('Private signing file found in APK.')
    results.append({'file': apk.name, 'package': package, 'debuggable': is_debug,
                    'signature_verified': True, 'association_file_matches': True,
                    'zip_alignment_verified': True, 'bytes': apk.stat().st_size,
                    'sha256': hashlib.sha256(apk.read_bytes()).hexdigest()})
target = root / 'android/outputs/verification.json'
target.write_text(json.dumps(results, indent=2) + '\n')
print(json.dumps(results, indent=2))
