# CampusReserve Product Workspaces — V12

## Corrected architecture

CampusReserve is one platform with three separate authenticated workspaces:

- **Space Bookings** — resource catalogue, personal bookings, waitlist and administrator venue controls.
- **Canteen Orders** — menu, checkout, personal orders and the dedicated canteen console.
- **Event Access** — a separate foundation for event discovery, passes, QR entry and organizer check-in.

The Product mega-menu now sends users through service-aware login URLs. After authentication, CampusReserve opens only the selected product's pages and navigation. The sidebar includes an **All products** link to switch services intentionally.

`CANTEEN_STAFF` accounts are restricted to the Canteen workspace and cannot enter Space Bookings or Event Access.

## Merge

This is a complete project package based on V11. Merge/replace the V11 project with this package, run `npm install` in both `server` and `client`, and use the V11 database migration instructions if the canteen migration has not already been applied.

## Verification

- Client lint: passed
- Client production build: passed
- Client tests: 10 passed
