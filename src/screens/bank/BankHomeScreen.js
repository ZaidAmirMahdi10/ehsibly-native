import React, {useContext, useEffect, useRef, useState} from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
  StatusBar,
  FlatList,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useTranslation} from 'react-i18next';
import Svg, {Circle} from 'react-native-svg';
import {SlidersHorizontal, CheckCircle2, XCircle, Layers, CircleDashed} from 'lucide-react-native';

import {LanguageContext} from '../../../App';
import {useAuth} from '../../context/AuthContext';
import CustomText from '../../components/CustomText';
import SearchInput from '../../components/SearchInput';
import SelectField from '../../components/SelectField';
import {tajawalFamilyForWeight} from '../../constants/fonts';
import {COLORS, PRIMARY_SHADOW} from '../../constants/theme';

// A bank-admin-focused home screen, styled after the real HomeScreen.js's
// look (plain logo header, standalone shadowed collapsing card, card-based
// list) rather than a literal port of the web's Bank Applications table —
// see BankApplicationsScreen.js for that literal recreation, kept as-is.
// See BankHomeScreenOld.js for the pre-"rich redesign" snapshot of this file.
// Static preview data — see BankApplicationsScreen.js's header comment for
// why this isn't wired to the real bank backend.
const CARD_HEIGHT = 244;
const CARD_COLLAPSED_HEIGHT = 64;
const HEADER_HEIGHT = 60;

const RING_SIZE = 84;
const RING_SIZE_COLLAPSED = 34;
const RING_STROKE = 8;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const CATEGORY_STYLES = {
  awaiting: {tagBg: '#fff3d6', tagText: '#a6740a', labelKey: 'bankHomeAwaitingYou'},
  inProgress: {tagBg: '#e3f2fd', tagText: '#1976d2', labelKey: 'bankHomeInProgress'},
  completed: {tagBg: '#e6f9f1', tagText: COLORS.success, labelKey: 'bankHomeCompleted'},
  rejected: {tagBg: '#fde8e8', tagText: COLORS.danger, labelKey: 'bankHomeRejected'},
};

const ROLE_STATUS_COLORS = {
  approved: COLORS.success,
  pending: '#2196f3',
  rejected: COLORS.danger,
  notStarted: COLORS.textMuted,
};

const FILTER_OPTIONS = [
  {value: 'all', labelKey: 'bankHomeFilterAll'},
  {value: 'awaiting', labelKey: CATEGORY_STYLES.awaiting.labelKey},
  {value: 'inProgress', labelKey: CATEGORY_STYLES.inProgress.labelKey},
  {value: 'completed', labelKey: CATEGORY_STYLES.completed.labelKey},
  {value: 'rejected', labelKey: CATEGORY_STYLES.rejected.labelKey},
];

