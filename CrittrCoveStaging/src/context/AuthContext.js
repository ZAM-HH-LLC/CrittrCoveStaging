import React, { createContext, useState, useEffect, useContext, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_BASE_URL } from '../config/config';
import { Dimensions, Platform } from 'react-native';
import { navigate } from '../../App';
import { navigateToFrom } from '../components/Navigation';
import { initStripe } from '../utils/StripeService';
import { getUserName } from '../api/API';

export const SCREEN_WIDTH = Dimensions.get('window').width;
export const SCREEN_HEIGHT = Dimensions.get('window').height;

// Create a debug logging utility
let debugEnabled = true;

export const setDebugEnabled = (enabled) => {
  debugEnabled = enabled;
};

export const debugLog = (message, ...data) => {
  if (debugEnabled) {
    if (data.length > 0) {
      console.log(`${message}:`, ...data);
    } else {
      console.log(`${message}`);
    }
  }
};

class AuthService {
  constructor() {
    this.accessToken = null;
    this.refreshToken = null;
    this.isRefreshing = false;
    this.refreshSubscribers = [];
    this.is_DEBUG = false;
    this.tokenExpiryTime = null;
    this.lastValidation = null;
  }

  setDebug(enabled) {
    this.is_DEBUG = enabled;
    console.log('MBA98765 AuthService debug mode:', enabled);
  }

  // Parse JWT token to get expiry time
  parseJwt(token) {
    try {
      if (!token) return null;
      
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      let jsonPayload;
      
      if (typeof atob === 'function') {
        // Browser environment
        jsonPayload = decodeURIComponent(
          atob(base64)
            .split('')
            .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
            .join('')
        );
      } else {
        // React Native environment
        jsonPayload = decodeURIComponent(
          Buffer.from(base64, 'base64')
            .toString('binary')
            .split('')
            .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
            .join('')
        );
      }
      
      return JSON.parse(jsonPayload);
    } catch (error) {
      console.error('MBA54321 Error parsing JWT:', error);
      return null;
    }
  }

  // Calculate time until token expires in milliseconds
  getTimeUntilExpiry(token) {
    const parsedToken = this.parseJwt(token);
    if (!parsedToken || !parsedToken.exp) return 0;
    
    const expiryTime = parsedToken.exp * 1000; // Convert to milliseconds
    this.tokenExpiryTime = expiryTime;
    
    return expiryTime - Date.now();
  }
  
  // Check token freshness after returning to the app
  // Minimizes API calls by only refreshing if token is about to expire
  async checkTokenFreshnessOnReturn() {
    // Skip if we checked within the last minute to avoid excessive checks
    const now = Date.now();
    if (this.lastValidation && now - this.lastValidation < 60 * 1000) {
      console.log('MBA54321 Skipping token check - checked recently');
      return;
    }
    
    this.lastValidation = now;
    
    if (!this.accessToken) {
      console.log('MBA54321 No access token, skipping check');
      return;
    }
    
    const timeUntilExpiry = this.getTimeUntilExpiry(this.accessToken);
    
    // If token expires in less than 5 minutes or is expired, refresh it
    if (timeUntilExpiry < 5 * 60 * 1000) {
      console.log(`MBA54321 Token expires in ${Math.round(timeUntilExpiry/1000)} seconds, refreshing`);
      try {
        await this.refreshTokens();
      } catch (error) {
        console.error('MBA54321 Error refreshing token on return:', error);
      }
    } else {
      console.log(`MBA54321 Token still valid for ${Math.round(timeUntilExpiry/60000)} minutes, no refresh needed`);
    }
  }

