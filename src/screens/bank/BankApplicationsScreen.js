import React, {useContext, useMemo, useState} from 'react';
import {View, StyleSheet, TouchableOpacity, ScrollView} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useTranslation} from 'react-i18next';
import {ChevronRight, Printer, FileSpreadsheet, SlidersHorizontal, X} from 'lucide-react-native';

import {LanguageContext} from '../../../App';
import CustomText from '../../components/CustomText';
import FormField from '../../components/FormField';
import SelectField from '../../components/SelectField';
import BankStatusPill from '../../components/BankStatusPill';
import {useAlert} from '../../context/AlertContext';
import {COLORS} from '../../constants/theme';

// This screen recreates, with mock data, the web app's bank-side "Bank
// Applications" / "Transfer Orders" page (ehsibly-frontend's
// BanksInvoicesApplications.js) so the design can be reviewed inside the
// native app. It is a static preview — not wired to the bank backend, whose
// login/session shape this app doesn't currently support (see AuthContext's
// normalizeSession and AppTabs' SUPPORTED_ORGANIZATION_TYPES).
const PRINT_COLOR = '#03a9f4';
const EXPORT_COLOR = '#71b762';

const MOCK_SENDERS = [
  {id: 'all', name: 'All companies'},
  {id: 'c1', name: 'Al-Amal Textiles Co.'},
  {id: 'c2', name: 'Souq Al-Rasheed Ltd.'},
  {id: 'c3', name: 'Nineveh Steel Group'},
  {id: 'c4', name: 'Basra Marble & Stone'},
];

const MOCK_RECEIVERS = [
  {id: 'all', name: 'All'},
  {id: 's1', name: 'Zhejiang Tailong Trading'},
  {id: 's2', name: 'Shandong Heavy Industries'},
];

const SEARCH_TYPES = [
  {value: 'invoiceNumber', labelKey: 'bankSearchByInvoiceNumber'},
  {value: 'status', labelKey: 'bankSearchByInvoiceStatus'},
  {value: 'paymentsStatus', labelKey: 'bankSearchByPaymentsStatus'},
];

const STATUS_OPTIONS = [
  {id: '', labelKey: 'selectAll'},
  {id: 'NOT_STARTED', labelKey: 'bankStatusNotStarted'},
  {id: 'PENDING', labelKey: 'bankStatusInProgress'},
  {id: 'ACCEPTED', labelKey: 'bankStatusApproved'},
  {id: 'REJECTED', labelKey: 'bankStatusDeclined'},
];

