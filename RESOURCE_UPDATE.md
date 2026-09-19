# CampusReserve — resource catalogue and booking demo milestone

Demo sprint update. This extends the existing React/Express/PostgreSQL project; it is not a replacement stack or a deployed site.

## What is implemented

- Authenticated resource catalogue, search, type filters, pagination and detail pages.
- Administrator-only create/edit forms for halls, rooms, labs and equipment.
- Active, inactive and archived states. No hard-delete operation for resources.
- Photo upload, descriptions, cover selection and removal. Up to eight photos per resource.
- Optional public HTTPS 360° tour link for spaces. It opens in a new tab; embedding is deliberately deferred until the college's provider is checked.
- Editable capacity, stock, facilities, instructions and booking policies.
- Revision checks reject stale edits rather than overwriting another administrator's work.
- Audit entries for resource/photo mutations.
- Optional, repeatable development setup for seven demo halls and three demo labs.
- Demo entries are administrator-only regardless of status. The API does not allow changing the demo flag. Create separate real resources when college details arrive on September 1.
- A shared workspace layout and a dedicated resource stylesheet for later visual redesign.
- Faculty, Staff and administrators can submit booking requests for active, verified resources, with up to 12 independently adjustable custom dates.
- Transactional conflict checks for exclusive spaces, shared equipment stock and resource blocks.
- Pending requests hold their selected time until an administrator decides or the requester cancels.
- Requester booking history and self-service cancellation within each resource's policy.
- Administrator approval queue with approve/reject decisions and audit entries.
- Administrator approval history showing every recorded decision and the administrator responsible.
- Per-occurrence decisions: administrators can approve two dates and reject another with separate reasons, or approve/reject all dates as a shortcut.
- Separation of duties: administrators can book resources, but another administrator must review their request; self-approval and self-rejection are blocked server-side.
- Privacy-preserving live availability on every active venue page, with seven-day navigation across the booking window.
- Pending holds, approved reservations, setup buffers, shared-equipment quantities and campus blocks appear without exposing request titles, purposes or requester identities.
- Availability refreshes after a new request; the transactional server check remains authoritative when the form is submitted.
- Saturday and Sunday are closed by default in the campus calendar. Weekend requests may enter the queue as exceptions, but only an administrator can approve them and a written reason is mandatory.
- Administrators can add and remove venue-specific blocks for holidays, maintenance, examinations/college events, emergencies and other closures directly from Live availability.
- A campus block cannot silently displace an existing pending or approved booking; the administrator must resolve the booking first.
- Live overview totals for active resources, personal pending/upcoming dates, unread notifications, pending approvals and upcoming approved dates.
- An administrator master calendar combines all real resources, pending holds, approved bookings and campus blocks, with weekly navigation and resource filtering.
- Requesters can reschedule one pending, approved or rejected occurrence. The changed date is conflict-checked and returned to the approval queue without resetting the other dates.
- Requesters can cancel one active occurrence in a multi-date request without cancelling the rest. Existing resource deadlines remain authoritative.
- Persistent per-user in-app notifications for submissions, approvals, rejections, booking cancellations, occurrence cancellations and reschedules. Users can mark one or all as read.

## Apply the source update

1. Stop both running development servers with Ctrl+C.
2. Keep a backup of the working project before replacing source files.
3. Merge this ZIP's `client` and `server` folders into the existing `campusreserve` folder. Replace matching source files, not the entire existing project directory.
4. Preserve your existing environment configuration, installed dependencies, generated Prisma client and any photo storage. Do not upload passwords or database connection strings.

No new npm dependencies were added. Package scripts changed, but dependency versions and lockfiles did not.

### First: generate and check (PowerShell)

Run from the original project. Stop at the first failed command and resolve it before continuing.

```powershell
cd C:\Users\cyrus\Documents\Projects\campusreserve\server
npx prisma generate
if ($LASTEXITCODE -ne 0) { throw 'Prisma generation failed. Stop here.' }
npm run typecheck
if ($LASTEXITCODE -ne 0) { throw 'Backend typecheck failed. Stop here.' }
npm test
if ($LASTEXITCODE -ne 0) { throw 'Backend helper tests failed. Stop here.' }
npm run test:validation
if ($LASTEXITCODE -ne 0) { throw 'Resource validation tests failed. Stop here.' }

cd ..\client
npm test
if ($LASTEXITCODE -ne 0) { throw 'Client API tests failed. Stop here.' }
npm run build
if ($LASTEXITCODE -ne 0) { throw 'Frontend build failed. Stop here.' }
```

The current validation suite reports 40 passing tests, including availability/calendar ranges, weekend detection, campus-block input and reschedule input rules.

The client's native Node test runner may print an experimental type-stripping warning. The final pass/fail result is what matters. These tests require the existing Node 24 installation.

### Then: apply the additive database migration

Back up the local database before schema changes. Keep the development servers stopped until this migration succeeds.

