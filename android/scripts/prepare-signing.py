#!/usr/bin/env python3
"""Create persistent private signing keys; export public certificates only."""
import hashlib
import json
import os
from pathlib import Path
import secrets
import subprocess

root = Path(__file__).resolve().parents[2]
directory = Path(os.environ['PALSUM_SIGNING_DIR']).resolve()
if directory == root or root in directory.parents:
    raise SystemExit('Keep PALSUM_SIGNING_DIR outside the Git checkout.')
directory.mkdir(parents=True, exist_ok=True, mode=0o700)
directory.chmod(0o700)
statements = []
for variant in ['debug', 'release']:
    key = directory / (variant + '.p12')
    password = directory / (variant + '-password')
    if key.exists() != password.exists():
        raise SystemExit('Incomplete signing identity: restore its matching key/password.')
    if not key.exists():
        password.write_text(secrets.token_urlsafe(40))
        password.chmod(0o600)
        subprocess.run(['keytool', '-genkeypair', '-noprompt', '-storetype', 'PKCS12',
                        '-keystore', str(key), '-alias', 'palsum-' + variant,
                        '-keyalg', 'RSA', '-keysize', '3072', '-validity', '10000',
                        '-dname', 'CN=Palsum ' + variant.title(),
                        '-storepass:file', str(password), '-keypass:file', str(password)],
                       check=True, capture_output=True)
    key.chmod(0o600)
    certificate = subprocess.check_output(['keytool', '-exportcert', '-keystore', str(key),
                                         '-alias', 'palsum-' + variant,
                                         '-storepass:file', str(password)])
    digest = hashlib.sha256(certificate).hexdigest().upper()
    fingerprint = ':'.join(digest[i:i + 2] for i in range(0, len(digest), 2))
    statements.append({'relation': ['delegate_permission/common.handle_all_urls'],
                       'target': {'namespace': 'android_app',
                                  'package_name': 'app.vercel.palsum' + ('.debug' if variant == 'debug' else ''),
                                  'sha256_cert_fingerprints': [fingerprint]}})
target = root / 'public/.well-known/assetlinks.json'
target.parent.mkdir(parents=True, exist_ok=True)
target.write_text(json.dumps(statements, indent=2) + '\n')
print('Signing identities ready; public fingerprints exported to assetlinks.json.')
