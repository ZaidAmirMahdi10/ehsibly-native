/**
 * Bank Money Transactions App
 * React Native — no Expo
 * Primary: #79329a
 *
 * Screens:
 *  1. TransactionListScreen  – list of transactions with invoice numbers
 *  2. InvoiceDetailScreen    – two tab groups: Documents & Forms
 */

import React, {useState, useContext, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ScrollView,
  TextInput,
  StatusBar,
  Animated,
  Platform,
} from 'react-native';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';

import {useTranslation} from 'react-i18next';
import {LanguageContext} from '../../../App';

import CustomText from '../../components/CustomText';
import CustomView from '../../components/CustomView';
import SearchInput from '../../components/SearchInput';
import {tajawalFamilyForWeight} from '../../constants/fonts';

// ─── Palette ────────────────────────────────────────────────────────────────
const C = {
  primary:       '#79329a',
  primaryLight:  '#9b5cb8',
  primaryDark:   '#57197a',
  accent:        '#e8b4ff',
  bg:            '#f7f4fa',
  surface:       '#ffffff',
  surfaceAlt:    '#f0e9f7',
  text:          '#1a0f26',
  textMuted:     '#7a6a8a',
  border:        '#e0d4ec',
  success:       '#2db87a',
  pending:       '#f0a500',
  danger:        '#e04444',
  white:         '#ffffff',
};

// Base cosmetic top padding for listHeader/detailHeader — kept as a raw
// constant (not read back off styles.listHeader/detailHeader) since
// StyleSheet.create() output isn't guaranteed to still expose plain numeric
// fields at render time.
const HEADER_BASE_PADDING_TOP = Platform.OS === 'android' ? 16 : 10;
// Matches HomeScreen.js's own collapsing balance card, ported here for the
// same scroll-driven shrink behavior.
const CARD_HEIGHT = 132;
const CARD_COLLAPSED_HEIGHT = 60;

// ─── Mock Data ────────────────────────────────────────────────────────────────
const TRANSACTIONS = [
  { id: '1', invoice: 'INV-2024-00871', counterparty: 'Alibaba Trading Co.', amount: -84500.00, currency: 'USD', date: '12 May 2024', status: 'pending',  type: 'Import' },
  { id: '2', invoice: 'INV-2024-00654', counterparty: 'Nordic Exports AB',   amount: +32100.50, currency: 'USD', date: '10 May 2024', status: 'completed', type: 'Export' },
  { id: '3', invoice: 'INV-2024-00521', counterparty: 'Gulf Commodities LLC', amount: -120000.00,currency: 'USD', date: '08 May 2024', status: 'completed', type: 'Import' },
  { id: '4', invoice: 'INV-2024-00498', counterparty: 'Vertex Supply Chain',  amount: +17850.00, currency: 'EUR', date: '05 May 2024', status: 'pending',  type: 'Export' },
  { id: '5', invoice: 'INV-2024-00312', counterparty: 'HarbourTech Ltd.',     amount: -56000.00, currency: 'GBP', date: '01 May 2024', status: 'completed', type: 'Import' },
  { id: '6', invoice: 'INV-2024-00201', counterparty: 'SilkRoute Partners',   amount: +9900.00,  currency: 'USD', date: '28 Apr 2024', status: 'completed', type: 'Export' },
];

