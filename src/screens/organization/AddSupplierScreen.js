import React, {useEffect, useRef, useState} from 'react';
import {ScrollView, StyleSheet, View} from 'react-native';
import {useTranslation} from 'react-i18next';
import {useNavigation, useRoute} from '@react-navigation/native';
import {pick, types, keepLocalCopy, isErrorWithCode, errorCodes} from '@react-native-documents/picker';

import CustomText from '../../components/CustomText';
import FormField from '../../components/FormField';
import PrimaryButton from '../../components/PrimaryButton';
import ErrorState from '../../components/ErrorState';
import ErrorBox from '../../components/ErrorBox';
import InfoBox from '../../components/InfoBox';
import DocumentUploadZone from '../../components/DocumentUploadZone';
import SupplierDocuments from '../../components/SupplierDocuments';
import SubCompanyBankAccounts, {
  emptyAccount,
  buildBankAccountsPayload,
} from '../../components/SubCompanyBankAccounts';
import {createSupplier, updateSupplier, uploadSupplierFiles} from '../../services/suppliers';
import {useAlert} from '../../context/AlertContext';
import {useAuth} from '../../context/AuthContext';
import {COLORS} from '../../constants/theme';

// Same fields, order, labels and rules as the web's "add supplier" modal
// (SuppliersPage.js). NB: like the web, the first field — labelled
// "supplierCompany" — holds the supplier name, and the second — labelled
// "supplierName" — holds the company.
const FIELDS = [
  ['supplierName', 'supplierCompany', 'name'],
  ['supplierCompany', 'supplierName', 'company'],
  ['supplierBusinessSector', 'businessSector', 'businessSector'],
  ['supplierGoodsType', 'typeOfGoods', 'typeOfGoods'],
  ['supplierAddress', 'address', 'address'],
  ['supplierCountry', 'country', 'country'],
  ['supplierCountryCode', 'countryCode', 'countryCode'],
  ['supplierCity', 'city', 'city'],
  ['supplierDistrict', 'supplierDistrict', 'district'],
  ['supplierStreet', 'supplierStreet', 'street'],
  ['supplierFloor', 'supplierFloor', 'floor'],
  ['supplierDepartmentAndFlat', 'supplierDepartmentAndFlat', 'departmentAndFlat'],
  ['supplierRoomOrShop', 'supplierRoomOrShop', 'roomOrShop'],
  ['supplierPoBox', 'supplierPoBox', 'poBox'],
  ['supplierPhoneNumber', 'phoneNumber', 'phoneNumber'],
  ['supplierWebsite', 'website', 'website'],
  ['supplierEmail', 'email', 'email'],
  ['supplierRelationWithSupplier', 'relationWithTheSupplier', 'relationWithSupplier'],
];

