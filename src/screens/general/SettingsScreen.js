import React, {useContext} from 'react';
import {View, ScrollView, StyleSheet, TouchableOpacity} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useTranslation} from 'react-i18next';
import {useNavigation} from '@react-navigation/native';
import {Languages, Code, LogOut, ChevronLeft, ChevronRight} from 'lucide-react-native';

import {LanguageContext} from '../../../App';
import CustomText from '../../components/CustomText';
import {useAuth} from '../../context/AuthContext';
import {useAlert} from '../../context/AlertContext';
import {COLORS, CARD_SHADOW} from '../../constants/theme';

const APP_VERSION = '1.0.0-phaseA';

// A tappable settings row: leading icon chip, label, trailing chevron (or
// any custom trailing node, e.g. the language checkmarks).
const SettingsRow = ({icon: Icon, iconColor, label, labelColor, onPress, trailing, isRTL, last}) => {
  const Chevron = isRTL ? ChevronLeft : ChevronRight;
  return (
    <TouchableOpacity
      style={[styles.row, isRTL && styles.rowRTL, last && styles.rowLast]}
      activeOpacity={0.6}
      onPress={onPress}>
      <View style={[styles.rowMain, isRTL && styles.rowMainRTL]}>
        <View style={[styles.iconChip, {backgroundColor: `${iconColor}18`}]}>
          <Icon size={17} color={iconColor} />
        </View>
        <CustomText style={[styles.rowLabel, labelColor ? {color: labelColor} : null]} paddingTop={0}>
          {label}
        </CustomText>
      </View>
      {trailing !== undefined ? trailing : <Chevron size={18} color={COLORS.textMuted} />}
    </TouchableOpacity>
  );
};

const SettingsScreen = () => {
  const {t} = useTranslation();
  const navigation = useNavigation();
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

  const checkFor = language =>
    currentLanguage === language ? (
      <CustomText style={styles.checkMark} paddingTop={0}>
        ✓
      </CustomText>
    ) : (
      <View />
    );

  return (
    <SafeAreaView style={styles.flex} edges={['top', 'left', 'right']}>
      <ScrollView style={styles.flex} contentContainerStyle={styles.container}>
        <CustomText bold style={styles.screenTitle} lineHeight={28}>
          {t('settings')}
        </CustomText>

        <View style={styles.section}>
          <CustomText bold style={styles.sectionTitle}>
            {t('languageSectionTitle')}
          </CustomText>
          <View style={styles.card}>
            <SettingsRow
              icon={Languages}
              iconColor={COLORS.primary}
              label={t('arabic')}
              onPress={() => changeLanguage('ar')}
              trailing={checkFor('ar')}
              isRTL={isRTL}
            />
            <SettingsRow
              icon={Languages}
              iconColor={COLORS.primary}
              label={t('kurdish')}
              onPress={() => changeLanguage('ckb')}
              trailing={checkFor('ckb')}
              isRTL={isRTL}
            />
            <SettingsRow
              icon={Languages}
              iconColor={COLORS.primary}
              label={t('english')}
              onPress={() => changeLanguage('en')}
              trailing={checkFor('en')}
              isRTL={isRTL}
              last
            />
          </View>
        </View>

        <View style={styles.section}>
          <CustomText bold style={styles.sectionTitle}>
            {t('aboutSectionTitle')}
          </CustomText>
          <View style={styles.card}>
            <SettingsRow
              icon={Code}
              iconColor={COLORS.primary}
              label={t('aboutTheDeveloper')}
              onPress={() => navigation.navigate('AboutDeveloper')}
              isRTL={isRTL}
              last
            />
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.card}>
            <SettingsRow
              icon={LogOut}
              iconColor={COLORS.danger}
              label={t('logout')}
              labelColor={COLORS.danger}
              onPress={handleLogout}
              trailing={<View />}
              isRTL={isRTL}
              last
            />
          </View>
        </View>

        <CustomText center style={styles.versionText}>
          {t('appVersionLabel')} {APP_VERSION}
        </CustomText>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  flex: {flex: 1, backgroundColor: COLORS.bg},
  container: {padding: 16, paddingBottom: 40},
  screenTitle: {fontSize: 20, color: COLORS.text, marginBottom: 14},
  section: {marginBottom: 18},
  sectionTitle: {fontSize: 12, color: COLORS.textMuted, marginBottom: 8, paddingHorizontal: 4},
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    ...CARD_SHADOW,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  rowRTL: {flexDirection: 'row-reverse'},
  rowLast: {borderBottomWidth: 0},
  rowMain: {flexDirection: 'row', alignItems: 'center', gap: 12},
  rowMainRTL: {flexDirection: 'row-reverse'},
  iconChip: {
    width: 32,
    height: 32,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: {fontSize: 14, color: COLORS.text},
  checkMark: {color: COLORS.primary, fontWeight: '700', fontSize: 16},
  versionText: {fontSize: 12, color: COLORS.textMuted, marginTop: 4},
});

export default SettingsScreen;
