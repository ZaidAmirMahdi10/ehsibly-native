// src/components/ProductCard.js

import React, {useRef, useContext} from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import {useTranslation} from 'react-i18next';
import {LanguageContext} from '../../App';

import CustomText from './CustomText';
import CustomView from './CustomView';
import UpdatedBadge from './UpdatedBadge';

const ProductCard = ({item, onPress}) => {
  const scale = useRef(new Animated.Value(1)).current;
  const {t} = useTranslation();
  const {currentDirection} = useContext(LanguageContext);
  const isRTL = currentDirection === 'rtl';

  const handlePressIn = () =>
    Animated.spring(scale, {
      toValue: 0.97,
      useNativeDriver: true,
      speed: 50,
    }).start();

  const handlePressOut = () =>
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
    }).start();

  return (
    <Animated.View style={[styles.cardWrapper, {transform: [{scale}]}]}>
      <TouchableOpacity
        activeOpacity={1}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={styles.card}>
        <View style={styles.imageContainer}>
          <Image
            source={{uri: item.image}}
            style={styles.cardImage}
            resizeMode="cover"
          />

          {item.featured && (
            <View
              style={[
                styles.cardFeaturedBadge,
                isRTL ? styles.leftBadge : styles.rightBadge,
              ]}>
              <Text style={styles.cardFeaturedBadgeText}>✦</Text>
            </View>
          )}
        </View>

        <View style={styles.cardContent}>
          <CustomView row style={styles.cardTopRow}>
            <CustomText style={styles.cardCategory}>
              {t(item.category).toUpperCase()}
            </CustomText>

            <UpdatedBadge time={t(item.updatedAt)} />
          </CustomView>

          <CustomText style={styles.cardTitle} numberOfLines={2}>
            {t(item.name)}
          </CustomText>

          <CustomText style={styles.cardDescription} numberOfLines={2}>
            {t(item.description)}
          </CustomText>

          <CustomView row style={styles.cardFooter}>
            <CustomText style={styles.cardPrice}>
              ${item.price.toFixed(2)}
            </CustomText>

            <View style={styles.cardArrow}>
              <Text style={styles.cardArrowText}>{isRTL ? '←' : '→'}</Text>
            </View>
          </CustomView>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

export default ProductCard;

const styles = StyleSheet.create({
  cardWrapper: {
    borderRadius: 18,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 3,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#EFEFEF',
  },
  imageContainer: {
    position: 'relative',
  },
  cardImage: {
    width: '100%',
    height: 200,
    backgroundColor: '#EFEFEF',
  },
  cardFeaturedBadge: {
    position: 'absolute',
    top: 12,
    backgroundColor: '#C1121F',
    borderRadius: 20,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardFeaturedBadgeText: {
    fontFamily: 'Tajawal-Regular',
    fontSize: 11,
    fontWeight: '700',
    color: '#FFF0F0',
  },
  cardContent: {
    padding: 16,
  },
  cardTopRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  cardCategory: {
    fontFamily: 'Tajawal-Regular',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
    color: '#C1121F',
  },
  cardTitle: {
    fontFamily: 'Tajawal-Regular',
    fontSize: 17,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 6,
    lineHeight: 22,
    letterSpacing: -0.2,
  },
  cardDescription: {
    fontFamily: 'Tajawal-Regular',
    fontSize: 13,
    color: '#6B6B6B',
    lineHeight: 19,
    marginBottom: 14,
  },
  cardFooter: {
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardPrice: {
    fontFamily: 'Tajawal-Regular',
    fontSize: 20,
    fontWeight: '800',
    color: '#1A1A1A',
    letterSpacing: -0.5,
  },
  cardArrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#C1121F',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardArrowText: {
    fontFamily: 'Tajawal-Regular',
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  rightBadge: {
    right: 12,
  },
  leftBadge: {
    left: 12,
  },
});