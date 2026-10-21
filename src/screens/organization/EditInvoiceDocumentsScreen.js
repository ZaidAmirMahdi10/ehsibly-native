import React, {useContext, useEffect, useState} from 'react';
import {View, ScrollView, StyleSheet} from 'react-native';
import {useTranslation} from 'react-i18next';
import {useRoute, useNavigation} from '@react-navigation/native';
import {pick, types, isErrorWithCode, errorCodes} from '@react-native-documents/picker';

import {LanguageContext} from '../../../App';
import {useAlert} from '../../context/AlertContext';
import CustomText from '../../components/CustomText';
import LoadingState from '../../components/LoadingState';
import InfoBox from '../../components/InfoBox';
import PrimaryButton from '../../components/PrimaryButton';
import FormField from '../../components/FormField';
import ModalSheet from '../../components/ModalSheet';
import SelectField from '../../components/SelectField';
import FileSlot from '../../components/FileSlot';
import {
  getInvoiceMainFiles,
  updateInvoiceMainFiles,
  deleteInvoiceDoc,
  setCustomsDeclarationNumber,
  verifyInvoiceNumber,
} from '../../services/invoices/multiContainerWithoutC';
import {COLORS} from '../../constants/theme';

// Mirrors the web's UploadApplicationsDocumentsModal (ViewInvoice.js): every
// change is staged locally and sent in ONE PUT when Save is pressed.
const BAYAN_NUMBERS = ['01', '02', '03', '04', '05', '06', '07'].map(value => ({value}));
const FIXED_TYPES = ['customsDeclaration', 'thirdPartyContract', 'shippingPolicy', 'exitPermit'];
// Sources merged into the GET response from other tables — the web's modal
// filters them out of the invoice's own doc set.
const HIDDEN_TYPES = ['supplierCertificate', 'articleOfAssociation', 'articlesOfAssociation', 'finalAccounts', 'BaghdadTransactionRequest'];

const pickPdf = async () => {
  try {
    const [file] = await pick({type: [types.pdf]});
    return {uri: file.uri, name: file.name || 'document.pdf', type: file.type || 'application/pdf'};
  } catch (err) {
    if (!(isErrorWithCode(err) && err.code === errorCodes.OPERATION_CANCELED)) {
      throw err;
    }
    return null;
  }
};