  async initialize() {
    console.log('MBA98765 Starting AuthService.initialize()');
    try {
      let accessToken, refreshToken;
      
      if (Platform.OS === 'web') {
        console.log('MBA98765 Web platform detected, using sessionStorage');
        accessToken = sessionStorage.getItem('userToken');
        refreshToken = sessionStorage.getItem('refreshToken');
      } else {
        console.log('MBA98765 Mobile platform detected, using AsyncStorage');
        [accessToken, refreshToken] = await AsyncStorage.multiGet([
          'userToken',
          'refreshToken'
        ]);
      }
      
      this.accessToken = accessToken;
      this.refreshToken = refreshToken;

      console.log('MBA98765 Tokens retrieved:', {
        hasAccessToken: !!this.accessToken,
        hasRefreshToken: !!this.refreshToken
      });
      
      // Check if token is close to expiry and refresh if needed
      if (this.accessToken) {
        const timeUntilExpiry = this.getTimeUntilExpiry(this.accessToken);
        if (timeUntilExpiry < 5 * 60 * 1000) {
          console.log('MBA54321 Token close to expiry during init, refreshing');
          await this.refreshTokens().catch(err => {
            console.log('MBA54321 Failed to refresh token during init:', err);
          });
        }
      }

      return {
        hasAccessToken: !!this.accessToken,
        hasRefreshToken: !!this.refreshToken
      };
    } catch (error) {
      console.error('MBA98765 Error in AuthService.initialize():', error);
      return { hasAccessToken: false, hasRefreshToken: false };
    }
  }

  async getAccessToken() {
    // Only refresh token if it's about to expire (less than 2 minutes left)
    if (this.accessToken) {
      const timeUntilExpiry = this.getTimeUntilExpiry(this.accessToken);
      if (timeUntilExpiry < 2 * 60 * 1000 && timeUntilExpiry > 0) {
        console.log('MBA54321 Token about to expire, refreshing');
        await this.refreshTokens().catch(err => {
          console.log('MBA54321 Failed to refresh token in getAccessToken:', err);
        });
      }
    } else if (this.refreshToken) {
      console.log('MBA98765 No access token but has refresh token, attempting refresh');
      await this.refreshTokens().catch(err => {
        console.log('MBA54321 Failed to refresh token in getAccessToken:', err);
      });
    }
    
    return this.accessToken;
  }

  async refreshTokens() {
    console.log('MBA98765 refreshTokens called');
    if (this.isRefreshing) {
      console.log('MBA98765 Token refresh already in progress, subscribing');
      return new Promise((resolve) => {
        this.refreshSubscribers.push((token) => resolve(token));
      });
    }

    if (!this.refreshToken) {
      console.log('MBA98765 No refresh token available');
      return null;
    }

    try {
      this.isRefreshing = true;
      console.log('MBA98765 Starting token refresh');

      // Update the last validation time first so we don't trigger multiple refreshes
      this.lastValidation = Date.now();

      const response = await axios.post(`${API_BASE_URL}/api/token/refresh/`, {
        refresh: this.refreshToken
      });

      this.accessToken = response.data.access;
      
      if (Platform.OS === 'web') {
        sessionStorage.setItem('userToken', this.accessToken);
      } else {
        await AsyncStorage.setItem('userToken', this.accessToken);
      }

      // Parse and store the expiry time from the new token
      const timeUntilExpiry = this.getTimeUntilExpiry(this.accessToken);
      console.log(`MBA98765 Token refresh successful, new token valid for ${Math.round(timeUntilExpiry/60000)} minutes`);

      this.refreshSubscribers.forEach(callback => callback(this.accessToken));
      this.refreshSubscribers = [];
      
      return this.accessToken;
    } catch (error) {
      console.error('MBA98765 Token refresh failed:', error.response?.status, error.response?.data);
      
      // Check if refresh token is expired
      const isRefreshTokenExpired = error.response?.data?.code === 'token_not_valid' && 
                                    error.response?.data?.messages?.[0]?.token_type === 'refresh';
      
      if (isRefreshTokenExpired) {
        console.log('MBA98765 Refresh token expired, clearing tokens');
      }
      
      this.clearTokens();
      throw error;
    } finally {
      this.isRefreshing = false;
    }
  }

  async validateToken(token) {
    // Skip actual validation API call if we checked within the last 5 minutes
    const now = Date.now();
    if (this.lastValidation && now - this.lastValidation < 5 * 60 * 1000) {
      console.log('MBA54321 Using cached token validation');
      
      // Use expiry time from the token itself instead of making API call
      const timeUntilExpiry = this.getTimeUntilExpiry(token);
      return timeUntilExpiry > 0;
    }
    
    console.log('MBA98765 validateToken called');
    try {
      const response = await axios.post(`${API_BASE_URL}/api/token/verify/`, {
        token: token
      });

      this.lastValidation = now;
      console.log('MBA98765 Token validation successful');
      return response.status === 200;
    } catch (error) {
      console.error('MBA98765 Token validation failed:', error.response?.status);
      return false;
    }
  }