const AddSupplierScreen = () => {
  const {t} = useTranslation();
  const navigation = useNavigation();
  const route = useRoute();
  // editItem/onSaved → edit; onCreated → add. Editing covers the supplier's own
  // fields; bank accounts are managed separately, so that section is add-only.
  const {onCreated, editItem, onSaved} = route.params || {};
  const isEdit = !!editItem;
  const {session} = useAuth();
  const {showAlert} = useAlert();

  const [f, setF] = useState(() =>
    Object.fromEntries(FIELDS.map(([key, , itemKey]) => [key, editItem?.[itemKey] || ''])),
  );
  const [bankAccounts, setBankAccounts] = useState([emptyAccount()]);
  const [step, setStep] = useState(1);
  const [newSupplierId, setNewSupplierId] = useState(null);
  const [files, setFiles] = useState({supplierCertificate: null, articleOfAssociation: null});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [showErrors, setShowErrors] = useState(false);

  const setField = (key, v) => {
    setError(null);
    setF(prev => ({...prev, [key]: v}));
  };

  // Web: closing (Cancel or the header back button) asks for confirmation when
  // anything was entered — always while editing. Saves leave via leave().
  const leaving = useRef(false);
  const leave = () => {
    leaving.current = true;
    navigation.goBack();
  };
  const hasDataRef = useRef(false);
  hasDataRef.current = step !== 2 && (isEdit || Object.values(f).some(v => v.trim() !== '') || bankAccounts.some(a => a.bank || a.accountNumber));
  useEffect(
    () =>
      navigation.addListener('beforeRemove', e => {
        if (leaving.current || !hasDataRef.current) {
          return;
        }
        e.preventDefault();
        showAlert(t('areYouSureModalTitle'), t(isEdit ? 'areYouSureCancelUpdate' : 'areYouSureYouWantToCancel'), [
          {text: t('cancel'), style: 'cancel'},
          {
            text: t('close'),
            style: 'destructive',
            onPress: () => {
              leaving.current = true;
              navigation.dispatch(e.data.action);
            },
          },
        ]);
      }),
    [navigation, showAlert, t, isEdit],
  );

  const handleSubmit = async () => {
    // Web rules: only the supplier name is required; once a bank is chosen its
    // branch, account number and currency are required too.
    const first = bankAccounts[0];
    const missing =
      !f.supplierName.trim() ||
      (!isEdit && first?.bank?.id && (!first.branch?.id || !first.accountNumber?.trim() || !first.accountCurrency));
    if (missing) {
      setShowErrors(true);
      setError(t('emptyInputFields'));
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      const supplierFields = Object.fromEntries(
        Object.entries(f).map(([k, v]) => [k, v.trim() || undefined]),
      );

      if (isEdit) {
        await updateSupplier(editItem.id, supplierFields);
        onSaved?.();
        leave();
        return;
      }

      const data = await createSupplier({
        ...supplierFields,
        // Supplier currency is no longer chosen on the supplier (web).
        supplierCurrency: null,
        organizationId: session?.organization?.id,
        userId: session?.userId,
        bankAccounts: buildBankAccountsPayload(bankAccounts),
      });
      onCreated?.(data.newSupplier);
      setNewSupplierId(data.newSupplier?.id);
      setStep(2);
    } catch (err) {
      // A 401 here is not an expired session (see createSupplier) — show the
      // generic message instead of the raw "Unauthorized". Like the web, the
      // server's error key is translated.
      const key = err?.response?.data?.error;
      setError(err?.response?.status === 401 || !key ? t('genericErrorMessage') : t(key));
    } finally {
      setIsSubmitting(false);
    }
  };

  const pickFile = async field => {
    try {
      const [file] = await pick({type: [types.pdf]});
      // Keep our own copy: the picked uri is a temporary inbox file iOS may
      // delete before the upload.
      const [copy] = await keepLocalCopy({
        files: [{uri: file.uri, fileName: file.name || `${field}.pdf`}],
        destination: 'cachesDirectory',
      });
      if (copy.status !== 'success') {
        setError(t('errorUploadingFiles'));
        return;
      }
      setError(null);
      setFiles(prev => ({...prev, [field]: {...file, uri: copy.localUri}}));
    } catch (e) {
      if (!(isErrorWithCode(e) && e.code === errorCodes.OPERATION_CANCELED)) {
        setError(t('errorUploadingFiles'));
      }
    }
  };

  const handleUploadFiles = async () => {
    setIsSubmitting(true);
    try {
      await uploadSupplierFiles(newSupplierId, files);
      leave();
    } catch (e) {
      setError(t('errorUploadingFiles'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const fileZone = (field, labelKey) => (
    <View style={styles.fileBlock}>
      <CustomText bold style={styles.sectionTitle}>
        {t(labelKey)}
      </CustomText>
      {files[field] ? (
        <View style={styles.fileRow}>
          <CustomText style={styles.fileName} paddingTop={0}>
            {files[field].name}
          </CustomText>
          <PrimaryButton
            title={t('delete')}
            variant="danger"
            onPress={() => setFiles(prev => ({...prev, [field]: null}))}
            style={styles.fileDelete}
          />
        </View>
      ) : null}
      <DocumentUploadZone label={t(labelKey)} onPress={() => pickFile(field)} />
    </View>
  );

  // Step 2 (web): "supplier was added" + the two documents, Save / Skip.
  if (step === 2) {
    return (
      <ScrollView style={styles.flex} contentContainerStyle={styles.container}>
        {error ? <ErrorState message={error} /> : null}
        <InfoBox text={t('supplierWasAddedSuccessfully')} variant="success" style={styles.success} />
        {fileZone('supplierCertificate', 'supplierCertificate')}
        {fileZone('articleOfAssociation', 'articlesOfAssociation')}
        {error ? <ErrorBox text={error} style={styles.errorAboveButton} /> : null}
        <PrimaryButton
          title={t('save')}
          onPress={handleUploadFiles}
          loading={isSubmitting}
          disabled={!files.supplierCertificate && !files.articleOfAssociation}
        />
        <PrimaryButton
          title={t('skip')}
          variant="secondary"
          onPress={() => leave()}
          style={styles.secondBtn}
        />
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.container}>
      {error ? <ErrorState message={error} /> : null}

      {FIELDS.map(([key, labelKey]) => (
        <FormField
          key={key}
          label={t(labelKey)}
          value={f[key]}
          onChangeText={v => setField(key, v)}
          style={showErrors && key === 'supplierName' && !f.supplierName.trim() ? styles.invalid : undefined}
          autoCapitalize={key === 'supplierEmail' || key === 'supplierWebsite' ? 'none' : undefined}
          keyboardType={
            key === 'supplierPhoneNumber' ? 'phone-pad' : key === 'supplierEmail' ? 'email-address' : undefined
          }
        />
      ))}

      {/* Documents are only manageable once the supplier exists, and they
          save immediately (independent of the Confirm button below). */}
      {isEdit ? <SupplierDocuments supplierId={editItem.id} /> : null}

      {!isEdit ? (
        <SubCompanyBankAccounts value={bankAccounts} onChange={setBankAccounts} foreign showErrors={showErrors} />
      ) : null}

      {error ? <ErrorBox text={error} style={styles.errorAboveButton} /> : null}
      <PrimaryButton title={t('confirm')} onPress={handleSubmit} loading={isSubmitting} />
      <PrimaryButton
        title={t('cancel')}
        variant="secondary"
        onPress={() => navigation.goBack()}
        style={styles.secondBtn}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  flex: {flex: 1, backgroundColor: COLORS.surface},
  container: {padding: 16, paddingBottom: 40},
  invalid: {borderColor: COLORS.danger},
  sectionTitle: {fontSize: 14, color: COLORS.text, marginBottom: 8},
  fileBlock: {marginBottom: 16},
  fileRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 8},
  fileName: {flex: 1, fontSize: 12, color: COLORS.textMuted},
  fileDelete: {paddingHorizontal: 16},
  success: {marginBottom: 16},
  errorAboveButton: {marginBottom: 12},
  secondBtn: {marginTop: 10},
});

export default AddSupplierScreen;
