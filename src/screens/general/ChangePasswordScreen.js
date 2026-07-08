import React, {useState} from 'react';
import {ScrollView, StyleSheet} from 'react-native';
import {useTranslation} from 'react-i18next';
import {useNavigation} from '@react-navigation/native';

import FormField from '../../components/FormField';
import PrimaryButton from '../../components/PrimaryButton';
import ErrorState from '../../components/ErrorState';
import {changePassword} from '../../services/auth';
import {useAuth} from '../../context/AuthContext';
import {useAlert} from '../../context/AlertContext';
import {COLORS} from '../../constants/theme';

// Backend (routes/changePassword.js, controllers/orgController.js) returns
// one of these as `error` in its JSON body on failure.
const ERROR_MESSAGE_KEYS = {
  currentPasswordIsIncorrect: 'currentPasswordIsIncorrectError',
};

const ChangePasswordScreen = () => {
  const {t} = useTranslation();
  const navigation = useNavigation();
  const {session} = useAuth();
  const {showAlert} = useAlert();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError(t('missingPasswordFieldsError'));
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t('newPasswordsDoNotMatchError'));
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      await changePassword({
        userType: session?.userType,
        userId: session?.userId,
        organizationId: session?.organization?.id,
        currentPassword,
        newPassword,
      });
      showAlert(t('passwordChangedSuccessfully'), '', [
        {text: t('ok'), onPress: () => navigation.goBack()},
      ]);
    } catch (err) {
      const backendKey = err?.response?.data?.error;
      const messageKey = ERROR_MESSAGE_KEYS[backendKey] || 'genericErrorMessage';
      setError(t(messageKey));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.container}>
      {error ? <ErrorState message={error} /> : null}
      <FormField
        label={t('currentPasswordLabel')}
        required
        value={currentPassword}
        onChangeText={setCurrentPassword}
        secureTextEntry
        autoCapitalize="none"
      />
      <FormField
        label={t('newPasswordLabel')}
        required
        value={newPassword}
        onChangeText={setNewPassword}
        secureTextEntry
        autoCapitalize="none"
      />
      <FormField
        label={t('confirmNewPasswordLabel')}
        required
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
        autoCapitalize="none"
      />
      <PrimaryButton title={t('changePasswordAction')} onPress={handleSubmit} loading={isSubmitting} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  flex: {flex: 1, backgroundColor: COLORS.bg},
  container: {padding: 16, paddingBottom: 40},
});

export default ChangePasswordScreen;
