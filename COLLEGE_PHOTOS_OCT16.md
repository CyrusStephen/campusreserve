# College photo update — 16 October 2026

Based on campusreserve-safe-20261016-143545.zip.

Included: 17 original faculty-supplied JPEGs, grouped into Kavukattu Hall (4), Padiyara Hall (1), Chapel (3), Basketball Court (4), Hockey Ground (2), and Sports Open Ground (3). IFS02622.jpg is deliberately excluded because its lab is unidentified.

## Where to look

- Sign in and open Browse resources. Below the booking catalogue is the campus photo gallery.
- Open a venue card to view all its photos. Use the arrows or thumbnails; Close and Escape return to the gallery.
- Existing real resources named Kavukattu Hall, Padiyara Hall, Chapel, Basketball Court, Hockey Ground, or Sports Open Ground automatically display the matching bundled photos if they have no uploaded photos. Matching ignores capitalization, whitespace and punctuation. Unrelated and demo resources do not receive photos.
- The Overview's Explore your campus card now shows the real Kavukattu Hall photo.
- Existing uploaded resource galleries retain priority and remain editable through Manage resources.

## Install

Stop the client, extract this cumulative ZIP, and copy the contents of its campusreserve folder into your existing campusreserve project. Preserve your local environment files and existing server storage. No database migration or import is required.

From client:

    npm run dev -- --host 0.0.0.0 --port 5173 --strictPort

Open http://localhost:5173/app/resources.

For a packaged APK, rebuild the client and sync/rebuild Android using your established workflow. This archive retains the existing Android development-server configuration; it is not a production APK setup.

## Catalogue details still required

The gallery is a visual collection, not a declaration that every photographed location is bookable. No resource records or booking policies were invented. Add or confirm the capacity, resource type, permissions, location, availability and rules through Manage resources before enabling additional reservations. Lab photos will be added when supplied.

## Validation

Client production build, lint, and 16 tests pass. Server type-check and 84 tests pass. Photo files were visually inspected; live desktop/mobile UI and Android testing remain to be completed on the user's device because a local browser executable was unavailable in the build environment.
