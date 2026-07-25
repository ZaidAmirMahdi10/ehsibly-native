import React, {useEffect, useRef} from 'react';
import {View, Animated, StyleSheet, Easing} from 'react-native';
import {COLORS} from '../../constants/theme';
import {FONTS} from '../../constants/fonts';

const SplashScreen = ({onFinish}) => {
  const containerOpacity = useRef(new Animated.Value(1)).current;

  const glowScale = useRef(new Animated.Value(0.6)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;

  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.4)).current;
  const logoRotate = useRef(new Animated.Value(-1)).current;

  const wordOpacity = useRef(new Animated.Value(0)).current;
  const wordTranslateY = useRef(new Animated.Value(14)).current;

  const arWordOpacity = useRef(new Animated.Value(0)).current;
  const arWordTranslateY = useRef(new Animated.Value(10)).current;

  const sloganOpacity = useRef(new Animated.Value(0)).current;
  const sloganTranslateY = useRef(new Animated.Value(8)).current;

  const dot1 = useRef(new Animated.Value(0.3)).current;
  const dot2 = useRef(new Animated.Value(0.3)).current;
  const dot3 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const glowLoop = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(glowScale, {
            toValue: 1.15,
            duration: 1400,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(glowOpacity, {
            toValue: 0.5,
            duration: 1400,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(glowScale, {
            toValue: 0.85,
            duration: 1400,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(glowOpacity, {
            toValue: 0.15,
            duration: 1400,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      ]),
    );
    glowLoop.start();

    const dotPulse = value =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(value, {toValue: 1, duration: 400, useNativeDriver: true}),
          Animated.timing(value, {toValue: 0.3, duration: 400, useNativeDriver: true}),
        ]),
      );

    Animated.sequence([
      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 650,
          easing: Easing.out(Easing.exp),
          useNativeDriver: true,
        }),
        Animated.spring(logoScale, {toValue: 1, friction: 5, tension: 60, useNativeDriver: true}),
        Animated.timing(logoRotate, {
          toValue: 0,
          duration: 750,
          easing: Easing.out(Easing.back(1.4)),
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(wordOpacity, {toValue: 1, duration: 420, useNativeDriver: true}),
        Animated.timing(wordTranslateY, {
          toValue: 0,
          duration: 420,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(arWordOpacity, {toValue: 1, duration: 380, useNativeDriver: true}),
        Animated.timing(arWordTranslateY, {
          toValue: 0,
          duration: 380,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(sloganOpacity, {toValue: 1, duration: 380, useNativeDriver: true}),
        Animated.timing(sloganTranslateY, {
          toValue: 0,
          duration: 380,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    ]).start(() => {
      dotPulse(dot1).start();
      setTimeout(() => dotPulse(dot2).start(), 150);
      setTimeout(() => dotPulse(dot3).start(), 300);
    });

    const finishTimer = setTimeout(() => {
      glowLoop.stop();
      Animated.timing(containerOpacity, {
        toValue: 0,
        duration: 450,
        useNativeDriver: true,
      }).start(() => {
        // Animated's native-driver completion callback can fire during a
        // commit phase where React forbids scheduling updates (surfaces as
        // "useInsertionEffect must not schedule updates"); deferring one
        // tick moves the parent's setState to a safe, unbatched point.
        setTimeout(() => onFinish?.(), 0);
      });
    }, 5200);

    return () => clearTimeout(finishTimer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rotateInterpolated = logoRotate.interpolate({
    inputRange: [-1, 0],
    outputRange: ['-45deg', '0deg'],
  });

  return (
    <Animated.View style={[styles.container, {opacity: containerOpacity}]}>
      <View style={styles.logoWrap}>
        <Animated.View
          style={[styles.glow, {opacity: glowOpacity, transform: [{scale: glowScale}]}]}
        />
        <Animated.Image
          source={require('../../assets/logo.png')}
          style={[
            styles.logo,
            {opacity: logoOpacity, transform: [{scale: logoScale}, {rotate: rotateInterpolated}]},
          ]}
          resizeMode="contain"
        />
      </View>

      <Animated.Text
        style={[styles.wordmark, {opacity: wordOpacity, transform: [{translateY: wordTranslateY}]}]}>
        EHSIBLY
      </Animated.Text>
      <Animated.Text
        style={[
          styles.wordmarkAr,
          {opacity: arWordOpacity, transform: [{translateY: arWordTranslateY}]},
        ]}>
        إحسبلي
      </Animated.Text>

      <Animated.Text
        style={[
          styles.slogan,
          {opacity: sloganOpacity, transform: [{translateY: sloganTranslateY}]},
        ]}>
        Accounting & Management, Simplified
      </Animated.Text>
      <Animated.Text
        style={[
          styles.sloganAr,
          {opacity: sloganOpacity, transform: [{translateY: sloganTranslateY}]},
        ]}>
        إحسبلي للإدارة والمحاسبة
      </Animated.Text>

      <View style={styles.dotsRow}>
        <Animated.View style={[styles.dot, {opacity: dot1}]} />
        <Animated.View style={[styles.dot, {opacity: dot2}]} />
        <Animated.View style={[styles.dot, {opacity: dot3}]} />
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primaryDark,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoWrap: {
    width: 200,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: COLORS.accent,
  },
  logo: {
    width: 160,
    height: 160,
  },
  wordmark: {
    marginTop: 18,
    color: COLORS.white,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 4,
    fontFamily: FONTS.ENGLISH_DEFAULT,
  },
  wordmarkAr: {
    marginTop: 4,
    color: COLORS.accent,
    fontSize: 16,
    // Was fontWeight: '600' + FONTS.DEFAULT ('Tajawal-Regular' on Android) —
    // Android has no bold/medium variant of that exact filename to
    // synthesize, so it silently fell back to the system font. Using the
    // actual Tajawal-Medium file gets the weight without fighting Android's
    // font matching (a no-op on iOS, where all Tajawal weights already
    // share one family that resolves via fontWeight).
    fontFamily: FONTS.TAJAWAL_MEDIUM,
  },
  slogan: {
    marginTop: 14,
    color: 'rgba(255,255,255,0.75)',
    fontSize: 12,
    letterSpacing: 0.6,
    fontFamily: FONTS.ENGLISH_DEFAULT,
  },
  sloganAr: {
    marginTop: 3,
    color: 'rgba(232,180,255,0.85)',
    fontSize: 12,
    fontFamily: FONTS.DEFAULT,
  },
  dotsRow: {
    flexDirection: 'row',
    columnGap: 8,
    marginTop: 24,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: COLORS.accent,
  },
});

export default SplashScreen;
