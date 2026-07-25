import React from 'react';
import {Modal, TouchableOpacity, StyleSheet} from 'react-native';
import CustomText from './CustomText';
import {COLORS} from '../constants/theme';

// Shared centered popup shell — was duplicated (bayan number picker,
// add-container form, currency/option picker) as three near-identical
// Modal + dimmed-overlay + white-sheet blocks. CustomText already resolves
// Tajawal automatically based on the app's language context, so any title/
// content passed as children gets it for free — nothing extra to wire up
// here for that.
const ModalSheet = ({visible, onClose, title, children, sheetStyle}) => (
  <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
      <TouchableOpacity style={[styles.sheet, sheetStyle]} activeOpacity={1}>
        {title ? (
          <CustomText bold center style={styles.title}>
            {title}
          </CustomText>
        ) : null}
        {children}
      </TouchableOpacity>
    </TouchableOpacity>
  </Modal>
);

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  sheet: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 360,
  },
  title: {fontSize: 15, color: COLORS.text, marginBottom: 14},
});

export default ModalSheet;
