import React, { useEffect, useState, useContext } from 'react';
import { Platform, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Provider as PaperProvider } from 'react-native-paper';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator, TransitionPresets } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Navigation from './src/components/Navigation';
import { theme } from './src/styles/theme';
import { AuthProvider, AuthContext } from './src/context/AuthContext';
import { API_BASE_URL } from './src/config/config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createNavigationContainerRef } from '@react-navigation/native';
import { Linking } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { navigateToFrom } from './src/components/Navigation';

// Import all your screen components
import HomeScreen from './src/screens/HomeScreen';
import AboutScreen from './src/screens/AboutScreen';
import OwnerProfile from './src/screens/OwnerProfile';
import MyProfile from './src/screens/MyProfile';
import SignIn from './src/screens/SignIn';
import SignUp from './src/screens/SignUp';
import ResetPassword from './src/screens/ResetPassword';
import ResetPasswordConfirm from './src/screens/ResetPasswordConfirm';
// import Dashboard from './src/screens/Dashboard';
import Dashboard from './src/screens/Dashboard';
import BecomeProfessional from './src/screens/BecomeProfessional';
import MoreScreen from './src/screens/MoreScreen';
import AvailabilitySettings from './src/screens/AvailabilitySettings';
// import Messages from './src/screens/Messages';
import MyPets from './src/screens/MyPets';
import OwnerHistory from './src/screens/OwnerHistory';
import MessageHistory from './src/screens/MessageHistory';
import PaymentMethods from './src/screens/PaymentMethods';
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
import AddPet from './src/screens/AddPet';
import SearchProfessionalsListing from './src/screens/SearchProfessionalsListing';
import MyBookings from './src/screens/MyBookings';
import BookingDetails from './src/screens/BookingDetails';
import ServiceManagerScreen from './src/screens/ServiceManagerScreen';
import BlogScreen from './src/screens/BlogScreen';
import BlogPost from './src/screens/BlogPost';
import Waitlist from './src/screens/Waitlist';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const screens = [
  { name: 'Home', component: HomeScreen },
  { name: 'About', component: AboutScreen },
  { name: 'OwnerProfile', component: OwnerProfile },
  { name: 'MyProfile', component: MyProfile },  
  { name: 'SignIn', component: SignIn },
  { name: 'SignUp', component: SignUp },
  { name: 'ResetPassword', component: ResetPassword },
  { name: 'ResetPasswordConfirm', component: ResetPasswordConfirm },
  { name: 'SearchProfessionalsListing', component: SearchProfessionalsListing },
  { name: 'OwnerHistory', component: OwnerHistory },
  { name: 'MessageHistory', component: MessageHistory },
  { name: 'Dashboard', component: Dashboard },
  { name: 'BecomeProfessional', component: BecomeProfessional },
  { name: 'More', component: MoreScreen },
  { name: 'Owners', component: Owners },
  { name: 'AvailabilitySettings', component: AvailabilitySettings },
  { name: 'MyPets', component: MyPets },
  { name: 'PaymentMethods', component: PaymentMethods },
  { name: 'Settings', component: Settings },
  { name: 'PrivacyPolicy', component: PrivacyPolicy },
  { name: 'ProfessionalSettings', component: ProfessionalSettings },
  { name: 'TermsOfService', component: TermsOfService },
  { name: 'HelpFAQ', component: HelpFAQ },
  { name: 'ContactUs', component: ContactUs },
  { name: 'ProfessionalProfile', component: ProfessionalProfile },
  { name: 'MyContracts', component: MyContracts },
  { name: 'ChangePassword', component: ChangePassword },
  { name: 'AddPet', component: AddPet },
  { name: 'MyBookings', component: MyBookings },
  { name: 'BookingDetails', component: BookingDetails },
  { name: 'ServiceManager', component: ServiceManagerScreen },
  { name: 'Blog', component: BlogScreen },
  { name: 'BlogPost', component: BlogPost },
  { name: 'Waitlist', component: Waitlist },
];

