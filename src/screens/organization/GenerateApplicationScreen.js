import React, {useContext, useEffect, useState} from 'react';
import {ScrollView, StyleSheet, TouchableOpacity, View} from 'react-native';
import {useTranslation} from 'react-i18next';
import {useNavigation, useRoute} from '@react-navigation/native';

import {LanguageContext} from '../../../App';
import CustomText from '../../components/CustomText';
import FormField from '../../components/FormField';
import PrimaryButton from '../../components/PrimaryButton';
import LoadingState from '../../components/LoadingState';
import ErrorState from '../../components/ErrorState';
import ErrorBox from '../../components/ErrorBox';
import StripedCard from '../../components/StripedCard';
import SelectField from '../../components/SelectField';
import {getCompanyBankAccounts, getSupplierBankAccounts} from '../../services/bankAccounts';
import {generatePermit} from '../../services/generatePermit';
import {useAuth} from '../../context/AuthContext';
import {COLORS} from '../../constants/theme';

const BAGHDAD_BANK_NAME = 'مصرف بغداد';

const dedupeBanks = accounts => {
  const banks = new Map();
  accounts.forEach(acc => {
    if (!banks.has(acc.bankId)) {
      banks.set(acc.bankId, {bankId: acc.bankId, bankName: acc.bankName});
    }
  });
  return Array.from(banks.values());
};

// Two cascading SelectFields (bank, then account) instead of one combined
// picker — matches the web app's bank → account flow, and reuses the same
// dropdown component for both steps.
const BankAccountPicker = ({accounts, bank, onSelectBank, account, onSelectAccount}) => {
  const {t} = useTranslation();

  if (accounts.length === 0) {
    return (
      <View style={styles.group}>
        <CustomText style={styles.label}>{t('bankNameLabel')}</CustomText>
        <CustomText style={styles.warningText}>—</CustomText>
      </View>
    );
  }

  const banks = dedupeBanks(accounts);
  const accountsForBank = bank ? accounts.filter(acc => acc.bankId === bank.bankId) : [];

  return (
    <>
      <SelectField
        label={t('bankNameLabel')}
        value={bank}
        options={banks}
        onSelect={onSelectBank}
        getLabel={b => b.bankName}
        getKey={b => b.bankId}
      />
      <SelectField
        label={t('accountNumberLabel')}
        value={account}
        options={accountsForBank}
        onSelect={onSelectAccount}
        getLabel={acc => `${acc.accountNumber} · ${acc.accountCurrency}`}
        getKey={acc => acc.id}
        disabled={!bank}
      />
    </>
  );
};

