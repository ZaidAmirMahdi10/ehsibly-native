import React, {useContext} from 'react';
import {Image} from 'react-native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {useTranslation} from 'react-i18next';

import {LanguageContext} from '../../App';

import HomeScreen from '../screens/HomeScreen';
import CategoriesScreen from '../screens/CategoriesScreen';
import ProfileScreen from '../screens/ProfileScreen';
import SettingsScreen from '../screens/SettingsScreen';

const Tab = createBottomTabNavigator();

export default function BottomTabNavigator() {
  const {t} = useTranslation();
  const {currentDirection} = useContext(LanguageContext);

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarStyle: {
          backgroundColor: '#fff',
          paddingHorizontal: 10,
          height: 60,
          paddingBottom: 5,
          direction: currentDirection,
        },

        tabBarLabelStyle: {
          fontSize: 13,
          fontFamily: 'Tajawal-Medium',
          paddingTop: 3,
        },

        tabBarActiveTintColor: '#C1121F',
        tabBarInactiveTintColor: '#aaa',
        headerShown: false,
      }}>
      <Tab.Screen
        name={t('home')}
        component={HomeScreen}
        options={{
          tabBarIcon: ({color}) => (
            <Image
              style={{
                tintColor: color,
                width: 28,
                height: 28,
              }}
              source={require('../assets/bottom-tab-icons/home.png')}
            />
          ),
        }}
      />

      <Tab.Screen
        name={t('categories')}
        component={CategoriesScreen}
        options={{
          tabBarIcon: ({color}) => (
            <Image
              style={{
                tintColor: color,
                width: 28,
                height: 28,
              }}
              source={require('../assets/bottom-tab-icons/menu.png')}
            />
          ),
        }}
      />

      <Tab.Screen
        name={t('profile')}
        component={ProfileScreen}
        options={{
          tabBarIcon: ({color}) => (
            <Image
              style={{
                tintColor: color,
                width: 28,
                height: 28,
              }}
              source={require('../assets/bottom-tab-icons/user.png')}
            />
          ),
        }}
      />

      <Tab.Screen
        name={t('settings')}
        component={SettingsScreen}
        options={{
          tabBarIcon: ({color}) => (
            <Image
              style={{
                tintColor: color,
                width: 23,
                height: 23,
              }}
              source={require('../assets/bottom-tab-icons/settings.png')}
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
