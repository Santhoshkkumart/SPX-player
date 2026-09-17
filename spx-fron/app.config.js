module.exports = {
  expo: {
    name: 'SPX Player',
    slug: 'pulse-player',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'dark',
    scheme: 'spxplayer',
    splash: {
      image: './assets/splash.png',
      resizeMode: 'contain',
      backgroundColor: '#050816',
    },
    plugins: [
      'expo-status-bar',
      'expo-audio',
      'expo-asset',
      'expo-sharing',
      './plugins/withNetworkSecurityConfig',
    ],
    assetBundlePatterns: ['**/*'],
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.santhosh.spxplayer',
      icon: './assets/icon.png',
    },
    android: {
      package: 'com.santhosh.spxplayer',
      versionCode: 1,
      usesCleartextTraffic: true,
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#050816',
      },
    },

    extra: {
      backendUrl: process.env.EXPO_PUBLIC_BACKEND_URL || '',
      eas: {
        projectId: 'd53a26a1-7216-40e7-9bcf-4ef629d42935',
      },
    },
  },
};