const MOCK_INVOICES = [
  {
    id: 'inv1',
    invoiceNumber: 'INV-2026-00871',
    companyName: 'Al-Amal Textiles Co.',
    supplierName: 'Zhejiang Tailong Trading',
    lastPaymentDate: '2026-07-03',
    paymentsStatus: {variant: 'blue', label: 'bankStatusInProgress'},
    creator: {name: 'Ahmed Kareem', date: '2026-07-01'},
    creatorStatus: {variant: 'green', label: 'bankStatusApproved'},
    auditor: {name: 'Zainab Fadhil', date: '2026-07-02'},
    auditorStatus: {variant: 'blue', label: 'bankStatusInProgress'},
    paidPercent: 62,
    isMine: true,
    isCompleted: false,
    isRejected: false,
    payments: [
      {
        amount: '8,000.00',
        currency: 'USD',
        transactionNumber: null,
        date: '2026-07-02',
        creator: {name: 'Ahmed Kareem', date: '2026-07-01'},
        creatorStatus: {variant: 'green', label: 'bankStatusApproved'},
        auditor: {name: 'Zainab Fadhil', date: '2026-07-02'},
        auditorStatus: {variant: 'blue', label: 'bankStatusInProgress'},
        executor: {name: null},
        executorStatus: {variant: 'gray', label: 'bankStatusNotStarted'},
      },
    ],
  },
  {
    id: 'inv2',
    invoiceNumber: 'INV-2026-00854',
    companyName: 'Souq Al-Rasheed Ltd.',
    supplierName: 'Zhejiang Tailong Trading',
    lastPaymentDate: '2026-06-29',
    paymentsStatus: {variant: 'royalGreen', label: null, transactionNumber: 'TR-88213'},
    creator: {name: 'Mustafa Adnan', date: '2026-06-27'},
    creatorStatus: {variant: 'green', label: 'bankStatusApproved'},
    auditor: {name: 'Huda Salim', date: '2026-06-28'},
    auditorStatus: {variant: 'green', label: 'bankStatusApproved'},
    paidPercent: 100,
    isMine: false,
    isCompleted: true,
    isRejected: false,
    payments: [
      {
        amount: '12,000.00',
        currency: 'USD',
        transactionNumber: 'TR-88213',
        date: '2026-06-28',
        creator: {name: 'Mustafa Adnan', date: '2026-06-27'},
        creatorStatus: {variant: 'green', label: 'bankStatusApproved'},
        auditor: {name: 'Huda Salim', date: '2026-06-28'},
        auditorStatus: {variant: 'green', label: 'bankStatusApproved'},
        executor: {name: 'Karrar Yousif', date: '2026-06-28'},
        executorStatus: {variant: 'green', label: 'bankStatusExecuted'},
      },
      {
        amount: '5,400.00',
        currency: 'USD',
        transactionNumber: null,
        date: '2026-06-29',
        creator: {name: 'Mustafa Adnan', date: null},
        creatorStatus: {variant: 'orange', label: 'bankStatusNotStarted'},
        auditor: {name: null},
        auditorStatus: {variant: 'gray', label: 'bankStatusNotStarted'},
        executor: {name: null},
        executorStatus: {variant: 'gray', label: 'bankStatusNotStarted'},
      },
    ],
  },
  {
    id: 'inv3',
    invoiceNumber: 'INV-2026-00849',
    companyName: 'Nineveh Steel Group',
    supplierName: 'Shandong Heavy Industries',
    lastPaymentDate: '2026-06-25',
    paymentsStatus: {variant: 'red', label: 'bankStatusDeclined'},
    creator: {name: 'Ahmed Kareem', date: '2026-06-24'},
    creatorStatus: {variant: 'red', label: 'bankStatusDeclined'},
    auditor: {name: null},
    auditorStatus: {variant: 'gray', label: 'bankStatusNotStarted'},
    paidPercent: 0,
    isMine: true,
    isCompleted: false,
    isRejected: true,
    payments: [],
  },
  {
    id: 'inv4',
    invoiceNumber: 'INV-2026-00832',
    companyName: 'Basra Marble & Stone',
    supplierName: 'Shandong Heavy Industries',
    lastPaymentDate: '2026-06-21',
    paymentsStatus: {variant: 'gray', label: 'bankStatusNoNewPayments'},
    creator: {name: 'Zainab Fadhil', date: '2026-06-20'},
    creatorStatus: {variant: 'orange', label: 'bankStatusNotStarted'},
    auditor: {name: null},
    auditorStatus: {variant: 'gray', label: 'bankStatusNotStarted'},
    paidPercent: 0,
    isMine: false,
    isCompleted: false,
    isRejected: false,
    payments: [],
  },
];

const NameWithDate = ({name, date, isRTL}) => (
  <View style={isRTL ? styles.nameColRTL : styles.nameCol}>
    <CustomText style={styles.nameText} paddingTop={0}>
      {name || '—'}
    </CustomText>
    {date ? (
      <CustomText style={styles.dateText} paddingTop={0}>
        {date}
      </CustomText>
    ) : null}
  </View>
);

const PaymentRow = ({payment, isRTL, isLast}) => (
  <View style={[styles.paymentRow, isRTL && styles.paymentRowRTL, isLast && styles.paymentRowLast]}>
    <View style={styles.paymentRowHeader}>
      <CustomText bold style={styles.paymentAmount} paddingTop={0}>
        {payment.amount} {payment.currency}
      </CustomText>
      {payment.transactionNumber ? (
        <CustomText bold style={styles.royalGreenText} paddingTop={0}>
          {payment.transactionNumber}
        </CustomText>
      ) : null}
    </View>
    <View style={[styles.paymentMakerRow, isRTL && styles.paymentMakerRowRTL]}>
      <View style={styles.makerCell}>
        <NameWithDate name={payment.creator.name} date={payment.creator.date} isRTL={isRTL} />
        <BankStatusPill variant={payment.creatorStatus.variant} label={payment.creatorStatus.label} />
      </View>
      <View style={styles.makerCell}>
        <NameWithDate name={payment.auditor.name} date={payment.auditor.date} isRTL={isRTL} />
        <BankStatusPill variant={payment.auditorStatus.variant} label={payment.auditorStatus.label} />
      </View>
      <View style={styles.makerCell}>
        <NameWithDate name={payment.executor.name} date={payment.executor.date} isRTL={isRTL} />
        <BankStatusPill variant={payment.executorStatus.variant} label={payment.executorStatus.label} />
      </View>
    </View>
  </View>
);

