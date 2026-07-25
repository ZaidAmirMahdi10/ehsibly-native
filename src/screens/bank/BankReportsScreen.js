import React, {createContext, useContext, useEffect, useState, useCallback, useRef, useMemo} from 'react';
import {View, Text, Image, StyleSheet, ScrollView, TouchableOpacity, useWindowDimensions, Animated, Easing} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useTranslation} from 'react-i18next';
import Svg, {Polyline, Defs, LinearGradient as SvgLinearGradient, Rect, Stop} from 'react-native-svg';
import {ChevronLeft, ChevronRight, ChevronDown} from 'lucide-react-native';

import {LanguageContext} from '../../../App';
import CustomText from '../../components/CustomText';
import SelectField from '../../components/SelectField';
import ErrorState from '../../components/ErrorState';
import LoadingState from '../../components/LoadingState';
import {COLORS, CARD_SHADOW, makeShadow} from '../../constants/theme';
import {getBankReportsAnalytics} from '../../services/bank/bankReports';
// Placeholder AML/risk + origins data — there are no backend endpoints for
// either yet (see each file's own _comment). Kept next to this screen on
// purpose so they're easy to find and swap for real API calls.
import riskMockData from './riskMockData.json';
import originsMockData from './originsMockData.json';

// Native counterpart to ehsibly-frontend/src/pages/banks/BankReports.js.
// That page uses Chart.js; there's no equivalent charting library pulled
// into this app, so the bar/line charts here are small hand-rolled
// components (Views for bars, an SVG Polyline per series for lines) rather
// than a port of Chart.js's gradient/hatch-pattern styling. Only
// yearly/monthly/daily periods are wired up — the web version's
// weekly/range pickers need native date-range UI this app doesn't have
// yet, so they're left out rather than half-built.
const PERIOD = {YEARLY: 'yearly', MONTHLY: 'monthly', DAILY: 'daily'};

// Segmented sub-nav per the design_handoff_reports_tab package: Overview is
// the whole pre-existing reports content; Origins and Risk are deliberately
// minimal stubs awaiting their own designs (per the handoff's instruction
// not to invent layouts for them).
const REPORT_SECTIONS = [
  {key: 'overview', labelKey: 'bankReportsSectionOverview'},
  {key: 'origins', labelKey: 'bankReportsSectionOrigins'},
  {key: 'risk', labelKey: 'bankReportsSectionRisk'},
];

const CATEGORY_COLORS = {
  total: COLORS.primary,
  accepted: COLORS.success,
  executed: '#f9c058',
  bawales: '#03a9f4',
  pending: COLORS.pending,
  // Dark purple per the design_handoff_reports Overview spec (was muted
  // gray) — applies to both the stat card's top border and its bar.
  notStarted: COLORS.primaryDark,
  rejected: COLORS.danger,
};

// Risk score severity colors from the handoff: amber <60, coral 60–79,
// magenta ≥80.
const riskScoreColor = score => (score >= 80 ? '#B5347A' : score >= 60 ? '#E76F51' : '#E8B331');

const CURRENCY_COLORS = {USD: COLORS.success, EUR: '#3498db', AED: '#e67e22'};

const MONTH_NAMES_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// Drives both the "cards fade in when the tab first opens" and "a card
// fades in as you scroll down to it" behavior with one mechanism: each
// RevealCard registers its own measured position (via onLayout — accurate
// only because RevealCard instances are direct children of the ScrollView's
// content, not nested inside another layout container) with this
// controller. A card already within the viewport at mount time reveals
// immediately with a staggered delay; one still below the fold stays
// hidden until scrolling brings it within revealMargin of the viewport
// bottom, at which point the controller fires its entrance once and
// forgets it. Plain (non-Animated) onScroll is intentional — the
// visual animation itself runs on the native driver, this handler is just
// cheap bookkeeping to decide *when* to kick it off (see BankHomeScreen.js's
// own handleScroll for the same non-Animated-onScroll-for-JS-logic pattern).
const REVEAL_MARGIN = 60;

const useRevealController = () => {
  const scrollYRef = useRef(0);
  const viewportHeightRef = useRef(0);
  const pendingRef = useRef([]);
  const staggerCountRef = useRef(0);

  const handleScroll = useCallback(e => {
    scrollYRef.current = e.nativeEvent.contentOffset.y;
    viewportHeightRef.current = e.nativeEvent.layoutMeasurement.height;
    if (!pendingRef.current.length) {
      return;
    }
    const viewportBottom = scrollYRef.current + viewportHeightRef.current;
    pendingRef.current = pendingRef.current.filter(item => {
      if (item.y < viewportBottom + REVEAL_MARGIN) {
        item.reveal(0);
        return false;
      }
      return true;
    });
  }, []);

  const registerCard = useCallback((y, reveal) => {
    const viewportBottom = scrollYRef.current + viewportHeightRef.current;
    if (viewportHeightRef.current === 0 || y < viewportBottom + REVEAL_MARGIN) {
      const delay = Math.min(staggerCountRef.current, 8) * 70;
      staggerCountRef.current += 1;
      reveal(delay);
    } else {
      pendingRef.current.push({y, reveal});
    }
  }, []);

  return {handleScroll, registerCard};
};

const RevealCard = ({controller, style, children}) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;
  const registeredRef = useRef(false);

  const reveal = useCallback(
    delay => {
      Animated.timing(opacity, {toValue: 1, duration: 420, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true}).start();
      Animated.timing(translateY, {toValue: 0, duration: 420, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true}).start();
    },
    [opacity, translateY],
  );

  const onLayout = e => {
    if (registeredRef.current) {
      return;
    }
    registeredRef.current = true;
    controller.registerCard(e.nativeEvent.layout.y, reveal);
  };

  return (
    <Animated.View onLayout={onLayout} style={[style, {opacity, transform: [{translateY}]}]}>
      {children}
    </Animated.View>
  );
};

// The colored accent is an absolutely-positioned strip clipped by the
// card's own borderRadius (overflow: hidden) rather than a borderTopWidth:
// iOS renders an uneven border (3,0,0,0) by sweeping the top color around
// the full corner arc, which reads as a thick "pill" instead of the
// reference's thin line hugging the rounded corners.
const StatCard = ({label, value, color, wide}) => (
  <View style={[styles.statCard, wide && styles.statCardWide]}>
    <View style={[styles.statCardAccent, {backgroundColor: color}]} />
    {/* CustomText's default lineHeight (20) clips a bold 20px digit in the
        English font's metrics — same issue BankHomeScreen.js's hero number
        works around, just via an explicit lineHeight here instead of
        switching to plain Text, since this value doesn't need af()'s
        Arabic-weight font resolution. The tight label lineHeight keeps the
        card as compact as the reference screenshot. */}
    <CustomText style={styles.statValue} paddingTop={0} lineHeight={25}>
      {value}
    </CustomText>
    <CustomText style={styles.statLabel} paddingTop={2} lineHeight={15}>
      {label}
    </CustomText>
  </View>
);

