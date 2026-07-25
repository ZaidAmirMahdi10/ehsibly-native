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
import {pick, types, isErrorWithCode, errorCodes} from '@react-native-documents/picker';

import {LanguageContext} from '../../../App';

import {useAlert} from '../../context/AlertContext';
import CustomText from '../../components/CustomText';
import StatusBadge from '../../components/StatusBadge';
import StripedCard from '../../components/StripedCard';
import LoadingState from '../../components/LoadingState';
import ErrorState from '../../components/ErrorState';
import DocumentListItem, {DOC_LABEL_KEYS} from '../../components/DocumentListItem';
import DocumentUploadZone from '../../components/DocumentUploadZone';
import InfoBox from '../../components/InfoBox';
import PrimaryButton from '../../components/PrimaryButton';
import FormField from '../../components/FormField';
import ModalSheet from '../../components/ModalSheet';
import {
  getInvoiceMainFiles,
  getInvoiceFileUrl,
  getInvoiceById,
  getMultiContainerInvoices,
  updateInvoiceMainFiles,
  deleteInvoiceDoc,
  setCustomsDeclarationNumber as saveCustomsDeclarationNumber,
} from '../../services/invoices/multiContainerWithoutC';
import {
  getPaymentDetail,
  updateInvoicePaymentStatus,
  updatePaymentDocuments,
} from '../../services/paymentDetails';
import {
  INVOICE_DOC_TYPES,
  NON_INVOICE_DOC_SOURCES,
  paymentDocTypesForBank,
} from '../../constants/documentTypes';
import {COLORS, makeShadow} from '../../constants/theme';

const TABS = {
  DOCUMENTS: 'documents',
  PAYMENT: 'payment',
  CONTAINERS: 'containers',
};

const CUSTOMS_DECLARATION_TYPE = 'customsDeclaration';
// Confirmed against the web app (ViewInvoice.js) — the same fixed 6 options,
// required whenever a customsDeclaration file is uploaded; "03" additionally
// requires shippingPolicy + exitPermit.
const BAYAN_NUMBER_OPTIONS = ['01', '02', '03', '04', '05', '06'];
const BAYAN_NUMBER_REQUIRING_SHIPPING_DOCS = '03';
// Only relevant — and only shown as an upload option — when bayan 03 is
// selected, per the web app's validation in ViewInvoice.js.
const SHIPPING_DOCS_FOR_BAYAN_03 = ['shippingPolicy', 'exitPermit'];
const OTHER_DOC_UPLOAD_KEY = 'otherDoc';
// Base cosmetic top padding for detailHeader — kept as a raw constant (not
// read back off styles.detailHeader) since StyleSheet.create() output isn't
// guaranteed to still expose plain numeric fields at render time.
const DETAIL_HEADER_BASE_PADDING_TOP = Platform.OS === 'android' ? 16 : 10;

