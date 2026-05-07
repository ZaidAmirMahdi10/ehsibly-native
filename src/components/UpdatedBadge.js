// src/components/UpdatedBadge.js

import React from 'react';
import {View, StyleSheet} from 'react-native';
import CustomText from './CustomText';

const UpdatedBadge = ({time}) => {
  return (
    <View style={styles.updatedBadge}>
      <CustomText center style={styles.updatedBadgeText}>
        ↻ {time}
      </CustomText>
    </View>
  );
};

export default UpdatedBadge;

const styles = StyleSheet.create({
  updatedBadge: {
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  updatedBadgeText: {
    fontFamily: 'Tajawal-Regular',
    fontSize: 10,
    fontWeight: '500',
    color: '#A8A8A8',
  },
});