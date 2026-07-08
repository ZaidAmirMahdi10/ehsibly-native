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
import {useTranslation} from 'react-i18next';
import {useNavigation} from '@react-navigation/native';

import {LanguageContext} from '../../../App';
import {useAuth} from '../../context/AuthContext';
import {tajawalFamilyForWeight} from '../../constants/fonts';
import {COLORS, CARD_SHADOW, PRIMARY_SHADOW} from '../../constants/theme';
import StatusBadge from '../../components/StatusBadge';
import ListEmptyState from '../../components/ListEmptyState';
import ErrorState from '../../components/ErrorState';
import SearchInput from '../../components/SearchInput';
import {getMultiContainerInvoices} from '../../services/invoices/multiContainerWithoutC';

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
    return {fontFamily: tajawalFamilyForWeight(weight)};
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
    const y = e.nativeEvent.contentOffset.y;
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

  const fetchInvoices = useCallback(
    async ({targetPage = 1, query = '', append = false} = {}) => {
      try {
        // supplierId defaults server-side to the user's/org's "current
        // supplier" if omitted (a stateful, unrelated leftover from some
        // other flow) — passing the explicit "All" sentinel is the only way
        // to reliably get the unfiltered list, confirmed against the real
        // backend controller.
        const params = {page: targetPage, limit: PAGE_LIMIT, supplierId: 'All'};
        if (session?.organization?.subCompanyId) {
          params.subCompanyId = session.organization.subCompanyId;
        }
        if (query) {
          params.type = 'invoiceNumber';
          params.query = query;
        }

        const data = await getMultiContainerInvoices(params);
        setInvoices(prev => (append ? [...prev, ...(data?.invoices || [])] : data?.invoices || []));
        setTotalPages(data?.totalPages || 1);
        setTotalRecords(data?.totalInvoices || 0);
        setPage(targetPage);
        setError(null);
      } catch (err) {
        setError(t('genericErrorMessage'));
      }
    },
    [session?.organization?.subCompanyId, t],
  );

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      await fetchInvoices({targetPage: 1});
      setIsLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-fetch whenever this tab regains focus (e.g. after creating an
  // invoice and navigating back) so the list doesn't go stale silently.
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchInvoices({targetPage: 1, query: search});
    });
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigation]);

  // Debounced live search — relying only on onSubmitEditing (the keyboard's
  // "search" key) is unreliable across keyboards/input methods, so every
  // keystroke re-triggers the fetch after a short pause instead.
  const isFirstRender = React.useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const timeout = setTimeout(() => {
      fetchInvoices({targetPage: 1, query: search});
    }, 400);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const handleSearchSubmit = async () => {
    setIsLoading(true);
    await fetchInvoices({targetPage: 1, query: search});
    setIsLoading(false);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchInvoices({targetPage: 1, query: search});
    setIsRefreshing(false);
  };

  const handleLoadMore = async () => {
    if (isLoadingMore || page >= totalPages) {
      return;
    }
    setIsLoadingMore(true);
    await fetchInvoices({targetPage: page + 1, query: search, append: true});
    setIsLoadingMore(false);
  };

  const renderItem = ({item}) => (
    <TouchableOpacity
      style={[styles.txCard, {flexDirection: isRTL ? 'row-reverse' : 'row'}]}
      activeOpacity={0.82}
      onPress={() => navigation.navigate('InvoiceDetail', {invoice: item})}>
      <View
        style={[
          styles.txCardLeft,
          isRTL && {paddingRight: 0, paddingLeft: 12, alignItems: 'flex-end'},
        ]}>
        <Text style={[styles.txInvoice, af(styles.txInvoice)]} numberOfLines={1}>
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
        <Text style={styles.txChevron}>{isRTL ? '‹' : '›'}</Text>
      </View>
    </TouchableOpacity>
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

      <SearchInput
        style={styles.searchWrap}
        placeholder={t('searchPlaceholder')}
        value={search}
        onChangeText={setSearch}
        onSubmitEditing={handleSearchSubmit}
      />

      <View style={[styles.sectionRow, {flexDirection: isRTL ? 'row-reverse' : 'row'}]}>
        <Text style={[styles.sectionTitle, af(styles.sectionTitle)]}>{t('recentTransactions')}</Text>
        <TouchableOpacity
          style={styles.newInvoiceBtn}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('CreateInvoice')}>
          <Text style={styles.newInvoiceBtnIcon}>＋</Text>
          <Text style={[styles.newInvoiceBtnText, af(styles.newInvoiceBtnText)]}>{t('newInvoiceAction')}</Text>
        </TouchableOpacity>
      </View>

      {error ? (
        <ErrorState message={error} onRetry={() => fetchInvoices({targetPage: 1, query: search})} />
      ) : (
        <FlatList
          data={invoices}
          keyExtractor={item => item.id}
          renderItem={renderItem}
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
          ListEmptyComponent={!isLoading ? <ListEmptyState /> : null}
        />
      )}
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
  balanceLabel: {
    color: COLORS.accent,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  balanceAmount: {color: '#fff', fontWeight: '800', marginTop: 4},
  balanceRow: {marginTop: 8},
  balanceHint: {color: 'rgba(255,255,255,0.7)', fontSize: 12},
  searchWrap: {marginHorizontal: 20, marginBottom: 12},
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
  listContent: {paddingHorizontal: 20, paddingBottom: 32, flexGrow: 1},
  txCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
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