// One "Top sender cities" row: tap to expand the city's sending companies
// inline. Pure Animated maxHeight/opacity — never LayoutAnimation on this
// screen (react-native-svg subtree = native Fabric SIGABRT, see ChartCard).
const OriginCityRow = ({city, isRTL, expanded, onToggle}) => {
  const {t} = useTranslation();
  const expandAnim = useRef(new Animated.Value(expanded ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(expandAnim, {
      toValue: expanded ? 1 : 0,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [expandAnim, expanded]);

  const trendUp = city.trend >= 0;
  const Chevron = expanded ? ChevronDown : isRTL ? ChevronLeft : ChevronRight;

  return (
    <TouchableOpacity style={styles.originCityRow} activeOpacity={0.8} onPress={onToggle}>
      <View style={[styles.originCityTop, isRTL && styles.rowRTL]}>
        <View style={[styles.originCityDot, {backgroundColor: city.color}]} />
        <View style={styles.originCityInfo}>
          <CustomText style={styles.originCityName} paddingTop={0} align={isRTL ? 'right' : 'left'}>
            {isRTL ? city.cityAr : city.cityEn}
          </CustomText>
          <CustomText style={styles.originCityCount} paddingTop={0} align={isRTL ? 'right' : 'left'}>
            {t('bankOriginsTransfersCount', {count: city.count})}
          </CustomText>
        </View>
        <View style={isRTL ? styles.originCityAmountRTL : styles.originCityAmount}>
          <CustomText style={styles.originCityAmountText} paddingTop={0}>
            {`$${city.amount.toLocaleString()}`}
          </CustomText>
          <CustomText
            style={[styles.originCityTrend, {color: trendUp ? COLORS.success : COLORS.danger}]}
            paddingTop={0}>
            {t(trendUp ? 'bankOriginsTrendUp' : 'bankOriginsTrendDown', {percent: Math.abs(city.trend)})}
          </CustomText>
        </View>
        <Chevron size={14} color="#a89bb0" />
      </View>
      <Animated.View
        style={{
          maxHeight: expandAnim.interpolate({inputRange: [0, 1], outputRange: [0, 200]}),
          opacity: expandAnim,
          overflow: 'hidden',
        }}>
        <View style={styles.originCompanyList}>
          {city.companies.map(co => (
            <View key={co.nameEn} style={[styles.originCompanyRow, isRTL && styles.rowRTL]}>
              <CustomText
                style={styles.originCompanyName}
                paddingTop={0}
                numberOfLines={1}
                align={isRTL ? 'right' : 'left'}>
                {isRTL ? co.nameAr : co.nameEn}
              </CustomText>
              <CustomText style={styles.originCompanyMeta} paddingTop={0}>
                {`$${co.amount.toLocaleString()} · ${co.count}`}
              </CustomText>
            </View>
          ))}
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
};

// One flagged transaction card: score ring toggles the inline factor
// breakdown; Clear and Escalate both just dismiss the card locally for now
// (mock/prototype behavior — resets on reload).
// TODO: route Escalate to the bank's real escalation/ticketing flow once
// one exists; there is no backend for it yet (see the handoff README).
const RiskFlaggedCard = ({tx, isRTL, expanded, onToggleBreakdown, onDismiss}) => {
  const {t} = useTranslation();
  const breakdownAnim = useRef(new Animated.Value(expanded ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(breakdownAnim, {
      toValue: expanded ? 1 : 0,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [breakdownAnim, expanded]);

  const scoreColor = riskScoreColor(tx.riskScore);

  return (
    <View style={[styles.riskTxCard, tx.riskScore >= 80 && styles.riskTxCardCritical]}>
      <View style={[styles.riskTxHeader, isRTL && styles.rowRTL]}>
        <View style={styles.riskTxInfo}>
          <CustomText style={styles.riskTxSender} paddingTop={0} align={isRTL ? 'right' : 'left'}>
            {isRTL ? tx.senderAr : tx.senderEn}
          </CustomText>
          <CustomText style={styles.riskTxMeta} paddingTop={0} align={isRTL ? 'right' : 'left'}>
            {`${isRTL ? tx.corridorAr : tx.corridorEn} · $${tx.amount.toLocaleString()}`}
          </CustomText>
        </View>
        <TouchableOpacity
          style={[styles.scoreRing, {borderColor: scoreColor}]}
          activeOpacity={0.7}
          onPress={onToggleBreakdown}>
          <CustomText style={[styles.scoreRingText, {color: scoreColor}]} paddingTop={0} lineHeight={16}>
            {tx.riskScore}
          </CustomText>
        </TouchableOpacity>
      </View>

      <View style={[styles.reasonTagsRow, isRTL && styles.rowRTL]}>
        {(isRTL ? tx.reasonsAr : tx.reasonsEn).map(reason => (
          <View key={reason} style={styles.reasonTag}>
            <CustomText style={styles.reasonTagText} paddingTop={0}>
              {reason}
            </CustomText>
          </View>
        ))}
      </View>

      <Animated.View
        style={{
          maxHeight: breakdownAnim.interpolate({inputRange: [0, 1], outputRange: [0, 220]}),
          opacity: breakdownAnim,
          overflow: 'hidden',
        }}>
        <View style={styles.breakdownBox}>
          <CustomText style={styles.breakdownTitle} paddingTop={0} align={isRTL ? 'right' : 'left'}>
            {t('bankRiskScoreBreakdown')}
          </CustomText>
          {tx.factors.map(factor => (
            <View key={factor.labelEn} style={[styles.breakdownRow, isRTL && styles.rowRTL]}>
              <CustomText style={styles.breakdownLabel} paddingTop={0} align={isRTL ? 'right' : 'left'}>
                {isRTL ? factor.labelAr : factor.labelEn}
              </CustomText>
              <View style={styles.breakdownTrack}>
                <View
                  style={[styles.breakdownFill, {width: `${factor.widthPct}%`, backgroundColor: factor.color}]}
                />
              </View>
              <CustomText style={styles.breakdownPoints} paddingTop={0}>
                {`+${factor.points}`}
              </CustomText>
            </View>
          ))}
        </View>
      </Animated.View>

      <View style={[styles.riskTxActions, isRTL && styles.rowRTL]}>
        <TouchableOpacity style={styles.riskClearBtn} activeOpacity={0.8} onPress={onDismiss}>
          <CustomText style={styles.riskClearText} paddingTop={0} center>
            {t('bankRiskClearAction')}
          </CustomText>
        </TouchableOpacity>
        <TouchableOpacity style={styles.riskEscalateBtn} activeOpacity={0.8} onPress={onDismiss}>
          <CustomText style={styles.riskEscalateText} paddingTop={0} center>
            {t('bankRiskEscalateAction')}
          </CustomText>
        </TouchableOpacity>
      </View>
    </View>
  );
};


// Charts hold at their zero state (flat bars, undrawn lines) until the
// enclosing ChartCard flips this to true — which it does only after its
// expand transition AND the auto-scroll have settled, so the grow/draw-in
// plays while the chart is actually on screen instead of half below the
// fold. Defaults to true so a chart used outside a ChartCard just animates
// on mount like before.
const ChartRevealContext = createContext(true);

// Bars grow from 0 to their target height on every mount — ChartCard
// remounts this whole component (via its contentKey) each time the card is
// expanded, so the grow-in replays every time, not just once ever.
const AnimatedBar = ({d, max, barAreaHeight, index}) => {
  const started = useContext(ChartRevealContext);
  const grow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!started) {
      return undefined;
    }
    const anim = Animated.timing(grow, {
      toValue: 1,
      duration: 500,
      delay: index * 60,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false, // height isn't a native-drivable property
    });
    anim.start();
    // Defensive: stop a still-running timing if this ever unmounts mid-
    // animation (e.g. the whole screen unmounting), rather than leaving a
    // JS-driven animation trying to update a view that's gone.
    return () => anim.stop();
  }, [grow, index, started]);

  const targetHeight = Math.max(4, (d.value / max) * barAreaHeight);
  const animatedHeight = grow.interpolate({inputRange: [0, 1], outputRange: [0, targetHeight]});

  return (
    <View style={styles.barColumn}>
      <CustomText style={styles.barValue} paddingTop={0}>
        {d.value}
      </CustomText>
      <Animated.View style={[styles.bar, {height: animatedHeight, backgroundColor: d.color}]} />
      <CustomText style={styles.barLabel} paddingTop={2} numberOfLines={1}>
        {d.label}
      </CustomText>
    </View>
  );
};

const BarChart = ({data, height = 150}) => {
  const max = Math.max(...data.map(d => d.value), 1);
  const barAreaHeight = height - 36;
  return (
    <View style={[styles.barChartRow, {height}]}>
      {data.map((d, index) => (
        <AnimatedBar key={d.label} d={d} max={max} barAreaHeight={barAreaHeight} index={index} />
      ))}
    </View>
  );
};

const AnimatedPolyline = Animated.createAnimatedComponent(Polyline);

// Draws the line in from left to right via the same strokeDasharray /
// strokeDashoffset technique BankHomeScreen.js's own progress ring uses —
// set the dash to the line's full length so it reads as one unbroken dash,
// then animate the offset from "fully retracted" down to 0.
const AnimatedLineSeries = ({s, points, index}) => {
  const started = useContext(ChartRevealContext);
  const draw = useRef(new Animated.Value(0)).current;

  const length = useMemo(() => {
    const coords = points.split(' ').map(p => p.split(',').map(Number));
    let total = 0;
    for (let i = 1; i < coords.length; i++) {
      const [x1, y1] = coords[i - 1];
      const [x2, y2] = coords[i];
      total += Math.hypot(x2 - x1, y2 - y1);
    }
    return total;
  }, [points]);

  useEffect(() => {
    if (!started) {
      return undefined;
    }
    const anim = Animated.timing(draw, {
      toValue: 1,
      duration: 700,
      delay: index * 150,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    });
    anim.start();
    // Same race as AnimatedBar's own stop-on-unmount — see its comment.
    return () => anim.stop();
  }, [draw, index, started]);

  const strokeDashoffset = draw.interpolate({inputRange: [0, 1], outputRange: [length, 0]});

  return (
    <AnimatedPolyline
      points={points}
      fill="none"
      stroke={s.color}
      strokeWidth={2}
      strokeLinejoin="round"
      strokeLinecap="round"
      strokeDasharray={length}
      strokeDashoffset={strokeDashoffset}
    />
  );
};

// series: [{label, color, data:[numbers]}], all sharing the same `labels`.
// Compact axis-number formatting so six-figure revenue values fit the
// y gutter: 1,250,000 → 1.3M, 42,800 → 43k.
const formatAxisValue = v => {
  if (v >= 1000000) {
    return `${(v / 1000000).toFixed(v >= 10000000 ? 0 : 1)}M`;
  }
  if (v >= 1000) {
    return `${Math.round(v / 1000)}k`;
  }
  return String(Math.round(v));
};

// Y-axis gutter width; the plot area gives this up from the total width.
const LINE_CHART_Y_GUTTER = 36;
// How many x labels to show at most — every point's label on a 12-month
// series would collide at this width.
const LINE_CHART_MAX_X_LABELS = 6;

const LineChart = ({series, labels, height = 160, width, xTitle, yTitle}) => {
  const allValues = series.flatMap(s => s.data);
  const max = Math.max(...allValues, 1);
  const plotWidth = Math.max(width - LINE_CHART_Y_GUTTER, 1);
  const stepX = labels.length > 1 ? plotWidth / (labels.length - 1) : plotWidth;
  const toY = v => height - (v / max) * (height - 8) - 4;

  // Three y ticks (max / half / zero); x labels are sampled evenly so long
  // series stay readable. Named axis titles (e.g. العدد / التاريخ) say what
  // the numbers mean — explicit user feedback that bare ticks were unclear.
  const yTicks = [max, max / 2, 0];
  const xLabelStep = Math.max(1, Math.ceil(labels.length / LINE_CHART_MAX_X_LABELS));
  const xLabels = labels.map((label, i) => ({
    label,
    show: i % xLabelStep === 0 || i === labels.length - 1,
  }));

  return (
    <View>
      {yTitle ? (
        <CustomText style={styles.axisTitle} paddingTop={0} lineHeight={13} align="left">
          {yTitle}
        </CustomText>
      ) : null}
      <View style={styles.lineChartRow}>
        <View style={[styles.yAxisGutter, {height}]}>
          {yTicks.map(tick => (
            <CustomText key={tick} style={styles.axisLabel} paddingTop={0} lineHeight={12}>
              {formatAxisValue(tick)}
            </CustomText>
          ))}
        </View>
        <Svg width={plotWidth} height={height}>
          {series.map((s, index) => (
            <AnimatedLineSeries
              key={s.label}
              s={s}
              index={index}
              points={s.data.map((v, i) => `${i * stepX},${toY(v)}`).join(' ')}
            />
          ))}
        </Svg>
      </View>
      <View style={styles.xAxisRow}>
        {xLabels.map((entry, i) => (
          <View key={`${entry.label}-${i}`} style={styles.xAxisSlot}>
            {entry.show ? (
              <CustomText style={styles.axisLabel} paddingTop={0} lineHeight={12} numberOfLines={1} center>
                {entry.label}
              </CustomText>
            ) : null}
          </View>
        ))}
      </View>
      {xTitle ? (
        <CustomText style={styles.axisTitle} paddingTop={2} lineHeight={13} center>
          {xTitle}
        </CustomText>
      ) : null}
      <View style={styles.legendRow}>
        {series.map(s => (
          <View key={s.label} style={styles.legendItem}>
            <View style={[styles.legendDot, {backgroundColor: s.color}]} />
            <CustomText style={styles.legendLabel} paddingTop={0}>
              {s.label}
            </CustomText>
          </View>
        ))}
      </View>
    </View>
  );
};

// Collapsed by default — mirrors the web dashboard's own CollapsibleCard
// usage in BankReports.js (every chart there starts with collapsed={true}).
// The hide/show button sits opposite the title (row-reverse in RTL so it's
// genuinely on the far side, not just visually adjacent because CustomText
// right-aligns its own text within a flex:1 block).
//
// Deliberately NOT LayoutAnimation: on a real device this reliably crashed
// (SIGABRT) whenever a card containing the SVG line chart was expanded and
// then collapsed. The crash trace is native Fabric code — a strict-weak-
// ordering violation inside LayoutAnimationDriver::animationMutationsForFrame
// (stable_sort) — a known class of bug where LayoutAnimation's mutation
// diffing doesn't handle react-native-svg children inside an animated
// subtree correctly. There's no safe way to keep using LayoutAnimation
// here; a plain Animated height/opacity transition sidesteps that native
// code path entirely instead of trying to avoid triggering it.
const CHART_BODY_MAX_HEIGHT = 600; // comfortably taller than any real chart, clipped by overflow:hidden
const ChartCard = ({title, children, isEmpty, emptyLabel, isRTL, onExpanded}) => {
  const [collapsed, setCollapsed] = useState(true);
  // Bumped on every expand to force the chart content to remount (new key
  // = new subtree), which is what replays AnimatedBar/AnimatedLineSeries's
  // own mount-time grow/draw-in animations — independent of the collapse
  // transition below, and a normal React reconciliation (not a
  // LayoutAnimation-tracked one), so it doesn't share the crash risk above.
  const [contentKey, setContentKey] = useState(0);
  // Gates the charts' own grow/draw-in (via ChartRevealContext): false from
  // the moment an expand starts until the expand transition and the
  // auto-scroll have both settled, so the chart animation plays fully on
  // screen instead of starting while the card is still below the fold.
  const [chartsStarted, setChartsStarted] = useState(false);
  const progress = useRef(new Animated.Value(0)).current; // 0 collapsed, 1 expanded
  const cardRef = useRef(null);
  const {t} = useTranslation();

  const toggle = () => {
    const expanding = collapsed;
    if (expanding) {
      setChartsStarted(false);
      setContentKey(k => k + 1);
    }
    setCollapsed(!expanding);
    Animated.timing(progress, {
      toValue: expanding ? 1 : 0,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false, // height/maxHeight aren't native-drivable
    }).start(({finished}) => {
      // Only once the card is at its final height — measuring mid-animation
      // would compute a scroll target against a still-growing card.
      if (expanding && finished) {
        if (onExpanded) {
          onExpanded(cardRef, () => setChartsStarted(true));
        } else {
          setChartsStarted(true);
        }
      }
    });
  };

  const chevronRotate = progress.interpolate({inputRange: [0, 1], outputRange: ['0deg', '180deg']});
  const bodyMaxHeight = progress.interpolate({inputRange: [0, 1], outputRange: [0, CHART_BODY_MAX_HEIGHT]});

  return (
    <View ref={cardRef} style={styles.chartCard}>
      <TouchableOpacity
        onPress={toggle}
        activeOpacity={0.7}
        style={[styles.chartCardHeader, isRTL && styles.chartCardHeaderRTL]}>
        <CustomText style={styles.chartTitle} paddingTop={0}>
          {title}
        </CustomText>
        <View style={[styles.toggleBtn, isRTL && styles.toggleBtnRTL]}>
          <CustomText style={styles.toggleBtnLabel} paddingTop={0}>
            {collapsed ? t('show') : t('hide')}
          </CustomText>
          <Animated.View style={{transform: [{rotate: chevronRotate}]}}>
            <ChevronDown size={16} color={COLORS.primary} />
          </Animated.View>
        </View>
      </TouchableOpacity>
      <Animated.View style={{maxHeight: bodyMaxHeight, opacity: progress, overflow: 'hidden'}}>
        <ChartRevealContext.Provider value={chartsStarted}>
          <View key={contentKey} style={styles.chartCardBody}>
            {isEmpty ? (
              <CustomText center style={styles.noDataText}>
                {emptyLabel}
              </CustomText>
            ) : (
              children
            )}
          </View>
        </ChartRevealContext.Provider>
      </Animated.View>
    </View>
  );
};

const EMPTY_ANALYTICS = {
  summary: {
    totalTransfers: 0,
    acceptedTransfers: 0,
    executedTransfers: 0,
    pendingTransfers: 0,
    notStartedTransfers: 0,
    rejectedTransfers: 0,
    bawalesTotal: 0,
  },
  overviewBar: {labels: [], data: []},
  overviewLine: {labels: [], datasets: {}},
  bawalesBar: {labels: [], data: []},
  profitLine: {labels: [], datasets: {}},
};

const BankReportsScreen = () => {
  const {t} = useTranslation();
  const {currentDirection} = useContext(LanguageContext);
  const isRTL = currentDirection === 'rtl';
  const {width: windowWidth} = useWindowDimensions();
  const chartWidth = windowWidth - 32 - 32; // screen padding + card padding
  const revealController = useRevealController();

  const scrollRef = useRef(null);
  const scrollOffsetYRef = useRef(0);
  const viewportHeightRef = useRef(0);

  const handleScroll = useCallback(
    e => {
      scrollOffsetYRef.current = e.nativeEvent.contentOffset.y;
      viewportHeightRef.current = e.nativeEvent.layoutMeasurement.height;
      revealController.handleScroll(e);
    },
    [revealController],
  );

  // Called by a ChartCard once its expand animation has finished, so the
  // measured height below is the card's final expanded height. Scrolls just
  // far enough that the newly revealed chart is fully on screen — clamped so
  // the card's own title never gets pushed off the top, and skipped entirely
  // when the content is already visible (never scrolls up/backwards).
  // measureInWindow (not measureLayout) on purpose: on Fabric, measureLayout
  // demands a native-component ref and ScrollView's getInnerViewNode doesn't
  // qualify — it red-boxes with "must be called with a ref to a native
  // component". Window coordinates + the tracked scroll offset give the same
  // content-relative position without touching that API.
  // onSettled fires once the view is done moving (immediately when no scroll
  // is needed, after the platform scroll animation otherwise — scrollTo has
  // no completion callback, so that case is approximated with a timeout
  // comfortably past the ~250–350ms platform scroll). ChartCard uses it to
  // release its charts' entrance animations.
  const scrollCardIntoView = useCallback((cardRef, onSettled) => {
    const settle = () => onSettled && onSettled();
    const scrollNode = scrollRef.current;
    const cardNode = cardRef.current;
    if (!scrollNode || !cardNode || typeof cardNode.measureInWindow !== 'function') {
      settle();
      return;
    }
    const outerNode = scrollNode.getNativeScrollRef ? scrollNode.getNativeScrollRef() : null;
    if (!outerNode || typeof outerNode.measureInWindow !== 'function') {
      settle();
      return;
    }
    outerNode.measureInWindow((scrollWinX, scrollWinY) => {
      cardNode.measureInWindow((cardWinX, cardWinY, width, height) => {
        const viewportHeight = viewportHeightRef.current;
        if (!viewportHeight) {
          settle();
          return;
        }
        const y = cardWinY - scrollWinY + scrollOffsetYRef.current; // card top in content coords
        const revealTarget = y + height + 16 - viewportHeight; // card bottom + breathing room
        const target = Math.min(revealTarget, y - 8); // keep the card's top visible
        if (target > scrollOffsetYRef.current) {
          scrollNode.scrollTo({y: target, animated: true});
          setTimeout(settle, 400);
        } else {
          settle();
        }
      });
    });
  }, []);

  const now = new Date();
  const [section, setSection] = useState('overview');
  // Origins/Risk interaction state (mock-backed): one expanded accordion at
  // a time per section; cleared risk cards are session-local only and come
  // back on reload, matching the prototype.
  const [expandedCity, setExpandedCity] = useState(null);
  const [expandedRisk, setExpandedRisk] = useState(null);
  const [riskFilter, setRiskFilter] = useState('all');
  const [clearedRiskIds, setClearedRiskIds] = useState([]);
  const [period, setPeriod] = useState(PERIOD.MONTHLY);

  const remainingFlagged = riskMockData.flaggedTransactions.filter(tx => !clearedRiskIds.includes(tx.id));
  const visibleFlagged = remainingFlagged.filter(tx => {
    if (riskFilter === 'high') {
      return tx.riskScore >= 70;
    }
    if (riskFilter === 'watchlist') {
      return tx.watchlist;
    }
    return true;
  });
  const sortedCities = [...originsMockData.cities].sort((a, b) => b.amount - a.amount);
  const [year, setYear] = useState(now.getFullYear());
  // Stored as a Date at the 1st of the target month, so prev/next just
  // shifts calendar months without manually juggling year rollover.
  const [monthCursor, setMonthCursor] = useState(new Date(now.getFullYear(), now.getMonth(), 1));
  const [dayCursor, setDayCursor] = useState(now);

  const [analytics, setAnalytics] = useState(EMPTY_ANALYTICS);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAnalytics = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const params = {period};
      if (period === PERIOD.YEARLY) {
        params.year = String(year);
      } else if (period === PERIOD.MONTHLY) {
        params.month = `${monthCursor.getFullYear()}-${String(monthCursor.getMonth() + 1).padStart(2, '0')}`;
      } else if (period === PERIOD.DAILY) {
        params.date = dayCursor.toISOString().split('T')[0];
      }
      const data = await getBankReportsAnalytics(params);
      setAnalytics(data || EMPTY_ANALYTICS);
    } catch (err) {
      setError(t('genericErrorMessage'));
    } finally {
      setIsLoading(false);
    }
  }, [period, year, monthCursor, dayCursor, t]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const {summary, overviewBar, overviewLine, bawalesBar, profitLine} = analytics;
  const hasData = summary.totalTransfers > 0;
  const hasBawales = summary.bawalesTotal > 0;

  const overviewBarData = [
    {label: t('totalTransfers'), value: overviewBar.data[0] || 0, color: CATEGORY_COLORS.total},
    {label: t('acceptedTransfers'), value: overviewBar.data[1] || 0, color: CATEGORY_COLORS.accepted},
    {label: t('executedTransfers'), value: overviewBar.data[2] || 0, color: CATEGORY_COLORS.executed},
    {label: t('pending'), value: overviewBar.data[4] || 0, color: CATEGORY_COLORS.pending},
    {label: t('notStarted'), value: overviewBar.data[5] || 0, color: CATEGORY_COLORS.notStarted},
    {label: t('rejectedTransfers'), value: overviewBar.data[6] || 0, color: CATEGORY_COLORS.rejected},
  ];

  const overviewLineSeries = [
    {label: t('totalTransfers'), color: CATEGORY_COLORS.total, data: overviewLine.datasets.totalTransfers || []},
    {label: t('acceptedTransfers'), color: CATEGORY_COLORS.accepted, data: overviewLine.datasets.acceptedTransfers || []},
    {label: t('rejectedTransfers'), color: CATEGORY_COLORS.rejected, data: overviewLine.datasets.rejected || []},
  ];

  const bawalesBarData = [
    {label: t('totalTransfers'), value: bawalesBar.data[0] || 0, color: CATEGORY_COLORS.bawales},
    {label: t('acceptedTransfers'), value: bawalesBar.data[2] || 0, color: CATEGORY_COLORS.accepted},
    {label: t('rejectedTransfers'), value: bawalesBar.data[1] || 0, color: CATEGORY_COLORS.rejected},
    {label: t('pending'), value: bawalesBar.data[3] || 0, color: CATEGORY_COLORS.pending},
  ];

  const profitSeries = ['USD', 'EUR', 'AED'].map(cur => ({
    label: cur,
    color: CURRENCY_COLORS[cur],
    data: profitLine.datasets[cur] || [],
  }));

  const periodOptions = [
    {value: PERIOD.YEARLY, labelKey: 'yearly'},
    {value: PERIOD.MONTHLY, labelKey: 'monthly'},
    {value: PERIOD.DAILY, labelKey: 'daily'},
  ];
  const yearOptions = Array.from({length: 6}, (_, i) => now.getFullYear() - i);

  const shiftMonth = delta => {
    setMonthCursor(prev => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  };
  const shiftDay = delta => {
    setDayCursor(prev => {
      const next = new Date(prev);
      next.setDate(next.getDate() + delta);
      return next;
    });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        onLayout={e => {
          // Seed the viewport height so an expand that happens before any
          // scroll event still knows how tall the visible area is.
          viewportHeightRef.current = e.nativeEvent.layout.height;
        }}
        scrollEventThrottle={16}>
        <CustomText style={styles.screenTitle} paddingTop={0}>
          {t('bankReports')}
        </CustomText>

        <View style={[styles.sectionTabs, isRTL && styles.sectionTabsRTL]}>
          {REPORT_SECTIONS.map(s => {
            const active = section === s.key;
            return (
              <TouchableOpacity
                key={s.key}
                activeOpacity={0.8}
                onPress={() => setSection(s.key)}
                style={[styles.sectionTab, isRTL && styles.sectionTabRTL, active && styles.sectionTabActive]}>
                <CustomText
                  style={[styles.sectionTabText, active && styles.sectionTabTextActive]}
                  paddingTop={0}>
                  {t(s.labelKey)}
                </CustomText>
                {s.key === 'risk' && remainingFlagged.length > 0 ? (
                  <View style={styles.sectionTabBadge}>
                    <Text style={styles.sectionTabBadgeText}>{remainingFlagged.length}</Text>
                  </View>
                ) : null}
              </TouchableOpacity>
            );
          })}
        </View>

        {section === 'overview' ? (
        // Reference layout: the date navigator is the WIDE pill (chevrons
        // pushed to its edges, label centered) and the period dropdown hugs
        // its label beside it.
        <View style={[styles.filterRow, isRTL && styles.filterRowRTL]}>
          {period === PERIOD.YEARLY && (
            <View style={styles.filterFieldWide}>
              <SelectField
                style={styles.filterSelect}
                fieldStyle={styles.pillField}
                value={{value: year, label: String(year)}}
                options={yearOptions.map(y => ({value: y, label: String(y)}))}
                onSelect={opt => setYear(opt.value)}
                getLabel={opt => opt.label}
                getKey={opt => opt.value}
              />
            </View>
          )}

          {period === PERIOD.MONTHLY && (
            <View style={[styles.stepperRow, isRTL && styles.stepperRowRTL]}>
              <TouchableOpacity onPress={() => shiftMonth(-1)} style={styles.stepperBtn}>
                <ChevronLeft size={18} color={COLORS.textMuted} />
              </TouchableOpacity>
              <CustomText style={styles.stepperLabel} paddingTop={0} center>
                {`${MONTH_NAMES_EN[monthCursor.getMonth()]} ${monthCursor.getFullYear()}`}
              </CustomText>
              <TouchableOpacity onPress={() => shiftMonth(1)} style={styles.stepperBtn}>
                <ChevronRight size={18} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>
          )}

          {period === PERIOD.DAILY && (
            <View style={[styles.stepperRow, isRTL && styles.stepperRowRTL]}>
              <TouchableOpacity onPress={() => shiftDay(-1)} style={styles.stepperBtn}>
                <ChevronLeft size={18} color={COLORS.textMuted} />
              </TouchableOpacity>
              <CustomText style={styles.stepperLabel} paddingTop={0} center>
                {dayCursor.toISOString().split('T')[0]}
              </CustomText>
              <TouchableOpacity onPress={() => shiftDay(1)} style={styles.stepperBtn}>
                <ChevronRight size={18} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.filterField}>
            <SelectField
              style={styles.filterSelect}
              fieldStyle={styles.pillField}
              fieldTextStyle={styles.periodFieldText}
              value={periodOptions.find(o => o.value === period)}
              options={periodOptions}
              onSelect={opt => setPeriod(opt.value)}
              getLabel={opt => t(opt.labelKey)}
              getKey={opt => opt.value}
            />
          </View>
        </View>
        ) : null}

        {section === 'origins' ? (
          // Origins per design_handoff_reports: outgoing transfers mapped by
          // sending company's city over assets/iraq-map.png, with a
          // city→companies accordion. Entirely mock-backed for now.
          <>
            <CustomText style={styles.sectionEyebrow} paddingTop={0} align={isRTL ? 'right' : 'left'}>
              {t('bankOriginsEyebrow')}
            </CustomText>
            <CustomText style={styles.sectionSubtext} paddingTop={0} align={isRTL ? 'right' : 'left'}>
              {t('bankOriginsSubtext')}
            </CustomText>

            <View style={styles.mapCard}>
              <Image source={require('../../assets/iraq-map.png')} style={styles.mapImage} resizeMode="cover" />
              <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 100 100">
                <Defs>
                  <SvgLinearGradient id="mapOverlay" x1="0" y1="0" x2="1" y2="1">
                    <Stop offset="0" stopColor={COLORS.primaryDark} stopOpacity="0.35" />
                    <Stop offset="1" stopColor={COLORS.text} stopOpacity="0.15" />
                  </SvgLinearGradient>
                </Defs>
                <Rect x="0" y="0" width="100" height="100" fill="url(#mapOverlay)" />
              </Svg>
              {originsMockData.cities.map(city => {
                // Marker diameter scales with transfer volume, exactly per
                // the prototype's 16 + min(count, 40) * 0.5 formula; the
                // outer halo is the design's soft 6px glow ring.
                const size = 16 + Math.min(city.count, 40) * 0.5;
                const halo = size + 12;
                return (
                  <View
                    key={city.id}
                    pointerEvents="none"
                    style={[styles.mapMarker, {left: `${city.left}%`, top: `${city.top}%`}]}>
                    <View
                      style={{
                        width: halo,
                        height: halo,
                        borderRadius: halo / 2,
                        marginLeft: -halo / 2,
                        marginTop: -halo / 2,
                        backgroundColor: `${city.color}33`,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                      <View
                        style={{
                          width: size,
                          height: size,
                          borderRadius: size / 2,
                          backgroundColor: city.color,
                          borderWidth: 2,
                          borderColor: 'rgba(255,255,255,0.85)',
                        }}
                      />
                    </View>
                  </View>
                );
              })}
              {/* Always pinned bottom-LEFT regardless of language direction —
                  the RTL mirror put it over the Basra/Nasiriyah markers
                  (explicit user feedback); bottom-left is open map space. */}
              <View style={styles.mapCaption}>
                <CustomText style={styles.mapCaptionText} paddingTop={0}>
                  {t('bankOriginsMapCaption')}
                </CustomText>
              </View>
            </View>

            <View style={[styles.originStatsRow, isRTL && styles.rowRTL]}>
              <View style={styles.originStatCard}>
                <CustomText style={styles.originStatValue} paddingTop={0} lineHeight={22} align={isRTL ? 'right' : 'left'}>
                  {originsMockData.cities.length}
                </CustomText>
                <CustomText style={styles.originStatLabel} paddingTop={0} align={isRTL ? 'right' : 'left'}>
                  {t('bankOriginsSenderCities')}
                </CustomText>
              </View>
              <View style={styles.originStatCard}>
                <CustomText style={styles.originStatValue} paddingTop={0} lineHeight={22} align={isRTL ? 'right' : 'left'}>
                  {originsMockData.stats.newSenders}
                </CustomText>
                <CustomText style={styles.originStatLabel} paddingTop={0} align={isRTL ? 'right' : 'left'}>
                  {t('bankOriginsNewSenders')}
                </CustomText>
              </View>
              <View style={styles.originStatCard}>
                <CustomText
                  style={[styles.originStatValue, {color: '#B5347A'}]}
                  paddingTop={0}
                  lineHeight={22}
                  align={isRTL ? 'right' : 'left'}>
                  {originsMockData.stats.flagged}
                </CustomText>
                <CustomText style={styles.originStatLabel} paddingTop={0} align={isRTL ? 'right' : 'left'}>
                  {t('bankOriginsFlaggedSender')}
                </CustomText>
              </View>
            </View>

            <CustomText style={styles.riskCardTitle} paddingTop={0} align={isRTL ? 'right' : 'left'}>
              {t('bankOriginsTopCities')}
            </CustomText>
            <View style={styles.originCityList}>
              {sortedCities.map(city => (
                <OriginCityRow
                  key={city.id}
                  city={city}
                  isRTL={isRTL}
                  expanded={expandedCity === city.id}
                  onToggle={() => setExpandedCity(prev => (prev === city.id ? null : city.id))}
                />
              ))}
            </View>
          </>
        ) : null}

        {section === 'risk' ? (
          // Risk per design_handoff_reports: AML/compliance screening
          // dashboard. Entirely mock-backed (riskMockData.json) until the
          // backend risk-screening endpoint exists.
          <>
            <CustomText style={styles.sectionEyebrow} paddingTop={0} align={isRTL ? 'right' : 'left'}>
              {t('bankRiskEyebrow')}
            </CustomText>
            <CustomText style={styles.sectionSubtext} paddingTop={0} align={isRTL ? 'right' : 'left'}>
              {t('bankRiskSubtext')}
            </CustomText>

            <View style={[styles.riskSummaryGrid, isRTL && styles.rowRTLWrap]}>
              <View style={[styles.riskSummaryCard, styles.riskSummaryCardHero]}>
                {/* The Svg lives inside a plain absoluteFill View: RNSVG's
                    percentage width/height can't resolve against a parent
                    whose height comes from its content (this card), which
                    left the gradient covering only part of the card. The
                    wrapper View gets definite bounds from absoluteFill, so
                    the Svg's 100% resolves against those. */}
                <View style={StyleSheet.absoluteFill}>
                  <Svg width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 100 100">
                    <Defs>
                      <SvgLinearGradient id="riskHeroGradient" x1="0" y1="0" x2="1" y2="1">
                        <Stop offset="0" stopColor={COLORS.primaryDark} />
                        <Stop offset="1" stopColor={COLORS.primary} />
                      </SvgLinearGradient>
                    </Defs>
                    <Rect x="0" y="0" width="100" height="100" fill="url(#riskHeroGradient)" />
                  </Svg>
                </View>
                <View>
                  <CustomText style={styles.riskSummaryHeroValue} paddingTop={0} lineHeight={28} align={isRTL ? 'right' : 'left'}>
                    {remainingFlagged.length}
                  </CustomText>
                  <CustomText style={styles.riskSummaryHeroLabel} paddingTop={0} align={isRTL ? 'right' : 'left'}>
                    {t('bankRiskOpenAlerts')}
                  </CustomText>
                </View>
              </View>
              <View style={styles.riskSummaryCard}>
                <CustomText style={styles.riskSummaryValue} paddingTop={0} lineHeight={28} align={isRTL ? 'right' : 'left'}>
                  {riskMockData.summary.avgRiskScore}
                </CustomText>
                <CustomText style={styles.riskSummaryLabel} paddingTop={0} align={isRTL ? 'right' : 'left'}>
                  {t('bankRiskAvgScore100')}
                </CustomText>
              </View>
              <View style={styles.riskSummaryCard}>
                <CustomText
                  style={[styles.riskSummaryValue, {color: COLORS.danger}]}
                  paddingTop={0}
                  lineHeight={28}
                  align={isRTL ? 'right' : 'left'}>
                  {riskMockData.summary.watchlistMatches}
                </CustomText>
                <CustomText style={styles.riskSummaryLabel} paddingTop={0} align={isRTL ? 'right' : 'left'}>
                  {t('bankRiskWatchlist')}
                </CustomText>
              </View>
              <View style={styles.riskSummaryCard}>
                <CustomText style={styles.riskSummaryValue} paddingTop={0} lineHeight={28} align={isRTL ? 'right' : 'left'}>
                  {riskMockData.summary.sanctionedCorridors}
                </CustomText>
                <CustomText style={styles.riskSummaryLabel} paddingTop={0} align={isRTL ? 'right' : 'left'}>
                  {t('bankRiskSanctioned')}
                </CustomText>
              </View>
            </View>

            <CustomText style={styles.riskCardTitle} paddingTop={0} align={isRTL ? 'right' : 'left'}>
              {t('bankRiskDistribution')}
            </CustomText>
            <View style={[styles.riskDistBar, isRTL && styles.rowRTL]}>
              {riskMockData.riskDistribution.map(bucket => (
                <View key={bucket.labelEn} style={{flexGrow: bucket.percent, backgroundColor: bucket.color}} />
              ))}
            </View>
            <View style={[styles.riskDistLegend, isRTL && styles.rowRTLWrap]}>
              {riskMockData.riskDistribution.map(bucket => (
                <View key={bucket.labelEn} style={[styles.riskDistLegendItem, isRTL && styles.rowRTL]}>
                  <View style={[styles.riskDistDot, {backgroundColor: bucket.color}]} />
                  <CustomText style={styles.riskDistLegendText} paddingTop={0}>
                    {`${isRTL ? bucket.labelAr : bucket.labelEn} ${bucket.count}`}
                  </CustomText>
                </View>
              ))}
            </View>

            <View style={[styles.riskFlaggedHeader, isRTL && styles.rowRTL]}>
              <CustomText style={styles.riskCardTitle} paddingTop={0} align={isRTL ? 'right' : 'left'}>
                {t('bankRiskFlagged')}
              </CustomText>
              <View style={[styles.riskFilterRow, isRTL && styles.rowRTL]}>
                {[
                  {key: 'all', labelKey: 'bankHomeFilterAll'},
                  {key: 'high', labelKey: 'bankRiskHighScoreFilter'},
                  {key: 'watchlist', labelKey: 'bankRiskWatchlistFilter'},
                ].map(f => {
                  const active = riskFilter === f.key;
                  return (
                    <TouchableOpacity
                      key={f.key}
                      activeOpacity={0.8}
                      onPress={() => setRiskFilter(f.key)}
                      style={[styles.riskFilterChip, active && styles.riskFilterChipActive]}>
                      <CustomText
                        style={[styles.riskFilterChipText, active && styles.riskFilterChipTextActive]}
                        paddingTop={0}>
                        {t(f.labelKey)}
                      </CustomText>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.riskTxList}>
              {visibleFlagged.map(tx => (
                <RiskFlaggedCard
                  key={tx.id}
                  tx={tx}
                  isRTL={isRTL}
                  expanded={expandedRisk === tx.id}
                  onToggleBreakdown={() => setExpandedRisk(prev => (prev === tx.id ? null : tx.id))}
                  onDismiss={() => setClearedRiskIds(prev => [...prev, tx.id])}
                />
              ))}
              {visibleFlagged.length === 0 ? (
                <CustomText style={styles.riskEmptyText} paddingTop={0} center>
                  {t('bankRiskNoFlagged')}
                </CustomText>
              ) : null}
            </View>

            <View style={styles.stubCard}>
              <CustomText style={styles.stubText} paddingTop={0} align={isRTL ? 'right' : 'left'}>
                {t('bankRiskMockNote')}
              </CustomText>
            </View>
          </>
        ) : null}

        {section !== 'overview' ? null : error ? (
          <ErrorState message={error} onRetry={fetchAnalytics} />
        ) : isLoading ? (
          <LoadingState />
        ) : (
          <>
            <RevealCard controller={revealController} style={styles.statsGrid}>
              <StatCard label={t('totalTransfers')} value={summary.totalTransfers} color={CATEGORY_COLORS.total} />
              <StatCard label={t('acceptedTransfers')} value={summary.acceptedTransfers} color={CATEGORY_COLORS.accepted} />
              <StatCard label={t('executedTransfers')} value={summary.executedTransfers} color={CATEGORY_COLORS.executed} />
              <StatCard label={t('rejectedTransfers')} value={summary.rejectedTransfers} color={CATEGORY_COLORS.rejected} />
              <StatCard label={t('pending')} value={summary.pendingTransfers} color={CATEGORY_COLORS.pending} />
              <StatCard label={t('notStarted')} value={summary.notStartedTransfers} color={CATEGORY_COLORS.notStarted} />
              <StatCard label={t('bawales')} value={summary.bawalesTotal} color={CATEGORY_COLORS.bawales} wide />
            </RevealCard>

            <RevealCard controller={revealController}>
              <ChartCard title={t('transferAnalytics')} isEmpty={!hasData} emptyLabel={t('noDataForPeriod')} isRTL={isRTL} onExpanded={scrollCardIntoView}>
                <BarChart data={overviewBarData} />
              </ChartCard>
            </RevealCard>

            <RevealCard controller={revealController}>
              <ChartCard title={`${t('transferAnalytics')} — ${t('bawales')}`} isEmpty={!hasBawales} emptyLabel={t('noDataForPeriod')} isRTL={isRTL} onExpanded={scrollCardIntoView}>
                <BarChart data={bawalesBarData} />
              </ChartCard>
            </RevealCard>

            <RevealCard controller={revealController}>
              <ChartCard title={t('transferAnalytics')} isEmpty={!hasData} emptyLabel={t('noDataForPeriod')} isRTL={isRTL} onExpanded={scrollCardIntoView}>
                <LineChart
                  series={overviewLineSeries}
                  labels={overviewLine.labels}
                  width={chartWidth}
                  yTitle={t('chartCountAxis')}
                  xTitle={t('date')}
                />
              </ChartCard>
            </RevealCard>

            <RevealCard controller={revealController}>
              <ChartCard title={t('revenueMetrics')} isEmpty={!hasData} emptyLabel={t('noDataForPeriod')} isRTL={isRTL} onExpanded={scrollCardIntoView}>
                <LineChart
                  series={profitSeries}
                  labels={profitLine.labels}
                  width={chartWidth}
                  yTitle={t('amount')}
                  xTitle={t('date')}
                />
              </ChartCard>
            </RevealCard>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {flex: 1, backgroundColor: COLORS.bg},
  scrollContent: {padding: 16, paddingBottom: 40},
  screenTitle: {fontSize: 20, fontWeight: '800', color: COLORS.text, marginBottom: 14},

  // Segmented Overview/Origins/Risk sub-nav per design_handoff_reports_tab:
  // one white pill card, active tab a solid dark-purple pill, Risk carrying
  // a red open-alerts count badge.
  // Rounded rectangles (12/9), not full pills — matches the reference
  // screenshot's corner treatment for the sub-nav and period row.
  sectionTabs: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 4,
    marginBottom: 12,
    ...CARD_SHADOW,
  },
  sectionTabsRTL: {flexDirection: 'row-reverse'},
  sectionTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 8,
    borderRadius: 9,
  },
  sectionTabRTL: {flexDirection: 'row-reverse'},
  sectionTabActive: {backgroundColor: COLORS.primaryDark},
  sectionTabText: {fontSize: 12.5, fontWeight: '700', color: COLORS.textMuted},
  sectionTabTextActive: {color: '#fff'},
  sectionTabBadge: {
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: COLORS.danger,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  sectionTabBadgeText: {color: '#fff', fontSize: 9, fontWeight: '800', includeFontPadding: false},

  stubCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    marginBottom: 14,
    ...CARD_SHADOW,
  },
  stubText: {fontSize: 13, color: COLORS.textMuted, fontWeight: '600'},

  riskCardTitle: {fontSize: 13, fontWeight: '700', color: COLORS.text, textTransform: 'uppercase', letterSpacing: 0.5},
  rowRTL: {flexDirection: 'row-reverse'},
  rowRTLWrap: {flexDirection: 'row-reverse', flexWrap: 'wrap'},

  sectionEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: '#a06fd9',
  },
  sectionSubtext: {fontSize: 12.5, color: COLORS.textMuted, marginTop: 3, marginBottom: 14},

  mapCard: {
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.text,
    ...makeShadow({y: 14, blur: 34, color: COLORS.primaryDark, opacity: 0.35}),
  },
  mapImage: {width: '100%', height: 220, opacity: 0.88},
  mapMarker: {position: 'absolute'},
  mapCaption: {
    position: 'absolute',
    left: 12,
    bottom: 10,
    backgroundColor: 'rgba(26,15,38,0.55)',
    borderRadius: 8,
    paddingVertical: 5,
    paddingHorizontal: 9,
  },
  mapCaptionText: {fontSize: 10.5, color: '#e8d9f5', fontWeight: '600'},

  originStatsRow: {flexDirection: 'row', gap: 8, marginTop: 14, marginBottom: 16},
  originStatCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  originStatValue: {fontSize: 16, fontWeight: '800', color: COLORS.text},
  originStatLabel: {fontSize: 10, color: COLORS.textMuted, fontWeight: '600', marginTop: 1},

  originCityList: {gap: 8, marginTop: 8, marginBottom: 4},
  originCityRow: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 13,
  },
  originCityTop: {flexDirection: 'row', alignItems: 'center', gap: 12},
  originCityDot: {width: 8, height: 8, borderRadius: 4},
  originCityInfo: {flex: 1, minWidth: 0},
  originCityName: {fontSize: 13.5, fontWeight: '700', color: COLORS.text},
  originCityCount: {fontSize: 11, color: COLORS.textMuted, marginTop: 1},
  originCityAmount: {alignItems: 'flex-end'},
  originCityAmountRTL: {alignItems: 'flex-start'},
  originCityAmountText: {fontSize: 13.5, fontWeight: '700', color: COLORS.text},
  originCityTrend: {fontSize: 10.5, fontWeight: '700'},
  originCompanyList: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.surfaceAlt,
    gap: 8,
  },
  originCompanyRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10},
  originCompanyName: {flex: 1, fontSize: 12, color: COLORS.text, fontWeight: '600'},
  originCompanyMeta: {fontSize: 12, color: COLORS.textMuted},

  riskSummaryGrid: {flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16},
  riskSummaryCard: {
    flexBasis: '47%',
    flexGrow: 1,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    paddingVertical: 13,
    paddingHorizontal: 14,
    overflow: 'hidden',
  },
  riskSummaryCardHero: {borderWidth: 0},
  riskSummaryHeroValue: {fontSize: 22, fontWeight: '800', color: '#fff'},
  riskSummaryHeroLabel: {fontSize: 10.5, color: 'rgba(255,255,255,0.75)', fontWeight: '600', marginTop: 2},
  riskSummaryValue: {fontSize: 22, fontWeight: '800', color: COLORS.text},
  riskSummaryLabel: {fontSize: 10.5, color: COLORS.textMuted, fontWeight: '600', marginTop: 2},

  riskDistBar: {
    flexDirection: 'row',
    height: 14,
    borderRadius: 7,
    overflow: 'hidden',
    marginTop: 8,
    marginBottom: 6,
  },
  riskDistLegend: {flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20},
  riskDistLegendItem: {flexDirection: 'row', alignItems: 'center', gap: 5},
  riskDistDot: {width: 7, height: 7, borderRadius: 4},
  riskDistLegendText: {fontSize: 11, color: COLORS.textMuted, fontWeight: '600'},

  riskFlaggedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    gap: 8,
  },
  riskFilterRow: {flexDirection: 'row', gap: 6},
  riskFilterChip: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#f1e9f6',
  },
  riskFilterChipActive: {backgroundColor: COLORS.primaryDark},
  riskFilterChipText: {fontSize: 11, fontWeight: '700', color: COLORS.primaryDark},
  riskFilterChipTextActive: {color: '#fff'},

  riskTxList: {gap: 10, marginBottom: 14},
  riskTxCard: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    paddingVertical: 13,
    paddingHorizontal: 14,
  },
  riskTxCardCritical: {borderColor: '#f0c9de'},
  riskTxHeader: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10},
  riskTxInfo: {flex: 1, minWidth: 0},
  riskTxSender: {fontSize: 13.5, fontWeight: '700', color: COLORS.text},
  riskTxMeta: {fontSize: 11, color: COLORS.textMuted, marginTop: 1},
  scoreRing: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreRingText: {fontSize: 12, fontWeight: '800'},
  reasonTagsRow: {flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10},
  reasonTag: {
    backgroundColor: '#fdeaea',
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  reasonTagText: {fontSize: 10.5, fontWeight: '700', color: '#B5347A'},
  breakdownBox: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.surfaceAlt,
    gap: 6,
  },
  breakdownTitle: {
    fontSize: 10.5,
    fontWeight: '700',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  breakdownRow: {flexDirection: 'row', alignItems: 'center', gap: 8},
  breakdownLabel: {flex: 1, fontSize: 11.5, color: COLORS.text},
  breakdownTrack: {width: 60, height: 6, borderRadius: 3, backgroundColor: COLORS.surfaceAlt, overflow: 'hidden'},
  breakdownFill: {height: '100%'},
  breakdownPoints: {width: 26, fontSize: 11, fontWeight: '700', color: COLORS.text, textAlign: 'right'},
  riskTxActions: {flexDirection: 'row', gap: 8, marginTop: 12},
  riskClearBtn: {flex: 1, paddingVertical: 9, borderRadius: 9, backgroundColor: '#f1e9f6'},
  riskClearText: {fontSize: 12, fontWeight: '700', color: COLORS.primary},
  riskEscalateBtn: {flex: 1, paddingVertical: 9, borderRadius: 9, backgroundColor: COLORS.primaryDark},
  riskEscalateText: {fontSize: 12, fontWeight: '700', color: '#fff'},
  riskEmptyText: {fontSize: 13, color: COLORS.textMuted, paddingVertical: 30},

  filterRow: {flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16},
  filterRowRTL: {flexDirection: 'row-reverse'},
  filterFieldWide: {flex: 1},
  // Period dropdown + date stepper per the reference: 12px rounded-rect
  // white cards with the standard border, and the selected period label
  // rendered in the primary purple.
  pillField: {borderRadius: 12},
  periodFieldText: {color: COLORS.primary, fontWeight: '700'},
  filterField: {minWidth: 110},
  // SelectField carries its own form-layout bottom margin; inside this
  // center-aligned filter row that margin shoves the closed field up
  // relative to the stepper, so zero it out here.
  filterSelect: {marginBottom: 0},
  stepperRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 8,
    // 9 (not 10) so the stepper's total height (26px chevron buttons + 18px
    // padding + 2px border) exactly matches SelectField's closed height.
    paddingVertical: 9,
  },
  stepperRowRTL: {flexDirection: 'row-reverse'},
  stepperBtn: {padding: 4},
  stepperLabel: {flex: 1, fontSize: 13, fontWeight: '700', color: COLORS.text, textAlign: 'center'},

  statsGrid: {flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16},
  // 2-column grid per design_handoff_reports (was 3-up); the Balances card
  // stretches full width below via statCardWide.
  statCard: {
    flexBasis: '47%',
    flexGrow: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    overflow: 'hidden',
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 9,
    ...CARD_SHADOW,
  },
  statCardAccent: {position: 'absolute', top: 0, left: 0, right: 0, height: 3},
  statCardWide: {flexBasis: '100%'},
  statValue: {fontSize: 20, fontWeight: '800', color: COLORS.text},
  statLabel: {fontSize: 11, color: COLORS.textMuted, fontWeight: '600'},

  chartCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...CARD_SHADOW,
  },
  chartCardHeader: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  chartCardHeaderRTL: {flexDirection: 'row-reverse'},
  chartTitle: {fontSize: 13, fontWeight: '700', color: COLORS.text, textTransform: 'uppercase', letterSpacing: 0.5, flex: 1},
  chartCardBody: {marginTop: 14},
  toggleBtn: {flexDirection: 'row', alignItems: 'center', gap: 4},
  toggleBtnRTL: {flexDirection: 'row-reverse'},
  toggleBtnLabel: {fontSize: 12, fontWeight: '700', color: COLORS.primary},
  noDataText: {fontSize: 13, color: COLORS.textMuted, paddingVertical: 24},

  barChartRow: {flexDirection: 'row', alignItems: 'flex-end', gap: 6},
  barColumn: {flex: 1, alignItems: 'center', justifyContent: 'flex-end'},
  barValue: {fontSize: 10, fontWeight: '700', color: COLORS.text, marginBottom: 4},
  bar: {width: '70%', borderRadius: 6, minHeight: 4},
  barLabel: {fontSize: 9, color: COLORS.textMuted, textAlign: 'center'},

  lineChartRow: {flexDirection: 'row', alignItems: 'flex-start'},
  yAxisGutter: {width: LINE_CHART_Y_GUTTER, justifyContent: 'space-between', paddingRight: 6, paddingVertical: 0},
  axisLabel: {fontSize: 9, color: COLORS.textMuted, fontWeight: '600'},
  axisTitle: {fontSize: 10, color: COLORS.textMuted, fontWeight: '700', marginBottom: 4},
  xAxisRow: {flexDirection: 'row', marginTop: 4, marginLeft: LINE_CHART_Y_GUTTER},
  xAxisSlot: {flex: 1},
  legendRow: {flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 10},
  legendItem: {flexDirection: 'row', alignItems: 'center', gap: 5},
  legendDot: {width: 8, height: 8, borderRadius: 4},
  legendLabel: {fontSize: 11, color: COLORS.textMuted, fontWeight: '600'},
});

export default BankReportsScreen;
