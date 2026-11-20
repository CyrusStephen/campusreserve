# CampusReserve

CampusReserve is a campus booking and canteen platform. The React and Capacitor application lives in `client/`; the Express and Prisma API lives in `server/`.

## Development

Install dependencies and run each service from its own directory:

```powershell
cd client
npm ci
npm run dev -- --host 0.0.0.0 --port 5173 --strictPort
```

In another terminal:

```powershell
cd server
npm ci
npm run dev
```

Each service has its own scripts in its `package.json`. Keep local `.env` files out of shared ZIPs and Git. For Vercel, set the project Root Directory to `client` and deploy the backend separately.

See the [account, photo and email update guide](CAMPUSRESERVE_ACCOUNT_PHOTO_EMAIL_UPDATE.md) for the database migration, sender setup and admin controls.

## Android demo

The Android project in `client/android/` currently loads the development site at `http://10.107.5.74:5173`. Change the IP in `client/capacitor.config.ts` and `client/android/app/src/main/assets/capacitor.config.json` if the laptop's Wi-Fi address changes. Set your private `client/.env.local` API URL to the same laptop IP on port 5000. Start both development servers and confirm that the phone can reach `/api/health` before opening the app. Build a debug APK from Android Studio by opening `client/android/` or running `gradlew.bat assembleDebug` there. The debug APK is at `client/android/app/build/outputs/apk/debug/app-debug.apk`.

This development build permits local HTTP. Remove its live server URL and the manifest's cleartext setting, and configure a production API, before distributing a release build.
