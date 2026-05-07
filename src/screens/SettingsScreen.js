// screens/SettingsScreen.js
import React, {useState, useContext} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image
} from 'react-native';

import {useTranslation} from 'react-i18next';
import {SafeAreaView} from 'react-native-safe-area-context';
import { LanguageContext } from '../../App';
import LanguageModal from '../components/LanguageModal';
import FontedText from '../components/FontedText';

const SettingsScreen = () => {
  const {t} = useTranslation();
  const {currentDirection} = useContext(LanguageContext);
  const [languageModalVisible, setLanguageModalVisible] = useState(false);
  


  const SettingItem = ({
    emoji,
    label,
    onPress,
    imageStyle,
    isLastItem,
    isSingleItem,
  }) => (
    <TouchableOpacity
      style={[
        styles.item,
        (isLastItem || isSingleItem) && {borderBottomWidth: 0},
      ]}
      onPress={onPress}>
      <Image source={emoji} style={[styles.emoji, imageStyle]} />
      <FontedText
        style={[
          styles.label,
          {textAlign: currentDirection === 'rtl' ? 'right' : 'left', flex: 1},
        ]}>
        {label}
      </FontedText>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={[styles.container, {paddingHorizontal: 16}]}>
        {/* Settings Section */}
        <Text
          style={[
            styles.settingsSectionTitle,
            {textAlign: currentDirection === 'rtl' ? 'right' : 'left'},
          ]}>
          {t('settings')}
        </Text>
        <View style={styles.settingsSection}>
          {[
            {
              label: t('language'),
              imageStyle: {
                width: 27,
                height: 27,
                marginRight: currentDirection === 'rtl' ? 0 : 12,
                marginLeft: currentDirection === 'rtl' ? 12 : 0,
              },
              onPress: () => setLanguageModalVisible(true),
            }
          ].map((item, index, arr) => (
            <SettingItem
              key={index}
              {...item}
              isLastItem={index === arr.length - 1}
            />
          ))}
        </View>
      </ScrollView>

      <LanguageModal
        visible={languageModalVisible}
        onClose={() => setLanguageModalVisible(false)}
      />
    </SafeAreaView>
  );
};

export default SettingsScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#eee',
  },
  container: {
    flexGrow: 1,
    backgroundColor: '#eee',
    paddingVertical: 30,
  },
  settingsSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'Tajawal',
    marginBottom: 10,
    paddingHorizontal: 6,
  },
  settingsSection: {
    backgroundColor: '#fff',
    borderRadius: 15,
    marginBottom: 15,
    paddingHorizontal: 16,
    paddingVertical: 5,
  },
  settingsLastSection: {
    paddingBottom: 50,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomColor: '#E0E0E0',
    borderBottomWidth: 1,
  },
  emoji: {
    width: 22,
    height: 22,
  },
  label: {
    fontSize: 16,
    color: '#4F4F4F',
  },
});
