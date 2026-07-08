import React, {useContext} from 'react';
import {View, ScrollView, StyleSheet, TouchableOpacity} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useTranslation} from 'react-i18next';

import {LanguageContext} from '../../../App';
import CustomText from '../../components/CustomText';
import PrimaryButton from '../../components/PrimaryButton';
import {useAuth} from '../../context/AuthContext';
import {useAlert} from '../../context/AlertContext';

const APP_VERSION = '1.0.0-phaseA';

const SettingsScreen = () => {
  const {t} = useTranslation();
  const {currentLanguage, changeLanguage, currentDirection} = useContext(LanguageContext);
  const isRTL = currentDirection === 'rtl';
  const {logout} = useAuth();
  const {showAlert} = useAlert();

  const handleLogout = () => {
    showAlert(t('logoutConfirmTitle'), t('logoutConfirmMessage'), [
      {text: t('cancel'), style: 'cancel'},
      {text: t('logout'), style: 'destructive', onPress: logout},
    ]);
  };

  return (
    <SafeAreaView style={styles.flex} edges={['top', 'left', 'right']}>
      <ScrollView style={styles.flex} contentContainerStyle={styles.container}>
        <View style={styles.section}>
          <CustomText bold style={styles.sectionTitle}>
            {t('languageSectionTitle')}
          </CustomText>
          <View style={styles.card}>
            <TouchableOpacity
              style={[styles.row, {flexDirection: isRTL ? 'row-reverse' : 'row'}]}
              activeOpacity={0.7}
              onPress={() => changeLanguage('ar')}>
              <CustomText style={styles.rowLabel}>{t('arabic')}</CustomText>
              {currentLanguage === 'ar' ? (
                <CustomText style={styles.checkMark} paddingTop={0}>
                  ✓
                </CustomText>
              ) : null}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.row, styles.rowLast, {flexDirection: isRTL ? 'row-reverse' : 'row'}]}
              activeOpacity={0.7}
              onPress={() => changeLanguage('en')}>
              <CustomText style={styles.rowLabel}>{t('english')}</CustomText>
              {currentLanguage === 'en' ? (
                <CustomText style={styles.checkMark} paddingTop={0}>
                  ✓
                </CustomText>
              ) : null}
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <PrimaryButton title={t('logout')} onPress={handleLogout} variant="danger" />
        </View>

        <CustomText center style={styles.versionText}>
          {t('appVersionLabel')} {APP_VERSION}
        </CustomText>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  flex: {flex: 1, backgroundColor: '#F7F7FA'},
  container: {padding: 16, paddingBottom: 40},
  section: {marginBottom: 20},
  sectionTitle: {fontSize: 13, color: '#8A8FA3', marginBottom: 8, paddingHorizontal: 4},
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#EAEAEF',
  },
  rowLast: {borderBottomWidth: 0},
  rowLabel: {fontSize: 14, color: '#2A2E3A'},
  checkMark: {color: '#79329a', fontWeight: '700', fontSize: 16},
  versionText: {fontSize: 12, color: '#B7BAC6', marginTop: 8},
});

export default SettingsScreen;
