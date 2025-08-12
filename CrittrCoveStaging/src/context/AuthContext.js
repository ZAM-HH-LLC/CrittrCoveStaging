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
        // Clear from localStorage for authentication tokens
        localStorage.removeItem('userToken');
        localStorage.removeItem('refreshToken');
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
        // Use localStorage for web (original behavior)
        localStorage.setItem('userToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
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
      
      // Brave browser recovery: If tokens are missing but we have them in memory, restore them
      if (Platform.OS === 'web' && (!accessToken || !refreshToken)) {
        const memoryAccessToken = this.accessToken;
        const memoryRefreshToken = this.refreshToken;
        
        if (memoryAccessToken && !accessToken) {
          debugLog('MBA2ounf4f BRAVE RECOVERY: Restoring accessToken from memory to localStorage');
          localStorage.setItem('userToken', memoryAccessToken);
          accessToken = memoryAccessToken;
        }
        
        if (memoryRefreshToken && !refreshToken) {
          debugLog('MBA2ounf4f BRAVE RECOVERY: Restoring refreshToken from memory to localStorage');
          localStorage.setItem('refreshToken', memoryRefreshToken);
          refreshToken = memoryRefreshToken;
        }
      }
      
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
      // For authentication tokens on web, use localStorage for persistent authentication (like Airbnb)
      // For other data, check both sessionStorage and localStorage
      if (key === 'userToken' || key === 'refreshToken') {
        const value = localStorage.getItem(key);
        return value;
      } else {
        // For non-auth data, prefer sessionStorage but fallback to localStorage
        try {
          const sessionValue = sessionStorage.getItem(key);
          if (sessionValue) {
            return sessionValue;
          }
        } catch (sessionError) {
          debugLog('MBAo34invid3w getStorage sessionStorage error, falling back to localStorage:', { key, error: sessionError.message });
        }
        
        const localValue = localStorage.getItem(key);
        return localValue;
      }
    } else {
      const value = await AsyncStorage.getItem(key);
      debugLog('MBAo34invid3w getStorage mobile AsyncStorage:', { key, hasValue: !!value, valueLength: value ? value.length : 0 });
      return value;
    }
  } catch (error) {
    console.error('MBA2ounf4f Error getting from storage:', error);
    return null;
  }
};

