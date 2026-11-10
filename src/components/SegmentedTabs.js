import React, {useContext} from 'react';
import {View, TouchableOpacity, StyleSheet} from 'react-native';
import {LanguageContext} from '../../App';
import CustomText from './CustomText';
import {COLORS, CARD_SHADOW} from '../constants/theme';

// A pill segmented control — one shared tab strip used both for the top-level
// management sections (Subcompanies / Suppliers / Banks) and for the Banks
// section's Iraqi / Foreign sub-tabs. `tabs` is [{key, label}]; the active
// key is `value`, and tapping fires `onChange(key)`. Kept dependency-free
// (no top-tab navigator) to match the app's existing in-screen tab pattern.
const SegmentedTabs = ({tabs, value, onChange, style}) => {
  const {currentDirection} = useContext(LanguageContext);
  const isRTL = currentDirection === 'rtl';

  return (
    <View style={[styles.row, isRTL && styles.rowRTL, style]}>
      {tabs.map(tab => {
        const active = tab.key === value;
        return (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, active && styles.tabActive]}
            activeOpacity={0.8}
            onPress={() => onChange(tab.key)}>
            <CustomText
              bold={active}
              style={[styles.tabText, active && styles.tabTextActive]}
              paddingTop={0}
              center>
              {tab.label}
            </CustomText>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 12,
    padding: 4,
    marginHorizontal: 16,
    marginTop: 12,
    gap: 4,
  },
  rowRTL: {flexDirection: 'row-reverse'},
  tab: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabActive: {
    backgroundColor: COLORS.surface,
    ...CARD_SHADOW,
  },
  tabText: {fontSize: 13, color: COLORS.textMuted},
  tabTextActive: {color: COLORS.primary},
});

export default SegmentedTabs;
