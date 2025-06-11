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
  STAGING_MEDIA_URL,
  PRODUCTION_MEDIA_URL,
  NODE_ENV 
} from '@env';


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
  STAGING_MEDIA_URL,
  PRODUCTION_MEDIA_URL,
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

// Set up MEDIA_URL for images
let MEDIA_URL;
if (isDevelopment) {
  // In development, use the API base URL for media
  MEDIA_URL = API_BASE_URL;
} else if (isStaging) {
  // In staging, use the staging media URL if available, otherwise fall back to API base URL
  MEDIA_URL = STAGING_MEDIA_URL;
} else {
  // In production, use the production media URL if available, otherwise fall back to API base URL
  MEDIA_URL = PRODUCTION_MEDIA_URL;
}

debugLog("MBA1234: Selected API Base URL", { API_BASE_URL });
debugLog("MBA1234: Selected Media URL", { MEDIA_URL });

/**
 * Returns the full URL for a media resource
 * @param {string} path - The media resource path
 * @returns {string} The full URL to the media resource
 */
const getMediaUrl = (path) => {
  // If the path is already a full URL, return it as is
  if (!path) return null;
  if (path.startsWith('http')) return path;
  // Otherwise, prepend the media base URL
  return `${MEDIA_URL}${path}`;
};

export { API_BASE_URL, MEDIA_URL, getMediaUrl };
