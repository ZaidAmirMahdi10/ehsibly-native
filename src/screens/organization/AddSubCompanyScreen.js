import React, {useState} from 'react';
import {ScrollView, StyleSheet} from 'react-native';
import {useTranslation} from 'react-i18next';
import {useNavigation, useRoute} from '@react-navigation/native';

import FormField from '../../components/FormField';
import PrimaryButton from '../../components/PrimaryButton';
import ErrorState from '../../components/ErrorState';
import {createSubCompany, updateSubCompany} from '../../services/subCompanies';
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

  const [companyName, setCompanyName] = useState(editItem?.name || '');
  const [nameInAr, setNameInAr] = useState(editItem?.nameInAr || '');
  const [address, setAddress] = useState(editItem?.address || '');
  const [country, setCountry] = useState(editItem?.country || 'Iraq');
  const [city, setCity] = useState(editItem?.city || '');
  const [phoneNumber, setPhoneNumber] = useState(editItem?.phoneNumber || '');
  const [email, setEmail] = useState(editItem?.email || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async () => {
    if (!companyName.trim()) {
      setError(t('subCompanyNameRequiredError'));
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      const payload = {
        companyName: companyName.trim(),
        nameInAr: nameInAr.trim() || undefined,
        address: address.trim() || undefined,
        country: country.trim() || undefined,
        city: city.trim() || undefined,
        phoneNumber: phoneNumber.trim() || undefined,
        email: email.trim() || undefined,
      };
      if (isEdit) {
        await updateSubCompany(editItem.id, payload);
        onSaved?.();
      } else {
        const data = await createSubCompany({
          ...payload,
          organizationId: session?.organization?.id,
        });
        onCreated?.(data.subCompany);
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
      <FormField label={t('companyNameLabel')} required value={companyName} onChangeText={setCompanyName} />
      <FormField label={t('companyNameArLabel')} value={nameInAr} onChangeText={setNameInAr} />
      <FormField label={t('addressLabel')} value={address} onChangeText={setAddress} />
      <FormField label={t('countryLabel')} value={country} onChangeText={setCountry} />
      <FormField label={t('cityLabel')} value={city} onChangeText={setCity} />
      <FormField label={t('phoneLabel')} value={phoneNumber} onChangeText={setPhoneNumber} keyboardType="phone-pad" />
      <FormField label={t('emailLabel')} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
      <PrimaryButton
        title={isEdit ? t('saveChangesAction') : t('saveSubCompanyAction')}
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

export default AddSubCompanyScreen;
