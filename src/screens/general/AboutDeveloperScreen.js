import React, {useContext, useRef} from 'react';
import {View, ScrollView, StyleSheet, Image, TouchableOpacity, Linking, Animated, Easing} from 'react-native';
import Svg, {Defs, LinearGradient, Stop, Rect} from 'react-native-svg';
import {useTranslation} from 'react-i18next';
import {useNavigation} from '@react-navigation/native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {LanguageContext} from '../../../App';
import CustomText from '../../components/CustomText';
import StripedCard from '../../components/StripedCard';
import {COLORS, CARD_SHADOW} from '../../constants/theme';

// TestFlight-style app page, per explicit reference screenshots: ONE
// continuous gradient surface from the very top of the screen (behind the
// status bar and a custom back chevron — this screen hides the stack
// header, see RootNavigator.js), centered logo + name + two pill contact
// buttons, then a white 3-column stat card and an "App Information" rows
// card on the page background. Al-Habbar's brand blue, deliberately NOT
// this app's purple. Drawn with an SVG gradient rect since this app
// doesn't carry react-native-linear-gradient.
//
// The gradient hero collapses to a compact row on scroll using the same
// discrete two-state pattern as HomeScreen.js's purple card. It OVERLAYS
// the ScrollView (constant content top padding) — resizing the ScrollView
// itself changed maxScroll mid-animation and fed an expand/collapse
// oscillation loop on short content.
const DEVELOPER_EMAIL = 'info@alhabbar.tech';
const DEVELOPER_PHONE = '+9647800092734';
export const DEVELOPER_BRAND_BLUE = '#158bf9';
const BANNER_GRADIENT_BOTTOM = '#71b8fb';
const APP_VERSION = '1.0.0-phaseA';

const HERO_CONTENT_HEIGHT = 320; // below the status-bar/safe-area zone
const HERO_COLLAPSED_CONTENT_HEIGHT = 56;
// Hysteresis pair: collapse only after real scrolling, expand only near the
// very top — a single shared threshold flip-flops on small movements.
const COLLAPSE_AT = 32;
const EXPAND_AT = 8;