const InvoiceCard = ({invoice, isRTL, isExpanded, onToggle}) => {
  const {t} = useTranslation();
  const rowDirection = isRTL ? styles.rowRTL : styles.row;

  return (
    <View style={[styles.card, isExpanded && styles.cardExpanded]}>
      <TouchableOpacity style={[styles.cardHeader, rowDirection]} activeOpacity={0.7} onPress={onToggle}>
        <View style={styles.cardHeaderText}>
          <CustomText bold style={styles.invoiceNumber} paddingTop={0}>
            {invoice.invoiceNumber}
          </CustomText>
          <CustomText style={styles.companyName} paddingTop={0}>
            {invoice.companyName}
          </CustomText>
        </View>
        <ChevronRight
          size={20}
          color={COLORS.textMuted}
          style={[styles.chevron, isExpanded && styles.chevronExpanded, isRTL && styles.chevronRTL]}
        />
      </TouchableOpacity>

      <View style={[styles.metaRow, rowDirection]}>
        <CustomText style={styles.metaLabel} paddingTop={0}>
          {t('bankLastPaymentDateLabel')}: {invoice.lastPaymentDate}
        </CustomText>
        {invoice.paymentsStatus.variant === 'royalGreen' ? (
          <CustomText bold style={styles.royalGreenText} paddingTop={0}>
            {invoice.paymentsStatus.transactionNumber}
          </CustomText>
        ) : (
          <BankStatusPill variant={invoice.paymentsStatus.variant} label={invoice.paymentsStatus.label} />
        )}
      </View>

      <View style={[styles.makerSummaryRow, rowDirection]}>
        <View style={styles.makerCell}>
          <CustomText style={styles.makerLabel} paddingTop={0}>
            {t('creator')}
          </CustomText>
          <NameWithDate name={invoice.creator.name} date={invoice.creator.date} isRTL={isRTL} />
          <BankStatusPill variant={invoice.creatorStatus.variant} label={invoice.creatorStatus.label} />
        </View>
        <View style={styles.makerCell}>
          <CustomText style={styles.makerLabel} paddingTop={0}>
            {t('bankAuditorLabel')}
          </CustomText>
          <NameWithDate name={invoice.auditor.name} date={invoice.auditor.date} isRTL={isRTL} />
          <BankStatusPill variant={invoice.auditorStatus.variant} label={invoice.auditorStatus.label} />
        </View>
        <View style={styles.makerCell}>
          <CustomText style={styles.makerLabel} paddingTop={0}>
            {t('bankPaidLabel')}
          </CustomText>
          <CustomText bold style={[styles.paidPercent, invoice.paidPercent >= 100 && styles.paidPercentFull]} paddingTop={0}>
            {invoice.paidPercent}%
          </CustomText>
        </View>
      </View>

      {isExpanded ? (
        <View style={styles.paymentsSection}>
          <CustomText bold style={styles.paymentsSectionTitle} paddingTop={0}>
            {t('bankPaymentsSectionTitle')}
          </CustomText>
          {invoice.payments.length === 0 ? (
            <CustomText style={styles.noPaymentsText} paddingTop={0}>
              {t('bankNoDataFound')}
            </CustomText>
          ) : (
            invoice.payments.map((payment, i) => (
              <PaymentRow
                key={i}
                payment={payment}
                isRTL={isRTL}
                isLast={i === invoice.payments.length - 1}
              />
            ))
          )}
        </View>
      ) : null}
    </View>
  );
};

