import React, { createContext, useState, useEffect, useContext, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_BASE_URL } from '../config/config';
import { Dimensions, Platform } from 'react-native';
import { navigate } from '../../App';
import { navigateToFrom } from '../components/Navigation';
import { initStripe } from '../utils/StripeService';
import { getUserName, getTimeSettings } from '../api/API';

export const SCREEN_WIDTH = Dimensions.get('window').width;
export const SCREEN_HEIGHT = Dimensions.get('window').height;

// Create a debug logging utility
let debugEnabled = true;

export const setDebugEnabled = (enabled) => {
  debugEnabled = enabled;
};

export const debugLog = (message, ...data) => {
  if (debugEnabled && !message.includes('MBA3210')) {
    if (data.length > 0) {
      console.log(`${message}:`, ...data);
    } else {
      console.log(`${message}`);
    }
  }
};

// Authentication state management class with proper synchronization
class AuthService {
  constructor() {
    this.accessToken = null;
    this.refreshToken = null;
    this.isRefreshing = false;
    this.refreshSubscribers = [];
    this.tokenExpiryTime = null;
    this.lastValidation = null;
    this.authStateCallbacks = new Set();
    this.isSigningOut = false;
    this.lastTokenCheck = 0;
    
    // For testing - reduce refresh thresholds
    this.TOKEN_REFRESH_THRESHOLD = 10 * 1000; // 10 seconds - increased for safety buffer
    // This provides protection against:
    // 1. Slow backend responses (2-5 seconds)
    // 2. Network latency/timeouts
    // 3. High server load scenarios
    // Token refresh will start with 10s buffer, plenty of time for completion
    this.TOKEN_PREEMPTIVE_REFRESH = 3 * 1000; // 3 seconds for testing
    this.VALIDATION_CACHE_TIME = 30 * 1000; // 30 seconds cache
    
    // console.log('MBA1111 AuthService initialized with increased safety buffer (10s refresh threshold)');
  }

  // Register callback for auth state changes
  onAuthStateChange(callback) {
    this.authStateCallbacks.add(callback);
    return () => this.authStateCallbacks.delete(callback);
  }

