import React, {useState} from 'react';
import {ScrollView, StyleSheet} from 'react-native';
import {useTranslation} from 'react-i18next';
import {useNavigation, useRoute} from '@react-navigation/native';

import FormField from '../../components/FormField';
import PrimaryButton from '../../components/PrimaryButton';
import ErrorState from '../../components/ErrorState';
import {createBank, updateBank} from '../../services/banks';
import {useAuth} from '../../context/AuthContext';
import {COLORS} from '../../constants/theme';

const AddBankScreen = () => {
  const {t} = useTranslation();
  const navigation = useNavigation();
  const route = useRoute();
  // isIraqi selects the bank kind (Iraqi banks have no country/city and are
  // server-restricted to admins). editItem/onSaved → edit; onCreated → add.
  const {onCreated, editItem, onSaved, isIraqi = false} = route.params || {};
  const isEdit = !!editItem;
  const {session} = useAuth();

  const firstBranch = editItem?.branch?.[0];
  const [name, setName] = useState(editItem?.name || '');
  const [bankCountry, setBankCountry] = useState(editItem?.bankCountry || '');
  const [bankCity, setBankCity] = useState(editItem?.bankCity || '');
  const [branchName, setBranchName] = useState(firstBranch?.name || '');
  const [branchAddress, setBranchAddress] = useState(firstBranch?.address || '');
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
      if (isEdit) {
        // updateBank wants branches as [{id?, name, address}] and a required
        // nameWithNoSpace; Iraqi banks carry no country/city.
        await updateBank(editItem.id, {
          name: name.trim(),
          nameWithNoSpace: name.trim().replace(/\s+/g, ''),
          isIraqi,
          bankCountry: isIraqi ? null : bankCountry.trim() || null,
          bankCity: isIraqi ? null : bankCity.trim() || null,
          branches: [
            {id: firstBranch?.id, name: branchName.trim(), address: branchAddress.trim()},
          ],
        });
        onSaved?.();
      } else {
        // createBank wants branches as [{branchName, branchAddress}]; foreign
        // banks need organizationId, Iraqi banks are global (admin only).
        const data = await createBank({
          name: name.trim(),
          isIraqi,
          organizationId: isIraqi ? undefined : session?.organization?.id,
          bankCountry: isIraqi ? null : bankCountry.trim() || null,
          bankCity: isIraqi ? null : bankCity.trim() || null,
          branches: [{branchName: branchName.trim(), branchAddress: branchAddress.trim()}],
        });
        const branch = data?.bank?.branch?.[0];
        onCreated?.({bank: data.bank, branch});
      }
      navigation.goBack();
    } catch (err) {
      setError(err?.response?.data?.message || err?.response?.data?.error || t('genericErrorMessage'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.container}>
      {error ? <ErrorState message={error} /> : null}
      <FormField label={t('bankNameLabel')} required value={name} onChangeText={setName} />
      {!isIraqi ? (
        <>
          <FormField label={t('bankCountryLabel')} value={bankCountry} onChangeText={setBankCountry} />
          <FormField label={t('bankCityLabel')} value={bankCity} onChangeText={setBankCity} />
        </>
      ) : null}
      <FormField label={t('branchNameLabel')} required value={branchName} onChangeText={setBranchName} />
      <FormField
        label={t('branchAddressLabel')}
        required
        value={branchAddress}
        onChangeText={setBranchAddress}
      />
      <PrimaryButton
        title={isEdit ? t('saveChangesAction') : t('saveBankAction')}
        onPress={handleSubmit}
        loading={isSubmitting}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  flex: {flex: 1, backgroundColor: COLORS.bg},
  container: {padding: 16, paddingBottom: 40},
});

export default AddBankScreen;
