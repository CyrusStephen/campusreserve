# CampusReserve V15 — One-by-One QA Checklist

Complete the database migration and create the Security demo account before testing.

## A. Shared workspace shell

- [ ] Sign in as Faculty and confirm the header shows the correct IST date/time.
- [ ] Confirm the greeting changes between morning, afternoon and evening and uses the user's name.
- [ ] On desktop, move the pointer to the far-left edge and confirm the sidebar slides out.
- [ ] Move away and confirm it closes after approximately 2–3 seconds.
- [ ] Move back before the delay ends and confirm closing is cancelled.
- [ ] Pin the sidebar, reload, and confirm the preference is remembered.
- [ ] Unpin it and confirm the main page uses the full width without jumping when the drawer opens.
- [ ] Open the sidebar with its visible edge handle and close it with Escape/click-outside.
- [ ] At phone width, confirm there is a menu button and no hover-only dependency.
- [ ] On phone width, tap a destination and confirm the drawer does not obstruct the destination page.
- [ ] Repeat sidebar checks in dark mode and with reduced-motion enabled.

## B. Compact layout and activity drawer

- [ ] Confirm dashboard statistic and launch cards are compact but readable.
- [ ] Check booking, resource, notification, canteen and administrator pages for horizontal overflow.
- [ ] Sign in as Admin and confirm the former bottom **Recent decisions** block is absent.
- [ ] Open the Activity button in the header and confirm the drawer enters from the right.
- [ ] Confirm each activity contains status, reference, title, administrator and IST time.
- [ ] Open an activity and confirm it reaches booking history.
- [ ] Confirm **View full history**, Escape and backdrop closing work.
- [ ] Confirm the drawer becomes a full-width sheet on a narrow phone.

## C. Cancellation rules and dialogs

- [ ] As Faculty/Staff, open an eligible booking and confirm the cancellation action is available.
- [ ] Select cancellation and confirm the dialog appears centred, not below the booking card.
- [ ] Confirm the dialog shows the consequence, requires a reason and offers **Keep booking**.
- [ ] Confirm Escape and backdrop click close the dialog without cancelling.
- [ ] Confirm successful cancellation updates the booking and plays the optional cancellation cue.
- [ ] Test a booking inside its resource cancellation deadline.
- [ ] Confirm the cancellation action remains visible but disabled.
- [ ] Confirm the message states the correct number of hours and asks the user to contact an administrator.
- [ ] Repeat for one occurrence in a recurring booking.
- [ ] As Admin, confirm the administrative override remains available inside the deadline.

## D. Interface sounds

- [ ] Turn **Interface sounds** off and confirm the preference survives reload.
- [ ] Submit a booking and confirm no sound plays while muted.
- [ ] Turn sounds on and confirm the short preview cue plays.
- [ ] Submit a booking/canteen order and confirm one brief success cue plays.
- [ ] Cancel a booking and confirm one distinct, restrained cancellation cue plays.
- [ ] Confirm visible feedback remains complete when the browser/device is muted.

## E. Actionable notifications

- [ ] Open an unread booking notification and confirm the entire notification card is clickable.
- [ ] Confirm opening it marks it read and updates the unread badge.
- [ ] As Admin, open a new-submission notification and confirm it leads to the approval queue.
- [ ] As Faculty/Staff, open a decision notification and confirm the booking is highlighted in **My bookings**.
- [ ] Open a notification using Enter and Space to verify keyboard support.
- [ ] Confirm **Mark read** and **Mark all read** still work independently.
- [ ] Confirm a role cannot use a copied notification URL to open an unauthorized workspace.

## F. Security Desk

- [ ] Sign in through `/login?service=security` using the Security demo account.
- [ ] Confirm the account lands directly on **Verify booking**.
- [ ] Attempt Space Booking, Canteen, Events and an administrator URL and confirm **Access denied**.
- [ ] Verify an approved booking during its access window and confirm **Valid now**.
- [ ] Verify a future approved booking and confirm **Valid later**.
- [ ] Verify an old approved booking and confirm **Expired**.
- [ ] Verify pending/rejected, cancelled and unknown references and confirm their distinct warnings.
- [ ] Confirm results expose only reference, programme, responsible person, space and approved time.
- [ ] Confirm requester email, private notes and administration details are not exposed.
- [ ] Disconnect the server and confirm the page never presents a stale record as valid.
- [ ] On an older/narrow phone, confirm the input, result state and details remain large and readable.
- [ ] As Admin, confirm booking history/audit data records Security verification attempts.

## G. Regression and visual checks

- [ ] Faculty: browse resource, check availability, submit, track, reschedule and cancel.
- [ ] Admin: approve whole booking and make per-occurrence decisions.
- [ ] Admin: calendar, history, reports and resource management still open correctly.
- [ ] Canteen customer: menu, quantity, checkout, UPI/COD and orders still work.
- [ ] Canteen staff: console works; other products remain denied.
- [ ] Event placeholder remains isolated and unchanged.
- [ ] Test Chrome/Edge desktop plus one Android-sized viewport.
- [ ] Test light mode, dark mode, keyboard-only use, loading, empty and error states.
