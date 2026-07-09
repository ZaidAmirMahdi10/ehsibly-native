import React, {useContext, useEffect, useState} from 'react';
import {
  View,
  Image,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import {useTranslation} from 'react-i18next';
import {useNavigation} from '@react-navigation/native';
import {SafeAreaView} from 'react-native-safe-area-context';

import {LanguageContext} from '../../../App';
import CustomText from '../../components/CustomText';
import FormField from '../../components/FormField';
import SelectField from '../../components/SelectField';
import PrimaryButton from '../../components/PrimaryButton';
import LanguageToggle from '../../components/LanguageToggle';
import {register, resendVerificationEmail} from '../../services/auth';
import {makeShadow} from '../../constants/theme';

// Mirrors the web app's Register.js exactly: same two tabs, same field set,
// same organizationType/subscriptionType option lists, same /register and
// /resend-verification-email payload shapes. Reuses this app's existing
// organizationType translation keys (NO_CUSTOMER_MERCHANT, MERCHANT, etc. —
// see ProfileScreen) instead of the web's separate title-mapping, since this
// app already keys those translations by the raw backend value.
const ORGANIZATION_TYPES = [
  {value: 'NO_CUSTOMER_MERCHANT'},
  {value: 'MERCHANT'},
  {value: 'FABRICSTORE'},
  {value: 'SUPERMARKET'},
  {value: 'CLINIC'},
  {value: 'PAPERFACTORY'},
  {value: 'SCHOOL'},
];

const SUBSCRIPTION_TYPES = [{value: 'limited'}, {value: 'basic'}, {value: 'pro'}, {value: 'enterprise'}];

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const BACKEND_ERROR_KEYS = {
  emailAlreadyInUse: 'emailAlreadyInUseError',
  invalidPhoneNumber: 'invalidPhoneNumberError',
};

const RegisterScreen = () => {
  const {t} = useTranslation();
  const navigation = useNavigation();
  const {currentDirection} = useContext(LanguageContext);
  const isRTL = currentDirection === 'rtl';

  const [tab, setTab] = useState('organization');
  const [organizationType, setOrganizationType] = useState(ORGANIZATION_TYPES[0]);
  const [subscriptionType, setSubscriptionType] = useState(SUBSCRIPTION_TYPES[0]);
  const [organizationName, setOrganizationName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [registeredEntity, setRegisteredEntity] = useState(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendStatus, setResendStatus] = useState(null);

  useEffect(() => {
    if (resendCooldown <= 0) {
      return;
    }
    const timer = setInterval(() => {
      setResendCooldown(prev => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleRegister = async () => {
    const isOrganizationTab = tab === 'organization';
    const requiredFields = isOrganizationTab
      ? [email, organizationName, password, phoneNumber]
      : [email, username, password, phoneNumber];

    if (requiredFields.some(field => !field)) {
      setError(t('emptyInputFieldsError'));
      return;
    }
    if (password !== confirmPassword) {
      setError(t('passwordsDoNotMatchError'));
      return;
    }
    if (!EMAIL_PATTERN.test(email)) {
      setError(t('invalidEmailError'));
      return;
    }
    setError(null);

    const language = isRTL ? 'ar' : 'en';
    const payload = isOrganizationTab
      ? {
          email,
          organizationName,
          organizationType: organizationType.value,
          password,
          phoneNumber,
          language,
          subscriptionType: subscriptionType.value,
        }
      : {email, username, password, phoneNumber, language, userType: 'indi'};

    setIsSubmitting(true);
    try {
      const data = await register(payload);
      setSuccess(true);
      if (data?.id) {
        setRegisteredEntity({id: data.id, isOrganization: data.isOrganization});
        setResendCooldown(30);
      }
    } catch (err) {
      const backendKey = err?.response?.data?.error;
      setError(t(BACKEND_ERROR_KEYS[backendKey] || (err?.response ? 'genericErrorMessage' : 'networkError')));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (!registeredEntity?.id || resendCooldown > 0 || resendLoading) {
      return;
    }
    setResendLoading(true);
    setResendStatus(null);
    try {
      const language = isRTL ? 'ar' : 'en';
      const data = await resendVerificationEmail({...registeredEntity, language});
      setResendStatus({
        type: 'success',
        message: data?.message === 'alreadyVerified' ? t('alreadyVerifiedMessage') : t('verificationEmailSentMessage'),
      });
      setResendCooldown(30);
    } catch {
      setResendStatus({type: 'error', message: t('verificationEmailFailedError')});
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.flex} edges={['top', 'bottom', 'left', 'right']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <LanguageToggle
          style={[styles.languageToggle, isRTL ? styles.languageToggleLeft : styles.languageToggleRight]}
        />

        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Image source={require('../../assets/logo.png')} style={styles.logoImage} resizeMode="contain" />
            <CustomText center bold style={styles.title} lineHeight={28}>
              {t('registerTitle')}
            </CustomText>
            <CustomText center style={styles.subtitle}>
              {t('registerSubtitle')}
            </CustomText>
          </View>

          {success ? (
            <View style={styles.successBox}>
              <CustomText center style={styles.successText}>
                {t('registrationSuccessMessage')}
              </CustomText>

              {resendStatus ? (
                <CustomText
                  center
                  style={[styles.resendStatusText, resendStatus.type === 'error' && styles.resendStatusError]}>
                  {resendStatus.message}
                </CustomText>
              ) : null}

              <PrimaryButton
                title={t('loginButton')}
                onPress={() => navigation.navigate('Login')}
                style={styles.successBtn}
              />

              {registeredEntity?.id ? (
                <PrimaryButton
                  title={
                    resendCooldown > 0
                      ? t('resendInSecondsLabel', {seconds: resendCooldown})
                      : t('resendVerificationAction')
                  }
                  onPress={handleResend}
                  variant="secondary"
                  loading={resendLoading}
                  disabled={resendLoading || resendCooldown > 0}
                  style={styles.successBtn}
                />
              ) : null}
            </View>
          ) : (
            <View style={styles.form}>
              <View style={[styles.tabRow, isRTL && styles.tabRowRTL]}>
                <TouchableOpacity
                  style={[styles.tab, tab === 'organization' && styles.tabActive]}
                  onPress={() => setTab('organization')}
                  activeOpacity={0.8}>
                  <CustomText
                    style={[styles.tabText, tab === 'organization' && styles.tabTextActive]}
                    paddingTop={0}>
                    {t('tabOrganization')}
                  </CustomText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.tab, tab === 'individual' && styles.tabActive]}
                  onPress={() => setTab('individual')}
                  activeOpacity={0.8}>
                  <CustomText style={[styles.tabText, tab === 'individual' && styles.tabTextActive]} paddingTop={0}>
                    {t('tabIndividual')}
                  </CustomText>
                </TouchableOpacity>
              </View>

              {tab === 'organization' ? (
                <>
                  <SelectField
                    label={t('organizationTypeLabel')}
                    value={organizationType}
                    options={ORGANIZATION_TYPES}
                    onSelect={setOrganizationType}
                    getLabel={item => t(item.value)}
                    getKey={item => item.value}
                  />
                  <SelectField
                    label={t('subscriptionTypeLabel')}
                    value={subscriptionType}
                    options={SUBSCRIPTION_TYPES}
                    onSelect={setSubscriptionType}
                    getLabel={item => t(item.value)}
                    getKey={item => item.value}
                  />
                  <FormField
                    label={t('organizationNameLabel')}
                    required
                    value={organizationName}
                    onChangeText={setOrganizationName}
                    placeholder={t('organizationNameLabel')}
                  />
                </>
              ) : (
                <FormField
                  label={t('usernameLabel')}
                  required
                  value={username}
                  onChangeText={setUsername}
                  placeholder={t('usernameLabel')}
                  autoCapitalize="none"
                />
              )}

              <FormField
                label={t('emailLabel')}
                required
                value={email}
                onChangeText={setEmail}
                placeholder={t('emailPlaceholder')}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
              <FormField
                label={t('phoneNumberLabel')}
                required
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                placeholder={t('phoneNumberLabel')}
                keyboardType="phone-pad"
              />
              <FormField
                label={t('passwordLabel')}
                required
                value={password}
                onChangeText={setPassword}
                placeholder={t('passwordPlaceholder')}
                secureTextEntry
                autoCapitalize="none"
              />
              <FormField
                label={t('confirmPasswordLabel')}
                required
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder={t('passwordPlaceholder')}
                secureTextEntry
                autoCapitalize="none"
              />

              {error ? (
                <CustomText center style={styles.errorText}>
                  {error}
                </CustomText>
              ) : null}

              <PrimaryButton
                title={t('registerAction')}
                onPress={handleRegister}
                loading={isSubmitting}
                style={styles.submitBtn}
              />

              <TouchableOpacity
                style={styles.loginLink}
                onPress={() => navigation.navigate('Login')}
                activeOpacity={0.7}>
                <CustomText center style={styles.loginLinkText} paddingTop={0}>
                  {t('alreadyHaveAccountLabel')}{' '}
                  <CustomText bold style={styles.loginLinkAction}>
                    {t('loginButton')}
                  </CustomText>
                </CustomText>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  flex: {flex: 1, backgroundColor: '#fff'},
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  languageToggle: {position: 'absolute', top: 12, zIndex: 3},
  languageToggleLeft: {left: 20},
  languageToggleRight: {right: 20},
  header: {
    alignItems: 'center',
    marginBottom: 28,
  },
  logoImage: {
    width: 80,
    height: 80,
    marginBottom: 14,
  },
  title: {
    fontSize: 22,
    color: '#2A2E3A',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: '#8A8FA3',
    textAlign: 'center',
  },
  form: {width: '100%'},
  tabRow: {
    flexDirection: 'row',
    backgroundColor: '#F1F2F4',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  tabRowRTL: {flexDirection: 'row-reverse'},
  tab: {
    flex: 1,
    borderRadius: 9,
    paddingVertical: 10,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: '#fff',
    ...makeShadow({y: 1, blur: 3, opacity: 0.08}),
  },
  tabText: {fontSize: 13, fontWeight: '600', color: '#8A8FA3'},
  tabTextActive: {color: '#79329a'},
  errorText: {
    color: '#C1121F',
    fontSize: 13,
    marginBottom: 16,
  },
  submitBtn: {marginTop: 4},
  loginLink: {marginTop: 18},
  loginLinkText: {fontSize: 14, color: '#5B6472'},
  loginLinkAction: {color: '#79329a'},
  successBox: {width: '100%', alignItems: 'center'},
  successText: {
    fontSize: 14,
    color: '#2A2E3A',
    marginBottom: 16,
    lineHeight: 20,
  },
  resendStatusText: {
    fontSize: 13,
    color: '#2db87a',
    marginBottom: 16,
  },
  resendStatusError: {color: '#C1121F'},
  successBtn: {width: '100%', marginTop: 10},
});

export default RegisterScreen;