// Receives the already-enriched invoice object from HomeScreen's list fetch
// (generalBadgeStatus, latestPaymentDetail, applicationBank, etc. are all
// computed server-side by the list endpoint, not by getMultiContainersInvoiceById
// — re-fetching a raw invoice here would mean re-deriving that logic
// client-side for no benefit, so we just consume what was already fetched).
const InvoiceDetailScreen = () => {
  const {t} = useTranslation();
  const route = useRoute();
  const navigation = useNavigation();
  const {showAlert} = useAlert();
  const {currentDirection} = useContext(LanguageContext);
  const isRTL = currentDirection === 'rtl';
  const rowDirection = {flexDirection: isRTL ? 'row-reverse' : 'row'};
  const insets = useSafeAreaInsets();

  // Local, refreshable copy of the invoice — the route param is a snapshot
  // from the list fetch and goes stale the moment a bank application is
  // generated or sent (latestPaymentDetail/generalBadgeStatus change
  // server-side), so we re-pull it on focus rather than trusting the param
  // forever.
  const [invoice, setInvoice] = useState(route.params.invoice);
  const hasContainers = Array.isArray(invoice.containers) && invoice.containers.length > 0;

  const [activeTab, setActiveTab] = useState(TABS.DOCUMENTS);

  const [invoiceDocs, setInvoiceDocs] = useState([]);
  const [docsLoading, setDocsLoading] = useState(true);
  const [docsError, setDocsError] = useState(null);
  const [bayanNumber, setBayanNumber] = useState(null);
  const [bayanPickerVisible, setBayanPickerVisible] = useState(false);
  const [otherFileModalVisible, setOtherFileModalVisible] = useState(false);
  const [newOtherFileName, setNewOtherFileName] = useState('');

  const [paymentDetail, setPaymentDetail] = useState(null);
  const [paymentLoading, setPaymentLoading] = useState(!!invoice.latestPaymentDetail?.id);
  const [paymentError, setPaymentError] = useState(null);
  const [isSendingToBank, setIsSendingToBank] = useState(false);
  const [uploadingType, setUploadingType] = useState(null);

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
    // loadPaymentDetail/loadInvoiceDocs only re-run automatically when
    // invoice.id or invoice.latestPaymentDetail?.id changes — but editing an
    // existing NOT_SENT/REJECTED application (the common case) updates that
    // same payment row in place, so the id never changes. Without an explicit
    // reload here, coming back from "Edit Request" would keep showing
    // whatever bank-form list was loaded on this screen's first mount, no
    // matter how many times the application gets regenerated.
    loadPaymentDetail();
    loadInvoiceDocs();
  };

  const loadInvoiceDocs = async () => {
    setDocsLoading(true);
    setDocsError(null);
    try {
      const data = await getInvoiceMainFiles(invoice.id);
      setInvoiceDocs(data?.data?.documents || []);
      setBayanNumber(data?.data?.customsDeclrationNumber || null);
    } catch (err) {
      setDocsError(t('genericErrorMessage'));
    } finally {
      setDocsLoading(false);
    }
  };

  const loadPaymentDetail = async () => {
    const paymentId = invoice.latestPaymentDetail?.id;
    if (!paymentId) {
      setPaymentDetail(null);
      setPaymentLoading(false);
      return;
    }
    setPaymentLoading(true);
    setPaymentError(null);
    try {
      const data = await getPaymentDetail(paymentId);
      setPaymentDetail(data);
    } catch (err) {
      setPaymentError(t('genericErrorMessage'));
    } finally {
      setPaymentLoading(false);
    }
  };

  // notesForBank isn't part of the list endpoint's hand-built DTO, so the
  // route-param invoice never carries it — the byId endpoint returns the raw
  // row (all scalars), same as the web app's ViewInvoice.
  useEffect(() => {
    (async () => {
      try {
        const full = await getInvoiceById(invoice.id);
        if (full) {
          // Both fields are raw columns the list endpoint's DTO omits:
          // notesForBank for display, bankStatus for the Edit/Send gating.
          setInvoice(prev => ({...prev, notesForBank: full.notesForBank, bankStatus: full.bankStatus}));
        }
      } catch (err) {
        // Non-fatal: the note simply stays hidden if this lookup fails.
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadInvoiceDocs();
    loadPaymentDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoice.id, invoice.latestPaymentDetail?.id]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', refreshInvoice);
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigation]);

  const handleViewDoc = doc => {
    navigation.navigate('DocumentViewer', {
      url: getInvoiceFileUrl(doc.id),
      title: t(DOC_LABEL_KEYS[doc.type] || 'docViewBtn'),
    });
  };

  const handleDeleteDoc = doc => {
    showAlert(t('deleteDocConfirmTitle'), t('deleteDocConfirmMessage'), [
      {text: t('cancel'), style: 'cancel'},
      {
        text: t('deleteAction'),
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteInvoiceDoc(doc.id);
            await loadInvoiceDocs();
          } catch (err) {
            showAlert(t('genericErrorMessage'));
          }
        },
      },
    ]);
  };

  // Both upload endpoints are full syncs of their doc set — any known field
  // omitted from the request gets deleted server-side. So every upload here
  // must also send an empty-string "keep" marker for every doc already on
  // the invoice/payment other than the one being added, or it'll silently
  // wipe out the rest.
  const uploadDocument = async ({docType, existingTypes, upload, onDone}) => {
    let file;
    try {
      [file] = await pick({type: [types.pdf, types.images]});
    } catch (err) {
      if (!(isErrorWithCode(err) && err.code === errorCodes.OPERATION_CANCELED)) {
        showAlert(t('uploadErrorMessage'));
      }
      return;
    }

    setUploadingType(docType);
    try {
      const formData = new FormData();
      formData.append(docType, {
        uri: file.uri,
        name: file.name || docType,
        type: file.type || 'application/pdf',
      });
      existingTypes
        .filter(existingType => existingType !== docType)
        .forEach(existingType => formData.append(existingType, ''));

      await upload(formData);
      await onDone();
    } catch (err) {
      showAlert(t('uploadErrorMessage'));
    } finally {
      setUploadingType(null);
    }
  };

  const handleUploadInvoiceDoc = docType =>
    uploadDocument({
      docType,
      existingTypes: invoiceDocs
        .map(doc => doc.type)
        .filter(existingType => !NON_INVOICE_DOC_SOURCES.includes(existingType)),
      upload: formData => updateInvoiceMainFiles(invoice.id, formData),
      onDone: loadInvoiceDocs,
    });

  const handleUploadPaymentDoc = docType =>
    uploadDocument({
      docType,
      existingTypes: (paymentDetail?.MCIPaymentDocs || []).map(doc => doc.type),
      upload: formData => updatePaymentDocuments(paymentDetail.id, invoice.id, formData),
      onDone: loadPaymentDetail,
    });

  // Any doc on this invoice whose type isn't one of the fixed known ones is
  // a user-named "other" doc (confirmed against the web app: ViewInvoice.js
  // buckets anything unrecognized into otherFiles, using the type itself as
  // the display name). Unlike fixed doc types, these are additive — the
  // backend never auto-deletes them on sync, and supports any number of
  // them via indexed otherDoc_N fields.
  const isOtherDocType = type => !INVOICE_DOC_TYPES.includes(type) && !NON_INVOICE_DOC_SOURCES.includes(type);

  const handleAddOtherFile = async name => {
    let file;
    try {
      [file] = await pick({type: [types.pdf, types.images]});
    } catch (err) {
      if (!(isErrorWithCode(err) && err.code === errorCodes.OPERATION_CANCELED)) {
        showAlert(t('uploadErrorMessage'));
      }
      return;
    }

    setUploadingType(OTHER_DOC_UPLOAD_KEY);
    try {
      const formData = new FormData();

      // Keep every existing fixed-type doc untouched.
      invoiceDocs
        .filter(doc => !isOtherDocType(doc.type))
        .forEach(doc => formData.append(doc.type, ''));

      // Keep every existing other doc at its own index, re-declaring its
      // name — the backend only protects an otherDoc from the full-sync
      // delete sweep if its name is present in *this* request's
      // otherDocNames metadata, regardless of whether the file itself was
      // re-uploaded or just kept.
      const existingOtherDocs = invoiceDocs.filter(doc => isOtherDocType(doc.type));
      const otherDocMetadata = existingOtherDocs.map((doc, index) => {
        formData.append(`otherDoc_${index}`, '');
        return {index, name: doc.type};
      });

      const newIndex = existingOtherDocs.length;
      formData.append(`otherDoc_${newIndex}`, {
        uri: file.uri,
        name: file.name || name,
        type: file.type || 'application/pdf',
      });
      otherDocMetadata.push({index: newIndex, name});
      formData.append('otherDocNames', JSON.stringify(otherDocMetadata));

      await updateInvoiceMainFiles(invoice.id, formData);
      await loadInvoiceDocs();
    } catch (err) {
      showAlert(t('uploadErrorMessage'));
    } finally {
      setUploadingType(null);
    }
  };

  const handleConfirmAddOtherFile = () => {
    const name = newOtherFileName.trim();
    if (!name) {
      return;
    }
    setOtherFileModalVisible(false);
    setNewOtherFileName('');
    // Presenting the native file picker in the same tick as closing this
    // Modal races its dismissal animation and hangs the app (confirmed
    // directly) — give it a moment to fully close first.
    setTimeout(() => handleAddOtherFile(name), 400);
  };

  // The web app requires a bayan/customs-declaration number ("01".."06")
  // whenever a customsDeclaration file is uploaded — it's a separate field
  // on the invoice itself (not a doc), persisted via its own PUT after the
  // file upload succeeds. If one isn't picked yet, ask first.
  const handleUploadCustomsDeclaration = () => {
    if (!bayanNumber) {
      setBayanPickerVisible(true);
      return;
    }
    handleUploadInvoiceDoc(CUSTOMS_DECLARATION_TYPE);
  };

  const handleSelectBayanNumber = async value => {
    setBayanPickerVisible(false);
    try {
      await saveCustomsDeclarationNumber(invoice.id, value);
      setBayanNumber(value);
      // Same modal-dismissal-vs-picker-presentation race as
      // handleConfirmAddOtherFile — the network call above usually gives
      // the modal enough time to close, but isn't guaranteed to, so add
      // the same explicit buffer.
      setTimeout(() => handleUploadInvoiceDoc(CUSTOMS_DECLARATION_TYPE), 400);
    } catch (err) {
      showAlert(t('genericErrorMessage'));
    }
  };

  const handleSendToBank = async () => {
    // Document-completeness gate (explicit product decision 2026-07-09: the
    // stricter bayan-based set, deliberately broader than web
    // ViewInvoice.js's validateDocuments):
    //   - invoice-level: invoice + customsDeclaration always, plus
    //     shippingPolicy + exitPermit when bayan is '03'
    //     (thirdPartyContract stays optional)
    //   - payment-level: every form slot the application bank defines
    //     (the 5 Baghdad forms / 4 Mansur forms)
    // Docs are re-fetched here so the check can't pass on stale local state
    // (e.g. a doc deleted from the web app since this screen loaded).
    let currentDocs = invoiceDocs;
    let currentBayan = bayanNumber;
    try {
      const data = await getInvoiceMainFiles(invoice.id);
      currentDocs = data?.data?.documents || [];
      currentBayan = data?.data?.customsDeclrationNumber || bayanNumber;
    } catch (err) {
      // Network hiccup — fall back to the state already on screen rather
      // than blocking the action outright.
    }
    const requiredInvoiceDocs = ['invoice', CUSTOMS_DECLARATION_TYPE];
    if (currentBayan === BAYAN_NUMBER_REQUIRING_SHIPPING_DOCS) {
      requiredInvoiceDocs.push(...SHIPPING_DOCS_FOR_BAYAN_03);
    }
    const requiredPaymentDocs = paymentDocTypesForBank(invoice.applicationBank?.nameWithNoSpace);
    const missing = [
      ...requiredInvoiceDocs.filter(type => !currentDocs.some(doc => doc.type === type)),
      ...requiredPaymentDocs.filter(
        type => !(paymentDetail?.MCIPaymentDocs || []).some(doc => doc.type === type),
      ),
    ];
    if (missing.length > 0) {
      const missingLabels = missing.map(type => `• ${t(DOC_LABEL_KEYS[type] || type)}`).join('\n');
      showAlert(
        t('sendToBankMissingDocsTitle'),
        `${t('sendToBankMissingDocsMessage')}\n\n${missingLabels}`,
      );
      return;
    }

    showAlert(t('sendToBankConfirmTitle'), t('sendToBankConfirmMessage'), [
      {text: t('cancel'), style: 'cancel'},
      {
        text: t('sendToBankAction'),
        onPress: async () => {
          setIsSendingToBank(true);
          try {
            // The real "Send to Bank" action confirmed against the web app:
            // a plain status write, not an email.
            await updateInvoicePaymentStatus(paymentDetail.id, {status: 'NOT_STARTED'});
            await refreshInvoice();
            await loadPaymentDetail();
          } catch (err) {
            showAlert(t('genericErrorMessage'));
          } finally {
            setIsSendingToBank(false);
          }
        },
      },
    ]);
  };

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
          docsLoading ? (
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
              {invoiceDocs.map(doc => (
                <React.Fragment key={doc.id}>
                  {doc.type === CUSTOMS_DECLARATION_TYPE && bayanNumber ? (
                    <TouchableOpacity
                      style={[styles.bayanRow, rowDirection]}
                      onPress={() => setBayanPickerVisible(true)}
                      activeOpacity={0.7}>
                      <CustomText style={styles.bayanLabel} paddingTop={0}>
                        {t('bayanNumberLabel')}
                      </CustomText>
                      <CustomText bold style={styles.bayanValue} paddingTop={0}>
                        {bayanNumber} · {t('changeAction')}
                      </CustomText>
                    </TouchableOpacity>
                  ) : null}
                  <DocumentListItem
                    type={doc.type}
                    isRTL={isRTL}
                    onView={() => handleViewDoc(doc)}
                    onDelete={() => handleDeleteDoc(doc)}
                  />
                </React.Fragment>
              ))}
              {bayanNumber === BAYAN_NUMBER_REQUIRING_SHIPPING_DOCS ? (
                <InfoBox text={t('bayan03RequiresShippingDocsNote')} style={styles.infoNote} />
              ) : null}
              <View style={styles.uploadSection}>
                {INVOICE_DOC_TYPES.filter(type => {
                  if (invoiceDocs.some(doc => doc.type === type)) {
                    return false;
                  }
                  if (
                    SHIPPING_DOCS_FOR_BAYAN_03.includes(type) &&
                    bayanNumber !== BAYAN_NUMBER_REQUIRING_SHIPPING_DOCS
                  ) {
                    return false;
                  }
                  return true;
                }).map(type => (
                  <DocumentUploadZone
                    key={type}
                    label={t(DOC_LABEL_KEYS[type])}
                    optional={type === 'thirdPartyContract'}
                    uploading={uploadingType === type}
                    onPress={() =>
                      type === CUSTOMS_DECLARATION_TYPE
                        ? handleUploadCustomsDeclaration()
                        : handleUploadInvoiceDoc(type)
                    }
                  />
                ))}
              </View>

              {invoiceDocs
                .filter(doc => isOtherDocType(doc.type))
                .map(doc => (
                  <DocumentListItem
                    key={doc.id}
                    type={doc.type}
                    isRTL={isRTL}
                    onView={() => handleViewDoc(doc)}
                    onDelete={() => handleDeleteDoc(doc)}
                  />
                ))}
              <PrimaryButton
                title={`+ ${t('addOtherFileAction')} (${t('optional')})`}
                variant="secondary"
                loading={uploadingType === OTHER_DOC_UPLOAD_KEY}
                onPress={() => setOtherFileModalVisible(true)}
                style={styles.addOtherFileBtn}
              />

              {paymentDetail ? (
                <>
                  <CustomText bold style={styles.sectionTitle}>
                    {t('bankFormsTitle')}
                  </CustomText>
                  {(paymentDetail.MCIPaymentDocs || []).map(doc => (
                    <DocumentListItem key={doc.id} type={doc.type} isRTL={isRTL} onView={() => handleViewDoc(doc)} />
                  ))}
                  <View style={styles.uploadSection}>
                    {paymentDocTypesForBank(invoice.applicationBank?.nameWithNoSpace)
                      .filter(
                        type =>
                          !(paymentDetail.MCIPaymentDocs || []).some(doc => doc.type === type),
                      )
                      .map(type => (
                        <DocumentUploadZone
                          key={type}
                          label={t(DOC_LABEL_KEYS[type])}
                          uploading={uploadingType === type}
                          onPress={() => handleUploadPaymentDoc(type)}
                        />
                      ))}
                  </View>
                </>
              ) : null}
            </>
          )
        ) : paymentLoading ? (
        <View style={styles.card}>
          <LoadingState />
        </View>
      ) : paymentError ? (
        <View style={styles.card}>
          <ErrorState message={paymentError} onRetry={loadPaymentDetail} />
        </View>
      ) : !paymentDetail ? (
        <View style={styles.card}>
          <View style={styles.emptyActionWrap}>
            <CustomText center style={styles.emptyText}>
              {t('noPaymentYet')}
            </CustomText>
            <PrimaryButton
              title={t('generateApplicationAction')}
              onPress={() => navigation.navigate('GenerateApplication', {invoice})}
              style={[styles.actionBtn, styles.fullWidthBtn]}
            />
          </View>
        </View>
      ) : (
        <>
          <StripedCard
            isRTL={isRTL}
            cardStyle={styles.cardPolish}
            items={[
              {
                label: t('paymentAmount'),
                value: `${paymentDetail.amount} ${paymentDetail.currency}`,
              },
              {
                label: t('paymentStatus'),
                value: <StatusBadge status={paymentDetail.companyPaymentStatus} />,
              },
              {label: t('paymentReference'), value: paymentDetail.refrenceNumber},
              {label: t('paymentPurpose'), value: paymentDetail.purposeOfPayment},
              {label: t('transactionNumber'), value: paymentDetail.transactionNumber},
            ]}
          />

          <View style={styles.actionsWrap}>
            {/* Matches web ViewInvoice.js's canEditPayment: an invoice-level
                bank rejection re-opens editing even when the payment's own
                status isn't NOT_SENT/REJECTED. */}
            {paymentDetail.companyPaymentStatus === 'NOT_SENT' ||
            paymentDetail.companyPaymentStatus === 'REJECTED' ||
            invoice.bankStatus === 'REJECTED' ? (
              <>
                <PrimaryButton
                  title={t('editApplicationAction')}
                  variant="secondary"
                  onPress={() => navigation.navigate('GenerateApplication', {invoice})}
                  style={styles.actionBtn}
                />
                <PrimaryButton
                  title={t('sendToBankAction')}
                  onPress={handleSendToBank}
                  loading={isSendingToBank}
                  style={styles.actionBtn}
                />
              </>
            ) : (
              <CustomText center style={styles.sentNotice}>
                {t('applicationSentNotice')}
              </CustomText>
            )}
          </View>
        </>
      )}
      </ScrollView>

      <ModalSheet
        visible={bayanPickerVisible}
        onClose={() => setBayanPickerVisible(false)}
        title={t('bayanNumberModalTitle')}>
        {BAYAN_NUMBER_OPTIONS.map(option => (
          <TouchableOpacity
            key={option}
            style={[styles.modalOption, bayanNumber === option && styles.modalOptionActive]}
            onPress={() => handleSelectBayanNumber(option)}>
            <CustomText
              center
              bold={bayanNumber === option}
              style={[
                styles.modalOptionText,
                bayanNumber === option && styles.modalOptionTextActive,
              ]}
              paddingTop={0}>
              {option}
            </CustomText>
          </TouchableOpacity>
        ))}
      </ModalSheet>

      <ModalSheet
        visible={otherFileModalVisible}
        onClose={() => setOtherFileModalVisible(false)}
        title={t('addOtherFileAction')}>
        <FormField
          label={t('otherFileNameLabel')}
          required
          value={newOtherFileName}
          onChangeText={setNewOtherFileName}
          autoFocus
        />
        <PrimaryButton title={t('addOtherFileAction')} onPress={handleConfirmAddOtherFile} />
      </ModalSheet>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
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
