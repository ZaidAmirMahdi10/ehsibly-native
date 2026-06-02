import React, {useState, useContext} from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  StatusBar,
  Switch,
  Text,
  Alert,
} from 'react-native';
import {useTranslation} from 'react-i18next';
import {SafeAreaView} from 'react-native-safe-area-context';

import {LanguageContext} from '../../App';
import CustomText from '../components/CustomText';
import CustomView from '../components/CustomView';

// ─── Brand Colors ─────────────────────────────────────────────────────────────
const COLORS = {
  primary: '#C1121F',
  primaryLight: '#FF4757',
  bg: '#F8F6F3',
  card: '#FFFFFF',
  text: '#1A1A1A',
  textSub: '#6B6B6B',
  textMuted: '#A8A8A8',
  border: '#EFEFEF',
  tag: '#FFF0F0',
  tagText: '#C1121F',
  inputBg: '#FAFAFA',
  dangerBg: '#FFF5F5',
  dangerBorder: '#FECACA',
  error: '#C1121F',
};

const CURRENCIES = ['currencyUsd', 'currencyEur', 'currencySar', 'currencyAed'];
const CURRENCY_CODES = ['USD', 'EUR', 'SAR', 'AED'];

// ─── Section Header ───────────────────────────────────────────────────────────
const SectionHeader = ({number, title, subtitle}) => (
  <CustomView style={styles.sectionHeader}>
    <View style={styles.sectionNumber}>
      <CustomText center style={styles.sectionNumberText} paddingTop={0}>
        {number}
      </CustomText>
    </View>
    <View style={{flex: 1}}>
      <CustomText style={styles.sectionTitle} paddingTop={0}>
        {title}
      </CustomText>
      {subtitle && (
        <CustomText style={styles.sectionSubtitle} paddingTop={0}>
          {subtitle}
        </CustomText>
      )}
    </View>
  </CustomView>
);

// ─── Toggle Row ───────────────────────────────────────────────────────────────
const ToggleRow = ({label, sublabel, value, onValueChange, last = false}) => (
  <CustomView style={[styles.toggleRow, last && styles.toggleRowLast]}>
    <View style={styles.toggleInfo}>
      <CustomText style={styles.toggleLabel} paddingTop={0}>
        {label}
      </CustomText>
      {sublabel && (
        <CustomText style={styles.toggleSub} paddingTop={0}>
          {sublabel}
        </CustomText>
      )}
    </View>
    <Switch
      value={value}
      onValueChange={onValueChange}
      trackColor={{false: COLORS.border, true: COLORS.primaryLight}}
      thumbColor={value ? COLORS.primary : '#fff'}
      ios_backgroundColor={COLORS.border}
    />
  </CustomView>
);

// ─── Language Option ──────────────────────────────────────────────────────────
const LanguageOption = ({label, code, selected, onPress}) => (
  <TouchableOpacity
    onPress={onPress}
    style={[styles.langOption, selected && styles.langOptionActive]}
    activeOpacity={0.75}>
    <View style={[styles.langRadio, selected && styles.langRadioActive]}>
      {selected && <View style={styles.langRadioDot} />}
    </View>
    <CustomText
      style={[styles.langLabel, selected && styles.langLabelActive]}
      paddingTop={0}>
      {label}
    </CustomText>
    <CustomText style={styles.langCode} paddingTop={0}>
      {code}
    </CustomText>
  </TouchableOpacity>
);

// ─── Currency Option ──────────────────────────────────────────────────────────
const CurrencyOption = ({label, code, selected, onPress}) => (
  <TouchableOpacity
    onPress={onPress}
    style={[styles.currencyChip, selected && styles.currencyChipActive]}
    activeOpacity={0.75}>
    <CustomText
      style={[styles.currencyCode, selected && styles.currencyCodeActive]}
      paddingTop={0}>
      {code}
    </CustomText>
    <CustomText
      style={[styles.currencyLabel, selected && styles.currencyLabelActive]}
      numberOfLines={1}
      paddingTop={0}>
      {label.split('—')[1]?.trim() ?? label}
    </CustomText>
  </TouchableOpacity>
);