const BankApplicationsScreen = () => {
  const {t} = useTranslation();
  const {currentDirection} = useContext(LanguageContext);
  const isRTL = currentDirection === 'rtl';
  const {showAlert} = useAlert();

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sender, setSender] = useState(MOCK_SENDERS[0]);
  const [receiver, setReceiver] = useState(MOCK_RECEIVERS[0]);
  const [myTransactionsOnly, setMyTransactionsOnly] = useState(false);
  const [searchType, setSearchType] = useState(SEARCH_TYPES[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(STATUS_OPTIONS[0]);
  const [includeCompleted, setIncludeCompleted] = useState(false);
  const [includeRejected, setIncludeRejected] = useState(false);
  const [includeNotPassedByMaker, setIncludeNotPassedByMaker] = useState(false);
  const [expandedId, setExpandedId] = useState(null);

  const hasActiveFilters =
    !!appliedSearch ||
    sender.id !== 'all' ||
    receiver.id !== 'all' ||
    myTransactionsOnly ||
    includeCompleted ||
    includeRejected ||
    includeNotPassedByMaker;

  const resetFilters = () => {
    setSender(MOCK_SENDERS[0]);
    setReceiver(MOCK_RECEIVERS[0]);
    setMyTransactionsOnly(false);
    setSearchType(SEARCH_TYPES[0]);
    setSearchQuery('');
    setAppliedSearch('');
    setStatusFilter(STATUS_OPTIONS[0]);
    setIncludeCompleted(false);
    setIncludeRejected(false);
    setIncludeNotPassedByMaker(false);
  };

  const handleSearch = () => {
    setAppliedSearch(searchType.value === 'invoiceNumber' ? searchQuery.trim() : '');
  };

  const previewOnly = () => {
    showAlert(t('bankPreviewOnlyTitle'), t('bankPreviewOnlyMessage'), [{text: t('ok')}]);
  };

  const filteredInvoices = useMemo(() => {
    return MOCK_INVOICES.filter(invoice => {
      if (sender.id !== 'all' && invoice.companyName !== sender.name) {
        return false;
      }
      if (receiver.id !== 'all' && invoice.supplierName !== receiver.name) {
        return false;
      }
      if (myTransactionsOnly && !invoice.isMine) {
        return false;
      }
      if (!includeCompleted && invoice.isCompleted) {
        return false;
      }
      if (!includeRejected && invoice.isRejected) {
        return false;
      }
      if (appliedSearch && !invoice.invoiceNumber.toLowerCase().includes(appliedSearch.toLowerCase())) {
        return false;
      }
      return true;
    });
  }, [sender, receiver, myTransactionsOnly, includeCompleted, includeRejected, appliedSearch]);

  const toggleRow = id => setExpandedId(prev => (prev === id ? null : id));

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ScrollView style={styles.flex} contentContainerStyle={styles.container}>
        <View style={styles.previewNote}>
          <CustomText style={styles.previewNoteText} paddingTop={0}>
            {t('bankPreviewNoteText')}
          </CustomText>
        </View>

        <CustomText bold style={styles.pageTitle}>
          {t('bankTransferOrdersTitle')}
        </CustomText>
        <CustomText style={styles.orgLine}>{t('bankOrgLine')}</CustomText>

        <View style={[styles.toolbar, isRTL && styles.toolbarRTL]}>
          <TouchableOpacity
            style={[styles.filterChip, filtersOpen && styles.filterChipOpen]}
            onPress={() => setFiltersOpen(prev => !prev)}>
            <SlidersHorizontal size={16} color={filtersOpen ? COLORS.primary : COLORS.textMuted} />
            <CustomText style={[styles.filterChipText, filtersOpen && styles.filterChipTextOpen]} paddingTop={0}>
              {t('bankFiltersToggle')}
            </CustomText>
          </TouchableOpacity>

          {hasActiveFilters ? (
            <TouchableOpacity style={styles.resetChip} onPress={resetFilters}>
              <X size={13} color={COLORS.textMuted} />
              <CustomText style={styles.resetChipText} paddingTop={0}>
                {t('bankResetFilters')}
              </CustomText>
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity style={[styles.actionBtn, {backgroundColor: PRINT_COLOR}]} onPress={previewOnly}>
            <Printer size={16} color="#fff" />
            <CustomText style={styles.actionBtnText} paddingTop={0}>
              {t('bankPrintAction')}
            </CustomText>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.actionBtn, {backgroundColor: EXPORT_COLOR}]} onPress={previewOnly}>
            <FileSpreadsheet size={16} color="#fff" />
            <CustomText style={styles.actionBtnText} paddingTop={0}>
              {t('bankExportExcelAction')}
            </CustomText>
          </TouchableOpacity>
        </View>

        {filtersOpen ? (
          <View style={styles.filterPanel}>
            <SelectField
              label={t('bankSenderLabel')}
              value={sender}
              options={MOCK_SENDERS}
              onSelect={setSender}
              getLabel={item => item.name}
              getKey={item => item.id}
            />
            <SelectField
              label={t('bankReceiverLabel')}
              value={receiver}
              options={MOCK_RECEIVERS}
              onSelect={setReceiver}
              getLabel={item => item.name}
              getKey={item => item.id}
            />

            <TouchableOpacity
              style={[styles.toggleChip, myTransactionsOnly && styles.toggleChipOn]}
              onPress={() => setMyTransactionsOnly(prev => !prev)}>
              <CustomText
                style={[styles.toggleChipText, myTransactionsOnly && styles.toggleChipTextOn]}
                paddingTop={0}>
                {myTransactionsOnly ? '✓ ' : ''}
                {t('bankMyTransactionsOnly')}
              </CustomText>
            </TouchableOpacity>

            <SelectField
              label={t('bankSearchTypeLabel')}
              value={searchType}
              options={SEARCH_TYPES}
              onSelect={setSearchType}
              getLabel={item => t(item.labelKey)}
              getKey={item => item.value}
            />

            {searchType.value === 'invoiceNumber' ? (
              <FormField
                label={t('bankSearchInputLabel')}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder={t('bankSearchInputPlaceholder')}
              />
            ) : (
              <SelectField
                label={t('bankSearchInputLabel')}
                value={statusFilter}
                options={STATUS_OPTIONS}
                onSelect={setStatusFilter}
                getLabel={item => t(item.labelKey)}
                getKey={item => item.id}
              />
            )}

            <TouchableOpacity style={styles.searchBtn} onPress={handleSearch}>
              <CustomText bold style={styles.searchBtnText} paddingTop={0}>
                {t('search')}
              </CustomText>
            </TouchableOpacity>

            <View style={styles.checksGroup}>
              {[
                {value: includeCompleted, set: setIncludeCompleted, label: t('bankIncludeCompleted')},
                {value: includeRejected, set: setIncludeRejected, label: t('bankIncludeRejected')},
                {
                  value: includeNotPassedByMaker,
                  set: setIncludeNotPassedByMaker,
                  label: t('bankIncludeNotPassedByMaker'),
                },
              ].map(({value, set, label}) => (
                <TouchableOpacity
                  key={label}
                  style={[styles.checkRow, isRTL && styles.checkRowRTL]}
                  onPress={() => set(prev => !prev)}>
                  <View style={[styles.checkbox, value && styles.checkboxChecked]}>
                    {value ? (
                      <CustomText style={styles.checkboxMark} paddingTop={0}>
                        ✓
                      </CustomText>
                    ) : null}
                  </View>
                  <CustomText style={styles.checkLabel} paddingTop={0}>
                    {label}
                  </CustomText>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : null}

        <CustomText style={styles.totalRecords} paddingTop={0}>
          {t('bankTotalRecords')}: {filteredInvoices.length}
        </CustomText>

        {filteredInvoices.length === 0 ? (
          <View style={styles.emptyState}>
            <CustomText center style={styles.emptyStateText}>
              {t('bankNoApplicationsFound')}
            </CustomText>
          </View>
        ) : (
          filteredInvoices.map(invoice => (
            <InvoiceCard
              key={invoice.id}
              invoice={invoice}
              isRTL={isRTL}
              isExpanded={expandedId === invoice.id}
              onToggle={() => toggleRow(invoice.id)}
            />
          ))
        )}

        <View style={styles.pagination}>
          <CustomText style={styles.paginationText} paddingTop={0}>
            {t('bankPageLabel')}: 1 – 1
          </CustomText>
          <CustomText style={styles.paginationText} paddingTop={0}>
            {t('bankTotalRecords')}: {filteredInvoices.length}
          </CustomText>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {flex: 1, backgroundColor: COLORS.bg},
  flex: {flex: 1},
  container: {padding: 16, paddingBottom: 40},
  row: {flexDirection: 'row'},
  rowRTL: {flexDirection: 'row-reverse'},

  previewNote: {
    backgroundColor: '#fff9e6',
    borderWidth: 1,
    borderColor: '#f2cb05',
    borderRadius: 8,
    padding: 10,
    marginBottom: 14,
  },
  previewNoteText: {fontSize: 11.5, color: COLORS.textMuted, lineHeight: 16},

  pageTitle: {fontSize: 19, color: COLORS.text, marginBottom: 2},
  orgLine: {fontSize: 13, color: COLORS.text, marginBottom: 16},

  toolbar: {flexWrap: 'wrap', gap: 8, marginBottom: 14},
  toolbarRTL: {flexDirection: 'row-reverse'},
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  filterChipOpen: {borderColor: COLORS.primary},
  filterChipText: {fontSize: 12.5, color: COLORS.textMuted, fontWeight: '600'},
  filterChipTextOpen: {color: COLORS.primary},
  resetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  resetChipText: {fontSize: 11.5, color: COLORS.textMuted},
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  actionBtnText: {fontSize: 12.5, color: '#fff', fontWeight: '700'},

  filterPanel: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    padding: 14,
    marginBottom: 14,
  },
  toggleChip: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    paddingVertical: 9,
    marginBottom: 14,
  },
  toggleChipOn: {borderColor: COLORS.primary, backgroundColor: COLORS.surfaceAlt},
  toggleChipText: {fontSize: 12.5, color: COLORS.textMuted},
  toggleChipTextOn: {color: COLORS.primary, fontWeight: '700'},
  searchBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 14,
  },
  searchBtnText: {color: '#fff', fontSize: 14},
  checksGroup: {gap: 10},
  checkRow: {flexDirection: 'row', alignItems: 'center', gap: 10},
  checkRowRTL: {flexDirection: 'row-reverse'},
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {backgroundColor: COLORS.primary, borderColor: COLORS.primary},
  checkboxMark: {color: '#fff', fontSize: 11, fontWeight: '700'},
  checkLabel: {fontSize: 12.5, color: COLORS.text, flexShrink: 1},

  totalRecords: {fontSize: 12, color: COLORS.textMuted, textAlign: 'right', marginBottom: 10},

  emptyState: {padding: 30, alignItems: 'center'},
  emptyStateText: {fontSize: 13, color: COLORS.textMuted},

  card: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  cardExpanded: {borderColor: COLORS.primary, borderWidth: 1.5},
  cardHeader: {justifyContent: 'space-between', alignItems: 'center'},
  cardHeaderText: {flex: 1},
  invoiceNumber: {fontSize: 15, color: COLORS.primary},
  companyName: {fontSize: 12.5, color: COLORS.textMuted, marginTop: 2},
  chevron: {transform: [{rotate: '0deg'}]},
  chevronExpanded: {transform: [{rotate: '90deg'}]},
  chevronRTL: {transform: [{rotate: '180deg'}]},

  metaRow: {justifyContent: 'space-between', alignItems: 'center', marginTop: 10},
  metaLabel: {fontSize: 12, color: COLORS.textMuted},
  royalGreenText: {color: '#136207', fontSize: 13},

  makerSummaryRow: {justifyContent: 'space-between', marginTop: 12, gap: 8},
  makerCell: {flex: 1, alignItems: 'center', gap: 4},
  makerLabel: {fontSize: 10.5, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.4},
  nameCol: {alignItems: 'center'},
  nameColRTL: {alignItems: 'center'},
  nameText: {fontSize: 12, color: COLORS.text, fontWeight: '600'},
  dateText: {fontSize: 10, color: COLORS.textMuted, marginTop: 1},
  paidPercent: {fontSize: 15, color: COLORS.text},
  paidPercentFull: {color: '#4caf50'},

  paymentsSection: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.primary,
  },
  paymentsSectionTitle: {fontSize: 12, color: COLORS.textMuted, marginBottom: 8},
  noPaymentsText: {fontSize: 12.5, color: COLORS.textMuted},
  paymentRow: {
    backgroundColor: COLORS.bg,
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
  },
  paymentRowRTL: {},
  paymentRowLast: {marginBottom: 0},
  paymentRowHeader: {flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8},
  paymentAmount: {fontSize: 13, color: COLORS.text},
  paymentMakerRow: {flexDirection: 'row', gap: 6},
  paymentMakerRowRTL: {flexDirection: 'row-reverse'},

  pagination: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  paginationText: {fontSize: 12, color: COLORS.textMuted},
});

export default BankApplicationsScreen;
