# Five bookable college spaces — beta v15

Current policy: v16 uses **24 hours** of beta notice. Follow BETA_UPDATE_V16.md for current setup commands; the original 30-day policy below is historical.

Cumulative update based on the October 16 project and v14 photo galleries. Chapel remains photo-gallery-only; the unidentified lab photo is excluded.

## Rules

- Every request requires approval; pending and approved reservations block overlaps.
- Minimum notice: 30 days (720 hours), measured from the time of the request.
- Booking horizon: 60 days ahead. A new request must start between 30 and 60 days from now.
- Maximum booking duration: 8 hours.
- Buffers: 30 minutes before and after.
- Cancellation deadline: 24 hours before the start.
- Exclusive use: one booking at a time per space.
- New venue capacity: 100 people as a temporary BETA TESTING LIMIT, not an official occupancy capacity.

Venues: Kavukattu Hall, Padiyara Hall, Basketball Court, Hockey Ground and Sports Open Ground. Sports facilities have their own category. All 17 v14 photos remain included, including the Chapel gallery. Matching resource galleries automatically show the identified college photos if no uploaded gallery exists.

## Apply locally

1. Stop the server and client. Back up your PostgreSQL database before applying changes. Merge the contents of this ZIP's campusreserve folder into your existing CR_Site folder. Preserve local .env files and server storage.
2. In PowerShell, run the following ONE AT A TIME. Continue only when the preceding command succeeds:

    cd "C:\Users\cyrus\Cyrus Personal\CR_Site\server"
    npx.cmd prisma migrate deploy
    npx.cmd prisma generate
    npm.cmd run resources:college
    npm.cmd run dev

3. In a separate terminal:

    cd "C:\Users\cyrus\Cyrus Personal\CR_Site\client"
    npm.cmd run dev -- --host 0.0.0.0 --port 5173 --strictPort

4. Open http://localhost:5173/app/resources. Try dates at least 30 days ahead. A request inside 30 days is intentionally rejected.
5. Use Admin > Manage resources to adjust capacities, building/location, instructions and policies when the college confirms them.

## Existing records

The setup transaction creates missing venues and reuses existing non-demo resources with matching names (case and punctuation ignored). On its first run it applies the beta policies, category and Active status to matching non-archived resources; it preserves IDs, capacities, descriptions, photos, bookings and other details. Existing bookings are not cancelled or revalidated. Archived resources are skipped. Ambiguous names or conflicting slugs abort the transaction.

Every created/updated resource gets an audit entry. Subsequent setup runs skip resources already processed, preserving later administrator edits. To change a policy again, use Manage resources rather than rerunning setup.

No account, password or production secret is included. No changes are made to your database until you run the migration/setup commands against the database configured privately in your server environment. This update does not finish the separate Render/Vercel deployment preparation.

## Verification

Frontend build, lint and 16 tests passed. Backend type-check and 89 tests passed, including five tests for the venue rules, sports validation, repeat-run behaviour, existing-resource preservation, duplicate names and archived resources. Database transaction behaviour was exercised using a fake transaction; the new migration and setup have not been executed against a live PostgreSQL database here. Live browser and Android visual testing remain to be done on the user's devices.
# Superseded policy: v16 uses 24 hours' beta notice. Follow BETA_UPDATE_V16.md for current setup commands.

