// components/LanguageModal.js

import React, {useContext, useEffect, useState} from 'react';
import {View, Text, TouchableOpacity, StyleSheet, Modal} from 'react-native';
import {useTranslation} from 'react-i18next';
import DropDownPicker from 'react-native-dropdown-picker';
import {LanguageContext} from '../../App';
import FontedText from './FontedText';

const LanguageModal = ({visible, onClose}) => {
  const {t, i18n} = useTranslation();

  const [openDropdown, setOpenDropdown] = useState(false);

  const {currentLanguage, changeLanguage} = useContext(LanguageContext);
  const [selectedLanguage, setSelectedLanguage] = useState(currentLanguage);

  // 👇 Keep the modal’s dropdown in sync with global language
  useEffect(() => {
    if (visible) {
      setSelectedLanguage(currentLanguage);
    }
  }, [visible, currentLanguage]);

  const [languages] = useState([
    {label: t('english'), value: 'en'},
    {label: t('arabic'), value: 'ar'},
  ]);

  const handleChangeLanguage = e => {
    changeLanguage(e);
    i18n.changeLanguage(e);
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalView}>
          <FontedText style={styles.modalTitle}>
            {t('chooseLanguage')}
          </FontedText>

          <DropDownPicker
            open={openDropdown}
            value={selectedLanguage}
            items={languages}
            setOpen={setOpenDropdown}
            setValue={callback => {
              const value = callback(selectedLanguage);
              setSelectedLanguage(value); // update modal state
              changeLanguage(value); // update global state + i18n
            }}
            setItems={() => {}}
            containerStyle={{width: 200}}
            style={styles.dropdown}
            dropDownContainerStyle={{backgroundColor: '#f0f0f0'}}
            textStyle={{fontFamily: 'Tajawal', fontSize: 16}}
          />

          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <FontedText style={styles.closeButtonText}>{t('close')}</FontedText>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export default LanguageModal;

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalView: {
    margin: 20,
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 35,
    alignItems: 'center',
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    marginBottom: 15,
    fontFamily: 'Tajawal',
  },
  dropdown: {
    backgroundColor: '#ffffff',
    borderColor: '#ccc',
    marginBottom: 20,
    zIndex: 1000,
  },
  closeButton: {
    backgroundColor: '#208531',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  closeButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});