  async clearTokens() {
    console.log('MBA98765 clearTokens called');
    try {
      if (Platform.OS === 'web') {
        sessionStorage.removeItem('userToken');
        sessionStorage.removeItem('refreshToken');
      } else {
        await AsyncStorage.multiRemove(['userToken', 'refreshToken']);
      }
      this.accessToken = null;
      this.refreshToken = null;
      
      console.log('MBA98765 Tokens cleared');
    } catch (error) {
      console.error('MBA98765 Error clearing tokens:', error);
    }
  }

  async setTokens(accessToken, refreshToken) {
    console.log('MBA98765 setTokens called');
    try {
      this.accessToken = accessToken;
      this.refreshToken = refreshToken;

      if (Platform.OS === 'web') {
        sessionStorage.setItem('userToken', accessToken);
        sessionStorage.setItem('refreshToken', refreshToken);
      } else {
        await AsyncStorage.multiSet([
          ['userToken', accessToken],
          ['refreshToken', refreshToken]
        ]);
      }
      
      console.log('MBA98765 Tokens set successfully');
    } catch (error) {
      console.error('MBA98765 Error setting tokens:', error);
      throw error;
    }
  }
}

export const AuthContext = createContext();

// Add getStorage function
export const getStorage = async (key) => {
  try {
    if (Platform.OS === 'web') {
      return sessionStorage.getItem(key);
    } else {
      return await AsyncStorage.getItem(key);
    }
  } catch (error) {
    console.error('Error getting from storage:', error);
    return null;
  }
};

// Add is_PRODUCTION variable for use outside of context
// Set this to true for production, false for development
const is_PRODUCTION = false;

export const IsProduction = () => {
  return is_PRODUCTION;
};

