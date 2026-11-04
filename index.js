/**
 * @format
 */

import {AppRegistry} from 'react-native';
import messaging from '@react-native-firebase/messaging';
import notifee, {EventType} from '@notifee/react-native';
import App from './App';
import {name as appName} from './app.json';
import {
  displayForegroundNotification,
  handleNotificationOpen,
} from './src/services/push';

// Must be registered at module scope (outside the React tree). FCM auto-shows
// notification-payload messages in the tray when backgrounded/killed; this
// also displays data-only messages.
messaging().setBackgroundMessageHandler(async remoteMessage => {
  if (!remoteMessage?.notification) {
    await displayForegroundNotification(remoteMessage);
  }
});

// Tapping a Notifee-displayed notification while the app is in the background.
notifee.onBackgroundEvent(async ({type, detail}) => {
  if (type === EventType.PRESS) {
    await handleNotificationOpen(detail.notification?.data);
  }
});

AppRegistry.registerComponent(appName, () => App);
