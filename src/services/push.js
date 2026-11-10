import {Platform} from 'react-native';
import messaging from '@react-native-firebase/messaging';
import notifee, {AndroidImportance, EventType} from '@notifee/react-native';

import {registerDeviceToken, removeDeviceToken} from './deviceToken';
import {getInvoiceById} from './invoices/multiContainerWithoutC';
import {navigateWhenReady} from '../navigation/navigationRef';
import {emitNotificationsUpdated} from './notifications';

// Channel id must match the one declared in AndroidManifest.xml so FCM's
// background/tray notifications and our foreground Notifee display agree.
const CHANNEL_ID = 'ehsibly_default';
// res/raw/ehsibly_cash.<ext> (Android) and ehsibly_cash.caf bundled in the
// app (iOS). If the asset is missing the OS falls back to the default sound.
const SOUND_ANDROID = 'ehsibly_cash';
const SOUND_IOS = 'ehsibly_cash.caf';

let channelReady = false;

export const ensureChannel = async () => {
  if (Platform.OS !== 'android' || channelReady) {return;}
  await notifee.createChannel({
    id: CHANNEL_ID,
    name: 'Ehsibly',
    importance: AndroidImportance.HIGH,
    sound: SOUND_ANDROID,
  });
  channelReady = true;
};

// Prompts for notification permission (iOS always; Android 13+ POST_NOTIFICATIONS
// via Notifee). Returns true when notifications are allowed.
export const requestPushPermission = async () => {
  if (Platform.OS === 'android') {
    const settings = await notifee.requestPermission();
    return settings.authorizationStatus >= 1; // AUTHORIZED | PROVISIONAL
  }
  const status = await messaging().requestPermission();
  return (
    status === messaging.AuthorizationStatus.AUTHORIZED ||
    status === messaging.AuthorizationStatus.PROVISIONAL
  );
};

// Request permission, fetch the FCM token and register it for the current org.
// Best-effort — a push failure must never block login/session restore.
export const registerForPush = async () => {
  try {
    const granted = await requestPushPermission();
    if (!granted) {return;}
    await ensureChannel();
    const token = await messaging().getToken();
    if (token) {
      await registerDeviceToken(token, Platform.OS);
    }
  } catch (error) {
    console.warn('Push registration failed:', error?.message);
  }
};

// Remove this device's token from the backend (called on logout). We keep the
// FCM token itself (don't deleteToken) so re-login can re-register the same one.
export const unregisterForPush = async () => {
  try {
    const token = await messaging().getToken();
    if (token) {await removeDeviceToken(token);}
  } catch (error) {
    // best-effort
  }
};

// Shows a notification while the app is in the foreground (FCM does not display
// one itself in that state) — and for data-only messages in the background.
export const displayForegroundNotification = async remoteMessage => {
  const title = remoteMessage?.notification?.title || remoteMessage?.data?.title;
  const body = remoteMessage?.notification?.body || remoteMessage?.data?.body;
  if (!title && !body) {return;}
  await ensureChannel();
  await notifee.displayNotification({
    title,
    body,
    data: remoteMessage?.data || {},
    android: {
      channelId: CHANNEL_ID,
      smallIcon: 'ic_launcher',
      sound: SOUND_ANDROID,
      pressAction: {id: 'default'},
    },
    ios: {sound: SOUND_IOS},
  });
};

// Opens the application a notification refers to. The data payload carries
// { type, invoiceId, invoiceNumber, paymentId }. InvoiceDetail needs a full
// invoice object, so fetch it; fall back to a minimal one (the screen
// self-refreshes on focus by invoiceNumber) if the fetch fails.
export const handleNotificationOpen = async data => {
  const invoiceId = data?.invoiceId;
  // Not about a transaction (e.g. subscription): open the notifications list.
  if (!invoiceId) {
    if (data?.notificationId) {navigateWhenReady('Notifications');}
    return;
  }
  let invoice = {id: invoiceId, invoiceNumber: data?.invoiceNumber};
  try {
    const result = await getInvoiceById(invoiceId);
    const fetched = result?.invoice || result;
    if (fetched?.id) {invoice = fetched;}
  } catch (error) {
    // keep the minimal object
  }
  navigateWhenReady('InvoiceDetail', {invoice});
};

// Wires foreground + tap handlers. Call once from the authed app tree; returns
// an unsubscribe for cleanup.
export const setupNotificationHandlers = () => {
  const unsubForeground = messaging().onMessage(async remoteMessage => {
    emitNotificationsUpdated();
    await displayForegroundNotification(remoteMessage);
  });

  const unsubOpened = messaging().onNotificationOpenedApp(remoteMessage => {
    handleNotificationOpen(remoteMessage?.data);
  });

  const unsubTokenRefresh = messaging().onTokenRefresh(async token => {
    try {
      await registerDeviceToken(token, Platform.OS);
    } catch (error) {
      // best-effort
    }
  });

  const unsubNotifee = notifee.onForegroundEvent(({type, detail}) => {
    if (type === EventType.PRESS) {
      handleNotificationOpen(detail.notification?.data);
    }
  });

  // App opened from a killed state by tapping an FCM tray notification.
  messaging()
    .getInitialNotification()
    .then(remoteMessage => {
      if (remoteMessage) {handleNotificationOpen(remoteMessage.data);}
    });

  return () => {
    unsubForeground();
    unsubOpened();
    unsubTokenRefresh();
    unsubNotifee();
  };
};
