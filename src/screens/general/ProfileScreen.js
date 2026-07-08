import React, {useContext} from 'react';
import {View, ScrollView, StyleSheet} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useTranslation} from 'react-i18next';
import {useNavigation} from '@react-navigation/native';

import {LanguageContext} from '../../../App';
import StripedCard from '../../components/StripedCard';
import CustomText from '../../components/CustomText';
import PrimaryButton from '../../components/PrimaryButton';
import {useAuth} from '../../context/AuthContext';

// Profile fields are read-only — no confirmed update endpoint exists on the
// backend for them, so this renders the session's organization data as-is
// rather than inventing an edit/PATCH flow against an unverified contract.
// Change Password is the one write action with a confirmed contract, so it
// gets a real flow (see ChangePasswordScreen).
const ProfileScreen = () => {
  const {t} = useTranslation();
  const navigation = useNavigation();
  const {session} = useAuth();
  const {currentDirection} = useContext(LanguageContext);
  const isRTL = currentDirection === 'rtl';
  const org = session?.organization || {};

  const initials = (org.username || org.name || '?').slice(0, 2).toUpperCase();

  return (
    <SafeAreaView style={styles.flex} edges={['top', 'left', 'right']}>
      <ScrollView style={styles.flex} contentContainerStyle={styles.container}>
        <View style={styles.headerCard}>
          <View style={styles.avatarCircle}>
            <CustomText center bold style={styles.avatarText} paddingTop={0} lineHeight={28}>
              {initials}
            </CustomText>
          </View>
          <CustomText center bold style={styles.orgName}>
            {org.name}
          </CustomText>
          {org.username ? (
            <CustomText center style={styles.username}>
              {org.username}
            </CustomText>
          ) : null}
        </View>

        <StripedCard
          style={styles.section}
          title={t('profileDetailsTitle')}
          isRTL={isRTL}
          items={[
            {label: t('emailLabel'), value: org.email},
            {label: t('phoneLabel'), value: org.phoneNumber},
            {label: t('addressLabel'), value: org.address},
            {label: t('organizationTypeLabel'), value: org.organizationType && t(org.organizationType)},
            {label: t('roleLabel'), value: org.role && t(org.role)},
            {label: t('specialtyLabel'), value: org.specialty},
            {label: t('subscriptionTypeLabel'), value: org.subscriptionType && t(org.subscriptionType)},
            {label: t('organizationNameLabel'), value: org.name},
          ]}
        />

        <PrimaryButton
          title={t('changePasswordAction')}
          variant="secondary"
          onPress={() => navigation.navigate('ChangePassword')}
        />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  flex: {flex: 1, backgroundColor: '#F7F7FA'},
  container: {padding: 16, paddingBottom: 40},
  headerCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#79329a',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: {color: '#fff', fontSize: 22},
  orgName: {fontSize: 17, color: '#2A2E3A'},
  username: {fontSize: 13, color: '#8A8FA3', marginTop: 2},
  section: {marginBottom: 16},
});

export default ProfileScreen;
