import React, { createContext, useState, useEffect, useContext, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_BASE_URL } from '../config/config';
import { Dimensions, Platform } from 'react-native';
import { navigate } from '../../App';
import { navigateToFrom } from '../components/Navigation';
import { initStripe } from '../utils/StripeService';
import { getUserName, getTimeSettings } from '../api/API';
import platformNavigation from '../utils/platformNavigation';

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
      if (!token || typeof token !== 'string') {
        debugLog('MBA1111 parseJwt: Invalid token provided');
        return null;
      }
      
      const parts = token.split('.');
      if (parts.length !== 3) {
        debugLog('MBA1111 parseJwt: Token does not have 3 parts');
        return null;
      }
      
      const base64Url = parts[1];
      if (!base64Url) {
        debugLog('MBA1111 parseJwt: No payload part found');
        return null;
      }
      
      let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      
      // Add padding if needed
      const padding = base64.length % 4;
      if (padding) {
        base64 += '='.repeat(4 - padding);
      }
      
      // Decode base64 using platform-appropriate method
      let decoded;
      if (Platform.OS === 'web') {
        // Use browser's atob
        decoded = atob(base64);
      } else {
        // React Native - use built-in base64 support through global atob or Buffer
        try {
          if (typeof atob !== 'undefined') {
            decoded = atob(base64);
          } else if (typeof global !== 'undefined' && global.atob) {
            decoded = global.atob(base64);
          } else {
            // Fallback - this should not be needed in modern RN
            debugLog('MBA1111 parseJwt: No base64 decode method available');
            return null;
          }
        } catch (e) {
          debugLog('MBA1111 parseJwt: Error during base64 decode:', e);
          throw e;
        }
      }
      
      return JSON.parse(decoded);
      
    } catch (error) {
      console.error('MBA1111 Error parsing JWT:', error);
      debugLog('MBA1111 parseJwt error details:', {
        tokenLength: token ? token.length : 0,
        tokenStart: token ? token.substring(0, 50) : 'null',
        errorMessage: error.message,
        errorStack: error.stack
      });
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
    try {
      if (Platform.OS === 'web') {
        // Clear from sessionStorage (original behavior)
        sessionStorage.removeItem('userToken');
        sessionStorage.removeItem('refreshToken');
      } else {
        await AsyncStorage.multiRemove(['userToken', 'refreshToken']);
      }
      this.accessToken = null;
      this.refreshToken = null;
    } catch (error) {
      console.error('MBA2ounf4f Error clearing tokens:', error);
    }
  }

  // Set tokens in storage
  async setTokens(accessToken, refreshToken) {
    try {
      this.accessToken = accessToken;
      this.refreshToken = refreshToken;

      if (Platform.OS === 'web') {
        // Use sessionStorage for web (original behavior)
        sessionStorage.setItem('userToken', accessToken);
        sessionStorage.setItem('refreshToken', refreshToken);
      } else {
        await AsyncStorage.multiSet([
          ['userToken', accessToken],
          ['refreshToken', refreshToken]
        ]);
      }
    } catch (error) {
      console.error('MBA1111 Error setting tokens:', error);
      throw error;
    }
  }

  // Validate JWT format without full parsing
  isValidJWT(token) {
    if (!token || typeof token !== 'string') return false;
    
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    
    // Check if each part has content
    return parts.every(part => part && part.length > 0);
  }

  // Initialize auth service
  async initialize() {
    debugLog('MBA2ounf4f Starting AuthService.initialize()');
    try {
      let accessToken, refreshToken;
      
      debugLog('MBA2ounf4f Attempting to get stored tokens');
      accessToken = await getStorage('userToken');
      refreshToken = await getStorage('refreshToken');
      
      debugLog('MBA2ounf4f Raw tokens retrieved:', {
        accessTokenExists: !!accessToken,
        refreshTokenExists: !!refreshToken,
        accessTokenLength: accessToken ? accessToken.length : 0,
        refreshTokenLength: refreshToken ? refreshToken.length : 0,
        accessTokenStart: accessToken ? accessToken.substring(0, 20) + '...' : 'null',
        refreshTokenStart: refreshToken ? refreshToken.substring(0, 20) + '...' : 'null'
      });
      
      // Validate tokens before using them
      if (accessToken && !this.isValidJWT(accessToken)) {
        debugLog('MBA2ounf4f Invalid access token found, clearing it', {
          tokenLength: accessToken.length,
          tokenStart: accessToken.substring(0, 20)
        });
        accessToken = null;
        await setStorage('userToken', '');
      }
      
      if (refreshToken && !this.isValidJWT(refreshToken)) {
        debugLog('MBA2ounf4f Invalid refresh token found, clearing it', {
          tokenLength: refreshToken.length,
          tokenStart: refreshToken.substring(0, 20)
        });
        refreshToken = null;
        await setStorage('refreshToken', '');
      }
      
      this.accessToken = accessToken;
      this.refreshToken = refreshToken;

      debugLog('MBA2ounf4f Tokens retrieved and validated:', {
        hasAccessToken: !!this.accessToken,
        hasRefreshToken: !!this.refreshToken
      });
      
      // Check if token needs immediate refresh
      if (this.accessToken && this.shouldRefreshToken(this.accessToken)) {
        debugLog('MBA2ounf4f Token needs refresh during init');
        try {
          await this.refreshTokens();
        } catch (err) {
          debugLog('MBA2ounf4f Failed to refresh token during init:', err);
        }
      }

      return {
        hasAccessToken: !!this.accessToken,
        hasRefreshToken: !!this.refreshToken
      };
    } catch (error) {
      console.error('MBA2ounf4f Error in AuthService.initialize():', error);
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

// Storage helper functions with platform-specific persistence strategies
export const getStorage = async (key) => {
  try {
    if (Platform.OS === 'web') {
      // For authentication tokens on web, use sessionStorage for session persistence (original behavior)
      // For other data, check both sessionStorage and localStorage
      if (key === 'userToken' || key === 'refreshToken') {
        const value = sessionStorage.getItem(key);
        return value;
      } else {
        // For non-auth data, prefer sessionStorage but fallback to localStorage
        const sessionValue = sessionStorage.getItem(key);
        if (sessionValue) {
          return sessionValue;
        }
        const localValue = localStorage.getItem(key);
        return localValue;
      }
    } else {
      const value = await AsyncStorage.getItem(key);
      return value;
    }
  } catch (error) {
    console.error('MBA2ounf4f Error getting from storage:', error);
    return null;
  }
};

export const setStorage = async (key, value) => {
  try {
    if (Platform.OS === 'web') {
      // For authentication tokens on web, use sessionStorage (original behavior)
      if (key === 'userToken' || key === 'refreshToken') {
        sessionStorage.setItem(key, value);
      } else {
        // For other data, use sessionStorage
        sessionStorage.setItem(key, value);
      }
    } else {
      await AsyncStorage.setItem(key, value);
    }
  } catch (error) {
    console.error('MBA2ounf4f Error setting storage:', error);
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
  const [isInitialized, setIsInitialized] = useState(false);
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
  // Platform-aware redirect effect for users without tokens on protected routes
  // NOTE: Only run this on mobile - web uses React Navigation linking for route protection
  useEffect(() => {
    // Skip redirect logic entirely on web - React Navigation linking handles it
    if (Platform.OS === 'web') {
      return;
    }
    
    // Don't check for redirects until auth has been initialized
    if (!isInitializedRef.current) {
      debugLog('MBA1111 AUTH REDIRECT: Auth not yet initialized, skipping redirect check');
      return;
    }
    
    if (!loading && !isSignedIn) {
      try {
        // Get current route information using platform navigation
        const currentRouteInfo = platformNavigation.getCurrentRoute();
        
        // Safety check: ensure currentRouteInfo is valid
        if (!currentRouteInfo) {
          debugLog('MBA1111 AUTH REDIRECT: currentRouteInfo is null/undefined, skipping redirect check');
          return;
        }
      
      // Handle platform-specific route checking (mobile only now)
      let isOnProtectedRoute = false;
      
      // This should never execute on web due to early return above, but keeping for safety
      if (Platform.OS === 'web') {
        const currentPath = currentRouteInfo.path;
        
        debugLog(`MBA1111 AUTH REDIRECT WEB: Full URL: ${currentRouteInfo.href || 'N/A'}`);
        debugLog(`MBA1111 AUTH REDIRECT WEB: Route name: ${currentRouteInfo.name}`);
        debugLog(`MBA1111 AUTH REDIRECT WEB: Path: ${currentPath}`);
        
        // List of protected paths for web
        const protectedWebPaths = [
          '/Dashboard',
          '/MyProfile', 
          '/my-profile',
          '/MessageHistory',
          '/message-history',
          '/OwnerHistory',
          '/BecomeProfessional',
          '/become-professional',
          '/More',
          '/Owners',
          '/AvailabilitySettings',
          '/Settings',
          '/ProfessionalSettings',
          '/ProfessionalProfile',
          '/MyContracts',
          '/ChangePassword',
          '/change-password',
          '/MyBookings',
          '/ServiceManager',
          '/service-manager',
          '/TestToast',
          '/Connections',
          '/connections'
        ];
        
        // Check if current path matches any protected path
        isOnProtectedRoute = protectedWebPaths.some(path => {
          const matches = currentPath.startsWith(path) || currentPath === path;
          if (matches) {
            debugLog(`MBA1111 AUTH REDIRECT WEB: Matched protected path ${path} with current path ${currentPath}`);
          }
          return matches;
        });
      } else {
        // Mobile apps: use route names instead of paths
        const currentRouteName = currentRouteInfo.name;
        
        debugLog(`MBA1111 AUTH REDIRECT MOBILE: Route name: ${currentRouteName}`);
        
        // List of protected route names for mobile
        const protectedMobileRoutes = [
          'Dashboard',
          'MyProfile',
          'MessageHistory',
          'OwnerHistory',
          'BecomeProfessional',
          'More',
          'Owners',
          'AvailabilitySettings',
          'Settings',
          'ProfessionalSettings',
          'ProfessionalProfile',
          'MyContracts',
          'ChangePassword',
          'MyBookings',
          'ServiceManager',
          'TestToast',
          'Connections'
        ];
        
        // Check if current route name matches any protected route
        isOnProtectedRoute = protectedMobileRoutes.includes(currentRouteName);
        
        if (isOnProtectedRoute) {
          debugLog(`MBA1111 AUTH REDIRECT MOBILE: On protected route ${currentRouteName}`);
        }
      }
      
      if (isOnProtectedRoute) {
        debugLog(`MBA1111 AUTH REDIRECT: User not signed in on protected route, redirecting to SignIn`);
        
        // Use platform navigation for redirect
        try {
          // First try using existing navigate function
          navigate('SignIn');
          debugLog('MBA1111 AUTH REDIRECT: Navigation to SignIn successful');
        } catch (error) {
          debugLog('MBA1111 AUTH REDIRECT: Navigation failed, using platform navigation fallback:', error);
          // Fallback to platform navigation redirect
          platformNavigation.redirectToSignIn(null);
        }
      } else {
        debugLog(`MBA1111 AUTH REDIRECT: Current route is not protected, no redirect needed`);
      }
      } catch (error) {
        debugLog('MBA1111 AUTH REDIRECT: Error during redirect check:', error);
        // Don't crash the app, just log the error and continue
      }
    } else {
      if (loading) {
        debugLog('MBA1111 AUTH REDIRECT: Still loading, skipping redirect check');
      }
      if (isSignedIn) {
        debugLog('MBA1111 AUTH REDIRECT: User is signed in, no redirect needed');
      }
    }
  }, [isSignedIn, loading]);

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
      
      // For token expiry or validation failures, immediately set signed out state
      // to prevent user from seeing stale content
      if (reason.includes('validation') || reason.includes('expired') || reason.includes('no_valid')) {
        debugLog('MBA1111 Immediate state update for auth failure');
        setIsSignedIn(false);
        setLoading(false); // Ensure loading is false so redirect can happen
      }
      
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
      
      // Clear all storage items for web (both localStorage and sessionStorage)
      if (Platform.OS === 'web') {
        // Clear from localStorage
        localStorage.removeItem('userRole');
        localStorage.removeItem('isApprovedProfessional');
        localStorage.removeItem('currentProfessional');
        localStorage.removeItem('userToken');
        localStorage.removeItem('refreshToken');
        
        // Clear from sessionStorage
        sessionStorage.removeItem('userRole');
        sessionStorage.removeItem('isApprovedProfessional');
        sessionStorage.removeItem('currentProfessional');
        sessionStorage.removeItem('userToken');
        sessionStorage.removeItem('refreshToken');
        // Mark as explicit sign out for web
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
      
      // Navigate to sign in with platform-specific handling
      const navigateToSignIn = () => {
        try {
          debugLog('MBA1111 Navigating to SignIn screen due to:', reason);
          
          if (Platform.OS === 'web') {
            // For web, use direct URL navigation to avoid conflicts with React Navigation
            if (typeof window !== 'undefined' && window.location) {
              window.location.href = '/signin';
              debugLog('MBA1111 Web redirect to /signin successful');
            } else {
              // Fallback to navigate function
              navigate('SignIn');
            }
          } else {
            // For mobile, use React Navigation
            navigate('SignIn');
          }
        } catch (navError) {
          console.error('MBA1111 Navigation error during signOut:', navError);
          // Final fallback: use platform navigation
          try {
            platformNavigation.redirectToSignIn(null);
          } catch (fallbackError) {
            console.error('MBA1111 Platform navigation fallback also failed:', fallbackError);
          }
        }
      };
      
      // For auth failures, navigate immediately
      if (reason.includes('validation') || reason.includes('expired') || reason.includes('no_valid') || reason.includes('server_validation')) {
        debugLog('MBA1111 Immediate navigation for auth failure');
        navigateToSignIn();
      } else {
        // For user-initiated sign outs, small delay
        setTimeout(navigateToSignIn, 0);
      }
      
      debugLog('MBA1111 Sign out completed successfully');
      
    } catch (error) {
      debugLog('MBA1111 Error during sign out:', error);
      
      // Even if there's an error, ensure we're in signed out state
      setIsSignedIn(false);
      setLoading(false);
      
      // Try to navigate anyway
      try {
        navigate('SignIn');
      } catch (navError) {
        console.error('MBA1111 Failed to navigate after signOut error:', navError);
      }
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
    
    // Circuit breaker for 401 errors with enhanced tracking
    let consecutiveAuth401Errors = 0;
    let lastErrorTime = 0;
    const MAX_401_RETRIES = 3;
    const ERROR_RESET_TIME = 60000; // Reset error count after 1 minute
    
    const requestInterceptor = axios.interceptors.request.use(
      async (config) => {
        // debugLog(`MBA1111 Request interceptor called for: ${config.method?.toUpperCase()} ${config.url}`);
        
        if (!is_prototype) {
          // Check if this is an invitation verification endpoint - ONLY verification should be public
          // NOTE: Invitation acceptance requires authentication and is handled during registration
          const isInviteVerification = config.url.includes('/api/users/v1/invitations/') && 
                                      config.url.includes('/verify/');
          
          if (isInviteVerification) {
            debugLog(`MBAnb23ou4bf954 Skipping auth for invite verification endpoint: ${config.url}`);
            return config;
          }
          
          try {
            const token = await authService.current.getAccessToken();
            if (token) {
              config.headers.Authorization = `Bearer ${token}`;
              
              // Log for invitation acceptance requests
              if (config.url.includes('/api/users/v1/invitations/') && config.url.includes('/accept/')) {
                debugLog(`MBAnb23ou4bf954 Added auth token for invitation acceptance: ${config.url}`);
              }
            } else {
              debugLog(`MBAnb23ou4bf954 No token available for request: ${config.method?.toUpperCase()} ${config.url}`);
              
              // If this is an invitation acceptance endpoint which requires authentication but we have no token
              if (config.url.includes('/api/users/v1/invitations/') && config.url.includes('/accept/')) {
                debugLog(`MBAnb23ou4bf954 ERROR: Invitation acceptance requires authentication but no token available: ${config.url}`);
                
                // For acceptance endpoints, we MUST have a token
                const error = new Error('Authentication required for invitation acceptance');
                error.name = 'NoTokenError';
                throw error;
              }
            }
          } catch (error) {
            console.error('MBA1111 Error getting access token for request:', error);
            debugLog(`MBA9999 Token error for request: ${config.method?.toUpperCase()} ${config.url}`, error);
            
            // If the error is due to auth service issues and UI thinks user is signed in,
            // this could indicate state inconsistency
            if (isSignedIn && error.message && (
              error.message.includes('No authentication token') || 
              error.message.includes('expired') ||
              error.message.includes('invalid')
            )) {
              debugLog('MBA9999 Auth service error while UI shows signed in - potential state inconsistency');
              setTimeout(() => {
                signOut('auth_service_error_while_signed_in');
              }, 0);
            }
            
            throw error;
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
        const now = Date.now();
        if (now - lastErrorTime > ERROR_RESET_TIME) {
          consecutiveAuth401Errors = 0;
        }
        return response;
      },
      async (error) => {
        const originalRequest = error.config;
        
        debugLog(`MBA1111 Response error: ${error.response?.status} ${error.config?.method?.toUpperCase()} ${error.config?.url}`);
        
        // Skip handling certain error types that should not trigger auth logic
        if (error.name === 'NoTokenError' || error.name === 'AbortError') {
          return Promise.reject(error);
        }
        
        // Handle 401 errors with enhanced circuit breaker
        if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
          const now = Date.now();
          
          // Reset counter if enough time has passed
          if (now - lastErrorTime > ERROR_RESET_TIME) {
            consecutiveAuth401Errors = 0;
          }
          
          consecutiveAuth401Errors++;
          lastErrorTime = now;
          
          debugLog(`MBA2ounf4f 401 error detected (${consecutiveAuth401Errors}/${MAX_401_RETRIES}), attempting token refresh`, {
            url: originalRequest.url,
            method: originalRequest.method
          });
          
          // Enhanced circuit breaker: Stop trying after too many consecutive failures
          if (consecutiveAuth401Errors >= MAX_401_RETRIES) {
            debugLog('MBA2ounf4f Circuit breaker triggered: Too many consecutive 401 errors, forcing sign out');
            authService.current.forceSignOut('too_many_auth_failures');
            return Promise.reject(error);
          }
          
          originalRequest._retry = true;
          
          try {
            // Skip auth logging calls to prevent infinite loops
            const isAuthLoggingCall = originalRequest.url?.includes('/api/core/log-auth-event/');
            const isMessageCall = originalRequest.url?.includes('/api/messages/');
            const isConversationCall = originalRequest.url?.includes('/api/conversations/');
            
            // Be extra careful with message/conversation calls during auth issues
            if (isMessageCall || isConversationCall) {
              debugLog('MBA9999 Skipping token refresh for message/conversation call during auth issues to prevent loops');
              throw new Error('Auth failed for protected call');
            }
            
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
              debugLog('MBA9999 Token refresh timeout or repeated failure, forcing sign out');
              authService.current.forceSignOut('token_refresh_failed');
            }
            
            throw error;
          }
        }
        
        // Log all network errors for debugging
        debugLog('MBA2ounf4f Axios response interceptor error:', {
          status: error.response?.status,
          url: error.config?.url,
          method: error.config?.method,
          message: error.message,
          isNetworkError: !error.response,
          errorCode: error.code,
          isBackendDown: error.code === 'ECONNREFUSED' || error.code === 'ERR_NETWORK'
        });
        
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
    if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof document !== 'undefined') {
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
      
      if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof document !== 'undefined') {
        window.removeEventListener('focus', handleWindowFocus);
        document.removeEventListener('visibilitychange', handleWindowFocus);
      }
    };
  }, [isSignedIn, is_prototype]);

  // Initialize auth state with debounce protection for rapid refreshes
  useEffect(() => {
    let initTimeout;
    
    const init = async () => {
      if (isInitializedRef.current) return;
      
      // Add small delay for web to prevent race conditions on rapid refresh
      if (Platform.OS === 'web') {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      
      try {
        debugLog('MBA1111 Initializing auth state');
        
        const { hasAccessToken, hasRefreshToken } = await authService.current.initialize();
        
        if (hasAccessToken || hasRefreshToken) {
          debugLog('MBA1111 Found stored tokens, validating...');
          
          // First, check if we have any valid token WITHOUT attempting refresh
          // This prevents the user from seeing content while being actually logged out
          let storedAccessToken = await getStorage('userToken');
          let storedRefreshToken = await getStorage('refreshToken');
          
          let hasValidToken = false;
          
          // Check if access token is valid (not expired)
          if (storedAccessToken) {
            const timeUntilExpiry = authService.current.getTimeUntilExpiry(storedAccessToken);
            if (timeUntilExpiry > 0) {
              debugLog('MBA1111 Access token is still valid');
              hasValidToken = true;
            } else {
              debugLog('MBA1111 Access token is expired');
            }
          }
          
          // If access token is expired, check if refresh token is valid
          if (!hasValidToken && storedRefreshToken) {
            const refreshTimeUntilExpiry = authService.current.getTimeUntilExpiry(storedRefreshToken);
            if (refreshTimeUntilExpiry > 0) {
              debugLog('MBA1111 Refresh token is valid, attempting token refresh');
              try {
                // Attempt to refresh the token
                await authService.current.refreshTokens();
                hasValidToken = true;
                debugLog('MBA1111 Token refresh successful during initialization');
              } catch (error) {
                debugLog('MBA1111 Token refresh failed during initialization:', error);
                hasValidToken = false;
              }
            } else {
              debugLog('MBA1111 Refresh token is also expired');
            }
          }
          
          if (hasValidToken) {
            // Get the current valid token (either original or refreshed)
            const token = await authService.current.getAccessToken();
            if (token) {
              try {
                // Perform server-side validation to be absolutely sure
                const isValid = await authService.current.validateToken(token);
                if (isValid) {
                  debugLog('MBA1111 Token validated successfully, setting up user session');
                  setIsSignedIn(true);
                  
                  // Fetch user data
                  await fetchUserName();
                  const status = await getProfessionalStatus(token);
                  
                  // Check for stored user role preference
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
                  
                                    debugLog('MBA1111 User session restored successfully');
                } else {
                  debugLog('MBA1111 Server-side token validation failed, signing out');
                  await signOut('server_validation_failed');
                }
              } catch (error) {
                debugLog('MBA1111 Error during token validation, signing out:', error);
                await signOut('validation_error');
              }
            } else {
              debugLog('MBA1111 Could not retrieve access token, signing out');
              await signOut('no_access_token');
            }
          } else {
            debugLog('MBA1111 No valid tokens found, signing out');
            await signOut('no_valid_tokens');
          }
        } else {
          // No tokens available - this is normal for new users
          debugLog('MBA1111 No tokens found during initialization - user needs to sign in');
          // Don't call signOut here as it would trigger navigation for new users
          // Just ensure they're in the signed out state
          setIsSignedIn(false);
          debugLog('MBA1111 Set isSignedIn to false due to no tokens');
        }
      } catch (error) {
        console.error('MBA1111 Error initializing auth state:', error);
        await signOut('initialization_error');
      } finally {
        setLoading(false);
        debugLog('MBA1111 Auth initialization completed, loading set to false');
        
        isInitializedRef.current = true;
        setIsInitialized(true);
      }
    };

    // Use setTimeout to prevent rapid successive initialization attempts
    initTimeout = setTimeout(init, Platform.OS === 'web' ? 10 : 0);
    
    return () => {
      if (initTimeout) {
        clearTimeout(initTimeout);
      }
    };
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

  // State consistency checker with enhanced detection
  useEffect(() => {
    if (loading || is_prototype) return;
    
    const checkStateConsistency = async () => {
      try {
        const hasStoredTokens = !!(await getStorage('userToken')) || !!(await getStorage('refreshToken'));
        const hasMemoryTokens = !!(authService.current.accessToken) || !!(authService.current.refreshToken);
        
        debugLog('MBA1111 State consistency check:', {
          isSignedIn,
          hasStoredTokens,
          hasMemoryTokens,
          isSigningOut: authService.current.isSigningOut
        });
        
        // CRITICAL CHECK: If UI shows signed in but no tokens exist anywhere
        if (isSignedIn && !hasStoredTokens && !hasMemoryTokens && !authService.current.isSigningOut) {
          debugLog('MBA1111 CRITICAL STATE INCONSISTENCY: UI shows signed in but no tokens exist - immediate redirect');
          await signOut('state_inconsistency_no_tokens');
          return;
        }
        
        // ENHANCED CHECK: If UI shows signed in, verify tokens are actually valid
        if (isSignedIn && (hasStoredTokens || hasMemoryTokens) && !authService.current.isSigningOut) {
          const storedToken = await getStorage('userToken');
          
          // Check if stored token is expired
          if (storedToken) {
            const timeUntilExpiry = authService.current.getTimeUntilExpiry(storedToken);
            if (timeUntilExpiry <= 0) {
              debugLog('MBA1111 CRITICAL STATE INCONSISTENCY: UI shows signed in but token is expired');
              
              // Check if refresh token can save us
              const refreshToken = await getStorage('refreshToken');
              if (refreshToken) {
                const refreshTimeUntilExpiry = authService.current.getTimeUntilExpiry(refreshToken);
                if (refreshTimeUntilExpiry <= 0) {
                  debugLog('MBA1111 Refresh token also expired - forcing sign out');
                  await signOut('state_inconsistency_all_tokens_expired');
                  return;
                } else {
                  debugLog('MBA1111 Attempting emergency token refresh');
                  try {
                    await authService.current.refreshTokens();
                    debugLog('MBA1111 Emergency token refresh successful');
                  } catch (error) {
                    debugLog('MBA1111 Emergency token refresh failed, signing out');
                    await signOut('state_inconsistency_refresh_failed');
                    return;
                  }
                }
              } else {
                debugLog('MBA1111 No refresh token available, signing out');
                await signOut('state_inconsistency_no_refresh_token');
                return;
              }
            }
          }
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
        
        // If there's an error in consistency checking and we think we're signed in,
        // be safe and sign out to avoid confused state
        if (isSignedIn) {
          debugLog('MBA1111 Error during consistency check while signed in - signing out for safety');
          await signOut('state_consistency_check_error');
        }
      }
    };
    
    // Run initial check after a shorter delay for faster detection
    const initialCheck = setTimeout(checkStateConsistency, 1000);
    
    // Run periodic checks more frequently for better responsiveness
    const consistencyInterval = setInterval(checkStateConsistency, 15000); // Every 15 seconds
    
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
        isInitialized,
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
