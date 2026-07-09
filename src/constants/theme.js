// Shared design system, lifted from screens/HomeScreenOld.js's palette and
// card/shadow patterns (kept as a design reference, never imported directly —
// see that file's own header comment). Reused across all real screens so the
// whole app reads as one system instead of each screen inventing its own.

import {Platform} from 'react-native';

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

const rgba = (hex, alpha) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

// Android's elevation shadow is a hard, dark band compared to iOS's soft
// low-opacity shadows — even elevation: 2 reads as a dirty smudge under
// every card, and elevation can't do a soft tinted glow at all. The
// New-Architecture boxShadow (RN 0.76+) renders the same soft shadow on
// Android instead, so both platforms now match; iOS keeps its original
// shadow* props untouched. Use this for any card/glow shadow instead of
// writing raw shadow*/elevation blocks per screen.
export const makeShadow = ({y, blur, color = '#000000', opacity}) =>
  Platform.select({
    android: {boxShadow: `0px ${y}px ${blur}px ${rgba(color, opacity)}`},
    default: {
      shadowColor: color,
      shadowOffset: {width: 0, height: y},
      shadowOpacity: opacity,
      shadowRadius: blur,
    },
  });

export const CARD_SHADOW = makeShadow({y: 2, blur: 6, opacity: 0.05});

export const PRIMARY_SHADOW = makeShadow({y: 8, blur: 16, color: COLORS.primary, opacity: 0.35});
