# Palsum

A playful expense-sharing PWA for hangouts, equal splits, personal budgets and future plans.

This branch adds Firebase Google sign-in, anonymous guest accounts and account-specific cloud storage. **Live accounts require a Firebase project and deployed access rules.** Until configured, one device-only guest hangout works and account sign-in is visibly unavailable.

Follow [Firebase and Vercel setup](docs/FIREBASE_SETUP.md) to turn on real accounts. Code does not provision a project, authorize your account.

## Develop

Node 22.12+ is required.

```sh
npm ci
cp .env.example .env.local
# Fill only the Firebase web config values when you have a project.
npm run dev
```

For the production bundle: `npm run build`, then `npm run preview`.

Vercel uses the committed `vercel.json`: install `npm ci`, build `npm run build`, output `dist`. The older instructions to deploy the source folder with no build no longer apply to this branch.

## Verify

```sh
npm test
npm run build
```

The unit suite verifies guest limits, account/device merges, serial saves, reconnect behavior, conflict preservation, account-switch isolation and production emulator guards.

Existing browser suites require Playwright and Chromium. With the production preview on port 8000:

```sh
npm install --prefix /tmp/palsum-browser --cache /tmp/palsum-npm-cache playwright
PLAYWRIGHT_MODULE=/tmp/palsum-browser/node_modules/playwright node tests/smoke.cjs
PLAYWRIGHT_MODULE=/tmp/palsum-browser/node_modules/playwright node tests/dashboard.cjs
PLAYWRIGHT_MODULE=/tmp/palsum-browser/node_modules/playwright node tests/storage.cjs
PLAYWRIGHT_MODULE=/tmp/palsum-browser/node_modules/playwright node tests/guest.cjs
```

The production browser suites run without Firebase config. They verify the local guest workflow; they do not establish that live Google or Firestore access works. The separate Auth emulator tests cover anonymous-to-Google linking and Google credential sign-in. Database rules require the Firestore emulator. The full cloud browser suite also tests actual Firebase SDK saves/restores, offline conflicts and account upgrades against both emulators; see the setup guide and CI workflow.

## Phone installation and data

Android also has separate [Debug and signed Release APKs](https://github.com/samiaahmedd16-lgtm/palsum/releases/tag/android-v0.2.0-1).
They install side by side and use the live website and Firebase project. See
[Android build and signing instructions](android/README.md). iPhone installation
continues to use Safari's Add to Home Screen.

On Android, use Chrome's Install app option. On iPhone, open in Safari and use Share → Add to Home Screen. PWA installation and offline use require HTTPS or localhost.

Signed-in users save hangouts, plans, budget and theme to their account, with a device cache for offline work. Other accounts cannot access those Firestore paths. Changes on different devices use a revision check; a conflict preserves the device draft instead of silently overwriting cloud data.

Guests have one hangout per guest identity. Plans and additional hangouts require sign-in. Existing larger local ledgers remain available for migration. Choose **Me** beside your name to track your own share after renaming it.

Sharing still generates read-only snapshots, not live group editing. Anyone with a snapshot link can read its names and amounts. Transfers remain suggestions, not payments.

## Previews

[Open the branch preview](https://palsum-git-codex-accounts-and-cloud-samiaahmedd16-lgtm.vercel.app). Google sign-in activates after the Firebase setup above.

Demo screenshots: [account screen](docs/previews/accounts-desktop.png), [mobile account screen](docs/previews/accounts-mobile.png), [dashboard shortcuts](docs/previews/dashboard-desktop.png).
