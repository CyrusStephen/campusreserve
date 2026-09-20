# CampusReserve final branding update

Copy the contents of this ZIP into the existing `client` folder and allow matching files to be replaced.

## Browser splash preview

With the Vite client running, open:

`http://192.168.1.45:5173/?splash=preview`

The preview flag makes the splash replay on every refresh. Without it, the splash appears once per browser session.

## Institution branding

St Berchmans College is the default inaugural institution. A future deployment can override it in the client environment:

```env
VITE_TENANT_NAME="College name"
VITE_TENANT_LOGO_URL="/branding/college-logo.png"
```

## Android app icon

Use `public/branding/campusreserve-app-icon-1024.png` as the source image in Android Studio's **Image Asset > Launcher Icons (Adaptive and Legacy)** tool. The compact CsR mark remains the app icon; the supplied full CampusReserve wordmark image is used where adequate space is available. The mistakenly supplied CsR-only motion clip is intentionally not included.
