import React, {useContext, useState} from 'react';
import {View, TouchableOpacity, FlatList, StyleSheet} from 'react-native';
import {LanguageContext} from '../../App';
import CustomText from './CustomText';
import ModalSheet from './ModalSheet';
import {COLORS} from '../constants/theme';

// A labeled field that looks like FormField but opens a modal list instead
// of a keyboard — for a handful of options (currency, bank account, etc.)
// where a real dropdown reads much clearer than a row of chips.
// `fieldStyle` styles the tappable box itself (e.g. a pill borderRadius),
// unlike `style`, which wraps the whole label+field group.
const SelectField = ({
  label,
  required,
  value,
  placeholder,
  options,
  onSelect,
  getLabel = String,
  getKey = String,
  disabled = false,
  style,
  fieldStyle,
}) => {
  const {currentDirection} = useContext(LanguageContext);
  const isRTL = currentDirection === 'rtl';
  const [visible, setVisible] = useState(false);
  const selectedLabel = value != null ? getLabel(value) : null;

  return (
    <View style={[styles.group, style]}>
      {label ? (
        <CustomText style={styles.label}>
          {label}
          {required ? <CustomText style={styles.required}> *</CustomText> : null}
        </CustomText>
      ) : null}
      <TouchableOpacity
        style={[styles.field, isRTL && styles.fieldRTL, disabled && styles.fieldDisabled, fieldStyle]}
        activeOpacity={0.7}
        disabled={disabled}
        onPress={() => setVisible(true)}>
        <CustomText style={[styles.fieldText, !selectedLabel && styles.placeholder]} paddingTop={0}>
          {selectedLabel || placeholder}
        </CustomText>
        <CustomText style={styles.chevron} paddingTop={0}>
          ⌄
        </CustomText>
      </TouchableOpacity>

      <ModalSheet
        visible={visible}
        onClose={() => setVisible(false)}
        title={label}
        sheetStyle={styles.sheet}>
        <FlatList
          data={options}
          keyExtractor={getKey}
          style={styles.optionList}
          renderItem={({item}) => {
            const active = value != null && getKey(item) === getKey(value);
            return (
              <TouchableOpacity
                style={[styles.option, isRTL && styles.optionRTL, active && styles.optionActive]}
                onPress={() => {
                  onSelect(item);
                  setVisible(false);
                }}>
                <CustomText
                  bold={active}
                  style={[styles.optionText, active && styles.optionTextActive]}
                  paddingTop={0}>
                  {getLabel(item)}
                </CustomText>
                {active ? (
                  <CustomText style={styles.optionCheck} paddingTop={0}>
                    ✓
                  </CustomText>
                ) : null}
              </TouchableOpacity>
            );
          }}
        />
      </ModalSheet>
    </View>
  );
};

const styles = StyleSheet.create({
  group: {marginBottom: 14},
  label: {fontSize: 12, fontWeight: '700', color: COLORS.textMuted, marginBottom: 6},
  required: {color: COLORS.danger},
  field: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  fieldRTL: {flexDirection: 'row-reverse'},
  fieldDisabled: {backgroundColor: COLORS.bg, opacity: 0.6},
  fieldText: {fontSize: 14, color: COLORS.text},
  placeholder: {color: COLORS.textMuted},
  chevron: {fontSize: 16, color: COLORS.textMuted},
  sheet: {padding: 16, maxHeight: '70%'},
  optionList: {flexGrow: 0},
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    marginBottom: 6,
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  optionRTL: {flexDirection: 'row-reverse'},
  optionActive: {backgroundColor: COLORS.surfaceAlt, borderColor: COLORS.primary},
  optionText: {fontSize: 15, color: COLORS.text},
  optionTextActive: {color: COLORS.primary},
  optionCheck: {fontSize: 15, color: COLORS.primary, fontWeight: '700'},
});

export default SelectField;
