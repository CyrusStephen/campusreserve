# CampusReserve mobile stability update

This source-only patch fixes:

- cancellation and rescheduling modal positioning;
- background scrolling while booking dialogs are open;
- keyboard-safe modal sizing and action wrapping;
- horizontal page escape and blank off-screen areas;
- mobile drawer width, spacing and close control;
- automatic drawer closing after navigation;
- a full-width public footer.

The intentional `Lab 2 · 2:30 PM` overlap has not been changed.

## Apply

Copy the included `client/src` directory into the root of the current CampusReserve project and merge/replace matching files. The Android project and environment files are not included.

With Vite live reload running, the phone should update immediately.

## Verification

- `npm run lint` passed
- `npm run build` passed
- `npm test` passed — 10/10 tests