const MOCK_APPLICATIONS = [
  {
    id: '1',
    invoiceNumber: 'INV-2026-00871',
    companyName: 'Al-Amal Textiles Co.',
    date: '2026-07-03',
    amount: '8,000.00',
    currency: 'USD',
    category: 'awaiting',
    creator: {name: 'Ahmed Kareem', status: 'approved'},
    auditor: {name: 'Zainab Fadhil', status: 'pending'},
    executor: {name: null, status: 'notStarted'},
  },
  {
    id: '2',
    invoiceNumber: 'INV-2026-00866',
    companyName: 'Nineveh Steel Group',
    date: '2026-07-02',
    amount: '14,250.00',
    currency: 'USD',
    category: 'awaiting',
    creator: {name: 'Mustafa Adnan', status: 'approved'},
    auditor: {name: null, status: 'notStarted'},
    executor: {name: null, status: 'notStarted'},
  },
  {
    id: '3',
    invoiceNumber: 'INV-2026-00854',
    companyName: 'Souq Al-Rasheed Ltd.',
    date: '2026-06-29',
    amount: '12,000.00',
    currency: 'USD',
    category: 'completed',
    creator: {name: 'Mustafa Adnan', status: 'approved'},
    auditor: {name: 'Huda Salim', status: 'approved'},
    executor: {name: 'Karrar Yousif', status: 'approved'},
  },
  {
    id: '4',
    invoiceNumber: 'INV-2026-00849',
    companyName: 'Basra Marble & Stone',
    date: '2026-06-27',
    amount: '5,400.00',
    currency: 'USD',
    category: 'inProgress',
    creator: {name: 'Ahmed Kareem', status: 'approved'},
    auditor: {name: 'Zainab Fadhil', status: 'pending'},
    executor: {name: null, status: 'notStarted'},
  },
  {
    id: '5',
    invoiceNumber: 'INV-2026-00832',
    companyName: 'Zhejiang Tailong Trading',
    date: '2026-06-25',
    amount: '9,900.00',
    currency: 'USD',
    category: 'rejected',
    creator: {name: 'Ahmed Kareem', status: 'rejected'},
    auditor: {name: null, status: 'notStarted'},
    executor: {name: null, status: 'notStarted'},
  },
  {
    id: '6',
    invoiceNumber: 'INV-2026-00821',
    companyName: 'Shandong Heavy Industries',
    date: '2026-06-24',
    amount: '21,000.00',
    currency: 'USD',
    category: 'completed',
    creator: {name: 'Mustafa Adnan', status: 'approved'},
    auditor: {name: 'Huda Salim', status: 'approved'},
    executor: {name: 'Karrar Yousif', status: 'approved'},
  },
  {
    id: '7',
    invoiceNumber: 'INV-2026-00879',
    companyName: 'Basra Marble & Stone',
    date: '2026-07-04',
    amount: '3,150.00',
    currency: 'USD',
    category: 'awaiting',
    creator: {name: null, status: 'notStarted'},
    auditor: {name: null, status: 'notStarted'},
    executor: {name: null, status: 'notStarted'},
  },
];

// One bouncing/pulsing "live" dot beside the hero label — a small ambient
// cue that this number is actively monitored, not a static snapshot.
const LiveDot = () => {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {toValue: 1, duration: 900, easing: Easing.out(Easing.ease), useNativeDriver: true}),
        Animated.timing(pulse, {toValue: 0, duration: 0, useNativeDriver: true}),
        Animated.delay(500),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <View style={styles.liveDotWrap}>
      <Animated.View
        style={[
          styles.liveDotRing,
          {
            opacity: pulse.interpolate({inputRange: [0, 1], outputRange: [0.55, 0]}),
            transform: [{scale: pulse.interpolate({inputRange: [0, 1], outputRange: [1, 2.2]})}],
          },
        ]}
      />
      <View style={styles.liveDotCore} />
    </View>
  );
};

const HeroChip = ({Icon, color, label, value, isRTL}) => {
  // Plain Text (not CustomText) throughout the hero card, so it needs its
  // own Arabic font resolution here too — see the `af()` comment above.
  const valueFont = isRTL ? {fontFamily: tajawalFamilyForWeight('800')} : null;
  const labelFont = isRTL ? {fontFamily: tajawalFamilyForWeight('600')} : null;

  return (
    <View style={[styles.heroChip, isRTL && styles.heroChipRTL]}>
      <View style={[styles.heroChipIconWrap, {backgroundColor: `${color}26`}]}>
        <Icon size={14} color={color} />
      </View>
      <View style={isRTL ? styles.heroChipTextRTL : null}>
        <Text style={[styles.heroChipValue, {textAlign: isRTL ? 'right' : 'left'}, valueFont]}>{value}</Text>
        <Text style={[styles.heroChipLabel, {textAlign: isRTL ? 'right' : 'left'}, labelFont]}>{label}</Text>
      </View>
    </View>
  );
};

const RoleStatusBadge = ({status, isRTL}) => {
  const {t} = useTranslation();
  const color = ROLE_STATUS_COLORS[status] || COLORS.textMuted;
  return (
    <View style={[styles.roleBadge, isRTL && styles.roleBadgeRTL]}>
      <View style={[styles.roleBadgeDot, {backgroundColor: color}]} />
      <CustomText style={[styles.roleBadgeText, {color}]} paddingTop={0}>
        {t(`bankHomeRoleStatus_${status}`)}
      </CustomText>
    </View>
  );
};

