// src/components/FeaturedBadge.js

import React from 'react';
import {StyleSheet} from 'react-native';
import {useTranslation} from 'react-i18next';

import CustomText from './CustomText';
import CustomView from './CustomView';

const FeaturedBadge = () => {
  const {t} = useTranslation();

  return (
    <CustomView row style={styles.featuredBadge}>
      <CustomText center style={styles.featuredBadgeText}>
        ✦ {t('featured')}
      </CustomText>
    </CustomView>
  );
};

export default FeaturedBadge;

const styles = StyleSheet.create({
  featuredBadge: {
    alignItems: 'center',
    backgroundColor: '#FFF0F0',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  featuredBadgeText: {
    fontFamily: 'Tajawal-Regular',
    fontSize: 11,
    fontWeight: '700',
    color: '#C1121F',
  },
});