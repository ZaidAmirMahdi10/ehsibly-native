import React, {useCallback, useContext, useEffect, useRef, useState} from 'react';
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
  ScrollView,
  RefreshControl,
  Modal,
  Platform,
  KeyboardAvoidingView,
  useWindowDimensions,
} from 'react-native';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTranslation} from 'react-i18next';
import {useNavigation} from '@react-navigation/native';
import Svg, {Circle, Defs, LinearGradient as SvgLinearGradient, Rect, Stop} from 'react-native-svg';
import {SlidersHorizontal, ArrowUp, X} from 'lucide-react-native';

import {LanguageContext} from '../../../App';
import {useAuth} from '../../context/AuthContext';
import CustomText from '../../components/CustomText';
import CustomInput from '../../components/CustomInput';
import SearchInput from '../../components/SearchInput';
import PrimaryButton from '../../components/PrimaryButton';
import ErrorState from '../../components/ErrorState';
import ListEmptyState from '../../components/ListEmptyState';
import LoadingState from '../../components/LoadingState';
import {tajawalStyleForWeight} from '../../constants/fonts';
import {COLORS, PRIMARY_SHADOW, CARD_SHADOW, makeShadow} from '../../constants/theme';
import {getBankApplications, getBankSubCompanies, getBankSuppliers} from '../../services/bank/bankApplications';

// A bank-admin-focused home screen, styled after the real HomeScreen.js's
// look (plain logo header, standalone shadowed collapsing card, card-based
// list) rather than a literal port of the web's Bank Applications table —
// see BankApplicationsScreen.js for that literal recreation, kept as-is.
// See BankHomeScreenOld.js for the pre-"rich redesign" snapshot of this file.
// Wired to the real /bankAndSubcompany/getBankMultiContainersInvoices
// endpoint — see services/bank/bankApplications.js and the
// categorizeApplication/mapRoleStatus/mapInvoice helpers below for how the
// backend's three-role (creator/auditor/executor) status matrix collapses
// into this card's single overall category + per-role badges.
//
// Filtering UI follows the design_handoff_bank_home_filtering package:
// one-tap status chips, a bottom-sheet advanced filter panel with typeahead
// sender/receiver search, per-search-type placeholders (date search types
// swap the search bar for From/To inputs — the backend has a single
// startDate/endDate pair that is only read for date `type`s, so there is
// deliberately no second "general" date range), removable applied-filter
// pills, and a newest/oldest sort toggle wired to the backend's own
// sortPayment=asc|desc param (it sorts by latest payment date).
const CARD_HEIGHT = 196;
const CARD_COLLAPSED_HEIGHT = 64;
const HEADER_HEIGHT = 60;
const PAGE_LIMIT = 20;

const RING_SIZE = 84;
const RING_SIZE_COLLAPSED = 34;
const RING_STROKE = 8;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const CATEGORY_STYLES = {
  awaiting: {tagBg: '#fff3d6', tagText: '#a6740a', accent: COLORS.pending, labelKey: 'bankHomeAwaitingYou'},
  inProgress: {tagBg: '#e3f2fd', tagText: '#1976d2', accent: '#3d9dd9', labelKey: 'bankHomeInProgress'},
  completed: {tagBg: '#e6f9f1', tagText: COLORS.success, accent: COLORS.success, labelKey: 'bankHomeCompleted'},
  rejected: {tagBg: '#fde8e8', tagText: COLORS.danger, accent: COLORS.danger, labelKey: 'bankHomeRejected'},
};

const ROLE_STATUS_COLORS = {
  approved: COLORS.success,
  pending: '#2196f3',
  rejected: COLORS.danger,
  notStarted: COLORS.textMuted,
};

const STATUS_CHIP_KEYS = ['all', 'awaiting', 'inProgress', 'completed', 'rejected'];

// The backend has a direct paymentsStatus filter for these three buckets
// (confirmed against bankAndSubcompanyController.js's non-executor branch),
// so those are done server-side for accurate pagination/counts. There's no
// equivalent "in progress" bucket server-side — that filter is applied
// client-side below via categorizeApplication, against whatever page is
// currently loaded.
const FILTER_TO_PAYMENTS_STATUS = {
  awaiting: 'unstartedPayments',
  completed: 'completed',
  rejected: 'rejected',
};

// The backend's `type` picks ONE search dimension per request — text types
// carry `query`, date types carry startDate/endDate. Values confirmed
// against getBankMultiContainersInvoices' own switch + post-fetch filters
// (invoiceNumber / transactionNum / paymentAmount / date / paymentsDate /
// executionDate). There is no "payment status" search type server-side —
// that's the independent paymentsStatus param the status chips drive — so
// the handoff prototype's "Payment status" chip is intentionally dropped.
const SEARCH_TYPE_OPTIONS = [
  {value: 'invoiceNumber', labelKey: 'invoiceNumberLabel', placeholderKey: 'bankSearchPlaceholder_invoiceNumber'},
  {value: 'date', labelKey: 'bankFiltersInvoiceDate', isDate: true},
  {value: 'paymentsDate', labelKey: 'bankFiltersPaymentDate', isDate: true},
  {value: 'executionDate', labelKey: 'bankFiltersExecutionDate', isDate: true},
  {value: 'paymentAmount', labelKey: 'paymentAmount', placeholderKey: 'bankSearchPlaceholder_paymentAmount'},
  {value: 'transactionNum', labelKey: 'transactionNumber', placeholderKey: 'bankSearchPlaceholder_transactionNum'},
];
const SEARCH_TYPE_BY_VALUE = Object.fromEntries(SEARCH_TYPE_OPTIONS.map(o => [o.value, o]));

// includeCompleted/includeRejected default ON to preserve this screen's
// existing behavior (it always sent both as true before the panel existed).
const DEFAULT_ADVANCED_FILTERS = {
  searchType: 'invoiceNumber',
  sender: null,
  receiver: null,
  includeCompleted: true,
  includeRejected: true,
};
const DATE_INPUT_RE = /^\d{4}-\d{2}-\d{2}$/;

const optionLabel = (opt, isRTL) =>
  (isRTL ? opt?.nameInAr || opt?.name : opt?.name || opt?.nameInAr) || '';

const FilterCheckRow = ({label, checked, onToggle, isRTL}) => (
  <TouchableOpacity
    style={[styles.checkRow, isRTL && styles.checkRowRTL]}
    activeOpacity={0.7}
    onPress={onToggle}>
    <View style={[styles.checkBox, checked && styles.checkBoxChecked]}>
      {checked ? (
        <CustomText style={styles.checkMark} paddingTop={0} lineHeight={16}>
          ✓
        </CustomText>
      ) : null}
    </View>
    <CustomText style={styles.checkLabel} paddingTop={0}>
      {label}
    </CustomText>
  </TouchableOpacity>
);

