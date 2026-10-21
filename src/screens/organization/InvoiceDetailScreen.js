import React, {useContext, useEffect, useState} from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  Platform,
} from 'react-native';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTranslation} from 'react-i18next';
import {useRoute, useNavigation} from '@react-navigation/native';

import {LanguageContext} from '../../../App';

import {useAlert} from '../../context/AlertContext';
import {useAuth} from '../../context/AuthContext';
import CustomText from '../../components/CustomText';
import StatusBadge from '../../components/StatusBadge';
import PaymentStatusBadge from '../../components/PaymentStatusBadge';
import StripedCard from '../../components/StripedCard';
import LoadingState from '../../components/LoadingState';
import ErrorState from '../../components/ErrorState';
import DocumentListItem from '../../components/DocumentListItem';
import InfoBox from '../../components/InfoBox';
import PrimaryButton from '../../components/PrimaryButton';
import FormField from '../../components/FormField';
import {
  getInvoiceMainFiles,
  getInvoiceFileUrl,
  getInvoiceById,
  getMultiContainerInvoices,
  saveNotesForBank,
} from '../../services/invoices/multiContainerWithoutC';
import {downloadApplicationFiles} from '../../utils/applicationFiles';
import {
  getPaymentDetail,
  getInvoicePayments,
  updateInvoicePaymentStatus,
} from '../../services/paymentDetails';
import {COLORS, makeShadow} from '../../constants/theme';

const TABS = {
  DOCUMENTS: 'documents',
  PAYMENT: 'payment',
  CONTAINERS: 'containers',
};

// Sources merged into the GET response from other tables — the web page's
// getInvoiceDocs drops them from the invoice's own doc list.
const HIDDEN_DOC_TYPES = [
  'supplierCertificate',
  'articleOfAssociation',
  'articlesOfAssociation',
  'finalAccounts',
  'BaghdadTransactionRequest',
];
// Base cosmetic top padding for detailHeader — kept as a raw constant (not
// read back off styles.detailHeader) since StyleSheet.create() output isn't
// guaranteed to still expose plain numeric fields at render time.
const DETAIL_HEADER_BASE_PADDING_TOP = Platform.OS === 'android' ? 16 : 10;

// Web ViewInvoice.js's invoiceStatus, derived from the invoice's companyStatus.
const invoiceStatusFromCompanyStatus = companyStatus =>
  ({
    NOT_STARTED: 'SENT',
    NOT_SENT: 'NOT_SENT',
    PENDING: 'PENDING',
    REJECTED: 'INCOMPLETE',
    ACCEPTED: 'ACCEPTED',
    SENT_TO_POLICIES: 'PRIMARY_CHECK',
  })[companyStatus] || 'PENDING';

const dateOnly = value => (value ? new Date(value).toISOString().split('T')[0] : '');

