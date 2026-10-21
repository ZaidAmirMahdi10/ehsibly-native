import React, {useState, useContext, useRef, useCallback, useEffect} from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  StatusBar,
  Animated,
  Easing,
  RefreshControl,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {SlidersHorizontal, X} from 'lucide-react-native';
import {useTranslation} from 'react-i18next';
import {useNavigation} from '@react-navigation/native';

import {LanguageContext} from '../../../App';
import {useAuth} from '../../context/AuthContext';
import {tajawalStyleForWeight} from '../../constants/fonts';
import {COLORS, CARD_SHADOW, PRIMARY_SHADOW} from '../../constants/theme';
import StatusBadge from '../../components/StatusBadge';
import ListEmptyState from '../../components/ListEmptyState';
import ErrorState from '../../components/ErrorState';
import SearchInput from '../../components/SearchInput';
import InvoiceInfoModal from '../../components/InvoiceInfoModal';
import SelectField from '../../components/SelectField';
import CustomInput from '../../components/CustomInput';
import {
  getMultiContainerInvoices,
  getArchivedMultiContainerInvoices,
} from '../../services/invoices/multiContainerWithoutC';
import {getSuppliers} from '../../services/suppliers';
import {getFilteredSubCompanies} from '../../services/subCompanies';

const CARD_HEIGHT = 132;
const CARD_COLLAPSED_HEIGHT = 60;
const PAGE_LIMIT = 15;