```powershell
cd C:\Users\cyrus\Documents\Projects\campusreserve\server
npx prisma migrate deploy
if ($LASTEXITCODE -ne 0) { throw 'Migration failed. Do not reset the database.' }
```

The additive migrations add the resource-catalogue fields, the explicit `REJECTED` occurrence status needed for partial decisions, and the new per-user `Notification` table. They do not drop tables, delete users, rewrite bookings or rewrite the applied initial migration. Do not run `prisma migrate reset` or `db push --accept-data-loss` to handle an error.

The weekend-exception and campus-block controls use the existing resource schema. The only new migration in this package is `20260907173000_in_app_notifications`, which creates the notification table and its indexes.

Optional demo setup, for your development database only:

```powershell
npm run resources:demo
```

This creates missing demo rows only; rerunning it does not overwrite edits. It refuses to run outside development mode. Demo capacity, location and facilities are illustrative, never college facts.

### Start and verify

Start `npm run dev` in the server folder and, in a separate terminal, in the client folder. Use an administrator account for setup and approvals. Create a separate STAFF test account with `npm run user:create` for the requester side of the demo.

Check these flows:

1. Manage resources → Demo venues shows seven halls and three labs after demo setup. Browse resources does not list them.
2. Edit a demo's name, description and policies; save and reload. It stays a demo even if marked active.
3. Upload a JPEG/PNG/WebP photo, verify it on the detail page, edit its description and choose it as cover. Refresh the page to verify persistence.
4. Remove a photo and verify it disappears. Its authenticated image endpoint should now return 404.
5. With a college-approved public HTTPS tour link, verify the optional 360° button opens a new tab. Empty tour fields show no button. Non-HTTPS and embedded-credential links must be rejected.
6. Open the same resource in two tabs. Save an edit in the first. Saving from the stale second tab should report a conflict. Reload explicitly before trying again.
7. Create a FACULTY or STAFF test account using `npm run user:create`. It must not access the management API, inactive/demo resource details, or their photos. The UI hiding a button is not a substitute for this API check.
8. Recheck login, reload, logout and protected-route redirect. Check narrow/mobile widths and both themes.
9. Make one real test resource ACTIVE. Sign in as STAFF, open it, submit a future booking with two or more custom dates and confirm every date appears in My bookings as awaiting approval.
10. Try the same time from a second requester and confirm the server rejects the overlap. Sign in as ADMIN, approve the first request, then confirm the STAFF account shows Approved after reloading My bookings.
11. Submit another request, reject it with a reason, and confirm the reason appears to the requester. Also test a permitted cancellation and confirm its time can be requested again.
12. Submit a three-date request. Approve two occurrences individually, reject the third with a reason, and confirm My bookings shows Partially approved with each date's status. Confirm History identifies the administrator for each individual decision.
13. Open that resource again and confirm Live availability shows the two approved dates, omits the rejected date, navigates by week, and updates after a new pending request without exposing its title or requester.
14. Choose a Saturday or Sunday in the booking form. Confirm it is marked Weekend exception, submit it, and verify an administrator cannot approve it without entering a reason. After approval it should appear as an approved exception on the closed weekend.
15. As an administrator, add a holiday or examination block from Live availability. Confirm it appears on the correct date, prevents a conflicting request, and can be removed only after confirmation. Also confirm a block overlapping an existing pending/approved booking is refused.
16. Open Overview as both a requester and an administrator. Confirm the live totals match the current resources, personal bookings and approval queue; administrators should also see recent decisions.
17. As an administrator, open Master calendar. Navigate weeks and filter by resource. Confirm pending bookings, approved bookings, campus blocks and closed weekends are visually distinct.
18. Submit a multi-date request, then use My bookings to cancel only one pending/approved date. Confirm the other dates keep their statuses and the cancelled date releases its time. Reschedule another date and confirm only that date returns to Pending and appears in the approval queue.
19. Perform a new submission and an administrator decision. Confirm the relevant account receives a persistent notification, the top-right bell badge updates, and Mark read / Mark all read survives a page refresh.

Do not make a made-up venue active in the real catalogue. To verify real catalogue visibility before actual data arrives, use an isolated development database and clearly labelled test records; keep those out of the final college dataset.

## Photo storage and access

- The browser resizes photos to at most 2400 pixels on the longest side and re-encodes them as JPEG. Source file limit: 20 MB; API upload limit: 3 MB.
- The server checks JPEG framing/dimensions and generates filenames itself. This is bounded format validation, not an antivirus scanner or complete server-side image decoder.
- New uploads live under `server/storage/resource-images` by default. Optional `RESOURCE_UPLOAD_DIR` can select a persistent directory. Relative overrides resolve against the server process working directory.
- Photos are fetched with bearer authentication and rendered using temporary blob URLs. The image route applies the same resource visibility rules as the detail route.
- Photo removal removes the database association immediately. Bytes are retained for recovery, with the path recorded in the audit entry; the file can no longer be fetched through the image route. An orphan-retention/cleanup policy is still needed before production.
- Back up this storage directory together with PostgreSQL. Do not place production photos on an ephemeral deployment filesystem. A persistent volume or object-storage integration must be chosen at deployment time.
- The source ZIP does not contain uploaded photos, credentials, generated code or installed dependencies.

