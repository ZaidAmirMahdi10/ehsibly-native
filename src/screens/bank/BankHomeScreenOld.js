import React, {useContext, useRef, useState} from 'react';
import {View, Text, Image, StyleSheet, TouchableOpacity, Animated, StatusBar, FlatList} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useTranslation} from 'react-i18next';
import {SlidersHorizontal} from 'lucide-react-native';

import {LanguageContext} from '../../../App';
import CustomText from '../../components/CustomText';
import SearchInput from '../../components/SearchInput';
import SelectField from '../../components/SelectField';
import {tajawalFamilyForWeight} from '../../constants/fonts';
import {COLORS, PRIMARY_SHADOW} from '../../constants/theme';

// Frozen snapshot of BankHomeScreen.js from before its "modern/rich redesign"
// pass — kept only as a rollback reference, not imported/wired anywhere.
// See BankHomeScreen.js for the current version.
//
// A bank-admin-focused home screen, styled after the real HomeScreen.js's
// look (plain logo header, standalone shadowed collapsing card, card-based
// list) rather than a literal port of the web's Bank Applications table —
// see BankApplicationsScreen.js for that literal recreation, kept as-is.
// Static preview data — see BankApplicationsScreen.js's header comment for
// why this isn't wired to the real bank backend.
const CARD_HEIGHT = 180;
const CARD_COLLAPSED_HEIGHT = 82;

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

const ApplicationCard = ({app, isRTL, isExpanded, onToggle}) => {
  const {t} = useTranslation();
  const cat = CATEGORY_STYLES[app.category];

  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.85} onPress={onToggle}>
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
          <CustomText style={styles.chevron} paddingTop={0} lineHeight={26}>
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
  );
};

