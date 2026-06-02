import React, {useContext} from 'react';
import {Image, View, StyleSheet} from 'react-native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {useTranslation} from 'react-i18next';

import {LanguageContext} from '../../App';

import HomeScreen from '../screens/HomeScreen';
import CategoriesScreen from '../screens/CategoriesScreen';
import FavouritesScreen from '../screens/FavouritesScreen';
import ProfileScreen from '../screens/ProfileScreen';
import SettingsScreen from '../screens/SettingsScreen';
import UserSettingsScreen from '../screens/UserSettingsScreen';
import AddProductScreen from '../screens/AddProductScreen';

const Tab = createBottomTabNavigator();

const USER_TYPE = 'user'; 
// const USER_TYPE = 'admin'; 
const isAdmin = USER_TYPE === 'admin';

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
        tabBarActiveTintColor: '#79329a',
        tabBarInactiveTintColor: '#aaa',
        headerShown: false,
      }}>

      {/* ── Home (both) ── */}
      <Tab.Screen
        name={t('home')}
        component={HomeScreen}
        options={{
          tabBarIcon: ({color}) => (
            <Image
              style={{tintColor: color, width: 28, height: 28}}
              source={require('../assets/bottom-tab-icons/home.png')}
            />
          ),
        }}
      />

      {/* ── Categories (admin) | Favourites (user) ── */}
      <Tab.Screen
        name={isAdmin ? t('categories') : t('favourites')}
        component={isAdmin ? CategoriesScreen : FavouritesScreen}
        options={{
          tabBarIcon: ({color}) => (
            <Image
              style={{tintColor: color, width: 28, height: 28}}
              source={
                isAdmin
                  ? require('../assets/bottom-tab-icons/menu.png')
                  : require('../assets/bottom-tab-icons/heart.png')
              }
            />
          ),
        }}
      />

      {/* ── Add Product (admin only) ── */}
      {isAdmin && (
        <Tab.Screen
          name={t('addProduct')}
          component={AddProductScreen}
          options={{
            tabBarIcon: ({color, focused}) => (
              <View style={[styles.addBtn, focused && styles.addBtnFocused]}>
                <Image
                  style={{
                    tintColor: focused ? '#fff' : '#C1121F',
                    width: 26,
                    height: 26,
                  }}
                  source={require('../assets/bottom-tab-icons/add.png')}
                />
              </View>
            ),
            tabBarLabel: () => null,
          }}
        />
      )}

      {/* ── Profile (both) ── */}
      <Tab.Screen
        name={t('profile')}
        component={ProfileScreen}
        options={{
          tabBarIcon: ({color}) => (
            <Image
              style={{tintColor: color, width: 28, height: 28}}
              source={require('../assets/bottom-tab-icons/user.png')}
            />
          ),
        }}
      />

      {/* ── Settings (admin → SettingsScreen, user → UserSettingsScreen) ── */}
      <Tab.Screen
        name={t('settings')}
        component={isAdmin ? SettingsScreen : UserSettingsScreen}
        options={{
          tabBarIcon: ({color}) => (
            <Image
              style={{tintColor: color, width: 23, height: 23}}
              source={require('../assets/bottom-tab-icons/settings.png')}
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  addBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FFF0F0',
    borderWidth: 2,
    borderColor: '#C1121F',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#C1121F',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  addBtnFocused: {
    backgroundColor: '#C1121F',
  },
});