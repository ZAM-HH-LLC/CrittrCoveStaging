import React, { useEffect, useState, useContext } from 'react';
import { Platform, View, Text, TouchableOpacity, StyleSheet } from 'react-native';

// Add base64 polyfill for React Native if needed
if (Platform.OS !== 'web' && typeof global.atob === 'undefined') {
  global.atob = (str) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    let result = '';
    let i = 0;
    
    str = str.replace(/[^A-Za-z0-9+/]/g, '');
    
    while (i < str.length) {
      const encoded1 = chars.indexOf(str.charAt(i++));
      const encoded2 = chars.indexOf(str.charAt(i++));
      const encoded3 = chars.indexOf(str.charAt(i++));
      const encoded4 = chars.indexOf(str.charAt(i++));
      
      const bitmap = (encoded1 << 18) | (encoded2 << 12) | (encoded3 << 6) | encoded4;
      
      result += String.fromCharCode((bitmap >> 16) & 255);
      if (encoded3 !== 64) result += String.fromCharCode((bitmap >> 8) & 255);
      if (encoded4 !== 64) result += String.fromCharCode(bitmap & 255);
    }
    
    return result;
  };
}
import { Provider as PaperProvider } from 'react-native-paper';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator, TransitionPresets } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Navigation from './src/components/Navigation';
import { theme } from './src/styles/theme';
import { AuthProvider, AuthContext, debugLog, getStorage, setStorage } from './src/context/AuthContext';
import { MessageNotificationProvider } from './src/context/MessageNotificationContext';
import { API_BASE_URL } from './src/config/config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createNavigationContainerRef } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import { navigateToFrom } from './src/components/Navigation';
import { TutorialProvider } from './src/context/TutorialContext';
import { ToastProvider } from './src/components/ToastProvider';
import platformNavigation from './src/utils/platformNavigation';
import { loadFonts } from './src/styles/fonts';
import { ActivityIndicator } from 'react-native-paper';

// Import CSS fixes for mobile browsers
if (Platform.OS === 'web') {
  // We need to import this statically for webpack to pick it up
  require('./src/styles/viewport-fix.css');
}