const BankHomeScreen = () => {
  const {t} = useTranslation();
  const {currentDirection} = useContext(LanguageContext);
  const isRTL = currentDirection === 'rtl';

  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [filterMode, setFilterMode] = useState(false);
  const [expandedId, setExpandedId] = useState(null);

  const scrollY = useRef(new Animated.Value(0)).current;
  const cardHeight = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [CARD_HEIGHT, CARD_COLLAPSED_HEIGHT],
    extrapolate: 'clamp',
  });
  const statsOpacity = scrollY.interpolate({
    inputRange: [0, 60],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  // Plain Text, not CustomText: CustomText forces a lineHeight default of 20
  // regardless of what the style says, which clips a 34px digit — using
  // plain Text sidesteps that entirely and needs its own Arabic font
  // resolution instead, same approach as HomeScreen.js's own af(). The
  // number itself is never animated/shrunk (kept full-size at every scroll
  // position) since a shrinking hero number reads as "disappearing" when
  // the card collapses, which defeats the point of a collapsed summary.
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

  const filtered = MOCK_APPLICATIONS.filter(app => {
    if (activeFilter !== 'all' && app.category !== activeFilter) {
      return false;
    }
    if (search && !app.invoiceNumber.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    return true;
  });

  const toggleExpand = id => setExpandedId(prev => (prev === id ? null : id));

  const renderHeroSection = () => (
    <>
      <Animated.View style={[styles.heroCard, {height: cardHeight, overflow: 'hidden'}]}>
        <Text style={[styles.heroLabel, {textAlign: isRTL ? 'right' : 'left'}, af(styles.heroLabel)]}>
          {t('bankHomeAwaitingActionLabel')}
        </Text>
        <Text style={[styles.heroNumber, {textAlign: isRTL ? 'right' : 'left'}, af(styles.heroNumber)]}>
          {awaitingCount}
        </Text>
        <Animated.View style={[styles.heroStatsGrid, {opacity: statsOpacity}]}>
          <View style={[styles.heroStatsRow, isRTL && styles.heroStatsRowRTL]}>
            <View style={styles.heroStat}>
              <Text style={[styles.heroStatLabel, {textAlign: isRTL ? 'right' : 'left'}, af(styles.heroStatLabel)]}>
                {t('bankHomeCompletedToday')}
              </Text>
              <Text
                style={[
                  styles.heroStatVal,
                  {color: '#8ee6b8', textAlign: isRTL ? 'right' : 'left'},
                  af(styles.heroStatVal),
                ]}>
                {completedTodayCount}
              </Text>
            </View>
            <View style={styles.heroDivider} />
            <View style={styles.heroStat}>
              <Text style={[styles.heroStatLabel, {textAlign: isRTL ? 'right' : 'left'}, af(styles.heroStatLabel)]}>
                {t('bankHomeRejectedToday')}
              </Text>
              <Text
                style={[
                  styles.heroStatVal,
                  {color: '#f3a6a6', textAlign: isRTL ? 'right' : 'left'},
                  af(styles.heroStatVal),
                ]}>
                {rejectedTodayCount}
              </Text>
            </View>
          </View>
          <View style={[styles.heroStatsRow, isRTL && styles.heroStatsRowRTL]}>
            <View style={styles.heroStat}>
              <Text style={[styles.heroStatLabel, {textAlign: isRTL ? 'right' : 'left'}, af(styles.heroStatLabel)]}>
                {t('bankHomeTotalApplications')}
              </Text>
              <Text style={[styles.heroStatVal, {textAlign: isRTL ? 'right' : 'left'}, af(styles.heroStatVal)]}>
                {totalCount}
              </Text>
            </View>
            <View style={styles.heroDivider} />
            <View style={styles.heroStat}>
              <Text style={[styles.heroStatLabel, {textAlign: isRTL ? 'right' : 'left'}, af(styles.heroStatLabel)]}>
                {t('bankHomeNotStarted')}
              </Text>
              <Text style={[styles.heroStatVal, {textAlign: isRTL ? 'right' : 'left'}, af(styles.heroStatVal)]}>
                {notStartedCount}
              </Text>
            </View>
          </View>
        </Animated.View>
      </Animated.View>

      <View style={[styles.searchFilterRow, isRTL && styles.searchFilterRowRTL]}>
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
            style={styles.searchSlot}
            placeholder={t('bankSearchInputPlaceholder')}
            value={search}
            onChangeText={setSearch}
          />
        )}
        <TouchableOpacity
          style={[styles.filterIconBtn, filterMode && styles.filterIconBtnActive]}
          onPress={() => setFilterMode(prev => !prev)}>
          <SlidersHorizontal size={18} color={filterMode ? '#fff' : COLORS.textMuted} />
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

      <View style={[styles.header, {flexDirection: isRTL ? 'row-reverse' : 'row'}]}>
        <View style={[styles.headerLeft, {flexDirection: isRTL ? 'row-reverse' : 'row'}]}>
          <Image source={require('../../assets/logo.png')} style={styles.headerLogo} resizeMode="contain" />
          <View style={isRTL ? styles.headerTextRTL : null}>
            <Text style={[styles.headerSub, af(styles.headerSub)]}>{t('bankHomeWelcomeBack')}</Text>
            <Text style={[styles.headerTitle, af(styles.headerTitle)]} numberOfLines={1}>
              {t('bankOrgName')}
            </Text>
          </View>
        </View>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>BA</Text>
        </View>
      </View>

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
        onScroll={Animated.event([{nativeEvent: {contentOffset: {y: scrollY}}}], {useNativeDriver: false})}
        scrollEventThrottle={16}
        renderItem={({item}) => (
          <ApplicationCard
            app={item}
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
    borderRadius: 18,
    backgroundColor: COLORS.primaryDark,
    padding: 18,
    ...PRIMARY_SHADOW,
  },
  heroLabel: {
    color: COLORS.accent,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  heroNumber: {color: '#fff', fontSize: 34, fontWeight: '800', letterSpacing: -1, marginTop: 4},
  heroStatsRow: {flexDirection: 'row', alignItems: 'center'},
  heroStatsRowRTL: {flexDirection: 'row-reverse'},
  heroStat: {flex: 1},
  heroDivider: {width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.15)', marginHorizontal: 16},
  heroStatLabel: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  heroStatVal: {color: '#fff', fontSize: 16, fontWeight: '700', marginTop: 2},
  heroStatsGrid: {marginTop: 14, gap: 8},

  searchFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 18,
    marginBottom: 20,
  },
  searchFilterRowRTL: {flexDirection: 'row-reverse'},
  searchSlot: {flex: 1},
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
  filterIconBtnActive: {backgroundColor: COLORS.primary, borderColor: COLORS.primary},

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
  cardTop: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start'},
  cardTopRTL: {flexDirection: 'row-reverse'},
  cardLeft: {flex: 1, paddingRight: 12},
  cardLeftRTL: {flex: 1, paddingLeft: 12, alignItems: 'flex-end'},
  cardRight: {alignItems: 'flex-end', gap: 6},
  cardRightRTL: {alignItems: 'flex-start', gap: 6},
  invoiceNumber: {fontSize: 14, fontWeight: '700', color: COLORS.text, letterSpacing: 0.2},
  companyName: {fontSize: 13, color: COLORS.textMuted, marginTop: 3},
  dateText: {fontSize: 11, color: COLORS.textMuted, marginTop: 6},
  amountText: {fontSize: 16, color: COLORS.text, letterSpacing: -0.3},
  overallBadge: {flexDirection: 'row', alignItems: 'center', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, gap: 4},
  overallBadgeRTL: {flexDirection: 'row-reverse'},
  overallBadgeDot: {width: 6, height: 6, borderRadius: 3},
  overallBadgeText: {fontSize: 11, fontWeight: '700'},
  // CustomText's own `lineHeight` prop (passed at each call site, not this
  // style) always wins over whatever's set here — see the lineHeight={26}
  // on the call site for why this can't just live in the StyleSheet.
  chevron: {fontSize: 22, color: COLORS.primaryLight, marginTop: 4},

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