const AboutDeveloperScreen = () => {
  const {currentDirection} = useContext(LanguageContext);
  const isRTL = currentDirection === 'rtl';
  const {t} = useTranslation();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const heroExpandedHeight = insets.top + HERO_CONTENT_HEIGHT;
  const heroCollapsedHeight = insets.top + HERO_COLLAPSED_CONTENT_HEIGHT;

  const collapseAnim = useRef(new Animated.Value(0)).current; // 0 expanded → 1 collapsed
  const collapsedRef = useRef(false);

  const setCollapsed = collapsed => {
    if (collapsedRef.current === collapsed) {
      return;
    }
    collapsedRef.current = collapsed;
    Animated.timing(collapseAnim, {
      toValue: collapsed ? 1 : 0,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false, // height isn't native-drivable; keep every value on one driver
    }).start();
  };

  const handleScroll = e => {
    const {contentOffset, contentSize, layoutMeasurement} = e.nativeEvent;
    const maxScroll = contentSize.height - layoutMeasurement.height;
    // Same guard as HomeScreen: with too little real scroll distance a
    // collapse can never settle (and iOS rubber-banding flickers it).
    if (maxScroll < COLLAPSE_AT + 16) {
      setCollapsed(false);
      return;
    }
    if (contentOffset.y > COLLAPSE_AT) {
      setCollapsed(true);
    } else if (contentOffset.y < EXPAND_AT) {
      setCollapsed(false);
    }
  };

  const heroHeight = collapseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [heroExpandedHeight, heroCollapsedHeight],
  });
  const expandedOpacity = collapseAnim.interpolate({inputRange: [0, 0.6], outputRange: [1, 0], extrapolate: 'clamp'});
  const collapsedOpacity = collapseAnim.interpolate({inputRange: [0.4, 1], outputRange: [0, 1], extrapolate: 'clamp'});

  const renderBackChevron = () => (
    <TouchableOpacity style={styles.backBtn} onPress={navigation.goBack} activeOpacity={0.7}>
      <CustomText style={styles.backIcon} paddingTop={0} lineHeight={32}>
        {isRTL ? '›' : '‹'}
      </CustomText>
    </TouchableOpacity>
  );

  return (
    <View style={styles.flex}>
      <Animated.View style={[styles.hero, {height: heroHeight}]}>
        <Svg style={StyleSheet.absoluteFill}>
          <Defs>
            <LinearGradient id="heroGradient" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={DEVELOPER_BRAND_BLUE} />
              <Stop offset="1" stopColor={BANNER_GRADIENT_BOTTOM} />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill="url(#heroGradient)" />
        </Svg>

        <Animated.View style={[styles.heroExpanded, {paddingTop: insets.top, opacity: expandedOpacity}]}>
          <View style={[styles.backRow, isRTL && styles.backRowRTL]}>{renderBackChevron()}</View>
          <View style={styles.logoWrap}>
            <View style={styles.logoDisc} />
            <Image source={require('../../assets/alhabbar-logo.png')} style={styles.logo} />
          </View>
          <CustomText bold center style={styles.brandName} lineHeight={30}>
            {t('alhabbarTechnologies')}
          </CustomText>
          <View style={[styles.pillRow, isRTL && styles.pillRowRTL]}>
            <TouchableOpacity
              style={styles.pill}
              activeOpacity={0.7}
              onPress={() => Linking.openURL(`mailto:${DEVELOPER_EMAIL}`)}>
              <CustomText bold style={styles.pillText} paddingTop={0}>
                {t('contactEmailAction')}
              </CustomText>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.pill}
              activeOpacity={0.7}
              onPress={() => Linking.openURL(`tel:${DEVELOPER_PHONE}`)}>
              <CustomText bold style={styles.pillText} paddingTop={0}>
                {t('contactCallAction')}
              </CustomText>
            </TouchableOpacity>
          </View>
        </Animated.View>

        <Animated.View
          style={[
            styles.heroCollapsed,
            isRTL && styles.heroCollapsedRTL,
            {paddingTop: insets.top, opacity: collapsedOpacity},
          ]}>
          {renderBackChevron()}
          <View style={[styles.heroCollapsedMain, isRTL && styles.heroCollapsedMainRTL]}>
            <Image source={require('../../assets/alhabbar-logo.png')} style={styles.logoSmall} />
            <CustomText bold style={styles.brandNameSmall} paddingTop={0} lineHeight={22}>
              {t('alhabbarTechnologies')}
            </CustomText>
          </View>
          <View style={styles.backBtnGhost} />
        </Animated.View>
      </Animated.View>

      <ScrollView
        style={styles.flex}
        contentContainerStyle={{paddingTop: heroExpandedHeight + 16, paddingBottom: 40}}
        onScroll={handleScroll}
        scrollEventThrottle={16}>
        <View style={styles.content}>
          <View style={[styles.statCard, isRTL && styles.statCardRTL]}>
            <View style={styles.statCol}>
              <CustomText style={styles.statLabel} paddingTop={0}>
                {t('theDeveloper')}
              </CustomText>
              <CustomText bold style={styles.statValue} center numberOfLines={2}>
                {t('alhabbarTechnologies')}
              </CustomText>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCol}>
              <CustomText style={styles.statLabel} paddingTop={0}>
                {t('categoryLabel')}
              </CustomText>
              <CustomText bold style={styles.statValue} center>
                {t('financeCategory')}
              </CustomText>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCol}>
              <CustomText style={styles.statLabel} paddingTop={0}>
                {t('appVersionLabel')}
              </CustomText>
              <CustomText bold style={styles.statValue} center>
                {APP_VERSION}
              </CustomText>
            </View>
          </View>

          <CustomText bold style={styles.sectionTitle}>
            {t('appInformationTitle')}
          </CustomText>
          <StripedCard
            isRTL={isRTL}
            cardStyle={styles.infoCard}
            items={[
              {label: t('theDeveloper'), value: t('alhabbarTechnologies')},
              {
                label: t('developerEmailLabel'),
                value: (
                  <TouchableOpacity onPress={() => Linking.openURL(`mailto:${DEVELOPER_EMAIL}`)}>
                    <CustomText style={styles.linkValue} paddingTop={0}>
                      {DEVELOPER_EMAIL}
                    </CustomText>
                  </TouchableOpacity>
                ),
              },
              {
                label: t('developerPhoneLabel'),
                value: (
                  <TouchableOpacity onPress={() => Linking.openURL(`tel:${DEVELOPER_PHONE}`)}>
                    <CustomText style={styles.linkValue} paddingTop={0}>
                      {DEVELOPER_PHONE}
                    </CustomText>
                  </TouchableOpacity>
                ),
              },
            ]}
          />

          <View style={styles.storyCard}>
            <CustomText bold style={styles.storyTitle}>
              {t('developerInfoTitle')}
            </CustomText>
            <CustomText style={styles.storyText} lineHeight={24}>
              {t('developerInfoParagraph1')}
            </CustomText>
            <CustomText style={styles.storyText} lineHeight={24}>
              {t('developerInfoParagraph2')}
            </CustomText>
            <CustomText style={styles.storyText} lineHeight={24}>
              {t('developerInfoParagraph3')}
            </CustomText>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  flex: {flex: 1, backgroundColor: COLORS.bg},
  hero: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 2,
    overflow: 'hidden',
  },
  heroExpanded: {...StyleSheet.absoluteFillObject, alignItems: 'center'},
  backRow: {alignSelf: 'stretch', flexDirection: 'row', paddingHorizontal: 10},
  backRowRTL: {flexDirection: 'row-reverse'},
  backBtn: {width: 40, height: 40, alignItems: 'center', justifyContent: 'center'},
  backBtnGhost: {width: 40},
  backIcon: {color: '#fff', fontSize: 30, fontWeight: '600'},
  logoWrap: {width: 130, height: 130, alignItems: 'center', justifyContent: 'center', marginTop: 2},
  // White disc INSET behind the logo: the PNG's circular roundel doesn't
  // quite reach the image bounds (88% of width), so a disc at the image's
  // own size shows as a white ring — sized just under the roundel's real
  // diameter it fills the artwork without any visible border.
  logoDisc: {position: 'absolute', width: 112, height: 112, borderRadius: 56, backgroundColor: '#fff'},
  logo: {width: 130, height: 130},
  brandName: {color: '#fff', fontSize: 22, paddingHorizontal: 16, marginTop: 10},
  pillRow: {flexDirection: 'row', gap: 12, marginTop: 18},
  pillRowRTL: {flexDirection: 'row-reverse'},
  pill: {
    backgroundColor: 'rgba(255,255,255,0.28)',
    borderRadius: 999,
    paddingHorizontal: 26,
    paddingVertical: 11,
  },
  pillText: {color: '#fff', fontSize: 14},
  heroCollapsed: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  heroCollapsedRTL: {flexDirection: 'row-reverse'},
  heroCollapsedMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  heroCollapsedMainRTL: {flexDirection: 'row-reverse'},
  logoSmall: {width: 38, height: 38},
  brandNameSmall: {color: '#fff', fontSize: 16},
  content: {paddingHorizontal: 16},
  statCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    paddingVertical: 14,
    marginBottom: 20,
    ...CARD_SHADOW,
  },
  statCardRTL: {flexDirection: 'row-reverse'},
  statCol: {flex: 1, alignItems: 'center', gap: 2, paddingHorizontal: 6},
  statLabel: {fontSize: 11, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.6},
  statValue: {fontSize: 13, color: COLORS.text},
  statDivider: {width: StyleSheet.hairlineWidth, backgroundColor: COLORS.border, marginVertical: 4},
  sectionTitle: {fontSize: 14, color: COLORS.textMuted, marginBottom: 8, paddingHorizontal: 4},
  infoCard: {marginBottom: 16},
  // Brand blue, not the app's purple — the tappable contact values should
  // read as part of this page's Al-Habbar theme.
  linkValue: {color: DEVELOPER_BRAND_BLUE, fontSize: 14, fontWeight: '600', textDecorationLine: 'underline'},
  storyCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...CARD_SHADOW,
  },
  storyTitle: {fontSize: 15, color: COLORS.text, marginBottom: 8},
  storyText: {fontSize: 13.5, color: COLORS.textMuted, marginBottom: 10},
});

export default AboutDeveloperScreen;
