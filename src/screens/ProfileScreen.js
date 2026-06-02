import React, {useState, useContext, useRef} from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Alert,
  Text,
  ActivityIndicator,
  Animated,
} from 'react-native';
import {useTranslation} from 'react-i18next';
import {SafeAreaView} from 'react-native-safe-area-context';

import {LanguageContext} from '../../App';
import CustomText from '../components/CustomText';
import CustomView from '../components/CustomView';
import CustomInput from '../components/CustomInput';
import FontedText from '../components/FontedText';

// ─── Brand Colors ─────────────────────────────────────────────────────────────
const COLORS = {
  primary: '#C1121F',
  primaryDark: '#8B0000',
  primaryLight: '#FF4757',
  bg: '#F8F6F3',
  card: '#FFFFFF',
  text: '#1A1A1A',
  textSub: '#6B6B6B',
  textMuted: '#A8A8A8',
  border: '#EFEFEF',
  borderFocus: '#C1121F',
  tag: '#FFF0F0',
  tagText: '#C1121F',
  inputBg: '#FAFAFA',
  heroBg: '#1A1A1A',
};

// ─── Mock activity log ────────────────────────────────────────────────────────
const ACTIVITY_LOG = [
  {id: '1', actionKey: 'activityAddedProduct',   target: 'Leather Wallet',     timeValue: 2, timeUnit: 'activityMinsAgo'},
  {id: '2', actionKey: 'activityUpdatedPrice',   target: 'Ceramic Pour-Over',  timeValue: 1, timeUnit: 'activityHoursAgo'},
  {id: '3', actionKey: 'activityDeletedProduct', target: 'Brass Lamp v1',      timeValue: 3, timeUnit: 'activityHoursAgo'},
  {id: '4', actionKey: 'activityLoggedIn',       target: '',                   timeValue: 1, timeUnit: 'activityDaysAgo'},
  {id: '5', actionKey: 'activityAddedProduct',   target: 'Merino Wool Throw',  timeValue: 2, timeUnit: 'activityDaysAgo'},
];

const ACTIVITY_ICONS = {
  activityAddedProduct:   '＋',
  activityUpdatedPrice:   '↻',
  activityDeletedProduct: '✕',
  activityLoggedIn:       '→',
};

const ACTIVITY_COLORS = {
  activityAddedProduct:   {bg: '#F0FDF4', text: '#16A34A'},
  activityUpdatedPrice:   {bg: '#FFF7ED', text: '#D97706'},
  activityDeletedProduct: {bg: '#FFF0F0', text: '#C1121F'},
  activityLoggedIn:       {bg: '#EFF6FF', text: '#2563EB'},
};

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

// ─── Avatar ───────────────────────────────────────────────────────────────────
const Avatar = ({name, size = 80}) => {
  const initials = name
    ? name.trim().split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('')
    : '?';

  const fontSize = size * 0.35;

  return (
    <View style={[styles.avatarOuter, {width: size + 6, height: size + 6, borderRadius: (size + 6) / 2}]}>
      <View style={[styles.avatarInner, {width: size, height: size, borderRadius: size / 2}]}>
        <CustomText
          center
          paddingTop={0}
          style={[styles.avatarInitials, {fontSize, lineHeight: fontSize * 1.2}]}>
          {initials}
        </CustomText>
      </View>
    </View>
  );
};

// ─── Stat Pill ────────────────────────────────────────────────────────────────
const StatPill = ({value, label}) => (
  <View style={styles.statPill}>
    <CustomText center style={styles.statValue} paddingTop={0}>{value}</CustomText>
    <CustomText center style={styles.statLabel} paddingTop={0}>{label}</CustomText>
  </View>
);

