
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.8me.manager', // Unique ID for the App Store
  appName: '8ME',
  webDir: 'dist', // The folder where your React build files live (usually 'dist' or 'build')
  server: {
    androidScheme: 'https',
    // In development, you can set the url to your local IP to test on phone:
    // url: 'http://192.168.1.x:3000', 
    // cleartext: true
  },
  plugins: {
    Keyboard: {
      resize: 'body',
      style: 'dark',
      resizeOnFullScreen: true,
    },
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#0f172a",
      showSpinner: true,
      spinnerColor: "#4f46e5"
    }
  }
};

export default config;
