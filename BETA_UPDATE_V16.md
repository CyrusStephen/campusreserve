# CampusReserve beta update v16 — 29 October 2026

This cumulative source archive is based on campusreserve-safe-20261029-133710.zip.
It includes the existing college photos and five bookable venues. No new venues were added.

## Changes

- Signing out opens a neutral login page. Login resolves its destination using the newly authenticated account. An Admin signing in after Security lands in the Space Bookings workspace, rather than inheriting Security Desk. Restricted-role pages still enforce their existing access checks.
- New college venue defaults use 24 hours' notice. A separate command updates the five existing college venues to 24 hours, with an audit record. It preserves IDs, photos, bookings, capacity, buffers and cancellation policy. Archived and demo venues are skipped. This is a rolling 24 hours, not simply tomorrow's calendar date.
- Added `admin:create`: creates an ACTIVE ADMIN with a locally entered, hashed password and an audit record. It cannot create a Super Admin or overwrite an existing email. No account or password is embedded in this archive.
- Prisma deployment no longer requires a shadow database. Development migrations can still use SHADOW_DATABASE_URL when configured.
- Added Vercel SPA routing and an optional refresh-cookie policy for separate HTTPS frontend/API hosting. Production origin checking remains strict.
- Git ignores environment files, database backups, project_trash and packaged archives. Existing ignored files on your laptop are not deleted.

The booking error was reported resolved by Cyrus during this update. Booking submission logic was not changed to address an unconfirmed cause.

## Merge and run locally

Stop the client and server. Extract this archive outside the project, then copy the contents of its campusreserve folder into your current campusreserve folder, replacing matching files. Preserve your local server/.env and client/.env.local; neither is included here. Keep your current local project backup private.

From the project root in PowerShell:

```powershell
cd server
npm.cmd ci
.\node_modules\.bin\prisma.cmd migrate deploy
.\node_modules\.bin\prisma.cmd generate
npm.cmd run resources:beta-notice
npm.cmd run admin:create
```

For Admin creation, enter the college's agreed display name and email in the terminal. Department code is optional: press Enter to leave it blank. Enter and confirm a unique 12–128 character password privately. The command creates an ADMIN automatically. Share credentials with the designated tester privately; do not put them in GitHub or a project ZIP. Run this against the database the testers will actually use. A local account does not automatically appear in Render's database.

Start the server:

```powershell
npm.cmd run dev
```

In a second terminal, from the project root:

```powershell
cd client
npm.cmd ci
npm.cmd run dev -- --host 0.0.0.0 --port 5173 --strictPort
```

Open http://localhost:5173 on the laptop. Check the server's /api/health endpoint, rather than expecting its root URL to show the website.

## Quick acceptance checks

1. Sign into Security, sign out, then sign into Richardson/Admin in the same browser. Confirm the displayed account and Admin navigation, then open Approvals.
2. Sign out and log in as the new college Admin; verify its name and permissions. Faculty must still be denied administrative actions, and Security must still be denied booking creation.
3. Confirm all five active venues show 24 hours' minimum notice. Submit a booking more than 24 hours ahead, approve it as Admin, and verify its reference from Security. Check that an overlapping booking is rejected.
4. Reload a signed-in page and close/reopen the app to check session restoration on the actual deployed domain.
5. Check mobile and desktop layout, photos, confirmation navigation, notifications and logout.

## GitHub and Vercel

After merging and checking locally, run these from the project root:

```powershell
git status --short
git ls-files -- '*.env' '.env.*' '*/.env' '*/.env.*' '*.backup'
```

The second command should list no real secret files or database backups. .gitignore does not remove files already tracked by Git. If any are listed, remove their tracking before pushing; keep the local copies private.

Stage the source folders and update notes, then inspect the filenames:

```powershell
git add client server .gitignore BETA_UPDATE_V16.md
git diff --cached --stat
git diff --cached --name-only
git commit -m "Prepare CampusReserve beta account switching and venue policy"
git push
```

Vercel project settings: Root Directory `client`, build command `npm run build`, output directory `dist`. Set VITE_API_URL privately in Vercel to the public HTTPS backend origin (without /api at the end). Redeploy after changing this value because Vite embeds it at build time. Do not use localhost or a laptop LAN IP for the hosted website. Confirm Vercel is connected to the branch you pushed.

## Backend and database deployment

For a Node web service rooted at `server`, use a supported Node version compatible with the project's lockfile (the project is being tested with Node 24).

Build command:

```text
npm ci && npx --no-install prisma generate && npm run build
```

Run `npx --no-install prisma migrate deploy` against the hosted database before starting the updated service. Use a pre-deploy command if your service supports it; otherwise run it in your controlled deployment workflow. Start command: `npm start`. Health path: `/api/health`.

Set DATABASE_URL, JWT_ACCESS_SECRET, NODE_ENV=production and CLIENT_ORIGIN privately in the backend hosting dashboard. CLIENT_ORIGIN must be the exact public frontend origin. Keep the existing signing secret stable across redeployments to preserve sessions. No shadow database is required for migrate deploy.

For Vercel and Render on different sites, set REFRESH_COOKIE_SAME_SITE=none on the HTTPS backend. This sets Secure on the refresh cookie. Local HTTP development should keep the default lax setting. Some browsers block third-party cookies even with SameSite=None: test login persistence on the actual phone/browser. A frontend and API under the same college site, or a properly configured same-origin API proxy, is preferable for dependable cookie sessions. This ZIP does not claim that hosting or persistent sessions on an untested domain are already verified.

After migrations, run `npm run resources:college` once on a new hosted database, then `npm run resources:beta-notice` and `npm run admin:create` there. Existing local bookings and users are not transferred by pushing code. Do not copy a local database backup into the public repo.

The existing APK configuration still points to a development hotspot URL. It has not been silently changed: select the final hosted frontend/API addresses and verify them before making a hosted beta APK. Uploaded media also needs durable storage on the backend host; bundled college photos are included in the frontend.

## Validation and limits

Passed: frontend build, lint and 21 unit tests; backend type-check, build and 95 unit tests; Prisma schema validation without a shadow database. Run client `npm.cmd run build`, `npm.cmd run lint`, `npm.cmd test`; server `npm.cmd run typecheck`, `npm.cmd run build`, `npm.cmd test` to repeat checks. Role tests exercise backend permission middleware; venue policy tests use a simulated transaction. Live database writes, Admin creation, phone/browser acceptance and GitHub/Vercel deployment must be completed in your environment. No GitHub push or hosted database change is performed merely by extracting this ZIP.
