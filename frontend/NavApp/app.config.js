import 'dotenv/config';

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
const API_URL = process.env.API_URL;

// Remove debug logging
// console.log('Loading environment variables...');
// console.log('API_URL:', API_URL);
// console.log('GOOGLE_MAPS_API_KEY:', GOOGLE_MAPS_API_KEY);

export default {
  expo: {
    name: "NavApp",
    slug: "NavApp",
    version: "1.0.0",
    orientation: "portrait",
    userInterfaceStyle: "light",
    assetBundlePatterns: [
      "**/*"
    ],
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.navapp"
    },
    android: {
      package: "com.navapp"
    },
    plugins: [
      [
        "expo-location",
        {
          locationAlwaysAndWhenInUsePermission: "Allow $(PRODUCT_NAME) to use your location.",
        },
      ],
    ]
  },
}; 