const GenerateApplicationScreen = () => {
  const {t} = useTranslation();
  const navigation = useNavigation();
  const route = useRoute();
  const {invoice} = route.params;
  const {session} = useAuth();
  const {currentDirection} = useContext(LanguageContext);
  const isRTL = currentDirection === 'rtl';

  const [companyAccounts, setCompanyAccounts] = useState([]);
  const [supplierAccounts, setSupplierAccounts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const [companyBank, setCompanyBank] = useState(null);
  const [companyAccount, setCompanyAccount] = useState(null);
  const [supplierBank, setSupplierBank] = useState(null);
  const [supplierAccount, setSupplierAccount] = useState(null);

  const [referenceNumber, setReferenceNumber] = useState('');
  const [purposeOfPayment, setPurposeOfPayment] = useState('');
  const [currentPaid, setCurrentPaid] = useState('');

  const [transferType, setTransferType] = useState('external');
  const [fee, setFee] = useState('beneficiary');
  const [toHongKong, setToHongKong] = useState(false);
  const [hasGoodsEnteredTheCountry, setHasGoodsEnteredTheCountry] = useState(false);
  const [isTransactionService, setIsTransactionService] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const isBaghdadBank = companyBank?.bankName === BAGHDAD_BANK_NAME;

  const handleSelectCompanyBank = bank => {
    setCompanyBank(bank);
    setCompanyAccount(null);
  };

  const handleSelectSupplierBank = bank => {
    setSupplierBank(bank);
    setSupplierAccount(null);
  };

  const load = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const [company, supplierAccs] = await Promise.all([
        getCompanyBankAccounts(invoice.subCompany?.id),
        getSupplierBankAccounts(invoice.supplier?.id),
      ]);
      setCompanyAccounts(company || []);
      setSupplierAccounts(supplierAccs || []);
      if (company?.length === 1) {
        setCompanyBank({bankId: company[0].bankId, bankName: company[0].bankName});
        setCompanyAccount(company[0]);
      }
      if (supplierAccs?.length === 1) {
        setSupplierBank({bankId: supplierAccs[0].bankId, bankName: supplierAccs[0].bankName});
        setSupplierAccount(supplierAccs[0]);
      }
    } catch (err) {
      setLoadError(t('genericErrorMessage'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const remaining = (invoice.amountForSupplier || 0) - (invoice.totalPaid || 0);
  const previousPaid = invoice.totalPaid || 0;
  const today = new Date().toISOString().split('T')[0];
  const paymentPercentage = invoice.amountForSupplier
    ? (((Number(currentPaid) || 0) / invoice.amountForSupplier) * 100).toFixed(2)
    : '0.00';
  const isAmountFaulty = currentPaid !== '' && (Number(currentPaid) <= 0 || Number(currentPaid) > remaining);

  const canSubmit =
    companyAccount &&
    supplierAccount &&
    purposeOfPayment.trim() &&
    Number(currentPaid) > 0 &&
    Number(currentPaid) <= remaining &&
    (!isBaghdadBank || (transferType && fee));

  const handleSubmit = async () => {
    if (!canSubmit) {
      setError(t('fillRequiredFieldsError'));
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await generatePermit({
        invoiceId: invoice.id,
        userId: session?.userId,
        companyBankId: companyAccount.bankId,
        companyBranchId: companyAccount.branchId,
        companyBankAccountId: companyAccount.id,
        supplierBankId: supplierAccount.bankId,
        supplierBankAccountId: supplierAccount.id,
        supplierBranchId: supplierAccount.branchId,
        purposeOfPayment: purposeOfPayment.trim(),
        paymentPercentage: (Number(currentPaid) / invoice.amountForSupplier) * 100,
        isApplicationBank: true,
        checks: isBaghdadBank ? {transferType, fee} : undefined,
        toHongKong: isBaghdadBank ? toHongKong : false,
        isTransactionService: isBaghdadBank ? isTransactionService : false,
        hasGoodsEnteredTheCountry: isBaghdadBank ? hasGoodsEnteredTheCountry : false,
        refrenceNumber: referenceNumber.trim() || undefined,
        paymentDate: new Date().toISOString(),
      });
      navigation.goBack();
    } catch (err) {
      setError(err?.response?.data?.message || t('genericErrorMessage'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <LoadingState />;
  }

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.container}>
      {(loadError || error) ? <ErrorState message={loadError || error} onRetry={loadError ? load : undefined} /> : null}

      <StripedCard
        isRTL={isRTL}
        style={styles.cardSpacing}
        items={[
          {
            label: t('senderLabel'),
            value: isRTL ? invoice.subCompany?.nameInAr || invoice.subCompany?.name : invoice.subCompany?.name,
          },
          {label: t('recipientLabel'), value: invoice.supplier?.name},
        ]}
      />

      <CustomText bold style={styles.sectionTitle}>{t('senderBankAccountInfoTitle')}</CustomText>
      <BankAccountPicker
        accounts={companyAccounts}
        bank={companyBank}
        onSelectBank={handleSelectCompanyBank}
        account={companyAccount}
        onSelectAccount={setCompanyAccount}
      />

      <CustomText bold style={styles.sectionTitle}>{t('receiverBankAccountInfoTitle')}</CustomText>
      <BankAccountPicker
        accounts={supplierAccounts}
        bank={supplierBank}
        onSelectBank={handleSelectSupplierBank}
        account={supplierAccount}
        onSelectAccount={setSupplierAccount}
      />

      <CustomText bold style={styles.sectionTitle}>{t('dateAndSerialDetailsTitle')}</CustomText>
      <StripedCard isRTL={isRTL} style={styles.cardSpacing} items={[{label: t('dateLabel'), value: today}]} />
      <FormField label={t('referenceNumberLabel')} value={referenceNumber} onChangeText={setReferenceNumber} />

      <CustomText bold style={styles.sectionTitle}>{t('paymentDetailsTitle')}</CustomText>
      <StripedCard
        isRTL={isRTL}
        style={styles.cardSpacing}
        items={[
          {label: t('invoiceAmountLabel'), value: `${invoice.amountForSupplier} ${invoice.currency || ''}`},
          {label: t('previousPaidLabel'), value: `${previousPaid} ${invoice.currency || ''}`},
        ]}
      />

      <FormField
        label={t('currentPaidLabel')}
        required
        value={currentPaid}
        onChangeText={setCurrentPaid}
        keyboardType="decimal-pad"
        suffix={invoice.currency}
        isRTL={isRTL}
      />
      {isAmountFaulty ? <ErrorBox text={t('faultyAmountError')} style={styles.inlineError} /> : null}

      <StripedCard
        isRTL={isRTL}
        style={styles.cardSpacing}
        items={[{label: t('paymentPercentageLabel'), value: `${paymentPercentage}%`}]}
      />

      {isBaghdadBank ? (
        <View style={styles.group}>
          <CustomText style={styles.label}>{t('transferTypeLabel')}</CustomText>
          <View style={[styles.chipRow, isRTL && styles.chipRowRTL]}>
            {['external', 'internal'].map(opt => (
              <TouchableOpacity
                key={opt}
                style={[styles.chip, transferType === opt && styles.chipActive]}
                onPress={() => setTransferType(opt)}>
                <CustomText style={[styles.chipText, transferType === opt && styles.chipTextActive]} paddingTop={0}>
                  {t(opt === 'external' ? 'transferExternal' : 'transferInternal')}
                </CustomText>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ) : null}

      <FormField label={t('purposeOfPaymentLabel')} required value={purposeOfPayment} onChangeText={setPurposeOfPayment} />

      {isBaghdadBank ? (
        <>
          <View style={styles.group}>
            <CustomText style={styles.label}>{t('feeLabel')}</CustomText>
            <View style={[styles.chipRow, isRTL && styles.chipRowRTL]}>
              {['beneficiary', 'remitter'].map(opt => (
                <TouchableOpacity
                  key={opt}
                  style={[styles.chip, fee === opt && styles.chipActive]}
                  onPress={() => setFee(opt)}>
                  <CustomText style={[styles.chipText, fee === opt && styles.chipTextActive]} paddingTop={0}>
                    {t(opt === 'beneficiary' ? 'feeBeneficiary' : 'feeRemitter')}
                  </CustomText>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {[
            {label: t('toHongKongLabel'), value: toHongKong, set: setToHongKong},
            {label: t('hasGoodsEnteredLabel'), value: hasGoodsEnteredTheCountry, set: setHasGoodsEnteredTheCountry},
            {label: t('isTransactionServiceLabel'), value: isTransactionService, set: setIsTransactionService},
          ].map(({label, value, set}) => (
            <TouchableOpacity
              key={label}
              style={[styles.toggleRow, isRTL && styles.toggleRowRTL]}
              onPress={() => set(!value)}>
              <View style={[styles.checkbox, value && styles.checkboxChecked, isRTL && styles.checkboxRTL]}>
                {value ? <CustomText style={styles.checkboxMark} paddingTop={0}>✓</CustomText> : null}
              </View>
              <CustomText style={styles.toggleLabel} paddingTop={0}>{label}</CustomText>
            </TouchableOpacity>
          ))}
        </>
      ) : null}

      <PrimaryButton
        title={t('generateApplicationAction')}
        onPress={handleSubmit}
        loading={isSubmitting}
        disabled={!canSubmit}
        style={styles.submitBtn}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  flex: {flex: 1, backgroundColor: COLORS.bg},
  container: {padding: 16, paddingBottom: 40},
  sectionTitle: {fontSize: 14, color: COLORS.text, marginTop: 12, marginBottom: 8},
  group: {marginBottom: 14},
  label: {fontSize: 12, fontWeight: '700', color: COLORS.textMuted, marginBottom: 6},
  warningText: {fontSize: 12, color: COLORS.pending},
  cardSpacing: {marginBottom: 14},
  inlineError: {marginTop: -6, marginBottom: 14},
  chipRow: {flexDirection: 'row', flexWrap: 'wrap', gap: 8},
  chipRowRTL: {flexDirection: 'row-reverse'},
  chip: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: COLORS.surface,
  },
  chipActive: {backgroundColor: COLORS.primary, borderColor: COLORS.primary},
  chipText: {fontSize: 13, color: COLORS.text, fontWeight: '600'},
  chipTextActive: {color: '#fff'},
  toggleRow: {flexDirection: 'row', alignItems: 'center', marginBottom: 10},
  toggleRowRTL: {flexDirection: 'row-reverse'},
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  checkboxRTL: {marginRight: 0, marginLeft: 10},
  checkboxChecked: {backgroundColor: COLORS.primary, borderColor: COLORS.primary},
  checkboxMark: {color: '#fff', fontSize: 12, fontWeight: '700'},
  toggleLabel: {fontSize: 13, color: COLORS.text},
  submitBtn: {marginTop: 10},
});

export default GenerateApplicationScreen;