// Mirrors the backend's own bucketing (see the non-executor branch of
// getBankMultiContainersInvoices) rather than the web frontend's
// per-role getPaymentStatusBadge cascade, since this card shows one
// overall category badge, not a role-specific one.
//
// Verified 2026-07-09 against bankAndSubcompanyController.js directly: the
// three server-backed buckets below match its paymentsStatus filter
// branches line-for-line (unstartedPayments / completed / rejected). Note
// the bank endpoint does NOT return the merchant list's server-computed
// generalBadgeStatus field at all — that DTO field exists only on
// filteredMultiContainerInvoices — so re-deriving the bucket here is the
// only option, not a shortcut.
const categorizeApplication = item => {
  const latest = item.latestPaymentDetail;
  if (!latest) {
    return 'awaiting';
  }
  if (latest.creatorStatus === 'REJECTED' || latest.auditorStatus === 'REJECTED') {
    return 'rejected';
  }
  const totalPaid = item.totalPaid || 0;
  if (item.completedFullPyament || totalPaid >= item.amountForSupplier) {
    return 'completed';
  }
  if (
    (latest.creatorStatus === 'NOT_STARTED' && latest.creatorId === null) ||
    (latest.auditorStatus === 'NOT_STARTED' && latest.auditorId === null)
  ) {
    return 'awaiting';
  }
  return 'inProgress';
};

const ROLE_STATUS_MAP = {
  NOT_STARTED: 'notStarted',
  NOT_EXECUTED: 'notStarted',
  PENDING: 'pending',
  ACCEPTED: 'approved',
  EXECUTED: 'approved',
  REJECTED: 'rejected',
};
const mapRoleStatus = status => ROLE_STATUS_MAP[status] || 'notStarted';

// The role NAME (who) comes from bankCreator/bankAuditor/bankExecutor
// (the invoice's assigned people); the role STATUS comes from
// latestPaymentDetail's own creatorStatus/auditorStatus/executorStatus
// (the current payment's progress) — these are two different things on
// the real API that both feed the same RoleRow here.
const mapInvoice = item => ({
  id: item.id,
  invoiceNumber: item.invoiceNumber || '-',
  companyName: item.subCompany?.name,
  companyNameInAr: item.subCompany?.nameInAr,
  date: item.date ? item.date.split('T')[0] : '',
  amount: item.amountForSupplier != null ? item.amountForSupplier.toLocaleString() : '-',
  currency: item.currency || '',
  category: categorizeApplication(item),
  creator: {
    name: item.bankCreator?.name || null,
    status: mapRoleStatus(item.latestPaymentDetail?.creatorStatus),
  },
  auditor: {
    name: item.bankAuditor?.name || null,
    status: mapRoleStatus(item.latestPaymentDetail?.auditorStatus),
  },
  executor: {
    name: item.bankExecutor?.name || null,
    status: mapRoleStatus(item.latestPaymentDetail?.executorStatus),
  },
});

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

