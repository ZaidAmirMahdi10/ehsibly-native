import React, {useContext} from 'react';
import {View, TouchableOpacity, StyleSheet} from 'react-native';

import CustomText from './CustomText';
import {LanguageContext} from '../../App';
import {COLORS} from '../constants/theme';

// Mirrors the web's `.c-entity-list__row`: icon tile, bold main name with the
// other language's name small underneath, and a chevron pointing "forward"
// (left in RTL, right in LTR).
const EntityListRow = ({title, subtitle, icon = '🏢', onPress}) => {
  const context = useContext(LanguageContext);
  const isRTL = context?.currentDirection === 'rtl';
  const showSub = !!subtitle && subtitle !== title;

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={onPress}
      style={[styles.row, {flexDirection: isRTL ? 'row-reverse' : 'row'}]}>
      <View style={styles.avatar}>
        <CustomText style={styles.avatarText} paddingTop={0}>
          {icon}
        </CustomText>
      </View>
      <View style={styles.text}>
        <CustomText bold numberOfLines={1} style={styles.name} paddingTop={0}>
          {title}
        </CustomText>
        {showSub ? (
          <CustomText numberOfLines={1} style={styles.sub} paddingTop={0}>
            {subtitle}
          </CustomText>
        ) : null}
      </View>
      <CustomText style={styles.chevron} paddingTop={0}>
        {isRTL ? '‹' : '›'}
      </CustomText>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    gap: 14,
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#efebf5',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#f1ebfb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {fontSize: 18, lineHeight: 22},
  text: {flex: 1, gap: 3},
  name: {fontSize: 15, color: '#1e1b2e'},
  sub: {fontSize: 13, color: '#8a849c', fontWeight: '500'},
  chevron: {fontSize: 26, lineHeight: 28, color: '#c9c3d6'},
});

export default EntityListRow;
