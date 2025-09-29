import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.e39cbfacb0f54b128f0bfea898c95c66',
  appName: 'bill-snap-saver',
  webDir: 'dist',
  server: {
    url: 'https://e39cbfac-b0f5-4b12-8f0b-fea898c95c66.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  bundledWebRuntime: false
};

export default config;