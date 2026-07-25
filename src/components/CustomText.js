// components/CustomText.js

import React, {useContext} from 'react';
import {Text, StyleSheet} from 'react-native';

import {LanguageContext} from '../../App';
import {FONTS, tajawalFamilyForWeight, tajawalStyleForWeight} from '../constants/fonts';

// Arabic block plus the Unicode ranges real-world Arabic content actually
// uses (Supplement, Extended-A, Presentation Forms A/B) — covers Iraqi/Gulf
// business names and the like, not just the core block.
const ARABIC_CHAR_RE = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
const LATIN_CHAR_RE = /[A-Za-z]/;

// Splits text into runs of {text, isArabic}. Neutral characters (digits,
// spaces, punctuation) stick with whichever run is already open, so
// "شركة 123 ABC" doesn't fragment into a run per space/digit — it only
// switches on an unambiguous letter of the other script.
const splitArabicRuns = text => {
  const runs = [];
  let currentIsArabic = null;
  let currentText = '';
  for (const ch of text) {
    let chIsArabic;
    if (ARABIC_CHAR_RE.test(ch)) {
      chIsArabic = true;
    } else if (LATIN_CHAR_RE.test(ch)) {
      chIsArabic = false;
    } else {
      chIsArabic = currentIsArabic ?? false;
    }
    if (currentIsArabic === null) {
      currentIsArabic = chIsArabic;
      currentText = ch;
    } else if (chIsArabic === currentIsArabic) {
      currentText += ch;
    } else {
      runs.push({text: currentText, isArabic: currentIsArabic});
      currentText = ch;
      currentIsArabic = chIsArabic;
    }
  }
  if (currentText) {
    runs.push({text: currentText, isArabic: currentIsArabic});
  }
  return runs;
};

const CustomText = ({children, style, paddingTop, center, bold, align, lineHeight, ...props}) => {
  const context = useContext(LanguageContext);
  const currentDirection = context?.currentDirection;
  const isRTL = currentDirection === 'rtl';
  const effectiveWeight = bold ? '700' : StyleSheet.flatten(style)?.fontWeight;
  const arabicFont = tajawalFamilyForWeight(effectiveWeight);
  const latinFont = FONTS.ENGLISH_DEFAULT;
  // The app-language-driven default — used for content this component
  // can't inspect (numbers, nested elements) and for single-script text.
  const defaultFontFamily = isRTL ? arabicFont : latinFont;

  const baseStyle = [
    style,
    {textAlign: align || (center ? 'center' : isRTL ? 'right' : 'left')},
    {lineHeight: lineHeight ?? 20},
    {paddingTop: paddingTop ?? 2},
  ];

  // Tajawal's weight is selected by picking a specific font FILE
  // (tajawalFamilyForWeight) — per this file's own comment, Android
  // resolves a custom font by exact filename with no shared-family weight
  // matching like iOS, so ALSO setting an explicit fontWeight style
  // alongside one of those filenames makes Android look for a "bold
  // Tajawal-Bold" variant that doesn't exist and silently fall back to the
  // system font. That bit twice: `bold && {fontWeight: '700'}` used to do
  // it unconditionally here (broke the focused tab bar label and
  // PrimaryButton titles on Android), and a caller passing fontWeight
  // inside `style` reintroduces the same conflict since that weight
  // survives into the flattened style — tajawalStyleForWeight neutralizes
  // it on Android (the file IS the weight there) while leaving iOS's
  // shared-family weight selection alone. Only the plain system Latin font
  // actually wants an explicit fontWeight.
  const arabicFontStyle = tajawalStyleForWeight(effectiveWeight);
  const fontStyleFor = family =>
    family === latinFont
      ? {fontFamily: family, ...(bold ? {fontWeight: '700'} : null)}
      : arabicFontStyle;

  if (typeof children === 'string') {
    const hasArabic = ARABIC_CHAR_RE.test(children);
    const hasLatin = LATIN_CHAR_RE.test(children);

    // Mixed script: content like a real invoice/company field can contain
    // both ("شركة ABC للتجارة"). Arabic needs Tajawal to render correctly
    // regardless of the app's current language — the English system font
    // may lack Arabic glyphs entirely or render them unshaped. Nested
    // <Text> runs each get their own fontFamily; RN inherits every other
    // (non-overridden) style prop from the parent Text automatically.
    if (hasArabic && hasLatin) {
      const runs = splitArabicRuns(children);
      return (
        <Text style={[...baseStyle, fontStyleFor(defaultFontFamily)]} {...props}>
          {runs.map((run, index) => (
            <Text key={index} style={fontStyleFor(run.isArabic ? arabicFont : latinFont)}>
              {run.text}
            </Text>
          ))}
        </Text>
      );
    }

    if (hasArabic) {
      // Pure Arabic content — Tajawal even while the app itself is in
      // English mode (e.g. an Arabic company name shown in an English UI).
      return (
        <Text style={[...baseStyle, fontStyleFor(arabicFont)]} {...props}>
          {children}
        </Text>
      );
    }
  }

  return (
    <Text style={[...baseStyle, fontStyleFor(defaultFontFamily)]} {...props}>
      {children}
    </Text>
  );
};

export default CustomText;
