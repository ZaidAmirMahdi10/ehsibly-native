module.exports = {
  project: {
    ios: {},
    android: {},
  },
  assets: ['./src/assets/fonts/'],
  dependencies: {
    // Ancient package (RN 0.12-era native modules) — its android/build.gradle
    // uses the long-removed `compile()` DSL and breaks the Gradle build.
    // Its JS (used by i18n.js via i18next-react-native-language-detector)
    // already degrades gracefully when the native module isn't linked
    // (`RNI18n ? RNI18n.locale : ''`), so skipping Android autolinking here
    // just means locale auto-detection no-ops on Android — the app already
    // force-defaults to Arabic in i18n.js regardless.
    'react-native-locale-detector': {
      platforms: {
        android: null,
      },
    },
  },
};
