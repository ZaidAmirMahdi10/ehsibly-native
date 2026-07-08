import {useContext} from 'react';
import {TouchableOpacity, Text, StyleSheet} from 'react-native';
import {LanguageContext} from '../../App';
import {FONTS, tajawalFamilyForWeight} from '../constants/fonts';

// Compact single-tap switcher for screens with no room for Settings' full
// language list (Login, Register, the unsupported-org-type screen) — shows
// the *other* language's own name, tapping switches straight to it. Always
// shows Arabic script while the app itself is in English (and vice versa),
// so it can't use CustomText: that picks a font from the *current app*
// direction, not the label's own script, which would render "العربية" in
// the English font. Plain Text with an explicit fontFamily sidesteps that.
const LanguageToggle = ({style}) => {
  const {currentLanguage, changeLanguage} = useContext(LanguageContext);
  const isArabic = currentLanguage === 'ar';
  const label = isArabic ? 'English' : 'العربية';
  const fontFamily = isArabic ? FONTS.ENGLISH_DEFAULT : tajawalFamilyForWeight('600');

  return (
    <TouchableOpacity
      style={[styles.button, style]}
      onPress={() => changeLanguage(isArabic ? 'en' : 'ar')}
      activeOpacity={0.7}>
      <Text style={[styles.text, {fontFamily}]}>{label}</Text>
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
