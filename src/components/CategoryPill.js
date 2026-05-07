// src/components/CategoryPill.js

import React from 'react';
import {TouchableOpacity, StyleSheet} from 'react-native';
import CustomText from './CustomText';

const CategoryPill = ({label, active, onPress}) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={[styles.pill, active && styles.pillActive]}>
      <CustomText
        center
        style={[styles.pillText, active && styles.pillTextActive]}>
        {label}
      </CustomText>
    </TouchableOpacity>
  );
};

export default CategoryPill;

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EFEFEF',
  },
  pillActive: {
    backgroundColor: '#C1121F',
    borderColor: '#C1121F',
  },
  pillText: {
    fontFamily: 'Tajawal-Regular',
    fontSize: 13,
    fontWeight: '600',
    color: '#6B6B6B',
  },
  pillTextActive: {
    color: '#fff',
  },
});