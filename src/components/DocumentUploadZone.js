import React from 'react';
import {TouchableOpacity, ActivityIndicator, StyleSheet} from 'react-native';
import {useTranslation} from 'react-i18next';
import CustomText from './CustomText';
import {COLORS} from '../constants/theme';

// Dashed-border upload prompt, styled after the mock upload zone in
// HomeScreenOld.js (uploadZone/uploadIcon/uploadLabel/uploadHint) — that one
// had no onPress at all; this is the real, wired-up version.
const DocumentUploadZone = ({label, optional, uploading, onPress}) => {
  const {t} = useTranslation();

  return (
    <TouchableOpacity
      style={styles.zone}
      activeOpacity={0.75}
      onPress={onPress}
      disabled={uploading}>
      {uploading ? (
        <ActivityIndicator color={COLORS.primary} />
      ) : (
        <>
          <CustomText center style={styles.icon} paddingTop={0} lineHeight={34}>
            ⊕
          </CustomText>
          <CustomText center bold style={styles.label}>
            {label}
            {optional ? ` (${t('optional')})` : ''}
          </CustomText>
          <CustomText center style={styles.hint}>
            {t('uploadHint')}
          </CustomText>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  zone: {
    marginBottom: 8,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: COLORS.primaryLight,
    borderStyle: 'dashed',
    paddingVertical: 24,
    alignItems: 'center',
    backgroundColor: '#faf5ff',
  },
  icon: {
    fontSize: 28,
    color: COLORS.primary,
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    color: COLORS.primary,
  },
  hint: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 4,
  },
});

export default DocumentUploadZone;
