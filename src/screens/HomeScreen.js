/**
 * Bank Money Transactions App
 * React Native — no Expo
 * Primary: #79329a
 *
 * Screens:
 *  1. TransactionListScreen  – list of transactions with invoice numbers
 *  2. InvoiceDetailScreen    – two tab groups: Documents & Forms
 */

import React, {useState, useContext} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ScrollView,
  TextInput,
  SafeAreaView,
  StatusBar,
  Animated,
  Platform,
} from 'react-native';

import {useTranslation} from 'react-i18next';
import {LanguageContext} from '../../App';

import CustomText from '../components/CustomText';
import CustomView from '../components/CustomView';
import CustomInput from '../components/CustomInput';

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
  { id: 'd1', icon: '📄', label: 'Commercial Invoice',     size: '284 KB', pages: 2,  uploaded: '12 May 2024' },
  { id: 'd2', icon: '📦', label: 'Packing List',           size: '156 KB', pages: 3,  uploaded: '12 May 2024' },
  { id: 'd3', icon: '🚢', label: 'Bill of Lading',         size: '398 KB', pages: 1,  uploaded: '11 May 2024' },
  { id: 'd4', icon: '📋', label: 'Certificate of Origin',  size: '201 KB', pages: 1,  uploaded: '11 May 2024' },
  { id: 'd5', icon: '🛃', label: 'Customs Declaration',    size: '512 KB', pages: 4,  uploaded: '10 May 2024' },
  { id: 'd6', icon: '🔍', label: 'Inspection Certificate', size: '173 KB', pages: 2,  uploaded: '10 May 2024' },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmt = (n, cur) =>
  (n >= 0 ? '+' : '') +
  new Intl.NumberFormat('en-US', { style: 'currency', currency: cur }).format(n);

