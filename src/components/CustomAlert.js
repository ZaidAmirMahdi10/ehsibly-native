import React from 'react';
import {View, StyleSheet} from 'react-native';
import {useTranslation} from 'react-i18next';
import ModalSheet from './ModalSheet';
import CustomText from './CustomText';
import PrimaryButton from './PrimaryButton';
import {COLORS} from '../constants/theme';

const variantForButtonStyle = style => {
  if (style === 'cancel') {
    return 'secondary';
  }
  if (style === 'destructive') {
    return 'danger';
  }
  return 'primary';
};

// Rendered once at the app root by AlertProvider — a drop-in visual
// replacement for Alert.alert() that actually goes through CustomText, so
// it gets Tajawal in Arabic like every other piece of text in the app.
const CustomAlert = ({config, onClose}) => {
  const {t} = useTranslation();
  const {title, message, buttons = [{text: 'OK'}]} = config || {};

  const handlePress = button => {
    onClose();
    button.onPress?.();
  };

  return (
    <ModalSheet visible={!!config} onClose={onClose} title={title}>
      {message ? (
        <CustomText center style={styles.message}>
          {message}
        </CustomText>
      ) : null}
      <View style={styles.actions}>
        {buttons.map((button, index) => (
          <PrimaryButton
            key={`${button.text}-${index}`}
            title={button.text || t('ok')}
            variant={variantForButtonStyle(button.style)}
            onPress={() => handlePress(button)}
          />
        ))}
      </View>
    </ModalSheet>
  );
};

const styles = StyleSheet.create({
  message: {fontSize: 14, color: COLORS.text, marginBottom: 18, lineHeight: 20},
  actions: {gap: 10},
});

export default CustomAlert;
