import {Platform} from 'react-native';

// Single dev backend today (localhost:3005). Revisit with react-native-config
// if/when a real staging/prod split needs switching without a code change.
const PROD_API_URL = 'https://api.ehsibly.com';

const getDevBaseUrl = () => {
  if (Platform.OS === 'android') {
    // Android emulator's alias for the host machine's localhost.
    return 'http://10.0.2.2:3005';
  }
  // iOS simulator can hit the host machine's localhost directly.
  // Physical device (either OS): replace with `http://<dev-machine-LAN-IP>:3005`.
  return 'http://localhost:3005';
};

export const API_BASE_URL = __DEV__ ? getDevBaseUrl() : PROD_API_URL;