// ─── Info Row (view mode) ─────────────────────────────────────────────────────
const InfoRow = ({label, value, last = false}) => (
  <CustomView style={[styles.infoRow, last && styles.infoRowLast]}>
    <CustomText style={styles.infoLabel} paddingTop={0}>{label}</CustomText>
    <CustomText style={styles.infoValue} paddingTop={0} numberOfLines={3}>
      {value || '—'}
    </CustomText>
  </CustomView>
);

// ─── Form Field (edit mode) ───────────────────────────────────────────────────
const FormField = ({
  label, value, onChangeText, placeholder,
  keyboardType = 'default', secureTextEntry = false,
  multiline = false, numberOfLines = 1,
  required = false, hint, error,
}) => {
  const [focused, setFocused] = useState(false);
  const borderAnim = useRef(new Animated.Value(0)).current;

  const handleFocus = () => {
    setFocused(true);
    Animated.spring(borderAnim, {toValue: 1, useNativeDriver: false, speed: 40}).start();
  };
  const handleBlur = () => {
    setFocused(false);
    Animated.spring(borderAnim, {toValue: 0, useNativeDriver: false, speed: 40}).start();
  };

  const borderColor = borderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [error ? COLORS.primary : COLORS.border, error ? COLORS.primary : COLORS.borderFocus],
  });

  return (
    <CustomView style={styles.fieldWrapper}>
      <CustomView style={styles.fieldLabelRow}>
        <CustomText style={styles.fieldLabel} paddingTop={0}>
          {label}
          {required && <CustomText style={styles.required} paddingTop={0}>{' '}*</CustomText>}
        </CustomText>
        {hint && <CustomText style={styles.fieldHint} paddingTop={0}>{hint}</CustomText>}
      </CustomView>

      <Animated.View style={[styles.inputWrapper, {borderColor}, multiline && styles.inputWrapperMulti]}>
        <CustomInput
          style={[styles.input, multiline && styles.inputMulti]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={COLORS.textMuted}
          keyboardType={keyboardType}
          secureTextEntry={secureTextEntry}
          multiline={multiline}
          numberOfLines={numberOfLines}
          onFocus={handleFocus}
          onBlur={handleBlur}
          textAlignVertical={multiline ? 'top' : 'center'}
        />
      </Animated.View>

      {error && (
        <CustomView style={styles.errorRow}>
          <CustomText style={styles.errorText} paddingTop={0}>⚠ {error}</CustomText>
        </CustomView>
      )}
    </CustomView>
  );
};

