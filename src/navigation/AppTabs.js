import React, {useContext} from 'react';
import {Image} from 'react-native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTranslation} from 'react-i18next';
import {FileText, ChartBar} from 'lucide-react-native';

import {LanguageContext} from '../../App';
import {useAuth} from '../context/AuthContext';
import CustomText from '../components/CustomText';

import HomeScreen from '../screens/organization/HomeScreen';
import BankHomeScreen from '../screens/bank/BankHomeScreen';
import BankReportsScreen from '../screens/bank/BankReportsScreen';
import ProfileScreen from '../screens/general/ProfileScreen';
import SettingsScreen from '../screens/general/SettingsScreen';
import TempScreen from '../screens/general/HomeScreenOld';

const Tab = createBottomTabNavigator();

// `organization.organizationType` values are the same fixed set the web
// app's registration form uses (NO_CUSTOMER_MERCHANT, MERCHANT,
// FABRICSTORE, SUPERMARKET, CLINIC, PAPERFACTORY, SCHOOL, BANK). The
// merchant types get the normal trading-org experience below; BANK gets
// BankHomeScreen in place of the Home tab (see isBankOrg) — a bank-admin
// dashboard styled after HomeScreenOld.js, not a literal port of the web's
// Bank Applications table (that literal recreation still lives at
// screens/bank/BankApplicationsScreen.js, unused here but kept for
// reference). Anything else gets UnsupportedOrgTypeScreen instead, per the
// owner's instruction, until a real dashboard exists for those verticals.
export const MERCHANT_ORGANIZATION_TYPES = ['NO_CUSTOMER_MERCHANT', 'MERCHANT'];
export const BANK_ORGANIZATION_TYPE = 'BANK';
export const SUPPORTED_ORGANIZATION_TYPES = [...MERCHANT_ORGANIZATION_TYPES, BANK_ORGANIZATION_TYPE];

export default function AppTabs() {
  const {t} = useTranslation();
  const {currentDirection} = useContext(LanguageContext);
  const {session} = useAuth();
  const insets = useSafeAreaInsets();
  const isBankOrg = session?.organization?.organizationType === BANK_ORGANIZATION_TYPE;

  // A static tabBarLabelStyle with a hardcoded fontFamily (previously
  // 'Tajawal-Medium', with no isRTL check at all) hits the same Android
  // bug as everywhere else: @react-navigation/bottom-tabs' own label
  // component sets its own fontWeight for the focused tab, and Android
  // can't resolve that weight against an unrelated fixed filename, so it
  // silently fell back to the system font. Rendering the label ourselves
  // through CustomText — which already resolves the right Tajawal file per
  // effective weight, and only applies Tajawal at all when isRTL — fixes
  // it the same way as everywhere else.
  const renderLabel = label =>
    ({focused, color}) => (
      <CustomText bold={focused} style={{fontSize: 13, color}} paddingTop={3} center>
        {label}
      </CustomText>
    );

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarStyle: {
          backgroundColor: '#fff',
          paddingHorizontal: 10,
          height: 60 + insets.bottom,
          paddingBottom: Math.max(5, insets.bottom),
          direction: currentDirection,
        },
        tabBarActiveTintColor: '#79329a',
        tabBarInactiveTintColor: '#aaa',
        headerShown: false,
      }}>
      <Tab.Screen
        name={isBankOrg ? t('bankApplicationsTab') : t('home')}
        component={isBankOrg ? BankHomeScreen : HomeScreen}
        options={{
          tabBarLabel: renderLabel(isBankOrg ? t('bankApplicationsTab') : t('home')),
          tabBarIcon: ({color}) =>
            isBankOrg ? (
              <FileText size={26} color={color} />
            ) : (
              <Image
                style={{tintColor: color, width: 28, height: 28}}
                source={require('../assets/bottom-tab-icons/home.png')}
              />
            ),
        }}
      />

      {isBankOrg ? (
        <Tab.Screen
          name={t('bankReportsTab')}
          component={BankReportsScreen}
          options={{
            tabBarLabel: renderLabel(t('bankReportsTab')),
            tabBarIcon: ({color}) => <ChartBar size={26} color={color} />,
          }}
        />
      ) : (
        <Tab.Screen
          name={t('temp')}
          component={TempScreen}
          options={{
            tabBarLabel: renderLabel(t('temp')),
            tabBarIcon: ({color}) => (
              <Image
                style={{tintColor: color, width: 28, height: 28}}
                source={require('../assets/bottom-tab-icons/menu.png')}
              />
            ),
          }}
        />
      )}

      <Tab.Screen
        name={t('profile')}
        component={ProfileScreen}
        options={{
          tabBarLabel: renderLabel(t('profile')),
          tabBarIcon: ({color}) => (
            <Image
              style={{tintColor: color, width: 28, height: 28}}
              source={require('../assets/bottom-tab-icons/user.png')}
            />
          ),
        }}
      />

      {/* Settings deliberately sits last in the tab bar for every org type;
          Profile sits second-to-last, just before it. */}
      <Tab.Screen
        name={t('settings')}
        component={SettingsScreen}
        options={{
          tabBarLabel: renderLabel(t('settings')),
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
