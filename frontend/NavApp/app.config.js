export default {
  expo: {
    name: "NavApp",
    slug: "NavApp",
    version: "1.0.0",
    orientation: "portrait",
    userInterfaceStyle: "light",
    scheme: "navapp",
    assetBundlePatterns: [
      "**/*"
    ],
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.navapp",
      config: {
        googleMapsApiKey: "AIzaSyCnbC98Iv2mVPCQZRr86DsrsafMsm8sQSI"
      }
    },
    android: {
      adaptiveIcon: {
        backgroundColor: "#ffffff"
      },
      package: "com.navapp",
      config: {
        googleMaps: {
          apiKey: "AIzaSyCnbC98Iv2mVPCQZRr86DsrsafMsm8sQSI"
        }
      }
    },
    plugins: [
      [
        "expo-location",
        {
          locationAlwaysAndWhenInUsePermission: "Allow NavApp to use your location."
        }
      ]
    ]
  }
}; 