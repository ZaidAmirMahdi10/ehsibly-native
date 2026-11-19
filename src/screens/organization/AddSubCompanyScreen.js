import React, {useContext, useEffect, useRef, useState} from 'react';
import {ScrollView, StyleSheet, View} from 'react-native';
import {useTranslation} from 'react-i18next';
import {useNavigation, useRoute} from '@react-navigation/native';
import {useAlert} from '../../context/AlertContext';

import {LanguageContext} from '../../../App';
import {pick, types, keepLocalCopy, isErrorWithCode, errorCodes} from '@react-native-documents/picker';
import CustomText from '../../components/CustomText';
import FormField from '../../components/FormField';
import SubCompanyAdditionalInfo, {
  additionalInfoFromServer,
  emptyAdditionalInfo,
  splitAuthorizedSignatoriesPayload,
} from '../../components/SubCompanyAdditionalInfo';
import SubCompanyBankAccounts, {
  bankAccountsFromServer,
  emptyAccount,
  buildBankAccountsPayload,
} from '../../components/SubCompanyBankAccounts';
import DocumentUploadZone from '../../components/DocumentUploadZone';
import PrimaryButton from '../../components/PrimaryButton';
import ErrorBox from '../../components/ErrorBox';
import ErrorState from '../../components/ErrorState';
import {createSubCompany, updateSubCompany, uploadSubCompanyDocuments, removeSubCompanyBankAccount} from '../../services/subCompanies';
import {useAuth} from '../../context/AuthContext';
import {COLORS} from '../../constants/theme';

