import {Platform} from 'react-native';

// Font family constants that work across iOS and Android
export const FONTS = {
  // On Android, we need to use the full font file name (without .ttf)
  // On iOS, we can use just the font family name

  // Tajawal fonts
  TAJAWAL_REGULAR: Platform.select({
    ios: 'Tajawal',
    android: 'Tajawal-Regular',
  }),
  TAJAWAL_LIGHT: Platform.select({
    ios: 'Tajawal',
    android: 'Tajawal-Light',
  }),
  TAJAWAL_MEDIUM: Platform.select({
    ios: 'Tajawal',
    android: 'Tajawal-Medium',
  }),
  TAJAWAL_BOLD: Platform.select({
    ios: 'Tajawal',
    android: 'Tajawal-Bold',
  }),
  TAJAWAL_EXTRA_BOLD: Platform.select({
    ios: 'Tajawal',
    android: 'Tajawal-ExtraBold',
  }),
  TAJAWAL_BLACK: Platform.select({
    ios: 'Tajawal',
    android: 'Tajawal-Black',
  }),

  // Cairo fonts
  CAIRO_REGULAR: Platform.select({
    ios: 'Cairo',
    android: 'Cairo-Regular',
  }),
  CAIRO_SEMIBOLD: Platform.select({
    ios: 'Cairo',
    android: 'Cairo-SemiBold',
  }),
  CAIRO_BOLD: Platform.select({
    ios: 'Cairo',
    android: 'Cairo-Bold',
  }),

  // Alexandria fonts
  ALEXANDRIA_REGULAR: Platform.select({
    ios: 'Alexandria',
    android: 'Alexandria-Regular',
  }),
  ALEXANDRIA_LIGHT: Platform.select({
    ios: 'Alexandria',
    android: 'Alexandria-Light',
  }),
  ALEXANDRIA_MEDIUM: Platform.select({
    ios: 'Alexandria',
    android: 'Alexandria-Medium',
  }),
  ALEXANDRIA_SEMIBOLD: Platform.select({
    ios: 'Alexandria',
    android: 'Alexandria-SemiBold',
  }),
  ALEXANDRIA_BOLD: Platform.select({
    ios: 'Alexandria',
    android: 'Alexandria-Bold',
  }),

  // Default font
  DEFAULT: Platform.select({
    ios: 'Tajawal',
    android: 'Tajawal-Regular',
  }),

  // English/Latin text font — system-bundled on both platforms (no asset
  // linking needed): Avenir Next on iOS, Roboto Medium on Android. Both are
  // a step up from the plain system default without adding a new font file.
  ENGLISH_DEFAULT: Platform.select({
    ios: 'Avenir Next',
    android: 'sans-serif-medium',
  }),
};

// Android resolves a custom fontFamily by exact filename, with no shared-
// family weight matching like iOS — combining "Tajawal-Regular" with any
// fontWeight that file wasn't built as finds no matching variant and
// silently falls back to the system font. Any Arabic text setting its own
// fontWeight (via CustomText's `bold` prop, or a caller's own style) needs
// to resolve to the real matching Tajawal file instead. On iOS this is
// always a no-op: every Tajawal weight is already registered under one
// shared "Tajawal" family that resolves correctly via fontWeight regardless.
export const tajawalFamilyForWeight = weight => {
  switch (String(weight)) {
    case '900':
      return FONTS.TAJAWAL_BLACK;
    case '800':
      return FONTS.TAJAWAL_EXTRA_BOLD;
    case 'bold':
    case '700':
      return FONTS.TAJAWAL_BOLD;
    case '600':
    case '500':
      return FONTS.TAJAWAL_MEDIUM;
    case '300':
    case '200':
    case '100':
      return FONTS.TAJAWAL_LIGHT;
    default:
      return FONTS.DEFAULT;
  }
};
