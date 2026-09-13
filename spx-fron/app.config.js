module.exports = {
  expo: {
    name: 'Santhosh Player',
    slug: 'pulse-player',
    version: '1.0.0',
    scheme: 'pulseplayer',
    plugins: [
      'expo-status-bar',
      'expo-audio',
      'expo-asset'
    ],
    orientation: 'portrait',
    userInterfaceStyle: 'dark',
    assetBundlePatterns: ['**/*'],
    ios: {
      supportsTablet: true,
    },
    android: {
      package: 'com.santhosh.pulseplayer',
      versionCode: 1,
      adaptiveIcon: {
        backgroundColor: '#050816',
      },
    },
    androidNavigationBar: {
      backgroundColor: '#121212',
      barStyle: 'light-content',
    },
    extra: {
      backendUrl: process.env.EXPO_PUBLIC_BACKEND_URL || '',
    },
  },
};
