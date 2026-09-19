# CampusReserve operations: email, waitlist and exports

## Email delivery

CampusReserve uses an email outbox. Booking events are written to `EmailDelivery` in the same database transaction as the booking change. A background worker sends queued messages and retries failures with backoff.

Configure these environment variables in `server/.env` when the college provides an SMTP account:

- `SMTP_HOST`
- `SMTP_PORT` (usually `587` for STARTTLS or `465` for implicit TLS)
- `SMTP_SECURE=true` for implicit TLS; `false` for STARTTLS/plain SMTP
- `SMTP_USER`
- `SMTP_PASSWORD`
- `MAIL_FROM`
- `SUPPORT_EMAIL`
- `SMTP_HELO_NAME`
- `SMTP_REJECT_UNAUTHORIZED=true`

If SMTP is not configured, the app continues to work locally and email delivery stays disabled. Do not commit real SMTP credentials.

Booking submission, approval/rejection, occurrence decisions, reschedules and cancellations create email records. Email delivery is deliberately asynchronous so an SMTP outage does not make a successful booking transaction fail.

## Support alerts

Unexpected HTTP 500 errors, failed database health checks and server startup failures can send a direct alert to `SUPPORT_EMAIL`. Alerts are throttled so one failing endpoint cannot flood the college mailbox.

Technical error details are not exposed to end users.

## Waitlist

- Only occupied slots can be waitlisted.
- Maximum 3 active entries per user.
- Maximum 30 days ahead.
- First-come-first-served.
- When a slot opens, the first eligible entry receives an in-app notification and a 4-hour claim window.
- Claiming creates a normal `PENDING` booking request; it does not bypass administrator approval.
- If the claim expires, the next eligible entry can be notified.

## CSV exports

Administrators can use **Reports & exports** to download filtered booking occurrence records. The CSV includes booking ID, requester, department, assigned coordinator, venue, schedule, statuses, decision information and notes.

For institutional archiving, store exports in the college's approved Drive/SharePoint/storage service once the college confirms its platform. The email inbox should not be used as the primary database or archive.