const linking = {
  enabled: true,
  prefixes: [
    'https://staging.crittrcove.com',
    'http://staging.crittrcove.com',
    `${API_BASE_URL}`
  ],
  config: {
    screens: {
      Home: '*',  // This will catch all unmatched routes
      About: 'about',
      OwnerProfile: 'owner-profile',
      MyProfile: 'my-profile',
      SignIn: 'signin',
      SignUp: 'signup',
      ResetPassword: 'reset-password',
      ResetPasswordConfirm: 'reset-password/:uid/:token',
      SearchProfessionalsListing: 'search-professionals-listing',
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
      MyPets: 'my-pets',
      PaymentMethods: 'payment-methods',
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
      AddPet: {
        path: 'add-pet',
        parse: {
          pet: () => undefined
        }
      },
      MyBookings: 'my-bookings',
      BookingDetails: 'booking-details',
      ServiceManager: 'service-manager',
      Blog: 'blog',
      BlogPost: 'blog-post',
      Waitlist: 'waitlist'
    }
  }
};


export const navigationRef = createNavigationContainerRef();

export function navigate(name, params) {
  if (navigationRef.isReady()) {
    navigationRef.navigate(name, params);
  }
}

function TabNavigator() {
  return (
    <Tab.Navigator tabBar={props => <Navigation {...props} />}>
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
      if (Platform.OS === 'web') {
        const hidden = sessionStorage.getItem('mvp_banner_hidden');
        if (hidden === 'true') {
          setIsVisible(false);
        }
      } else {
        const hidden = await AsyncStorage.getItem('mvp_banner_hidden');
        if (hidden === 'true') {
          setIsVisible(false);
        }
      }
    };
    checkBannerStatus();
  }, []);

  const hideBanner = async () => {
    if (Platform.OS === 'web') {
      sessionStorage.setItem('mvp_banner_hidden', 'true');
    } else {
      await AsyncStorage.setItem('mvp_banner_hidden', 'true');
    }
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
  const { checkAuthStatus, is_DEBUG } = useContext(AuthContext);
  const [initialRoute, setInitialRoute] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        const authStatus = await checkAuthStatus();
        let route = 'Home';

        // Only change route if user is authenticated
        if (authStatus.isSignedIn) {
          if (is_DEBUG) {
            console.log('Auth status on init:', authStatus);
          }
          route = 'Dashboard'
        } else {
          route = 'Home';
        }

        // For web platform
        if (Platform.OS === 'web') {
          const path = window.location.pathname;
          
          // If we're at the root path, use the route based on auth status
          if (path === '/' || path === '') {
            // route is already set based on auth status above
          } else {
            // Extract the route from the path
            const routePath = path.slice(1).split('/')[0].toLowerCase();
            if (routePath === 'home') {
              // Use the route based on auth status
            } else {
              // Find the matching screen for the current path
              const matchingScreen = screens.find(screen => 
                screen.name.toLowerCase() === routePath
              );
              if (matchingScreen) {
                route = matchingScreen.name;
              }
            }
          }
        }

        setInitialRoute(route);
      } catch (error) {
        console.error('Error initializing app:', error);
        setInitialRoute('Home');
      } finally {
        setIsLoading(false);
      }
    };

    initializeApp();
  }, []);

  // Handle route changes without triggering auth checks
  useEffect(() => {
    if (!isLoading && initialRoute && Platform.OS !== 'web') {
      AsyncStorage.setItem('lastRoute', initialRoute)
        .catch(error => console.error('Error storing route:', error));
    }
  }, [initialRoute, isLoading]);

  if (isLoading || !initialRoute) {
    return null; // Or a loading spinner component
  }

  const hideBanner = async () => {
    if (Platform.OS === 'web') {
      sessionStorage.setItem('mvp_banner_hidden', 'true');
    } else {
      await AsyncStorage.setItem('mvp_banner_hidden', 'true');
    }
    setIsVisible(false);
  };

  

  return (
    <NavigationContainer 
      ref={navigationRef}
      linking={linking}
      onStateChange={async (state) => {
        if (Platform.OS !== 'web' && state?.routes?.length > 0) {
          const currentRoute = state.routes[state.routes.length - 1].name;
          await AsyncStorage.setItem('lastRoute', currentRoute)
            .catch(error => console.error('Error storing route:', error));
        }
      }}
    >
      {isVisible && <MVPWarning />}
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
        <TabNavigator />
      )}
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
  return (
    <AuthProvider>
      <PaperProvider theme={theme}>
        <AppContent />
      </PaperProvider>
    </AuthProvider>
  );
}