const EditInvoiceDocumentsScreen = () => {
  const {t} = useTranslation();
  const route = useRoute();
  const navigation = useNavigation();
  const {showAlert} = useAlert();
  const {currentDirection} = useContext(LanguageContext);
  const isRTL = currentDirection === 'rtl';
  const {invoiceId} = route.params;

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);

  // pages[0] is the main invoice; entries: {existing: doc|null, file|null}
  const [pages, setPages] = useState([{existing: null, file: null}]);
  const [fixed, setFixed] = useState({});
  const [others, setOthers] = useState([]);
  const [bayan, setBayan] = useState(null);
  const [check, setCheck] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [otherNameVisible, setOtherNameVisible] = useState(false);
  const [otherName, setOtherName] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const data = await getInvoiceMainFiles(invoiceId);
        setBayan(data?.data?.customsDeclrationNumber || null);
        const docs = (data?.data?.documents || []).filter(d => !HIDDEN_TYPES.includes(d.type));
        const invoicePages = [];
        const fixedMap = {};
        const otherList = [];
        docs.forEach(doc => {
          if (doc.type === 'invoice') {
            invoicePages[0] = {existing: doc, file: null};
          } else if (/^invoice-\d+$/.test(doc.type)) {
            invoicePages[parseInt(doc.type.split('-')[1], 10)] = {existing: doc, file: null};
          } else if (FIXED_TYPES.includes(doc.type)) {
            fixedMap[doc.type] = {existing: doc, file: null};
          } else {
            otherList.push({name: doc.type, existing: doc, file: null});
          }
        });
        setPages(invoicePages.length ? Array.from(invoicePages, p => p || {existing: null, file: null}) : [{existing: null, file: null}]);
        setFixed(fixedMap);
        setOthers(otherList);
      } catch (err) {
        setError(t('genericErrorMessage'));
      } finally {
        setIsLoading(false);
      }
    })();
  }, [invoiceId, t]);

  const choose = async onChosen => {
    try {
      const file = await pickPdf();
      if (file) {
        onChosen(file);
      }
    } catch (err) {
      showAlert(t('uploadErrorMessage'));
    }
  };

  const runCheck = async file => {
    setCheck(null);
    setIsVerifying(true);
    try {
      const formData = new FormData();
      formData.append('pdf', file);
      setCheck(await verifyInvoiceNumber(invoiceId, formData));
    } catch (err) {
      // Advisory only.
    } finally {
      setIsVerifying(false);
    }
  };

  const setPage = (index, entry) => setPages(prev => prev.map((p, i) => (i === index ? entry : p)));
  const hasFixed = type => !!(fixed[type]?.file || fixed[type]?.existing);

  const handleSave = async () => {
    setError(null);
    if (hasFixed('customsDeclaration') && !bayan) {
      setError(t('customsDeclrationNumberRequired'));
      return;
    }
    if (bayan === '03' && (!hasFixed('shippingPolicy') || !hasFixed('exitPermit'))) {
      setError(t('shippingPolicyAndExitPermitRequired'));
      return;
    }
    setIsSaving(true);
    try {
      const formData = new FormData();
      // Invoice pages. Existing pages keep their own stored name (not their
      // position) so removing one page can never re-point another page's
      // keep-marker at the wrong document; new pages take the next free index.
      const taken = new Set(pages.map(p => p.existing?.type).filter(Boolean));
      const nextName = () => {
        if (!taken.has('invoice')) {
          taken.add('invoice');
          return 'invoice';
        }
        let n = 1;
        while (taken.has(`invoice-${n}`)) {
          n += 1;
        }
        taken.add(`invoice-${n}`);
        return `invoice-${n}`;
      };
      pages.forEach(page => {
        if (!page.existing && !page.file) {
          return;
        }
        formData.append(page.existing ? page.existing.type : nextName(), page.file || '');
      });
      FIXED_TYPES.forEach(type => {
        const entry = fixed[type];
        if (entry?.file || entry?.existing) {
          formData.append(type, entry.file || '');
        }
      });
      const otherMeta = [];
      others.forEach((entry, i) => {
        if (entry.file || entry.existing) {
          formData.append(`otherDoc_${i}`, entry.file || '');
          otherMeta.push({index: i, name: entry.name});
        }
      });
      if (otherMeta.length > 0) {
        formData.append('otherDocNames', JSON.stringify(otherMeta));
      }

      await updateInvoiceMainFiles(invoiceId, formData);
      if (hasFixed('customsDeclaration')) {
        await setCustomsDeclarationNumber(invoiceId, bayan);
      }
      navigation.goBack();
    } catch (err) {
      setError(t('uploadErrorMessage'));
    } finally {
      setIsSaving(false);
    }
  };

  // Web's OtherDocsSection deletes an already-saved other doc immediately.
  const removeOther = index => {
    const entry = others[index];
    const drop = () => setOthers(prev => prev.filter((_, i) => i !== index));
    if (!entry.existing) {
      drop();
      return;
    }
    showAlert(t('deleteDocConfirmTitle'), t('deleteDocConfirmMessage'), [
      {text: t('cancel'), style: 'cancel'},
      {
        text: t('deleteAction'),
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteInvoiceDoc(entry.existing.id);
            drop();
          } catch (err) {
            showAlert(t('genericErrorMessage'));
          }
        },
      },
    ]);
  };

  if (isLoading) {
    return <LoadingState />;
  }

  return (
    <View style={styles.flex}>
      <ScrollView style={styles.flex} contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <InfoBox text={t('edUploadForBeneficiary')} style={styles.gap} />
        {error ? <InfoBox variant="error" text={error} style={styles.gap} /> : null}

        <CustomText bold style={styles.section} paddingTop={0} align={isRTL ? 'right' : 'left'}>
          {t('docInvoice')}
        </CustomText>
        <FileSlot
          label={t('docInvoice')}
          mandatory
          existing={pages[0]?.existing}
          file={pages[0]?.file}
          onPick={() =>
            choose(file => {
              setPage(0, {...pages[0], file});
              runCheck(file);
            })
          }
          onRemove={() => {
            setPage(0, {existing: null, file: null});
            setCheck(null);
          }}
        />
        {isVerifying ? <InfoBox text={t('invCheckingNumber')} style={styles.gap} /> : null}
        {check && !isVerifying ? (
          !check.found ? (
            <InfoBox variant="error" text={t('invCouldNotExtract')} style={styles.gap} />
          ) : !check.identical ? (
            <InfoBox
              variant="error"
              text={`${t('invNumberMismatch')}\n${t('invStored')}: ${check.storedInvoiceNumber}\n${t('invInPdf')}: ${check.extractedInvoiceNumber}`}
              style={styles.gap}
            />
          ) : (
            <InfoBox variant="success" text={t('invNumberMatched')} style={styles.gap} />
          )
        ) : null}

        {pages.length > 1 ? (
          <CustomText bold style={styles.subSection} paddingTop={0} align={isRTL ? 'right' : 'left'}>
            {t('invAdditionalInvoices')}
          </CustomText>
        ) : null}
        {pages.slice(1).map((page, i) => (
          <FileSlot
            key={`page-${i + 1}`}
            label={`${t('docInvoice')} ${i + 2}`}
            existing={page.existing}
            file={page.file}
            onPick={() => choose(file => setPage(i + 1, {...page, file}))}
            onRemove={() => setPages(prev => prev.filter((_, idx) => idx !== i + 1))}
          />
        ))}
        <PrimaryButton
          title={`+ ${t('invAddAnotherInvoice')}`}
          variant="secondary"
          onPress={() => setPages(prev => [...prev, {existing: null, file: null}])}
          style={styles.gap}
        />

        <CustomText bold style={styles.section} paddingTop={0} align={isRTL ? 'right' : 'left'}>
          {t('docCustomsDeclaration')}
        </CustomText>
        {hasFixed('customsDeclaration') ? (
          <SelectField
            label={t('edCustomsNumber')}
            value={bayan ? {value: bayan} : null}
            placeholder={t('edChooseNumber')}
            options={BAYAN_NUMBERS}
            onSelect={o => setBayan(o.value)}
            getLabel={o => o.value}
            getKey={o => o.value}
          />
        ) : null}
        <FileSlot
          label={t('docCustomsDeclaration')}
          existing={fixed.customsDeclaration?.existing}
          file={fixed.customsDeclaration?.file}
          onPick={() => choose(file => setFixed(prev => ({...prev, customsDeclaration: {...prev.customsDeclaration, file}})))}
          onRemove={() => setFixed(prev => ({...prev, customsDeclaration: null}))}
        />
        {bayan === '03' ? (
          <>
            {['shippingPolicy', 'exitPermit'].map(type => (
              <FileSlot
                key={type}
                label={t(type === 'shippingPolicy' ? 'docShippingPolicy' : 'docExitPermit')}
                mandatory
                existing={fixed[type]?.existing}
                file={fixed[type]?.file}
                onPick={() => choose(file => setFixed(prev => ({...prev, [type]: {...prev[type], file}})))}
                onRemove={() => setFixed(prev => ({...prev, [type]: null}))}
              />
            ))}
          </>
        ) : null}

        <CustomText bold style={styles.section} paddingTop={0} align={isRTL ? 'right' : 'left'}>
          {t('docThirdPartyContract')}
        </CustomText>
        <FileSlot
          label={t('docThirdPartyContract')}
          existing={fixed.thirdPartyContract?.existing}
          file={fixed.thirdPartyContract?.file}
          onPick={() => choose(file => setFixed(prev => ({...prev, thirdPartyContract: {...prev.thirdPartyContract, file}})))}
          onRemove={() => setFixed(prev => ({...prev, thirdPartyContract: null}))}
        />

        <CustomText bold style={styles.section} paddingTop={0} align={isRTL ? 'right' : 'left'}>
          {t('edOtherDocs')}
        </CustomText>
        {others.map((entry, i) => (
          <FileSlot
            key={`other-${i}`}
            label={entry.name}
            existing={entry.existing}
            file={entry.file}
            onPick={() => choose(file => setOthers(prev => prev.map((o, idx) => (idx === i ? {...o, file} : o))))}
            onRemove={() => removeOther(i)}
          />
        ))}
        <PrimaryButton
          title={`+ ${t('addOtherFileAction')}`}
          variant="secondary"
          onPress={() => setOtherNameVisible(true)}
          style={styles.gap}
        />
      </ScrollView>

      <View style={styles.footer}>
        <PrimaryButton
          title={t('edSave')}
          onPress={handleSave}
          loading={isSaving}
          disabled={isSaving || isVerifying}
        />
      </View>

      <ModalSheet visible={otherNameVisible} onClose={() => setOtherNameVisible(false)} title={t('addOtherFileAction')}>
        <FormField label={t('otherFileNameLabel')} required value={otherName} onChangeText={setOtherName} />
        <PrimaryButton
          title={t('edAdd')}
          disabled={!otherName.trim()}
          onPress={() => {
            setOthers(prev => [...prev, {name: otherName.trim(), existing: null, file: null}]);
            setOtherName('');
            setOtherNameVisible(false);
          }}
        />
      </ModalSheet>
    </View>
  );
};

const styles = StyleSheet.create({
  flex: {flex: 1, backgroundColor: COLORS.bg},
  container: {padding: 20, paddingBottom: 40},
  gap: {marginBottom: 12},
  section: {fontSize: 14, color: COLORS.primaryDark, marginTop: 14, marginBottom: 8},
  subSection: {fontSize: 13, color: COLORS.textMuted, marginBottom: 8},
  footer: {padding: 16, backgroundColor: COLORS.surface, borderTopWidth: 1, borderTopColor: COLORS.border},
});

export default EditInvoiceDocumentsScreen;
