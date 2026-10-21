import React, {useContext} from 'react';
import {View, TouchableOpacity, StyleSheet} from 'react-native';
import {useTranslation} from 'react-i18next';
import {LanguageContext} from '../../App';
import CustomText from './CustomText';
import {COLORS} from '../constants/theme';

// One staged file field of the web's "edit documents" modals (FilesUpload):
// shows the chosen/existing file with replace + remove, or a dashed pick
// prompt. Nothing is sent until the parent screen's Save.
const FileSlot = ({label, mandatory, existing, file, onPick, onRemove}) => {
  const {t} = useTranslation();
  const {currentDirection} = useContext(LanguageContext);
  const isRTL = currentDirection === 'rtl';
  const hasFile = !!(file || existing);
  const fileName = file?.name || existing?.name || label;

  return (
    <View style={styles.wrap}>
      <CustomText
        bold
        style={styles.label}
        paddingTop={0}
        align={isRTL ? 'right' : 'left'}>
        {label}
        {mandatory ? (
          <CustomText style={styles.mandatory}> *</CustomText>
        ) : null}
      </CustomText>
      {hasFile ? (
        <View style={[styles.fileRow, isRTL && styles.fileRowRTL]}>
          <CustomText style={styles.fileName} paddingTop={0} numberOfLines={1}>
            {file ? '🆕 ' : '📄 '}
            {fileName}
          </CustomText>
          <TouchableOpacity
            onPress={onPick}
            activeOpacity={0.7}
            hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
            <CustomText bold style={styles.action} paddingTop={0}>
              {t('edReplace')}
            </CustomText>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onRemove}
            activeOpacity={0.7}
            hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
            <CustomText bold style={styles.remove} paddingTop={0}>
              ✕
            </CustomText>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.zone}
          activeOpacity={0.75}
          onPress={onPick}>
          <CustomText bold style={styles.zoneText} paddingTop={0}>
            ⊕ {t('edChooseFile')}
          </CustomText>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {marginBottom: 12},
  label: {fontSize: 13, color: COLORS.text, marginBottom: 6},
  mandatory: {color: COLORS.danger},
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  fileRowRTL: {flexDirection: 'row-reverse'},
  fileName: {flex: 1, fontSize: 13, color: COLORS.text},
  action: {fontSize: 12, color: COLORS.primary},
  remove: {fontSize: 14, color: COLORS.danger},
  zone: {
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: COLORS.primaryLight,
    backgroundColor: '#faf5ff',
    paddingVertical: 16,
    alignItems: 'center',
  },
  zoneText: {fontSize: 13, color: COLORS.primary},
});

export default FileSlot;
