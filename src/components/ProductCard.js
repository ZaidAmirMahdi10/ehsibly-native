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

// ─────────────────────────────────────────────────────────────────────────────
// Match this to your BottomTabNavigator USER_TYPE constant.
// 'admin' — no favourite button shown
// 'user'  — heart button shown on each card
// ─────────────────────────────────────────────────────────────────────────────
const USER_TYPE = 'user'; // <-- 'admin' | 'user'
const isUser = USER_TYPE === 'user';

const ProductCard = ({item, onPress, isFavourite = false, onToggleFavourite}) => {
  const scale = useRef(new Animated.Value(1)).current;
  const heartScale = useRef(new Animated.Value(1)).current;
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

  const handleHeartPress = () => {
    // Bounce animation on the heart
    Animated.sequence([
      Animated.spring(heartScale, {toValue: 1.35, useNativeDriver: true, speed: 80}),
      Animated.spring(heartScale, {toValue: 1, useNativeDriver: true, speed: 80}),
    ]).start();
    onToggleFavourite?.(item.id);
  };

  return (
    <Animated.View style={[styles.cardWrapper, {transform: [{scale}]}]}>
      <TouchableOpacity
        activeOpacity={1}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={styles.card}>

        {/* ── Image ── */}
        <View style={styles.imageContainer}>
          <Image
            source={{uri: item.image}}
            style={styles.cardImage}
            resizeMode="cover"
          />

          {/* Featured badge */}
          {item.featured && (
            <View
              style={[
                styles.cardFeaturedBadge,
                isRTL ? styles.leftBadge : styles.rightBadge,
              ]}>
              <Text style={styles.cardFeaturedBadgeText}>✦</Text>
            </View>
          )}

          {/* Favourite button — user only, sits on the image */}
          {isUser && (
            <TouchableOpacity
              onPress={handleHeartPress}
              activeOpacity={0.8}
              style={[
                styles.heartBtn,
                isRTL ? styles.heartBtnRight : styles.heartBtnLeft,
                isFavourite && styles.heartBtnActive,
              ]}>
              <Animated.Text
                style={[
                  styles.heartIcon,
                  {transform: [{scale: heartScale}]},
                  isFavourite && styles.heartIconActive,
                ]}>
                {isFavourite ? '♥' : '♡'}
              </Animated.Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ── Content ── */}
        <View style={styles.cardContent}>
          <CustomView style={styles.cardTopRow}>
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

          <CustomView style={styles.cardFooter}>
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

  // Featured badge
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
  rightBadge: {right: 12},
  leftBadge:  {left: 12},

  // Heart / favourite button
  heartBtn: {
    position: 'absolute',
    bottom: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  heartBtnLeft: {left: 12},   // LTR: bottom-left of image
  heartBtnRight: {right: 12}, // RTL: bottom-right of image
  heartBtnActive: {
    backgroundColor: '#FFF0F0',
  },
  heartIcon: {
    fontSize: 18,
    color: '#A8A8A8',
  },
  heartIconActive: {
    color: '#C1121F',
  },

  // Card content
  cardContent: {
    padding: 16,
  },
  cardTopRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
    flexDirection: 'row',
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
    flexDirection: 'row',
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
});