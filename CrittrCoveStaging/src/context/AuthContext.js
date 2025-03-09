import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_BASE_URL } from '../config/config';
import { Dimensions, Platform } from 'react-native';
import { navigate } from '../../App';
import { initStripe } from '../utils/StripeService';

export const SCREEN_WIDTH = Dimensions.get('window').width;
export const SCREEN_HEIGHT = Dimensions.get('window').height;

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

export const AuthProvider = ({ children }) => {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [isApprovedProfessional, setIsApprovedProfessional] = useState(false);
  const [loading, setLoading] = useState(true);
  const [screenWidth, setScreenWidth] = useState(Dimensions.get('window').width);
  const [firstName, setFirstName] = useState('');
  const [timeSettings, setTimeSettings] = useState({
    timezone: 'UTC',
    timezone_abbrev: 'UTC',
    use_military_time: false
  });

  // SET TO "true" FOR NO API CALLS
  const [is_prototype, setIsPrototype] = useState(false);

  // Set is_DEBUG to false by default in prototype mode
  const [is_DEBUG, setIsDebug] = useState(true);

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
  }, []); // No dependencies needed for dimension changes

  // Handle initial auth state separately
  useEffect(() => {
    const loadInitialAuth = async () => {
      try {
        if (is_prototype) {
          // In prototype mode, set default professional state
          setIsSignedIn(true);
          setUserRole('professional');
          setIsApprovedProfessional(true);
          await AsyncStorage.multiSet([
            ['userRole', 'professional'],
            ['isApprovedProfessional', 'true']
          ]);
          return;
        }

        const authStatus = await checkAuthStatus();
        if (authStatus.isSignedIn) {
          await fetchUserName();
        }
      } finally {
        setLoading(false);
      }
    };

    loadInitialAuth();
  }, []); // Only run on mount

  const fetchUserName = async () => {
    if (is_prototype) {
      // In prototype mode, set a default name
      setFirstName('John');
      return;
    }
    try {
      let token = Platform.OS === 'web' ? sessionStorage.getItem('userToken') : await AsyncStorage.getItem('userToken');
      if (!token) {
        if (is_DEBUG) {
          console.error('No token found');
        }
        return;
      }
      const response = await axios.get(`${API_BASE_URL}/api/users/v1/get-name/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFirstName(response.data.first_name);
    } catch (error) {
      console.error('Error fetching user name:', error.response ? error.response.data : error.message);
    }
  };

  // Single useEffect for auth state management
  useEffect(() => {
    const loadAuthState = async () => {
      try {
        // Ensure storedApproval is retrieved correctly and handle null or undefined values
        let token, storedRole, storedApproval;

        if (Platform.OS === "web") {
          token = sessionStorage.getItem('userToken');
          storedRole = sessionStorage.getItem('userRole');
          storedApproval = sessionStorage.getItem('isApprovedProfessional');
          if (is_DEBUG) {
            console.log("MBA got token:", token, "storedRole:", storedRole, "StoredApproval:", storedApproval);
          }
        } else {
          [token, storedRole, storedApproval] = await AsyncStorage.multiGet([
            'userToken',
            'userRole',
            'isApprovedProfessional'
          ]);
        }

        // Handle null or undefined storedApproval
        const isApproved = storedApproval ? storedApproval[1] === 'true' : false;

        // If we have stored values, use them
        if (token) {
          if (is_DEBUG) {
            console.log("MBA got into load auth state if token. storedRole:", storedRole);
          }
          setIsSignedIn(true);
          setUserRole(storedRole || 'petOwner');
          setIsApprovedProfessional(isApproved);

          if (is_DEBUG) {
            console.log('Initial auth state set:', {
              role: storedRole || 'petOwner',
              isApproved: isApproved
            });
          }
        } else {
          if (is_DEBUG) {
            console.log('No token found, setting to signed out state');
          }
          setIsSignedIn(false);
          setUserRole(null);
          setIsApprovedProfessional(false);
        }
      } catch (error) {
        console.error('Error loading auth state:', error);
      } finally {
        setLoading(false);
        if (is_DEBUG) {
          console.log('Finished loadAuthState');
        }
      }
    };

    loadAuthState();
  }, []); // Only run on mount

  useEffect(() => {
    if (isSignedIn) {
      fetchUserName();
    }
  }, [isSignedIn]);

  const getProfessionalStatus = async (token) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/professional-status/v1/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('Professional status response:', response.data);
      
      const { is_approved } = response.data;
      
      // Set approval status only
      setIsApprovedProfessional(is_approved);
      await AsyncStorage.setItem('isApprovedProfessional', String(is_approved));
      
      // Just return the status without modifying roles
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

  const signIn = async (token, refreshTokenValue) => {
    try {
      if (Platform.OS === "web") {
        sessionStorage.setItem('userToken', token);
        sessionStorage.setItem('refreshToken', refreshTokenValue);
      } else {
        await AsyncStorage.multiSet([
          ['userToken', token],
          ['refreshToken', refreshTokenValue],
        ]);
      }

      if (is_DEBUG) {
        console.log('MBA sign in token', token, 'refreshToken', refreshTokenValue);
      }
      setIsSignedIn(true);
      
      if (is_prototype) {
        // In prototype mode, set default values without API calls
        const initialRole = 'professional';
        setUserRole(initialRole);
        if (Platform.OS === 'web') {
          sessionStorage.setItem('userRole', initialRole);
        } else {
          await AsyncStorage.setItem('userRole', initialRole);
        }
        setIsApprovedProfessional(true);
        return {
          userRole: initialRole,
          isApprovedProfessional: true
        };
      }
      
      // Get professional status and set initial role
      const status = await getProfessionalStatus(token);

      const initialRole = status.suggestedRole;
      
      // Set and store the role
      setUserRole(initialRole);
      if (Platform.OS === 'web') {
        sessionStorage.setItem('userRole', initialRole);
      } else {
        await AsyncStorage.setItem('userRole', initialRole);
      }
      
      // Add logging to track access and refresh tokens during signIn
      if (is_DEBUG) {
        console.log('Access token stored:', token);
        console.log('Refresh token stored:', refreshTokenValue);
      }

      return {
        userRole: initialRole,
        isApprovedProfessional: status.isApprovedProfessional
      };
    } catch (error) {
      console.error('Error during sign in:', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await AsyncStorage.multiRemove([
        'userToken', 
        'refreshToken', 
        'userRole', 
        'isApprovedProfessional'
      ]);

      await sessionStorage.removeItem('userToken');
      await sessionStorage.removeItem('refreshToken');
      await sessionStorage.removeItem('userRole');
      await sessionStorage.removeItem('isApprovedProfessional');
    } catch (error) {
      console.error('Error clearing storage:', error);
    }

    // Set state updates
    setIsSignedIn(false);
    setIsApprovedProfessional(false);
    setUserRole(null);

    // Ensure state updates are processed before navigation
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
        console.log("MBA userRole", userRole);
      }
      const newRole = userRole === 'professional' ? 'petOwner' : 'professional';
      setUserRole(newRole);
      try {
        if (Platform.OS === "web") {
          sessionStorage.setItem('userRole', newRole);
        } else {
          await AsyncStorage.setItem('userRole', newRole);
        }
        
        // Verify the role was stored correctly
        const storedRole = Platform.OS === "web" ? sessionStorage.getItem('userRole') : await AsyncStorage.getItem('userRole');
        console.log("MBA Stored role:", storedRole);

        console.log("MBA New role:", newRole);

      } catch (error) {
        console.error('Error updating role in storage:', error);
      }
    } else {
      console.log('User is not an approved professional, cannot switch roles');
    }

    // Add logging in switchRole to track isApprovedProfessional state
    console.log('Switching role. Current isApprovedProfessional:', isApprovedProfessional);
  };

  const validateToken = async (token) => {
    try {
      if (is_prototype) {
        // In prototype mode, always return true for token validation
        if (is_DEBUG) {
          console.log('Prototype mode: Mock token validation successful');
        }
        return true;
      }

      const response = await axios.post(`${API_BASE_URL}/api/token/verify/`, {
        token: token
      });

      if (response.status !== 200) {
        console.log('Retrying refresh token');
        const newToken = await refreshUserToken(refreshToken);
        if (newToken) {
          console.log('Got token:', newToken);
          return await validateToken(newToken);
        }
        console.log('Token validation error:', response.status);
        return false;
      }

      return true;
    } catch (error) {
      console.log('Token validation error:', error.response?.status);
      return false;
    }
  };

  const refreshUserToken = async (refreshToken) => {
    try {
      // Ensure refresh token is retrieved correctly in refreshUserToken
      const refreshToken = Platform.OS === "web" ? sessionStorage.getItem('refreshToken') : await AsyncStorage.getItem('refreshToken');
      if (!refreshToken) {
        console.error('No refresh token found');
        return null;
      }

      const response = await axios.post(`${API_BASE_URL}/api/token/refresh/`, {
        refresh: refreshToken
      });
      const newToken = response.data.access;
      if (Platform.OS === 'web') {
        sessionStorage.setItem('userToken', newToken);
      } else {
        await AsyncStorage.setItem('userToken', newToken);
      }
      return newToken;
    } catch (error) {
      console.error('Error refreshing token:', error.response?.status);
      return null;
    }
  };

  const checkAuthStatus = async () => {
    try {
      // Check for explicit sign out flag first
      if (Platform.OS === 'web') {
        const wasExplicitSignOut = sessionStorage.getItem('explicitSignOut') === 'true';
        if (wasExplicitSignOut) {
          // Clear the flag
          sessionStorage.removeItem('explicitSignOut');
          return { isSignedIn: false, userRole: null, isApprovedProfessional: false };
        }
      }

      // Get current route/path
      let currentPath = '';
      if (Platform.OS === 'web') {
        currentPath = window.location.pathname.slice(1);
      } else {
        currentPath = await AsyncStorage.getItem('currentRoute');
      }

      // Check if we're on the home page or root URL
      const isHomePage = !currentPath || currentPath === '' || currentPath.toLowerCase() === 'home';

      if (is_prototype) {
        const token = Platform.OS === "web" ? sessionStorage.getItem('userToken') : await AsyncStorage.getItem('userToken');
        if (!token) {
          if (is_DEBUG) {
            console.log('Prototype mode: No token found, signing out');
          }
          return { isSignedIn: false, userRole: null, isApprovedProfessional: false };
        }

        if (is_DEBUG) {
          console.log('Prototype mode: Token found, setting signed in state');
        }
        setIsSignedIn(true);
        const storedRole = Platform.OS === "web" ? sessionStorage.getItem('userRole') : await AsyncStorage.getItem('userRole');

        if (is_DEBUG) {
          console.log("MBA setting user role", storedRole);
        }
        setUserRole(storedRole === 'professional' || storedRole === 'petOwner' ? storedRole : 'petOwner');
        setIsApprovedProfessional(true);
        return {
          isSignedIn: true,
          userRole: storedRole === 'professional' || storedRole === 'petOwner' ? storedRole : 'petOwner',
          isApprovedProfessional: true
        };
      }

      let token, refreshToken, storedRole, storedApproval;

      if (Platform.OS === "web") {
        token = sessionStorage.getItem('userToken');
        refreshToken = sessionStorage.getItem('refreshToken');
        storedRole = sessionStorage.getItem('userRole');
        storedApproval = sessionStorage.getItem('isApprovedProfessional');
      } else {
        [token, refreshToken, storedRole, storedApproval] = await AsyncStorage.multiGet([
          'userToken',
          'refreshToken',
          'userRole',
          'isApprovedProfessional'
        ]);
      }

      if (is_DEBUG) {
        console.log("MBA userToken:", token);
        console.log("MBA refreshToken:", refreshToken);
        console.log("MBA storedRole:", storedRole);
        console.log("MBA isApprovedProfessional:", isApprovedProfessional);
        console.log("MBA storedApproval:", storedApproval);
        console.log("Current path:", currentPath);
        console.log("Is home page:", isHomePage);
      }

      // Handle no tokens scenario
      if (!token || !refreshToken) {
        console.log('No tokens found - handling based on current route');
        
        // If we're on the home page or root URL, just return unauthenticated state
        if (isHomePage) {
          return { isSignedIn: false, userRole: null, isApprovedProfessional: false };
        }
        
        // For any other page, sign out and redirect
        await signOut();
        return { isSignedIn: false, userRole: null, isApprovedProfessional: false };
      }

      // Rest of the existing token validation logic
      let currentToken = token;
      let isValid = false;

      if (currentToken) {
        isValid = await validateToken(currentToken);
      }

      if (!isValid && refreshToken) {
        const newToken = await refreshUserToken(refreshToken);
        if (newToken) {
          currentToken = newToken;
          isValid = true;
        }
      }

      if (!isValid) {
        console.log('No valid token available - handling based on current route');
        if (isHomePage) {
          navigate('Home');
          return { isSignedIn: false, userRole: null, isApprovedProfessional: false };
        }
        await signOut();
        return { isSignedIn: false, userRole: null, isApprovedProfessional: false };
      }

      // At this point we have a valid token
      console.log('Token validation successful, checking professional status with token:', currentToken);
      const status = await getProfessionalStatus(currentToken);
      console.log('Professional status check result:', status);

      setIsSignedIn(true);
      setIsApprovedProfessional(status.isApprovedProfessional);

      // If on SearchProfessionalsListing, force petOwner role but don't store it
      if (currentPath === 'SearchProfessionalsListing') {
        setUserRole('petOwner');
        return {
          isSignedIn: true,
          userRole: 'petOwner',
          isApprovedProfessional: status.isApprovedProfessional
        };
      }

      // For all other cases, use the stored role if it exists
      if (storedRole) {
        const role = storedRole;

        setUserRole(role);
        return {
          isSignedIn: true,
          userRole: role,
          isApprovedProfessional: status.isApprovedProfessional
        };
      }

      // Only set a new role if we don't have one stored (first login)

      const newRole = status.suggestedRole || 'petOwner';

      setUserRole(newRole);
      await AsyncStorage.setItem('userRole', newRole);

      return {
        isSignedIn: true,
        userRole: newRole,
        isApprovedProfessional: status.isApprovedProfessional
      };
    } catch (error) {
      console.error('Error in checkAuthStatus:', error);
      await signOut();
      return { isSignedIn: false, userRole: null, isApprovedProfessional: false };
    } finally {
      if (is_DEBUG) {
        console.log('=== Ending checkAuthStatus ===');
      }
    }
  };

  // Add useEffect to persist role changes
  useEffect(() => {
    if (is_prototype && isSignedIn) {
      AsyncStorage.setItem('userRole', userRole || 'professional');
      AsyncStorage.setItem('isApprovedProfessional', String(isApprovedProfessional));
    }
  }, [is_prototype, isSignedIn, userRole, isApprovedProfessional]);

  // Ensure isApprovedProfessional is set to true in prototype mode
  useEffect(() => {
    if (is_prototype) {
      setIsApprovedProfessional(true);
      if (is_DEBUG) {
        console.log('Prototype mode: isApprovedProfessional set to true');
      }
    }
  }, [is_prototype]);

  const fetchTimeSettings = async () => {
    if (is_prototype) return;
    
    try {
      let token = Platform.OS === 'web' ? sessionStorage.getItem('userToken') : await AsyncStorage.getItem('userToken');
      if (!token) {
        if (is_DEBUG) {
          console.error('MBA9876 No token found for time settings');
        }
        return;
      }
      
      const response = await axios.get(`${API_BASE_URL}/api/users/v1/time-settings/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (is_DEBUG) {
        console.log('MBA9876 Time settings response:', response.data);
      }
      
      setTimeSettings(response.data);
    } catch (error) {
      console.error('MBA9876 Error fetching time settings:', error.response ? error.response.data : error.message);
    }
  };

  // Add effect to fetch time settings when user signs in
  useEffect(() => {
    if (isSignedIn && !is_prototype) {
      fetchTimeSettings();
    }
  }, [isSignedIn, is_prototype]);

  return (
    <AuthContext.Provider value={{ 
      isSignedIn, 
      setIsSignedIn,
      userRole,
      setUserRole,
      isApprovedProfessional, 
      setIsApprovedProfessional,
      loading,
      signIn,
      signOut,
      switchRole,
      screenWidth,
      checkAuthStatus,
      firstName,
      is_prototype,
      setIsPrototype,
      is_DEBUG,
      setIsDebug,
      timeSettings,
      fetchTimeSettings
    }}>
      {children}
    </AuthContext.Provider>
  );
};