// ─── Activity Row ─────────────────────────────────────────────────────────────
const ActivityRow = ({item, last}) => {
  const {t} = useTranslation();
  const colors = ACTIVITY_COLORS[item.actionKey] ?? ACTIVITY_COLORS.activityLoggedIn;

  return (
    <CustomView style={[styles.activityRow, last && styles.activityRowLast]}>
      <View style={[styles.activityIconWrap, {backgroundColor: colors.bg}]}>
        <CustomText center style={[styles.activityIcon, {color: colors.text}]} paddingTop={0}>
          {ACTIVITY_ICONS[item.actionKey] ?? '·'}
        </CustomText>
      </View>
      <View style={styles.activityBody}>
        <CustomText style={styles.activityAction} paddingTop={0}>
          {t(item.actionKey)}{item.target ? ` "${item.target}"` : ''}
        </CustomText>
        <CustomText style={styles.activityTime} paddingTop={0}>
          {item.timeValue} {t(item.timeUnit)}
        </CustomText>
      </View>
      <View style={[styles.activityDot, {backgroundColor: colors.text}]} />
    </CustomView>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function ProfileScreen({navigation}) {
  const {t} = useTranslation();
  const {currentDirection} = useContext(LanguageContext);
  const isRTL = currentDirection === 'rtl';

  const [savedData, setSavedData] = useState({
    fullName: 'Admin User',
    email: 'admin@store.com',
    phone: '+1 555 000 0000',
    bio: '',
  });

  const [editing, setEditing] = useState(false);
  const [draftData, setDraftData] = useState({...savedData});
  const [profileErrors, setProfileErrors] = useState({});
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState({});

  const handleEditToggle = () => {
    if (editing) {
      setDraftData({...savedData});
      setProfileErrors({});
    } else {
      setDraftData({...savedData});
    }
    setEditing(e => !e);
  };

  const updateDraft = (field, value) => {
    setDraftData(prev => ({...prev, [field]: value}));
    if (profileErrors[field]) setProfileErrors(prev => ({...prev, [field]: null}));
  };

  const validateProfile = () => {
    const errs = {};
    if (!draftData.fullName.trim()) errs.fullName = t('nameRequired');
    if (!draftData.email.trim()) errs.email = t('emailRequired');
    else if (!/\S+@\S+\.\S+/.test(draftData.email)) errs.email = t('emailInvalid');
    return errs;
  };

  const handleSaveProfile = () => {
    const errs = validateProfile();
    if (Object.keys(errs).length > 0) { setProfileErrors(errs); return; }
    setSavingProfile(true);
    setTimeout(() => {
      setSavedData({...draftData});
      setSavingProfile(false);
      setEditing(false);
      setProfileErrors({});
      Alert.alert(t('saveSuccess'), t('saveSuccessMessage'));
    }, 1400);
  };

  const validatePassword = () => {
    const errs = {};
    if (!currentPassword.trim()) errs.currentPassword = t('currentPasswordRequired');
    if (!newPassword.trim() || newPassword.length < 8) errs.newPassword = t('passwordTooShort');
    if (newPassword !== confirmPassword) errs.confirmPassword = t('passwordMismatch');
    return errs;
  };

  const handleUpdatePassword = () => {
    const errs = validatePassword();
    if (Object.keys(errs).length > 0) { setPasswordErrors(errs); return; }
    setSavingPassword(true);
    setTimeout(() => {
      setSavingPassword(false);
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
      setPasswordErrors({});
      Alert.alert(t('passwordSuccess'), t('passwordSuccessMessage'));
    }, 1400);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* ── Top Bar ── */}
      <CustomView style={styles.topBar}>
        <TouchableOpacity
          onPress={() => navigation?.goBack()}
          style={styles.backBtn}
          activeOpacity={0.7}>
          <Text style={styles.backBtnText}>
            {isRTL ? '→' : '←'}
          </Text>
        </TouchableOpacity>

        <View style={styles.topBarCenter}>
          <CustomText center style={styles.topBarEyebrow} paddingTop={0}>
            {t('profileEyebrow')}
          </CustomText>
          <CustomText center style={styles.topBarTitle} paddingTop={0}>
            {editing ? t('editProfile') : t('profileTitle')}
          </CustomText>
        </View>

        <TouchableOpacity
          onPress={handleEditToggle}
          style={[styles.editBtn, editing && styles.editBtnCancel]}
          activeOpacity={0.7}>
          <CustomText
            center
            style={[styles.editBtnText, editing && styles.editBtnCancelText]}
            paddingTop={0}>
            {editing ? t('cancelEdit') : t('editProfile')}
          </CustomText>
        </TouchableOpacity>
      </CustomView>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">

        {/* ── Hero Card ── */}
        <View style={styles.heroCard}>
          <View style={styles.heroAccent} />
          <View style={styles.heroBody}>
            <Avatar name={savedData.fullName} size={80} />
            <View style={styles.heroInfo}>
              <CustomText style={styles.heroName} paddingTop={0}>
                {savedData.fullName || 'Admin'}
              </CustomText>

              {/* ── isRTL applied inline, not in StyleSheet ── */}
              <View style={{flexDirection: 'row', justifyContent: isRTL ? 'flex-end' : 'flex-start'}}>
                <View style={styles.heroBadge}>
                  <Text style={styles.heroBadgeText}>
                    ⚙  {t('heroRole')}
                  </Text>
                </View>
              </View>

              <CustomText style={styles.heroEmail} paddingTop={0}>
                {savedData.email}
              </CustomText>
            </View>
          </View>

          <View style={styles.statsStrip}>
            <StatPill value="24"             label={t('heroProductsManaged')} />
            <View style={styles.statsDivider} />
            <StatPill value="2024"           label={t('heroMemberSince')} />
            <View style={styles.statsDivider} />
            <StatPill value={t('heroToday')} label={t('heroLastActive')} />
          </View>
        </View>

        {/* ══ Section 1: Personal Info ══ */}
        <View style={styles.section}>
          <SectionHeader
            number="1"
            title={t('sectionPersonal')}
            subtitle={t('sectionPersonalSubtitle')}
          />

          {editing ? (
            <>
              <FormField
                label={t('fullName')}
                value={draftData.fullName}
                onChangeText={v => updateDraft('fullName', v)}
                placeholder={t('fullNamePlaceholder')}
                required
                error={profileErrors.fullName}
              />
              <FormField
                label={t('email')}
                value={draftData.email}
                onChangeText={v => updateDraft('email', v)}
                placeholder={t('emailPlaceholder')}
                keyboardType="email-address"
                required
                error={profileErrors.email}
              />
              <FormField
                label={t('phone')}
                value={draftData.phone}
                onChangeText={v => updateDraft('phone', v)}
                placeholder={t('phonePlaceholder')}
                keyboardType="phone-pad"
                hint={t('optional')}
              />
              <FormField
                label={t('bio')}
                value={draftData.bio}
                onChangeText={v => updateDraft('bio', v)}
                placeholder={t('bioPlaceholder')}
                multiline
                numberOfLines={3}
                hint={`${draftData.bio.length} ${t('chars')}`}
              />

              <TouchableOpacity
                style={[styles.primaryBtn, savingProfile && styles.primaryBtnLoading]}
                onPress={handleSaveProfile}
                activeOpacity={0.85}
                disabled={savingProfile}>
                {savingProfile ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <CustomText center style={styles.primaryBtnText} paddingTop={0}>
                    {t('saveChanges')}
                  </CustomText>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <InfoRow label={t('fullName')} value={savedData.fullName} />
              <InfoRow label={t('email')}    value={savedData.email} />
              <InfoRow label={t('phone')}    value={savedData.phone} />
              <InfoRow label={t('bio')}      value={savedData.bio} last />
            </>
          )}
        </View>

        {/* ══ Section 2: Security ══ */}
        <View style={styles.section}>
          <SectionHeader
            number="2"
            title={t('sectionSecurity')}
            subtitle={t('sectionSecuritySubtitle')}
          />

          {editing ? (
            <>
              <FormField
                label={t('currentPassword')}
                value={currentPassword}
                onChangeText={v => { setCurrentPassword(v); if (passwordErrors.currentPassword) setPasswordErrors(p => ({...p, currentPassword: null})); }}
                placeholder={t('currentPasswordPlaceholder')}
                secureTextEntry
                required
                error={passwordErrors.currentPassword}
              />
              <FormField
                label={t('newPassword')}
                value={newPassword}
                onChangeText={v => { setNewPassword(v); if (passwordErrors.newPassword) setPasswordErrors(p => ({...p, newPassword: null})); }}
                placeholder={t('newPasswordPlaceholder')}
                secureTextEntry
                required
                error={passwordErrors.newPassword}
              />
              <FormField
                label={t('confirmPassword')}
                value={confirmPassword}
                onChangeText={v => { setConfirmPassword(v); if (passwordErrors.confirmPassword) setPasswordErrors(p => ({...p, confirmPassword: null})); }}
                placeholder={t('confirmPasswordPlaceholder')}
                secureTextEntry
                required
                error={passwordErrors.confirmPassword}
              />

              <TouchableOpacity
                style={[styles.outlineBtn, savingPassword && styles.primaryBtnLoading]}
                onPress={handleUpdatePassword}
                activeOpacity={0.85}
                disabled={savingPassword}>
                {savingPassword ? (
                  <ActivityIndicator color={COLORS.primary} size="small" />
                ) : (
                  <CustomText center style={styles.outlineBtnText} paddingTop={0}>
                    {t('updatePassword')}
                  </CustomText>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <InfoRow label={t('password')} value="••••••••" last />
          )}
        </View>

        {/* ══ Section 3: Activity ══ */}
        <View style={styles.section}>
          <SectionHeader
            number="3"
            title={t('sectionActivity')}
            subtitle={t('sectionActivitySubtitle')}
          />
          {ACTIVITY_LOG.map((item, index) => (
            <ActivityRow
              key={item.id}
              item={item}
              last={index === ACTIVITY_LOG.length - 1}
            />
          ))}
        </View>

        <View style={{height: 40}} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
// NOTE: isRTL must NEVER be used here — StyleSheet.create() runs once at
// module load time, before any component mounts, so isRTL would always be
// undefined. All RTL-dependent styles must be applied inline inside the JSX.
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },

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
    textAlign: 'center',
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
  editBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.tag,
  },
  editBtnCancel: {
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
  },
  editBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  editBtnCancelText: {
    color: COLORS.textSub,
  },

  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },

  heroCard: {
    backgroundColor: COLORS.heroBg,
    borderRadius: 24,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 6,
  },
  heroAccent: {
    height: 4,
    backgroundColor: COLORS.primary,
    width: '40%',
  },
  heroBody: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 16,
    gap: 16,
  },
  avatarOuter: {
    borderWidth: 2,
    borderColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInner: {
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarInitials: {
    color: '#fff',
    fontWeight: '800',
    fontFamily: 'Tajawal-Bold',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  heroInfo: {
    flex: 1,
    gap: 6,
  },
  heroName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.4,
    fontFamily: 'Tajawal-Bold',
  },
  heroBadge: {
    backgroundColor: COLORS.tag,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  heroBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.tagText,
    letterSpacing: 0.3,
  },
  heroEmail: {
    fontSize: 12,
    color: '#9CA3AF',
    fontFamily: 'Tajawal-Regular',
  },
  statsStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  statPill: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: '#6B7280',
    letterSpacing: 0.5,
  },
  statsDivider: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },

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

  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 16,
  },
  infoRowLast: {
    borderBottomWidth: 0,
    paddingBottom: 0,
  },
  infoLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textMuted,
    minWidth: 90,
  },
  infoValue: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'right',
    fontFamily: 'Tajawal-Regular',
  },

  fieldWrapper: {
    marginBottom: 18,
  },
  fieldLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSub,
  },
  fieldHint: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  required: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.inputBg,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    minHeight: 50,
  },
  inputWrapperMulti: {
    alignItems: 'flex-start',
    paddingTop: 12,
    paddingBottom: 12,
    minHeight: 90,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: COLORS.text,
    padding: 0,
    minHeight: 24,
    fontFamily: 'Tajawal-Regular',
  },
  inputMulti: {
    minHeight: 66,
  },
  errorRow: {
    marginTop: 5,
  },
  errorText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '500',
  },

  primaryBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
    shadowColor: COLORS.primary,
    shadowOffset: {width: 0, height: 3},
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryBtnLoading: {
    opacity: 0.8,
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  outlineBtn: {
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 4,
    backgroundColor: COLORS.tag,
  },
  outlineBtnText: {
    color: COLORS.primary,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.2,
  },

  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 12,
  },
  activityRowLast: {
    borderBottomWidth: 0,
    paddingBottom: 0,
  },
  activityIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activityIcon: {
    fontSize: 14,
    fontWeight: '700',
  },
  activityBody: {
    flex: 1,
    gap: 2,
  },
  activityAction: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
    lineHeight: 18,
  },
  activityTime: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  activityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});