// Import all your screen components
import HomeScreen from './src/screens/HomeScreen';
// import AboutScreen from './src/screens/AboutScreen';
import MyProfile from './src/screens/MyProfile';
import SignIn from './src/screens/SignIn';
import SignUp from './src/screens/SignUp';
import ResetPassword from './src/screens/ResetPassword';
import ResetPasswordConfirm from './src/screens/ResetPasswordConfirm';
import Dashboard from './src/screens/Dashboard';
import BecomeProfessional from './src/screens/BecomeProfessional';
import MoreScreen from './src/screens/MoreScreen';
import AvailabilitySettings from './src/screens/AvailabilitySettings';
import OwnerHistory from './src/screens/OwnerHistory';
import MessageHistory from './src/components/Messages/MessageHistoryWrapper';
import Settings from './src/screens/Settings';
import PrivacyPolicy from './src/screens/PrivacyPolicy';
import ProfessionalSettings from './src/screens/ProfessionalSettings';
import TermsOfService from './src/screens/TermsOfService';
import HelpFAQ from './src/screens/HelpFAQ';
import ContactUs from './src/screens/ContactUs';
import Owners from './src/screens/Owners';
import ProfessionalProfile from './src/screens/ProfessionalProfile';
import MyContracts from './src/screens/MyContracts';
import ChangePassword from './src/screens/ChangePassword';
import SearchProfessionalsListing from './src/screens/SearchProfessionalsListing';
import MyBookings from './src/screens/MyBookings';
import ServiceManagerScreen from './src/screens/ServiceManagerScreen';
import BlogScreen from './src/screens/BlogScreen';
import BlogPost from './src/screens/BlogPost';
import Waitlist from './src/screens/Waitlist';
import TestToast from './src/screens/TestToast';
import Connections from './src/screens/Connections';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const screens = [
  { name: 'Home', component: HomeScreen },
  { name: 'MyProfile', component: MyProfile },  
  { name: 'SignIn', component: SignIn },
  { name: 'SignUp', component: SignUp },
  { name: 'Invite', component: SignUp },
  { name: 'ResetPassword', component: ResetPassword },
  { name: 'ResetPasswordConfirm', component: ResetPasswordConfirm },
  { name: 'SearchProfessionalsListing', component: SearchProfessionalsListing },
  { name: 'OwnerHistory', component: OwnerHistory },
  { name: 'MessageHistory', component: MessageHistory },
  { name: 'Dashboard', component: Dashboard },
  { name: 'BecomeProfessional', component: BecomeProfessional },
  { name: 'MoreScreen', component: MoreScreen },
  { name: 'Owners', component: Owners },
  { name: 'AvailabilitySettings', component: AvailabilitySettings },
  { name: 'Settings', component: Settings },
  { name: 'PrivacyPolicy', component: PrivacyPolicy },
  { name: 'ProfessionalSettings', component: ProfessionalSettings },
  { name: 'TermsOfService', component: TermsOfService },
  { name: 'HelpFAQ', component: HelpFAQ },
  { name: 'ContactUs', component: ContactUs },
  { name: 'ProfessionalProfile', component: ProfessionalProfile },
  { name: 'MyContracts', component: MyContracts },
  { name: 'ChangePassword', component: ChangePassword },
  { name: 'MyBookings', component: MyBookings },
  { name: 'ServiceManager', component: ServiceManagerScreen },
  { name: 'Blog', component: BlogScreen },
  { name: 'BlogPost', component: BlogPost },
  { name: 'Waitlist', component: Waitlist },
  { name: 'TestToast', component: TestToast },
  { name: 'Connections', component: Connections },
];

