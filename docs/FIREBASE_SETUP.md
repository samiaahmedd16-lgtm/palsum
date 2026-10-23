# Turn on Palsum accounts and cloud saving

The implementation is on `codex/accounts-and-cloud`. Keep the current production branch until the checks below pass. A Vercel deployment of this branch is a preview; without Firebase settings it offers one device-only guest hangout and clearly marks account sign-in as unavailable.

## 1. Create the Firebase project

Open https://console.firebase.google.com/ and create a project named Palsum. Analytics is optional. Add a **Web app**, then keep the web configuration panel open.

Create a **Cloud Firestore** database. Choose a region near your users, start in **production mode**, and deploy this repository's rules before testing account data. Never use permissive test-mode rules for real users.

## 2. Enable sign-in

In **Authentication → Sign-in method**, enable:

- **Google**: choose your public project name and support email.
- **Anonymous**: provides a guest account that can later link to Google.

In **Authentication → Settings → Authorized domains**, add `palsum.vercel.app` and `palsum-git-codex-accounts-and-cloud-samiaahmedd16-lgtm.vercel.app` (the current branch preview). Add other exact preview hostnames if you use them. Add `localhost` when developing locally if it is absent. Google OAuth test-mode consent configurations also require your testers to be allowed in the Google Cloud consent screen.

Google and anonymous authentication can start on Firebase’s Spark plan within its quotas.

## 3. Set the web configuration in Vercel

In the Palsum project, open **Settings → Environment Variables** and add these for your feature-branch preview first:

| Variable | Value from Firebase Web app config |
| --- | --- |
| `VITE_FIREBASE_API_KEY` | `apiKey` |
| `VITE_FIREBASE_AUTH_DOMAIN` | `authDomain` (usually `your-project.firebaseapp.com`) |
| `VITE_FIREBASE_PROJECT_ID` | `projectId` |
| `VITE_FIREBASE_APP_ID` | `appId` |

These four values are public browser configuration. Access control comes from Firebase Authentication and Firestore rules. **Never put an Admin SDK private key, a service-account JSON file, or another secret into a `VITE_` variable.**

Leave `VITE_USE_FIREBASE_EMULATORS` unset on Vercel. Production builds refuse it when enabled. Variables are embedded at build time, so redeploy after adding them.

The committed `vercel.json` specifies `npm ci`, `npm run build`, and output `dist`. This replaces the previous no-build/static-folder configuration; leave the repository's root directory as the project root.

## 4. Test and deploy the database rules

The GitHub Actions workflow `Palsum checks` runs the rules suite against Firebase's emulator using demo identities. Its result must pass before connecting real users.

To run locally with Node 22.12+ and Java 21:

```sh
npm ci
npm test
npx --yes firebase-tools emulators:exec --only auth,firestore --project demo-palsum "npm run test:rules && npm run test:auth-emulator"
```

The rules tests check owner-only access, guest slot limits, attempts to reset the limit, attempts to create plans as a guest, stale revisions and account upgrades.

After those tests pass, authenticate with Firebase on your own machine and deploy the rules to the project you created:

```sh
npx --yes firebase-tools login
npx --yes firebase-tools deploy --only firestore:rules --project YOUR_FIREBASE_PROJECT_ID
```

Alternatively, open **Firestore Database → Rules**, replace the editor with the complete contents of [`firestore.rules`](../firestore.rules), and click **Publish**.

A project owner must deploy the rules. No account was provisioned and no paid service was enabled by the code changes.

Validation completed in onboarding: all 11 unit tests and all six Firestore access-rule tests passed. Firebase Auth emulator checks passed for Google account linking, Google credential sign-in and guest upgrades. The full browser workflow also passed cloud saves, second-device restore, live updates, offline reconnection, revision-conflict preservation, account isolation and guest-to-Google upgrades retaining the first hangout. GitHub CI passed the build and emulator rule checks. These checks use demo identities; real Google authorization still requires your project and provider settings.

## 5. Check the actual preview, then promote

