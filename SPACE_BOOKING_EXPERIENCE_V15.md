# CampusReserve V15 — Space Booking Experience

V15 implements the recorded space-booking polish and security-desk workflow on top of V14.

## Included

- Responsive auto-hide desktop sidebar with edge reveal, delayed close and remembered pin preference.
- Tap-operated mobile navigation drawer with backdrop and Escape closing.
- Live IST date/time and time-aware greeting using the authenticated user's first name.
- Compact dashboard, cards and workspace spacing.
- Administrator **Recent decisions** right-side activity drawer.
- Actionable notifications that deep-link to the relevant booking or approval context.
- Optional lightweight interface sounds for booking/order success, rescheduling and cancellation.
- Professional resource-specific cancellation-deadline explanations.
- Centred cancellation/rescheduling dialogs with Escape and backdrop closing.
- New `SECURITY` role and restricted Security Desk workspace.
- Live booking-reference verification with clear validity states and audited lookups.

## Required database step

From the `server` directory, with the normal `.env` present:

```powershell
npx prisma migrate deploy
npx prisma generate
```

The migration adds the `SECURITY` user role without removing existing data.

## Create the demo Security account

From the `server` directory:

```powershell
npm run user:create
```

Enter a name and college email, choose `SECURITY` as the role, and set a demo password. The Security Desk sign-in address is:

```text
http://localhost:5173/login?service=security
```

## Run locally

Server:

```powershell
cd server
npm install
npm run dev
```

Client (second terminal):

```powershell
cd client
npm install
npm run dev
```