// ─── Account Action Row ───────────────────────────────────────────────────────
const AccountRow = ({icon, label, sublabel, btnLabel, onPress, danger = false, last = false}) => (
  <CustomView style={[styles.accountRow, last && styles.accountRowLast]}>
    <View style={styles.accountInfo}>
      <CustomText
        style={[styles.accountLabel, danger && styles.accountLabelDanger]}
        paddingTop={0}>
        {icon}  {label}
      </CustomText>
      {sublabel && (
        <CustomText style={styles.accountSub} paddingTop={0}>
          {sublabel}
        </CustomText>
      )}
    </View>
    <TouchableOpacity
      onPress={onPress}
      style={[styles.accountBtn, danger && styles.accountBtnDanger]}
      activeOpacity={0.75}>
      <CustomText
        center
        style={[styles.accountBtnText, danger && styles.accountBtnTextDanger]}
        paddingTop={0}>
        {btnLabel}
      </CustomText>
    </TouchableOpacity>
  </CustomView>
);

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function UserSettingsScreen({navigation}) {
  const {t} = useTranslation();
  const {currentDirection, changeLanguage} = useContext(LanguageContext);
  const isRTL = currentDirection === 'rtl';

  // Appearance
  const [selectedLang, setSelectedLang] = useState(isRTL ? 'ar' : 'en');
  const [selectedCurrency, setSelectedCurrency] = useState('USD');

  // Notifications
  const [notifyPriceChange, setNotifyPriceChange] = useState(true);
  const [notifyNewProducts, setNotifyNewProducts] = useState(true);
  const [notifyAppUpdates, setNotifyAppUpdates] = useState(false);

  const handleLanguageChange = lang => {
    setSelectedLang(lang);
    changeLanguage?.(lang);
  };

  const handleConfirmAction = (titleKey, msgKey, onConfirm) => {
    Alert.alert(t(titleKey), t(msgKey), [
      {text: t('dangerAlertCancel'), style: 'cancel'},
      {text: t('dangerAlertConfirm'), style: 'destructive', onPress: onConfirm},
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} />

      {/* ── Top Bar ── */}
      <CustomView style={styles.topBar}>
        <TouchableOpacity
          onPress={() => navigation?.goBack()}
          style={styles.backBtn}
          activeOpacity={0.7}>
          <Text center style={styles.backBtnText} paddingTop={0}>
            {isRTL ? '→' : '←'}
          </Text>
        </TouchableOpacity>

        <View style={styles.topBarCenter}>
          <CustomText center style={styles.topBarEyebrow} paddingTop={0}>
            {t('settingsEyebrow')}
          </CustomText>
          <CustomText center style={styles.topBarTitle} paddingTop={0}>
            {t('settingsTitle')}
          </CustomText>
        </View>

        {/* Placeholder to keep title centered */}
        <View style={styles.topBarRight} />
      </CustomView>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">

        {/* ══ Section 1: Appearance ══ */}
        <View style={styles.section}>
          <SectionHeader
            number="1"
            title={t('sectionAppearance')}
            subtitle={t('sectionAppearanceSubtitle')}
          />

          <CustomText style={styles.subSectionLabel} paddingTop={0}>
            {t('language')}
          </CustomText>

          <CustomView style={styles.langRow}>
            <LanguageOption
              label={t('languageEn')}
              code="EN"
              selected={selectedLang === 'en'}
              onPress={() => handleLanguageChange('en')}
            />
            <LanguageOption
              label={t('languageAr')}
              code="AR"
              selected={selectedLang === 'ar'}
              onPress={() => handleLanguageChange('ar')}
            />
          </CustomView>

          <View style={styles.sectionDivider} />

          <CustomText style={styles.subSectionLabel} paddingTop={0}>
            {t('currency')}
          </CustomText>

          <CustomView style={styles.currencyGrid}>
            {CURRENCIES.map((key, i) => (
              <CurrencyOption
                key={key}
                label={t(key)}
                code={CURRENCY_CODES[i]}
                selected={selectedCurrency === CURRENCY_CODES[i]}
                onPress={() => setSelectedCurrency(CURRENCY_CODES[i])}
              />
            ))}
          </CustomView>
        </View>

        {/* ══ Section 2: Notifications ══ */}
        <View style={styles.section}>
          <SectionHeader
            number="2"
            title={t('sectionNotifications')}
            subtitle={t('sectionNotificationsSubtitle')}
          />

          <ToggleRow
            label={t('notifyPriceChange')}
            sublabel={t('notifyPriceChangeSub')}
            value={notifyPriceChange}
            onValueChange={setNotifyPriceChange}
          />
          <ToggleRow
            label={t('notifyNewProducts')}
            sublabel={t('notifyNewProductsSub')}
            value={notifyNewProducts}
            onValueChange={setNotifyNewProducts}
          />
          <ToggleRow
            label={t('notifyAppUpdates')}
            sublabel={t('notifyAppUpdatesSub')}
            value={notifyAppUpdates}
            onValueChange={setNotifyAppUpdates}
            last
          />
        </View>

        {/* ══ Section 3: Account ══ */}
        <View style={[styles.section, styles.sectionDanger]}>
          <SectionHeader
            number="3"
            title={t('sectionAccount')}
            subtitle={t('sectionAccountSubtitle')}
          />

          <AccountRow
            icon="🔓"
            label={t('signOut')}
            sublabel={t('signOutSub')}
            btnLabel={t('signOutBtn')}
            onPress={() =>
              handleConfirmAction('dangerAlertTitle', 'dangerAlertMessage', () => {})
            }
          />
          <AccountRow
            icon="🗑"
            label={t('deleteAccount')}
            sublabel={t('deleteAccountSub')}
            btnLabel={t('deleteAccountBtn')}
            danger
            onPress={() =>
              handleConfirmAction('dangerAlertTitle', 'dangerAlertMessage', () => {})
            }
            last
          />
        </View>

        {/* ── Footer ── */}
        <View style={styles.footer}>
          <View style={styles.footerDot} />
          <CustomText center style={styles.footerText} paddingTop={0}>
            {t('footerBrand')}
          </CustomText>
          <View style={styles.footerDot} />
        </View>

        <View style={{height: 40}} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },

  // Top bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 12 : 4,
    paddingBottom: 14,
    backgroundColor: COLORS.bg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.card,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  backBtnText: {
    fontSize: 20,
    color: COLORS.text,
    fontWeight: '600',
  },
  topBarCenter: {
    alignItems: 'center',
  },
  topBarEyebrow: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 3,
    color: COLORS.primary,
    marginBottom: 2,
  },
  topBarTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.3,
  },
  topBarRight: {
    width: 40,
  },

  // Scroll
  scroll: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },

  // Section
  section: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionDanger: {
    backgroundColor: COLORS.dangerBg,
    borderColor: COLORS.dangerBorder,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 12,
  },
  sectionNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionNumberText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 14,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    letterSpacing: -0.2,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 1,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 16,
  },

  // Sub-section label
  subSectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    color: COLORS.textMuted,
    marginBottom: 10,
  },

  // Language
  langRow: {
    flexDirection: 'row',
    gap: 10,
  },
  langOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.inputBg,
    gap: 10,
  },
  langOptionActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.tag,
  },
  langRadio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: COLORS.textMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  langRadioActive: {
    borderColor: COLORS.primary,
  },
  langRadioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
  },
  langLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSub,
  },
  langLabelActive: {
    color: COLORS.primary,
  },
  langCode: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMuted,
    letterSpacing: 1,
  },

  // Currency
  currencyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  currencyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.inputBg,
    gap: 6,
    minWidth: '45%',
    flex: 1,
  },
  currencyChipActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.tag,
  },
  currencyCode: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textMuted,
    letterSpacing: 0.5,
  },
  currencyCodeActive: {
    color: COLORS.primary,
  },
  currencyLabel: {
    flex: 1,
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textMuted,
  },
  currencyLabelActive: {
    color: COLORS.tagText,
  },

  // Toggles
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  toggleRowLast: {
    borderBottomWidth: 0,
    paddingBottom: 0,
  },
  toggleInfo: {
    flex: 1,
    marginRight: 16,
  },
  toggleLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 2,
  },
  toggleSub: {
    fontSize: 12,
    color: COLORS.textMuted,
    lineHeight: 17,
  },

  // Account rows
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.dangerBorder,
    gap: 12,
  },
  accountRowLast: {
    borderBottomWidth: 0,
    paddingBottom: 0,
  },
  accountInfo: {
    flex: 1,
  },
  accountLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 2,
  },
  accountLabelDanger: {
    color: COLORS.error,
  },
  accountSub: {
    fontSize: 12,
    color: COLORS.textMuted,
    lineHeight: 17,
  },
  accountBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
  },
  accountBtnDanger: {
    borderColor: COLORS.error,
  },
  accountBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSub,
  },
  accountBtnTextDanger: {
    color: COLORS.error,
  },

  // Footer
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 4,
    marginBottom: 8,
  },
  footerDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
  },
  footerText: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
});