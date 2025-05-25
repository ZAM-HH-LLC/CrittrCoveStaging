import React, { useContext, useEffect, useState } from 'react';
import { View, StyleSheet, Alert, Platform, SafeAreaView, StatusBar } from 'react-native';
import { List, Divider, Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../styles/theme';
import { AuthContext } from '../context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { navigateToFrom } from '../components/Navigation';

const MoreScreen = ({ navigation }) => {
  const { isSignedIn, isApprovedProfessional, userRole, switchRole, signOut, screenWidth, isCollapsed, is_DEBUG } = useContext(AuthContext);
  const [isMobile, setIsMobile] = useState(screenWidth <= 900);
  const styles = createStyles(screenWidth, isCollapsed);

  useEffect(() => {
    const updateLayout = () => {
      setIsMobile(screenWidth <= 900);
    };
    updateLayout();
  }, [screenWidth]);

  useEffect(() => {
    const initializeRoutes = async () => {
      try {
        const initialRoute = isSignedIn 
          ? 'Dashboard'
          : 'Home';

        if (Platform.OS === 'web') {
          sessionStorage.setItem('currentRoute', initialRoute);
          sessionStorage.setItem('previousRoute', 'More');
        } else {
          await AsyncStorage.setItem('currentRoute', initialRoute);
          await AsyncStorage.setItem('previousRoute', 'More');
        }
      } catch (error) {
        console.error('Error initializing routes:', error);
      }
    };

    initializeRoutes();
  }, [isSignedIn, userRole]);

  const handleNavigation = async (route, tab) => {
    try {
      await navigateToFrom(navigation, route, 'More', tab);
    } catch (error) {
      console.error('Error handling navigation:', error);
      navigation.navigate(route);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
      // Clear navigation history on logout
      if (Platform.OS === 'web') {
        sessionStorage.removeItem('currentRoute');
        sessionStorage.removeItem('previousRoute');
      } else {
        await AsyncStorage.multiRemove(['currentRoute', 'previousRoute']);
      }
      Alert.alert('Logged Out', 'You have been successfully logged out.');
      navigation.navigate('Home');
    } catch (error) {
      console.error('Logout failed', error);
      Alert.alert('Logout Failed', 'An error occurred while logging out.');
    }
  };

  const handleSwitchRole = async () => {
    if (isApprovedProfessional) {
      const newRole = userRole === 'professional' ? 'petOwner' : 'professional';
      
      await switchRole();
      
      // Store new route before navigating
      const newRoute = 'Dashboard';
      if (Platform.OS === 'web') {
        sessionStorage.setItem('currentRoute', newRoute);
      } else {
        await AsyncStorage.setItem('currentRoute', newRoute);
      }
      
      // Add a small delay to ensure state is updated before navigation
      setTimeout(() => {
        navigation.navigate(newRoute);
      }, 0);
    } else {
      Alert.alert('Not Approved', 'You are not approved as a professional yet.');
      handleNavigation('BecomeProfessional', 'Overview');
    }
  };

  const menuItems = {
    notSignedIn: [
      { title: 'Privacy Policy', icon: 'shield-account', route: 'PrivacyPolicy' },
      { title: 'Terms of Service', icon: 'file-document', route: 'TermsOfService' },
    ],
    petOwner: [
      { title: 'Profile', icon: 'account', route: 'MyProfile' },
      { title: 'My Bookings', icon: 'calendar-clock', route: 'MyBookings' },
      { title: 'Payment Methods', icon: 'credit-card', route: 'PaymentMethods' },
      { title: 'Become a Professional', icon: 'account-tie', route: 'BecomeProfessional' },
      { title: 'Settings', icon: 'cog', route: 'Settings' },
      { title: 'Blog', icon: 'post', route: 'Blog' },
      { title: 'Privacy Policy', icon: 'shield-account', route: 'PrivacyPolicy' },
      { title: 'Terms of Service', icon: 'file-document', route: 'TermsOfService' },
      { title: 'Contact Us', icon: 'email', route: 'ContactUs' },
    ],
    professional: [
      { title: 'Profile', icon: 'account', route: 'MyProfile' },
      { title: 'My Services', icon: 'briefcase-outline', route: 'ServiceManager' },
      { title: 'My Bookings', icon: 'calendar-clock', route: 'MyBookings' },
      { title: 'Payment Methods', icon: 'credit-card', route: 'PaymentMethods' },
      { title: 'Settings', icon: 'cog', route: 'Settings' },
      { title: 'Blog', icon: 'post', route: 'Blog' },
      { title: 'Privacy Policy', icon: 'shield-account', route: 'PrivacyPolicy' },
      { title: 'Terms of Service', icon: 'file-document', route: 'TermsOfService' },
      { title: 'Contact Us', icon: 'email', route: 'ContactUs' },
    ],
  };

  const renderMenuItems = () => {
    let items;
    if (!isSignedIn) {
      items = menuItems.notSignedIn;
    } else if (userRole === 'professional') {
      items = menuItems.professional;
    } else {
      items = menuItems.petOwner;
    }

    return items.map((item, index) => (
      <React.Fragment key={index}>
        <List.Item
          title={item.title}
          titleStyle={styles.listItemTitle}
          left={props => 
            Platform.OS === 'web' 
              ? <MaterialCommunityIcons 
                  name={item.icon} 
                  size={screenWidth <= 900 ? 20 : 24} 
                  color={theme.colors.primary} 
                />
              : <List.Icon {...props} icon={item.icon} />
          }
          onPress={() => handleNavigation(item.route, item.tab || 'Overview')}
          style={[
            styles.webListItem,
            { paddingHorizontal: screenWidth <= 900 ? 8 : 16 }
          ]}
        />
        {index < items.length - 1 && <Divider />}
      </React.Fragment>
    ));
  };

  return (
    <View style={styles.mainContainer}>
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <View style={styles.webContent}>
            <List.Section style={styles.listSection}>
              {renderMenuItems()}
            </List.Section>
            {isSignedIn && (
              <View style={styles.buttonContainer}>
                <Button 
                  mode="contained" 
                  onPress={handleLogout} 
                  style={[styles.logoutButton]}
                  labelStyle={styles.buttonText}
                >
                  Log Out
                </Button>
              </View>
            )}
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
};

const createStyles = (screenWidth, isCollapsed) => StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
    height: '100vh',
    overflow: 'hidden',
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    marginLeft: screenWidth > 900 ? (isCollapsed ? 70 : 250) : 0,
    transition: 'margin-left 0.3s ease',
  },
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  webContent: {
    width: '100%',
    maxWidth: screenWidth > 900 ? 800 : 600,
    alignSelf: 'center',
    padding: screenWidth <= 900 ? 10 : 16,
    paddingTop: screenWidth <= 900 ? 80 : 16,
  },
  listSection: {
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
    marginBottom: 16,
  },
  webListItem: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    paddingVertical: screenWidth <= 900 ? 8 : 12,
  },
  listItemTitle: {
    fontSize: screenWidth <= 900 ? theme.fontSizes.medium : theme.fontSizes.large,
    fontFamily: theme.fonts.regular.fontFamily,
    fontWeight: '600',
  },
  buttonContainer: {
    marginBottom: 16,
  },
  switchRoleButton: {
    borderColor: theme.colors.primary,
  },
  logoutButton: {
    backgroundColor: theme.colors.error,
  },
  buttonText: {
    fontFamily: theme.fonts.regular.fontFamily,
    fontWeight: '600',
  }
});

export default MoreScreen;