  // Notify all callbacks of auth state changes
  notifyAuthStateChange(state) {
    debugLog('MBA1111 Notifying auth state change:', state);
    this.authStateCallbacks.forEach(callback => {
      try {
        callback(state);
      } catch (error) {
        console.error('MBA1111 Error in auth state callback:', error);
      }
    });
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
      console.error('MBA1111 Error parsing JWT:', error);
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

  // Check if we should refresh the token
  shouldRefreshToken(token) {
    if (!token) return false;
    
    const timeUntilExpiry = this.getTimeUntilExpiry(token);
    const shouldRefresh = timeUntilExpiry < this.TOKEN_REFRESH_THRESHOLD && timeUntilExpiry > 0;
    
    if (shouldRefresh) {
      debugLog(`MBA1111 Token should be refreshed - expires in ${Math.round(timeUntilExpiry/1000)} seconds`);
    }
    
    return shouldRefresh;
  }

  // Refresh JWT tokens
  async refreshTokens() {
    debugLog('MBA1111 refreshTokens called');
    
    try {
      // Prevent concurrent refresh attempts
      if (this.isRefreshing) {
        debugLog('MBA1111 Token refresh already in progress, subscribing');
        return new Promise((resolve, reject) => {
          this.refreshSubscribers.push({ resolve, reject });
          
          // Add timeout to prevent hanging forever
          setTimeout(() => {
            const index = this.refreshSubscribers.findIndex(sub => sub.resolve === resolve);
            if (index !== -1) {
              this.refreshSubscribers.splice(index, 1);
              reject(new Error('Token refresh timeout'));
            }
          }, 10000); // 10 second timeout
        });
      }
      
      this.isRefreshing = true;
      this.refreshSubscribers = [];
      
      if (!this.refreshToken) {
        throw new Error('No refresh token available');
      }
      
      // Check if refresh token is expired
      const refreshTokenExpiry = this.getTimeUntilExpiry(this.refreshToken);
      if (refreshTokenExpiry <= 0) {
        debugLog('MBA1111 Refresh token is expired, cannot refresh');
        throw new Error('Refresh token expired');
      }
      
      const refreshStartTime = Date.now();
      debugLog('MBA1111 Making refresh token request to backend');
      
      // Make the actual refresh request without using interceptors
      const response = await fetch(`${API_BASE_URL}/api/token/refresh/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          refresh: this.refreshToken
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        debugLog('MBA1111 Token refresh failed with status:', response.status, errorData);
        throw new Error(`Token refresh failed: ${response.status}`);
      }
      
      const data = await response.json();
      const { access, refresh } = data;
      
      if (!access) {
        throw new Error('No access token in refresh response');
      }
      
      this.accessToken = access;
      
      // Handle refresh token rotation if new refresh token is provided
      if (refresh) {
        debugLog('MBA1111 New refresh token received, updating stored refresh token');
        this.refreshToken = refresh;
        await setStorage('refreshToken', refresh);
      }
      
      // Store new access token
      await setStorage('userToken', access);
      
      const refreshDuration = Date.now() - refreshStartTime;
      debugLog(`MBA1111 Token refresh successful in ${refreshDuration}ms`);
      
      // Resolve all waiting requests
      this.refreshSubscribers.forEach(({ resolve }) => {
        try {
          resolve(access);
        } catch (error) {
          debugLog('MBA1111 Error resolving refresh subscriber:', error);
        }
      });
      
      return access;
      
    } catch (error) {
      debugLog('MBA1111 Token refresh failed:', error);
      
      // Reject all waiting requests
      this.refreshSubscribers.forEach(({ reject }) => {
        try {
          reject(error);
        } catch (err) {
          debugLog('MBA1111 Error rejecting refresh subscriber:', err);
        }
      });
      
      // Clear invalid tokens
      await this.clearTokens();
      throw error;
      
    } finally {
      this.isRefreshing = false;
      this.refreshSubscribers = [];
      debugLog('MBA1111 Token refresh process completed');
    }
  }

  // Get access token with automatic refresh
  async getAccessToken() {
    // If signing out, return null
    if (this.isSigningOut) {
      debugLog('MBA1111 getAccessToken: signing out, returning null');
      return null;
    }
    
    // Check if current token is expired
    if (this.accessToken) {
      const timeUntilExpiry = this.getTimeUntilExpiry(this.accessToken);
      if (timeUntilExpiry <= 0) {
        debugLog('MBA1111 getAccessToken: current token is expired, clearing it');
        this.accessToken = null;
      }
    }
    
    // If no access token but we have refresh token, try to refresh
    if (!this.accessToken && this.refreshToken) {
      debugLog('MBA1111 getAccessToken: no access token but have refresh token, attempting refresh');
      try {
        await this.refreshTokens();
      } catch (error) {
        debugLog('MBA1111 getAccessToken: failed to refresh token:', error);
        return null;
      }
    }
    
    // Check if current token needs refresh (but isn't expired yet)
    if (this.accessToken && this.shouldRefreshToken(this.accessToken)) {
      const timeUntilExpiry = this.getTimeUntilExpiry(this.accessToken);
      if (timeUntilExpiry > 0) {
        debugLog('MBA1111 getAccessToken: token needs refresh but still valid, attempting refresh');
        try {
          await this.refreshTokens();
        } catch (error) {
          debugLog('MBA1111 getAccessToken: failed to refresh token:', error);
          // If refresh fails but token is still valid, return current token
          if (this.getTimeUntilExpiry(this.accessToken) > 0) {
            debugLog('MBA1111 getAccessToken: refresh failed but token still valid, returning current token');
            return this.accessToken;
          }
          return null;
        }
      }
    }
    
    if (this.accessToken) {
      const timeUntilExpiry = this.getTimeUntilExpiry(this.accessToken);
      if (timeUntilExpiry > 0) {
        return this.accessToken;
      } else {
        debugLog('MBA1111 getAccessToken: token is expired, returning null');
        this.accessToken = null;
        return null;
      }
    } else {
      debugLog('MBA1111 getAccessToken: returning null, no token available');
      return null;
    }
  }

  // Validate token with caching
  async validateToken(token) {
    const now = Date.now();
    
    // Use client-side validation for recent checks
    if (this.lastValidation && now - this.lastValidation < this.VALIDATION_CACHE_TIME) {
      debugLog('MBA1111 Using cached token validation');
      const timeUntilExpiry = this.getTimeUntilExpiry(token);
      return timeUntilExpiry > 0;
    }
    
    debugLog('MBA1111 Performing server-side token validation');
    try {
      const response = await axios.post(`${API_BASE_URL}/api/token/verify/`, {
        token: token
      });

      this.lastValidation = now;
      // debugLog('MBA1111 Token validation successful');
      return response.status === 200;
    } catch (error) {
      debugLog('MBA1111 Token validation failed:', error.response?.status);
      return false;
    }
  }

  // Clear tokens from storage
  async clearTokens() {
    debugLog('MBA1111 Clearing tokens');
    try {
      if (Platform.OS === 'web') {
        sessionStorage.removeItem('userToken');
        sessionStorage.removeItem('refreshToken');
      } else {
        await AsyncStorage.multiRemove(['userToken', 'refreshToken']);
      }
      this.accessToken = null;
      this.refreshToken = null;
      
      debugLog('MBA1111 Tokens cleared successfully');
    } catch (error) {
      console.error('MBA1111 Error clearing tokens:', error);
    }
  }

  // Set tokens in storage
  async setTokens(accessToken, refreshToken) {
    debugLog('MBA1111 Setting tokens');
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
      
      debugLog('MBA1111 Tokens set successfully');
    } catch (error) {
      console.error('MBA1111 Error setting tokens:', error);
      throw error;
    }
  }

  // Initialize auth service
  async initialize() {
    debugLog('MBA1111 Starting AuthService.initialize()');
    try {
      let accessToken, refreshToken;
      
      accessToken = await getStorage('userToken');
      refreshToken = await getStorage('refreshToken');
      
      this.accessToken = accessToken;
      this.refreshToken = refreshToken;

      debugLog('MBA1111 Tokens retrieved:', {
        hasAccessToken: !!this.accessToken,
        hasRefreshToken: !!this.refreshToken
      });
      
      // Check if token needs immediate refresh
      if (this.accessToken && this.shouldRefreshToken(this.accessToken)) {
        debugLog('MBA1111 Token needs refresh during init');
        try {
          await this.refreshTokens();
        } catch (err) {
          debugLog('MBA1111 Failed to refresh token during init:', err);
        }
      }

      return {
        hasAccessToken: !!this.accessToken,
        hasRefreshToken: !!this.refreshToken
      };
    } catch (error) {
      console.error('MBA1111 Error in AuthService.initialize():', error);
      return { hasAccessToken: false, hasRefreshToken: false };
    }
  }

  // Force sign out with reason
  forceSignOut(reason) {
    if (this.isSigningOut) return;
    
    debugLog(`MBA1111 Force sign out triggered. Reason: ${reason}`);
    this.isSigningOut = true;
    
    // Notify auth state change
    this.notifyAuthStateChange({
      type: 'FORCE_SIGN_OUT',
      reason: reason,
      timestamp: new Date().toISOString()
    });
  }
}

export const AuthContext = createContext();

// Storage helper functions
export const getStorage = async (key) => {
  try {
    if (Platform.OS === 'web') {
      const value = sessionStorage.getItem(key);
      // debugLog('MBA1111 getStorage web:', { key, hasValue: !!value });
      return value;
    } else {
      const value = await AsyncStorage.getItem(key);
      // debugLog('MBA1111 getStorage mobile:', { key, hasValue: !!value });
      return value;
    }
  } catch (error) {
    console.error('MBA1111 Error getting from storage:', error);
    return null;
  }
};

export const setStorage = async (key, value) => {
  try {
    if (Platform.OS === 'web') {
      sessionStorage.setItem(key, value);
      debugLog('MBA1111 setStorage web:', { key, value });
    } else {
      await AsyncStorage.setItem(key, value);
      debugLog('MBA1111 setStorage mobile:', { key, value });
    }
  } catch (error) {
    console.error('MBA1111 Error setting storage:', error);
  }
};

// Production flag
const is_PRODUCTION = false;

export const IsProduction = () => {
  return is_PRODUCTION;
};

export const AuthProvider = ({ children }) => {
  const authService = useRef(new AuthService());
  const isInitializedRef = useRef(false);
  const signOutTimeoutRef = useRef(null);
  
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

  // Sign out function with comprehensive cleanup and reason tracking
  const signOut = async (reason = 'user_action') => {
    debugLog('MBA1111 signOut called with reason:', reason);
    
    try {
      // Prevent concurrent sign out operations
      if (authService.current.isSigningOut) {
        debugLog('MBA1111 Sign out already in progress, skipping');
        return;
      }
      
      authService.current.isSigningOut = true;
      
      // Clear any pending sign out
      if (signOutTimeoutRef.current) {
        clearTimeout(signOutTimeoutRef.current);
        signOutTimeoutRef.current = null;
      }
      
      // Close websocket connection first
      try {
        const websocketManager = (await import('../utils/websocket')).default;
        websocketManager.disconnect();
        debugLog('MBA1111 WebSocket disconnected during signOut');
      } catch (error) {
        debugLog('MBA1111 Error disconnecting websocket:', error);
      }
      
      // Clear tokens and storage
      await authService.current.clearTokens();
      await AsyncStorage.multiRemove(['userRole', 'isApprovedProfessional']);
      
      // Clear sessionStorage items for web
      if (Platform.OS === 'web') {
        sessionStorage.removeItem('userRole');
        sessionStorage.removeItem('isApprovedProfessional');
        sessionStorage.removeItem('currentProfessional');
        sessionStorage.setItem('explicitSignOut', 'true');
      }
      
      debugLog('MBA1111 Storage cleared during sign out');
      
      // Reset all auth state
      setIsSignedIn(false);
      setFirstName('');
      setName('');
      setUserRole(null);
      setIsApprovedProfessional(false);
      setTimeSettings({
        timezone: 'UTC',
        timezone_abbrev: 'UTC',
        use_military_time: false
      });
      
      // Clear auth service state
      authService.current.accessToken = null;
      authService.current.refreshToken = null;
      
      // Navigate to sign in
      setTimeout(() => {
        navigate('SignIn');
      }, 0);
      
      debugLog('MBA1111 Sign out completed successfully');
      
    } catch (error) {
      debugLog('MBA1111 Error during sign out:', error);
    } finally {
      authService.current.isSigningOut = false;
    }
  };

  // Listen for auth state changes from AuthService
  useEffect(() => {
    const unsubscribe = authService.current.onAuthStateChange((state) => {
      debugLog('MBA1111 Auth state change received:', state);
      
      if (state.type === 'FORCE_SIGN_OUT') {
        // Clear the signing out flag and trigger sign out
        authService.current.isSigningOut = false;
        signOut(state.reason);
      }
    });

    return unsubscribe;
  }, []);

  // Set up axios interceptors with consolidated error handling
  useEffect(() => {
    debugLog('MBA1111 Setting up consolidated axios interceptors');
    
    // Circuit breaker for 401 errors
    let consecutiveAuth401Errors = 0;
    const MAX_401_RETRIES = 3;
    
    const requestInterceptor = axios.interceptors.request.use(
      async (config) => {
        // debugLog(`MBA1111 Request interceptor called for: ${config.method?.toUpperCase()} ${config.url}`);
        
        if (!is_prototype) {
          try {
            const token = await authService.current.getAccessToken();
            if (token) {
              config.headers.Authorization = `Bearer ${token}`;
              // debugLog(`MBA1111 Token added to request: ${config.method?.toUpperCase()} ${config.url}`);
            } else {
              debugLog(`MBA1111 No token available for request: ${config.method?.toUpperCase()} ${config.url}`);
            }
          } catch (error) {
            console.error('MBA1111 Error getting access token for request:', error);
            debugLog(`MBA1111 Token error for request: ${config.method?.toUpperCase()} ${config.url}`, error);
          }
        } else {
          debugLog(`MBA1111 Prototype mode - skipping token for: ${config.method?.toUpperCase()} ${config.url}`);
        }
        
        return config;
      },
      (error) => {
        debugLog('MBA1111 Request interceptor error:', error);
        return Promise.reject(error);
      }
    );

    const responseInterceptor = axios.interceptors.response.use(
      (response) => {
        // debugLog(`MBA1111 Response success: ${response.status} ${response.config.method?.toUpperCase()} ${response.config.url}`);
        // Reset circuit breaker on successful response
        consecutiveAuth401Errors = 0;
        return response;
      },
      async (error) => {
        const originalRequest = error.config;
        debugLog(`MBA1111 Response error: ${error.response?.status} ${error.config.method?.toUpperCase()} ${error.config.url}`);
        
        // Handle 401 errors with circuit breaker
        if (error.response?.status === 401 && !originalRequest._retry) {
          consecutiveAuth401Errors++;
          debugLog(`MBA1111 401 error detected (${consecutiveAuth401Errors}/${MAX_401_RETRIES}), attempting token refresh`);
          
          // Circuit breaker: Stop trying after too many consecutive failures
          if (consecutiveAuth401Errors >= MAX_401_RETRIES) {
            debugLog('MBA1111 Circuit breaker triggered: Too many consecutive 401 errors, forcing sign out');
            authService.current.forceSignOut('too_many_auth_failures');
            return Promise.reject(error);
          }
          
          originalRequest._retry = true;
          
          try {
            // Skip auth logging calls to prevent infinite loops
            const isAuthLoggingCall = originalRequest.url?.includes('/api/core/log-auth-event/');
            
            if (!isAuthLoggingCall) {
              // Only attempt refresh for non-logging calls
              debugLog('MBA1111 Attempting token refresh for failed request');
              
              // Add timeout to token refresh
              const refreshPromise = authService.current.refreshTokens();
              const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Token refresh timeout')), 8000)
              );
              
              await Promise.race([refreshPromise, timeoutPromise]);
              
              // Retry original request with new token
              const newToken = await authService.current.getAccessToken();
              if (newToken) {
                originalRequest.headers.Authorization = `Bearer ${newToken}`;
                debugLog('MBA1111 Retrying request with new token');
                return axios(originalRequest);
              } else {
                debugLog('MBA1111 No new token available after refresh');
                throw new Error('No token available after refresh');
              }
            } else {
              // For auth logging calls, just fail silently
              debugLog('MBA1111 Auth logging call failed, not retrying to prevent loops');
              throw error;
            }
          } catch (refreshError) {
            debugLog('MBA1111 Token refresh failed:', refreshError);
            
            // If this was a timeout or repeated failure, force sign out
            if (refreshError.message.includes('timeout') || consecutiveAuth401Errors >= 2) {
              debugLog('MBA1111 Token refresh timeout or repeated failure, forcing sign out');
              authService.current.forceSignOut('token_refresh_failed');
            }
            
            throw error;
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

  // Window focus handling with proper debouncing
  useEffect(() => {
    if (!isSignedIn || is_prototype) return;
    
    let focusCheckTimeout = null;
    
    const handleWindowFocus = () => {
      // Clear any pending check
      if (focusCheckTimeout) {
        clearTimeout(focusCheckTimeout);
      }
      
      // Debounce the focus check
      focusCheckTimeout = setTimeout(async () => {
        // debugLog('MBA1111 Window regained focus, checking token');
        
        if (authService.current && !authService.current.isSigningOut) {
          const token = authService.current.accessToken;
          if (token && authService.current.shouldRefreshToken(token)) {
            debugLog('MBA1111 Token needs refresh on focus');
            try {
              await authService.current.refreshTokens();
            } catch (error) {
              debugLog('MBA1111 Error refreshing token on focus:', error);
            }
          }
        }
      }, 500); // 500ms debounce
    };
    
    // Set up event listeners only for web
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.addEventListener('focus', handleWindowFocus);
      
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          handleWindowFocus();
        }
      });
    }
    
    return () => {
      if (focusCheckTimeout) {
        clearTimeout(focusCheckTimeout);
      }
      
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
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
        debugLog('MBA1111 Initializing auth state');
        const { hasAccessToken, hasRefreshToken } = await authService.current.initialize();
        
        if (hasAccessToken || hasRefreshToken) {
          const token = await authService.current.getAccessToken();
          if (token) {
            const isValid = await authService.current.validateToken(token);
            if (isValid) {
              setIsSignedIn(true);
              await fetchUserName();
              const status = await getProfessionalStatus(token);
              
              // Check for stored user role preference first
              let storedRole = null;
              try {
                storedRole = await getStorage('userRole');
              } catch (error) {
                console.error('MBA1111 Error getting stored role:', error);
              }
              
              // Use stored role if valid, otherwise use suggested role
              const finalRole = (storedRole && (storedRole === 'professional' || storedRole === 'petOwner')) 
                ? storedRole 
                : status.suggestedRole;
              
              debugLog('MBA1111 Role selection:', { 
                storedRole, 
                suggestedRole: status.suggestedRole, 
                finalRole,
                isApprovedProfessional: status.isApprovedProfessional 
              });
              
              setUserRole(finalRole);
              setIsApprovedProfessional(status.isApprovedProfessional);
              await fetchTimeSettings();
            } else {
              await signOut('token_validation_failed');
            }
          } else {
            await signOut('no_valid_token');
          }
        } else {
          // No tokens available - this is normal for new users
          debugLog('MBA1111 No tokens found during initialization');
        }
      } catch (error) {
        console.error('MBA1111 Error initializing auth state:', error);
        await signOut('initialization_error');
      } finally {
        setLoading(false);
        isInitializedRef.current = true;
      }
    };

    init();
  }, []);

  // Fetch user name
  const fetchUserName = async () => {
    try {
      debugLog('MBA1111 Fetching user name');
      const userData = await getUserName();
      debugLog('MBA1111 User name response:', userData);
      setFirstName(userData.first_name);
      setName(userData.name);
    } catch (error) {
      console.error('MBA1111 Error fetching user name:', error.response ? error.response.data : error.message);
      setFirstName('');
      setName('');
    }
  };

  // Get professional status
  const getProfessionalStatus = async (token) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/professional-status/v1/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      debugLog('MBA1111 Professional status response:', response.data);

      const { is_approved } = response.data;
      
      setIsApprovedProfessional(is_approved);
      if (Platform.OS === 'web') {
        sessionStorage.setItem('isApprovedProfessional', String(is_approved));
      } else {
        await AsyncStorage.setItem('isApprovedProfessional', String(is_approved));
      }

      return {
        isApprovedProfessional: is_approved,
        suggestedRole: is_approved ? 'professional' : 'petOwner'
      };
    } catch (error) {
      console.error('MBA1111 Error getting professional status:', error.response?.data || error);
      return {
        isApprovedProfessional: false,
        suggestedRole: 'petOwner'
      };
    }
  };

  // Sign in function
  const signIn = async (token, refreshTokenValue, navigation) => {
    try {
      debugLog('MBA1111 Starting sign in process');

      // Clear signing out flag
      authService.current.isSigningOut = false;
      
      await authService.current.setTokens(token, refreshTokenValue);
      setIsSignedIn(true);
      
      // Fetch user name immediately after setting tokens
      await fetchUserName();
      
      // Fetch time settings immediately to ensure they're available
      try {
        const timeSettingsData = await getTimeSettings();
        setTimeSettings(timeSettingsData);
        debugLog('MBA1111 Time settings fetched during sign in:', timeSettingsData);
      } catch (timeError) {
        console.error('MBA1111 Error fetching time settings during sign in:', timeError);
      }
      
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

      debugLog('MBA1111 Sign in successful:', { initialRole, isApprovedProfessional: status.isApprovedProfessional });

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
      debugLog('MBA1111 Sign in error:', error);
      console.error('MBA1111 Error during sign in:', error);
      throw error;
    }
  };

  // Switch role function
  const switchRole = async (navigation) => {
    if (isApprovedProfessional) {
      debugLog('MBA1111 Switching role, current role:', userRole);
      
      const newRole = userRole === 'professional' ? 'petOwner' : 'professional';
      setUserRole(newRole);
      try {
        if (Platform.OS === "web") {
          sessionStorage.setItem('userRole', newRole);
        } else {
          await AsyncStorage.setItem('userRole', newRole);
        }
        
        // Navigate to Dashboard if switching to pet owner from Connections screen
        const currentRoute = navigation?.getCurrentRoute?.()?.name;
        if (newRole === 'petOwner' && currentRoute === 'Connections') {
          debugLog('MBA1111 Navigating to Dashboard from Connections when switching to pet owner');
          navigate('Dashboard');
        }
        
        debugLog('MBA1111 Role switched to:', newRole);
      } catch (error) {
        console.error('MBA1111 Error updating role in storage:', error);
      }
    } else {
      console.log('MBA1111 User is not an approved professional, cannot switch roles');
    }
  };

  // Fetch time settings
  const fetchTimeSettings = async () => {
    if (is_prototype) return;
    
    try {
      const settings = await getTimeSettings();
      setTimeSettings(settings);
      debugLog('MBA1111 Time settings response:', settings);
    } catch (error) {
      console.error('MBA1111 Error fetching time settings:', error.response ? error.response.data : error.message);
    }
  };

  // Check auth status
  const checkAuthStatus = async () => {
    try {
      const token = await authService.current.getAccessToken();
      if (!token) {
        return { isAuthenticated: false };
      }

      const isValid = await authService.current.validateToken(token);
      if (!isValid) {
        await signOut('auth_status_check_failed');
        return { isAuthenticated: false };
      }

      debugLog('MBA1111 checkAuthStatus', { isAuthenticated: true, userRole, isApprovedProfessional });

      return {
        isAuthenticated: true,
        userRole: userRole,
        isApprovedProfessional: isApprovedProfessional
      };
    } catch (error) {
      console.error('MBA1111 Error checking auth status:', error);
      return { isAuthenticated: false };
    }
  };

  // Screen width handling
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

  // State consistency checker
  useEffect(() => {
    if (loading || is_prototype) return;
    
    const checkStateConsistency = async () => {
      try {
        const hasStoredTokens = !!(await getStorage('userToken')) || !!(await getStorage('refreshToken'));
        const hasMemoryTokens = !!(authService.current.accessToken) || !!(authService.current.refreshToken);
        
        // debugLog('MBA1111 State consistency check:', {
        //   isSignedIn,
        //   hasStoredTokens,
        //   hasMemoryTokens,
        //   isSigningOut: authService.current.isSigningOut
        // });
        
        // If we think user is signed in but no tokens exist anywhere
        if (isSignedIn && !hasStoredTokens && !hasMemoryTokens && !authService.current.isSigningOut) {
          debugLog('MBA1111 STATE INCONSISTENCY DETECTED: UI shows signed in but no tokens exist');
          await signOut('state_inconsistency_no_tokens');
          return;
        }
        
        // If we think user is not signed in but tokens exist
        if (!isSignedIn && (hasStoredTokens || hasMemoryTokens) && !authService.current.isSigningOut) {
          debugLog('MBA1111 STATE INCONSISTENCY DETECTED: UI shows signed out but tokens exist');
          
          // Try to restore the session
          try {
            const token = await authService.current.getAccessToken();
            if (token) {
              const isValid = await authService.current.validateToken(token);
              if (isValid) {
                debugLog('MBA1111 Restoring session with valid tokens');
                
                setIsSignedIn(true);
                await fetchUserName();
                const status = await getProfessionalStatus(token);
                setUserRole(status.suggestedRole);
                setIsApprovedProfessional(status.isApprovedProfessional);
                return;
              }
            }
          } catch (error) {
            debugLog('MBA1111 Failed to restore session:', error);
          }
          
          // If restoration failed, clear everything
          await signOut('state_inconsistency_invalid_tokens');
        }
      } catch (error) {
        debugLog('MBA1111 Error in state consistency check:', error);
      }
    };
    
    // Run initial check after a delay
    const initialCheck = setTimeout(checkStateConsistency, 2000);
    
    // Run periodic checks every 30 seconds
    const consistencyInterval = setInterval(checkStateConsistency, 30000);
    
    return () => {
      clearTimeout(initialCheck);
      clearInterval(consistencyInterval);
    };
  }, [isSignedIn, loading, is_prototype]);

  // Token refresh monitoring with PROACTIVE refresh triggers
  useEffect(() => {
    if (!isSignedIn || is_prototype) return;
    
    const monitorAndRefreshToken = async () => {
      try {
        // Get the current token (this will automatically refresh if needed)
        const token = await authService.current.getAccessToken();
        
        if (token) {
          const timeUntilExpiry = authService.current.getTimeUntilExpiry(token);
          const shouldRefresh = authService.current.shouldRefreshToken(token);
          
          if (timeUntilExpiry < 0) {
            debugLog('MBA1111 TOKEN EXPIRED DETECTED in monitor');
          }
          
          // PROACTIVE REFRESH: If token should be refreshed, trigger it now
          if (shouldRefresh && !authService.current.isRefreshing) {
            debugLog('MBA1111 Token monitor triggering proactive refresh');
            try {
              await authService.current.refreshTokens();
              debugLog('MBA1111 Proactive token refresh completed successfully');
            } catch (error) {
              debugLog('MBA1111 Proactive token refresh failed:', error);
            }
          }
        } else {
          debugLog('MBA1111 Token monitor: No token available');
        }
      } catch (error) {
        debugLog('MBA1111 Error in token monitor:', error);
      }
    };
    
    // Monitor every 2 seconds during testing
    const monitorInterval = setInterval(monitorAndRefreshToken, 2000);
    
    return () => clearInterval(monitorInterval);
  }, [isSignedIn, is_prototype]);

  // Debug function to check token status
  const debugTokenStatus = () => {
    const token = authService.current.accessToken;
    if (!token) {
      debugLog('MBA1111 No access token available');
      return;
    }
    
    const timeUntilExpiry = authService.current.getTimeUntilExpiry(token);
    const isExpired = timeUntilExpiry <= 0;
    const shouldRefresh = authService.current.shouldRefreshToken(token);
    
    debugLog('MBA1111 Token status:', {
      hasToken: !!token,
      timeUntilExpirySeconds: Math.round(timeUntilExpiry / 1000),
      isExpired,
      shouldRefresh,
      isRefreshing: authService.current.isRefreshing,
      isSigningOut: authService.current.isSigningOut
    });
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
        fetchTimeSettings,
        debugTokenStatus,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
