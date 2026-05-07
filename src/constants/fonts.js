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
};
