import React, {useState, useContext} from 'react';
import {createStackNavigator} from '@react-navigation/stack';
import {useTranslation} from 'react-i18next';

import {LanguageContext} from '../../App';
import {useAuth} from '../context/AuthContext';
import LoginScreen from '../screens/general/LoginScreen';
import RegisterScreen from '../screens/general/RegisterScreen';
import InvoiceDetailScreen from '../screens/organization/InvoiceDetailScreen';
import DocumentViewerScreen from '../screens/general/DocumentViewerScreen';
import SplashScreen from '../screens/general/SplashScreen';
import CreateInvoiceScreen from '../screens/organization/CreateInvoiceScreen';
import GenerateApplicationScreen from '../screens/organization/GenerateApplicationScreen';
import SupplierPickerScreen from '../screens/organization/SupplierPickerScreen';
import AddSupplierScreen from '../screens/organization/AddSupplierScreen';
import SubCompanyPickerScreen from '../screens/organization/SubCompanyPickerScreen';
import AddSubCompanyScreen from '../screens/organization/AddSubCompanyScreen';
import BankPickerScreen from '../screens/organization/BankPickerScreen';
import AddBankScreen from '../screens/organization/AddBankScreen';
import ChangePasswordScreen from '../screens/general/ChangePasswordScreen';
import UnsupportedOrgTypeScreen from '../screens/organization/UnsupportedOrgTypeScreen';
import AppTabs, {SUPPORTED_ORGANIZATION_TYPES} from './AppTabs';
import LoadingState from '../components/LoadingState';
import {View, Text, TouchableOpacity, StyleSheet} from 'react-native';
import {COLORS} from '../constants/theme';
import {FONTS, tajawalStyleForWeight} from '../constants/fonts';

// Pure-JS stack (not native-stack) — deliberately avoids react-native-screens,
// which repeatedly crashed ("Unimplemented component: <RNSScreenStack>",
// then "Screen native module hasn't been linked" even after a full clean
// rebuild) across three different version ranges on this RN 0.78 + New
// Architecture setup. This trades native screen-transition performance for
// reliability; revisit only if that specific tradeoff becomes a real problem.
const Stack = createStackNavigator();

// Single-stack conditional-screens pattern (React Navigation's documented
// auth-flow approach) rather than nesting separate Auth/App navigators —
// avoids a remount flash on login/logout.
export default function RootNavigator() {
  const {isAuthenticated, isLoading, session} = useAuth();
  const isSupportedOrgType = SUPPORTED_ORGANIZATION_TYPES.includes(session?.organization?.organizationType);
  const {t} = useTranslation();
  const {currentDirection} = useContext(LanguageContext);
  const isRTL = currentDirection === 'rtl';
  const [showSplash, setShowSplash] = useState(true);

  // Splash plays its own animation regardless of how fast the AsyncStorage
  // session read resolves; only continue past it once both are done, so a
  // fast device never gets a jarring instant-skip.
  if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

  if (isLoading) {
    return (
      <View style={styles.bootContainer}>
        <LoadingState />
      </View>
    );
  }

  // React Navigation's stack header renders its own Text (never our
  // CustomText, no Tajawal) and, since this app manages RTL manually rather
  // than via native I18nManager, always keeps the back button physically on
  // the left with a left-pointing chevron — wrong "side" and wrong glyph in
  // Arabic. It also defaults to showing the *previous* screen's title as
  // the back button's label, which for routes with no explicit `title`
  // (e.g. MainTabs) fell back to the raw route name ("MainTabs") — always
  // in English regardless of app language. Hiding the label entirely
  // (icon-only back button) sidesteps all of that, and mirroring the
  // chevron + moving it to headerRight for RTL matches how the app's own
  // custom headers (e.g. InvoiceDetailScreen) already behave.
  const renderHeaderBack = onPress => (
    <TouchableOpacity onPress={onPress} style={styles.headerBackBtn} activeOpacity={0.7}>
      <Text style={styles.headerBackIcon}>{isRTL ? '›' : '‹'}</Text>
    </TouchableOpacity>
  );

  const formHeaderOptions = ({navigation}) => ({
    headerShown: true,
    headerStyle: {backgroundColor: COLORS.primary},
    headerTintColor: '#fff',
    // Android: fontWeight alongside an exact Tajawal filename silently falls
    // back to the system font (see tajawalStyleForWeight) — the RTL branch
    // must not carry a fontWeight of its own.
    headerTitleStyle: isRTL
      ? tajawalStyleForWeight('700')
      : {fontWeight: '700', fontFamily: FONTS.ENGLISH_DEFAULT},
    headerBackTitleVisible: false,
    headerLeft: isRTL ? () => null : () => renderHeaderBack(navigation.goBack),
    headerRight: isRTL ? () => renderHeaderBack(navigation.goBack) : undefined,
  });

  return (
    <Stack.Navigator screenOptions={{headerShown: false}}>
      {!isAuthenticated ? (
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
        </>
      ) : !isSupportedOrgType ? (
        <Stack.Screen name="UnsupportedOrgType" component={UnsupportedOrgTypeScreen} />
      ) : (
        <>
          <Stack.Screen name="MainTabs" component={AppTabs} />
          <Stack.Screen name="InvoiceDetail" component={InvoiceDetailScreen} />
          <Stack.Screen name="DocumentViewer" component={DocumentViewerScreen} />
          <Stack.Screen
            name="CreateInvoice"
            component={CreateInvoiceScreen}
            options={props => ({...formHeaderOptions(props), title: t('createInvoiceTitle')})}
          />
          <Stack.Screen
            name="GenerateApplication"
            component={GenerateApplicationScreen}
            options={props => ({...formHeaderOptions(props), title: t('generateApplicationTitle')})}
          />
          <Stack.Screen
            name="SupplierPicker"
            component={SupplierPickerScreen}
            options={props => ({...formHeaderOptions(props), title: t('supplierPickerTitle')})}
          />
          <Stack.Screen
            name="AddSupplier"
            component={AddSupplierScreen}
            options={props => ({...formHeaderOptions(props), title: t('addSupplierTitle')})}
          />
          <Stack.Screen
            name="SubCompanyPicker"
            component={SubCompanyPickerScreen}
            options={props => ({...formHeaderOptions(props), title: t('subCompanyPickerTitle')})}
          />
          <Stack.Screen
            name="AddSubCompany"
            component={AddSubCompanyScreen}
            options={props => ({...formHeaderOptions(props), title: t('addSubCompanyTitle')})}
          />
          <Stack.Screen
            name="BankPicker"
            component={BankPickerScreen}
            options={props => ({...formHeaderOptions(props), title: t('bankPickerTitle')})}
          />
          <Stack.Screen
            name="AddBank"
            component={AddBankScreen}
            options={props => ({...formHeaderOptions(props), title: t('addBankTitle')})}
          />
          <Stack.Screen
            name="ChangePassword"
            component={ChangePasswordScreen}
            options={props => ({...formHeaderOptions(props), title: t('changePasswordTitle')})}
          />
        </>
      )}
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  bootContainer: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  headerBackBtn: {paddingHorizontal: 12, paddingVertical: 6},
  headerBackIcon: {color: '#fff', fontSize: 26, fontWeight: '300'},
});
