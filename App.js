import React, {useState, useEffect, createContext} from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {SafeAreaProvider} from 'react-native-safe-area-context';

import AsyncStorage from '@react-native-async-storage/async-storage';

import RootNavigator from './src/navigation/RootNavigator';

import './i18n';
import {useTranslation} from 'react-i18next';
import {AuthProvider} from './src/context/AuthContext';
import {AlertProvider} from './src/context/AlertContext';

export const LanguageContext = createContext();
export default function App() {
  const [currentLanguage, setCurrentLanguage] = useState('ar');
  const [currentDirection, setCurrentDirection] = useState('rtl');
  const {i18n, t} = useTranslation();

  const changeDirection = language => {
    setCurrentDirection(language === 'ar' ? 'rtl' : 'ltr');
  };

  useEffect(() => {
    const loadLanguage = async () => {
      try {
        const language = await AsyncStorage.getItem('language');
        if (language) {
          setCurrentLanguage(language);
          i18n.changeLanguage(language);
          changeDirection(language);
        } else {
          setCurrentLanguage(i18n.language);
        }
      } catch (error) {
        console.error('Error loading language from AsyncStorage:', error);
      }
    };
    loadLanguage();
  }, [i18n]);

  const changeLanguage = async language => {
    try {
      await AsyncStorage.setItem('language', language);
      setCurrentLanguage(language);
      i18n.changeLanguage(language);
      changeDirection(language);
    } catch (error) {
      console.error('Error saving language to AsyncStorage:', error);
    }
  };

  const headerOptions = title => ({
    title: t(title),
    headerPaddingBottom: 20,
    headerBackTitle: t('back'),
    headerTintColor: '#208531',
    headerTitleStyle: {
      fontFamily: 'Tajawal',
    },
    headerBackTitleStyle: {fontFamily: 'Tajawal'},
    headerBackTitleVisible: true,
  });

  return (
    <AuthProvider>
      <LanguageContext.Provider
        value={{
          currentLanguage,
          changeLanguage,
          currentDirection,
          changeDirection,
        }}>
        <AlertProvider>
          <NavigationContainer>
            <SafeAreaProvider style={{flex: 1}}>
              <RootNavigator />
            </SafeAreaProvider>
          </NavigationContainer>
        </AlertProvider>
      </LanguageContext.Provider>
    </AuthProvider>
  );
}