const createLinking = (authContext) => ({
  enabled: true,
  prefixes: [
    'https://staging.crittrcove.com',
    'http://staging.crittrcove.com',
    `${API_BASE_URL}`
  ],
  getInitialURL: async () => {
    if (Platform.OS !== 'web') {
      return null; // Let React Navigation handle mobile normally
    }
    
    const url = window.location.href;
    const pathname = window.location.pathname;
    
    debugLog('MBAo34invid3w LINKING: Checking initial URL for auth protection:', { url, pathname });
    
    // List of protected paths
    const protectedPaths = [
      '/Dashboard', '/dashboard',
      '/MyProfile', '/my-profile', 
      '/MessageHistory', '/message-history',
      '/OwnerHistory', '/owner-history',
      '/BecomeProfessional', '/become-professional',
      '/MoreScreen', '/more-screen',
      '/Owners', '/owners',
      '/AvailabilitySettings', '/availability-settings',
      '/Settings', '/settings',
      '/ProfessionalSettings', '/professional-settings',
      '/ProfessionalProfile', '/professional-profile',
      '/MyContracts', '/my-contracts',
      '/ChangePassword', '/change-password',
      '/MyBookings', '/my-bookings',
      '/ServiceManager', '/service-manager',
      '/TestToast', '/test-toast',
      '/Connections', '/connections'
    ];
    
    const isProtectedPath = protectedPaths.some(path => 
      pathname.startsWith(path) || pathname === path
    );
    
    debugLog('MBAo34invid3w LINKING: Path protection check:', {
      pathname,
      isProtectedPath,
      authContextExists: !!authContext,
      authContextInitialized: authContext?.isInitialized,
      authContextSignedIn: authContext?.isSignedIn
    });
    
    if (isProtectedPath) {
      // Wait for auth context to be available and initialized
      let waitCount = 0;
      while ((!authContext || !authContext.isInitialized) && waitCount < 50) {
        debugLog('MBAo34invid3w LINKING: Waiting for auth context...', waitCount);
        await new Promise(resolve => setTimeout(resolve, 100));
        waitCount++;
      }
      
      if (authContext && !authContext.isSignedIn) {
        debugLog('MBAo34invid3w LINKING: Protected path accessed without auth, redirecting to signin');
        const baseUrl = url.split(pathname)[0];
        return `${baseUrl}/signin`;
      } else {
        debugLog('MBAo34invid3w LINKING: Auth context available, user signed in or path not protected');
      }
    }
    
    debugLog('MBAo34invid3w LINKING: Allowing access to URL:', url);
    return url;
  },
  config: {
    screens: {
      Home: '/',  // Only match root path
      MyProfile: 'my-profile',
      SignIn: 'signin',
      SignUp: {
        path: 'signup/:token?',
        parse: {
          token: (token) => token || null
        }
      },
      Invite: {
        path: 'invite/:token',
        exact: true,
        parse: {
          token: (token) => token
        },
        stringify: {
          token: (token) => token
        }
      },
      ResetPassword: 'reset-password',
      ResetPasswordConfirm: 'reset-password/:uid/:token',
      SearchProfessionalsListing: 'SearchProfessionalsListing',
      OwnerHistory: 'owner-history',
      MessageHistory: {
        path: 'message-history',
        parse: {
          messageId: (messageId) => messageId || null,
          senderName: (senderName) => senderName || 'Unknown User'
        }
      },
      Dashboard: 'Dashboard',
      BecomeProfessional: 'become-professional',
      More: 'more',
      Owners: 'owners',
      AvailabilitySettings: 'availability-settings',
      Settings: 'settings',
      PrivacyPolicy: 'privacy-policy',
      ProfessionalSettings: 'professional-settings',
      TermsOfService: 'terms-of-service',
      HelpFAQ: 'help-faq',
      ContactUs: 'contact-us',
      ProfessionalProfile: {
        path: 'professional-profile',
        parse: {
          professional: (professional) => undefined
        }
      },
      MyContracts: 'my-contracts',
      ChangePassword: 'change-password',
      MyBookings: 'my-bookings',
      ServiceManager: 'service-manager',
      Blog: 'blog',
      BlogPost: 'blog-post',
      Waitlist: 'waitlist',
      TestToast: 'test-toast',
      Connections: 'connections',
    }
  }
});


export const navigationRef = createNavigationContainerRef();

export function navigate(name, params) {
  if (navigationRef.isReady()) {
    navigationRef.navigate(name, params);
  }
}

function TabNavigator({ initialRouteName = 'Home' }) {
  return (
    <Tab.Navigator 
      initialRouteName={initialRouteName}
      tabBar={props => <Navigation {...props} />}
    >
      {screens.map(screen => (
        <Tab.Screen 
          key={screen.name}
          name={screen.name} 
          component={screen.component} 
          options={{ headerShown: false }} 
        />
      ))}
    </Tab.Navigator>
  );
}