const DOCUMENTS = [
  { id: 'd1', icon: '📄', labelKey: 'docCommercialInvoice',   size: '284 KB', pages: 2,  uploaded: '12 May 2024' },
  { id: 'd2', icon: '📦', labelKey: 'docPackingList',         size: '156 KB', pages: 3,  uploaded: '12 May 2024' },
  { id: 'd3', icon: '🚢', labelKey: 'docBillOfLading',        size: '398 KB', pages: 1,  uploaded: '11 May 2024' },
  { id: 'd4', icon: '📋', labelKey: 'docCertificateOfOrigin', size: '201 KB', pages: 1,  uploaded: '11 May 2024' },
  { id: 'd5', icon: '🛃', labelKey: 'docCustomsDeclaration',  size: '512 KB', pages: 4,  uploaded: '10 May 2024' },
  { id: 'd6', icon: '🔍', labelKey: 'docInspectionCertificate', size: '173 KB', pages: 2,  uploaded: '10 May 2024' },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmt = (n, cur) =>
  (n >= 0 ? '+' : '') +
  new Intl.NumberFormat('en-US', { style: 'currency', currency: cur }).format(n);

// ─── Components ───────────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  const {t} = useTranslation();

  const map = {
    completed: { bg: '#e6f9f1', text: C.success, label: t('statusCompleted') },
    pending:   { bg: '#fff6e0', text: C.pending, label: t('statusPending') },
    failed:    { bg: '#fde8e8', text: C.danger, label: t('statusFailed') },
  };

  const s = map[status] || map.pending;

  return (
    <CustomView style={[styles.badge, { backgroundColor: s.bg }]}>
      <View style={[styles.badgeDot, { backgroundColor: s.text }]} />
      <CustomText style={[styles.badgeText, { color: s.text }]} paddingTop={0}>
        {s.label}
      </CustomText>
    </CustomView>
  );
}

// ─── Screen 1: Transaction List ───────────────────────────────────────────────
function TransactionListScreen({ onSelect }) {
  const {t} = useTranslation();
  const {currentDirection} = useContext(LanguageContext);
  const isRTL = currentDirection === 'rtl';
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');
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
  // Animated.Text can't go through CustomText (no Animated-wrapped variant),
  // so it needs its own Arabic font resolution — same approach as
  // HomeScreen.js's own af() helper.
  const af = (...stylesToCheck) => {
    if (!isRTL) {
      return null;
    }
    const weight = StyleSheet.flatten(stylesToCheck)?.fontWeight;
    return {fontFamily: tajawalFamilyForWeight(weight)};
  };
  const filtered = TRANSACTIONS.filter(tx =>
    tx.invoice.toLowerCase().includes(search.toLowerCase()) ||
    tx.counterparty.toLowerCase().includes(search.toLowerCase())
  );

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.txCard, {flexDirection: isRTL ? 'row-reverse' : 'row'}]}
      activeOpacity={0.82}
      onPress={() => onSelect(item)}
    >
      <View
        style={[
          styles.txCardLeft,
          {
            paddingRight: isRTL ? 0 : 12,
            paddingLeft: isRTL ? 12 : 0,
            alignItems: isRTL ? 'flex-end' : 'flex-start',
          },
        ]}>
        <View style={[styles.txTypeTag, item.type === 'Import' ? styles.importTag : styles.exportTag]}>
          <CustomText style={styles.txTypeText} paddingTop={0}>
            {item.type === 'Import' ? t('typeImport') : t('typeExport')}
          </CustomText>
        </View>
        <CustomText style={styles.txInvoice} paddingTop={0}>{item.invoice}</CustomText>
        <CustomText style={styles.txParty} paddingTop={0}>{item.counterparty}</CustomText>
        <CustomText style={styles.txDate} paddingTop={0}>{item.date}</CustomText>
      </View>

      <View style={[styles.txCardRight, {alignItems: isRTL ? 'flex-start' : 'flex-end'}]}>
        <CustomText style={[styles.txAmount, { color: item.amount >= 0 ? C.success : C.text }]} paddingTop={0}>
          {fmt(item.amount, item.currency)}
        </CustomText>
        <StatusBadge status={item.status} />
        <CustomText style={styles.txChevron} paddingTop={0} lineHeight={26}>{isRTL ? '‹' : '›'}</CustomText>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor={C.primaryDark} />

      {/* Header */}
      <View
        style={[
          styles.listHeader,
          {flexDirection: isRTL ? 'row-reverse' : 'row', paddingTop: HEADER_BASE_PADDING_TOP + insets.top},
        ]}>
        <View style={isRTL ? {alignItems: 'flex-end'} : null}>
          <CustomText style={styles.listHeaderSub} paddingTop={0}>{t('welcomeBack')}</CustomText>
          <CustomText style={styles.listHeaderTitle} paddingTop={0} lineHeight={32}>{t('transactionsTitle')}</CustomText>
        </View>
        <View style={styles.avatarCircle}>
          <CustomText style={styles.avatarText} paddingTop={0}>JD</CustomText>
        </View>
      </View>

      {/* Balance Card */}
      <Animated.View style={[styles.balanceCard, {height: cardHeight, overflow: 'hidden'}]}>
        <Text style={[styles.balanceLabel, {textAlign: isRTL ? 'right' : 'left'}, af(styles.balanceLabel)]}>
          {t('totalExposure')}
        </Text>
        <Animated.Text
          style={[styles.balanceAmount, {textAlign: isRTL ? 'right' : 'left'}, af(styles.balanceAmount)]}>
          $278,350.50
        </Animated.Text>
        <Animated.View
          style={[
            styles.balanceRow,
            {opacity: statsOpacity, flexDirection: isRTL ? 'row-reverse' : 'row'},
          ]}>
          <View style={styles.balanceStat}>
            <Text style={[styles.balanceStatLabel, af(styles.balanceStatLabel)]}>{t('inbound')}</Text>
            <Text style={[styles.balanceStatVal, { color: C.success }, af(styles.balanceStatVal)]}>
              +$59,850.50
            </Text>
          </View>
          <View style={styles.balanceDivider} />
          <View style={styles.balanceStat}>
            <Text style={[styles.balanceStatLabel, af(styles.balanceStatLabel)]}>{t('outbound')}</Text>
            <Text style={[styles.balanceStatVal, { color: C.accent }, af(styles.balanceStatVal)]}>
              −$218,500.00
            </Text>
          </View>
        </Animated.View>
      </Animated.View>

      {/* Search */}
      <SearchInput
        style={styles.searchWrap}
        placeholder={t('searchPlaceholder')}
        value={search}
        onChangeText={setSearch}
      />

      <CustomText style={styles.sectionTitle} paddingTop={0}>{t('recentTransactions')}</CustomText>

      <FlatList
        data={filtered}
        keyExtractor={i => i.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        onScroll={Animated.event(
          [{nativeEvent: {contentOffset: {y: scrollY}}}],
          {useNativeDriver: false},
        )}
        scrollEventThrottle={16}
      />
    </SafeAreaView>
  );
}

