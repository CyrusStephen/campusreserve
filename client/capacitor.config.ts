import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.campusreserve.app',
  appName: 'CampusReserve',
  webDir: 'dist',

  server: {
    url: 'http://10.107.5.74:5173',
    cleartext: true,
  },
};

export default config;