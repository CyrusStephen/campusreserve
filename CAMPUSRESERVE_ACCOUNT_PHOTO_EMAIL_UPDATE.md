# CampusReserve account, photo and email update

## Apply the update on Windows

Stop both development servers. Extract the ZIP into a temporary folder and copy its contents into the existing `campusreserve` project, allowing the source files to merge. Keep your existing private `.env` files and local `server/storage` directory.

If you already merged the account, photo and email update, this dependency refresh only needs `client/package-lock.json`, `server/package.json`, `server/package-lock.json`, `server/src/generated/prisma` and this guide. Reinstall from the updated lockfiles before running locally. Prisma will report the registration migration as already applied if it completed earlier.

Open PowerShell in `C:\Users\cyrus\Cyrus Personal\projects\campusreserve` and check that the server still points to the database you intend to update. In the server terminal, run:

```powershell
cd server
npm.cmd ci --include=dev
npx.cmd --no-install prisma generate
npx.cmd --no-install prisma migrate deploy
npm.cmd run dev
```

From the project root in another terminal:

```powershell
cd client
npm.cmd ci
npm.cmd run dev -- --host 0.0.0.0 --port 5173 --strictPort
```

The migration adds registration and photo storage to the existing database. It preserves current users, venue records and booking history. The ZIP contains source files and the sample environment template. Keep any private database backups outside the project archive and Git. If a backup is already tracked in your Git working copy, ignoring it alone will not untrack it.

## Add venue photos

Sign in as an Admin or Super Admin and open **Manage resources**. Select **Photos** on a venue card to open its photo panel. Each resource has a photo slot, including any hall you add as a new resource. Select a JPEG, PNG or WebP and add a short description. The browser resizes the photo for upload. Each venue can have eight uploads, and **Set cover** chooses the main photo.

The five currently configured venues use this same panel. The existing campus gallery includes the Chapel. New uploads are stored in PostgreSQL, and existing uploads can still be served from their original storage directory as long as the files are present.

## Register and approve an account

1. Open **Sign in → Create an account**, enter an `@sbcollege.ac.in` address and request the email.
2. Open the verification link from that inbox. Enter a name, department or office, and a password. This creates a verified account awaiting review. A link expires after 30 minutes and can be used once. Request it again from the sign-up page if it expires.
3. Sign in with an existing Admin or Super Admin. Open **Account approvals**, choose the access role, optionally link the official department if it is in the database, and approve or decline.
4. The user receives the decision by email. After approval, they can sign in with their own password.

The approval page assigns Faculty, Staff, Canteen Staff and Security roles. Continue to provision Admin and Super Admin accounts separately using the existing private command.

## Connect email

Keep sender settings in your local `server/.env` or the Render service's private environment settings. Set `CLIENT_ORIGIN` to the frontend address so email links open the right instance. Use `http://localhost:5173` while testing on your laptop and `https://campusreserve-lac.vercel.app` for your current Vercel frontend. Restart the API after changing server settings.

| Where the backend runs | What to set |
|---|---|
| Laptop or a server with SMTP access | Set `MAIL_FROM`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER` and `SMTP_PASSWORD`. For Gmail on the laptop, use `smtp.gmail.com`, port `587`, `SMTP_SECURE=false` (STARTTLS), the sender address as both the username and the From address, and the app password saved privately. |
| Render free web service | Set `RESEND_API_KEY` and `MAIL_FROM` from a domain verified in Resend. The API sends over HTTPS. If both methods are configured, the Resend API key takes precedence. |

See the [Render free service limits](https://render.com/docs/free#free-web-services) and [Resend sender domain setup](https://resend.com/docs/dashboard/domains/introduction). Keep your college's sender settings and mail service credentials private. On a server confirmed to sit directly behind one trusted reverse proxy, `TRUST_PROXY_HOPS=1` lets the request limiter identify clients behind that proxy.

Booking requesters receive emails for submission, approval, rejection, rescheduling and cancellation, including updates to individual dates. Email delivery runs in the background and retries temporary failures. Booking actions and in-app notifications continue while the email sender is unavailable. Sign-up requires a configured sender.

### Hosted rollout

Check that Render is using the PostgreSQL database you intend to keep for the beta. Keep the build command `npm ci --include=dev && npx --no-install prisma generate && npm run build` and start command `npx --no-install prisma migrate deploy && npm start`. The start command applies the migration to the hosted database.

From the root of the existing Windows Git repository, stage the release files. The `git rm --cached` command removes tracked backups from the next commit while keeping the files on disk.

```powershell
git status --short
git rm --cached --ignore-unmatch -- '*.backup'
git add -- CAMPUSRESERVE_ACCOUNT_PHOTO_EMAIL_UPDATE.md OPERATIONS_EMAIL_WAITLIST.md README.md client/package-lock.json client/src server/.env.example server/package.json server/package-lock.json server/prisma server/src
git diff --cached --name-status
```

After reviewing the staged files, commit and push to the linked branch.

```powershell
git commit -m "Release CampusReserve registration, venue photos and email"
git push origin main
```

Check the deploys for the same commit on Vercel and Render. Confirm the API health endpoint reports a connected database. With the hosted sender and `CLIENT_ORIGIN` configured, use `https://campusreserve-lac.vercel.app/signup` to request a fresh verification email in a real college inbox. A hosted CampusReserve Admin or Super Admin can review the account after verification. The signup approval screen offers the four regular access roles. Admin provisioning runs separately in the server CLI.

The existing Android project still requires its own configured server address and a rebuilt APK to distribute this update on Android.