## Code map for later interface work

| Area | Location |
| --- | --- |
| Theme tokens, spacing, responsive layouts | `client/src/resources/resources.css` |
| Shared navigation and account controls | `client/src/components/AppShell.tsx` |
| Overview | `client/src/pages/DashboardPage.tsx` |
| Master calendar | `client/src/pages/AdminCalendarPage.tsx` |
| In-app notifications | `client/src/pages/NotificationsPage.tsx`, `client/src/notifications/api.ts` |
| Browse and management listings | `client/src/pages/ResourcesPage.tsx` |
| Details and tour link | `client/src/pages/ResourceDetailPage.tsx` |
| Administrator form | `client/src/pages/ResourceEditorPage.tsx` |
| Photo controls and image rendering | `client/src/resources/PhotoManager.tsx`, `ResourcePhoto.tsx` |
| Client resource requests | `client/src/resources/api.ts` |
| Booking form, live availability, history and approval queue | `client/src/bookings/BookingForm.tsx`, `client/src/bookings/AvailabilityCalendar.tsx`, `client/src/pages/MyBookingsPage.tsx`, `client/src/pages/BookingQueuePage.tsx` |
| Weekend policy | `server/src/utils/campus-calendar.ts`, `client/src/bookings/weekend.ts` |
| Multi-administrator decision history | `client/src/pages/ApprovalHistoryPage.tsx` |
| Client booking requests and types | `client/src/bookings/api.ts`, `client/src/bookings/types.ts` |
| Server resource routes | `server/src/routes/resource.routes.ts` |
| Server booking routes and validation | `server/src/routes/booking.routes.ts`, `server/src/utils/booking-input.ts` |
| Server notification routes and fan-out | `server/src/routes/notification.routes.ts`, `server/src/utils/notifications.ts` |
| Input, media and visibility checks | `server/src/utils/resource-input.ts`, `resource-media.ts`, `resource-access.ts` |
| Additive migrations | `server/prisma/migrations/20260828190000_resource_catalogue/migration.sql`, `server/prisma/migrations/20260906231500_occurrence_decisions/migration.sql`, `server/prisma/migrations/20260907173000_in_app_notifications/migration.sql` |

## Test evidence and remaining checks

Completed in the assistant workspace:

- 38 native Node tests passed: JPEG bounds/framing, filename safety, HTTPS link checks and resource visibility policy.
- 40 Zod validation tests passed: catalogue, bookings, availability, weekend policy, blocks, master-calendar ranges and occurrence rescheduling.
- 10 client API unit tests passed: bearer credentials, refresh deduplication/retry, invalid-session notification, binary photos, permission errors, subscription cleanup and login/refresh/logout serialization.
- Backend TypeScript typecheck passed.
- Frontend TypeScript and Vite production build passed with 1,883 transformed modules.

Not completed in the assistant workspace:

- Migration execution against the user's PostgreSQL data and real browser/UI testing. Run the checks and backup/migration sequence above before considering the update accepted.

The automated checks above cover this package in a clean workspace. Re-run them on Windows after merging, then apply the notification migration and complete the browser checklist.

## Booking behavior and next milestone requirements

- Every booking path rejects demo, inactive and archived resources server-side.
- Quantity rules, exclusivity and blocked intervals are derived from the stored Resource, not client input.
- Booking writers lock the Resource row before resource-dependent conflict checks. Shared equipment stock and ResourceBlock conflicts are checked in the same serializable transaction.
- Rejection and cancellation release occurrence holds, not just the parent reservation status.
- Automatic pending-request expiry still needs a scheduled job; current pending requests remain held until a decision or cancellation.
- Custom recurrence reuses the same locking and conflict rules for every occurrence in one transaction; one conflict rolls back the entire request.
- A rescheduled occurrence always becomes pending again and notifies administrators; previously approved sibling dates remain approved.
- A status change does not cancel existing reservations. Any operational cancellation needs a separate explicit workflow.
- Frontend login, refresh and logout now share a same-tab queue and a Web Lock where supported. Cross-tab operation without Web Locks, offline timeouts and strict-refresh replay handling still need compatibility testing before production.
- Confirm college booking policies, provisioning/domain rules, deployment storage, production cookie settings, dependency audit findings and secret rotation before launch.

Implementation references: [Prisma transactions and concurrency](https://www.prisma.io/docs/orm/prisma-client/queries/transactions), [Express 5 API](https://expressjs.com/en/5x/api/), [embedding restrictions](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/frame-ancestors).
