import React, {useEffect, useState} from 'react';
import {View, ScrollView, StyleSheet} from 'react-native';
import {useTranslation} from 'react-i18next';
import {useRoute, useNavigation} from '@react-navigation/native';
import {pick, types, isErrorWithCode, errorCodes} from '@react-native-documents/picker';

import {useAlert} from '../../context/AlertContext';
import LoadingState from '../../components/LoadingState';
import InfoBox from '../../components/InfoBox';
import PrimaryButton from '../../components/PrimaryButton';
import FileSlot from '../../components/FileSlot';
import {DOC_LABEL_KEYS} from '../../components/DocumentListItem';
import {getPaymentDetail, updatePaymentDocuments} from '../../services/paymentDetails';
import {
  BAGHDAD_PAYMENT_DOC_TYPES,
  MANSUR_PAYMENT_DOC_TYPES,
  paymentDocTypesForBank,
} from '../../constants/documentTypes';
import {COLORS} from '../../constants/theme';

// Mirrors the web's UploadPaymentDocumentsModal: stage the bank-form files,
// send them in one PUT on Save. Every existing doc — shown or not — is sent
// back as a keep-marker unless the user removed it.
const ALL_FIELDS = [...new Set([...BAGHDAD_PAYMENT_DOC_TYPES, ...MANSUR_PAYMENT_DOC_TYPES, 'BaghdadConfirmation', 'BaghdadEntryRequest', 'BaghdadPaymentDetails', 'BaghdadPromise', 'BankPledge'])];
// Web marks these as mandatory (FilesUpload isMand) per bank.
const MANDATORY = {
  BaghdadTransactionRequest: true,
  MansurTransactionRequest: true,
  MansurBankForeignCurrencyTradingWindowRequest: true,
};

const EditPaymentDocumentsScreen = () => {
  const {t} = useTranslation();
  const route = useRoute();
  const navigation = useNavigation();
  const {showAlert} = useAlert();
  const {invoiceId, paymentId, bankNameWithNoSpace} = route.params;

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [entries, setEntries] = useState({});
  const slotTypes = paymentDocTypesForBank(bankNameWithNoSpace);

  useEffect(() => {
    (async () => {
      try {
        const payment = await getPaymentDetail(paymentId);
        const map = {};
        (payment?.MCIPaymentDocs || []).forEach(doc => {
          map[doc.type] = {existing: doc, file: null};
        });
        setEntries(map);
      } catch (err) {
        setError(t('genericErrorMessage'));
      } finally {
        setIsLoading(false);
      }
    })();
  }, [paymentId, t]);

  const choose = async type => {
    try {
      const [file] = await pick({type: [types.pdf]});
      setEntries(prev => ({
        ...prev,
        [type]: {...prev[type], file: {uri: file.uri, name: file.name || `${type}.pdf`, type: file.type || 'application/pdf'}},
      }));
    } catch (err) {
      if (!(isErrorWithCode(err) && err.code === errorCodes.OPERATION_CANCELED)) {
        showAlert(t('uploadErrorMessage'));
      }
    }
  };

  const handleSave = async () => {
    setError(null);
    setIsSaving(true);
    try {
      const formData = new FormData();
      ALL_FIELDS.forEach(type => {
        const entry = entries[type];
        if (entry?.file) {
          formData.append(type, entry.file);
        } else if (entry?.existing) {
          formData.append(type, '');
        }
      });
      formData.append('invoiceId', invoiceId);
      await updatePaymentDocuments(paymentId, invoiceId, formData);
      navigation.goBack();
    } catch (err) {
      setError(t('errorUploadingPaymentFiles'));
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <LoadingState />;
  }

  return (
    <View style={styles.flex}>
      <ScrollView style={styles.flex} contentContainerStyle={styles.container}>
        {error ? <InfoBox variant="error" text={error} style={styles.gap} /> : null}
        {slotTypes.length === 0 ? (
          <InfoBox text={t('thisBankIsNotSupported')} />
        ) : (
          <>
            <InfoBox text={t('uploadAllFilesSeperately')} style={styles.gap} />
            {slotTypes.map(type => (
              <FileSlot
                key={type}
                label={t(DOC_LABEL_KEYS[type])}
                mandatory={!!MANDATORY[type]}
                existing={entries[type]?.existing}
                file={entries[type]?.file}
                onPick={() => choose(type)}
                onRemove={() => setEntries(prev => ({...prev, [type]: null}))}
              />
            ))}
          </>
        )}
      </ScrollView>
      {slotTypes.length > 0 ? (
        <View style={styles.footer}>
          <PrimaryButton title={t('edSave')} onPress={handleSave} loading={isSaving} disabled={isSaving} />
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  flex: {flex: 1, backgroundColor: COLORS.bg},
  container: {padding: 20, paddingBottom: 40},
  gap: {marginBottom: 12},
  footer: {padding: 16, backgroundColor: COLORS.surface, borderTopWidth: 1, borderTopColor: COLORS.border},
});

export default EditPaymentDocumentsScreen;
