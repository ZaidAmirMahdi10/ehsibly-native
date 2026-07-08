import React, {useContext} from 'react';
import {View, StyleSheet} from 'react-native';
import {LanguageContext} from '../../App';
import CustomText from './CustomText';
import CustomInput from './CustomInput';
import {COLORS} from '../constants/theme';

// Shared search field (icon + input) — goes through CustomInput so typed
// and placeholder text actually render in Tajawal for Arabic, unlike a bare
// TextInput. Every screen with a search bar should use this instead of
// rolling its own.
const SearchInput = ({value, onChangeText, onSubmitEditing, placeholder, style}) => {
  const {currentDirection} = useContext(LanguageContext);
  const isRTL = currentDirection === 'rtl';

  return (
    <View style={[styles.wrap, isRTL && styles.wrapRTL, style]}>
      <CustomText paddingTop={0}>🔍</CustomText>
      <CustomInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor={COLORS.textMuted}
        value={value}
        onChangeText={onChangeText}
        onSubmitEditing={onSubmitEditing}
        returnKeyType="search"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
  },
  wrapRTL: {flexDirection: 'row-reverse'},
  input: {flex: 1, fontSize: 14, color: COLORS.text, padding: 0},
});

export default SearchInput;