const MVPWarning = () => {
  const [isVisible, setIsVisible] = useState(true);
  const navigation = useNavigation();

  useEffect(() => {
    const checkBannerStatus = async () => {
      const hidden = await getStorage('mvp_banner_hidden');
      if (hidden === 'true') {
        setIsVisible(false);
      }
    };
    checkBannerStatus();
  }, []);

  const hideBanner = async () => {
    await setStorage('mvp_banner_hidden', 'true');
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <View style={styles.warningBanner}>
      <View style={styles.warningContent}>
        <TouchableOpacity 
          style={styles.closeButton}
          onPress={hideBanner}
        >
          <Text style={styles.closeButtonText}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.warningText}>
          🚧 MVP MODE: Features are still under development.
        </Text>
        <TouchableOpacity 
          style={styles.waitlistButton}
          onPress={() => navigateToFrom(navigation, 'Waitlist', 'Home')}
        >
          <Text style={styles.waitlistButtonText}>Join Waitlist</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

function AppContent() {
  const authContext = useContext(AuthContext);
  const { checkAuthStatus, is_DEBUG, isInitialized, isSignedIn, userRole } = authContext;
  const [initialRoute, setInitialRoute] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isVisible, setIsVisible] = useState(true);
  const [inviteToken, setInviteToken] = useState(null);

  // Check for invitation in the URL
  useEffect(() => {
    if (Platform.OS === 'web') {
      // Use platform navigation to get current route info
      const currentRouteInfo = platformNavigation.getCurrentRoute();
      const url = currentRouteInfo.path;
      
      if (authContext.debugLog) {
        authContext.debugLog('MBA6666 App - Current URL path:', url);
      }
      
      if (url.includes('/invite/')) {
        const pathParts = url.split('/');
        const inviteIndex = pathParts.findIndex(part => part === 'invite');
        if (inviteIndex !== -1 && pathParts.length > inviteIndex + 1) {
          const token = pathParts[inviteIndex + 1];
          if (authContext.debugLog) {
            authContext.debugLog('MBA6666 Found invitation token in URL:', token);
          }
          setInviteToken(token);
        }
      }
    }
  }, []);

  useEffect(() => {
    const initializeApp = async () => {
      // Wait for AuthContext to be fully initialized
      if (!isInitialized) {
        debugLog('MBAo34invid3w App initialization: AuthContext not yet initialized');
        return;
      }

      try {
        let route = 'Home';

        debugLog('MBAo34invid3w App initialization starting:', {
          inviteToken: !!inviteToken,
          isSignedIn,
          userRole,
          platform: Platform.OS
        });

        // If we have an invite token, go to SignUp
        if (inviteToken) {
          if (authContext.debugLog) {
            authContext.debugLog('MBAo34invid3w Setting initial route to SignUp with token:', inviteToken);
          }
          route = 'SignUp';
        }
        // If user is authenticated and no invite token, go to appropriate screen
        else if (isSignedIn) {
          route = 'Dashboard'; // Both roles go to Dashboard now
          if (authContext.debugLog) {
            authContext.debugLog('MBAo34invid3w User authenticated, setting route to:', route, 'for role:', userRole);
          }
        } else {
          // User not signed in - check if they're trying to access a protected route
          if (Platform.OS === 'web' && typeof window !== 'undefined') {
            const currentPath = window.location.pathname;
            const protectedPaths = [
              '/Dashboard', '/dashboard',
              '/MyProfile', '/my-profile',
              '/MessageHistory', '/message-history',
              '/OwnerHistory', '/owner-history',
              '/BecomeProfessional', '/become-professional',
              '/More', '/more',
              '/Owners', '/owners',
              '/AvailabilitySettings', '/availability-settings',
              '/Settings', '/settings',
              '/ProfessionalSettings', '/professional-settings',
              '/ProfessionalProfile', '/professional-profile',
              '/MyContracts', '/my-contracts',
              '/ChangePassword', '/change-password',
              '/MyBookings', '/my-bookings',
              '/ServiceManager', '/service-manager',
              '/TestToast', '/test-toast',
              '/Connections', '/connections'
            ];
            
            const isOnProtectedPath = protectedPaths.some(path => 
              currentPath.startsWith(path) || currentPath === path
            );
            
            debugLog('MBAo34invid3w App initialization: Web route check:', {
              currentPath,
              isOnProtectedPath,
              isSignedIn,
              platform: Platform.OS
            });
            
            if (isOnProtectedPath) {
              debugLog('MBAo34invid3w Web: User not authenticated but on protected path, redirecting to SignIn');
              route = 'SignIn';
            } else {
              route = 'Home';
              if (authContext.debugLog) {
                authContext.debugLog('MBAo34invid3w User not authenticated, setting route to Home');
              }
            }
          } else {
            route = 'Home';
            if (authContext.debugLog) {
              authContext.debugLog('MBAo34invid3w User not authenticated, setting route to Home');
            }
          }
        }

        setInitialRoute(route);
        debugLog('MBAo34invid3w Final initial route set to:', route);
      } catch (error) {
        console.error('Error initializing app:', error);
        setInitialRoute(inviteToken ? 'SignUp' : 'Home');
      } finally {
        setIsLoading(false);
        debugLog('MBAo34invid3w App initialization completed, loading set to false');
      }
    };

    initializeApp();
  }, [inviteToken, isInitialized, isSignedIn, userRole]);

  // Route guard effect - handles URL-based redirects after app initialization
  useEffect(() => {
    if (Platform.OS !== 'web' || !isInitialized || isLoading) {
      return;
    }

    const checkAndRedirectProtectedRoute = () => {
      if (typeof window === 'undefined') return;
      
      const currentPath = window.location.pathname;
      const protectedPaths = [
        '/Dashboard', '/dashboard',
        '/MyProfile', '/my-profile',
        '/MessageHistory', '/message-history',
        '/OwnerHistory', '/owner-history',
        '/BecomeProfessional', '/become-professional',
        '/More', '/more',
        '/Owners', '/owners',
        '/AvailabilitySettings', '/availability-settings',
        '/Settings', '/settings',
        '/ProfessionalSettings', '/professional-settings',
        '/ProfessionalProfile', '/professional-profile',
        '/MyContracts', '/my-contracts',
        '/ChangePassword', '/change-password',
        '/MyBookings', '/my-bookings',
        '/ServiceManager', '/service-manager',
        '/TestToast', '/test-toast',
        '/Connections', '/connections'
      ];
      
      const isOnProtectedPath = protectedPaths.some(path => 
        currentPath.startsWith(path) || currentPath === path
      );
      
      debugLog('MBAo34invid3w Route guard check:', {
        currentPath,
        isOnProtectedPath,
        isSignedIn,
        isInitialized,
        isLoading,
        platform: Platform.OS
      });
      
      if (isOnProtectedPath && !isSignedIn) {
        debugLog('MBAo34invid3w Route guard: Redirecting unauthenticated user from protected route');
        // Use window.location.href for immediate redirect
        window.location.href = '/signin';
      }
    };

    // Small delay to ensure all initialization is complete
    const timeoutId = setTimeout(checkAndRedirectProtectedRoute, 100);
    
    return () => clearTimeout(timeoutId);
  }, [isInitialized, isSignedIn, isLoading]);

  // Handle route changes without triggering auth checks
  useEffect(() => {
    if (!isLoading && initialRoute && Platform.OS !== 'web') {
      AsyncStorage.setItem('lastRoute', initialRoute)
        .catch(error => console.error('Error storing route:', error));
    }
  }, [initialRoute, isLoading]);

  if (!isInitialized || isLoading || !initialRoute) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background }}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={{ marginTop: 16, color: theme.colors.text, fontSize: 16 }}>Loading...</Text>
      </View>
    );
  }

  // Add navigation state listener
  const handleNavigationStateChange = async (state) => {
    // Store route for mobile
    if (Platform.OS !== 'web' && state?.routes?.length > 0) {
      const currentRoute = state.routes[state.routes.length - 1].name;
      await AsyncStorage.setItem('lastRoute', currentRoute)
        .catch(error => console.error('Error storing route:', error));
    }
    
    // Web route protection - only redirect if clearly unauthenticated on protected route
    if (Platform.OS === 'web' && state?.routes?.length > 0) {
      const currentRoute = state.routes[state.routes.length - 1];
      const routeName = currentRoute.name;
      
      debugLog('MBAo34invid3w Navigation state change:', {
        routeName,
        currentPath: typeof window !== 'undefined' ? window.location.pathname : 'unknown',
        isInitialized,
        isSignedIn,
        platform: Platform.OS
      });
      
      // List of protected route names (these are route names, not paths)
      const protectedRoutes = [
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
      
      const isProtectedRoute = protectedRoutes.includes(routeName);
      
      debugLog('MBAo34invid3w Navigation protection check:', {
        routeName,
        isProtectedRoute,
        isInitialized,
        isSignedIn,
        shouldRedirect: isProtectedRoute && isInitialized && !isSignedIn && routeName !== 'SignIn'
      });
      
      // Only redirect if:
      // 1. On a protected route
      // 2. Auth is fully initialized (not still loading)
      // 3. User is definitely not signed in
      // 4. Not already on signin page
      if (isProtectedRoute && isInitialized && !isSignedIn && routeName !== 'SignIn') {
        debugLog('MBAo34invid3w Web: Protected route accessed without authentication, redirecting to signin');
        // Use React Navigation instead of window.location to avoid full page reload
        if (navigationRef.current) {
          navigationRef.current.navigate('SignIn');
        }
      }
    }
  };

  return (
    <NavigationContainer
      ref={navigationRef}
      linking={createLinking(authContext)}
      onStateChange={handleNavigationStateChange}
    >
      <MessageNotificationProvider>
        <TutorialProvider>
          <PaperProvider theme={theme}>
            <ToastProvider>
              {/* {isVisible && <MVPWarning />} */}
              {Platform.OS === 'web' ? (
                <Stack.Navigator
                  initialRouteName={initialRoute}
                  screenOptions={{
                    headerShown: true,
                    header: ({ navigation }) => <Navigation navigation={navigation} />,
                    ...TransitionPresets.SlideFromRightIOS,
                    presentation: 'card',
                    animation: 'slide_from_right'
                  }}
                >
                  {screens.map(screen => (
                    <Stack.Screen 
                      key={screen.name}
                      name={screen.name} 
                      component={screen.component}
                      options={{
                        headerShown: true,
                        animation: 'slide_from_right'
                      }}
                    />
                  ))}
                </Stack.Navigator>
              ) : (
                <TabNavigator initialRouteName={initialRoute} />
              )}
            </ToastProvider>
          </PaperProvider>
        </TutorialProvider>
      </MessageNotificationProvider>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
  },
  warningBanner: {
    backgroundColor: '#ffebee',
    padding: Platform.OS === 'web' ? 12 : 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ef5350',
    width: '100%',
    flexShrink: 0, // Prevent banner from shrinking
  },
  warningContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 10,
    maxWidth: 1200,
    marginHorizontal: 'auto',
    width: '100%',
  },
  warningText: {
    color: '#c62828',
    textAlign: 'center',
    fontSize: Platform.OS === 'web' ? 15 : 14,
    flexShrink: 1,
    flex: 1,
    marginHorizontal: 15,
  },
  waitlistButton: {
    backgroundColor: '#ef5350',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    marginLeft: 'auto',
  },
  waitlistButtonText: {
    color: 'white',
    fontSize: Platform.OS === 'web' ? 14 : 13,
    fontWeight: '600',
  },
  closeButton: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 5,
  },
  closeButtonText: {
    color: '#c62828',
    fontSize: 18,
    fontWeight: '600',
  },
});

export default function App() {
  const [fontsLoaded, setFontsLoaded] = useState(false);

  useEffect(() => {
    const initializeFonts = async () => {
      if (Platform.OS !== 'web') {
        // Only load fonts on mobile platforms
        try {
          await loadFonts();
          debugLog('MBA1234: Fonts loaded successfully');
        } catch (error) {
          console.warn('MBA1234: Error loading fonts:', error);
        }
      }
      setFontsLoaded(true);
    };

    initializeFonts();
  }, []);

  // Show loading screen while fonts are loading on mobile
  if (!fontsLoaded && Platform.OS !== 'web') {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background }}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={{ marginTop: 16, color: theme.colors.text }}>Loading fonts...</Text>
      </View>
    );
  }

  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

