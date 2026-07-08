// Shared design system, lifted from screens/HomeScreenOld.js's palette and
// card/shadow patterns (kept as a design reference, never imported directly —
// see that file's own header comment). Reused across all real screens so the
// whole app reads as one system instead of each screen inventing its own.

export const COLORS = {
  primary: '#79329a',
  primaryLight: '#9b5cb8',
  primaryDark: '#57197a',
  accent: '#e8b4ff',
  bg: '#f7f4fa',
  surface: '#ffffff',
  surfaceAlt: '#f0e9f7',
  text: '#1a0f26',
  textMuted: '#7a6a8a',
  border: '#e0d4ec',
  success: '#2db87a',
  pending: '#f0a500',
  danger: '#e04444',
  white: '#ffffff',
};

export const CARD_SHADOW = {
  shadowColor: '#000',
  shadowOffset: {width: 0, height: 2},
  shadowOpacity: 0.05,
  shadowRadius: 6,
  elevation: 2,
};

export const PRIMARY_SHADOW = {
  shadowColor: COLORS.primary,
  shadowOffset: {width: 0, height: 8},
  shadowOpacity: 0.35,
  shadowRadius: 16,
  elevation: 10,
};
