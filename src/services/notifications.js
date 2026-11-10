import {DeviceEventEmitter} from 'react-native';
import apiClient from './apiClient';

const route = '/notifications';

// Fired whenever the unread state may have changed (push received, item read,
// all read) so the header badge and an open list refetch.
export const NOTIFICATIONS_UPDATED = 'notifications-updated';
export const emitNotificationsUpdated = () =>
  DeviceEventEmitter.emit(NOTIFICATIONS_UPDATED);
export const onNotificationsUpdated = handler => {
  const subscription = DeviceEventEmitter.addListener(
    NOTIFICATIONS_UPDATED,
    handler,
  );
  return () => subscription.remove();
};

export const getNotifications = async (params = {}) => {
  const response = await apiClient.get(route, {params});
  return response.data;
};

export const getUnreadNotificationCount = async () => {
  const response = await apiClient.get(`${route}/unread-count`);
  return response.data?.unreadCount || 0;
};

export const markNotificationRead = async id => {
  const response = await apiClient.post(`${route}/${id}/read`);
  return response.data;
};

export const markAllNotificationsRead = async () => {
  const response = await apiClient.post(`${route}/read-all`);
  return response.data;
};