// ─── Components ───────────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  const {t} = useTranslation();

  const map = {
    completed: { bg: '#e6f9f1', text: C.success, label: t('completed') },
    pending:   { bg: '#fff6e0', text: C.pending, label: t('pending') },
    failed:    { bg: '#fde8e8', text: C.danger, label: t('failed') },
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
  const [search, setSearch] = useState('');
  const filtered = TRANSACTIONS.filter(t =>
    t.invoice.toLowerCase().includes(search.toLowerCase()) ||
    t.counterparty.toLowerCase().includes(search.toLowerCase())
  );

  const renderItem = ({ item, index }) => (
    <TouchableOpacity
      style={styles.txCard}
      activeOpacity={0.82}
      onPress={() => onSelect(item)}
    >
      <View style={styles.txCardLeft}>
        <View style={[styles.txTypeTag, item.type === 'Import' ? styles.importTag : styles.exportTag]}>
          <CustomText style={styles.txTypeText}>{item.type}</CustomText>
        </View>
        <Text style={styles.txInvoice}>{item.invoice}</Text>
        <Text style={styles.txParty}>{item.counterparty}</Text>
        <Text style={styles.txDate}>{item.date}</Text>
      </View>

      <View style={styles.txCardRight}>
        <Text style={[styles.txAmount, { color: item.amount >= 0 ? C.success : C.text }]}>
          {fmt(item.amount, item.currency)}
        </Text>
        <StatusBadge status={item.status} />
        <Text style={styles.txChevron}>›</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={C.primaryDark} />

      {/* Header */}
      <View style={styles.listHeader}>
        <View>
          <Text style={styles.listHeaderSub}>Welcome back</Text>
          <Text style={styles.listHeaderTitle}>Transactions</Text>
        </View>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>JD</Text>
        </View>
      </View>

      {/* Balance Card */}
      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Total Exposure</Text>
        <Text style={styles.balanceAmount}>$278,350.50</Text>
        <View style={styles.balanceRow}>
          <View style={styles.balanceStat}>
            <Text style={styles.balanceStatLabel}>Inbound</Text>
            <Text style={[styles.balanceStatVal, { color: C.success }]}>+$59,850.50</Text>
          </View>
          <View style={styles.balanceDivider} />
          <View style={styles.balanceStat}>
            <Text style={styles.balanceStatLabel}>Outbound</Text>
            <Text style={[styles.balanceStatVal, { color: C.accent }]}>−$218,500.00</Text>
          </View>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search invoice or counterparty…"
          placeholderTextColor={C.textMuted}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <Text style={styles.sectionTitle}>Recent Transactions</Text>

      <FlatList
        data={filtered}
        keyExtractor={i => i.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
      />
    </SafeAreaView>
  );
}

// function TransactionListScreen({onSelect}) {
//   const {t} = useTranslation();
//   const {currentDirection} = useContext(LanguageContext);
//   const isRTL = currentDirection === 'rtl';

//   const [search, setSearch] = useState('');

//   const filtered = TRANSACTIONS.filter(
//     t =>
//       t.invoice.toLowerCase().includes(search.toLowerCase()) ||
//       t.counterparty.toLowerCase().includes(search.toLowerCase()),
//   );

//   const renderItem = ({item}) => (
//     <TouchableOpacity
//       style={[styles.txCard, {flexDirection: isRTL ? 'row-reverse' : 'row'}]}
//       activeOpacity={0.82}
//       onPress={() => onSelect(item)}>
//       <CustomView
//         style={[
//           styles.txCardLeft,
//           {
//             paddingRight: isRTL ? 0 : 12,
//             paddingLeft: isRTL ? 12 : 0,
//             alignItems: isRTL ? 'flex-end' : 'flex-start',
//           },
//         ]}>
//         <View
//           style={[
//             styles.txTypeTag,
//             item.type === 'Import' ? styles.importTag : styles.exportTag,
//           ]}>
//           <CustomText style={styles.txTypeText} paddingTop={0}>
//             {item.type === 'Import' ? t('import') : t('export')}
//           </CustomText>
//         </View>

//         <CustomText style={styles.txInvoice} paddingTop={0}>
//           {item.invoice}
//         </CustomText>

//         <CustomText style={styles.txParty} paddingTop={0}>
//           {item.counterparty}
//         </CustomText>

//         <CustomText style={styles.txDate} paddingTop={0}>
//           {item.date}
//         </CustomText>
//       </CustomView>

//       <CustomView
//         style={[
//           styles.txCardRight,
//           {alignItems: isRTL ? 'flex-start' : 'flex-end'},
//         ]}>
//         <CustomText
//           style={[
//             styles.txAmount,
//             {color: item.amount >= 0 ? C.success : C.text},
//           ]}
//           paddingTop={0}>
//           {fmt(item.amount, item.currency)}
//         </CustomText>

//         <StatusBadge status={item.status} />

//         <CustomText style={styles.txChevron} paddingTop={0}>
//           {isRTL ? '‹' : '›'}
//         </CustomText>
//       </CustomView>
//     </TouchableOpacity>
//   );

//   return (
//     <SafeAreaView style={styles.safeArea}>
//       <StatusBar barStyle="light-content" backgroundColor={C.primaryDark} />

//       <CustomView style={styles.listHeader}>
//         <View>
//           <CustomText style={styles.listHeaderSub} paddingTop={0}>
//             {t('welcomeBack')}
//           </CustomText>
//           <CustomText style={styles.listHeaderTitle} paddingTop={0}>
//             {t('transactions')}
//           </CustomText>
//         </View>

//         <View style={styles.avatarCircle}>
//           <CustomText style={styles.avatarText} paddingTop={0}>
//             JD
//           </CustomText>
//         </View>
//       </CustomView>

//       <View style={styles.balanceCard}>
//         <CustomText style={styles.balanceLabel} paddingTop={0}>
//           {t('totalExposure')}
//         </CustomText>

//         <CustomText style={styles.balanceAmount} paddingTop={0}>
//           $278,350.50
//         </CustomText>

//         <CustomView style={styles.balanceRow}>
//           <View style={styles.balanceStat}>
//             <CustomText style={styles.balanceStatLabel} paddingTop={0}>
//               {t('inbound')}
//             </CustomText>
//             <CustomText
//               style={[styles.balanceStatVal, {color: C.success}]}
//               paddingTop={0}>
//               +$59,850.50
//             </CustomText>
//           </View>

//           <View style={styles.balanceDivider} />

//           <View style={styles.balanceStat}>
//             <CustomText style={styles.balanceStatLabel} paddingTop={0}>
//               {t('outbound')}
//             </CustomText>
//             <CustomText
//               style={[styles.balanceStatVal, {color: C.accent}]}
//               paddingTop={0}>
//               −$218,500.00
//             </CustomText>
//           </View>
//         </CustomView>
//       </View>

//       <CustomView style={styles.searchWrap}>
//         <Text style={styles.searchIcon}>🔍</Text>
//         <CustomInput
//           style={styles.searchInput}
//           placeholder={t('searchInvoice')}
//           placeholderTextColor={C.textMuted}
//           value={search}
//           onChangeText={setSearch}
//         />
//       </CustomView>

//       <CustomText style={styles.sectionTitle} paddingTop={0}>
//         {t('recentTransactions')}
//       </CustomText>

//       <FlatList
//         data={filtered}
//         keyExtractor={i => i.id}
//         renderItem={renderItem}
//         contentContainerStyle={styles.listContent}
//         showsVerticalScrollIndicator={false}
//         ItemSeparatorComponent={() => <View style={{height: 10}} />}
//       />
//     </SafeAreaView>
//   );
// }

// ─── Screen 2: Invoice Detail ─────────────────────────────────────────────────
function InvoiceDetailScreen({ transaction, onBack }) {
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={C.primaryDark} />

      {/* Header */}
      <View style={styles.detailHeader}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <View style={styles.detailHeaderText}>
          <Text style={styles.detailHeaderSub}>Invoice Detail</Text>
          <Text style={styles.detailHeaderTitle} numberOfLines={1}>{transaction.invoice}</Text>
        </View>
        <StatusBadge status={transaction.status} />
      </View>

      {/* Summary Strip */}
      <View style={styles.summaryStrip}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Counterparty</Text>
          <Text style={styles.summaryValue} numberOfLines={1}>{transaction.counterparty}</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Amount</Text>
          <Text style={[styles.summaryValue, { color: transaction.amount >= 0 ? C.success : C.primaryLight }]}>
            {fmt(transaction.amount, transaction.currency)}
          </Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Date</Text>
          <Text style={styles.summaryValue}>{transaction.date}</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'documents' && styles.tabActive]}
          onPress={() => setActiveTab('documents')}
        >
          <Text style={[styles.tabText, activeTab === 'documents' && styles.tabTextActive]}>
            📁  Documents
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'forms' && styles.tabActive]}
          onPress={() => setActiveTab('forms')}
        >
          <Text style={[styles.tabText, activeTab === 'forms' && styles.tabTextActive]}>
            📝  Forms
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.tabContent}
        showsVerticalScrollIndicator={false}
      >

        {/* ── DOCUMENTS TAB ── */}
        {activeTab === 'documents' && (
          <>
            <Text style={styles.groupHeading}>Trade Documents</Text>
            <Text style={styles.groupSubheading}>
              {DOCUMENTS.length} documents attached to this transaction
            </Text>
            {DOCUMENTS.map(doc => (
              <TouchableOpacity key={doc.id} style={styles.docCard} activeOpacity={0.8}>
                <View style={styles.docIconWrap}>
                  <Text style={styles.docIcon}>{doc.icon}</Text>
                </View>
                <View style={styles.docInfo}>
                  <Text style={styles.docLabel}>{doc.label}</Text>
                  <Text style={styles.docMeta}>{doc.pages} page{doc.pages !== 1 ? 's' : ''}  ·  {doc.size}  ·  {doc.uploaded}</Text>
                </View>
                <TouchableOpacity style={styles.docViewBtn}>
                  <Text style={styles.docViewText}>View</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            ))}

            {/* Upload zone */}
            <TouchableOpacity style={styles.uploadZone} activeOpacity={0.75}>
              <Text style={styles.uploadIcon}>⊕</Text>
              <Text style={styles.uploadLabel}>Upload New Document</Text>
              <Text style={styles.uploadHint}>PDF, JPG, PNG — max 20 MB</Text>
            </TouchableOpacity>
          </>
        )}

        {/* ── FORMS TAB ── */}
        {activeTab === 'forms' && (
          <>
            <Text style={styles.groupHeading}>Required Forms</Text>
            <Text style={styles.groupSubheading}>
              Complete all fields before submitting the transaction
            </Text>

            {formSubmitted ? (
              <View style={styles.successCard}>
                <Text style={styles.successIcon}>✅</Text>
                <Text style={styles.successTitle}>Forms Submitted</Text>
                <Text style={styles.successSub}>
                  Your transaction forms have been sent for review. You'll receive a confirmation shortly.
                </Text>
                <TouchableOpacity style={styles.successBtn} onPress={() => setFormSubmitted(false)}>
                  <Text style={styles.successBtnText}>Edit Forms</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                {/* Form Group 1: Payment Details */}
                <View style={styles.formGroup}>
                  <View style={styles.formGroupHeader}>
                    <View style={styles.formGroupNum}><Text style={styles.formGroupNumText}>01</Text></View>
                    <Text style={styles.formGroupTitle}>Payment Details</Text>
                  </View>

                  <Text style={styles.fieldLabel}>Payment Reference *</Text>
                  <TextInput
                    style={styles.fieldInput}
                    placeholder="e.g. PAY-2024-XXXX"
                    placeholderTextColor={C.textMuted}
                    value={formData.paymentRef}
                    onChangeText={v => setField('paymentRef', v)}
                  />

                  <Text style={styles.fieldLabel}>Bank Routing Code *</Text>
                  <TextInput
                    style={styles.fieldInput}
                    placeholder="e.g. 021000021"
                    placeholderTextColor={C.textMuted}
                    keyboardType="numeric"
                    value={formData.bankCode}
                    onChangeText={v => setField('bankCode', v)}
                  />

                  <Text style={styles.fieldLabel}>SWIFT / BIC Code *</Text>
                  <TextInput
                    style={styles.fieldInput}
                    placeholder="e.g. CHASUS33"
                    placeholderTextColor={C.textMuted}
                    autoCapitalize="characters"
                    value={formData.swiftCode}
                    onChangeText={v => setField('swiftCode', v)}
                  />

                  <Text style={styles.fieldLabel}>Remittance Information</Text>
                  <TextInput
                    style={[styles.fieldInput, styles.fieldInputMulti]}
                    placeholder="Additional payment instructions…"
                    placeholderTextColor={C.textMuted}
                    multiline
                    numberOfLines={3}
                    value={formData.remittance}
                    onChangeText={v => setField('remittance', v)}
                  />
                </View>

                {/* Form Group 2: Compliance & Declaration */}
                <View style={styles.formGroup}>
                  <View style={styles.formGroupHeader}>
                    <View style={styles.formGroupNum}><Text style={styles.formGroupNumText}>02</Text></View>
                    <Text style={styles.formGroupTitle}>Compliance & Declaration</Text>
                  </View>

                  <Text style={styles.fieldLabel}>Purpose of Transfer *</Text>
                  <TextInput
                    style={styles.fieldInput}
                    placeholder="e.g. Goods Import — Electronics"
                    placeholderTextColor={C.textMuted}
                    value={formData.purpose}
                    onChangeText={v => setField('purpose', v)}
                  />

                  <Text style={styles.fieldLabel}>Declared Goods Value ({transaction.currency}) *</Text>
                  <TextInput
                    style={styles.fieldInput}
                    placeholder="0.00"
                    placeholderTextColor={C.textMuted}
                    keyboardType="decimal-pad"
                    value={formData.declaredVal}
                    onChangeText={v => setField('declaredVal', v)}
                  />

                  <Text style={styles.fieldLabel}>Exchange Rate Applied</Text>
                  <TextInput
                    style={styles.fieldInput}
                    placeholder="e.g. 1.0823"
                    placeholderTextColor={C.textMuted}
                    keyboardType="decimal-pad"
                    value={formData.exchangeRate}
                    onChangeText={v => setField('exchangeRate', v)}
                  />

                  <Text style={styles.fieldLabel}>Additional Notes</Text>
                  <TextInput
                    style={[styles.fieldInput, styles.fieldInputMulti]}
                    placeholder="Compliance notes, special instructions…"
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
                  <Text style={styles.submitBtnText}>Submit Forms</Text>
                </TouchableOpacity>
                <View style={{ height: 32 }} />
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

  // ── List Header
  listHeader: {
    backgroundColor: C.primary,
    paddingHorizontal: 22,
    paddingTop: Platform.OS === 'android' ? 16 : 10,
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
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 18,
    backgroundColor: C.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  searchIcon: { fontSize: 14, marginRight: 8 },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: C.text,
    padding: 0,
  },

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
    paddingTop: Platform.OS === 'android' ? 16 : 10,
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