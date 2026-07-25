import Config from 'react-native-config';

const configuredApiUrl = Config.API_BASE_URL?.trim();

if (!configuredApiUrl) {
  throw new Error('API_BASE_URL is missing from the environment configuration.');
}

export const API_BASE_URL = configuredApiUrl.replace(/\/$/, '');
