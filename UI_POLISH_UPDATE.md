# CampusReserve UI polish update

This package adds a restrained visual refinement layer without changing the booking workflow or database schema.

## Included

- A staged homepage entrance and React Bits-style, character-by-character hero rotation every 1.8 seconds, with a smoothly resizing phrase frame and balanced inner spacing.
- A centred, accessible Product mega-menu with three campus-service modules and animated four-card drill-down views.
- Custom editorial illustrations for Space Bookings, Canteen Orders and Event Access.
- Motion-inspired horizontal fill transitions on homepage and primary workspace buttons.
- A static accessible hero sentence for screen readers.
- Automatic reduced-motion support.
- Four custom single-weight resource category illustrations.
- Pastel status chips with crisp state dots and a subtle pulse for live availability.
- Thin continuous calendar grids with borderless pastel schedule blocks.
- Softer resource-card, dashboard-card, button and page transitions.
- Frosted utility-bar layering with a solid-color fallback.
- The cancellation-deadline UI protection from the previous update.

## Easy adjustment points

- Homepage phrases and timing: `client/src/pages/HomePage.tsx`
- Homepage animation and Product mega-menu styling: `client/src/home.css`
- Product navigation and module cards: `client/src/components/ProductMegaMenu.tsx`
- Product illustrations: `client/src/components/ProductIllustration.tsx`
- Workspace status, calendar and interaction styling: the final section of `client/src/resources/resources.css`
- Custom resource illustrations: `client/src/components/ResourceCategoryIcon.tsx`

The previous `campusreserve-clean-v2.zip` remains the rollback baseline.