const RoleRow = ({label, person, isRTL}) => (
  <View style={[styles.roleRow, isRTL && styles.roleRowRTL]}>
    <CustomText style={styles.roleLabel} paddingTop={0}>
      {label}
    </CustomText>
    <View style={[styles.roleValue, isRTL && styles.roleValueRTL]}>
      <CustomText style={styles.roleName} paddingTop={0}>
        {person.name || '—'}
      </CustomText>
      <RoleStatusBadge status={person.status} isRTL={isRTL} />
    </View>
  </View>
);

const ApplicationCard = ({app, isRTL, isExpanded, onToggle, index}) => {
  const {t} = useTranslation();
  const cat = CATEGORY_STYLES[app.category];

  const entrance = useRef(new Animated.Value(0)).current;
  const pressScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(entrance, {
      toValue: 1,
      duration: 380,
      delay: Math.min(index, 8) * 55,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [entrance, index]);

  const handlePressIn = () => {
    Animated.spring(pressScale, {toValue: 0.97, useNativeDriver: true, speed: 40, bounciness: 0}).start();
  };
  const handlePressOut = () => {
    Animated.spring(pressScale, {toValue: 1, useNativeDriver: true, speed: 30, bounciness: 6}).start();
  };

  return (
    <Animated.View
      style={{
        opacity: entrance,
        transform: [
          {translateY: entrance.interpolate({inputRange: [0, 1], outputRange: [14, 0]})},
          {scale: pressScale},
        ],
      }}>
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.9}
        onPress={onToggle}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}>
        <View style={[styles.cardTop, isRTL && styles.cardTopRTL]}>
          <View style={isRTL ? styles.cardLeftRTL : styles.cardLeft}>
            <CustomText style={styles.invoiceNumber} paddingTop={0}>
              {app.invoiceNumber}
            </CustomText>
            <CustomText style={styles.companyName} paddingTop={0}>
              {app.companyName}
            </CustomText>
            <CustomText style={styles.dateText} paddingTop={0}>
              {app.date}
            </CustomText>
          </View>

          <View style={isRTL ? styles.cardRightRTL : styles.cardRight}>
            <CustomText bold style={styles.amountText} paddingTop={0}>
              {app.amount} {app.currency}
            </CustomText>
            <View style={[styles.overallBadge, isRTL && styles.overallBadgeRTL, {backgroundColor: cat.tagBg}]}>
              <View style={[styles.overallBadgeDot, {backgroundColor: cat.tagText}]} />
              <CustomText style={[styles.overallBadgeText, {color: cat.tagText}]} paddingTop={0}>
                {t(cat.labelKey)}
              </CustomText>
            </View>
            <CustomText style={styles.chevron} paddingTop={0} lineHeight={20}>
              {isExpanded ? '⌄' : isRTL ? '‹' : '›'}
            </CustomText>
          </View>
        </View>

        {isExpanded ? (
          <View style={styles.roleBreakdown}>
            <RoleRow label={t('creator')} person={app.creator} isRTL={isRTL} />
            <RoleRow label={t('bankAuditorLabel')} person={app.auditor} isRTL={isRTL} />
            <RoleRow label={t('bankHomeExecutorLabel')} person={app.executor} isRTL={isRTL} />
          </View>
        ) : null}
      </TouchableOpacity>
    </Animated.View>
  );
};