// ─── Screen 2: Invoice Detail ─────────────────────────────────────────────────
function InvoiceDetailScreen({ transaction, onBack }) {
  const {t} = useTranslation();
  const {currentDirection} = useContext(LanguageContext);
  const isRTL = currentDirection === 'rtl';
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState('documents'); // 'documents' | 'forms'
  const [formData, setFormData] = useState({
    paymentRef:   '',
    bankCode:     '',
    swiftCode:    '',
    remittance:   '',
    purpose:      '',
    declaredVal:  '',
    exchangeRate: '',
    notes:        '',
  });
  const [formSubmitted, setFormSubmitted] = useState(false);

  const setField = (key, val) => setFormData(p => ({ ...p, [key]: val }));
  const rowDirection = {flexDirection: isRTL ? 'row-reverse' : 'row'};
  const fieldTextAlign = {textAlign: isRTL ? 'right' : 'left'};

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor={C.primaryDark} />

      {/* Header */}
      <View style={[styles.detailHeader, rowDirection, {paddingTop: HEADER_BASE_PADDING_TOP + insets.top}]}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <CustomText style={styles.backIcon} paddingTop={0} lineHeight={28}>{isRTL ? '›' : '‹'}</CustomText>
        </TouchableOpacity>
        <View style={styles.detailHeaderText}>
          <CustomText style={styles.detailHeaderSub} paddingTop={0}>{t('invoiceDetail')}</CustomText>
          <CustomText style={styles.detailHeaderTitle} numberOfLines={1}>{transaction.invoice}</CustomText>
        </View>
        <StatusBadge status={transaction.status} />
      </View>

      {/* Summary Strip */}
      <View style={[styles.summaryStrip, rowDirection]}>
        <View style={styles.summaryItem}>
          <CustomText style={styles.summaryLabel} paddingTop={0}>{t('counterparty')}</CustomText>
          <CustomText style={styles.summaryValue} numberOfLines={1}>{transaction.counterparty}</CustomText>
        </View>
        <View style={styles.summaryItem}>
          <CustomText style={styles.summaryLabel} paddingTop={0}>{t('amount')}</CustomText>
          <CustomText style={[styles.summaryValue, { color: transaction.amount >= 0 ? C.success : C.primaryLight }]}>
            {fmt(transaction.amount, transaction.currency)}
          </CustomText>
        </View>
        <View style={styles.summaryItem}>
          <CustomText style={styles.summaryLabel} paddingTop={0}>{t('date')}</CustomText>
          <CustomText style={styles.summaryValue}>{transaction.date}</CustomText>
        </View>
      </View>

      {/* Tabs */}
      <View style={[styles.tabBar, rowDirection]}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'documents' && styles.tabActive]}
          onPress={() => setActiveTab('documents')}
        >
          <CustomText style={[styles.tabText, activeTab === 'documents' && styles.tabTextActive]} paddingTop={0}>
            📁  {t('tabDocuments')}
          </CustomText>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'forms' && styles.tabActive]}
          onPress={() => setActiveTab('forms')}
        >
          <CustomText style={[styles.tabText, activeTab === 'forms' && styles.tabTextActive]} paddingTop={0}>
            📝  {t('tabForms')}
          </CustomText>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      <ScrollView
        style={styles.flexOne}
        contentContainerStyle={styles.tabContent}
        showsVerticalScrollIndicator={false}
      >

        {/* ── DOCUMENTS TAB ── */}
        {activeTab === 'documents' && (
          <>
            <CustomText style={styles.groupHeading} paddingTop={0}>{t('documentsGroupTitle')}</CustomText>
            <CustomText style={styles.groupSubheading} paddingTop={0}>
              {t('documentsGroupSubtitle', {count: DOCUMENTS.length})}
            </CustomText>
            {DOCUMENTS.map(doc => (
              <TouchableOpacity key={doc.id} style={[styles.docCard, rowDirection]} activeOpacity={0.8}>
                <View style={styles.docIconWrap}>
                  <Text style={styles.docIcon}>{doc.icon}</Text>
                </View>
                <View style={styles.docInfo}>
                  <CustomText style={styles.docLabel} paddingTop={0}>{t(doc.labelKey)}</CustomText>
                  <CustomText style={styles.docMeta} paddingTop={0}>
                    {t('docPages', {count: doc.pages})}  ·  {doc.size}  ·  {doc.uploaded}
                  </CustomText>
                </View>
                <TouchableOpacity style={styles.docViewBtn}>
                  <CustomText style={styles.docViewText} paddingTop={0}>{t('docViewBtn')}</CustomText>
                </TouchableOpacity>
              </TouchableOpacity>
            ))}

            {/* Upload zone */}
            <TouchableOpacity style={styles.uploadZone} activeOpacity={0.75}>
              <CustomText style={styles.uploadIcon} paddingTop={0} lineHeight={32}>⊕</CustomText>
              <CustomText style={styles.uploadLabel} paddingTop={0}>{t('uploadNewDocument')}</CustomText>
              <CustomText style={styles.uploadHint} paddingTop={0}>{t('uploadHint')}</CustomText>
            </TouchableOpacity>
          </>
        )}

        {/* ── FORMS TAB ── */}
        {activeTab === 'forms' && (
          <>
            <CustomText style={styles.groupHeading} paddingTop={0}>{t('formsGroupTitle')}</CustomText>
            <CustomText style={styles.groupSubheading} paddingTop={0}>
              {t('formsGroupSubtitle')}
            </CustomText>

            {formSubmitted ? (
              <View style={styles.successCard}>
                <Text style={styles.successIcon}>✅</Text>
                <CustomText center style={styles.successTitle} paddingTop={0} lineHeight={26}>{t('successTitle')}</CustomText>
                <CustomText center style={styles.successSub} paddingTop={0}>
                  {t('successSubtitle')}
                </CustomText>
                <TouchableOpacity style={styles.successBtn} onPress={() => setFormSubmitted(false)}>
                  <CustomText style={styles.successBtnText} paddingTop={0}>{t('editForms')}</CustomText>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                {/* Form Group 1: Payment Details */}
                <View style={styles.formGroup}>
                  <View style={[styles.formGroupHeader, rowDirection]}>
                    <View style={styles.formGroupNum}>
                      <CustomText style={styles.formGroupNumText} paddingTop={0}>{t('formGroup1Number')}</CustomText>
                    </View>
                    <CustomText style={styles.formGroupTitle} paddingTop={0}>{t('formGroup1Title')}</CustomText>
                  </View>

                  <CustomText style={styles.fieldLabel} paddingTop={0}>{t('fieldPaymentRef')} *</CustomText>
                  <TextInput
                    style={[styles.fieldInput, fieldTextAlign]}
                    placeholder={t('fieldPaymentRefPlaceholder')}
                    placeholderTextColor={C.textMuted}
                    value={formData.paymentRef}
                    onChangeText={v => setField('paymentRef', v)}
                  />

                  <CustomText style={styles.fieldLabel} paddingTop={0}>{t('fieldBankCode')} *</CustomText>
                  <TextInput
                    style={[styles.fieldInput, fieldTextAlign]}
                    placeholder={t('fieldBankCodePlaceholder')}
                    placeholderTextColor={C.textMuted}
                    keyboardType="numeric"
                    value={formData.bankCode}
                    onChangeText={v => setField('bankCode', v)}
                  />

                  <CustomText style={styles.fieldLabel} paddingTop={0}>{t('fieldSwiftCode')} *</CustomText>
                  <TextInput
                    style={[styles.fieldInput, fieldTextAlign]}
                    placeholder={t('fieldSwiftCodePlaceholder')}
                    placeholderTextColor={C.textMuted}
                    autoCapitalize="characters"
                    value={formData.swiftCode}
                    onChangeText={v => setField('swiftCode', v)}
                  />

                  <CustomText style={styles.fieldLabel} paddingTop={0}>{t('fieldRemittance')}</CustomText>
                  <TextInput
                    style={[styles.fieldInput, styles.fieldInputMulti, fieldTextAlign]}
                    placeholder={t('fieldRemittancePlaceholder')}
                    placeholderTextColor={C.textMuted}
                    multiline
                    numberOfLines={3}
                    value={formData.remittance}
                    onChangeText={v => setField('remittance', v)}
                  />
                </View>

                {/* Form Group 2: Compliance & Declaration */}
                <View style={styles.formGroup}>
                  <View style={[styles.formGroupHeader, rowDirection]}>
                    <View style={styles.formGroupNum}>
                      <CustomText style={styles.formGroupNumText} paddingTop={0}>{t('formGroup2Number')}</CustomText>
                    </View>
                    <CustomText style={styles.formGroupTitle} paddingTop={0}>{t('formGroup2Title')}</CustomText>
                  </View>

                  <CustomText style={styles.fieldLabel} paddingTop={0}>{t('fieldPurpose')} *</CustomText>
                  <TextInput
                    style={[styles.fieldInput, fieldTextAlign]}
                    placeholder={t('fieldPurposePlaceholder')}
                    placeholderTextColor={C.textMuted}
                    value={formData.purpose}
                    onChangeText={v => setField('purpose', v)}
                  />

                  <CustomText style={styles.fieldLabel} paddingTop={0}>
                    {t('fieldDeclaredValue', {currency: transaction.currency})} *
                  </CustomText>
                  <TextInput
                    style={[styles.fieldInput, fieldTextAlign]}
                    placeholder={t('fieldDeclaredValuePlaceholder')}
                    placeholderTextColor={C.textMuted}
                    keyboardType="decimal-pad"
                    value={formData.declaredVal}
                    onChangeText={v => setField('declaredVal', v)}
                  />

                  <CustomText style={styles.fieldLabel} paddingTop={0}>{t('fieldExchangeRate')}</CustomText>
                  <TextInput
                    style={[styles.fieldInput, fieldTextAlign]}
                    placeholder={t('fieldExchangeRatePlaceholder')}
                    placeholderTextColor={C.textMuted}
                    keyboardType="decimal-pad"
                    value={formData.exchangeRate}
                    onChangeText={v => setField('exchangeRate', v)}
                  />

                  <CustomText style={styles.fieldLabel} paddingTop={0}>{t('fieldNotes')}</CustomText>
                  <TextInput
                    style={[styles.fieldInput, styles.fieldInputMulti, fieldTextAlign]}
                    placeholder={t('fieldNotesPlaceholder')}
                    placeholderTextColor={C.textMuted}
                    multiline
                    numberOfLines={3}
                    value={formData.notes}
                    onChangeText={v => setField('notes', v)}
                  />
                </View>

                {/* Submit */}
                <TouchableOpacity
                  style={styles.submitBtn}
                  activeOpacity={0.85}
                  onPress={() => setFormSubmitted(true)}
                >
                  <CustomText style={styles.submitBtnText} paddingTop={0}>{t('submitForms')}</CustomText>
                </TouchableOpacity>
                <View style={styles.bottomSpacer} />
              </>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Root App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [selected, setSelected] = useState(null);
  return selected
    ? <InvoiceDetailScreen transaction={selected} onBack={() => setSelected(null)} />
    : <TransactionListScreen onSelect={setSelected} />;
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: C.bg,
  },
  flexOne: {flex: 1},
  bottomSpacer: {height: 32},

  // ── List Header
  listHeader: {
    backgroundColor: C.primary,
    paddingHorizontal: 22,
    paddingTop: HEADER_BASE_PADDING_TOP,
    paddingBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  listHeaderSub: {
    color: C.accent,
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  listHeaderTitle: {
    color: C.white,
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginTop: 2,
  },
  avatarCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: C.primaryLight,
    borderWidth: 2,
    borderColor: C.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: C.white,
    fontWeight: '700',
    fontSize: 14,
  },

  // ── Balance Card
  balanceCard: {
    marginHorizontal: 16,
    marginTop: -10,
    borderRadius: 18,
    backgroundColor: C.primaryDark,
    padding: 20,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 10,
  },
  balanceLabel: {
    color: C.accent,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  balanceAmount: {
    color: C.white,
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -1,
    marginTop: 4,
    marginBottom: 16,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  balanceStat: { flex: 1 },
  balanceDivider: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginHorizontal: 16,
  },
  balanceStatLabel: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  balanceStatVal: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 2,
  },

  // ── Search
  searchWrap: { marginHorizontal: 16, marginTop: 18 },

  sectionTitle: {
    color: C.text,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 10,
  },

  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 30,
  },

  // ── Transaction Card
  txCard: {
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  txCardLeft: { flex: 1, paddingRight: 12 },
  txCardRight: { alignItems: 'flex-end', gap: 6 },
  txTypeTag: {
    alignSelf: 'flex-start',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 6,
  },
  importTag: { backgroundColor: '#f0e9f7' },
  exportTag: { backgroundColor: '#e9f7f0' },
  txTypeText: {
    fontSize: 10,
    fontWeight: '700',
    color: C.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  txInvoice: {
    fontSize: 14,
    fontWeight: '700',
    color: C.text,
    letterSpacing: 0.2,
  },
  txParty: {
    fontSize: 13,
    color: C.textMuted,
    marginTop: 3,
  },
  txDate: {
    fontSize: 11,
    color: C.textMuted,
    marginTop: 6,
  },
  txAmount: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  txChevron: {
    fontSize: 22,
    color: C.primaryLight,
    marginTop: 4,
    lineHeight: 22,
  },

  // ── Badge
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
    gap: 4,
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },

  // ── Detail Header
  detailHeader: {
    backgroundColor: C.primary,
    paddingHorizontal: 16,
    paddingTop: HEADER_BASE_PADDING_TOP,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    color: C.white,
    fontSize: 24,
    lineHeight: 28,
    fontWeight: '300',
  },
  detailHeaderText: { flex: 1 },
  detailHeaderSub: {
    color: C.accent,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  detailHeaderTitle: {
    color: C.white,
    fontSize: 16,
    fontWeight: '800',
    marginTop: 1,
  },

  // ── Summary Strip
  summaryStrip: {
    backgroundColor: C.surface,
    flexDirection: 'row',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    gap: 8,
  },
  summaryItem: { flex: 1 },
  summaryLabel: {
    fontSize: 10,
    color: C.textMuted,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  summaryValue: {
    fontSize: 12,
    color: C.text,
    fontWeight: '700',
    marginTop: 3,
  },

  // ── Tabs
  tabBar: {
    flexDirection: 'row',
    backgroundColor: C.surface,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: C.primary,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: C.textMuted,
  },
  tabTextActive: {
    color: C.primary,
  },

  // ── Tab Content
  tabContent: {
    padding: 16,
    paddingBottom: 40,
  },
  groupHeading: {
    fontSize: 18,
    fontWeight: '800',
    color: C.text,
    marginBottom: 4,
  },
  groupSubheading: {
    fontSize: 13,
    color: C.textMuted,
    marginBottom: 18,
  },

  // ── Document Card
  docCard: {
    backgroundColor: C.surface,
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  docIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: C.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  docIcon: { fontSize: 22 },
  docInfo: { flex: 1 },
  docLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: C.text,
  },
  docMeta: {
    fontSize: 11,
    color: C.textMuted,
    marginTop: 3,
  },
  docViewBtn: {
    backgroundColor: C.surfaceAlt,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: C.border,
  },
  docViewText: {
    fontSize: 12,
    fontWeight: '700',
    color: C.primary,
  },

  // ── Upload Zone
  uploadZone: {
    marginTop: 8,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: C.primaryLight,
    borderStyle: 'dashed',
    paddingVertical: 24,
    alignItems: 'center',
    backgroundColor: '#faf5ff',
  },
  uploadIcon: {
    fontSize: 28,
    color: C.primary,
    marginBottom: 8,
  },
  uploadLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: C.primary,
  },
  uploadHint: {
    fontSize: 12,
    color: C.textMuted,
    marginTop: 4,
  },

  // ── Form Group
  formGroup: {
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  formGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 10,
  },
  formGroupNum: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formGroupNumText: {
    color: C.white,
    fontSize: 12,
    fontWeight: '800',
  },
  formGroupTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: C.text,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: C.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    marginBottom: 6,
    marginTop: 12,
  },
  fieldInput: {
    backgroundColor: C.bg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    color: C.text,
  },
  fieldInputMulti: {
    minHeight: 80,
    textAlignVertical: 'top',
  },

  // ── Submit
  submitBtn: {
    backgroundColor: C.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 6,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  submitBtnText: {
    color: C.white,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  // ── Success Card
  successCard: {
    backgroundColor: C.surface,
    borderRadius: 18,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.border,
    marginTop: 10,
  },
  successIcon: { fontSize: 48, marginBottom: 12 },
  successTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: C.text,
    marginBottom: 8,
  },
  successSub: {
    fontSize: 13,
    color: C.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  successBtn: {
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: C.primary,
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  successBtnText: {
    color: C.primary,
    fontWeight: '700',
    fontSize: 13,
  },
});