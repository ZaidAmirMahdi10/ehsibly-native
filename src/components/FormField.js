import {useContext, useState} from 'react';
import {View, StyleSheet, TouchableOpacity} from 'react-native';
import {Eye, EyeOff} from 'lucide-react-native';
import {LanguageContext} from '../../App';
import CustomText from './CustomText';
import CustomInput from './CustomInput';
import {COLORS} from '../constants/theme';

// `style` is destructured out (not left in `...inputProps`) specifically so
// it merges into the base input style below instead of completely replacing
// it — a caller passing `style` (e.g. a taller multiline textarea) was
// silently wiping out the border/background entirely, since spreading
// `inputProps` after `style={styles.input}` let a duplicate `style` key
// win outright rather than merge.
// `suffix` (e.g. a currency code) renders inside the field's own border, to
// its end — the input itself goes borderless/transparent so the two read as
// one control instead of two boxes glued together. A `secureTextEntry` field
// gets that same trailing slot, but as a tappable show/hide eye instead of a
// static label — the field manages its own reveal state so callers don't
// each have to wire up a toggle themselves. RTL is self-detected (like
// SelectField's dropdown arrow) rather than left to callers to remember to
// pass — a forgotten `isRTL` prop was leaving the eye/suffix pinned to the
// wrong side in Arabic.
const FormField = ({label, required, style, suffix, secureTextEntry, ...inputProps}) => {
  const {currentDirection} = useContext(LanguageContext);
  const isRTL = currentDirection === 'rtl';
  const [revealed, setRevealed] = useState(false);
  const hasTrailing = !!suffix || !!secureTextEntry;

  return (
    <View style={styles.group}>
      <CustomText style={styles.label}>
        {label}
        {required ? <CustomText style={styles.required}> *</CustomText> : null}
      </CustomText>
      {hasTrailing ? (
        <View style={[styles.inputRow, isRTL && styles.inputRowRTL]}>
          <CustomInput
            style={[styles.input, styles.inputWithSuffix, style]}
            placeholderTextColor={COLORS.textMuted}
            secureTextEntry={secureTextEntry ? !revealed : undefined}
            {...inputProps}
          />
          {secureTextEntry ? (
            <TouchableOpacity
              onPress={() => setRevealed(prev => !prev)}
              hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
              {revealed ? (
                <EyeOff size={18} color={COLORS.textMuted} />
              ) : (
                <Eye size={18} color={COLORS.textMuted} />
              )}
            </TouchableOpacity>
          ) : (
            <CustomText style={styles.suffix} paddingTop={0}>{suffix}</CustomText>
          )}
        </View>
      ) : (
        <CustomInput style={[styles.input, style]} placeholderTextColor={COLORS.textMuted} {...inputProps} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  group: {marginBottom: 14},
  label: {fontSize: 12, fontWeight: '700', color: COLORS.textMuted, marginBottom: 6},
  required: {color: COLORS.danger},
  input: {
    // Was COLORS.bg, which is nearly identical to the screen's own
    // background — the field only read as a "field" via a thin 1px border,
    // easy to miss entirely (e.g. the Notes textarea). White gives real
    // contrast against the page.
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    color: COLORS.text,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingRight: 14,
  },
  inputRowRTL: {flexDirection: 'row-reverse', paddingRight: 0, paddingLeft: 14},
  inputWithSuffix: {
    flex: 1,
    borderWidth: 0,
    backgroundColor: 'transparent',
    paddingHorizontal: 14,
  },
  suffix: {fontSize: 13, fontWeight: '700', color: COLORS.textMuted},
});

export default FormField;
