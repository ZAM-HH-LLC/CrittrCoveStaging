// src/config/config.js
import { Platform } from 'react-native';
import { debugLog } from '../utils/logging';
import { 
  STAGING_API_BASE_URL_ANDROID, 
  STAGING_API_BASE_URL_IOS, 
  STAGING_API_BASE_URL_WEB,
  PRODUCTION_API_BASE_URL_ANDROID,
  PRODUCTION_API_BASE_URL_IOS,
  PRODUCTION_API_BASE_URL_WEB,
  DEV_API_BASE_URL_ANDROID,
  DEV_API_BASE_URL_IOS,
  DEV_API_BASE_URL_WEB,
  NODE_ENV 
} from '@env';

// Log all environment variables to help debug
console.log('MBA1234: All environment variables:', {
  NODE_ENV,
  process_env_NODE_ENV: process.env.NODE_ENV,
  STAGING_API_BASE_URL_ANDROID,
  STAGING_API_BASE_URL_IOS,
  STAGING_API_BASE_URL_WEB,
  PRODUCTION_API_BASE_URL_ANDROID,
  PRODUCTION_API_BASE_URL_IOS,
  PRODUCTION_API_BASE_URL_WEB,
  DEV_API_BASE_URL_ANDROID,
  DEV_API_BASE_URL_IOS,
  DEV_API_BASE_URL_WEB,
  platform: Platform.OS
});

debugLog("MBA1234: Environment Variables Loaded", {
  NODE_ENV,
  STAGING_API_BASE_URL_ANDROID,
  STAGING_API_BASE_URL_IOS,
  STAGING_API_BASE_URL_WEB,
  PRODUCTION_API_BASE_URL_ANDROID,
  PRODUCTION_API_BASE_URL_IOS,
  PRODUCTION_API_BASE_URL_WEB,
  DEV_API_BASE_URL_ANDROID,
  DEV_API_BASE_URL_IOS,
  DEV_API_BASE_URL_WEB,
  platform: Platform.OS
});

const isDevelopment = NODE_ENV === 'development';
const isStaging = NODE_ENV === 'staging';
const isProduction = NODE_ENV === 'production';

debugLog("MBA1234: Environment Configuration", {
  NODE_ENV,
  isDevelopment,
  isStaging,
  isProduction,
  platform: Platform.OS
});

let API_BASE_URL;

if (Platform.OS === 'android') {
  API_BASE_URL = isDevelopment ? DEV_API_BASE_URL_ANDROID : isStaging ? STAGING_API_BASE_URL_ANDROID : PRODUCTION_API_BASE_URL_ANDROID;
} else if (Platform.OS === 'ios') {
  API_BASE_URL = isDevelopment ? DEV_API_BASE_URL_IOS : isStaging ? STAGING_API_BASE_URL_IOS : PRODUCTION_API_BASE_URL_IOS;
} else {
  API_BASE_URL = isDevelopment ? DEV_API_BASE_URL_WEB : isStaging ? STAGING_API_BASE_URL_WEB : PRODUCTION_API_BASE_URL_WEB;
}

debugLog("MBA1234: Selected API Base URL", { API_BASE_URL });

export { API_BASE_URL };