const HomeScreen = () => {
  const {t} = useTranslation();
  const {currentDirection} = useContext(LanguageContext);
  const {session} = useAuth();
  const navigation = useNavigation();
  const isRTL = currentDirection === 'rtl';
  // Was a single static {fontFamily: TAJAWAL_REGULAR} applied everywhere —
  // since most of this screen's text styles set their own fontWeight
  // (600/700/800), forcing the Regular file's exact filename alongside a
  // heavier weight silently fell back to the system font on Android
  // (no shared-family weight matching there like iOS). This resolves the
  // real matching Tajawal file per the specific style(s) being combined.
  const af = (...stylesToCheck) => {
    if (!isRTL) {
      return null;
    }
    const weight = StyleSheet.flatten(stylesToCheck)?.fontWeight;
    // letterSpacing: 0 for Arabic-script text: positive tracking breaks
    // Sorani Kurdish into disconnected isolated glyphs on iOS (see
    // BankHomeScreen's af() for the full story), and letter-spacing a
    // cursive script is wrong typographically anyway.
    return {...tajawalStyleForWeight(weight), letterSpacing: 0};
  };

  const [search, setSearch] = useState('');
  const [invoices, setInvoices] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState(null);

  // Collapse is a discrete two-state transition (collapseAnim: 0 expanded,
  // 1 collapsed) driven by crossing a scroll threshold, not a continuous
  // per-pixel readout of scroll position — see BankHomeScreen.js's own
  // collapseAnim comment for why (Android JS-thread jank on every scroll
  // frame, and short/filtered lists getting stuck mid-collapse).
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
  const amountFontSize = collapseAnim.interpolate({inputRange: [0, 1], outputRange: [34, 18]});

  // Mirrors the web's invoices / bank-applications pages: the same two
  // filters (company, supplier) feed both tabs, each tab has its own search
  // types, and only invoices have an Active/Archived switch.
  const isOrgUser = session?.userType === 'orgUser';
  const [tab, setTab] = useState('invoices');
  const [archived, setArchived] = useState(false);
  const [searchType, setSearchType] = useState('invoiceNumber');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [bankStatus, setBankStatus] = useState('');
  const allOption = {id: 'All', name: t('selectAll'), nameInAr: t('selectAll')};
  const sessionCompany = session?.organization?.subCompanyId
    ? {
        id: session.organization.subCompanyId,
        name: session.organization.subCompanyName,
        nameInAr: session.organization.subCompanyNameInAr,
      }
    : null;
  // Same rule as the web login: the account starts scoped to its own company
  // (an orgUser's, or the organization's default) and can widen to "All".
  const [company, setCompany] = useState(sessionCompany || allOption);
  const [supplier, setSupplier] = useState(allOption);
  const [companyOptions, setCompanyOptions] = useState([]);
  const [supplierOptions, setSupplierOptions] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const [subs, sups] = await Promise.all([
          getFilteredSubCompanies({page: 1, limit: 100}),
          getSuppliers({page: 1, limit: 100}),
        ]);
        setCompanyOptions(subs?.subCompanies || []);
        setSupplierOptions(sups?.suppliers || []);
      } catch (err) {
        // Pickers just stay on "All" — the lists themselves still load.
      }
    })();
  }, []);

  const searchTypes =
    tab === 'invoices'
      ? [
          {value: 'invoiceNumber', labelKey: 'bankSearchByInvoiceNumber'},
          {value: 'amountForSupplier', labelKey: 'merchantSearchByAmount'},
          {value: 'date', labelKey: 'merchantSearchByDate'},
        ]
      : [
          {value: 'invoiceNumber', labelKey: 'bankSearchByInvoiceNumber'},
          {value: 'date', labelKey: 'merchantSearchByDate'},
          {value: 'status', labelKey: 'merchantSearchByStatus'},
        ];
  const bankStatusOptions = [
    {id: '', labelKey: 'selectAll'},
    {id: 'completed', labelKey: 'merchantStatusCompleted'},
    {id: 'uncompleted', labelKey: 'merchantStatusIncomplete'},
  ];
  const isDateSearch = searchType === 'date';
  const isStatusSearch = tab === 'bank' && searchType === 'status';
  const datesValid =
    (!startDate || /^\d{4}-\d{2}-\d{2}$/.test(startDate)) &&
    (!endDate || /^\d{4}-\d{2}-\d{2}$/.test(endDate));

  const fetchInvoices = useCallback(
    async ({targetPage = 1, append = false} = {}) => {
      try {
        // supplierId defaults server-side to the user's/org's "current
        // supplier" if omitted (a stateful, unrelated leftover from some
        // other flow) — passing the explicit "All" sentinel is the only way
        // to reliably get the unfiltered list, confirmed against the real
        // backend controller.
        const params = {
          page: targetPage,
          limit: PAGE_LIMIT,
          supplierId: supplier?.id ?? 'All',
        };
        if (company?.id && company.id !== 'All') {
          params.subCompanyId = company.id;
        }
        if (isDateSearch) {
          params.type = 'date';
          if (startDate) {
            params.startDate = startDate;
          }
          if (endDate) {
            params.endDate = endDate;
          }
        } else if (isStatusSearch) {
          if (bankStatus) {
            params.type = 'status';
            params.status = bankStatus;
          }
        } else if (search) {
          params.type = searchType;
          params.query = search;
        }
        const useArchived = tab === 'invoices' && archived;
        if (useArchived) {
          params.customerId = 'All';
          params.userId = session?.userId ?? undefined;
          params.organizationId = session?.organization?.id;
        }
        const data = useArchived
          ? await getArchivedMultiContainerInvoices(params)
          : await getMultiContainerInvoices(params);
        setInvoices(prev => (append ? [...prev, ...(data?.invoices || [])] : data?.invoices || []));
        setTotalPages(data?.totalPages || 1);
        setTotalRecords(data?.totalInvoices || 0);
        setPage(targetPage);
        setError(null);
      } catch (err) {
        setError(t('genericErrorMessage'));
      }
    },
    [
      company,
      supplier,
      tab,
      archived,
      searchType,
      search,
      startDate,
      endDate,
      bankStatus,
      isDateSearch,
      isStatusSearch,
      session?.userId,
      session?.organization?.id,
      t,
    ],
  );

  // Always-current handle for listeners registered once (tab focus).
  const fetchRef = useRef(fetchInvoices);
  fetchRef.current = fetchInvoices;

  // Any filter change (and the first mount) re-queries from page 1. Typed
  // text is debounced — relying only on onSubmitEditing is unreliable
  // across keyboards/input methods.
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (!datesValid) {
      return undefined;
    }
    const delay = isFirstRender.current ? 0 : 400;
    const timeout = setTimeout(async () => {
      if (isFirstRender.current) {
        setIsLoading(true);
      }
      await fetchInvoices({targetPage: 1});
      isFirstRender.current = false;
      setIsLoading(false);
    }, delay);
    return () => clearTimeout(timeout);
  }, [fetchInvoices, datesValid]);

  // Re-fetch whenever this tab regains focus (e.g. after creating an
  // invoice and navigating back) so the list doesn't go stale silently.
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if (!isFirstRender.current) {
        fetchRef.current({targetPage: 1});
      }
    });
    return unsubscribe;
  }, [navigation]);

  const switchTab = next => {
    if (next === tab) {
      return;
    }
    setTab(next);
    setSearchType('invoiceNumber');
    setSearch('');
    setStartDate('');
    setEndDate('');
    setBankStatus('');
    setArchived(false);
  };

  const changeSearchType = next => {
    setSearchType(next);
    setSearch('');
    setStartDate('');
    setEndDate('');
    setBankStatus('');
  };

  const handleSearchSubmit = async () => {
    setIsLoading(true);
    await fetchInvoices({targetPage: 1});
    setIsLoading(false);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchInvoices({targetPage: 1});
    setIsRefreshing(false);
  };

  const handleLoadMore = async () => {
    if (isLoadingMore || page >= totalPages) {
      return;
    }
    setIsLoadingMore(true);
    await fetchInvoices({targetPage: page + 1, append: true});
    setIsLoadingMore(false);
  };

  const optionName = o => (isRTL ? o?.nameInAr || o?.name : o?.name || o?.nameInAr) || '';
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [infoInvoiceId, setInfoInvoiceId] = useState(null);
  const rowDir = isRTL ? 'row-reverse' : 'row';

  // Applied-filter summary: one removable pill per non-default dimension.
  const activePills = [];
  if (company?.id !== 'All') {
    activePills.push({key: 'company', label: optionName(company), clear: () => setCompany(allOption)});
  }
  if (supplier?.id !== 'All') {
    activePills.push({key: 'supplier', label: optionName(supplier), clear: () => setSupplier(allOption)});
  }
  if (tab === 'invoices' && archived) {
    activePills.push({key: 'archived', label: t('merchantStatusArchived'), clear: () => setArchived(false)});
  }
  if (isDateSearch && (startDate || endDate)) {
    activePills.push({
      key: 'date',
      label: `${startDate || '…'} → ${endDate || '…'}`,
      clear: () => {
        setStartDate('');
        setEndDate('');
      },
    });
  }
  if (isStatusSearch && bankStatus) {
    activePills.push({
      key: 'status',
      label: t(bankStatusOptions.find(o => o.id === bankStatus)?.labelKey),
      clear: () => setBankStatus(''),
    });
  }

  const paidPercent = item => {
    const total = (item.totalPaid || 0) + (item.remainingAmount || 0);
    return total === 0 ? 0 : Math.round(((item.totalPaid || 0) / total) * 10000) / 100;
  };

  // Same gating as the web: archived invoices aren't openable, and a bank
  // transaction's payments view only exists for Bank of Baghdad applications.
  const BAGHDAD_BANK = 'مصرف بغداد';
  const renderBankItem = ({item}) => {
    const canOpenBankRow = item.applicationBank?.name === BAGHDAD_BANK;
    // Web's `canceled-invoice` row: blue, struck-through text.
    const struck = item.canceled || item.archived ? styles.canceledText : null;
    return (
    <TouchableOpacity
      style={[styles.txCard, {flexDirection: isRTL ? 'row-reverse' : 'row'}]}
      activeOpacity={0.82}
      disabled={!canOpenBankRow}
      onPress={() => navigation.navigate('InvoiceDetail', {invoice: item})}>
      <View
        style={[
          styles.txCardLeft,
          isRTL && {paddingRight: 0, paddingLeft: 12, alignItems: 'flex-end'},
        ]}>
        <Text style={[styles.txInvoice, af(styles.txInvoice), struck]} numberOfLines={1}>
          {item.invoiceNumber}
        </Text>
        <Text style={[styles.txParty, af(styles.txParty), struck]} numberOfLines={1}>
          {item.applicationBank?.name || t('merchantNotFound')}
        </Text>
        <Text style={[styles.txDate, af(styles.txDate), struck]} numberOfLines={1}>
          {(item.date ? new Date(item.date).toISOString().split('T')[0] : '') +
            (item.createdBy ? `  ·  ${item.createdBy}` : '')}
        </Text>
      </View>

      <View style={[styles.txCardRight, isRTL && {alignItems: 'flex-start'}]}>
        <Text style={[styles.txAmount, af(styles.txAmount), struck]}>{paidPercent(item)}%</Text>
        <StatusBadge status={item.generalBadgeStatus} />
        {isOrgUser && item.totalPaid !== item.amountForSupplier ? (
          <TouchableOpacity
            hitSlop={{top: 6, bottom: 6, left: 6, right: 6}}
            onPress={() => navigation.navigate('GenerateApplication', {invoice: item})}>
            <Text style={[styles.txAction, af(styles.txAction)]}>
              {t(item.canEditPayment ? 'merchantEditApplication' : 'merchantGenerateApplication')}
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </TouchableOpacity>
    );
  };

  const renderItem = ({item}) => (
    <TouchableOpacity
      style={[styles.txCard, {flexDirection: isRTL ? 'row-reverse' : 'row'}]}
      activeOpacity={0.82}
      disabled={archived}
      onPress={() => navigation.navigate('InvoiceDetail', {invoice: item})}>
      <View
        style={[
          styles.txCardLeft,
          isRTL && {paddingRight: 0, paddingLeft: 12, alignItems: 'flex-end'},
        ]}>
        <Text style={[styles.txInvoice, af(styles.txInvoice), archived && styles.archivedInvoice]} numberOfLines={1}>
          {item.invoiceNumber}
        </Text>
        <Text style={[styles.txParty, af(styles.txParty)]} numberOfLines={1}>
          {item.supplier?.name}
        </Text>
        <Text style={[styles.txDate, af(styles.txDate)]}>
          {item.date ? new Date(item.date).toISOString().split('T')[0] : ''}
        </Text>
      </View>

      <View style={[styles.txCardRight, isRTL && {alignItems: 'flex-start'}]}>
        <Text style={[styles.txAmount, af(styles.txAmount)]}>{item.amount}</Text>
        <StatusBadge status={item.generalBadgeStatus} />
        <TouchableOpacity
          hitSlop={{top: 6, bottom: 6, left: 6, right: 6}}
          onPress={() => setInfoInvoiceId(item.id)}>
          <Text style={[styles.txAction, af(styles.txAction)]}>{t('infoViewAction')}</Text>
        </TouchableOpacity>
        <Text style={styles.txChevron}>{isRTL ? '‹' : '›'}</Text>
      </View>
    </TouchableOpacity>
  );

  const listHeader = (
    <View>
      <View style={[styles.tabsRow, {flexDirection: rowDir}]}>
        {[
          {key: 'invoices', labelKey: 'merchantTabInvoices'},
          {key: 'bank', labelKey: 'merchantTabBank'},
        ].map(item => {
          const active = tab === item.key;
          return (
            <TouchableOpacity
              key={item.key}
              activeOpacity={0.85}
              style={[styles.tabBtn, active && styles.tabBtnActive]}
              onPress={() => switchTab(item.key)}>
              <Text style={[styles.tabText, active && styles.tabTextActive, af(styles.tabText)]}>
                {t(item.labelKey)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={[styles.searchRow, {flexDirection: rowDir}]}>
        {isDateSearch || isStatusSearch ? (
          <TouchableOpacity
            activeOpacity={0.8}
            style={[styles.searchSummary, {flexDirection: rowDir}]}
            onPress={() => setFiltersOpen(true)}>
            <Text style={[styles.searchSummaryText, af(styles.searchSummaryText)]} numberOfLines={1}>
              {t(searchTypes.find(o => o.value === searchType)?.labelKey)}
            </Text>
          </TouchableOpacity>
        ) : (
          <SearchInput
            style={styles.searchInputWrap}
            placeholder={t('searchPlaceholder')}
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={handleSearchSubmit}
          />
        )}
        <TouchableOpacity
          activeOpacity={0.85}
          style={[styles.filterBtn, (filtersOpen || activePills.length > 0) && styles.filterBtnActive]}
          onPress={() => setFiltersOpen(v => !v)}>
          <SlidersHorizontal
            size={18}
            color={filtersOpen || activePills.length > 0 ? '#fff' : COLORS.textMuted}
          />
          {activePills.length > 0 ? (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activePills.length}</Text>
            </View>
          ) : null}
        </TouchableOpacity>
      </View>

      {filtersOpen ? (
        <View style={styles.filterPanel}>
          <View style={[styles.panelRow, {flexDirection: rowDir}]}>
            <SelectField
              style={styles.panelHalf}
              label={t('merchantFilterCompany')}
              value={company}
              placeholder={t('selectAll')}
              options={[allOption, ...companyOptions]}
              onSelect={setCompany}
              getLabel={optionName}
              getKey={o => String(o.id)}
            />
            <SelectField
              style={styles.panelHalf}
              label={t('merchantFilterSupplier')}
              value={supplier}
              placeholder={t('selectAll')}
              options={[allOption, ...supplierOptions]}
              onSelect={setSupplier}
              getLabel={optionName}
              getKey={o => String(o.id)}
            />
          </View>
          <SelectField
            label={t('bankFiltersSearchByLabel')}
            value={searchTypes.find(o => o.value === searchType)}
            options={searchTypes}
            onSelect={o => changeSearchType(o.value)}
            getLabel={o => t(o.labelKey)}
            getKey={o => o.value}
          />
          {isDateSearch ? (
            <View style={[styles.panelRow, {flexDirection: rowDir}]}>
              <CustomInput
                style={[styles.dateInput, !datesValid && styles.dateInputInvalid]}
                placeholder={t('bankFiltersFromDate')}
                placeholderTextColor={COLORS.textMuted}
                value={startDate}
                onChangeText={setStartDate}
                keyboardType="numbers-and-punctuation"
                maxLength={10}
              />
              <CustomInput
                style={[styles.dateInput, !datesValid && styles.dateInputInvalid]}
                placeholder={t('bankFiltersToDate')}
                placeholderTextColor={COLORS.textMuted}
                value={endDate}
                onChangeText={setEndDate}
                keyboardType="numbers-and-punctuation"
                maxLength={10}
              />
            </View>
          ) : null}
          {isStatusSearch ? (
            <SelectField
              value={bankStatusOptions.find(o => o.id === bankStatus)}
              options={bankStatusOptions}
              onSelect={o => setBankStatus(o.id)}
              getLabel={o => t(o.labelKey)}
              getKey={o => o.id || 'all'}
            />
          ) : null}
          {tab === 'invoices' ? (
            <View style={[styles.statusToggle, {flexDirection: rowDir}]}>
              {[false, true].map(isArchived => (
                <TouchableOpacity
                  key={String(isArchived)}
                  activeOpacity={0.85}
                  style={[styles.statusToggleBtn, archived === isArchived && styles.statusToggleBtnActive]}
                  onPress={() => setArchived(isArchived)}>
                  <Text
                    style={[
                      styles.statusToggleText,
                      archived === isArchived && styles.statusToggleTextActive,
                      af(styles.statusToggleText),
                    ]}>
                    {t(isArchived ? 'merchantStatusArchived' : 'merchantStatusActive')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : null}
        </View>
      ) : activePills.length > 0 ? (
        <View style={[styles.pillsRow, {flexDirection: rowDir}]}>
          {activePills.map(pill => (
            <View key={pill.key} style={[styles.pill, {flexDirection: rowDir}]}>
              <Text style={[styles.pillText, af(styles.pillText)]} numberOfLines={1}>
                {pill.label}
              </Text>
              <TouchableOpacity
                hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}
                onPress={pill.clear}>
                <X size={11} color={COLORS.primaryDark} strokeWidth={3} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      ) : null}

      <View style={[styles.sectionRow, {flexDirection: rowDir}]}>
        <Text style={[styles.sectionTitle, af(styles.sectionTitle)]}>
          {t(tab === 'bank' ? 'merchantTabBank' : 'merchantTabInvoices')} · {totalRecords}
        </Text>
        {/* Web rule: a bare organization login can't create invoices (no User
            record to attribute them to) — only an orgUser sees this. */}
        {tab === 'invoices' && isOrgUser ? (
          <TouchableOpacity
            style={styles.newInvoiceBtn}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('CreateInvoice')}>
            <Text style={styles.newInvoiceBtnIcon}>＋</Text>
            <Text style={[styles.newInvoiceBtnText, af(styles.newInvoiceBtnText)]}>{t('newInvoiceAction')}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primaryDark} />

      <View style={[styles.listHeader, {flexDirection: isRTL ? 'row-reverse' : 'row'}]}>
        <View style={[styles.headerLeft, {flexDirection: isRTL ? 'row-reverse' : 'row'}]}>
          <Image source={require('../../assets/logo.png')} style={styles.headerLogo} resizeMode="contain" />
          <View style={isRTL && {alignItems: 'flex-end'}}>
            <Text style={[styles.listHeaderSub, af(styles.listHeaderSub)]}>{t('welcomeBack')}</Text>
            <Text style={[styles.listHeaderTitle, af(styles.listHeaderTitle)]} numberOfLines={1}>
              {session?.userType === 'orgUser'
                ? session?.organization?.username || session?.organization?.name
                : session?.organization?.name}
            </Text>
          </View>
        </View>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>
            {(session?.organization?.username || session?.organization?.name || '?')
              .slice(0, 2)
              .toUpperCase()}
          </Text>
        </View>
      </View>

      <Animated.View style={[styles.balanceCard, {height: cardHeight, overflow: 'hidden'}]}>
        <Text style={[styles.balanceLabel, {textAlign: isRTL ? 'right' : 'left'}, af(styles.balanceLabel)]}>
          {t('totalInvoicesLabel')}
        </Text>
        <Animated.Text
          style={[
            styles.balanceAmount,
            {fontSize: amountFontSize, textAlign: isRTL ? 'right' : 'left'},
            af(styles.balanceAmount),
          ]}>
          {totalRecords}
        </Animated.Text>
        <Animated.View
          style={[
            styles.balanceRow,
            {opacity: statsOpacity, flexDirection: isRTL ? 'row-reverse' : 'row'},
          ]}>
          <Text style={[styles.balanceHint, af(styles.balanceHint)]}>{t('tapInvoiceHint')}</Text>
        </Animated.View>
      </Animated.View>

      <FlatList
        data={error ? [] : invoices}
        keyExtractor={item => item.id}
        renderItem={tab === 'bank' ? renderBankItem : renderItem}
        ListHeaderComponent={listHeader}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={{height: 10}} />}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={COLORS.primary} />
        }
        onEndReachedThreshold={0.4}
        onEndReached={handleLoadMore}
        ListEmptyComponent={
          error ? (
            <ErrorState message={error} onRetry={() => fetchInvoices({targetPage: 1})} />
          ) : !isLoading ? (
            <ListEmptyState />
          ) : null
        }
      />
      <InvoiceInfoModal
        visible={infoInvoiceId != null}
        invoiceId={infoInvoiceId}
        onClose={() => setInfoInvoiceId(null)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {flex: 1, backgroundColor: COLORS.bg},
  listHeader: {
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  headerLeft: {alignItems: 'center', gap: 10, flex: 1},
  headerLogo: {width: 34, height: 34},
  listHeaderSub: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  listHeaderTitle: {fontSize: 18, fontWeight: '800', color: COLORS.text, maxWidth: 220},
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
  balanceCard: {
    backgroundColor: COLORS.primaryDark,
    marginHorizontal: 20,
    borderRadius: 18,
    padding: 20,
    marginBottom: 14,
    ...PRIMARY_SHADOW,
  },
  // includeFontPadding: Android-only (no-op on iOS). Same fix as the bank
  // hero card: these are plain Text nodes inside a fixed-height animated
  // card, and Android's default font padding on Tajawal's tall metrics
  // inflates each line enough to clip the amount at the card's bottom.
  balanceLabel: {
    color: COLORS.accent,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    includeFontPadding: false,
  },
  balanceAmount: {color: '#fff', fontWeight: '800', marginTop: 4, includeFontPadding: false},
  balanceRow: {marginTop: 8},
  balanceHint: {color: 'rgba(255,255,255,0.7)', fontSize: 12, includeFontPadding: false},
  tabsRow: {
    marginHorizontal: 20,
    marginBottom: 10,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 3,
  },
  tabBtn: {flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 9},
  tabBtnActive: {backgroundColor: COLORS.primary},
  tabText: {fontSize: 13, fontWeight: '700', color: COLORS.textMuted},
  tabTextActive: {color: '#fff'},
  searchRow: {marginHorizontal: 20, marginBottom: 10, gap: 8, alignItems: 'center'},
  searchInputWrap: {flex: 1},
  searchSummary: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    height: 46,
  },
  searchSummaryText: {fontSize: 13, fontWeight: '600', color: COLORS.textMuted},
  filterBtn: {
    width: 46,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBtnActive: {backgroundColor: COLORS.primary, borderColor: COLORS.primary},
  filterBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    minWidth: 17,
    height: 17,
    borderRadius: 9,
    backgroundColor: COLORS.danger,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  filterBadgeText: {color: '#fff', fontSize: 10, fontWeight: '800'},
  filterPanel: {
    marginHorizontal: 20,
    marginBottom: 10,
    padding: 14,
    gap: 10,
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  panelRow: {gap: 10},
  panelHalf: {flex: 1},
  dateInput: {
    flex: 1,
    backgroundColor: COLORS.bg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 13,
    color: COLORS.text,
  },
  dateInputInvalid: {borderColor: COLORS.danger},
  pillsRow: {marginHorizontal: 20, marginBottom: 10, flexWrap: 'wrap', gap: 6},
  pill: {
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.accent,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    maxWidth: 200,
  },
  pillText: {fontSize: 12, fontWeight: '700', color: COLORS.primaryDark, flexShrink: 1},
  statusToggle: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.bg,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 2,
  },
  statusToggleBtn: {paddingHorizontal: 16, paddingVertical: 6, borderRadius: 999},
  statusToggleBtnActive: {backgroundColor: COLORS.primaryDark},
  statusToggleText: {fontSize: 12, fontWeight: '700', color: COLORS.textMuted},
  statusToggleTextActive: {color: '#fff'},
  canceledText: {color: '#03a9f4', textDecorationLine: 'line-through'},
  archivedInvoice: {color: '#c60000'},
  txAction: {fontSize: 11, fontWeight: '700', color: COLORS.primary},
  sectionRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textMuted,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  newInvoiceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.primary,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  newInvoiceBtnIcon: {color: '#fff', fontSize: 14, fontWeight: '800'},
  newInvoiceBtnText: {color: '#fff', fontSize: 12, fontWeight: '700'},
  listContent: {paddingBottom: 32, flexGrow: 1},
  txCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    marginHorizontal: 20,
    padding: 16,
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    ...CARD_SHADOW,
  },
  txCardLeft: {flex: 1, paddingRight: 12},
  txCardRight: {alignItems: 'flex-end', gap: 4},
  txInvoice: {fontSize: 14, fontWeight: '700', color: COLORS.text},
  txParty: {fontSize: 12, color: COLORS.textMuted, marginTop: 3},
  txDate: {fontSize: 11, color: COLORS.textMuted, marginTop: 4},
  txAmount: {fontSize: 15, fontWeight: '800', color: COLORS.text, letterSpacing: -0.3},
  txChevron: {fontSize: 20, color: COLORS.primaryLight, lineHeight: 20},
});

export default HomeScreen;
