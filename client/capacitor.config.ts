import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.campusreserve.app',
  appName: 'CampusReserve',
  webDir: 'dist',

  server: {
    url: 'http://192.168.1.45:5173',
    cleartext: true,
  },
};

export default config;