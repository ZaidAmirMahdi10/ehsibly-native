import React, {useContext, useState} from 'react';
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
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Eye, EyeOff} from 'lucide-react-native';

import {LanguageContext} from '../../../App';
import CustomText from '../../components/CustomText';
import CustomInput from '../../components/CustomInput';
import PrimaryButton from '../../components/PrimaryButton';
import LanguageToggle from '../../components/LanguageToggle';
import {useAuth} from '../../context/AuthContext';

// Backend (routes/login.js) returns one of these as `error` in its JSON body
// on failure; `unsupportedAccountType` is thrown client-side by AuthContext
// when the login succeeds but the account isn't an org-side account.
const ERROR_MESSAGE_KEYS = {
  invalidCredentials: 'invalidCredentialsError',
  accountBlocked: 'accountBlockedError',
  organizationBlocked: 'organizationBlockedError',
  inactiveAccount: 'inactiveAccountError',
  unsupportedAccountType: 'unsupportedAccountTypeError',
};

const LoginScreen = () => {
  const {t} = useTranslation();
  const {login} = useAuth();
  const navigation = useNavigation();
  const {currentDirection} = useContext(LanguageContext);
  const isRTL = currentDirection === 'rtl';
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [keepLogged, setKeepLogged] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async () => {
    if (!email.trim() || !password) {
      setError(t('missingCredentialsError'));
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      await login(email.trim(), password, keepLogged);
    } catch (err) {
      const backendKey = err?.response?.data?.error;
      const messageKey =
        ERROR_MESSAGE_KEYS[err?.message] ||
        ERROR_MESSAGE_KEYS[backendKey] ||
        (err?.response ? 'invalidCredentialsError' : 'networkError');
      setError(t(messageKey));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <LanguageToggle
        style={[
          styles.languageToggle,
          {top: insets.top + 12},
          isRTL ? styles.languageToggleLeft : styles.languageToggleRight,
        ]}
      />

      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Image
            source={require('../../assets/logo.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
          <CustomText center bold style={styles.title} lineHeight={28}>
            {t('loginTitle')}
          </CustomText>
          <CustomText center style={styles.subtitle}>
            {t('loginSubtitle')}
          </CustomText>
        </View>

        <View style={styles.form}>
          <View style={styles.fieldGroup}>
            <CustomText style={styles.label}>{t('emailLabel')}</CustomText>
            <CustomInput
              value={email}
              onChangeText={setEmail}
              placeholder={t('emailPlaceholder')}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              style={styles.input}
            />
          </View>

          <View style={styles.fieldGroup}>
            <CustomText style={styles.label}>{t('passwordLabel')}</CustomText>
            <View style={[styles.passwordRow, isRTL && styles.passwordRowRTL]}>
              <CustomInput
                value={password}
                onChangeText={setPassword}
                placeholder={t('passwordPlaceholder')}
                secureTextEntry={!passwordVisible}
                autoCapitalize="none"
                style={[styles.input, styles.passwordInput, isRTL && styles.passwordInputRTL]}
              />
              <TouchableOpacity
                style={styles.passwordEyeBtn}
                onPress={() => setPasswordVisible(prev => !prev)}
                hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
                {passwordVisible ? (
                  <EyeOff size={18} color="#8A8FA3" />
                ) : (
                  <Eye size={18} color="#8A8FA3" />
                )}
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.keepLoggedRow, isRTL && styles.keepLoggedRowRTL]}
            onPress={() => setKeepLogged(prev => !prev)}
            activeOpacity={0.7}>
            <View style={[styles.checkbox, keepLogged && styles.checkboxChecked]}>
              {keepLogged ? (
                <CustomText style={styles.checkboxMark} paddingTop={0}>
                  ✓
                </CustomText>
              ) : null}
            </View>
            <CustomText style={styles.keepLoggedLabel} paddingTop={0}>
              {t('keepLoggedLabel')}
            </CustomText>
          </TouchableOpacity>

          {error ? (
            <CustomText center style={styles.errorText}>
              {error}
            </CustomText>
          ) : null}

          <PrimaryButton
            title={t('loginButton')}
            onPress={handleSubmit}
            loading={isSubmitting}
            style={styles.submitBtn}
          />

          <TouchableOpacity
            style={styles.registerLink}
            onPress={() => navigation.navigate('Register')}
            activeOpacity={0.7}>
            <CustomText center style={styles.registerLinkText} paddingTop={0}>
              {t('noAccountLabel')} <CustomText bold style={styles.registerLinkAction}>{t('registerAction')}</CustomText>
            </CustomText>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
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
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoImage: {
    width: 96,
    height: 96,
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    color: '#2A2E3A',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: '#8A8FA3',
  },
  form: {
    width: '100%',
  },
  fieldGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    color: '#5B6472',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E2E4EA',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E4EA',
    borderRadius: 10,
    paddingRight: 14,
  },
  passwordRowRTL: {flexDirection: 'row-reverse', paddingRight: 0, paddingLeft: 14},
  passwordInput: {
    flex: 1,
    borderWidth: 0,
    paddingRight: 0,
  },
  passwordInputRTL: {paddingRight: 14, paddingLeft: 0},
  passwordEyeBtn: {marginHorizontal: 4},
  keepLoggedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  keepLoggedRowRTL: {flexDirection: 'row-reverse'},
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#C7CAD4',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 8,
  },
  checkboxChecked: {
    backgroundColor: '#79329a',
    borderColor: '#79329a',
  },
  checkboxMark: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  keepLoggedLabel: {
    fontSize: 14,
    color: '#5B6472',
  },
  errorText: {
    color: '#C1121F',
    fontSize: 13,
    marginBottom: 16,
  },
  submitBtn: {
    marginTop: 4,
  },
  languageToggle: {
    position: 'absolute',
    zIndex: 3,
  },
  languageToggleLeft: {left: 20},
  languageToggleRight: {right: 20},
  registerLink: {
    marginTop: 18,
  },
  registerLinkText: {
    fontSize: 14,
    color: '#5B6472',
  },
  registerLinkAction: {
    color: '#79329a',
  },
});

export default LoginScreen;
