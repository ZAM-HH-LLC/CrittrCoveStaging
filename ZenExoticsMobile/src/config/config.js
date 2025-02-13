// src/config/config.js
import { Platform } from 'react-native';
import { API_BASE_URL_ANDROID, API_BASE_URL_IOS, API_BASE_URL_WEB } from '@env';

let API_BASE_URL;

if (Platform.OS === 'android') {
  API_BASE_URL = API_BASE_URL_ANDROID;
} else if (Platform.OS === 'ios') {
  API_BASE_URL = API_BASE_URL_IOS;
} else {
  API_BASE_URL = API_BASE_URL_WEB;
}

export { API_BASE_URL };