// The hero's 3-column Completed / Rejected / Total pill row, per the
// handoff design (replaces the old 2x2 icon-chip grid).
const HeroStatPill = ({color, label, value, isRTL}) => {
  // Plain Text (not CustomText) throughout the hero card, so it needs its
  // own Arabic font resolution here too — see the `af()` comment below.
  const valueFont = isRTL ? tajawalStyleForWeight('800') : null;
  const labelFont = isRTL ? tajawalStyleForWeight('600') : null;
  const align = {textAlign: isRTL ? 'right' : 'left'};

  return (
    <View style={styles.heroStatPill}>
      <Text style={[styles.heroStatValue, {color}, align, valueFont]}>{value}</Text>
      <Text style={[styles.heroStatLabel, align, labelFont]}>{label}</Text>
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
  const companyName = (isRTL ? app.companyNameInAr || app.companyName : app.companyName || app.companyNameInAr) || '-';

  const entrance = useRef(new Animated.Value(0)).current;
  const pressScale = useRef(new Animated.Value(1)).current;
  // Pure Animated expand/collapse (maxHeight + opacity), NOT LayoutAnimation:
  // this screen hosts react-native-svg (the hero ring, lucide icons), and
  // LayoutAnimation mutations over svg-containing subtrees are the exact
  // native Fabric SIGABRT (stable_sort) crash the Reports tab already hit —
  // see BankReportsScreen.js's ChartCard for the same pattern and history.
  // JS driver on purpose: maxHeight isn't native-drivable, and this value
  // stays on its own node so it never mixes drivers with entrance/pressScale.
  const expandAnim = useRef(new Animated.Value(isExpanded ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(entrance, {
      toValue: 1,
      duration: 380,
      delay: Math.min(index, 8) * 55,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [entrance, index]);

  useEffect(() => {
    Animated.timing(expandAnim, {
      toValue: isExpanded ? 1 : 0,
      duration: 240,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [expandAnim, isExpanded]);

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
        style={[styles.card, isRTL && styles.cardRTL]}
        activeOpacity={0.9}
        onPress={onToggle}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}>
        {/* Status accent bar hugs the reading-start edge (mirrors in RTL). */}
        <View style={[styles.cardAccent, {backgroundColor: cat.accent}]} />
        <View style={styles.cardBody}>
          <View style={[styles.cardTop, isRTL && styles.cardTopRTL]}>
            <View style={isRTL ? styles.cardLeftRTL : styles.cardLeft}>
              <CustomText style={styles.invoiceNumber} paddingTop={0}>
                {app.invoiceNumber}
              </CustomText>
              {/* Collapsed cards truncate long company names to keep rows
                  uniform; expanding the card reveals the full name, letting
                  the card grow as tall as the wrapped text needs. */}
              <CustomText style={styles.companyName} paddingTop={0} numberOfLines={isExpanded ? undefined : 1}>
                {companyName}
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

          <Animated.View
            style={{
              maxHeight: expandAnim.interpolate({inputRange: [0, 1], outputRange: [0, 240]}),
              opacity: expandAnim,
              overflow: 'hidden',
            }}>
            <View style={styles.roleBreakdown}>
              <RoleRow label={t('creator')} person={app.creator} isRTL={isRTL} />
              <RoleRow label={t('bankAuditorLabel')} person={app.auditor} isRTL={isRTL} />
              <RoleRow label={t('bankHomeExecutorLabel')} person={app.executor} isRTL={isRTL} />
            </View>
          </Animated.View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

// One-tap status chips (All + the four buckets), each with a live org-wide
// count — replaces the old filter-button-into-dropdown swap entirely.
const StatusChip = ({chipKey, label, count, active, onPress, isRTL}) => {
  const cat = CATEGORY_STYLES[chipKey];
  const activeColor = cat ? cat.tagText : COLORS.text;
  const chipStyle = active
    ? {backgroundColor: activeColor, borderColor: activeColor}
    : cat
      ? {backgroundColor: cat.tagBg, borderColor: 'transparent'}
      : {backgroundColor: COLORS.surface, borderColor: COLORS.border};
  const textColor = active ? '#fff' : activeColor;

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={[styles.statusChip, isRTL && styles.statusChipRTL, chipStyle]}>
      <CustomText style={[styles.statusChipLabel, {color: textColor}]} paddingTop={0}>
        {label}
      </CustomText>
      <CustomText style={[styles.statusChipCount, {color: textColor}]} paddingTop={0}>
        {count}
      </CustomText>
    </TouchableOpacity>
  );
};

// Removable pill summarizing one applied advanced-filter dimension.
const ActiveFilterPill = ({label, onClear, isRTL}) => (
  <View style={[styles.activePill, isRTL && styles.activePillRTL]}>
    <CustomText style={styles.activePillText} paddingTop={0}>
      {label}
    </CustomText>
    <TouchableOpacity
      onPress={onClear}
      hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}
      style={styles.activePillClear}>
      <X size={10} color="#fff" strokeWidth={3} />
    </TouchableOpacity>
  </View>
);

// Typeahead input for the bottom sheet's sender/receiver pickers: type to
// filter, tap a suggestion to select, ✕ clears both text and selection.
// Suggestions render inline (pushing content down) instead of an absolute
// overlay — inside the sheet's own ScrollView an overlay would fight
// z-order and touch handling for no visual gain at this size.
const TypeaheadField = ({label, placeholder, options, selected, onSelect, isRTL, t}) => {
  const [query, setQuery] = useState(() => optionLabel(selected, isRTL));
  const [focused, setFocused] = useState(false);

  const trimmed = query.trim();
  const lower = trimmed.toLowerCase();
  const suggestions = options
    .filter(
      o =>
        !trimmed ||
        (o.name || '').toLowerCase().includes(lower) ||
        (o.nameInAr || '').includes(trimmed),
    )
    .slice(0, 6);
  const showSuggestions = focused && !selected;

  return (
    <View style={styles.typeaheadBlock}>
      <CustomText style={styles.sheetSectionLabel} paddingTop={0}>
        {label}
      </CustomText>
      <View style={[styles.typeaheadInputRow, isRTL && styles.typeaheadInputRowRTL]}>
        <CustomText paddingTop={0}>🔍</CustomText>
        <CustomInput
          style={styles.typeaheadInput}
          placeholder={placeholder}
          placeholderTextColor={COLORS.textMuted}
          value={query}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onChangeText={v => {
            setQuery(v);
            if (selected) {
              onSelect(null);
            }
          }}
        />
        {selected ? (
          <TouchableOpacity
            onPress={() => {
              onSelect(null);
              setQuery('');
            }}
            hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}
            style={styles.typeaheadClear}>
            <X size={10} color={COLORS.primaryDark} strokeWidth={3} />
          </TouchableOpacity>
        ) : null}
      </View>
      {showSuggestions ? (
        <View style={styles.suggestionList}>
          {suggestions.length > 0 ? (
            suggestions.map((opt, idx) => (
              <TouchableOpacity
                key={String(opt.id)}
                style={[styles.suggestionRow, idx === suggestions.length - 1 && styles.suggestionRowLast]}
                onPress={() => {
                  onSelect(opt);
                  setQuery(optionLabel(opt, isRTL));
                  setFocused(false);
                }}>
                <CustomText style={styles.suggestionText} paddingTop={0} align={isRTL ? 'right' : 'left'}>
                  {optionLabel(opt, isRTL)}
                </CustomText>
              </TouchableOpacity>
            ))
          ) : (
            <CustomText style={styles.suggestionEmpty} paddingTop={0} align={isRTL ? 'right' : 'left'}>
              {t('bankFiltersNoMatches')}
            </CustomText>
          )}
        </View>
      ) : null}
    </View>
  );
};

// The advanced-filter bottom sheet: dimmed backdrop + slide-up white sheet
// with a drag-handle bar, per the handoff design. Draft edits live in the
// parent's draftFilters and only hit the network on Apply; closing via
// backdrop/✕ simply discards them (the parent re-seeds the draft from the
// applied filters on every open). Reset clears the DRAFT only.
// Pure Animated (opacity/translateY, native driver) — no LayoutAnimation
// anywhere near this screen's svg content (Fabric SIGABRT, see above).
const AdvancedFilterSheet = ({
  visible,
  onClose,
  onApply,
  onResetDraft,
  draft,
  setDraft,
  senderOptions,
  receiverOptions,
  isRTL,
}) => {
  const {t} = useTranslation();
  const insets = useSafeAreaInsets();
  const {height: windowHeight} = useWindowDimensions();
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const [rendered, setRendered] = useState(visible);
  // Bumped on Reset to remount the typeahead fields, clearing their local
  // query text along with the draft selections they mirror.
  const [resetNonce, setResetNonce] = useState(0);

  useEffect(() => {
    if (visible) {
      setRendered(true);
      Animated.parallel([
        Animated.timing(backdropAnim, {toValue: 1, duration: 200, useNativeDriver: true}),
        Animated.timing(slideAnim, {
          toValue: 1,
          duration: 280,
          easing: Easing.bezier(0.2, 0.9, 0.3, 1),
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(backdropAnim, {toValue: 0, duration: 180, useNativeDriver: true}),
        Animated.timing(slideAnim, {toValue: 0, duration: 220, easing: Easing.in(Easing.cubic), useNativeDriver: true}),
      ]).start(({finished}) => {
        if (finished) {
          setRendered(false);
        }
      });
    }
  }, [visible, backdropAnim, slideAnim]);

  if (!rendered) {
    return null;
  }

  const handleReset = () => {
    onResetDraft();
    setResetNonce(n => n + 1);
  };

  return (
    <Modal transparent visible animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.sheetRoot}>
        <Animated.View style={[styles.sheetBackdrop, {opacity: backdropAnim}]}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
        </Animated.View>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} pointerEvents="box-none">
          <Animated.View
            style={[
              styles.sheet,
              {
                // Numeric, not a percentage: the sheet's parent
                // (KeyboardAvoidingView) is auto-height, and a % maxHeight
                // against an auto parent resolves bogusly small — which was
                // silently crushing the ScrollView and hiding the lower
                // fields behind an internal scroll despite free space.
                maxHeight: Math.round(windowHeight * 0.86),
                marginBottom: insets.bottom + 10,
                transform: [{translateY: slideAnim.interpolate({inputRange: [0, 1], outputRange: [720, 0]})}],
              },
            ]}>
            <View style={styles.sheetHandle} />
            <View style={[styles.sheetHeader, isRTL && styles.sheetHeaderRTL]}>
              <CustomText style={styles.sheetTitle} paddingTop={0}>
                {t('bankFiltersSheetTitle')}
              </CustomText>
              <TouchableOpacity style={styles.sheetCloseBtn} onPress={onClose}>
                <X size={14} color={COLORS.primaryDark} strokeWidth={3} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.sheetScroll}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled">
              <CustomText style={styles.sheetSectionLabel} paddingTop={0}>
                {t('bankFiltersSearchByLabel')}
              </CustomText>
              <View style={[styles.searchTypeWrap, isRTL && styles.searchTypeWrapRTL]}>
                {SEARCH_TYPE_OPTIONS.map(opt => {
                  const active = draft.searchType === opt.value;
                  return (
                    <TouchableOpacity
                      key={opt.value}
                      activeOpacity={0.8}
                      onPress={() => setDraft({searchType: opt.value})}
                      style={[styles.searchTypeChip, active && styles.searchTypeChipActive]}>
                      <CustomText
                        style={[styles.searchTypeChipText, active && styles.searchTypeChipTextActive]}
                        paddingTop={0}>
                        {t(opt.labelKey)}
                      </CustomText>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <TypeaheadField
                key={`sender-${resetNonce}`}
                label={t('sendingCompanyLabel')}
                placeholder={t('bankFiltersSenderTypeahead')}
                options={senderOptions}
                selected={draft.sender}
                onSelect={opt => setDraft({sender: opt})}
                isRTL={isRTL}
                t={t}
              />
              <TypeaheadField
                key={`receiver-${resetNonce}`}
                label={t('bankFiltersReceiverLabel')}
                placeholder={t('bankFiltersReceiverTypeahead')}
                options={receiverOptions}
                selected={draft.receiver}
                onSelect={opt => setDraft({receiver: opt})}
                isRTL={isRTL}
                t={t}
              />

              <FilterCheckRow
                label={t('includeCompletedApplications')}
                checked={draft.includeCompleted}
                onToggle={() => setDraft({includeCompleted: !draft.includeCompleted})}
                isRTL={isRTL}
              />
              <FilterCheckRow
                label={t('includeRejectedApplications')}
                checked={draft.includeRejected}
                onToggle={() => setDraft({includeRejected: !draft.includeRejected})}
                isRTL={isRTL}
              />
            </ScrollView>

            <View style={[styles.filterActionsRow, isRTL && styles.filterActionsRowRTL]}>
              <View style={styles.filterActionBtn}>
                <PrimaryButton title={t('resetFiltersAction')} variant="secondary" onPress={handleReset} />
              </View>
              <View style={styles.filterActionBtn}>
                <PrimaryButton title={t('applyFiltersAction')} onPress={onApply} />
              </View>
            </View>
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const BankHomeScreen = () => {
  const {t} = useTranslation();
  const {session} = useAuth();
  const {currentDirection} = useContext(LanguageContext);
  const navigation = useNavigation();
  const isRTL = currentDirection === 'rtl';

  // Mirrors HomeScreen.js's own greeting logic: an "orgUser" login is an
  // individual working under the organization (greet them by name), while a
  // bare "organization" login has no individual behind it (greet the org).
  const greetingName =
    session?.userType === 'orgUser'
      ? session?.organization?.username || session?.organization?.name
      : session?.organization?.name;
  const userRole = session?.organization?.role;

  const [search, setSearch] = useState('');
  // From/To for the date search types — these replace the text search bar
  // whenever the applied searchType is a date field, and are the ONLY date
  // range UI (the backend reads startDate/endDate solely for date `type`s).
  const [searchFrom, setSearchFrom] = useState('');
  const [searchTo, setSearchTo] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [sortDir, setSortDir] = useState('newest');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [expandedId, setExpandedId] = useState(null);

  // Applied vs. draft advanced filters: sheet edits stage into the draft
  // and only hit the network when Apply is pressed; closing the sheet any
  // other way discards them (the draft is re-seeded from the applied
  // filters on every open).
  const [advancedFilters, setAdvancedFilters] = useState(DEFAULT_ADVANCED_FILTERS);
  const [draftFilters, setDraftFilters] = useState(DEFAULT_ADVANCED_FILTERS);
  const [senderOptions, setSenderOptions] = useState([]);
  const [receiverOptions, setReceiverOptions] = useState([]);
  const filterOptionsLoadedRef = useRef(false);

  const setDraft = patch => setDraftFilters(prev => ({...prev, ...patch}));
  // Pills apply instantly — patch both the applied filters and the draft so
  // reopening the sheet reflects what the pills now say.
  const patchAppliedFilters = patch => {
    setAdvancedFilters(prev => ({...prev, ...patch}));
    setDraftFilters(prev => ({...prev, ...patch}));
  };

  // Lazily fetch the sender/receiver typeahead data the first time the
  // sheet opens — both lists are org-wide and small enough to load once.
  const loadFilterOptions = useCallback(async () => {
    if (filterOptionsLoadedRef.current) {
      return;
    }
    filterOptionsLoadedRef.current = true;
    try {
      const [subs, sups] = await Promise.all([
        getBankSubCompanies({organizationName: session?.organization?.name}),
        getBankSuppliers({}),
      ]);
      setSenderOptions(subs?.subCompanies || []);
      setReceiverOptions(sups?.suppliers || []);
    } catch (err) {
      // Leave the typeaheads empty — the rest of the sheet still works.
      filterOptionsLoadedRef.current = false;
    }
  }, [session?.organization?.name]);

  const openSheet = () => {
    setDraftFilters(advancedFilters);
    loadFilterOptions();
    setSheetOpen(true);
  };

  const applyDraftFilters = () => {
    setAdvancedFilters(draftFilters);
    setSheetOpen(false);
  };

  const [applications, setApplications] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState(null);

  // Accurate org-wide counts fetched separately from the list itself
  // (limit: 1 each, reading only .totalInvoices) — computing these from
  // just the currently-loaded page would undercount as soon as pagination
  // or a filter narrows what's actually fetched. inProgress is the one
  // exception: there's no server-side bucket for it, so its chip count is
  // derived as total minus the three server-backed buckets (the backend's
  // own categorization is a cascade, so the four buckets partition the
  // total; clamped at 0 in case the independent count queries ever
  // double-count an edge case).
  const [heroStats, setHeroStats] = useState({
    awaitingCount: 0,
    completedCount: 0,
    rejectedCount: 0,
    totalCount: 0,
  });

  const abortControllerRef = useRef(null);

  const searchTypeMeta = SEARCH_TYPE_BY_VALUE[advancedFilters.searchType] || SEARCH_TYPE_OPTIONS[0];
  const isDateSearch = !!searchTypeMeta.isDate;
  const fromValid = !searchFrom || DATE_INPUT_RE.test(searchFrom.trim());
  const toValid = !searchTo || DATE_INPUT_RE.test(searchTo.trim());

  const fetchApplications = useCallback(
    async ({targetPage = 1, query = '', filter = activeFilter, append = false} = {}) => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        setError(null);
        const params = {
          page: targetPage,
          limit: PAGE_LIMIT,
          userRole,
          includeCompleted: advancedFilters.includeCompleted,
          includeRejected: advancedFilters.includeRejected,
          // Backend sorts by latest payment date; asc = oldest first.
          sortPayment: sortDir === 'oldest' ? 'asc' : 'desc',
        };
        if (advancedFilters.sender?.id) {
          params.subCompanyId = advancedFilters.sender.id;
        }
        if (advancedFilters.receiver?.id) {
          params.supplierId = advancedFilters.receiver.id;
        }
        // The backend applies exactly one search dimension per request via
        // `type`: date types read startDate/endDate, text types read query.
        params.type = advancedFilters.searchType;
        if (isDateSearch) {
          const from = searchFrom.trim();
          const to = searchTo.trim();
          if (from && DATE_INPUT_RE.test(from)) {
            params.startDate = from;
          }
          if (to && DATE_INPUT_RE.test(to)) {
            params.endDate = to;
          }
        } else if (query) {
          params.query = query;
        }
        const paymentsStatus = FILTER_TO_PAYMENTS_STATUS[filter];
        if (paymentsStatus) {
          params.paymentsStatus = paymentsStatus;
        }

        const data = await getBankApplications({...params, signal: controller.signal});
        let mapped = (data?.invoices || []).map(mapInvoice);
        // "In progress" has no server-side bucket — filter this page
        // client-side against the same categorization the badge itself uses.
        if (filter === 'inProgress') {
          mapped = mapped.filter(app => app.category === 'inProgress');
        }
        // Safety net over a backend gap in includeCompleted/includeRejected:
        // its exclusion conditions only match a rejection/completion PAIRED
        // with an invoice-level ACCEPTED/REJECTED status, so e.g. a payment
        // rejected while the invoice is still NOT_STARTED sails through
        // includeRejected=false (verified live: invoice 24000000008). Drop
        // anything whose derived badge contradicts an applied hide switch so
        // the list never shows a badge the user explicitly hid. Skipped when
        // a status chip is active, matching the backend's own
        // userIsFilteringByStatus bypass (an explicit chip wins over hides).
        // Same page-thinning caveat as the inProgress filter above.
        if (!FILTER_TO_PAYMENTS_STATUS[filter]) {
          if (!advancedFilters.includeCompleted) {
            mapped = mapped.filter(app => app.category !== 'completed');
          }
          if (!advancedFilters.includeRejected) {
            mapped = mapped.filter(app => app.category !== 'rejected');
          }
        }

        setApplications(prev => (append ? [...prev, ...mapped] : mapped));
        setTotalPages(data?.totalPages || 1);
        setPage(targetPage);
      } catch (err) {
        if (controller.signal.aborted) {
          return;
        }
        setError(t('genericErrorMessage'));
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
          setIsRefreshing(false);
          setIsLoadingMore(false);
        }
      }
    },
    [activeFilter, advancedFilters, userRole, sortDir, isDateSearch, searchFrom, searchTo, t],
  );

  const fetchHeroStats = useCallback(async () => {
    try {
      const [totalRes, awaitingRes, completedRes, rejectedRes] = await Promise.all([
        getBankApplications({limit: 1, userRole, includeCompleted: true, includeRejected: true}),
        getBankApplications({limit: 1, userRole, paymentsStatus: 'unstartedPayments'}),
        getBankApplications({limit: 1, userRole, paymentsStatus: 'completed', includeCompleted: true}),
        getBankApplications({limit: 1, userRole, paymentsStatus: 'rejected', includeRejected: true}),
      ]);
      setHeroStats({
        totalCount: totalRes?.totalInvoices || 0,
        awaitingCount: awaitingRes?.totalInvoices || 0,
        completedCount: completedRes?.totalInvoices || 0,
        rejectedCount: rejectedRes?.totalInvoices || 0,
      });
    } catch (err) {
      // Hero stats are a secondary summary — a failure here shouldn't
      // block the actual applications list from rendering.
    }
  }, [userRole]);

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      await Promise.all([fetchApplications({targetPage: 1}), fetchHeroStats()]);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-fetch whenever this tab regains focus, same reasoning as
  // HomeScreen.js's own focus listener.
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchApplications({targetPage: 1, query: search});
      fetchHeroStats();
    });
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigation]);

  // Debounced live search — covers both the text query and the From/To
  // date inputs. A partially-typed (invalid) date simply doesn't fetch yet
  // (the field shows a red border instead of alert-spamming per keystroke).
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (isDateSearch && (!fromValid || !toValid)) {
      return;
    }
    const timeout = setTimeout(() => {
      fetchApplications({targetPage: 1, query: search});
    }, 400);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, searchFrom, searchTo]);

  // Re-fetch when the status chip, sort direction, or the applied advanced
  // filters change (skips the very first mount, which the initial-load
  // effect covers).
  const isFirstFilterRender = useRef(true);
  useEffect(() => {
    if (isFirstFilterRender.current) {
      isFirstFilterRender.current = false;
      return;
    }
    setIsLoading(true);
    fetchApplications({targetPage: 1, query: search, filter: activeFilter});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFilter, advancedFilters, sortDir]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([
      fetchApplications({targetPage: 1, query: search}),
      fetchHeroStats(),
    ]);
  };

  const handleLoadMore = () => {
    if (isLoadingMore || isLoading || page >= totalPages) {
      return;
    }
    setIsLoadingMore(true);
    fetchApplications({targetPage: page + 1, query: search, append: true});
  };

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

  const setHeroCollapsed = collapsed => {
    if (isCollapsedRef.current === collapsed) {
      return;
    }
    isCollapsedRef.current = collapsed;
    Animated.timing(collapseAnim, {
      toValue: collapsed ? 1 : 0,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  };

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
      setHeroCollapsed(true);
    } else if (isCollapsedRef.current && y < EXPAND_SCROLL_THRESHOLD) {
      setHeroCollapsed(false);
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
  const amountFontSize = collapseAnim.interpolate({inputRange: [0, 1], outputRange: [38, 18]});
  // The ring stays visible while collapsing (unlike the stats pills, which
  // fade) — it just shrinks to fit the shorter card. The Svg itself fills
  // this wrapper (width/height "100%") with a fixed viewBox, so SVG handles
  // the internal rescaling natively as the wrapper's own size animates —
  // no separate transform layer needed, which also means nothing can knock
  // the centered percent-text overlay out of alignment.
  const ringWrapSize = collapseAnim.interpolate({inputRange: [0, 1], outputRange: [RING_SIZE, RING_SIZE_COLLAPSED]});
  // The percent label has to shrink in step with the ring itself, or it
  // no longer fits inside the smaller circle and pokes out past its edge.
  const ringTextFontSize = collapseAnim.interpolate({inputRange: [0, 1], outputRange: [15, 9]});
  // Opacity-only fading (like the stats pills get) still reserves the
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
    return tajawalStyleForWeight(weight);
  };

  const {awaitingCount, completedCount, rejectedCount, totalCount} = heroStats;
  const inProgressCount = Math.max(0, totalCount - awaitingCount - completedCount - rejectedCount);
  const completionPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const chipCounts = {
    all: totalCount,
    awaiting: awaitingCount,
    inProgress: inProgressCount,
    completed: completedCount,
    rejected: rejectedCount,
  };

  // Animated count-up for the hero number and the progress ring's sweep —
  // replays whenever the real awaiting/completion numbers actually change
  // (e.g. once the initial fetch resolves after mount), not just once.
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
  }, [awaitingCount, completionPercent]);

  const ringStrokeDashoffset = ringAnim.interpolate({
    inputRange: [0, 100],
    outputRange: [RING_CIRCUMFERENCE, 0],
    extrapolate: 'clamp',
  });

  const toggleExpand = id => {
    setExpandedId(prev => (prev === id ? null : id));
  };

  // How many advanced-filter dimensions are applied — drives the filter
  // button's purple/badged active state and the removable pills row.
  // The searchType choice itself isn't counted (it changes what the search
  // bar means, it doesn't narrow results by itself), matching the prototype.
  const advCount =
    (advancedFilters.sender ? 1 : 0) +
    (advancedFilters.receiver ? 1 : 0) +
    (!advancedFilters.includeCompleted ? 1 : 0) +
    (!advancedFilters.includeRejected ? 1 : 0);
  const hasAdvanced = advCount > 0;

  const activePills = [];
  if (advancedFilters.sender) {
    activePills.push({
      key: 'sender',
      label: t('bankFiltersPillFrom', {name: optionLabel(advancedFilters.sender, isRTL)}),
      clear: () => patchAppliedFilters({sender: null}),
    });
  }
  if (advancedFilters.receiver) {
    activePills.push({
      key: 'receiver',
      label: t('bankFiltersPillTo', {name: optionLabel(advancedFilters.receiver, isRTL)}),
      clear: () => patchAppliedFilters({receiver: null}),
    });
  }
  if (!advancedFilters.includeCompleted) {
    activePills.push({
      key: 'hideCompleted',
      label: t('bankFiltersPillHidingCompleted'),
      clear: () => patchAppliedFilters({includeCompleted: true}),
    });
  }
  if (!advancedFilters.includeRejected) {
    activePills.push({
      key: 'hideRejected',
      label: t('bankFiltersPillHidingRejected'),
      clear: () => patchAppliedFilters({includeRejected: true}),
    });
  }
  const clearAllAdvanced = () =>
    patchAppliedFilters({sender: null, receiver: null, includeCompleted: true, includeRejected: true});

  // Fade + slide the search slot in whenever the search bar swaps between
  // the text input and the From/To date pair, instead of an abrupt swap.
  const slotAnim = useRef(new Animated.Value(1)).current;
  // Drives the filter button's background/border color crossfade. Must stay
  // native-driven (RN 0.62+ supports native color animation) since this
  // button's transform (filterPressScale, below) is also native — mixing
  // drivers within one Animated.View's style object attaches the whole node
  // to native on the first native `.start()`, so a later JS-driven
  // `.start()` on a sibling value in that same style throws "Attempting to
  // run JS driven animation on animated node that has been moved to native
  // earlier".
  const filterActiveAnim = useRef(new Animated.Value(0)).current;
  const filterPressScale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    slotAnim.setValue(0);
    Animated.timing(slotAnim, {toValue: 1, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true}).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDateSearch]);
  useEffect(() => {
    Animated.timing(filterActiveAnim, {
      toValue: hasAdvanced ? 1 : 0,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasAdvanced]);

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

  // Sort toggle: single tap flips newest/oldest; the arrow flips with it
  // (pointing down = newest first / descending).
  const sortAnim = useRef(new Animated.Value(1)).current;
  const toggleSort = () => {
    const next = sortDir === 'newest' ? 'oldest' : 'newest';
    setSortDir(next);
    Animated.timing(sortAnim, {
      toValue: next === 'newest' ? 1 : 0,
      duration: 200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };
  const sortRotate = sortAnim.interpolate({inputRange: [0, 1], outputRange: ['0deg', '180deg']});

  // In RTL the chip row renders reversed and stays anchored at its right
  // edge (scrollToEnd on every content-size change — counts arriving from
  // the API widen the chips after first layout, so a one-shot anchor ends
  // up mid-row), so "الكل" leads from the right the way the rest of the
  // RTL layout reads.
  const chipScrollRef = useRef(null);
  const chipKeys = isRTL ? [...STATUS_CHIP_KEYS].reverse() : STATUS_CHIP_KEYS;

  const renderDateInput = (label, value, onChange, valid) => (
    <View style={styles.dateInputCol}>
      <CustomText style={styles.dateInputLabel} paddingTop={0}>
        {label}
      </CustomText>
      <CustomInput
        style={[styles.dateInput, !valid && styles.dateInputInvalid]}
        placeholder="YYYY-MM-DD"
        placeholderTextColor={COLORS.textMuted}
        value={value}
        onChangeText={onChange}
        keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'default'}
        autoCorrect={false}
      />
    </View>
  );

  const renderHeroSection = () => (
    <>
      <Animated.View style={[styles.heroCard, {height: cardHeight, overflow: 'hidden'}]}>
        {/* Diagonal primaryDark→primary gradient per the handoff design —
            drawn as an absolute-fill Svg since the app has no native
            gradient dependency (and shouldn't grow one for this). */}
        <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 100 100">
          <Defs>
            <SvgLinearGradient id="heroGradient" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={COLORS.primaryDark} />
              <Stop offset="1" stopColor={COLORS.primary} />
            </SvgLinearGradient>
          </Defs>
          <Rect x="0" y="0" width="100" height="100" fill="url(#heroGradient)" />
        </Svg>
        <View style={styles.heroContent}>
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

          <Animated.View style={[styles.heroStatsRow, isRTL && styles.heroStatsRowRTL, {opacity: statsOpacity}]}>
            <HeroStatPill color="#4ade80" label={t('bankHomeCompleted')} value={completedCount} isRTL={isRTL} />
            <HeroStatPill color="#f87171" label={t('bankHomeRejected')} value={rejectedCount} isRTL={isRTL} />
            <HeroStatPill color="#c4b5fd" label={t('bankHomeTotalApplications')} value={totalCount} isRTL={isRTL} />
          </Animated.View>
        </View>
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
          {isDateSearch ? (
            <View style={[styles.dateInputsRow, isRTL && styles.dateInputsRowRTL]}>
              {renderDateInput(t('bankFiltersFrom'), searchFrom, setSearchFrom, fromValid)}
              {renderDateInput(t('bankFiltersTo'), searchTo, setSearchTo, toValid)}
            </View>
          ) : (
            <SearchInput
              placeholder={t(searchTypeMeta.placeholderKey || 'bankSearchInputPlaceholder')}
              value={search}
              onChangeText={setSearch}
            />
          )}
        </Animated.View>
        <TouchableOpacity
          activeOpacity={1}
          onPress={openSheet}
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
            <SlidersHorizontal size={18} color={hasAdvanced ? '#fff' : COLORS.textMuted} />
            {hasAdvanced ? (
              <View style={[styles.filterBadge, isRTL ? styles.filterBadgeRTL : null]}>
                <Text style={styles.filterBadgeText}>{advCount}</Text>
              </View>
            ) : null}
          </Animated.View>
        </TouchableOpacity>
      </View>

      <ScrollView
        ref={chipScrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipsScroll}
        contentContainerStyle={styles.chipsRow}
        onContentSizeChange={() => {
          if (isRTL) {
            chipScrollRef.current?.scrollToEnd({animated: false});
          }
        }}>
        {chipKeys.map(key => (
          <StatusChip
            key={key}
            chipKey={key === 'all' ? null : key}
            label={t(key === 'all' ? 'bankHomeFilterAll' : CATEGORY_STYLES[key].labelKey)}
            count={chipCounts[key]}
            active={activeFilter === key}
            onPress={() => setActiveFilter(key)}
            isRTL={isRTL}
          />
        ))}
      </ScrollView>

      {activePills.length > 0 ? (
        <View style={[styles.activePillsRow, isRTL && styles.activePillsRowRTL]}>
          {activePills.map(pill => (
            <ActiveFilterPill key={pill.key} label={pill.label} onClear={pill.clear} isRTL={isRTL} />
          ))}
          <TouchableOpacity onPress={clearAllAdvanced} hitSlop={{top: 6, bottom: 6}}>
            <CustomText style={styles.clearAllText} paddingTop={0}>
              {t('bankFiltersClearAll')}
            </CustomText>
          </TouchableOpacity>
        </View>
      ) : null}

      <View style={[styles.sectionRow, isRTL && styles.sectionRowRTL]}>
        <CustomText style={styles.sectionTitle} paddingTop={0}>
          {t('bankHomeRecentApplications')}
        </CustomText>
        <TouchableOpacity style={[styles.sortBtn, isRTL && styles.sortBtnRTL]} activeOpacity={0.7} onPress={toggleSort}>
          <Animated.View style={{transform: [{rotate: sortRotate}]}}>
            <ArrowUp size={13} color={COLORS.primaryDark} strokeWidth={2.4} />
          </Animated.View>
          <CustomText style={styles.sortBtnText} paddingTop={0}>
            {t(sortDir === 'newest' ? 'bankSortNewest' : 'bankSortOldest')}
          </CustomText>
        </TouchableOpacity>
      </View>
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

      {error ? (
        <ErrorState message={error} onRetry={() => fetchApplications({targetPage: 1, query: search})} />
      ) : isLoading ? (
        <LoadingState />
      ) : (
        <FlatList
          data={applications}
          keyExtractor={item => item.id}
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{height: 10}} />}
          ListEmptyComponent={
            <ListEmptyState titleKey="bankNoApplicationsFound" subtitleKey="tryDifferentSearch" />
          }
          onScroll={handleScroll}
          scrollEventThrottle={16}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={COLORS.primary} />
          }
          onEndReachedThreshold={0.4}
          onEndReached={handleLoadMore}
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
      )}

      <AdvancedFilterSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onApply={applyDraftFilters}
        onResetDraft={() => setDraftFilters(DEFAULT_ADVANCED_FILTERS)}
        draft={draftFilters}
        setDraft={setDraft}
        senderOptions={senderOptions}
        receiverOptions={receiverOptions}
        isRTL={isRTL}
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

  list: {flex: 1},
  listContent: {paddingHorizontal: 16, paddingBottom: 30, flexGrow: 1},

  heroCard: {
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 20,
    backgroundColor: COLORS.primaryDark,
    ...PRIMARY_SHADOW,
  },
  heroContent: {flex: 1, padding: 18},
  heroTopRow: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},
  heroTopRowRTL: {flexDirection: 'row-reverse'},
  heroTextCol: {flex: 1},
  heroLabelRow: {flexDirection: 'row', alignItems: 'center', gap: 8},
  heroLabelRowRTL: {flexDirection: 'row-reverse'},
  liveDotWrap: {width: 8, height: 8, alignItems: 'center', justifyContent: 'center'},
  liveDotRing: {position: 'absolute', width: 8, height: 8, borderRadius: 4, backgroundColor: '#4ade80'},
  liveDotCore: {width: 6, height: 6, borderRadius: 3, backgroundColor: '#4ade80'},
  // includeFontPadding: Android-only (no-op on iOS). These are plain Text
  // nodes (not CustomText), so nothing pins their line boxes — Android's
  // default font padding on Tajawal's tall metrics inflates every line and
  // overflows the hero's fixed CARD_HEIGHT, clipping the bottom stat row.
  heroLabel: {
    color: COLORS.accent,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    includeFontPadding: false,
  },
  heroNumber: {color: '#fff', fontSize: 38, fontWeight: '800', letterSpacing: -1.2, marginTop: 6, includeFontPadding: false},
  heroTrendText: {color: 'rgba(255,255,255,0.65)', fontSize: 12, fontWeight: '600', includeFontPadding: false},
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
  heroRingText: {color: '#fff', fontSize: 15, fontWeight: '800', includeFontPadding: false},

  heroStatsRow: {flexDirection: 'row', gap: 8, marginTop: 16},
  heroStatsRowRTL: {flexDirection: 'row-reverse'},
  heroStatPill: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  heroStatValue: {fontSize: 14, fontWeight: '800', includeFontPadding: false},
  heroStatLabel: {color: 'rgba(255,255,255,0.6)', fontSize: 10, fontWeight: '600', includeFontPadding: false, marginTop: 1},

  searchFilterRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 12,
  },
  searchFilterRowRTL: {flexDirection: 'row-reverse'},
  slotAnimWrap: {flex: 1},
  dateInputsRow: {flexDirection: 'row', gap: 8},
  dateInputsRowRTL: {flexDirection: 'row-reverse'},
  dateInputCol: {flex: 1},
  dateInputLabel: {fontSize: 10, fontWeight: '700', color: COLORS.textMuted, marginBottom: 3, paddingHorizontal: 2},
  dateInput: {
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 10,
    paddingVertical: 10,
    fontSize: 12.5,
    color: COLORS.text,
  },
  dateInputInvalid: {borderColor: COLORS.danger},
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
  filterBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: COLORS.danger,
    borderWidth: 2,
    borderColor: COLORS.bg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  filterBadgeRTL: {right: undefined, left: -5},
  filterBadgeText: {color: '#fff', fontSize: 9, fontWeight: '800', includeFontPadding: false},

  // flexShrink: 0 matters: this ScrollView sits in the screen's tight fixed
  // column, and RN shrinks ScrollViews first when the column overflows —
  // without it the chips get crushed to a sliver while the FlatList below
  // takes the space. marginHorizontal (not contentContainer padding) keeps
  // the row inside the same 16pt gutter as every other component — explicit
  // user feedback: the chips must not run wider than the rest.
  chipsScroll: {flexGrow: 0, flexShrink: 0, marginBottom: 10, marginHorizontal: 16},
  chipsRow: {gap: 8},
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1.5,
  },
  statusChipRTL: {flexDirection: 'row-reverse'},
  statusChipLabel: {fontSize: 12.5, fontWeight: '700'},
  statusChipCount: {fontSize: 12.5, fontWeight: '800', opacity: 0.75},

  activePillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
    marginHorizontal: 16,
    marginBottom: 10,
  },
  activePillsRowRTL: {flexDirection: 'row-reverse'},
  activePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: '#d9c4ea',
    borderRadius: 999,
    paddingVertical: 5,
    paddingHorizontal: 6,
  },
  activePillRTL: {flexDirection: 'row-reverse'},
  activePillText: {fontSize: 11.5, fontWeight: '700', color: COLORS.primaryDark, paddingHorizontal: 5},
  activePillClear: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearAllText: {fontSize: 11.5, fontWeight: '700', color: COLORS.textMuted, paddingHorizontal: 8},

  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginBottom: 10,
  },
  sectionRowRTL: {flexDirection: 'row-reverse'},
  sectionTitle: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  sortBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 8,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  sortBtnRTL: {flexDirection: 'row-reverse'},
  sortBtnText: {fontSize: 11.5, fontWeight: '700', color: COLORS.primaryDark},

  card: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    ...CARD_SHADOW,
  },
  cardRTL: {flexDirection: 'row-reverse'},
  cardAccent: {width: 4},
  cardBody: {flex: 1, paddingVertical: 14, paddingHorizontal: 14},
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
  // style) always wins over whatever's set here — see the lineHeight={20}
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

  // The sheet floats as an inset card (side/bottom margins, fully rounded)
  // rather than bleeding edge-to-edge — explicit user feedback ("touching
  // the edges"), and it matches the app's card language anyway.
  sheetRoot: {flex: 1, justifyContent: 'flex-end', paddingHorizontal: 10},
  sheetBackdrop: {...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(26,15,38,0.45)'},
  sheet: {
    backgroundColor: COLORS.surface,
    borderRadius: 22,
    paddingTop: 10,
    paddingBottom: 18,
    paddingHorizontal: 18,
    ...makeShadow({y: -8, blur: 24, opacity: 0.18}),
  },
  sheetHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
    alignSelf: 'center',
    marginBottom: 12,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sheetHeaderRTL: {flexDirection: 'row-reverse'},
  sheetTitle: {fontSize: 16, fontWeight: '800', color: COLORS.text},
  sheetCloseBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetScroll: {flexGrow: 0},
  sheetSectionLabel: {fontSize: 11.5, fontWeight: '700', color: COLORS.textMuted, marginBottom: 6},

  searchTypeWrap: {flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16},
  searchTypeWrapRTL: {flexDirection: 'row-reverse'},
  searchTypeChip: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 9,
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchTypeChipActive: {backgroundColor: COLORS.primary, borderColor: COLORS.primary},
  searchTypeChipText: {fontSize: 12, fontWeight: '700', color: COLORS.text},
  searchTypeChipTextActive: {color: '#fff'},

  typeaheadBlock: {marginBottom: 14},
  typeaheadInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  typeaheadInputRowRTL: {flexDirection: 'row-reverse'},
  typeaheadInput: {flex: 1, fontSize: 13, color: COLORS.text, paddingVertical: 8},
  typeaheadClear: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestionList: {
    marginTop: 4,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    overflow: 'hidden',
  },
  suggestionRow: {
    paddingVertical: 10,
    paddingHorizontal: 13,
    borderBottomWidth: 1,
    borderBottomColor: '#f4f0f8',
  },
  suggestionRowLast: {borderBottomWidth: 0},
  suggestionText: {fontSize: 13, color: COLORS.text},
  suggestionEmpty: {fontSize: 12.5, color: COLORS.textMuted, paddingVertical: 10, paddingHorizontal: 13},

  checkRow: {flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8},
  checkRowRTL: {flexDirection: 'row-reverse'},
  checkBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
  },
  checkBoxChecked: {backgroundColor: COLORS.primary, borderColor: COLORS.primary},
  checkMark: {color: '#fff', fontSize: 13, fontWeight: '700'},
  checkLabel: {fontSize: 13, color: COLORS.text},
  filterActionsRow: {flexDirection: 'row', gap: 10, marginTop: 12},
  filterActionsRowRTL: {flexDirection: 'row-reverse'},
  filterActionBtn: {flex: 1},
});

export default BankHomeScreen;
