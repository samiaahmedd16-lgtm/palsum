# Palsum — Better together

A playful, installable expense-sharing web app (PWA) for group hangouts and shared expenses. No npm required.

## Included
- Hangouts: place, date, friends, contributions, equal-share calculations, simplified suggested settlements
- Read-only hangout snapshot links (generated URLs contain friends’ names and amounts)
- Hangout history, search, future plans, budgets, threshold and projected-spending warnings
- Five changeable themes, offline cached app shell, home-screen installation
- JSON export/import for backups

## Publish and share
1. Visit https://vercel.com/drop and sign in.
2. Upload the **contents of this folder** (index.html, sw.js, manifest.webmanifest, icons/) or the ZIP.
3. Deploy your project as `palsum` if available. Share the resulting HTTPS URL.
4. On an Android phone, open the URL in Chrome and select Install app. On iPhone, use Share → Add to Home Screen. Desktop browsers offer Install app when supported.

You can also run locally by opening index.html, but **PWA installation and service-worker offline use require HTTPS or localhost**. For local PWA tests, `python3 -m http.server 8000` then navigate to http://localhost:8000.

## Important limits before inviting real users
- **No shared backend or accounts yet**. Each person’s edits and historical data stay in their own browser.
- Hangout links are read-only snapshots, **not synchronized**. Everyone sees the snapshot included in the link; edits don't propagate. They may expose names/amounts to anyone with the link.
- Install means a progressive web app, **not** an APK or App Store listing.
- Equal splits only, no payment processing; the app suggests rather than completes transfers.
- This is a prototype; never store confidential or sensitive financial information here.

## Next production phase
Add sign-in, database (e.g. Firebase/Supabase), private group permissions, short live share IDs, unequal splits and payment status.

## This revision

- Fixed delegated clicks matching `body[data-theme]`, which re-rendered the entire app on input clicks and swallowed other actions.
- Added a paper-and-sticker visual style with local font fallbacks and no external font dependencies.
- Replaced budget prompts with a validated form, added dialog keyboard controls and accessible input names.
- Plan conversion now starts with actual contributions at zero, retains invited friends, and removes the plan only after the expense is saved, avoiding double counting.
- Browser storage failures no longer prevent startup. Invalid backups are rejected before replacing saved data. Budget shares use the same cent rounding as settlements.
- Updated the offline cache version and PWA theme colors.

## Development and validation

The app has no build step or runtime packages. Start from this directory with `python3 -m http.server 8000`.

Optional browser regression tests require Playwright and Chromium. To keep test dependencies outside the app:

```sh
npm install --prefix /tmp/palsum-browser --cache /tmp/palsum-npm-cache playwright
PLAYWRIGHT_MODULE=/tmp/palsum-browser/node_modules/playwright node tests/smoke.cjs
PLAYWRIGHT_MODULE=/tmp/palsum-browser/node_modules/playwright node tests/storage.cjs
```

Run the server first. Tests use `/usr/bin/chromium`; `smoke.cjs` also accepts `CHROMIUM_PATH`. Smoke tests cover desktop/mobile input, expense creation and editing, settlements, search, budget updates, plan conversion, theme persistence, and horizontal overflow. Storage tests cover Unicode snapshot links, exports/imports, malformed backups, offline reload, and denied localStorage access. Test data stays in isolated browser contexts.
