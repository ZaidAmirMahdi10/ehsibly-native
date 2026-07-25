import React, {useState} from 'react';
import {ScrollView, StyleSheet, TouchableOpacity, View} from 'react-native';
import {useTranslation} from 'react-i18next';
import {useNavigation, useRoute} from '@react-navigation/native';

import CustomText from '../../components/CustomText';
import FormField from '../../components/FormField';
import PrimaryButton from '../../components/PrimaryButton';
import ErrorState from '../../components/ErrorState';
import {createSupplier} from '../../services/suppliers';
import {useAuth} from '../../context/AuthContext';
import {COLORS} from '../../constants/theme';

const AddSupplierScreen = () => {
  const {t} = useTranslation();
  const navigation = useNavigation();
  const route = useRoute();
  const {onCreated} = route.params || {};
  const {session} = useAuth();

  const [supplierName, setSupplierName] = useState('');
  const [supplierCompany, setSupplierCompany] = useState('');
  const [supplierCountry, setSupplierCountry] = useState('China');
  const [supplierCity, setSupplierCity] = useState('');
  const [supplierAddress, setSupplierAddress] = useState('');
  const [supplierPhoneNumber, setSupplierPhoneNumber] = useState('');
  const [supplierEmail, setSupplierEmail] = useState('');

  const [selectedBank, setSelectedBank] = useState(null);
  const [accountNumber, setAccountNumber] = useState('');
  const [accountCurrency, setAccountCurrency] = useState('USD');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async () => {
    if (!supplierName.trim()) {
      setError(t('supplierNameRequiredError'));
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      const bankAccounts =
        selectedBank && accountNumber.trim() && accountCurrency.trim()
          ? [
              {
                accountNumber: accountNumber.trim(),
                accountCurrency: accountCurrency.trim().toUpperCase(),
                bank: {id: selectedBank.bank.id},
                branch: {id: selectedBank.branch.id},
              },
            ]
          : undefined;

      const data = await createSupplier({
        supplierName: supplierName.trim(),
        supplierCompany: supplierCompany.trim() || undefined,
        supplierCountry: supplierCountry.trim() || undefined,
        supplierCity: supplierCity.trim() || undefined,
        supplierAddress: supplierAddress.trim() || undefined,
        supplierPhoneNumber: supplierPhoneNumber.trim() || undefined,
        supplierEmail: supplierEmail.trim() || undefined,
        organizationId: session?.organization?.id,
        userId: session?.userId,
        bankAccounts,
      });
      onCreated?.(data.newSupplier);
      navigation.goBack();
    } catch (err) {
      setError(err?.response?.data?.error || t('genericErrorMessage'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.container}>
      {error ? <ErrorState message={error} /> : null}

      <FormField label={t('supplierNameLabel')} required value={supplierName} onChangeText={setSupplierName} />
      <FormField label={t('supplierCompanyLabel')} value={supplierCompany} onChangeText={setSupplierCompany} />
      <FormField label={t('countryLabel')} value={supplierCountry} onChangeText={setSupplierCountry} />
      <FormField label={t('cityLabel')} value={supplierCity} onChangeText={setSupplierCity} />
      <FormField label={t('addressLabel')} value={supplierAddress} onChangeText={setSupplierAddress} />
      <FormField label={t('phoneLabel')} value={supplierPhoneNumber} onChangeText={setSupplierPhoneNumber} keyboardType="phone-pad" />
      <FormField label={t('emailLabel')} value={supplierEmail} onChangeText={setSupplierEmail} autoCapitalize="none" keyboardType="email-address" />

      <CustomText bold style={styles.sectionTitle}>
        {t('supplierBankAccountSectionTitle')}
      </CustomText>
      <CustomText style={styles.sectionHint}>{t('supplierBankAccountHint')}</CustomText>

      <View style={styles.group}>
        <CustomText style={styles.label}>{t('bankLabel')}</CustomText>
        <TouchableOpacity
          style={styles.pickerBtn}
          onPress={() =>
            navigation.navigate('BankPicker', {onSelect: setSelectedBank})
          }>
          <CustomText style={styles.pickerBtnText} paddingTop={0}>
            {selectedBank ? selectedBank.bank.name : t('chooseBankPlaceholder')}
          </CustomText>
        </TouchableOpacity>
      </View>

      <FormField
        label={t('accountNumberLabel')}
        value={accountNumber}
        onChangeText={setAccountNumber}
      />
      <FormField
        label={t('currencyLabel')}
        value={accountCurrency}
        onChangeText={setAccountCurrency}
        autoCapitalize="characters"
      />

      <PrimaryButton title={t('saveSupplierAction')} onPress={handleSubmit} loading={isSubmitting} style={styles.submitBtn} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  flex: {flex: 1, backgroundColor: COLORS.bg},
  container: {padding: 16, paddingBottom: 40},
  sectionTitle: {fontSize: 14, color: COLORS.text, marginTop: 8, marginBottom: 2},
  sectionHint: {fontSize: 12, color: COLORS.textMuted, marginBottom: 12},
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
  submitBtn: {marginTop: 6},
});

export default AddSupplierScreen;
