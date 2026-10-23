# Palsum Android

Two separately signed APKs use Google's Android Browser Helper 2.7.4 to open the
existing Palsum service in a Trusted Web Activity. Chrome handles Google OAuth and
web storage. Both variants use **https://palsum.vercel.app and its live Firebase
project**; Debug does not create a separate test database. A compatible browser
(Chrome recommended) and Android 7.0+ are required. These are Android packages,
not iOS builds.

| Build | Application ID | Launcher label | Debuggable |
| --- | --- | --- | --- |
| Debug | `app.vercel.palsum.debug` | Palsum Debug | Yes |
| Release | `app.vercel.palsum` | Palsum | No |

Both install side by side and share the browser's account/session.

## Build

Install JDK 17+, Android SDK platform 36 and build-tools 36.0.0. The Gradle wrapper
uses Gradle 8.13 and verifies the official distribution checksum.

```sh
export ANDROID_HOME=/your/android-sdk
export PALSUM_SIGNING_DIR=/your/private/palsum-signing
./android/scripts/build-apks.sh
```

The signing script creates separate debug/release identities once and reuses them.
Keep **both PKCS12 files and both password files** outside Git, backed up privately.
Future updates must use the original key and a higher versionCode. Private keys
and passwords are never part of the APK download or source branch.

Outputs: `android/outputs/palsum-debug.apk`, `palsum-release.apk`, `SHA256SUMS.txt`.
A Gradle build without PALSUM_SIGNING_DIR can compile the wrapper but produces an
unsigned release, which must not be distributed as the release APK.

## Verification and installation

Publish generated `public/.well-known/assetlinks.json` to the production site. It
contains public certificate fingerprints only. Chrome requires that association
before hiding its address bar. Until published/verified, the app opens as a Custom
Tab with browser controls; Google sign-in stays in a supported browser.

Download the APK on Android, open it, and allow installation from your browser or
files app when Android asks. Release is for sharing; Debug is for development.
This is a sideloadable APK, not a Play Store listing.

Run `lintRelease`, assemble both variants, and verify signatures with build-tools
`apksigner verify --verbose --print-certs`. Check IDs, debuggable flags and launch
activities with `aapt dump badging`. Real-device checks should cover launch,
Google login, save/restore and both apps installed together. Automated package
checks do not prove a real-device OAuth flow.
