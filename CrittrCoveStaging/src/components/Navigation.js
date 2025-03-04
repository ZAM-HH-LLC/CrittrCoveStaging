import React, { useState, useContext, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Platform, SafeAreaView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../styles/theme';
import { AuthContext } from '../context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appbar, Menu, useTheme } from 'react-native-paper';

let previousRoute, currentRoute;

export const handleBack = async (navigation) => {
  try {
    if (Platform.OS === 'web') {
      previousRoute = sessionStorage.getItem('previousRoute');
      currentRoute = sessionStorage.getItem('currentRoute');
      
      if (previousRoute) {
        console.log('MBA98386196v Previous Route Before:', previousRoute);
        console.log('MBA98386196v Current Route Before:', currentRoute);
        
        // Get the previous-previous route
        const prevPrevRoute = sessionStorage.getItem('prevPrevRoute');
        
        // Navigate to previous route
        navigation.navigate(previousRoute);
        
        // Update the chain
        sessionStorage.setItem('currentRoute', previousRoute);
        sessionStorage.setItem('previousRoute', prevPrevRoute || '');
        
        console.log('MBA98386196v Previous Route After:', sessionStorage.getItem('previousRoute'));
        console.log('MBA98386196v Current Route After:', sessionStorage.getItem('currentRoute'));
      } else {
        console.log('MBA98386196v No Previous Route');
        // Default to More screen if no previous route
        navigation.navigate('More');
      }
    } else {
      previousRoute = await AsyncStorage.getItem('previousRoute');
      currentRoute = await AsyncStorage.getItem('currentRoute');
      
      if (previousRoute) {
        // Get the previous-previous route
        const prevPrevRoute = await AsyncStorage.getItem('prevPrevRoute');
        
        // Navigate to previous route
        navigation.navigate(previousRoute);
        
        // Update the chain
        await AsyncStorage.setItem('currentRoute', previousRoute);
        await AsyncStorage.setItem('previousRoute', prevPrevRoute || '');
        
        console.log('MBA98386196v Previous Route:', previousRoute);
        console.log('MBA98386196v Current Route:', currentRoute);
      } else {
        // Default to More screen if no previous route
        navigation.navigate('More');
      }
    }

    if (previousRoute === currentRoute) {
      // console.log('Two routes are the same');
      navigation.navigate('More');
      return;
    }
  } catch (error) {
    console.error('Error handling back navigation:', error);
    navigation.navigate('More');
  }
};

export const navigateToFrom = async (navigation, toLocation, fromLocation, params = {}) => {
  try {
    if (Platform.OS === 'web') {
      // Store the current previousRoute as prevPrevRoute before updating
      const currentPreviousRoute = sessionStorage.getItem('previousRoute');
      if (currentPreviousRoute) {
        sessionStorage.setItem('prevPrevRoute', currentPreviousRoute);
      }
      
      sessionStorage.setItem('previousRoute', fromLocation);
      sessionStorage.setItem('currentRoute', toLocation);
      console.log('MBA98386196v Web - Set previousRoute:', fromLocation);
      console.log('MBA98386196v Web - Set currentRoute:', toLocation);
    } else {
      // Store the current previousRoute as prevPrevRoute before updating
      const currentPreviousRoute = await AsyncStorage.getItem('previousRoute');
      if (currentPreviousRoute) {
        await AsyncStorage.setItem('prevPrevRoute', currentPreviousRoute);
      }
      
      await AsyncStorage.setItem('previousRoute', fromLocation);
      await AsyncStorage.setItem('currentRoute', toLocation);
      console.log('MBA98386196v Mobile - Set previousRoute:', fromLocation);
      console.log('MBA98386196v Mobile - Set currentRoute:', toLocation);
    }
    setTimeout(() => {
      navigation.navigate(toLocation, params);
    }, 50);
  } catch (error) {
    console.error('Error navigating:', error);
    navigation.navigate(toLocation, params);
  }
};

export default function Navigation({ navigation }) {
  const [visible, setVisible] = useState(false);
  const [isMobile, setIsMobile] = useState(Dimensions.get('window').width < 900);
  const { colors } = useTheme();
  const { isSignedIn, is_DEBUG, userRole } = useContext(AuthContext);

  const openMenu = () => setVisible(true);
  const closeMenu = () => setVisible(false);

  useEffect(() => {
    const updateLayout = () => {
      setIsMobile(Dimensions.get('window').width < 900);
    };

    const subscription = Dimensions.addEventListener('change', updateLayout);

    return () => {
      subscription?.remove();
    };
  }, []);

  const professionalsTitle = Platform.OS === 'web' ? 'Search Pros' : 'Professionals';

  const handleNavigation = async (screenName) => {
    closeMenu();
    if (is_DEBUG) {
      console.log('Screen name:', screenName);
    }
    try {
      let currentRoute = '';
      if (Platform.OS === 'web') {
        // Web: Use sessionStorage
        currentRoute = sessionStorage.getItem('currentRoute');
        if (currentRoute) {
          sessionStorage.setItem('previousRoute', currentRoute);
        }
        sessionStorage.setItem('currentRoute', screenName);
      } else {
        // Mobile: Use AsyncStorage
        currentRoute = await AsyncStorage.getItem('currentRoute');
        if (currentRoute) {
          await AsyncStorage.setItem('previousRoute', currentRoute);
        }
        await AsyncStorage.setItem('currentRoute', screenName);
      }
      navigateToFrom(navigation, screenName, currentRoute);
    } catch (error) {
      console.error('Error handling navigation:', error);
      navigateToFrom(navigation, screenName, currentRoute);
    }
  };

  // Initialize route tracking on component mount
  useEffect(() => {
    const initializeRouteTracking = async () => {
      try {
        if (Platform.OS === 'web') {
          // Web: Use sessionStorage
          const currentRoute = sessionStorage.getItem('currentRoute');
          if (!currentRoute) {
            const initialRoute = isSignedIn 
              ? (userRole === 'professional' ? 'ProfessionalDashboard' : 'Dashboard')
              : 'Home';
            sessionStorage.setItem('currentRoute', initialRoute);
          }
        } else {
          // Mobile: Use AsyncStorage
          const currentRoute = await AsyncStorage.getItem('currentRoute');
          if (!currentRoute) {
            const initialRoute = isSignedIn 
              ? (userRole === 'professional' ? 'ProfessionalDashboard' : 'Dashboard')
              : 'Home';
            await AsyncStorage.setItem('currentRoute', initialRoute);
          }
        }
      } catch (error) {
        console.error('Error initializing route tracking:', error);
      }
    };

    initializeRouteTracking();
  }, [isSignedIn, userRole]);

  const renderMenuItems = () => {
    if (!isSignedIn) {
      if (isMobile) {
        return [
          { title: 'Sign In', icon: 'login', route: 'SignIn' },
          { title: 'Sign Up', icon: 'account-plus', route: 'SignUp' },
          { title: 'Become a Pro', icon: 'account-heart', route: 'BecomeProfessional' },
          { title: 'Search Pros', icon: 'magnify', route: 'SearchProfessionalsListing' },
          { title: 'More', icon: 'dots-horizontal', route: 'More' },
        ];
      }
      return [
        { title: 'Sign In', icon: 'login', route: 'SignIn' },
        { title: 'Sign Up', icon: 'account-plus', route: 'SignUp' },
        { title: 'More', icon: 'dots-horizontal', route: 'More' },
      ];
    } else if (userRole === 'professional') {
      return [
        { title: 'Pro Dashboard', icon: 'view-dashboard', route: 'ProfessionalDashboard' },
        { title: 'MyBookings', icon: 'account-group', route: 'MyBookings' },
        { title: 'Messages', icon: 'message-text', route: 'MessageHistory' },
        { title: 'Availability', icon: 'clock-outline', route: 'AvailabilitySettings' },
        { title: 'More', icon: 'dots-horizontal', route: 'More' },
      ];
    } else {
      return [
        { title: 'Dashboard', icon: 'view-dashboard', route: 'Dashboard' },
        { title: professionalsTitle, icon: 'magnify', route: 'SearchProfessionalsListing' },
        { title: 'Messages', icon: 'message-text', route: 'MessageHistory' },
        { title: 'Become a Pro', icon: 'paw', route: 'BecomeProfessional' },
        { title: 'More', icon: 'dots-horizontal', route: 'More' },
      ];
    }
  };

  const renderMobileNavBar = () => {
    const menuItems = renderMenuItems();
    const itemWidth = Dimensions.get('window').width / menuItems.length;
    return (
      <View style={styles.customNavBar}>
        {menuItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={[styles.navButton, { width: itemWidth }]}
            onPress={() => handleNavigation(item.route)}
          >
            <MaterialCommunityIcons 
              name={item.icon} 
              size={24} 
              color={theme.colors.whiteText} 
            />
            <Text style={styles.navText} numberOfLines={2} ellipsizeMode="tail">
              {item.title}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderWebNavItems = () => {
    const menuItems = renderMenuItems();
    return menuItems.map((item, index) => (
      <TouchableOpacity
        key={index}
        style={styles.webNavItem}
        onPress={() => handleNavigation(item.route)}
      >
        <Text style={styles.webNavText}>{item.title}</Text>
      </TouchableOpacity>
    ));
  };

  return (
    <>
      {Platform.OS === 'web' ? (
        <Appbar.Header style={[styles.header, { backgroundColor: colors.primary }]}>
          <View style={[styles.titleContainer, {flex: isMobile || isSignedIn ? 1 : undefined}]}>
            <TouchableOpacity onPress={() => handleNavigation('Home')} style={{ width: 150 }}>
              <Text style={[styles.title, { color: colors.whiteText, width: 110 }]}>CrittrCove</Text>
            </TouchableOpacity>
          </View>
          {!isMobile && !isSignedIn ? (
            <View style={styles.titleContainer2}>
              <TouchableOpacity onPress={() => handleNavigation('BecomeProfessional')} style={styles.navLinkContainer}>
                <MaterialCommunityIcons name="account-heart" size={20} color={theme.colors.whiteText} />
                <Text style={[styles.title, { color: theme.colors.whiteText, width: 110, fontWeight: '100', marginLeft: 4, fontSize: 16 }]}>Become a Pro</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleNavigation('SearchProfessionalsListing')} style={styles.navLinkContainer}>
                <MaterialCommunityIcons name="magnify" size={20} color={theme.colors.whiteText} />
                <Text style={[styles.title, { color: theme.colors.whiteText, width: 110, fontWeight: '100', marginLeft: 4, fontSize: 16 }]}>Search Pros</Text>
              </TouchableOpacity>
            </View>
          ) : null}
          {isMobile ? (
            <Menu
              visible={visible}
              onDismiss={closeMenu}
              anchor={
                <Appbar.Action
                  icon={() => <MaterialCommunityIcons name="menu" size={24} color={colors.whiteText} />}
                  onPress={openMenu}
                />
              }
            >
              {renderMenuItems().map((item, index) => (
                <Menu.Item 
                  key={index} 
                  onPress={() => handleNavigation(item.route)} 
                  title={item.title}
                  titleStyle={{ fontFamily: theme.fonts.regular.fontFamily, fontWeight: '600' }}
                />
              ))}
            </Menu>
          ) : (
            <View style={styles.desktopNav}>
              {renderWebNavItems()}
            </View>
          )}
        </Appbar.Header>
      ) : (
        <View style={styles.container}>
          {renderMobileNavBar()}
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    display: 'flex',
    // alignItems: 'center',
    // justifyContent: 'center',
    backgroundColor: theme.colors.primary,
  },
  content: {
    flex: 1,
  },
  header: {
    backgroundColor: theme.colors.primary,
  },
  titleContainer: {
    justifyContent: 'center',
  },
  titleContainer2: {
    flex: 1,
    justifyContent: 'center',
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  title: {
    textAlign: 'left',
    marginLeft: theme.spacing.medium,
    fontSize: theme.fontSizes.large,
    color: theme.colors.text,
    fontWeight: 'bold',
    fontFamily: theme.fonts.header.fontFamily,
  },
  desktopNav: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  navItem: {
    marginHorizontal: theme.spacing.medium,
    fontSize: theme.fontSizes.medium,
    color: theme.colors.text,
    cursor: 'pointer',
    fontFamily: theme.fonts.regular.fontFamily,
    fontWeight: '600',
  },
  customNavBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  navButton: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 60,
    paddingHorizontal: 5,
  },
  navText: {
    color: theme.colors.whiteText,
    fontSize: theme.fontSizes.small,
    marginTop: 5,
    textAlign: 'center',
    fontFamily: theme.fonts.regular.fontFamily,
    fontWeight: '600',
  },
  webNavItem: {
    marginHorizontal: theme.spacing.medium,
  },
  webNavText: {
    fontSize: theme.fontSizes.medium,
    color: theme.colors.whiteText,
    fontFamily: theme.fonts.regular.fontFamily,
    fontWeight: '600',
  },
  navLinkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 6,
  },
});
