import {useCallback, useEffect, useState} from 'react';
import {AppState} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';

import {
  getUnreadNotificationCount,
  onNotificationsUpdated,
} from '../services/notifications';

const POLL_MS = 60000;

// Unread-notification count for the header badge. Refreshes on screen focus,
// when the app returns to the foreground, when a push arrives or an item is
// read, and on a slow poll as a fallback.
export default function useUnreadNotifications(enabled = true) {
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    if (!enabled) {return;}
    try {
      setCount(await getUnreadNotificationCount());
    } catch (error) {
      // keep the last known count
    }
  }, [enabled]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  useEffect(() => {
    if (!enabled) {return undefined;}
    const timer = setInterval(refresh, POLL_MS);
    const unsubscribe = onNotificationsUpdated(refresh);
    const appState = AppState.addEventListener('change', state => {
      if (state === 'active') {refresh();}
    });
    return () => {
      clearInterval(timer);
      unsubscribe();
      appState.remove();
    };
  }, [enabled, refresh]);

  return {count, refresh};
}
