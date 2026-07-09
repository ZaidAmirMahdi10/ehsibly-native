import React, {createContext, useContext, useEffect, useState, useCallback, useRef, useMemo} from 'react';
import {View, StyleSheet, ScrollView, TouchableOpacity, useWindowDimensions, Animated, Easing} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useTranslation} from 'react-i18next';
import Svg, {Polyline} from 'react-native-svg';
import {ChevronLeft, ChevronRight, ChevronDown} from 'lucide-react-native';

import {LanguageContext} from '../../../App';
import CustomText from '../../components/CustomText';
import SelectField from '../../components/SelectField';
import ErrorState from '../../components/ErrorState';
import LoadingState from '../../components/LoadingState';
import {COLORS, CARD_SHADOW} from '../../constants/theme';
import {getBankReportsAnalytics} from '../../services/bank/bankReports';

// Native counterpart to ehsibly-frontend/src/pages/banks/BankReports.js.
// That page uses Chart.js; there's no equivalent charting library pulled
// into this app, so the bar/line charts here are small hand-rolled
// components (Views for bars, an SVG Polyline per series for lines) rather
// than a port of Chart.js's gradient/hatch-pattern styling. Only
// yearly/monthly/daily periods are wired up — the web version's
// weekly/range pickers need native date-range UI this app doesn't have
// yet, so they're left out rather than half-built.
const PERIOD = {YEARLY: 'yearly', MONTHLY: 'monthly', DAILY: 'daily'};

const CATEGORY_COLORS = {
  total: COLORS.primary,
  accepted: COLORS.success,
  executed: '#f9c058',
  bawales: '#03a9f4',
  pending: COLORS.pending,
  notStarted: COLORS.textMuted,
  rejected: COLORS.danger,
};

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

const StatCard = ({label, value, color}) => (
  <View style={[styles.statCard, {borderTopColor: color}]}>
    {/* CustomText's default lineHeight (20) clips a bold 20px digit in the
        English font's metrics — same issue BankHomeScreen.js's hero number
        works around, just via an explicit lineHeight here instead of
        switching to plain Text, since this value doesn't need af()'s
        Arabic-weight font resolution. */}
    <CustomText style={styles.statValue} paddingTop={0} lineHeight={26}>
      {value}
    </CustomText>
    <CustomText style={styles.statLabel} paddingTop={2}>
      {label}
    </CustomText>
  </View>
);

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
const LineChart = ({series, labels, height = 160, width}) => {
  const allValues = series.flatMap(s => s.data);
  const max = Math.max(...allValues, 1);
  const stepX = labels.length > 1 ? width / (labels.length - 1) : width;
  const toY = v => height - (v / max) * (height - 8) - 4;

  return (
    <View>
      <Svg width={width} height={height}>
        {series.map((s, index) => (
          <AnimatedLineSeries
            key={s.label}
            s={s}
            index={index}
            points={s.data.map((v, i) => `${i * stepX},${toY(v)}`).join(' ')}
          />
        ))}
      </Svg>
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
  const [period, setPeriod] = useState(PERIOD.MONTHLY);
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

        <View style={[styles.filterRow, isRTL && styles.filterRowRTL]}>
          <View style={styles.filterField}>
            <SelectField
              style={styles.filterSelect}
              value={periodOptions.find(o => o.value === period)}
              options={periodOptions}
              onSelect={opt => setPeriod(opt.value)}
              getLabel={opt => t(opt.labelKey)}
              getKey={opt => opt.value}
            />
          </View>

          {period === PERIOD.YEARLY && (
            <View style={styles.filterFieldNarrow}>
              <SelectField
                style={styles.filterSelect}
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
                <ChevronLeft size={18} color={COLORS.text} />
              </TouchableOpacity>
              <CustomText style={styles.stepperLabel} paddingTop={0}>
                {`${MONTH_NAMES_EN[monthCursor.getMonth()]} ${monthCursor.getFullYear()}`}
              </CustomText>
              <TouchableOpacity onPress={() => shiftMonth(1)} style={styles.stepperBtn}>
                <ChevronRight size={18} color={COLORS.text} />
              </TouchableOpacity>
            </View>
          )}

          {period === PERIOD.DAILY && (
            <View style={[styles.stepperRow, isRTL && styles.stepperRowRTL]}>
              <TouchableOpacity onPress={() => shiftDay(-1)} style={styles.stepperBtn}>
                <ChevronLeft size={18} color={COLORS.text} />
              </TouchableOpacity>
              <CustomText style={styles.stepperLabel} paddingTop={0}>
                {dayCursor.toISOString().split('T')[0]}
              </CustomText>
              <TouchableOpacity onPress={() => shiftDay(1)} style={styles.stepperBtn}>
                <ChevronRight size={18} color={COLORS.text} />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {error ? (
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
              <StatCard label={t('bawales')} value={summary.bawalesTotal} color={CATEGORY_COLORS.bawales} />
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
                <LineChart series={overviewLineSeries} labels={overviewLine.labels} width={chartWidth} />
              </ChartCard>
            </RevealCard>

            <RevealCard controller={revealController}>
              <ChartCard title={t('revenueMetrics')} isEmpty={!hasData} emptyLabel={t('noDataForPeriod')} isRTL={isRTL} onExpanded={scrollCardIntoView}>
                <LineChart series={profitSeries} labels={profitLine.labels} width={chartWidth} />
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

  filterRow: {flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap'},
  filterRowRTL: {flexDirection: 'row-reverse'},
  filterField: {minWidth: 130},
  filterFieldNarrow: {minWidth: 100},
  // SelectField carries its own form-layout bottom margin; inside this
  // center-aligned filter row that margin shoves the closed field up
  // relative to the stepper, so zero it out here.
  filterSelect: {marginBottom: 0},
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 8,
    // 9 (not 10) so the stepper's total height (26px chevron buttons + 18px
    // padding + 2px border) exactly matches SelectField's closed height.
    paddingVertical: 9,
  },
  stepperRowRTL: {flexDirection: 'row-reverse'},
  stepperBtn: {padding: 4},
  stepperLabel: {fontSize: 13, fontWeight: '700', color: COLORS.text, minWidth: 100, textAlign: 'center'},

  statsGrid: {flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16},
  statCard: {
    flexBasis: '31%',
    flexGrow: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderTopWidth: 3,
    padding: 12,
    ...CARD_SHADOW,
  },
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

  legendRow: {flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 10},
  legendItem: {flexDirection: 'row', alignItems: 'center', gap: 5},
  legendDot: {width: 8, height: 8, borderRadius: 4},
  legendLabel: {fontSize: 11, color: COLORS.textMuted, fontWeight: '600'},
});

export default BankReportsScreen;