export const setStorage = async (key, value) => {
  try {
    debugLog('MBAo34invid3w setStorage called:', { key, hasValue: !!value, valueLength: value ? value.length : 0, platform: Platform.OS });
    if (Platform.OS === 'web') {
      // For authentication tokens on web, use localStorage for persistent authentication (like Airbnb)
      if (key === 'userToken' || key === 'refreshToken') {
        localStorage.setItem(key, value);
        debugLog('MBAo34invid3w setStorage web localStorage (auth) completed:', { key });
      } else {
        // For other data, use sessionStorage
        sessionStorage.setItem(key, value);
        debugLog('MBAo34invid3w setStorage web sessionStorage (non-auth) completed:', { key });
      }
    } else {
      await AsyncStorage.setItem(key, value);
      debugLog('MBAo34invid3w setStorage mobile AsyncStorage completed:', { key });
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
        const currentPath = currentRouteInfo?.path;
        
        debugLog(`MBA1111 AUTH REDIRECT WEB: Full URL: ${currentRouteInfo?.href || 'N/A'}`);
        debugLog(`MBA1111 AUTH REDIRECT WEB: Route name: ${currentRouteInfo?.name || 'Unknown'}`);
        debugLog(`MBA1111 AUTH REDIRECT WEB: Path: ${currentPath || 'Unknown'}`);
        
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
      
      console.log('MBA293hjv08he: Auth check result:', {
        isOnProtectedRoute,
        currentRouteName: Platform.OS === 'web' ? 'N/A' : currentRouteInfo?.name,
        currentPath: Platform.OS === 'web' ? currentPath : 'N/A',
        isSignedIn,
        platformOS: Platform.OS,
        fullCurrentRouteInfo: currentRouteInfo,
        fullCurrentPath: currentPath
      });

      if (isOnProtectedRoute) {
        console.log('MBA293hjv08he: REDIRECTING TO SIGNIN - User not signed in on protected route:', {
          platformOS: Platform.OS,
          currentRouteName: Platform.OS === 'web' ? 'N/A' : currentRouteInfo?.name,
          currentPath: Platform.OS === 'web' ? currentPath : 'N/A',
          isOnProtectedRoute: isOnProtectedRoute
        });
        
        // Use platform navigation for redirect
        try {
          // First try using existing navigate function
          navigate('SignIn');
          console.log('MBA293hjv08he: Navigation to SignIn successful');
        } catch (error) {
          console.log('MBA293hjv08he: Navigation failed, using platform navigation fallback:', error);
          // Fallback to platform navigation redirect
          platformNavigation.redirectToSignIn(null);
        }
      } else {
        console.log('MBA293hjv08he: Auth guard - current route is NOT protected, no redirect needed');
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
    debugLog('MBAo34invid3w signOut called with reason:', reason);
    
    try {
      // Prevent concurrent sign out operations
      if (authService.current.isSigningOut) {
        debugLog('MBAo34invid3w Sign out already in progress, skipping');
        return;
      }
      
      authService.current.isSigningOut = true;
      
      // For token expiry or validation failures, immediately set signed out state
      // to prevent user from seeing stale content
      if (reason.includes('validation') || reason.includes('expired') || reason.includes('no_valid')) {
        debugLog('MBAo34invid3w Immediate state update for auth failure');
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
        debugLog('MBAo34invid3w WebSocket disconnected during signOut');
      } catch (error) {
        debugLog('MBAo34invid3w Error disconnecting websocket:', error);
      }
      
      // Clear tokens and storage
      debugLog('MBAo34invid3w Clearing tokens and storage during signOut');
      await authService.current.clearTokens();
      await AsyncStorage.multiRemove(['userRole', 'isApprovedProfessional']);
      
      // Clear all storage items for web (both localStorage and sessionStorage)
      if (Platform.OS === 'web') {
        debugLog('MBAo34invid3w Clearing web storage during signOut');
        
        // Clear auth tokens from localStorage
        localStorage.removeItem('userToken');
        localStorage.removeItem('refreshToken');
        
        // Clear user data from localStorage
        localStorage.removeItem('userRole');
        localStorage.removeItem('isApprovedProfessional');
        localStorage.removeItem('currentProfessional');
        
        // Clear non-auth data from sessionStorage
        sessionStorage.removeItem('userRole');
        sessionStorage.removeItem('isApprovedProfessional');
        sessionStorage.removeItem('currentProfessional');
        
        // Mark as explicit sign out for web
        sessionStorage.setItem('explicitSignOut', 'true');
        
        debugLog('MBAo34invid3w Web storage cleared during signOut - auth tokens from localStorage, user data from both');
      }
      
      debugLog('MBAo34invid3w Storage cleared during sign out');
      
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
      
      debugLog('MBAo34invid3w Auth state reset during signOut');
      
      // Navigate to sign in with platform-specific handling
      const navigateToSignIn = () => {
        try {
          debugLog('MBAo34invid3w Navigating to SignIn screen due to:', reason);
          
          if (Platform.OS === 'web') {
            // For web, use direct URL navigation to avoid conflicts with React Navigation
            if (typeof window !== 'undefined' && window.location) {
              window.location.href = '/signin';
              debugLog('MBAo34invid3w Web redirect to /signin successful');
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
        debugLog('MBAo34invid3w Immediate navigation for auth failure');
        navigateToSignIn();
      } else {
        // For user-initiated sign outs, small delay
        setTimeout(navigateToSignIn, 0);
      }
      
      debugLog('MBAo34invid3w Sign out completed successfully');
      
    } catch (error) {
      debugLog('MBAo34invid3w Error during sign out:', error);
      
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

  // Window focus handling with proper debouncing and storage event monitoring
  useEffect(() => {
    if (!isSignedIn || is_prototype) return;
    
    let focusCheckTimeout = null;
    
    const handleWindowFocus = () => {
      debugLog('MBAo34invid3w Window focus event triggered');
      
      // Clear any pending check
      if (focusCheckTimeout) {
        clearTimeout(focusCheckTimeout);
      }
      
      // Debounce the focus check
      focusCheckTimeout = setTimeout(async () => {
        debugLog('MBAo34invid3w Window regained focus, checking token');
        
        if (authService.current && !authService.current.isSigningOut) {
          const token = authService.current.accessToken;
          if (token && authService.current.shouldRefreshToken(token)) {
            debugLog('MBAo34invid3w Token needs refresh on focus');
            try {
              await authService.current.refreshTokens();
              debugLog('MBAo34invid3w Token refresh on focus successful');
            } catch (error) {
              debugLog('MBAo34invid3w Error refreshing token on focus:', error);
            }
          } else {
            debugLog('MBAo34invid3w Token does not need refresh on focus');
          }
        } else {
          debugLog('MBAo34invid3w Auth service not available or signing out during focus check');
        }
      }, 500); // 500ms debounce
    };
    
    // Storage event handler to detect sessionStorage clearing
    const handleStorageEvent = (event) => {
      // Only care about sessionStorage changes that might affect auth
      if (event.storageArea === sessionStorage) {
        debugLog('MBAo34invid3w SessionStorage change detected:', {
          key: event.key,
          newValue: event.newValue,
          oldValue: event.oldValue,
          url: event.url
        });
        
        // If sessionStorage is being cleared (multiple keys removed), log it but don't act
        if (event.key === null && event.newValue === null) {
          debugLog('MBAo34invid3w SessionStorage clear detected - checking if localStorage was affected');
          
          // Check if localStorage tokens are still there after sessionStorage clear
          const localStorageUserToken = localStorage.getItem('userToken');
          const localStorageRefreshToken = localStorage.getItem('refreshToken');
          
          debugLog('MBAo34invid3w localStorage check after sessionStorage clear:', {
            hasUserToken: !!localStorageUserToken,
            hasRefreshToken: !!localStorageRefreshToken
          });
          
          // If localStorage tokens are missing but we're signed in, this is a Brave browser issue
          if (!localStorageUserToken && !localStorageRefreshToken && isSignedIn) {
            debugLog('MBAo34invid3w BRAVE BROWSER ISSUE: sessionStorage.clear() affected localStorage - attempting recovery');
            
            // Try to restore tokens from memory if available
            if (authService.current.accessToken) {
              localStorage.setItem('userToken', authService.current.accessToken);
              debugLog('MBAo34invid3w Restored userToken to localStorage from memory');
            }
            if (authService.current.refreshToken) {
              localStorage.setItem('refreshToken', authService.current.refreshToken);
              debugLog('MBAo34invid3w Restored refreshToken to localStorage from memory');
            }
          }
          
          return;
        }
        
        // If auth tokens are being removed from sessionStorage, ignore it
        if ((event.key === 'userToken' || event.key === 'refreshToken') && event.newValue === null) {
          debugLog('MBAo34invid3w Auth token removed from sessionStorage - ignoring as tokens are in localStorage');
          return;
        }
      }
    };
    
    // Set up event listeners only for web
    if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof document !== 'undefined') {
      debugLog('MBAo34invid3w Setting up focus and storage event listeners for web');
      window.addEventListener('focus', handleWindowFocus);
      window.addEventListener('storage', handleStorageEvent);
      
      document.addEventListener('visibilitychange', () => {
        debugLog('MBAo34invid3w Visibility change event:', document.visibilityState);
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
        window.removeEventListener('storage', handleStorageEvent);
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
        debugLog('MBAo34invid3w Initializing auth state');
        
        const { hasAccessToken, hasRefreshToken } = await authService.current.initialize();
        
        debugLog('MBAo34invid3w Auth initialization result:', { hasAccessToken, hasRefreshToken });
        
        if (hasAccessToken || hasRefreshToken) {
          debugLog('MBAo34invid3w Found stored tokens, validating...');
          
          // First, check if we have any valid token WITHOUT attempting refresh
          // This prevents the user from seeing content while being actually logged out
          let storedAccessToken = await getStorage('userToken');
          let storedRefreshToken = await getStorage('refreshToken');
          
          debugLog('MBAo34invid3w Retrieved stored tokens:', {
            hasAccessToken: !!storedAccessToken,
            hasRefreshToken: !!storedRefreshToken,
            accessTokenLength: storedAccessToken ? storedAccessToken.length : 0,
            refreshTokenLength: storedRefreshToken ? storedRefreshToken.length : 0
          });
          
          let hasValidToken = false;
          
          // Check if access token is valid (not expired)
          if (storedAccessToken) {
            const timeUntilExpiry = authService.current.getTimeUntilExpiry(storedAccessToken);
            debugLog('MBAo34invid3w Access token expiry check:', {
              timeUntilExpirySeconds: Math.round(timeUntilExpiry / 1000),
              isExpired: timeUntilExpiry <= 0
            });
            if (timeUntilExpiry > 0) {
              debugLog('MBAo34invid3w Access token is still valid');
              hasValidToken = true;
            } else {
              debugLog('MBAo34invid3w Access token is expired');
            }
          }
          
          // If access token is expired, check if refresh token is valid
          if (!hasValidToken && storedRefreshToken) {
            const refreshTimeUntilExpiry = authService.current.getTimeUntilExpiry(storedRefreshToken);
            debugLog('MBAo34invid3w Refresh token expiry check:', {
              timeUntilExpirySeconds: Math.round(refreshTimeUntilExpiry / 1000),
              isExpired: refreshTimeUntilExpiry <= 0
            });
            if (refreshTimeUntilExpiry > 0) {
              debugLog('MBAo34invid3w Refresh token is valid, attempting token refresh');
              try {
                // Attempt to refresh the token
                await authService.current.refreshTokens();
                hasValidToken = true;
                debugLog('MBAo34invid3w Token refresh successful during initialization');
              } catch (error) {
                debugLog('MBAo34invid3w Token refresh failed during initialization:', error);
                hasValidToken = false;
              }
            } else {
              debugLog('MBAo34invid3w Refresh token is also expired');
            }
          }
          
          if (hasValidToken) {
            // Get the current valid token (either original or refreshed)
            const token = await authService.current.getAccessToken();
            if (token) {
              try {
                // Perform server-side validation to be absolutely sure
                const isValid = await authService.current.validateToken(token);
                debugLog('MBAo34invid3w Server-side token validation result:', isValid);
                if (isValid) {
                  debugLog('MBAo34invid3w Token validated successfully, setting up user session');
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
                  
                  debugLog('MBAo34invid3w Role selection:', { 
                    storedRole, 
                    suggestedRole: status.suggestedRole, 
                    finalRole,
                    isApprovedProfessional: status.isApprovedProfessional 
                  });
                  
                  setUserRole(finalRole);
                  setIsApprovedProfessional(status.isApprovedProfessional);
                  await fetchTimeSettings();
                  
                  debugLog('MBAo34invid3w User session restored successfully');
                } else {
                  debugLog('MBAo34invid3w Server-side token validation failed, signing out');
                  await signOut('server_validation_failed');
                }
              } catch (error) {
                debugLog('MBAo34invid3w Error during token validation, signing out:', error);
                await signOut('validation_error');
              }
            } else {
              debugLog('MBAo34invid3w Could not retrieve access token, signing out');
              await signOut('no_access_token');
            }
          } else {
            debugLog('MBAo34invid3w No valid tokens found, signing out');
            await signOut('no_valid_tokens');
          }
        } else {
          // No tokens available - this is normal for new users
          debugLog('MBAo34invid3w No tokens found during initialization - user needs to sign in');
          // Don't call signOut here as it would trigger navigation for new users
          // Just ensure they're in the signed out state
          setIsSignedIn(false);
          debugLog('MBAo34invid3w Set isSignedIn to false due to no tokens');
        }
      } catch (error) {
        console.error('MBA1111 Error initializing auth state:', error);
        await signOut('initialization_error');
      } finally {
        setLoading(false);
        debugLog('MBAo34invid3w Auth initialization completed, loading set to false');
        
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
        localStorage.setItem('isApprovedProfessional', String(is_approved));
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
        localStorage.setItem('userRole', initialRole);
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
          localStorage.setItem('userRole', newRole);
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

  // State consistency checker with enhanced detection and sessionStorage isolation
  useEffect(() => {
    if (loading || is_prototype) return;
    
    const checkStateConsistency = async () => {
      try {
        // Get both localStorage and sessionStorage state to understand what's happening
        const localStorageUserToken = Platform.OS === 'web' ? localStorage.getItem('userToken') : null;
        const localStorageRefreshToken = Platform.OS === 'web' ? localStorage.getItem('refreshToken') : null;
        const sessionStorageUserToken = Platform.OS === 'web' ? sessionStorage.getItem('userToken') : null;
        const sessionStorageRefreshToken = Platform.OS === 'web' ? sessionStorage.getItem('refreshToken') : null;
        
        const hasStoredTokens = !!(await getStorage('userToken')) || !!(await getStorage('refreshToken'));
        const hasMemoryTokens = !!(authService.current.accessToken) || !!(authService.current.refreshToken);
        
        debugLog('MBAo34invid3w State consistency check:', {
          isSignedIn,
          hasStoredTokens,
          hasMemoryTokens,
          localStorageUserToken: !!localStorageUserToken,
          localStorageRefreshToken: !!localStorageRefreshToken,
          sessionStorageUserToken: !!sessionStorageUserToken,
          sessionStorageRefreshToken: !!sessionStorageRefreshToken,
          isSigningOut: authService.current.isSigningOut,
          platform: Platform.OS
        });
        
        // CRITICAL CHECK: If UI shows signed in but no tokens exist anywhere
        if (isSignedIn && !hasStoredTokens && !hasMemoryTokens && !authService.current.isSigningOut) {
          // Additional check: If localStorage has tokens but getStorage() doesn't find them,
          // this might be a sessionStorage-only issue
          if (Platform.OS === 'web' && (localStorageUserToken || localStorageRefreshToken)) {
            debugLog('MBAo34invid3w POTENTIAL SESSIONSTORAGE ISSUE: localStorage has tokens but getStorage() failed - checking...');
            
            // Try to restore tokens from localStorage directly
            if (localStorageUserToken) {
              authService.current.accessToken = localStorageUserToken;
            }
            if (localStorageRefreshToken) {
              authService.current.refreshToken = localStorageRefreshToken;
            }
            
            debugLog('MBAo34invid3w Restored tokens from localStorage directly - continuing session');
            return; // Don't sign out, let the session continue
          }
          
          // BRAVE BROWSER RECOVERY: If we're signed in but no tokens anywhere, try to recover from memory
          if (Platform.OS === 'web' && authService.current.accessToken) {
            debugLog('MBAo34invid3w BRAVE BROWSER RECOVERY: Attempting to restore tokens from memory');
            
            // Restore tokens to localStorage from memory
            localStorage.setItem('userToken', authService.current.accessToken);
            if (authService.current.refreshToken) {
              localStorage.setItem('refreshToken', authService.current.refreshToken);
            }
            
            debugLog('MBAo34invid3w BRAVE BROWSER RECOVERY: Tokens restored from memory to localStorage');
            return; // Don't sign out, let the session continue
          }
          
          debugLog('MBAo34invid3w CRITICAL STATE INCONSISTENCY: UI shows signed in but no tokens exist - immediate redirect');
          await signOut('state_inconsistency_no_tokens');
          return;
        }
        
        // ENHANCED CHECK: If UI shows signed in, verify tokens are actually valid
        if (isSignedIn && (hasStoredTokens || hasMemoryTokens) && !authService.current.isSigningOut) {
          const storedToken = await getStorage('userToken');
          
          // Check if stored token is expired
          if (storedToken) {
            const timeUntilExpiry = authService.current.getTimeUntilExpiry(storedToken);
            debugLog('MBAo34invid3w Token expiry check in consistency:', {
              timeUntilExpirySeconds: Math.round(timeUntilExpiry / 1000),
              isExpired: timeUntilExpiry <= 0
            });
            if (timeUntilExpiry <= 0) {
              debugLog('MBAo34invid3w CRITICAL STATE INCONSISTENCY: UI shows signed in but token is expired');
              
              // Check if refresh token can save us
              const refreshToken = await getStorage('refreshToken');
              if (refreshToken) {
                const refreshTimeUntilExpiry = authService.current.getTimeUntilExpiry(refreshToken);
                debugLog('MBAo34invid3w Refresh token expiry check in consistency:', {
                  timeUntilExpirySeconds: Math.round(refreshTimeUntilExpiry / 1000),
                  isExpired: refreshTimeUntilExpiry <= 0
                });
                if (refreshTimeUntilExpiry <= 0) {
                  debugLog('MBAo34invid3w Refresh token also expired - forcing sign out');
                  await signOut('state_inconsistency_all_tokens_expired');
                  return;
                } else {
                  debugLog('MBAo34invid3w Attempting emergency token refresh');
                  try {
                    await authService.current.refreshTokens();
                    debugLog('MBAo34invid3w Emergency token refresh successful');
                  } catch (error) {
                    debugLog('MBAo34invid3w Emergency token refresh failed, signing out');
                    await signOut('state_inconsistency_refresh_failed');
                    return;
                  }
                }
              } else {
                debugLog('MBAo34invid3w No refresh token available, signing out');
                await signOut('state_inconsistency_no_refresh_token');
                return;
              }
            }
          }
        }
        
        // If we think user is not signed in but tokens exist
        if (!isSignedIn && (hasStoredTokens || hasMemoryTokens) && !authService.current.isSigningOut) {
          debugLog('MBAo34invid3w STATE INCONSISTENCY DETECTED: UI shows signed out but tokens exist');
          
          // Try to restore the session
          try {
            const token = await authService.current.getAccessToken();
            if (token) {
              const isValid = await authService.current.validateToken(token);
              debugLog('MBAo34invid3w Token validation for session restoration:', isValid);
              if (isValid) {
                debugLog('MBAo34invid3w Restoring session with valid tokens');
                
                setIsSignedIn(true);
                await fetchUserName();
                const status = await getProfessionalStatus(token);
                setUserRole(status.suggestedRole);
                setIsApprovedProfessional(status.isApprovedProfessional);
                return;
              }
            }
          } catch (error) {
            debugLog('MBAo34invid3w Failed to restore session:', error);
          }
          
          // If restoration failed, clear everything
          await signOut('state_inconsistency_invalid_tokens');
        }
      } catch (error) {
        debugLog('MBAo34invid3w Error in state consistency check:', error);
        
        // If there's an error in consistency checking and we think we're signed in,
        // be safe and sign out to avoid confused state
        if (isSignedIn) {
          debugLog('MBAo34invid3w Error during consistency check while signed in - signing out for safety');
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

  // Token refresh monitoring with PROACTIVE refresh triggers and localStorage persistence check
  useEffect(() => {
    if (!isSignedIn || is_prototype) return;
    
    const monitorAndRefreshToken = async () => {
      try {
        // Get the current token (this will automatically refresh if needed)
        const token = await authService.current.getAccessToken();
        
        if (token) {
          const timeUntilExpiry = authService.current.getTimeUntilExpiry(token);
          const shouldRefresh = authService.current.shouldRefreshToken(token);
          
          debugLog('MBAo34invid3w Token monitor check:', {
            timeUntilExpirySeconds: Math.round(timeUntilExpiry / 1000),
            shouldRefresh,
            isRefreshing: authService.current.isRefreshing,
            platform: Platform.OS
          });
          
          if (timeUntilExpiry < 0) {
            debugLog('MBAo34invid3w TOKEN EXPIRED DETECTED in monitor');
          }
          
          // PROACTIVE REFRESH: If token should be refreshed, trigger it now
          if (shouldRefresh && !authService.current.isRefreshing) {
            debugLog('MBAo34invid3w Token monitor triggering proactive refresh');
            try {
              await authService.current.refreshTokens();
              debugLog('MBAo34invid3w Proactive token refresh completed successfully');
            } catch (error) {
              debugLog('MBAo34invid3w Proactive token refresh failed:', error);
            }
          }
          
          // BRAVE BROWSER SAFEGUARD: Ensure tokens are always in localStorage
          if (Platform.OS === 'web') {
            const localStorageToken = localStorage.getItem('userToken');
            const localStorageRefreshToken = localStorage.getItem('refreshToken');
            
            if (!localStorageToken && token) {
              debugLog('MBAo34invid3w BRAVE SAFEGUARD: Token missing from localStorage, restoring');
              localStorage.setItem('userToken', token);
            }
            
            if (!localStorageRefreshToken && authService.current.refreshToken) {
              debugLog('MBAo34invid3w BRAVE SAFEGUARD: Refresh token missing from localStorage, restoring');
              localStorage.setItem('refreshToken', authService.current.refreshToken);
            }
          }
        } else {
          debugLog('MBAo34invid3w Token monitor: No token available');
        }
      } catch (error) {
        debugLog('MBAo34invid3w Error in token monitor:', error);
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
