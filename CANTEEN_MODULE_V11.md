# CampusReserve Canteen Module — V11

## Included

- Separate Canteen Orders workspace for faculty, staff and administrators.
- Demo menu with hot drinks, snacks, lime soda, veg meal and non-veg meal.
- Quantity controls and item customizations (sugar and lime-soda options).
- Remembered office/drop location, requested delivery time and optional notes.
- Cash on delivery and prepaid UPI checkout.
- Generated showcase QR using `VITE_CANTEEN_UPI_ID` (defaults to `campusreserve.demo@upi`).
- Required UPI transaction reference and optional payment screenshot.
- My Orders tracking with order and payment states.
- Dedicated `CANTEEN_STAFF` role with an isolated fulfilment console.
- Accept/reject, preparing, out-for-delivery and delivered workflow.
- UPI verification, cash collection tracking and requester notifications.
- Menu item add/edit, pricing, customizations and sold-out controls.

## Merge and database setup

After replacing/merging the project files, run from `server`:

```powershell
npm install
npx prisma migrate deploy
npx prisma generate
npm run canteen:demo
npm run user:create
```

When `user:create` asks for the role, choose `CANTEEN_STAFF` for the canteen operator account.

Then run from `client`:

```powershell
npm install
npm run dev
```

To replace the showcase UPI ID, add this to `client/.env`:

```text
VITE_CANTEEN_UPI_ID=your-real-upi-id@bank
```

Restart the client after changing it. The QR regenerates automatically for the current cart total.

## Verification completed

- Prisma schema validation: passed
- Server TypeScript check: passed
- Server media tests: 38 passed
- Server input and canteen validation tests: 46 passed
- Client lint: passed
- Client production build: passed
- Client tests: 10 passed
