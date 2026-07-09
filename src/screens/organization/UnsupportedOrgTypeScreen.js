import React, {useContext, useEffect, useRef} from 'react';
import {View, Image, StyleSheet, Animated, Easing} from 'react-native';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTranslation} from 'react-i18next';

import {LanguageContext} from '../../../App';
import CustomText from '../../components/CustomText';
import PrimaryButton from '../../components/PrimaryButton';
import LanguageToggle from '../../components/LanguageToggle';
import {useAuth} from '../../context/AuthContext';
import {useAlert} from '../../context/AlertContext';
import {COLORS, makeShadow} from '../../constants/theme';

// One bouncing dot in the "building something great…" loader row. Each dot
// runs its own loop, started `delay` ms apart, so they ripple left to right
// instead of bouncing in lockstep.
const LoaderDot = ({delay}) => {
  const bounce = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(bounce, {toValue: 1, duration: 380, easing: Easing.out(Easing.quad), useNativeDriver: true}),
        Animated.timing(bounce, {toValue: 0, duration: 380, easing: Easing.in(Easing.quad), useNativeDriver: true}),
        Animated.delay(760 - delay),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [bounce, delay]);

  return (
    <Animated.View
      style={[
        styles.dot,
        {
          opacity: bounce.interpolate({inputRange: [0, 1], outputRange: [0.4, 1]}),
          transform: [{translateY: bounce.interpolate({inputRange: [0, 1], outputRange: [0, -6]})}],
        },
      ]}
    />
  );
};

// One expanding, fading ring behind the badge — a "radar ping" effect. Two
// of these, in different brand colors and staggered half a cycle apart,
// read as continuous multi-colored ripples instead of a single flat pulse.
const PulseRing = ({delay, color}) => {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(pulse, {toValue: 1, duration: 1800, easing: Easing.out(Easing.ease), useNativeDriver: true}),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse, delay]);

  return (
    <Animated.View
      style={[
        styles.pulseRing,
        {
          borderColor: color,
          opacity: pulse.interpolate({inputRange: [0, 0.6, 1], outputRange: [0.6, 0.25, 0]}),
          transform: [{scale: pulse.interpolate({inputRange: [0, 1], outputRange: [1, 1.9]})}],
        },
      ]}
    />
  );
};

// Shown instead of the normal tab experience when the logged-in
// organization's type isn't one this app builds a dashboard for yet (e.g.
// school, bank) — see AppTabs.js's SUPPORTED_ORGANIZATION_TYPES.
const UnsupportedOrgTypeScreen = () => {
  const {t} = useTranslation();
  const {logout} = useAuth();
  const {showAlert} = useAlert();
  const {currentDirection} = useContext(LanguageContext);
  const isRTL = currentDirection === 'rtl';
  const insets = useSafeAreaInsets();

  const entrance = useRef(new Animated.Value(0)).current;
  const float = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(entrance, {
      toValue: 1,
      duration: 700,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    const floatLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(float, {toValue: 1, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: true}),
        Animated.timing(float, {toValue: 0, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: true}),
      ]),
    );
    floatLoop.start();
    return () => floatLoop.stop();
  }, [entrance, float]);

  const handleLogout = () => {
    showAlert(t('logoutConfirmTitle'), t('logoutConfirmMessage'), [
      {text: t('cancel'), style: 'cancel'},
      {text: t('logout'), style: 'destructive', onPress: logout},
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
      <View style={styles.blobPrimary} />
      <View style={styles.blobAccent} />
      <View style={styles.blobSuccess} />

      <LanguageToggle
        style={[
          styles.languageToggle,
          {top: insets.top + 12},
          isRTL ? styles.languageToggleLeft : styles.languageToggleRight,
        ]}
      />

      <View style={styles.container}>
        <View style={styles.badgeWrap}>
          <PulseRing delay={0} color={COLORS.primary} />
          <PulseRing delay={900} color={COLORS.accent} />
          <Animated.View
            style={[
              styles.badge,
              {
                transform: [
                  {translateY: float.interpolate({inputRange: [0, 1], outputRange: [0, -10]})},
                  {rotate: float.interpolate({inputRange: [0, 1], outputRange: ['-6deg', '6deg']})},
                ],
              },
            ]}>
            <Image source={require('../../assets/logo.png')} style={styles.logo} resizeMode="contain" />
          </Animated.View>
        </View>

        <Animated.View
          style={[
            styles.card,
            {
              opacity: entrance,
              transform: [{translateY: entrance.interpolate({inputRange: [0, 1], outputRange: [16, 0]})}],
            },
          ]}>
          <CustomText center bold style={styles.title} lineHeight={28}>
            {t('orgTypeUnsupportedTitle')}
          </CustomText>
          <CustomText center style={styles.message}>
            {t('orgTypeUnsupportedMessage')}
          </CustomText>

          <View style={styles.loaderRow}>
            <LoaderDot delay={0} />
            <LoaderDot delay={130} />
            <LoaderDot delay={260} />
          </View>

          <PrimaryButton
            title={t('logout')}
            onPress={handleLogout}
            variant="secondary"
            style={styles.logoutBtn}
          />
        </Animated.View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {flex: 1, backgroundColor: COLORS.bg, overflow: 'hidden'},
  blobPrimary: {
    position: 'absolute',
    top: -70,
    right: -70,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: COLORS.primaryLight,
    opacity: 0.3,
  },
  blobAccent: {
    position: 'absolute',
    bottom: -110,
    left: -90,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: COLORS.accent,
    opacity: 0.35,
  },
  blobSuccess: {
    position: 'absolute',
    top: '38%',
    left: -60,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: COLORS.success,
    opacity: 0.12,
  },
  languageToggle: {position: 'absolute', zIndex: 3},
  languageToggleLeft: {left: 20},
  languageToggleRight: {right: 20},
  container: {flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28},
  badgeWrap: {
    width: 116,
    height: 116,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    marginBottom: -58,
  },
  pulseRing: {
    position: 'absolute',
    width: 116,
    height: 116,
    borderRadius: 58,
    borderWidth: 2,
  },
  badge: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...makeShadow({y: 8, blur: 16, color: COLORS.primary, opacity: 0.22}),
  },
  logo: {width: 66, height: 66},
  card: {
    width: '100%',
    backgroundColor: COLORS.surface,
    borderRadius: 28,
    paddingTop: 68,
    paddingHorizontal: 24,
    paddingBottom: 28,
    alignItems: 'center',
    ...makeShadow({y: 12, blur: 24, color: COLORS.primaryDark, opacity: 0.12}),
  },
  title: {fontSize: 22, color: COLORS.text, marginBottom: 10, lineHeight: 28},
  message: {fontSize: 14, color: COLORS.textMuted, lineHeight: 20, marginBottom: 20},
  loaderRow: {flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 28},
  dot: {width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.primary},
  logoutBtn: {minWidth: 160, borderWidth: 1.5, borderColor: COLORS.primary},
});

export default UnsupportedOrgTypeScreen;