const AddSubCompanyScreen = () => {
  const {t} = useTranslation();
  const navigation = useNavigation();
  const route = useRoute();
  // editItem/onSaved → edit an existing sub-company; onCreated → add a new one.
  const {onCreated, editItem, onSaved} = route.params || {};
  const isEdit = !!editItem;
  const {session} = useAuth();
  const {showAlert} = useAlert();

  const {currentDirection} = useContext(LanguageContext);

  // Same fields / rules as the web's "create sub-company" form.
  const [f, setF] = useState({
    nameInAr: editItem?.nameInAr || '',
    companyName: editItem?.name || '',
    address: editItem?.address || '',
    resblock: editItem?.resblock || '',
    street: editItem?.street || '',
    district: editItem?.district || '',
    floor: editItem?.floor || '',
    departmentAndFlat: editItem?.departmentAndFlat || '',
    roomOrShop: editItem?.roomOrShop || '',
    poBox: editItem?.poBox || '',
    building: editItem?.building || '',
    nearestLandmark: editItem?.nearestLandmark || '',
    city: editItem?.city || '',
    country: editItem?.country || '',
    website: editItem?.website || '',
    email: editItem?.email || '',
    phoneNumber: editItem?.phoneNumber || '',
    idNumber: editItem?.idNumber || '',
    customsCode: editItem?.customsCode || '',
  });
  const [additionalInfo, setAdditionalInfo] = useState(() =>
    isEdit
      ? additionalInfoFromServer(editItem.comSupAdditionalInfo, editItem.addtionalAuthorizedSignatory)
      : emptyAdditionalInfo(),
  );
  const [bankAccounts, setBankAccounts] = useState(() =>
    isEdit ? bankAccountsFromServer(editItem.bankAccount) : [emptyAccount()],
  );
  // New picked file ({uri,...}), the stored document ({name,...}) or null.
  const [finalAccounts, setFinalAccounts] = useState(
    () => editItem?.document?.find(d => d.name === 'finalAccounts') || null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [showEmpty, setShowEmpty] = useState(false);
  const [langWarning, setLangWarning] = useState({});

  const REQUIRED = [
    'companyName', 'nameInAr', 'address', 'city', 'country',
    'phoneNumber', 'idNumber', 'street', 'building', 'resblock',
  ];

  // Web rules: the Arabic name takes Arabic letters only, the English name
  // English letters only.
  const setField = (key, value) => {
    let v = value;
    if (key === 'nameInAr' || key === 'companyName') {
      v = v.replace(key === 'nameInAr' ? /[^\u0600-\u06FF\s]/g : /[^a-zA-Z\s]/g, '');
      if (v !== value) {
        // Same as the web: a short warning when characters were rejected.
        setLangWarning(prev => ({...prev, [key]: true}));
        setTimeout(() => setLangWarning(prev => ({...prev, [key]: false})), 2000);
      }
    }
    setError(null);
    setF(prev => ({...prev, [key]: v}));
  };
  const err = key => (showEmpty && REQUIRED.includes(key) && !f[key]?.trim() ? styles.invalid : undefined);

  // Same as the web: deleting a stored account hits the server straight away,
  // after a confirmation. Resolves true when it was removed.
  const removeStoredAccount = account =>
    new Promise(resolve => {
      showAlert(t('deleteBankAccount'), '', [
        {text: t('noDontDelete'), style: 'cancel', onPress: () => resolve(false)},
        {
          text: t('yesDelete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await removeSubCompanyBankAccount(account.id);
              resolve(true);
            } catch (e) {
              setError(e?.response?.data?.message || t('genericErrorMessage'));
              resolve(false);
            }
          },
        },
      ]);
    });

  const uploadFinalAccounts = async subCompanyId => {
    try {
      const formData = new FormData();
      if (finalAccounts?.uri) {
        formData.append('finalAccounts', {
          uri: finalAccounts.uri,
          name: finalAccounts.name || 'finalAccounts.pdf',
          type: finalAccounts.type || 'application/pdf',
        });
      } else if (finalAccounts) {
        formData.append('existingFiles', 'finalAccounts');
      }
      await uploadSubCompanyDocuments(subCompanyId, formData);
      return true;
    } catch (uploadErr) {
      // a failed upload doesn't undo the saved sub-company
      return false;
    }
  };

  // The sub-company is saved either way; if its PDF didn't go up, say so
  // before leaving (instead of closing silently).
  const finish = uploadedOk => {
    if (uploadedOk) {
      leave();
      return;
    }
    showAlert(t('errorUploadingFiles'), '', [{text: t('ok'), onPress: () => leave()}]);
  };

  const pickFinalAccounts = async () => {
    try {
      const [file] = await pick({type: [types.pdf]});
      // The picked uri points at a temporary inbox copy that iOS may delete
      // before the form is submitted (the upload happens after saving), so
      // keep our own copy now.
      const [copy] = await keepLocalCopy({
        files: [{uri: file.uri, fileName: file.name || 'finalAccounts.pdf'}],
        destination: 'cachesDirectory',
      });
      if (copy.status !== 'success') {
        setError(t('uploadErrorMessage'));
        return;
      }
      setFinalAccounts({...file, uri: copy.localUri});
    } catch (e) {
      if (!(isErrorWithCode(e) && e.code === errorCodes.OPERATION_CANCELED)) {
        setError(t('uploadErrorMessage'));
      }
    }
  };

  // Web: closing (Cancel or the header back button) asks for confirmation when
  // anything was entered — always while editing. Saves leave via leave().
  const leaving = useRef(false);
  const leave = () => {
    leaving.current = true;
    navigation.goBack();
  };
  const hasDataRef = useRef(false);
  hasDataRef.current = isEdit || Object.values(f).some(v => String(v ?? '').trim() !== '');
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
    if (REQUIRED.some(k => !f[k]?.trim())) {
      setShowEmpty(true);
      setError(t('emptyInputFields'));
      return;
    }
    if (f.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) {
      setError(t('invalidEmail'));
      return;
    }
    setError(null);
    setIsSubmitting(true);
    let uploaded = true;
    try {
      const payload = Object.fromEntries(
        Object.entries(f).map(([k, v]) => [k, typeof v === 'string' ? v.trim() : v]),
      );
      if (isEdit) {
        const {additionalInfo: info, addtionalAuthSignatory} = splitAuthorizedSignatoriesPayload(additionalInfo);
        await updateSubCompany(editItem.id, {
          ...payload,
          compSupAdditionalInfo: info,
          addtionalAuthSignatory,
          bankAccounts: buildBankAccountsPayload(bankAccounts),
        });
        uploaded = await uploadFinalAccounts(editItem.id);
        onSaved?.();
      } else {
        const {additionalInfo: info, addtionalAuthSignatory} = splitAuthorizedSignatoriesPayload(additionalInfo);
        const data = await createSubCompany({
          ...payload,
          ...(info ? {additionalInfo: info} : {}),
          ...(addtionalAuthSignatory.length > 0 ? {addtionalAuthSignatory} : {}),
          bankAccounts: buildBankAccountsPayload(bankAccounts),
          organizationId: Number(session?.organization?.id),
          ...(session?.userId ? {userId: Number(session.userId)} : {}),
          language: currentDirection === 'rtl' ? 'ar' : 'en',
        });
        // Final-accounts PDF goes up after creation (same order as the web);
        // a failed upload doesn't undo the created sub-company.
        if (finalAccounts && data?.subCompany?.id) {
          uploaded = await uploadFinalAccounts(data.subCompany.id);
        }
        onCreated?.(data.subCompany);
      }
      finish(uploaded);
    } catch (e) {
      // Same mapping as the web: edit shows the server's message, else the
      // generic one; create maps the known error keys.
      const key = e?.response?.data?.error;
      const known = [
        'emailAlreadyInUse',
        'invalidPhoneNumber',
        'accountNumberAlreadyExist',
        'invalidAccountNumber',
        'subcompanySubscriptionLimitReached',
      ];
      if (isEdit) {
        setError(t(e?.response?.data?.message || 'unexpectedError'));
      } else {
        setError(known.includes(key) ? t(key) : t(e?.response ? 'unexpectedError' : 'subCompanyNetworkError'));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.container}>
      {error ? <ErrorState message={error} /> : null}
      <FormField label={t('companyName')} value={f.nameInAr} onChangeText={v => setField('nameInAr', v)} style={err('nameInAr')} />
      {langWarning.nameInAr ? <ErrorState message={t('thisFiedlShouldBeWrittenInArabic')} /> : null}
      <FormField label={t('companyNameInEn')} value={f.companyName} onChangeText={v => setField('companyName', v)} style={err('companyName')} />
      {langWarning.companyName ? <ErrorState message={t('thisFiedlShouldBeWrittenInEnglish')} /> : null}
      <FormField label={t('addressInEn')} value={f.address} onChangeText={v => setField('address', v)} style={err('address')} />
      <FormField label={t('resblock')} value={f.resblock} onChangeText={v => setField('resblock', v)} style={err('resblock')} />
      <FormField label={t('street')} value={f.street} onChangeText={v => setField('street', v)} style={err('street')} />
      <FormField label={t('supplierDistrict')} value={f.district} onChangeText={v => setField('district', v)} style={err('district')} />
      <FormField label={t('supplierFloor')} value={f.floor} onChangeText={v => setField('floor', v)} style={err('floor')} />
      <FormField label={t('supplierDepartmentAndFlat')} value={f.departmentAndFlat} onChangeText={v => setField('departmentAndFlat', v)} style={err('departmentAndFlat')} />
      <FormField label={t('supplierRoomOrShop')} value={f.roomOrShop} onChangeText={v => setField('roomOrShop', v)} style={err('roomOrShop')} />
      <FormField label={t('supplierPoBox')} value={f.poBox} onChangeText={v => setField('poBox', v)} style={err('poBox')} />
      <FormField label={t('building')} value={f.building} onChangeText={v => setField('building', v)} style={err('building')} />
      <FormField label={t('nearestLandMark')} value={f.nearestLandmark} onChangeText={v => setField('nearestLandmark', v)} style={err('nearestLandmark')} />
      <FormField label={t('city')} value={f.city} onChangeText={v => setField('city', v)} style={err('city')} />
      <FormField label={t('country')} value={f.country} onChangeText={v => setField('country', v)} style={err('country')} />
      <FormField label={t('website')} value={f.website} onChangeText={v => setField('website', v)} style={err('website')} autoCapitalize="none" keyboardType="url" />
      <FormField label={t('email')} value={f.email} onChangeText={v => setField('email', v)} style={err('email')} autoCapitalize="none" keyboardType="email-address" />
      <FormField label={t('phoneNumber')} value={f.phoneNumber} onChangeText={v => setField('phoneNumber', v)} style={err('phoneNumber')} keyboardType="phone-pad" />
      <FormField label={t('idNumber')} value={f.idNumber} onChangeText={v => setField('idNumber', v)} style={err('idNumber')} />
      <FormField label={t('customsCode')} value={f.customsCode} onChangeText={v => setField('customsCode', v)} style={err('customsCode')} />
      {(
        <>
          <CustomText bold style={styles.sectionTitle}>
            {t('additionalInfoSection')}
          </CustomText>
          <SubCompanyAdditionalInfo value={additionalInfo} onChange={setAdditionalInfo} />
          <SubCompanyBankAccounts value={bankAccounts} onChange={setBankAccounts} onRemoveStored={removeStoredAccount} />
          <CustomText bold style={styles.sectionTitle}>
            {t('finalAccounts')}
          </CustomText>
          {finalAccounts ? (
            <View style={styles.fileRow}>
              <CustomText style={styles.fileName} paddingTop={0}>
                {finalAccounts.name}
              </CustomText>
              <PrimaryButton title={t('delete')} variant="danger" onPress={() => setFinalAccounts(null)} style={styles.fileDelete} />
            </View>
          ) : null}
          <DocumentUploadZone label={t('finalAccounts')} optional onPress={pickFinalAccounts} />
        </>
      )}
      {error ? <ErrorBox text={error} style={styles.errorAboveButton} /> : null}
      <PrimaryButton title={t('confirm')} onPress={handleSubmit} loading={isSubmitting} />
      <PrimaryButton
        title={t('cancel')}
        variant="secondary"
        onPress={() => navigation.goBack()}
        style={styles.cancelBtn}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  flex: {flex: 1, backgroundColor: COLORS.bg},
  container: {padding: 16, paddingBottom: 40},
  invalid: {borderColor: COLORS.danger},
  errorAboveButton: {marginBottom: 12},
  cancelBtn: {marginTop: 10},
  sectionTitle: {fontSize: 15, color: COLORS.text, marginBottom: 8},
  fileRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 8},
  fileName: {flex: 1, fontSize: 12, color: COLORS.textMuted},
  fileDelete: {paddingHorizontal: 16},
});

export default AddSubCompanyScreen;