export const AuthProvider = ({ children }) => {
  const authService = useRef(new AuthService());
  const isInitializedRef = useRef(false);
  
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [isApprovedProfessional, setIsApprovedProfessional] = useState(false);
  const [loading, setLoading] = useState(true);
  const [screenWidth, setScreenWidth] = useState(Dimensions.get('window').width);
  const [firstName, setFirstName] = useState('');
  const [name, setName] = useState('');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [timeSettings, setTimeSettings] = useState({
    timezone: 'UTC',
    timezone_abbrev: 'UTC',
    use_military_time: false
  });
  const [is_prototype, setIsPrototype] = useState(false);
  const [is_DEBUG, setIsDebug] = useState(true);

  // Set debug mode
  useEffect(() => {
    console.log('MBA98765 Setting up debug mode');
    authService.current.setDebug(is_DEBUG);
  }, [is_DEBUG]);

  // Set up axios interceptors
  useEffect(() => {
    console.log('MBA98765 Setting up axios interceptors');
    const requestInterceptor = axios.interceptors.request.use(
      async (config) => {
        if (!is_prototype) {
          try {
            const token = await authService.current.getAccessToken();
            if (token) {
              config.headers.Authorization = `Bearer ${token}`;
            }
          } catch (error) {
            console.error('MBA98765 Error getting access token for request:', error);
          }
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    const responseInterceptor = axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          
          try {
            // Check if the error is specifically about an invalid token
            const isTokenError = error.response?.data?.code === 'token_not_valid';
            
            if (isTokenError) {
              debugLog('MBA54321 Token invalid error detected', error.response?.data);
              
              const refreshSuccessful = await authService.current.refreshTokens().then(() => true).catch(() => false);
              
              if (refreshSuccessful) {
                const newToken = authService.current.accessToken;
                originalRequest.headers.Authorization = `Bearer ${newToken}`;
                return axios(originalRequest);
              } else {
                debugLog('MBA54321 Could not refresh token, forcing sign out');
                await signOut();
                return Promise.reject(new Error('Session expired. Please sign in again.'));
              }
            } else {
              // For other 401 errors, still try to refresh the token
              const newToken = await authService.current.refreshTokens();
              if (newToken) {
                originalRequest.headers.Authorization = `Bearer ${newToken}`;
                return axios(originalRequest);
              }
            }
          } catch (refreshError) {
            console.error('MBA98765 Token refresh failed:', refreshError);
            await signOut();
            return Promise.reject(refreshError);
          }
        }
        
        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.request.eject(requestInterceptor);
      axios.interceptors.response.eject(responseInterceptor);
    };
  }, [is_prototype]);

  // Minimalist approach to token refresh on window focus
  useEffect(() => {
    if (!isSignedIn || is_prototype) return;
    
    // Handler to check token when window regains focus
    const handleWindowFocus = () => {
      debugLog('MBA54321 Window regained focus, scheduling token refresh check');
      
      // This will only refresh if token is within 5 minutes of expiry or expired
      // Won't make network call if token is still valid for more than 5 minutes
      if (authService.current) {
        authService.current.checkTokenFreshnessOnReturn();
      }
    };
    
    // Set up event listeners for window focus and visibility changes
    if (typeof window !== 'undefined') {
      window.addEventListener('focus', handleWindowFocus);
      
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          handleWindowFocus();
        }
      });
    }
    
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('focus', handleWindowFocus);
        document.removeEventListener('visibilitychange', handleWindowFocus);
      }
    };
  }, [isSignedIn, is_prototype]);

  // Initialize auth state
  useEffect(() => {
    const init = async () => {
      if (isInitializedRef.current) return;
      
      try {
        console.log('MBA98765 Initializing auth state');
        const { hasAccessToken, hasRefreshToken } = await authService.current.initialize();
        
        if (hasAccessToken || hasRefreshToken) {
          const token = await authService.current.getAccessToken();
          if (token) {
            const isValid = await authService.current.validateToken(token);
            if (isValid) {
              setIsSignedIn(true);
              await fetchUserName();
              const status = await getProfessionalStatus(token);
              setUserRole(status.suggestedRole);
              setIsApprovedProfessional(status.isApprovedProfessional);
              await fetchTimeSettings();
            } else {
              await signOut();
            }
          }
        } else {
          await signOut();
        }
      } catch (error) {
        console.error('MBA98765 Error initializing auth state:', error);
        await signOut();
      } finally {
        setLoading(false);
        isInitializedRef.current = true;
      }
    };

    init();
  }, []);

  // Preload Stripe modules when user signs in
  useEffect(() => {
    if (isSignedIn && !is_prototype) {
      initStripe();
    }
  }, [isSignedIn, is_prototype]);
  

  // Separate screen width handling from auth
  useEffect(() => {
    const handleDimensionsChange = ({ window }) => {
      setScreenWidth(window.width);
    };

    const subscription = Dimensions.addEventListener('change', handleDimensionsChange);

    return () => {
      if (subscription?.remove) {
        subscription.remove();
      }
    };
  }, []);

  const fetchUserName = async () => {
    try {
      debugLog('MBA98765 Fetching user name');
      const userData = await getUserName();
      debugLog('MBA98765 User name response:', userData);
      setFirstName(userData.first_name);
      setName(userData.name);
    } catch (error) {
      console.error('MBA98765 Error fetching user name:', error.response ? error.response.data : error.message);
      setFirstName(''); // Reset firstName on error
      setName(''); // Reset name on error
    }
  };

  const getProfessionalStatus = async (token) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/professional-status/v1/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (is_DEBUG) {
        debugLog('MBA98765 Professional status response:', response.data);
      }

      const { is_approved } = response.data;
      
      setIsApprovedProfessional(is_approved);
      await AsyncStorage.setItem('isApprovedProfessional', String(is_approved));

      return {
        isApprovedProfessional: is_approved,
        suggestedRole: is_approved ? 'professional' : 'petOwner'
      };
    } catch (error) {
      console.error('Error getting professional status:', error.response?.data || error);
      return {
        isApprovedProfessional: false,
        suggestedRole: 'petOwner'
      };
    }
  };

  const signIn = async (token, refreshTokenValue, navigation) => {
    try {
      debugLog('MBA98765 Starting sign in process');

      await authService.current.setTokens(token, refreshTokenValue);
      setIsSignedIn(true);
      
      const status = await getProfessionalStatus(token);
      const initialRole = status.suggestedRole;
      
      setUserRole(initialRole);
      setIsApprovedProfessional(status.isApprovedProfessional);
      
      // Store the role
      if (Platform.OS === 'web') {
        sessionStorage.setItem('userRole', initialRole);
      } else {
        await AsyncStorage.setItem('userRole', initialRole);
      }

      debugLog('MBA98765 Sign in successful:', { initialRole, isApprovedProfessional: status.isApprovedProfessional });

      // Navigate to dashboard after successful sign in
      if (navigation) {
        setTimeout(() => {
          navigateToFrom(navigation, 'Dashboard', 'SignIn');
        }, 0);
      }

      return {
        userRole: initialRole,
        isApprovedProfessional: status.isApprovedProfessional
      };
    } catch (error) {
      if (is_DEBUG) {
        debugLog('MBA98765 Sign in error:', error);
      }
      console.error('Error during sign in:', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await authService.current.clearTokens();
      await AsyncStorage.multiRemove(['userRole', 'isApprovedProfessional']);
      await sessionStorage.removeItem('userRole');
      await sessionStorage.removeItem('isApprovedProfessional');
    } catch (error) {
      console.error('Error clearing storage:', error);
    }

    setIsSignedIn(false);
    setIsApprovedProfessional(false);
    setUserRole(null);
    setFirstName('');
    setName('');

    setTimeout(() => {
      if (Platform.OS === 'web') {
        sessionStorage.setItem('explicitSignOut', 'true');
      }
      navigate('SignIn');
    }, 0);
  };

  const switchRole = async () => {
    if (isApprovedProfessional) {
      if (is_DEBUG) {
        debugLog('MBA98765 Switching role, current role:', userRole);
      }
      const newRole = userRole === 'professional' ? 'petOwner' : 'professional';
      setUserRole(newRole);
      try {
        if (Platform.OS === "web") {
          sessionStorage.setItem('userRole', newRole);
        } else {
          await AsyncStorage.setItem('userRole', newRole);
        }
        
        if (is_DEBUG) {
          debugLog('MBA98765 Role switched to:', newRole);
        }
      } catch (error) {
        console.error('Error updating role in storage:', error);
      }
    } else {
      console.log('User is not an approved professional, cannot switch roles');
    }
  };

  const fetchTimeSettings = async () => {
    if (is_prototype) return;
    
    try {
      const token = await authService.current.getAccessToken();
      if (!token) {
        if (is_DEBUG) {
          debugLog('MBA98765 No token found for time settings');
        }
        return;
      }
      
      const response = await axios.get(`${API_BASE_URL}/api/users/v1/time-settings/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (is_DEBUG) {
        debugLog('MBA98765 Time settings response:', response.data);
      }
      
      setTimeSettings(response.data);
    } catch (error) {
      console.error('MBA98765 Error fetching time settings:', error.response ? error.response.data : error.message);
    }
  };

  const checkAuthStatus = async () => {
    try {
      const token = await authService.current.getAccessToken();
      if (!token) {
        return { isAuthenticated: false };
      }

      const isValid = await authService.current.validateToken(token);
      if (!isValid) {
        await signOut();
        return { isAuthenticated: false };
      }

      debugLog('MBA54321 checkAuthStatus', { isAuthenticated: true, userRole, isApprovedProfessional });

      return {
        isAuthenticated: true,
        userRole: userRole,
        isApprovedProfessional: isApprovedProfessional
      };
    } catch (error) {
      console.error('MBA98765 Error checking auth status:', error);
      return { isAuthenticated: false };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        isSignedIn,
        userRole,
        isApprovedProfessional,
        loading,
        screenWidth,
        firstName,
        name,
        is_prototype,
        is_DEBUG,
        is_PRODUCTION,
        timeSettings,
        isCollapsed,
        setIsCollapsed,
        signIn,
        signOut,
        switchRole,
        setIsDebug,
        setIsPrototype,
        checkAuthStatus,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
