import axios from 'axios';
import { API_BASE_URL } from '../config/config';
import { getStorage } from '../context/AuthContext';

// Create a separate axios instance for auth logging that bypasses interceptors
const createAuthLoggerClient = () => {
  return axios.create({
    baseURL: API_BASE_URL,
    headers: {
      'Content-Type': 'application/json'
    },
    // Don't use any interceptors to prevent infinite loops
  });
};

/**
 * Log authentication events to backend
 * TEMPORARILY DISABLED to prevent infinite loops during debugging
 * @param {string} eventType - Type of auth event (e.g., 'TOKEN_REFRESH_FAILED')
 * @param {Object} details - Additional event details
 */
export const logAuthEvent = async (eventType, details = {}) => {
  // EMERGENCY DISABLE: Return immediately to break infinite loops
  console.log('🚨 AUTH LOGGING DISABLED - Event:', eventType, details);
  return;
  
  try {
    // Get token directly from storage without using AuthService to avoid loops
    const token = await getStorage('userToken');
    
    const authLoggerClient = createAuthLoggerClient();
    
    const eventData = {
      event_type: eventType,
      details: {
        timestamp: new Date().toISOString(),
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown',
        ...details
      }
    };

    // Only add auth header if we have a token, otherwise send unauthenticated
    const config = {};
    if (token) {
      config.headers = {
        'Authorization': `Bearer ${token}`
      };
    }

    await authLoggerClient.post('/api/core/log-auth-event/', eventData, config);
    
  } catch (error) {
    // Silently fail auth logging to prevent cascading errors
    // Don't log this error as it could create infinite loops
    console.warn('Auth logging failed (silent):', error.message);
  }
}; 