1. Sign in with Google. Create a hangout, set a budget, and create a future plan. Confirm **Saved to your account**, not merely a device-save message.
2. Sign in with the same Google account in a different browser or phone. Confirm all three load. Edit on one device and verify the other refreshes when no form is being edited.
3. Continue as guest. Create a hangout, edit it, then try a second hangout, a future plan, a different backup and deleting/recreating a hangout. The app must require sign-in for additional entries, and rules must reject direct API attempts to create a second ID.
4. Upgrade the guest to a new Google account. Linking retains its Firebase user ID. Signing into an existing account keeps the device draft separate; use **Bring my device hangouts into this account** to merge it explicitly.
5. Sign out, then sign into a different account. Previous account data must not appear. A guest/device draft can still appear on that same browser, because it belongs to the browser rather than either signed-in account.
6. Go offline, edit a saved entry, reconnect, and confirm its save status. Concurrent edits from another device stop at a revision conflict and preserve the device draft. Export the draft before choosing **Load latest cloud copy** if you want to retain both versions.
7. Promote the tested Vercel preview to Production, or merge this branch into your production branch, and make the four Firebase variables available to Production too. Add the final production hostname to Firebase authorized domains.

## 6. Install on phones

Open the HTTPS production website on the phone. Android Chrome offers **Install app** / **Add to Home screen**; iPhone Safari uses **Share → Add to Home Screen**. Palsum's Install app button opens the native prompt where supported and shows instructions otherwise. Installed mode hides the install prompt. This is a PWA, not an APK or App Store listing.

The service worker caches only public shell assets. It does not cache authentication or database responses. Signed-in users have a per-account device cache and a serial save queue. Sign-out warns about pending changes. If the user proceeds, a draft stays on the device under that account’s ID for recovery after signing in again; it is never shown to another account.

## Data and limits

- Firestore paths are `users/{uid}/settings/main`, `users/{uid}/hangouts/{id}` and `users/{uid}/plans/{id}`. Each entry has its own document. Signed-in users can maintain many entries rather than filling one giant ledger document.
- Guests have one permitted hangout ID per anonymous account. A new anonymous identity after clearing browser data is a new account; this is not a device-wide fraud-prevention system. Guest access is not recoverable on another device until linked to Google.
- Existing local-only data is preserved and can be imported into an account explicitly. Account preferences win on import, and duplicate IDs are not silently overwritten.
- The app calculates equal splits and suggested payments. It does not process money.
- Shared links remain read-only snapshots containing names and amounts. Signing in does not turn those links into private or synchronized groups.

## Optional full browser check with emulators

Keep Auth and Firestore emulators running with the demo project. In a separate terminal, build an isolated demo bundle (the values below are emulator-only identifiers):

```sh
PALSUM_BUILD_DIR=.test-build VITE_FIREBASE_API_KEY=demo-key VITE_FIREBASE_AUTH_DOMAIN=demo-palsum.firebaseapp.com VITE_FIREBASE_PROJECT_ID=demo-palsum VITE_FIREBASE_APP_ID=demo-app VITE_USE_FIREBASE_EMULATORS=true npm run build -- --mode test
PALSUM_BUILD_DIR=.test-build npm run preview -- --port 8010
```

With Playwright and Chromium available as described in the README, another terminal can run:

```sh
PLAYWRIGHT_MODULE=/tmp/palsum-browser/node_modules/playwright node tests/auth-browser.cjs
PLAYWRIGHT_MODULE=/tmp/palsum-browser/node_modules/playwright node tests/cloud-browser.cjs
```

The full cloud suite exercises actual Firebase client SDK calls against both emulators and the repository's rules. It creates only demo users and uses emulator Google credentials instead of opening the external Google popup. Guest upgrades use the emulator linking endpoint followed by a reload; the separate Auth SDK test checks credential linking. These suites do not verify the app’s popup flow or live Google OAuth. Run the rules suite before the browser suites, because rules tests clear their demo database between cases.
