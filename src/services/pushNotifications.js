import {Platform, PermissionsAndroid} from 'react-native';
import messaging from '@react-native-firebase/messaging';
import apiClient from './apiClient';

// Push is best-effort: when Firebase isn't configured (no google-services.json /
// GoogleService-Info.plist) or permission is denied, every call here is a no-op
// and must never break login or logout.
let registeredToken = null;
let unsubscribeTokenRefresh = null;

const requestPermission = async () => {
  if (Platform.OS === 'android') {
    if (Platform.Version < 33) {return true;}
    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
    );
    return result === PermissionsAndroid.RESULTS.GRANTED;
  }
  const status = await messaging().requestPermission();
  return (
    status === messaging.AuthorizationStatus.AUTHORIZED ||
    status === messaging.AuthorizationStatus.PROVISIONAL
  );
};

// iOS only vends an FCM token once the APNs token has arrived, which can lag
// behind the permission prompt. Never arrives on the iOS simulator.
const waitForApnsToken = async () => {
  if (Platform.OS !== 'ios') {
    return;
  }
  for (let attempt = 0; attempt < 10; attempt++) {
    if (await messaging().getAPNSToken()) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  throw new Error('APNs token unavailable (iOS simulator or push not enabled)');
};

const sendToken = async token => {
  await apiClient.post('/deviceToken', {token, platform: Platform.OS});
  registeredToken = token;
};

export const registerForPush = async () => {
  try {
    if (!(await requestPermission())) {return;}
    await waitForApnsToken();
    await sendToken(await messaging().getToken());

    unsubscribeTokenRefresh?.();
    unsubscribeTokenRefresh = messaging().onTokenRefresh(token => {
      sendToken(token).catch(() => {});
    });
  } catch (error) {
    console.warn('Push registration skipped:', error?.message);
  }
};

// Must run while the session is still active: the backend resolves the
// organization from the auth token.
export const unregisterPush = async () => {
  unsubscribeTokenRefresh?.();
  unsubscribeTokenRefresh = null;
  const token = registeredToken;
  registeredToken = null;
  if (!token) {return;}
  try {
    await apiClient.delete('/deviceToken', {data: {token}});
  } catch (error) {
    console.warn('Push unregistration failed:', error?.message);
  }
};
