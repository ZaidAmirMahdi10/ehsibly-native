import React, {useContext, useEffect, useState} from 'react';
import {ScrollView, StyleSheet, TouchableOpacity, View} from 'react-native';
import {useTranslation} from 'react-i18next';
import {useNavigation} from '@react-navigation/native';

import {LanguageContext} from '../../../App';
import CustomText from '../../components/CustomText';
import FormField from '../../components/FormField';
import SelectField from '../../components/SelectField';
import PrimaryButton from '../../components/PrimaryButton';
import ErrorState from '../../components/ErrorState';
import InfoBox from '../../components/InfoBox';
import ModalSheet from '../../components/ModalSheet';
import {useAuth} from '../../context/AuthContext';
import {getSupplierBankAccounts} from '../../services/bankAccounts';
import {createInvoice} from '../../services/invoices/multiContainerWithoutC';
import {COLORS} from '../../constants/theme';

const STEP_SUPPLIER = 1;
const STEP_DETAILS = 2;

const CreateInvoiceScreen = () => {
  const {t} = useTranslation();
  const navigation = useNavigation();
  const {session} = useAuth();
  const {currentDirection} = useContext(LanguageContext);
  const isRTL = currentDirection === 'rtl';

  const [step, setStep] = useState(STEP_SUPPLIER);

  const [supplier, setSupplier] = useState(null);
  const [subCompany, setSubCompany] = useState(
    session?.organization?.subCompanyId
      ? {id: session.organization.subCompanyId, name: session.organization.subCompanyName}
      : null,
  );

  const [currencies, setCurrencies] = useState([]);
  const [loadingCurrencies, setLoadingCurrencies] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState('');

  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [amountForSupplier, setAmountForSupplier] = useState('');
  const [notes, setNotes] = useState('');

  // Containers are entirely optional (matches the web app's
  // CreateNoCustomerInvoice — zero-or-more "Add container" entries, not a
  // single mandatory field) — added via a small modal, listed as removable
  // chips.
  const [containers, setContainers] = useState([]);
  const [containerModalVisible, setContainerModalVisible] = useState(false);
  const [newContainerNumber, setNewContainerNumber] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!supplier?.id) {
      setCurrencies([]);
      setSelectedCurrency('');
      return;
    }
    let isCurrent = true;
    setLoadingCurrencies(true);
    (async () => {
      try {
        const accounts = await getSupplierBankAccounts(supplier.id);
        if (!isCurrent) {
          return;
        }
        const uniqueCurrencies = [...new Set((accounts || []).map(a => a.accountCurrency).filter(Boolean))];
        setCurrencies(uniqueCurrencies);
        setSelectedCurrency(uniqueCurrencies[0] || '');
      } finally {
        if (isCurrent) {
          setLoadingCurrencies(false);
        }
      }
    })();
    return () => {
      isCurrent = false;
    };
  }, [supplier?.id]);

  const canProceedToDetails = supplier?.id && subCompany?.id && !loadingCurrencies && currencies.length > 0;

  const handleSubmit = async () => {
    if (!invoiceNumber.trim()) {
      setError(t('invoiceNumberRequiredError'));
      return;
    }
    if (!amountForSupplier || Number(amountForSupplier) <= 0) {
      setError(t('amountRequiredError'));
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      await createInvoice({
        supplierId: supplier.id,
        subCompanyId: subCompany.id,
        organizationId: session?.organization?.id,
        createdBy: session?.userId,
        currency: selectedCurrency,
        invoiceNumber: invoiceNumber.trim(),
        amountForSupplier: Number(amountForSupplier),
        date: new Date().toISOString(),
        notes: notes.trim() || undefined,
        containers: containers.map(c => ({containerNumber: c.containerNumber})),
      });
      navigation.goBack();
    } catch (err) {
      setError(err?.response?.data?.message || t('genericErrorMessage'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddContainer = () => {
    const trimmed = newContainerNumber.trim();
    if (!trimmed) {
      return;
    }
    setContainers(prev => [...prev, {containerNumber: trimmed}]);
    setNewContainerNumber('');
    setContainerModalVisible(false);
  };

  const handleRemoveContainer = index => {
    setContainers(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.container}>
      <View style={[styles.stepper, isRTL && styles.stepperRTL]}>
        <View style={[styles.stepCircle, step >= STEP_SUPPLIER && styles.stepCircleActive]}>
          <CustomText style={styles.stepCircleText} paddingTop={0}>1</CustomText>
        </View>
        <CustomText style={styles.stepLabel} paddingTop={0}>{t('stepSupplierCompany')}</CustomText>
        <View style={styles.stepLine} />
        <View style={[styles.stepCircle, step >= STEP_DETAILS && styles.stepCircleActive]}>
          <CustomText style={styles.stepCircleText} paddingTop={0}>2</CustomText>
        </View>
        <CustomText style={styles.stepLabel} paddingTop={0}>{t('stepInvoiceDetails')}</CustomText>
      </View>

      {error ? <ErrorState message={error} /> : null}

      {step === STEP_SUPPLIER ? (
        <>
          <View style={styles.group}>
            <CustomText style={styles.label}>{t('supplierLabel')}</CustomText>
            <TouchableOpacity
              style={styles.pickerBtn}
              onPress={() => navigation.navigate('SupplierPicker', {onSelect: setSupplier})}>
              <CustomText style={styles.pickerBtnText} paddingTop={0}>
                {supplier ? supplier.name : t('chooseSupplierPlaceholder')}
              </CustomText>
            </TouchableOpacity>
            {supplier?.id && !loadingCurrencies && currencies.length === 0 ? (
              <CustomText style={styles.warningText}>{t('noBankAccountCurrenciesWarning')}</CustomText>
            ) : null}
          </View>

          <View style={styles.group}>
            <CustomText style={styles.label}>{t('sendingCompanyLabel')}</CustomText>
            <TouchableOpacity
              style={styles.pickerBtn}
              onPress={() => navigation.navigate('SubCompanyPicker', {onSelect: setSubCompany})}>
              <CustomText style={styles.pickerBtnText} paddingTop={0}>
                {subCompany ? subCompany.name : t('chooseSubCompanyPlaceholder')}
              </CustomText>
            </TouchableOpacity>
          </View>

          <PrimaryButton
            title={t('next')}
            onPress={() => setStep(STEP_DETAILS)}
            disabled={!canProceedToDetails}
            style={styles.submitBtn}
          />
        </>
      ) : (
        <>
          <View style={styles.summaryCard}>
            <CustomText style={styles.summaryLine} paddingTop={0}>
              {t('supplierLabel')}: <CustomText bold paddingTop={0}>{supplier?.name}</CustomText>
            </CustomText>
            <CustomText style={styles.summaryLine} paddingTop={0}>
              {t('sendingCompanyLabel')}: <CustomText bold paddingTop={0}>{subCompany?.name}</CustomText>
            </CustomText>
            <TouchableOpacity onPress={() => setStep(STEP_SUPPLIER)}>
              <CustomText style={styles.editLink} paddingTop={0}>{t('edit')}</CustomText>
            </TouchableOpacity>
          </View>

          <FormField label={t('invoiceNumberLabel')} required value={invoiceNumber} onChangeText={setInvoiceNumber} />
          <FormField
            label={t('amountForSupplierLabel')}
            required
            value={amountForSupplier}
            onChangeText={setAmountForSupplier}
            keyboardType="decimal-pad"
          />

          <SelectField
            label={t('currencyLabel')}
            required
            value={selectedCurrency || null}
            placeholder={t('chooseCurrencyPlaceholder')}
            options={currencies}
            onSelect={setSelectedCurrency}
          />

          <FormField
            label={t('notesLabel')}
            value={notes}
            onChangeText={setNotes}
            placeholder={t('notesPlaceholder')}
            multiline
            numberOfLines={4}
            style={styles.notesInput}
          />
          <InfoBox text={t('notesNotVisibleToBankNote')} style={styles.infoNote} />

          <CustomText bold style={styles.sectionTitle}>
            {t('containersTitle')}
          </CustomText>
          <CustomText style={styles.containersHint}>{t('containersOptionalHint')}</CustomText>
          {containers.map((c, index) => (
            <View key={`${c.containerNumber}-${index}`} style={[styles.containerChip, styles.rowBetween]}>
              <CustomText paddingTop={0}>{c.containerNumber}</CustomText>
              <TouchableOpacity onPress={() => handleRemoveContainer(index)}>
                <CustomText style={styles.removeContainerText} paddingTop={0}>
                  ✕
                </CustomText>
              </TouchableOpacity>
            </View>
          ))}
          <PrimaryButton
            title={`+ ${t('addContainerAction')}`}
            variant="secondary"
            onPress={() => setContainerModalVisible(true)}
            style={styles.addContainerBtn}
          />

          <PrimaryButton
            title={t('createInvoiceAction')}
            onPress={handleSubmit}
            loading={isSubmitting}
            style={styles.submitBtn}
          />
        </>
      )}

      <ModalSheet
        visible={containerModalVisible}
        onClose={() => setContainerModalVisible(false)}
        title={t('addContainerAction')}>
        <FormField
          label={t('containerNumberLabel')}
          required
          value={newContainerNumber}
          onChangeText={setNewContainerNumber}
          autoFocus
        />
        <PrimaryButton title={t('addContainerAction')} onPress={handleAddContainer} />
      </ModalSheet>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  flex: {flex: 1, backgroundColor: COLORS.bg},
  container: {padding: 16, paddingBottom: 40},
  stepper: {flexDirection: 'row', alignItems: 'center', marginBottom: 20},
  stepperRTL: {flexDirection: 'row-reverse'},
  stepCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCircleActive: {backgroundColor: COLORS.primary},
  stepCircleText: {color: '#fff', fontSize: 12, fontWeight: '700'},
  stepLabel: {fontSize: 11, color: COLORS.textMuted, marginHorizontal: 6},
  stepLine: {flex: 1, height: 1, backgroundColor: COLORS.border, marginHorizontal: 4},
  group: {marginBottom: 14},
  label: {fontSize: 12, fontWeight: '700', color: COLORS.textMuted, marginBottom: 6},
  pickerBtn: {
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  pickerBtnText: {fontSize: 14, color: COLORS.text},
  warningText: {fontSize: 11, color: COLORS.pending, marginTop: 6},
  submitBtn: {marginTop: 6},
  summaryCard: {
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  summaryLine: {fontSize: 13, color: COLORS.text, marginBottom: 4},
  editLink: {fontSize: 12, color: COLORS.primary, fontWeight: '700', marginTop: 4},
  notesInput: {minHeight: 100, textAlignVertical: 'top'},
  infoNote: {marginTop: 8, marginBottom: 14},
  sectionTitle: {fontSize: 14, color: COLORS.text, marginTop: 8, marginBottom: 4},
  containersHint: {fontSize: 12, color: COLORS.textMuted, marginBottom: 10},
  rowBetween: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},
  containerChip: {
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8,
  },
  removeContainerText: {fontSize: 14, color: COLORS.danger, fontWeight: '700'},
  addContainerBtn: {marginBottom: 20},
});

export default CreateInvoiceScreen;
