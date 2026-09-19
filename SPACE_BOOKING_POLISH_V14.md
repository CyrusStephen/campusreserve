# CampusReserve V14 — Space Booking polish

This checkpoint focuses only on the Space Booking workspace.

## Faculty and staff experience

- Removed the Canteen card from the Space Booking overview so product workflows remain separate.
- Booking dates now default inside the selected resource's minimum-notice policy.
- Start fields enforce the resource's notice and advance-booking window in the browser.
- End fields cannot precede their corresponding start time.
- Invalid notice periods and reversed times are caught before the request is sent.
- Expired self-service reschedule actions are no longer offered.
- The empty **My bookings** state now links directly to the resource catalogue.
- Faculty or staff opening an administrator URL receive a clear access-denied screen instead of briefly rendering protected content or being silently redirected.

## Administrator experience

- Approval controls lock while a decision is being saved, preventing duplicate or competing requests.
- Decision notes are cleared after a successful action.
- Approval buttons show a saving state.
- The master calendar shows a current loading state when changing weeks or resource filters.
- Calendar navigation and filtering are disabled while the new range loads.
- Report exports reject reversed date ranges before contacting the API.

## Verification

- Client lint: passed
- Client production build: passed
- Client tests: 10 passed

No database migration is required for V14.
