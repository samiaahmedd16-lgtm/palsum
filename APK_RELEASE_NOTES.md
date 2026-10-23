Palsum Android 0.2.0 — two installable APKs

- palsum-debug.apk: Palsum Debug, package app.vercel.palsum.debug, debugging enabled.
- palsum-release.apk: Palsum, package app.vercel.palsum, signed and debugging disabled. Use this for sharing.

Both can be installed side by side. Both open the live https://palsum.vercel.app service with a compatible browser (Chrome recommended), so they use the same live Firebase project and browser session. Android 7.0+ is required. The APKs are not iPhone apps or Play Store listings.

Build, release lint, APK signatures, ZIP alignment, distinct application IDs and debug/release flags have been checked. Physical-device Google login and save/restore still need a device check.

Install: download an APK on Android, open it, and approve installation from your browser/files app when Android asks. Site verification requires the public /.well-known/assetlinks.json to be deployed; until verified Chrome may show browser controls.

No signing private keys or passwords are in these downloads. Keep the original signing identities for future APK updates.
