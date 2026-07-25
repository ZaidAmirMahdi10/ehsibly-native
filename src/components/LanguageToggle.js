import {useContext} from 'react';
import {TouchableOpacity, Text, StyleSheet} from 'react-native';
import {LanguageContext} from '../../App';
import {FONTS, tajawalStyleForWeight} from '../constants/fonts';

// Compact single-tap switcher for screens with no room for Settings' full
// language list (Login, Register, the unsupported-org-type screen) — shows
// the NEXT language's own native name and tapping cycles straight to it
// (ar → en → ckb → ar). The label is always in its own language's script
// regardless of the app's current language, so it can't use CustomText:
// that picks a font from the *current app* direction, not the label's own
// script, which would render "العربية" in the English font. Plain Text
// with an explicit per-label fontFamily sidesteps that; Sorani "کوردی"
// shares the Arabic-script Tajawal path.
const NEXT_LANGUAGE = {ar: 'en', en: 'ckb', ckb: 'ar'};
const LANGUAGE_LABELS = {ar: 'العربية', en: 'English', ckb: 'کوردی'};

const LanguageToggle = ({style}) => {
  const {currentLanguage, changeLanguage} = useContext(LanguageContext);
  const next = NEXT_LANGUAGE[currentLanguage] || 'ar';
  const fontStyle = next === 'en' ? {fontFamily: FONTS.ENGLISH_DEFAULT} : tajawalStyleForWeight('600');

  return (
    <TouchableOpacity
      style={[styles.button, style]}
      onPress={() => changeLanguage(next)}
      activeOpacity={0.7}>
      <Text style={[styles.text, fontStyle]}>{LANGUAGE_LABELS[next]}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    alignSelf: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E2E4EA',
  },
  text: {fontSize: 13, fontWeight: '600', color: '#79329a'},
});

export default LanguageToggle;
