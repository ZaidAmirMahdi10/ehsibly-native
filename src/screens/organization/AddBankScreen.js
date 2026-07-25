import React, {useState} from 'react';
import {ScrollView, StyleSheet} from 'react-native';
import {useTranslation} from 'react-i18next';
import {useNavigation, useRoute} from '@react-navigation/native';

import FormField from '../../components/FormField';
import PrimaryButton from '../../components/PrimaryButton';
import ErrorState from '../../components/ErrorState';
import {createBank} from '../../services/banks';
import {useAuth} from '../../context/AuthContext';
import {COLORS} from '../../constants/theme';

const AddBankScreen = () => {
  const {t} = useTranslation();
  const navigation = useNavigation();
  const route = useRoute();
  const {onCreated} = route.params || {};
  const {session} = useAuth();

  const [name, setName] = useState('');
  const [bankCountry, setBankCountry] = useState('');
  const [bankCity, setBankCity] = useState('');
  const [branchName, setBranchName] = useState('');
  const [branchAddress, setBranchAddress] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async () => {
    if (!name.trim() || !branchName.trim() || !branchAddress.trim()) {
      setError(t('bankRequiredFieldsError'));
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      const data = await createBank({
        name: name.trim(),
        isIraqi: false,
        organizationId: session?.organization?.id,
        bankCountry: bankCountry.trim() || null,
        bankCity: bankCity.trim() || null,
        branches: [{branchName: branchName.trim(), branchAddress: branchAddress.trim()}],
      });
      const branch = data?.bank?.branch?.[0];
      onCreated?.({bank: data.bank, branch});
      navigation.goBack();
    } catch (err) {
      setError(err?.response?.data?.message || t('genericErrorMessage'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.container}>
      {error ? <ErrorState message={error} /> : null}
      <FormField label={t('bankNameLabel')} required value={name} onChangeText={setName} />
      <FormField label={t('bankCountryLabel')} value={bankCountry} onChangeText={setBankCountry} />
      <FormField label={t('bankCityLabel')} value={bankCity} onChangeText={setBankCity} />
      <FormField label={t('branchNameLabel')} required value={branchName} onChangeText={setBranchName} />
      <FormField
        label={t('branchAddressLabel')}
        required
        value={branchAddress}
        onChangeText={setBranchAddress}
      />
      <PrimaryButton title={t('saveBankAction')} onPress={handleSubmit} loading={isSubmitting} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  flex: {flex: 1, backgroundColor: COLORS.bg},
  container: {padding: 16, paddingBottom: 40},
});

export default AddBankScreen;