const BankHomeScreen = () => {
  const {t} = useTranslation();
  const {session} = useAuth();
  const {currentDirection} = useContext(LanguageContext);
  const isRTL = currentDirection === 'rtl';

  // Mirrors HomeScreen.js's own greeting logic: an "orgUser" login is an
  // individual working under the organization (greet them by name), while a
  // bare "organization" login has no individual behind it (greet the org).
  const greetingName =
    session?.userType === 'orgUser'
      ? session?.organization?.username || session?.organization?.name
      : session?.organization?.name;

  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [filterMode, setFilterMode] = useState(false);
  const [expandedId, setExpandedId] = useState(null);

  // Collapse is a discrete two-state transition (collapseAnim: 0 expanded,
  // 1 collapsed) driven by crossing a scroll threshold, NOT a continuous
  // per-pixel readout of scrollY. Two reasons:
  // 1) Perf on Android: the old version re-ran this whole interpolation
  //    chain on the JS thread every onScroll frame (these are all
  //    height/width/fontSize outputs, none of which useNativeDriver
  //    supports), which is cheap enough to hide on iOS but visibly janky on
  //    Android. A threshold crossing instead runs one bounded 220ms JS
  //    timing animation only when state actually changes.
  // 2) Short/filtered lists: binding collapse % directly to scrollY assumed
  //    there was always ~100pt of real scroll room. A list with too few
  //    rows to scroll that far (e.g. a tightly filtered result set) could
  //    only ever reach a partial collapse and would hang there, half
  //    collapsed, with no way to reach either clean end state. Threshold
  //    crossing instead only ever animates fully open or fully closed.
  const COLLAPSE_SCROLL_THRESHOLD = 40;
  const EXPAND_SCROLL_THRESHOLD = 10;
  const collapseAnim = useRef(new Animated.Value(0)).current;
  const isCollapsedRef = useRef(false);
  const handleScroll = e => {
    const {contentOffset, contentSize, layoutMeasurement} = e.nativeEvent;
    // A list too short to really scroll past the threshold is still
    // rubber-band-bounceable on iOS — touching it can transiently push
    // contentOffset.y above COLLAPSE_SCROLL_THRESHOLD and immediately
    // spring back below EXPAND_SCROLL_THRESHOLD as it settles, which
    // collapses and re-expands the header within the same gesture (looks
    // like a flash/glitch). If there isn't enough real content to reach
    // the threshold through genuine scrolling, don't collapse at all.
    const maxScroll = contentSize.height - layoutMeasurement.height;
    if (maxScroll < COLLAPSE_SCROLL_THRESHOLD) {
      return;
    }
    const y = contentOffset.y;
    if (!isCollapsedRef.current && y > COLLAPSE_SCROLL_THRESHOLD) {
      isCollapsedRef.current = true;
      Animated.timing(collapseAnim, {toValue: 1, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: false}).start();
    } else if (isCollapsedRef.current && y < EXPAND_SCROLL_THRESHOLD) {
      isCollapsedRef.current = false;
      Animated.timing(collapseAnim, {toValue: 0, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: false}).start();
    }
  };

  const cardHeight = collapseAnim.interpolate({inputRange: [0, 1], outputRange: [CARD_HEIGHT, CARD_COLLAPSED_HEIGHT]});
  const statsOpacity = collapseAnim.interpolate({inputRange: [0, 1], outputRange: [1, 0]});
  // Header (logo/greeting/avatar) collapses away entirely on scroll too,
  // freeing up roughly one extra card's worth of vertical space — same
  // collapse transition as the hero card so both finish together.
  const headerHeight = collapseAnim.interpolate({inputRange: [0, 1], outputRange: [HEADER_HEIGHT, 0]});
  const headerOpacity = collapseAnim.interpolate({inputRange: [0, 1], outputRange: [1, 0]});
  // Matches HomeScreen.js's own amountFontSize — shrinking the number itself
  // (not just the card around it) is what makes the collapse actually read
  // as a collapse, and frees up the vertical room to let the card shrink to
  // just label+number+ring instead of merely clipping unshrunk content.
  const amountFontSize = collapseAnim.interpolate({inputRange: [0, 1], outputRange: [40, 18]});
  // The ring stays visible while collapsing (unlike the stats chips, which
  // fade) — it just shrinks to fit the shorter card. The Svg itself fills
  // this wrapper (width/height "100%") with a fixed viewBox, so SVG handles
  // the internal rescaling natively as the wrapper's own size animates —
  // no separate transform layer needed, which also means nothing can knock
  // the centered percent-text overlay out of alignment.
  const ringWrapSize = collapseAnim.interpolate({inputRange: [0, 1], outputRange: [RING_SIZE, RING_SIZE_COLLAPSED]});
  // The percent label has to shrink in step with the ring itself, or it
  // no longer fits inside the smaller circle and pokes out past its edge.
  const ringTextFontSize = collapseAnim.interpolate({inputRange: [0, 1], outputRange: [15, 9]});
  // Opacity-only fading (like the stats chips get) still reserves the
  // trend text's full layout height even at opacity 0 — which was pushing
  // heroTextCol taller than what's actually visible, throwing off the
  // ring's vertical centering against it. Collapsing its height/margin to
  // 0 alongside the fade keeps the column's *real* height matching what's
  // on screen (just label + number) once collapsed.
  const heroTrendHeight = collapseAnim.interpolate({inputRange: [0, 1], outputRange: [16, 0]});
  const heroTrendMarginTop = collapseAnim.interpolate({inputRange: [0, 1], outputRange: [4, 0]});

  // Plain Text, not CustomText: CustomText forces a lineHeight default of 20
  // regardless of what the style says, which clips a large digit — using
  // plain Text sidesteps that entirely and needs its own Arabic font
  // resolution instead, same approach as HomeScreen.js's own af(). The
  // hero number's *font size* is never shrunk on scroll (only the card's
  // height animates) since a shrinking hero number reads as "disappearing"
  // when the card collapses, defeating the point of a collapsed summary.
  const af = (...stylesToCheck) => {
    if (!isRTL) {
      return null;
    }
    const weight = StyleSheet.flatten(stylesToCheck)?.fontWeight;
    return {fontFamily: tajawalFamilyForWeight(weight)};
  };

  const awaitingCount = MOCK_APPLICATIONS.filter(a => a.category === 'awaiting').length;
  const completedTodayCount = MOCK_APPLICATIONS.filter(a => a.category === 'completed').length;
  const rejectedTodayCount = MOCK_APPLICATIONS.filter(a => a.category === 'rejected').length;
  const totalCount = MOCK_APPLICATIONS.length;
  const notStartedCount = MOCK_APPLICATIONS.filter(a => a.creator.status === 'notStarted').length;
  const completionPercent = totalCount > 0 ? Math.round((completedTodayCount / totalCount) * 100) : 0;

  // Animated count-up for the hero number and the progress ring's sweep —
  // both driven once on mount so the card feels alive rather than a static
  // snapshot the instant it appears.
  const countAnim = useRef(new Animated.Value(0)).current;
  const ringAnim = useRef(new Animated.Value(0)).current;
  const [displayCount, setDisplayCount] = useState(0);

  useEffect(() => {
    const listenerId = countAnim.addListener(({value}) => setDisplayCount(Math.round(value)));
    Animated.timing(countAnim, {
      toValue: awaitingCount,
      duration: 900,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
    Animated.timing(ringAnim, {
      toValue: completionPercent,
      duration: 900,
      delay: 150,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
    return () => countAnim.removeListener(listenerId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ringStrokeDashoffset = ringAnim.interpolate({
    inputRange: [0, 100],
    outputRange: [RING_CIRCUMFERENCE, 0],
    extrapolate: 'clamp',
  });

  const filtered = MOCK_APPLICATIONS.filter(app => {
    if (activeFilter !== 'all' && app.category !== activeFilter) {
      return false;
    }
    if (search && !app.invoiceNumber.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    return true;
  });

  const toggleExpand = id => {
    LayoutAnimation.configureNext(LayoutAnimation.create(240, 'easeInEaseOut', 'opacity'));
    setExpandedId(prev => (prev === id ? null : id));
  };

  // Fade + slide the search/dropdown slot in whenever filterMode flips,
  // instead of an abrupt swap.
  const slotAnim = useRef(new Animated.Value(0)).current;
  // Drives the filter button's background/border color crossfade *and* its
  // icon rotation. Must stay native-driven (RN 0.62+ supports native color
  // animation) since this button's transform (filterPressScale, below) is
  // also native — mixing drivers within one Animated.View's style object
  // attaches the whole node to native on the first native `.start()`, so a
  // later JS-driven `.start()` on a sibling value in that same style throws
  // "Attempting to run JS driven animation on animated node that has been
  // moved to native earlier".
  const filterActiveAnim = useRef(new Animated.Value(0)).current;
  const filterPressScale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    slotAnim.setValue(0);
    Animated.timing(slotAnim, {toValue: 1, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true}).start();
    Animated.timing(filterActiveAnim, {
      toValue: filterMode ? 1 : 0,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterMode]);

  const handleFilterPressIn = () => {
    Animated.spring(filterPressScale, {toValue: 0.9, useNativeDriver: true, speed: 40, bounciness: 0}).start();
  };
  const handleFilterPressOut = () => {
    Animated.spring(filterPressScale, {toValue: 1, useNativeDriver: true, speed: 30, bounciness: 6}).start();
  };
  const filterBtnBg = filterActiveAnim.interpolate({inputRange: [0, 1], outputRange: [COLORS.surface, COLORS.primary]});
  const filterBtnBorder = filterActiveAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [COLORS.border, COLORS.primary],
  });
  const filterIconRotateDeg = filterActiveAnim.interpolate({inputRange: [0, 1], outputRange: ['0deg', '90deg']});

  const renderHeroSection = () => (
    <>
      <Animated.View style={[styles.heroCard, {height: cardHeight, overflow: 'hidden'}]}>
        <View style={[styles.heroTopRow, isRTL && styles.heroTopRowRTL]}>
          <View style={styles.heroTextCol}>
            <View style={[styles.heroLabelRow, isRTL && styles.heroLabelRowRTL]}>
              <LiveDot />
              <Text style={[styles.heroLabel, af(styles.heroLabel)]}>{t('bankHomeAwaitingActionLabel')}</Text>
            </View>
            <Animated.Text
              style={[
                styles.heroNumber,
                {fontSize: amountFontSize, textAlign: isRTL ? 'right' : 'left'},
                af(styles.heroNumber),
              ]}>
              {displayCount}
            </Animated.Text>
            <Animated.View style={{height: heroTrendHeight, marginTop: heroTrendMarginTop, overflow: 'hidden'}}>
              <Animated.Text
                style={[
                  styles.heroTrendText,
                  {opacity: statsOpacity, textAlign: isRTL ? 'right' : 'left'},
                  af(styles.heroTrendText),
                ]}>
                {t('bankHomeCompletionRateLabel', {percent: completionPercent})}
              </Animated.Text>
            </Animated.View>
          </View>

          <Animated.View style={[styles.heroRingWrap, {width: ringWrapSize, height: ringWrapSize}]}>
            <Svg width="100%" height="100%" viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}>
              <Circle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={RING_RADIUS}
                stroke="rgba(255,255,255,0.18)"
                strokeWidth={RING_STROKE}
                fill="none"
              />
              <AnimatedCircle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={RING_RADIUS}
                stroke={COLORS.accent}
                strokeWidth={RING_STROKE}
                fill="none"
                strokeLinecap="round"
                strokeDasharray={RING_CIRCUMFERENCE}
                strokeDashoffset={ringStrokeDashoffset}
                transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
              />
            </Svg>
            <View style={styles.heroRingCenter} pointerEvents="none">
              <Animated.Text style={[styles.heroRingText, {fontSize: ringTextFontSize}]}>
                {completionPercent}%
              </Animated.Text>
            </View>
          </Animated.View>
        </View>

        <Animated.View style={[styles.heroStatsGrid, {opacity: statsOpacity}]}>
          <View style={[styles.heroChipsRow, isRTL && styles.heroChipsRowRTL]}>
            <HeroChip
              Icon={CheckCircle2}
              color="#4ade80"
              label={t('bankHomeCompletedToday')}
              value={completedTodayCount}
              isRTL={isRTL}
            />
            <HeroChip
              Icon={XCircle}
              color="#f87171"
              label={t('bankHomeRejectedToday')}
              value={rejectedTodayCount}
              isRTL={isRTL}
            />
          </View>
          <View style={[styles.heroChipsRow, isRTL && styles.heroChipsRowRTL]}>
            <HeroChip
              Icon={Layers}
              color="#c4b5fd"
              label={t('bankHomeTotalApplications')}
              value={totalCount}
              isRTL={isRTL}
            />
            <HeroChip
              Icon={CircleDashed}
              color="#93c5fd"
              label={t('bankHomeNotStarted')}
              value={notStartedCount}
              isRTL={isRTL}
            />
          </View>
        </Animated.View>
      </Animated.View>

      <View style={[styles.searchFilterRow, isRTL && styles.searchFilterRowRTL]}>
        <Animated.View
          style={[
            styles.slotAnimWrap,
            {
              opacity: slotAnim,
              transform: [{translateY: slotAnim.interpolate({inputRange: [0, 1], outputRange: [6, 0]})}],
            },
          ]}>
          {filterMode ? (
            <View style={styles.dropdownSlot}>
              <SelectField
                value={FILTER_OPTIONS.find(f => f.value === activeFilter)}
                options={FILTER_OPTIONS}
                onSelect={opt => setActiveFilter(opt.value)}
                getLabel={opt => t(opt.labelKey)}
                getKey={opt => opt.value}
              />
            </View>
          ) : (
            <SearchInput
              placeholder={t('bankSearchInputPlaceholder')}
              value={search}
              onChangeText={setSearch}
            />
          )}
        </Animated.View>
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setFilterMode(prev => !prev)}
          onPressIn={handleFilterPressIn}
          onPressOut={handleFilterPressOut}>
          <Animated.View
            style={[
              styles.filterIconBtn,
              {
                backgroundColor: filterBtnBg,
                borderColor: filterBtnBorder,
                transform: [{scale: filterPressScale}],
              },
            ]}>
            <Animated.View style={{transform: [{rotate: filterIconRotateDeg}]}}>
              <SlidersHorizontal size={18} color={filterMode ? '#fff' : COLORS.textMuted} />
            </Animated.View>
          </Animated.View>
        </TouchableOpacity>
      </View>

      <CustomText style={styles.sectionTitle} paddingTop={0}>
        {t('bankHomeRecentApplications')}
      </CustomText>
    </>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primaryDark} />

      <Animated.View style={{height: headerHeight, opacity: headerOpacity, overflow: 'hidden'}}>
        <View style={[styles.header, {flexDirection: isRTL ? 'row-reverse' : 'row'}]}>
          <View style={[styles.headerLeft, {flexDirection: isRTL ? 'row-reverse' : 'row'}]}>
            <Image source={require('../../assets/logo.png')} style={styles.headerLogo} resizeMode="contain" />
            <View style={isRTL ? styles.headerTextRTL : null}>
              <Text style={[styles.headerSub, af(styles.headerSub)]}>{t('bankHomeWelcomeBack')}</Text>
              <Text style={[styles.headerTitle, af(styles.headerTitle)]} numberOfLines={1}>
                {greetingName}
              </Text>
            </View>
          </View>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{(greetingName || '?').slice(0, 2).toUpperCase()}</Text>
          </View>
        </View>
      </Animated.View>

      {renderHeroSection()}

      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={{height: 10}} />}
        ListEmptyComponent={
          <CustomText center style={styles.emptyText}>
            {t('bankNoApplicationsFound')}
          </CustomText>
        }
        onScroll={handleScroll}
        scrollEventThrottle={16}
        renderItem={({item, index}) => (
          <ApplicationCard
            app={item}
            index={index}
            isRTL={isRTL}
            isExpanded={expandedId === item.id}
            onToggle={() => toggleExpand(item.id)}
          />
        )}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {flex: 1, backgroundColor: COLORS.bg},

  header: {
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  headerLeft: {alignItems: 'center', gap: 10, flex: 1},
  headerLogo: {width: 34, height: 34},
  headerTextRTL: {alignItems: 'flex-end'},
  headerSub: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  headerTitle: {fontSize: 18, fontWeight: '800', color: COLORS.text, maxWidth: 220},
  avatarCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.primaryLight,
    borderWidth: 2,
    borderColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {color: '#fff', fontWeight: '700', fontSize: 13},

  listContent: {paddingHorizontal: 16, paddingBottom: 30},

  heroCard: {
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 20,
    backgroundColor: COLORS.primaryDark,
    padding: 18,
    ...PRIMARY_SHADOW,
  },
  heroTopRow: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},
  heroTopRowRTL: {flexDirection: 'row-reverse'},
  heroTextCol: {flex: 1},
  heroLabelRow: {flexDirection: 'row', alignItems: 'center', gap: 8},
  heroLabelRowRTL: {flexDirection: 'row-reverse'},
  liveDotWrap: {width: 8, height: 8, alignItems: 'center', justifyContent: 'center'},
  liveDotRing: {position: 'absolute', width: 8, height: 8, borderRadius: 4, backgroundColor: '#4ade80'},
  liveDotCore: {width: 6, height: 6, borderRadius: 3, backgroundColor: '#4ade80'},
  heroLabel: {
    color: COLORS.accent,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  heroNumber: {color: '#fff', fontSize: 40, fontWeight: '800', letterSpacing: -1.2, marginTop: 6},
  heroTrendText: {color: 'rgba(255,255,255,0.65)', fontSize: 12, fontWeight: '600'},
  heroRingWrap: {width: RING_SIZE, height: RING_SIZE, alignItems: 'center', justifyContent: 'center'},
  heroRingCenter: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroRingText: {color: '#fff', fontSize: 15, fontWeight: '800'},

  heroStatsGrid: {marginTop: 18, gap: 10},
  heroChipsRow: {flexDirection: 'row', gap: 10},
  heroChipsRowRTL: {flexDirection: 'row-reverse'},
  heroChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  heroChipRTL: {flexDirection: 'row-reverse'},
  heroChipIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroChipTextRTL: {alignItems: 'flex-end'},
  heroChipValue: {color: '#fff', fontSize: 14, fontWeight: '800'},
  heroChipLabel: {color: 'rgba(255,255,255,0.6)', fontSize: 10, fontWeight: '600'},

  searchFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 18,
    marginBottom: 20,
  },
  searchFilterRowRTL: {flexDirection: 'row-reverse'},
  slotAnimWrap: {flex: 1},
  dropdownSlot: {flex: 1, marginBottom: -14},
  filterIconBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  sectionTitle: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginHorizontal: 16,
    marginBottom: 10,
  },

  emptyText: {marginTop: 30, fontSize: 13, color: COLORS.textMuted},

  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardTop: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},
  cardTopRTL: {flexDirection: 'row-reverse'},
  cardLeft: {flex: 1, paddingRight: 12},
  cardLeftRTL: {flex: 1, paddingLeft: 12, alignItems: 'flex-end'},
  cardRight: {alignItems: 'flex-end', gap: 4},
  cardRightRTL: {alignItems: 'flex-start', gap: 4},
  invoiceNumber: {fontSize: 14, fontWeight: '700', color: COLORS.text, letterSpacing: 0.2},
  companyName: {fontSize: 12, color: COLORS.textMuted, marginTop: 3},
  dateText: {fontSize: 11, color: COLORS.textMuted, marginTop: 4},
  amountText: {fontSize: 15, color: COLORS.text, letterSpacing: -0.3},
  overallBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  overallBadgeRTL: {flexDirection: 'row-reverse'},
  overallBadgeDot: {width: 6, height: 6, borderRadius: 3},
  overallBadgeText: {fontSize: 12, fontWeight: '700'},
  // CustomText's own `lineHeight` prop (passed at each call site, not this
  // style) always wins over whatever's set here — see the lineHeight={26}
  // on the call site for why this can't just live in the StyleSheet.
  chevron: {fontSize: 20, color: COLORS.primaryLight, lineHeight: 20},

  roleBreakdown: {marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: COLORS.border, gap: 10},
  roleRow: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},
  roleRowRTL: {flexDirection: 'row-reverse'},
  roleLabel: {fontSize: 12, color: COLORS.textMuted, fontWeight: '600'},
  roleValue: {alignItems: 'flex-end', gap: 3},
  roleValueRTL: {alignItems: 'flex-start'},
  roleName: {fontSize: 12.5, color: COLORS.text, fontWeight: '600'},
  roleBadge: {flexDirection: 'row', alignItems: 'center', gap: 4},
  roleBadgeRTL: {flexDirection: 'row-reverse'},
  roleBadgeDot: {width: 6, height: 6, borderRadius: 3},
  roleBadgeText: {fontSize: 11, fontWeight: '700'},
});

export default BankHomeScreen;