// Mirrors the web's ViewInvoice page: invoice/other/bank documents, an
// "edit documents" action gated on the invoice's bank status, bank notes, and
// the full list of the invoice's payments. Edits happen on their own screens
// (EditInvoiceDocuments / EditPaymentDocuments) with a single Save, like the
// web's modals.
const InvoiceDetailScreen = () => {
  const {t} = useTranslation();
  const route = useRoute();
  const navigation = useNavigation();
  const {showAlert} = useAlert();
  const {session} = useAuth();
  const {currentDirection} = useContext(LanguageContext);
  const isRTL = currentDirection === 'rtl';
  const rowDirection = {flexDirection: isRTL ? 'row-reverse' : 'row'};
  const insets = useSafeAreaInsets();

  // Local, refreshable copy of the invoice — the route param is a snapshot
  // from the list fetch and goes stale the moment a bank application is
  // generated or sent, so we re-pull it on focus rather than trusting the
  // param forever.
  const [invoice, setInvoice] = useState(route.params.invoice);
  const hasContainers = Array.isArray(invoice.containers) && invoice.containers.length > 0;

  const [activeTab, setActiveTab] = useState(TABS.DOCUMENTS);

  const [invoiceDocs, setInvoiceDocs] = useState([]);
  const [docsLoading, setDocsLoading] = useState(true);
  const [docsError, setDocsError] = useState(null);

  // Every payment of the invoice, each with its bank-form docs attached.
  const [payments, setPayments] = useState([]);
  const [paymentsLoading, setPaymentsLoading] = useState(true);
  const [paymentsError, setPaymentsError] = useState(null);

  // Raw getMultiContainersInvoiceById row (bank/branch/account ids, bankStatus,
  // companyStatus, rejectionReason, notesForBank…) — the list DTO omits them.
  const [rawInvoice, setRawInvoice] = useState(null);

  const [isSendingToBank, setIsSendingToBank] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);
  const [notesOpen, setNotesOpen] = useState(false);
  const [notesDraft, setNotesDraft] = useState('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);

  const loadInvoiceDocs = async () => {
    setDocsLoading(true);
    setDocsError(null);
    try {
      const data = await getInvoiceMainFiles(invoice.id);
      setInvoiceDocs((data?.data?.documents || []).filter(doc => !HIDDEN_DOC_TYPES.includes(doc.type)));
    } catch (err) {
      setDocsError(t('genericErrorMessage'));
    } finally {
      setDocsLoading(false);
    }
  };

  const loadPayments = async () => {
    setPaymentsLoading(true);
    setPaymentsError(null);
    try {
      const list = await getInvoicePayments(invoice.id);
      const details = await Promise.all((list || []).map(p => getPaymentDetail(p.id)));
      setPayments((list || []).map((p, i) => ({...p, docs: details[i]?.MCIPaymentDocs || [], currency: details[i]?.currency})));
    } catch (err) {
      setPaymentsError(t('genericErrorMessage'));
    } finally {
      setPaymentsLoading(false);
    }
  };

  const loadRawInvoice = async () => {
    try {
      const full = await getInvoiceById(invoice.id);
      if (full) {
        setRawInvoice(full);
        setInvoice(prev => ({...prev, notesForBank: full.notesForBank, bankStatus: full.bankStatus}));
      }
    } catch (err) {
      // Non-fatal: bank-notes / gating just stay at their last known values.
    }
  };

  const refreshInvoice = async () => {
    try {
      const params = {
        page: 1,
        limit: 1,
        type: 'invoiceNumber',
        query: invoice.invoiceNumber,
        // See HomeScreen's fetchInvoices for why this sentinel is required.
        supplierId: 'All',
      };
      if (invoice.subCompany?.id) {
        params.subCompanyId = invoice.subCompany.id;
      }
      const data = await getMultiContainerInvoices(params);
      const fresh = data?.invoices?.[0];
      if (fresh) {
        // The list endpoint's DTO deliberately omits notesForBank/bankStatus
        // (raw columns) — keep the byId-fetched values instead of clobbering.
        setInvoice(prev => ({...fresh, notesForBank: prev?.notesForBank, bankStatus: prev?.bankStatus}));
      }
    } catch (err) {
      // Non-fatal — the screen keeps showing the last known state.
    }
    loadRawInvoice();
    loadInvoiceDocs();
    loadPayments();
  };

  useEffect(() => {
    loadRawInvoice();
    loadInvoiceDocs();
    loadPayments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoice.id]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', refreshInvoice);
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigation]);

  const handleViewDoc = doc => {
    navigation.navigate('DocumentViewer', {
      url: getInvoiceFileUrl(doc.id),
      title: doc.type,
    });
  };

  const lastPayment = payments[payments.length - 1];
  const isEditablePaymentStatus = status => status === 'NOT_SENT' || status === 'REJECTED';
  // Web: the last payment is still editable, or the bank rejected the invoice.
  const canEditPayment = isEditablePaymentStatus(lastPayment?.companyPaymentStatus) || rawInvoice?.bankStatus === 'REJECTED';
  // Web's canEditDocument (getMultiContainersInvoiceWithoutC).
  const allowEditDocuments = rawInvoice?.bankStatus === 'REJECTED' || rawInvoice?.bankStatus === 'NOT_SENT';
  // Web's validateDocuments: the invoice plus Baghdad's transaction request.
  const hasInvoiceDoc = invoiceDocs.some(doc => doc.type === 'invoice');
  const hasTransactionRequest = payments.some(p => p.docs.some(doc => doc.type === 'BaghdadTransactionRequest'));
  const isSendDisabled = !(hasInvoiceDoc && hasTransactionRequest);
  const invoiceStatus = invoiceStatusFromCompanyStatus(rawInvoice?.companyStatus);
  const bankDocs = payments.flatMap(p => p.docs);
  const invoiceTypeDocs = invoiceDocs.filter(doc => doc.type.startsWith('invoice'));
  const otherTypeDocs = invoiceDocs.filter(doc => !doc.type.startsWith('invoice'));

  const handleSaveNotes = async () => {
    setIsSavingNotes(true);
    try {
      await saveNotesForBank(invoice.id, notesDraft);
      setNotesOpen(false);
      await loadRawInvoice();
    } catch (err) {
      showAlert(t('genericErrorMessage'));
    } finally {
      setIsSavingNotes(false);
    }
  };

  const handleDownloadFiles = async payment => {
    if (!rawInvoice) {
      return;
    }
    setDownloadingId(payment.id);
    try {
      await downloadApplicationFiles({invoice, rawInvoice, payment, userId: session?.userId});
    } catch (err) {
      if (!(err?.message && /cancel/i.test(err.message))) {
        showAlert(t('downloadFilesError'));
      }
    } finally {
      setDownloadingId(null);
    }
  };

  const handleSendToBank = () => {
    showAlert(t('sendToBankConfirmTitle'), t('edSendConfirm'), [
      {text: t('cancel'), style: 'cancel'},
      {
        text: t('sendToBankAction'),
        onPress: async () => {
          setIsSendingToBank(true);
          try {
            await updateInvoicePaymentStatus(lastPayment.id, {status: 'NOT_STARTED'});
            await refreshInvoice();
          } catch (err) {
            showAlert(t('edSendError'));
          } finally {
            setIsSendingToBank(false);
          }
        },
      },
    ]);
  };

  const renderDocs = docs =>
    docs.map(doc => (
      <DocumentListItem key={doc.id} type={doc.type} isRTL={isRTL} onView={() => handleViewDoc(doc)} />
    ));

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primaryDark} />

      <View style={[styles.detailHeader, rowDirection, {paddingTop: DETAIL_HEADER_BASE_PADDING_TOP + insets.top}]}>
        <TouchableOpacity style={styles.backBtn} onPress={navigation.goBack} activeOpacity={0.7}>
          <CustomText style={styles.backIcon} paddingTop={0}>
            {isRTL ? '›' : '‹'}
          </CustomText>
        </TouchableOpacity>
        <View style={styles.detailHeaderText}>
          <CustomText style={styles.detailHeaderSub} paddingTop={0}>
            {t('invoiceDetail')}
          </CustomText>
          <CustomText bold style={styles.detailHeaderTitle} numberOfLines={1}>
            {invoice.invoiceNumber}
          </CustomText>
          {invoice.supplier?.name ? (
            <CustomText style={styles.detailHeaderBank}>{invoice.supplier.name}</CustomText>
          ) : null}
        </View>
        <StatusBadge status={invoice.generalBadgeStatus} />
      </View>

      <View style={styles.summaryStrip}>
        <View style={[styles.summaryRow3, rowDirection]}>
          <View style={styles.summaryItem}>
            <CustomText style={styles.summaryLabel} paddingTop={0}>
              {t('applicationBankLabel')}
            </CustomText>
            <CustomText bold style={styles.summaryValue} numberOfLines={1}>
              {invoice.applicationBank?.name}
            </CustomText>
          </View>
          <View style={styles.summaryItem}>
            <CustomText style={styles.summaryLabel} paddingTop={0}>
              {t('amount')}
            </CustomText>
            <CustomText bold style={[styles.summaryValue, styles.summaryAmount]} numberOfLines={1}>
              {invoice.amount || `${invoice.amountForSupplier} ${invoice.currency || ''}`}
            </CustomText>
          </View>
          <View style={styles.summaryItem}>
            <CustomText style={styles.summaryLabel} paddingTop={0}>
              {t('date')}
            </CustomText>
            <CustomText bold style={styles.summaryValue} numberOfLines={1}>
              {invoice.date ? new Date(invoice.date).toISOString().split('T')[0] : '—'}
            </CustomText>
          </View>
        </View>

        {invoice.notesForBank ? (
          <View style={styles.notesForBankBox}>
            <CustomText bold style={styles.notesForBankTitle}>
              {t('notesForBankLabel')}
            </CustomText>
            <CustomText style={styles.notesForBankText} lineHeight={22}>
              {invoice.notesForBank}
            </CustomText>
          </View>
        ) : null}
      </View>

      <View style={[styles.tabBar, rowDirection]}>
        <TouchableOpacity
          style={[styles.tab, activeTab === TABS.DOCUMENTS && styles.tabActive]}
          onPress={() => setActiveTab(TABS.DOCUMENTS)}>
          <View style={styles.tabContent}>
            <CustomText style={styles.tabIcon} paddingTop={0}>
              📁
            </CustomText>
            <CustomText
              bold={activeTab === TABS.DOCUMENTS}
              style={[styles.tabText, activeTab === TABS.DOCUMENTS && styles.tabTextActive]}
              paddingTop={0}>
              {t('tabDocuments')}
            </CustomText>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === TABS.PAYMENT && styles.tabActive]}
          onPress={() => setActiveTab(TABS.PAYMENT)}>
          <View style={styles.tabContent}>
            <CustomText style={styles.tabIcon} paddingTop={0}>
              💳
            </CustomText>
            <CustomText
              bold={activeTab === TABS.PAYMENT}
              style={[styles.tabText, activeTab === TABS.PAYMENT && styles.tabTextActive]}
              paddingTop={0}>
              {t('tabPayment')}
            </CustomText>
          </View>
        </TouchableOpacity>
        {hasContainers ? (
          <TouchableOpacity
            style={[styles.tab, activeTab === TABS.CONTAINERS && styles.tabActive]}
            onPress={() => setActiveTab(TABS.CONTAINERS)}>
            <View style={styles.tabContent}>
              <CustomText style={styles.tabIcon} paddingTop={0}>
                🚢
              </CustomText>
              <CustomText
                bold={activeTab === TABS.CONTAINERS}
                style={[styles.tabText, activeTab === TABS.CONTAINERS && styles.tabTextActive]}
                paddingTop={0}>
                {t('tabContainers')}
              </CustomText>
            </View>
          </TouchableOpacity>
        ) : null}
      </View>

      <ScrollView style={styles.flex} contentContainerStyle={styles.container}>
        {activeTab === TABS.CONTAINERS ? (
          <View style={styles.section}>
            <InfoBox text={t('containersNoteMessage')} style={styles.infoNote} />
            {invoice.containers.map((containerNumber, index) => (
              <View key={`${containerNumber}-${index}`} style={styles.containerChip}>
                <CustomText paddingTop={0}>{containerNumber}</CustomText>
              </View>
            ))}
          </View>
        ) : activeTab === TABS.DOCUMENTS ? (
          docsLoading || paymentsLoading ? (
            <View style={styles.card}>
              <LoadingState />
            </View>
          ) : docsError ? (
            <View style={styles.card}>
              <ErrorState message={docsError} onRetry={loadInvoiceDocs} />
            </View>
          ) : (
            <>
              <CustomText bold style={styles.sectionTitle}>
                {t('invoiceDocumentsTitle')}
              </CustomText>
              {invoiceTypeDocs.length ? renderDocs(invoiceTypeDocs) : <InfoBox text={t('edNoDocuments')} style={styles.infoNote} />}

              <CustomText bold style={styles.sectionTitle}>
                {t('edOtherDocs')}
              </CustomText>
              {otherTypeDocs.length ? renderDocs(otherTypeDocs) : <InfoBox text={t('edNoDocuments')} style={styles.infoNote} />}

              <CustomText bold style={styles.sectionTitle}>
                {t('bankFormsTitle')}
              </CustomText>
              {bankDocs.length ? renderDocs(bankDocs) : <InfoBox text={t('edNoDocuments')} style={styles.infoNote} />}

              <View style={styles.actionsWrap}>
                <PrimaryButton
                  title={t('edEditDocuments')}
                  variant="secondary"
                  disabled={!allowEditDocuments}
                  onPress={() => navigation.navigate('EditInvoiceDocuments', {invoiceId: invoice.id})}
                  style={styles.actionBtn}
                />
                {notesOpen ? (
                  <>
                    <FormField
                      label={t('notesForBankLabel')}
                      value={notesDraft}
                      onChangeText={setNotesDraft}
                      multiline
                    />
                    <View style={[styles.notesActions, rowDirection]}>
                      <PrimaryButton
                        title={t('cancel')}
                        variant="secondary"
                        onPress={() => setNotesOpen(false)}
                        style={styles.notesBtn}
                      />
                      <PrimaryButton
                        title={t('edSave')}
                        onPress={handleSaveNotes}
                        loading={isSavingNotes}
                        style={styles.notesBtn}
                      />
                    </View>
                  </>
                ) : (
                  <PrimaryButton
                    title={t('edAddNotes')}
                    variant="secondary"
                    onPress={() => {
                      setNotesDraft(invoice.notesForBank || '');
                      setNotesOpen(true);
                    }}
                    style={styles.actionBtn}
                  />
                )}
              </View>
            </>
          )
        ) : paymentsLoading ? (
          <View style={styles.card}>
            <LoadingState />
          </View>
        ) : paymentsError ? (
          <View style={styles.card}>
            <ErrorState message={paymentsError} onRetry={loadPayments} />
          </View>
        ) : (
          <>
            <CustomText bold style={styles.sectionTitle}>
              {t('edSenderReceiver')}
            </CustomText>
            <StripedCard
              isRTL={isRTL}
              cardStyle={styles.cardPolish}
              items={[
                {
                  label: t('senderLabel'),
                  value: isRTL ? invoice.subCompany?.nameInAr || invoice.subCompany?.name : invoice.subCompany?.name,
                },
                {label: t('recipientLabel'), value: invoice.supplier?.name},
              ]}
            />

            <CustomText bold style={styles.sectionTitle}>
              {t('edStatusDetails')}
            </CustomText>
            <StripedCard
              isRTL={isRTL}
              cardStyle={styles.cardPolish}
              items={[
                {
                  label: t('edStatus'),
                  value: lastPayment?.transactionNumber ? (
                    <View style={styles.statusStack}>
                      {invoiceStatus === 'INCOMPLETE' ? <PaymentStatusBadge status={invoiceStatus} /> : null}
                      <CustomText paddingTop={0} style={styles.transferNumber}>
                        {t('edTransferNumber')}: {lastPayment.transactionNumber}
                      </CustomText>
                    </View>
                  ) : (
                    <PaymentStatusBadge status={invoiceStatus} />
                  ),
                },
                ...(rawInvoice?.rejectionReason
                  ? [{label: t('edDeclineReason'), value: rawInvoice.rejectionReason}]
                  : []),
              ]}
            />

            <CustomText bold style={styles.sectionTitle}>
              {t('edPayments')}
            </CustomText>
            {payments.length === 0 ? (
              <InfoBox text={t('edNoPayments')} style={styles.infoNote} />
            ) : (
              payments.map(payment => {
                const currency = payment.currency || invoice.currency || invoice.supplier?.currency || 'USD';
                return (
                  <View key={payment.id} style={styles.paymentCard}>
                    <View style={[styles.paymentTop, rowDirection]}>
                      <CustomText bold style={styles.paymentAmount} paddingTop={0}>
                        {Number(payment.amount).toFixed(4)} {currency}
                      </CustomText>
                      <CustomText style={styles.paymentDate} paddingTop={0}>
                        {dateOnly(payment.date)}
                      </CustomText>
                    </View>
                    <View style={styles.paymentStatusRow}>
                      {payment.transactionNumber ? (
                        <>
                          {payment.companyPaymentStatus === 'REJECTED' ? (
                            <PaymentStatusBadge status={payment.companyPaymentStatus} />
                          ) : null}
                          <CustomText paddingTop={0} style={styles.transferNumber}>
                            {t('edTransferNumber')}: {payment.transactionNumber}
                          </CustomText>
                        </>
                      ) : (
                        <PaymentStatusBadge
                          status={payment.companyPaymentStatus === 'SENT_TO_POLICIES' ? 'PRIMARY_CHECK' : payment.companyPaymentStatus}
                        />
                      )}
                    </View>
                    {payment.docs.length ? (
                      <View style={styles.paymentDocs}>{renderDocs(payment.docs)}</View>
                    ) : null}
                    <View style={[styles.paymentActions, rowDirection]}>
                      <PrimaryButton
                        title={t('edEdit')}
                        variant="secondary"
                        disabled={!isEditablePaymentStatus(payment.companyPaymentStatus)}
                        onPress={() =>
                          navigation.navigate('EditPaymentDocuments', {
                            invoiceId: invoice.id,
                            paymentId: payment.id,
                            bankNameWithNoSpace: invoice.applicationBank?.nameWithNoSpace,
                          })
                        }
                        style={styles.paymentBtn}
                      />
                      <PrimaryButton
                        title={t('downloadFilesAction')}
                        variant="secondary"
                        loading={downloadingId === payment.id}
                        disabled={downloadingId != null}
                        onPress={() => handleDownloadFiles(payment)}
                        style={styles.paymentBtn}
                      />
                    </View>
                  </View>
                );
              })
            )}

            {lastPayment?.companyPaymentStatus === 'NOT_STARTED' ? (
              <InfoBox variant="success" text={t('edSentToBank')} style={styles.infoNote} />
            ) : null}
            {canEditPayment && isSendDisabled ? (
              <InfoBox text={t('edUploadMandatory')} style={styles.infoNote} />
            ) : null}
            {canEditPayment && lastPayment ? (
              <View style={styles.actionsWrap}>
                <PrimaryButton
                  title={t('sendToBankAction')}
                  onPress={handleSendToBank}
                  loading={isSendingToBank}
                  disabled={isSendDisabled}
                  style={styles.actionBtn}
                />
              </View>
            ) : null}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  statusStack: {alignItems: 'flex-end', gap: 6},
  transferNumber: {fontSize: 12, color: COLORS.success, fontWeight: '700'},
  paymentCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    marginBottom: 10,
  },
  paymentTop: {justifyContent: 'space-between', alignItems: 'center'},
  paymentAmount: {fontSize: 15, color: COLORS.text},
  paymentDate: {fontSize: 12, color: COLORS.textMuted},
  paymentStatusRow: {marginTop: 8, gap: 6, alignItems: 'flex-start'},
  paymentDocs: {marginTop: 10},
  paymentActions: {marginTop: 10, gap: 8},
  paymentBtn: {flex: 1},
  notesActions: {gap: 8},
  notesBtn: {flex: 1},
  safeArea: {flex: 1, backgroundColor: COLORS.bg},
  flex: {flex: 1},
  container: {padding: 16, paddingBottom: 40},
  emptyActionWrap: {padding: 24, alignItems: 'center'},
  fullWidthBtn: {width: '100%', marginTop: 12},
  actionsWrap: {marginTop: 16, gap: 10},
  actionBtn: {marginTop: 0},
  sentNotice: {fontSize: 12, color: COLORS.success, fontWeight: '600', padding: 8},

  // ── Detail header (matches HomeScreenOld's mock InvoiceDetailScreen)
  detailHeader: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingTop: DETAIL_HEADER_BASE_PADDING_TOP,
    paddingBottom: 16,
    alignItems: 'center',
    columnGap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {color: '#fff', fontSize: 24, lineHeight: 28, fontWeight: '300'},
  detailHeaderText: {flex: 1},
  detailHeaderSub: {
    color: COLORS.accent,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  detailHeaderTitle: {color: '#fff', fontSize: 16, marginTop: 1},
  detailHeaderBank: {color: 'rgba(255,255,255,0.75)', fontSize: 11, marginTop: 2},

  // ── Summary strip — flat, no card styling, sits flush under the header
  // (matches HomeScreenOld's mock exactly, not a floating card).
  summaryStrip: {
    backgroundColor: COLORS.surface,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  summaryRow3: {flexDirection: 'row', columnGap: 8},
  summaryItem: {flex: 1},
  summaryLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  summaryValue: {fontSize: 13, color: COLORS.text, marginTop: 3},
  summaryAmount: {color: COLORS.primaryLight},

  section: {marginBottom: 16},
  sectionTitle: {fontSize: 14, color: '#2A2E3A', marginTop: 16, marginBottom: 8},
  infoNote: {marginBottom: 12},
  containerChip: {
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 6,
    ...makeShadow({y: 1, blur: 4, opacity: 0.04}),
  },

  // ── Tabs (underline style)
  notesForBankBox: {
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
  },
  notesForBankTitle: {fontSize: 12, color: COLORS.textMuted, marginBottom: 2},
  notesForBankText: {fontSize: 13, color: COLORS.text},

  tabBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabActive: {borderBottomColor: COLORS.primary},
  tabContent: {flexDirection: 'row', alignItems: 'center', columnGap: 5},
  tabIcon: {fontSize: 13},
  tabText: {fontSize: 13, fontWeight: '600', color: COLORS.textMuted},
  tabTextActive: {color: COLORS.primary, fontWeight: '700'},

  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardPolish: {
    borderWidth: 1,
    borderColor: COLORS.border,
    ...makeShadow({y: 1, blur: 4, opacity: 0.04}),
  },
  uploadSection: {marginBottom: 8},
  addOtherFileBtn: {marginBottom: 20},
  emptyText: {
    padding: 24,
    color: '#8A8FA3',
    fontSize: 13,
  },

  bayanRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
  },
  bayanLabel: {fontSize: 12, color: COLORS.textMuted},
  bayanValue: {fontSize: 12, color: COLORS.primary},

  modalOption: {
    paddingVertical: 12,
    borderRadius: 10,
    marginBottom: 8,
    backgroundColor: COLORS.bg,
  },
  modalOptionActive: {backgroundColor: COLORS.primary},
  modalOptionText: {fontSize: 15, color: COLORS.text},
  modalOptionTextActive: {color: '#fff'},
});

export default InvoiceDetailScreen;
