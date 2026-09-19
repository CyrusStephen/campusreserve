# CampusReserve V13 — Canteen staff access

V13 makes the canteen staff workspace operational rather than customer-facing.

## CANTEEN_STAFF behaviour

- Signing in through the Canteen product opens `/app/canteen/manage`.
- The customer menu, cart, checkout and **My orders** are not shown.
- Directly opening `/app/canteen` redirects to the Canteen Console before the ordering page renders.
- Opening Space Bookings or Event Access shows a dedicated **Access denied** page with guidance to contact an administrator.
- The denial page provides safe links back to the Canteen Console or the product homepage.

Administrator and customer/faculty behaviour is unchanged. Existing server role checks continue to protect canteen management and ordering endpoints independently of the client navigation.

No database migration is required for V13.
