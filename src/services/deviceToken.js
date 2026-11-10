import apiClient from './apiClient';

// POST /deviceToken — upserts this device's FCM token for the logged-in org.
// apiClient's request interceptor attaches the auth + organization headers,
// and the backend resolves the organization from those (never the body).
export const registerDeviceToken = async (token, platform) => {
  const response = await apiClient.post('/deviceToken', {token, platform});
  return response.data;
};

// DELETE /deviceToken — axios needs the body under `data` for DELETE.
export const removeDeviceToken = async token => {
  const response = await apiClient.delete('/deviceToken', {data: {token}});
  return response.data;
};
