import React, { useState, useContext, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Platform, SafeAreaView, Image } from 'react-native';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { theme } from '../styles/theme';
import { AuthContext, debugLog, getStorage, setStorage } from '../context/AuthContext';
import MessageNotificationContext from '../context/MessageNotificationContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appbar, Menu, useTheme, Avatar } from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import { BackHandler } from 'react-native';

let previousRoute, currentRoute;

export const handleBack = async (navigation) => {
  try {
    // Get previous and current routes from storage
    const previousRoute = await getStorage('previousRoute');
    const currentRoute = await getStorage('currentRoute');
    
    debugLog('MBAuieo2o34nf handleBack - routes from storage', { previousRoute, currentRoute });
    
    if (previousRoute) {
      // Get the active tab from the previous route if it exists
      const activeTab = await getStorage('MyProfileActiveTab');
      debugLog('MBAuieo2o34nf handleBack - active tab from storage', { activeTab });
      
      // Navigate to the previous route
      if (previousRoute === 'MyProfile' && activeTab) {
        navigation.navigate(previousRoute, { initialTab: activeTab });
      } else {
        navigation.navigate(previousRoute);
      }
      
      // Update storage with new current and previous routes
      await setStorage('currentRoute', previousRoute);
      await setStorage('previousRoute', currentRoute);
      
      debugLog('MBAuieo2o34nf handleBack - navigation complete', { 
        newCurrentRoute: previousRoute,
        newPreviousRoute: currentRoute
      });
    } else {
      // If no previous route, go to More screen
      navigation.navigate('Dashboard');
      debugLog('MBAuieo2o34nf handleBack - no previous route, going to More');
    }
  } catch (error) {
    debugLog('MBAuieo2o34nf handleBack - error', error);
    // If there's an error, go to More screen
    navigation.navigate('Dashboard');
  }
};

export const navigateToFrom = async (navigation, toLocation, fromLocation, params = {}) => {
  try {
    // Store current route as previous before navigation
    const currentRoute = await getStorage('currentRoute');
    await setStorage('previousRoute', currentRoute);
    
    // Special handling for MyProfile screen
    if (toLocation === 'MyProfile') {
      const activeTab = await getStorage('MyProfileActiveTab');
      if (activeTab) {
        params.initialTab = activeTab;
      }
    }
    
    // Navigate to the new screen
    navigation.navigate(toLocation, params);
    
    // Update current route in storage
    await setStorage('currentRoute', toLocation);
    
    debugLog('MBAuieo2o34nf navigateToFrom - navigation complete', {
      from: fromLocation,
      to: toLocation,
      params,
      previousRoute: currentRoute,
      newCurrentRoute: toLocation
    });
  } catch (error) {
    debugLog('MBAuieo2o34nf navigateToFrom - error', error);
  }
};

export default function Navigation({ state, descriptors, navigation }) {
  const [visible, setVisible] = useState(false);
  const [isMobile, setIsMobile] = useState(Dimensions.get('window').width < 900);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { colors } = useTheme();
  const { 
    isSignedIn, 
    is_DEBUG, 
    userRole, 
    isCollapsed, 
    setIsCollapsed, 
    switchRole, 
    screenWidth, 
    signOut,
    isApprovedProfessional 
  } = useContext(AuthContext);
  
  // Get message notification state
  const {
    hasUnreadMessages,
    unreadCount,
    resetNotifications,
    updateRoute
  } = useContext(MessageNotificationContext);
  
  const [currentRoute, setCurrentRoute] = useState('');
  const [notificationCount, setNotificationCount] = useState(3); // We can make this dynamic later

  // Add effect to log state changes
  useEffect(() => {
    if (is_DEBUG) {
      console.log('MBA98386196v Navigation State Update:', {
        isSignedIn,
        userRole,
        isApprovedProfessional,
        currentRoute
      });
    }
  }, [isSignedIn, userRole, isApprovedProfessional, currentRoute]);

  const openMenu = () => setVisible(true);
  const closeMenu = () => setVisible(false);
  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  useEffect(() => {
    const updateLayout = () => {
      setIsMobile(Dimensions.get('window').width < 900);
    };

    const subscription = Dimensions.addEventListener('change', updateLayout);

    return () => {
      subscription?.remove();
    };
  }, []);

  useEffect(() => {
    const updateCurrentRoute = async () => {
      try {
        let route;
        
        route = await getStorage('currentRoute');
        
        // Only log in debug mode, not every time
        if (is_DEBUG && route !== currentRoute) {
          console.log('MBA98386196v Current Route Updated:', route);
        }
        
        // Only update if the route has actually changed
        if (route && route !== currentRoute) {
          setCurrentRoute(route);
          
          // Update message notification context with new route
          // Avoiding infinite loops by checking if the route changed
          updateRoute && updateRoute(route);
          
          // Only reset notifications when navigating to MessageHistory
          if (route === 'MessageHistory' && hasUnreadMessages) {
            resetNotifications && resetNotifications(route);
          }
        }
      } catch (error) {
        console.error('Error updating current route:', error);
      }
    };

    updateCurrentRoute();
    // Add navigation state listener
    const unsubscribe = navigation.addListener('state', updateCurrentRoute);
    return unsubscribe;
  }, [navigation, resetNotifications, updateRoute, hasUnreadMessages, is_DEBUG]);

  // Listen for browser back/forward navigation and update currentRoute
  useEffect(() => {
    if (Platform.OS === 'web') {
      const handlePopState = async () => {
        const route = await getStorage('currentRoute');
        debugLog('MBAuieo2o34nf popstate detected, updating currentRoute from storage', { route });
        if (route && route !== currentRoute) {
          setCurrentRoute(route);
          updateRoute && updateRoute(route);
        }
      };
      window.addEventListener('popstate', handlePopState);
      return () => window.removeEventListener('popstate', handlePopState);
    }
  }, [currentRoute, updateRoute]);

  // Sync currentRoute in storage with navigation state changes
  useEffect(() => {
    const updateCurrentRouteInStorage = async () => {
      try {
        const navState = navigation.getState && navigation.getState();
        let routeName = '';
        if (navState) {
          const route = navState.routes[navState.index];
          routeName = route?.name || '';
        }
        if (routeName) {
          await setStorage('currentRoute', routeName);
          debugLog('MBAuieo2o34nf navigation state change - set currentRoute in storage', { routeName });
          setCurrentRoute(routeName);
          updateRoute && updateRoute(routeName);
        }
      } catch (error) {
        debugLog('MBAuieo2o34nf error updating currentRoute in storage', error);
      }
    };
    const unsubscribe = navigation.addListener('state', updateCurrentRouteInStorage);
    return unsubscribe;
  }, [navigation, updateRoute]);

  const handleNavigation = async (screenName, tabName = null) => {
    closeMenu();
    
    // Only log in debug mode to reduce console spam
    if (is_DEBUG) {
      console.log('MBA98386196v Navigating to:', screenName, tabName ? `with tab: ${tabName}` : '');
      console.log('MBA98386196v Current route before:', currentRoute);
    }
    
    try {
      // Don't do anything if we're already on this screen
      if (screenName === currentRoute) {
        // Special case: if we're on MessageHistory and have unread messages, reset notifications
        if (screenName === 'MessageHistory' && hasUnreadMessages) {
          resetNotifications && resetNotifications();
        }
        
        return;
      }
      
      setStorage('previousRoute', currentRoute);
      setStorage('currentRoute', screenName);
      
      // Update local state
      setCurrentRoute(screenName);
      
      // Update the MessageNotificationContext with the new route
      updateRoute && updateRoute(screenName);
      
      // Reset message notifications when navigating to MessageHistory
      if (screenName === 'MessageHistory' && hasUnreadMessages) {
        resetNotifications && resetNotifications();
      }
      
      // If we have a tab parameter, pass it in the params
      if (tabName) {
        navigateToFrom(navigation, screenName, currentRoute, { screen: tabName });
      } else {
        navigateToFrom(navigation, screenName, currentRoute);
      }
      
      if (is_DEBUG) {
        console.log('MBA98386196v Current route after:', screenName);
      }
    } catch (error) {
      console.error('Error handling navigation:', error);
      navigateToFrom(navigation, screenName, currentRoute);
    }
  };

  // Initialize route tracking on component mount
  useEffect(() => {
    const initializeRouteTracking = async () => {
      try {
        const currentRoute = await getStorage('currentRoute');
        if (!currentRoute) {
          const initialRoute = isSignedIn 
            ? 'Dashboard'
            : 'Home';
          await setStorage('currentRoute', initialRoute);
        }
      } catch (error) {
        console.error('Error initializing route tracking:', error);
      }
    };

    initializeRouteTracking();
  }, [isSignedIn, userRole]);

  const handleRoleSwitch = async (newRole) => {
    try {
      // Get current screen before switching
      const currentScreen = currentRoute;
      
      if (is_DEBUG) {
        console.log('MBA98386196v Role switch initiated:', {
          from: userRole,
          to: newRole,
          currentScreen
        });
      }
      
      await switchRole(newRole);
      await setStorage('userRole', newRole);
      
      // Handle different screens according to requirements
      switch (currentScreen) {
        case 'MyProfile':
          // For MyProfile, preserve the tab if it's common between roles
          const params = navigation.getState().routes.find(route => route.name === 'MyProfile')?.params;
          const currentTab = params?.screen || params?.initialTab || 'profile_info';
          
          if (is_DEBUG) {
            console.log('MBA98386196v MyProfile tab preservation:', {
              currentTab,
              newRole
            });
          }
          
          // Check if we need to change the tab
          let newTab = currentTab;
          
          // If switching to owner and current tab is professional-only, switch to profile_info
          if (newRole === 'petOwner' && currentTab === 'services_availability') {
            newTab = 'profile_info';
          }
          
          // Navigate back to MyProfile with the appropriate tab
          navigateToFrom(navigation, 'MyProfile', currentScreen, { screen: newTab });
          break;
          
        case 'MessageHistory':
          // For MessageHistory, just stay on the same screen without reload
          navigateToFrom(navigation, 'MessageHistory', currentScreen);
          break;
          
        case 'MyBookings':
          // For MyBookings, stay on the same screen but switch tabs based on the new role
          const activeTab = newRole === 'professional' ? 'professional' : 'owner';
          if (is_DEBUG) {
            console.log('MBA98386196v MyBookings tab switch:', {
              newRole,
              activeTab
            });
          }
          // Pass the appropriate tab parameter
          navigateToFrom(navigation, 'MyBookings', currentScreen, { screen: activeTab });
          break;
          
        case 'Connections':
          // For Connections, stay on the same screen but switch tabs based on the new role
          const connectionsTab = newRole === 'professional' ? 'clients' : 'professionals';
          if (is_DEBUG) {
            console.log('MBA98386196v Connections tab switch:', {
              newRole,
              connectionsTab
            });
          }
          // Pass the appropriate tab parameter
          navigateToFrom(navigation, 'Connections', currentScreen, { screen: connectionsTab });
          break;
          
        case 'Dashboard':
          // For Dashboard, stay on the same screen
          navigateToFrom(navigation, 'Dashboard', currentScreen);
          break;
          
        case 'SearchProfessionalsListing':
          // When client is on search pros and switches to pro, go to pro dashboard
          if (newRole === 'professional') {
            navigateToFrom(navigation, 'Dashboard', currentScreen);
          } else {
            // If somehow a pro is on this screen and switches to client, stay here
            navigateToFrom(navigation, currentScreen, currentScreen);
          }
          break;
          
        case 'ServiceManager':
          // When professional is on services and switches to client, go to client dashboard
          if (newRole === 'petOwner') {
            navigateToFrom(navigation, 'Dashboard', currentScreen);
          } else {
            // Should never happen, but if somehow client is on this screen and switches to pro, stay here
            navigateToFrom(navigation, currentScreen, currentScreen);
          }
          break;
          
        default:
          // For any other screen, navigate to the same screen
          // This maintains the current behavior for unspecified screens
          navigateToFrom(navigation, currentScreen, currentScreen);
      }
    } catch (error) {
      console.error('Error switching role:', error);
    }
  };

  const handleLogout = async () => {
    try {
      if (is_DEBUG) {
        console.log('MBA98386196v Logging out user');
      }
      await signOut();
      if (Platform.OS === 'web') {
        sessionStorage.removeItem('currentRoute');
        sessionStorage.removeItem('previousRoute');
        sessionStorage.removeItem('userRole');
      } else {
        await AsyncStorage.removeItem('currentRoute');
        await AsyncStorage.removeItem('previousRoute');
        await AsyncStorage.removeItem('userRole');
      }
      setCurrentRoute('');
      navigation.navigate('SignIn');
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

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
        { title: 'Dashboard', icon: 'view-dashboard', route: 'Dashboard' },
        { title: 'Messages', icon: 'message-text', route: 'MessageHistory' },
        { title: 'Services', icon: 'briefcase', route: 'ServiceManager' },
        { title: 'Connections', icon: 'account-group', route: 'Connections' },
        // { title: 'Bookings', icon: 'calendar', route: 'MyBookings' },
        { title: 'Profile', icon: 'account', route: 'MyProfile', tab: 'profile_info' },
      ];
    } else {
      return [
        { title: 'Dashboard', icon: 'view-dashboard', route: 'Dashboard' },
        { title: 'Messages', icon: 'message-text', route: 'MessageHistory' },
        { title: 'Search Pros', icon: 'magnify', route: 'SearchProfessionalsListing' },
        // { title: 'Bookings', icon: 'calendar', route: 'MyBookings' },
        { title: 'Profile', icon: 'account', route: 'MyProfile', tab: 'profile_info' },
        // ...(!isApprovedProfessional ? [{ title: 'Become a Pro', icon: 'account-heart', route: 'BecomeProfessional' }] : []),
      ];
    }
  };

  const renderMobileNavBar = () => {
    const menuItems = renderMenuItems();
    const itemWidth = Dimensions.get('window').width / menuItems.length;
    return (
      <View style={[styles.customNavBar, { backgroundColor: theme.colors.surfaceContrast }]}>
        {menuItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={[styles.navButton, { width: itemWidth }]}
            onPress={() => handleNavigation(item.route, item.tab)}
          >
            <MaterialCommunityIcons 
              name={item.icon} 
              size={24} 
              color={theme.colors.text} 
            />
            <Text style={[styles.navText, { color: theme.colors.text }]} numberOfLines={2} ellipsizeMode="tail">
              {item.title}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderDesktopSidebar = () => {
    const menuItems = renderMenuItems();
    const sidebarWidth = isCollapsed ? 70 : 250;
    const isProfessionalRole = userRole === 'professional';
    const isOwnerRole = userRole === 'petOwner';

    if (is_DEBUG) {
      console.log('MBA98386196v Rendering Sidebar:', {
        userRole,
        isApprovedProfessional,
        currentRoute,
        isProfessionalRole,
        isOwnerRole
      });
    }

    return (
      <View style={[styles.sidebarContainer, { width: sidebarWidth }]}>
        <View style={styles.sidebarLogoContainer}>
          <TouchableOpacity onPress={() => handleNavigation('Home', 'Overview')} style={styles.logoButton}>
            <Image 
              source={require('../../assets/crittrcove-high-resolution-logo-transparent.png')}
              style={[styles.sidebarLogo, { width: isCollapsed ? 40 : 150, tintColor: theme.colors.primary }]}
              resizeMode="contain"
            />
          </TouchableOpacity>
        </View>
        <TouchableOpacity 
          style={styles.collapseButton}
          onPress={() => setIsCollapsed(!isCollapsed)}
        >
          <MaterialCommunityIcons 
            name={isCollapsed ? 'chevron-right' : 'chevron-left'} 
            size={24} 
            color={theme.colors.primary}
          />
        </TouchableOpacity>
        <View style={styles.menuItems}>
          {!isCollapsed && (
            <View style={styles.roleToggleContainer}>
              <Text style={styles.roleToggleTitle}>Switch Role:</Text>
              <View style={styles.roleButtonsContainer}>
                <TouchableOpacity
                  style={[
                    styles.roleButton,
                    isOwnerRole && styles.roleButtonActive
                  ]}
                  onPress={() => {
                    if (is_DEBUG) {
                      console.log('MBA98386196v Owner Role Button Press:', {
                        currentRole: userRole,
                        isApprovedProfessional
                      });
                    }
                    if (isProfessionalRole) {
                      handleRoleSwitch('petOwner');
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.roleButtonText,
                    isOwnerRole && styles.roleButtonTextActive
                  ]}>Owner</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.roleButton,
                    isProfessionalRole && styles.roleButtonActive,
                    !isApprovedProfessional && styles.roleButtonDisabled
                  ]}
                  onPress={() => {
                    if (is_DEBUG) {
                      console.log('MBA98386196v Professional Role Button Press:', {
                        currentRole: userRole,
                        isApprovedProfessional
                      });
                    }
                    if (isOwnerRole && isApprovedProfessional) {
                      handleRoleSwitch('professional');
                    }
                  }}
                  disabled={!isApprovedProfessional}
                  activeOpacity={isApprovedProfessional ? 0.7 : 1}
                >
                  <Text style={[
                    styles.roleButtonText,
                    isProfessionalRole && styles.roleButtonTextActive,
                    !isApprovedProfessional && styles.roleButtonTextDisabled
                  ]}>Professional</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          {menuItems.map((item, index) => {
            const isActive = currentRoute === item.route || 
                           (item.route === 'More' && item.title === 'Settings' && currentRoute === 'More');
            
            // Check if this is the Messages tab and we have unread messages
            const showNotification = item.title === 'Messages' && hasUnreadMessages;

            return (
              <TouchableOpacity
                key={index}
                style={[
                  styles.sidebarItem,
                  isActive && styles.activeItem
                ]}
                onPress={() => handleNavigation(item.route, item.tab || 'Overview')}
              >
                <View style={{ position: 'relative' }}>
                  <MaterialCommunityIcons 
                    name={item.icon} 
                    size={24} 
                    color={isActive ? theme.colors.primary : "#4B5563"}
                  />
                  {showNotification && (
                    <View style={styles.messageNotificationBadge}>
                      {unreadCount > 0 && (
                        <Text style={styles.messageNotificationText}>{unreadCount}</Text>
                      )}
                    </View>
                  )}
                </View>
                {!isCollapsed && (
                  <Text style={[
                    styles.sidebarItemText, 
                    { color: isActive ? theme.colors.primary : "#4B5563" }
                  ]}>
                    {item.title}
                    {item.title === 'Messages' && hasUnreadMessages && unreadCount > 0 && (
                      <Text style={{ color: theme.colors.error }}>{` (${unreadCount})`}</Text>
                    )}
                  </Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
        <TouchableOpacity
          style={[styles.logoutButton, { width: sidebarWidth }]}
          onPress={handleLogout}
        >
          <MaterialCommunityIcons 
            name="logout" 
            size={24} 
            color="#F26969"
          />
          {!isCollapsed && (
            <Text style={styles.logoutText}>Logout</Text>
          )}
        </TouchableOpacity>
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

  const renderMobileHeader = () => {
    const logoSize = screenWidth <= 470 ? { width: 100, height: 30 } : { width: 150, height: 40 };
    const isProfessionalRole = userRole === 'professional';
    const isOwnerRole = userRole === 'petOwner';
    
    // Update notification count to include message notifications
    const totalNotifications = hasUnreadMessages ? (notificationCount + unreadCount) : notificationCount;
    
    return (
      <View style={[styles.mobileHeader, { backgroundColor: theme.colors.surfaceContrast }]}>
        <View style={styles.mobileHeaderContent}>
          <TouchableOpacity onPress={() => handleNavigation('Home', 'Overview')} style={styles.logoButton}>
            <Image 
              source={require('../../assets/crittrcove-high-resolution-logo-transparent.png')} 
              style={[
                styles.mobileLogo,
                { tintColor: theme.colors.primary },
                logoSize
              ]} 
            />
          </TouchableOpacity>
          <View style={styles.mobileRightContent}>
            {/* <TouchableOpacity onPress={() => handleNavigation('Notifications', 'Overview')} style={styles.iconButton}>
              <MaterialCommunityIcons name="bell-outline" size={24} color={theme.colors.text} />
              {totalNotifications > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationText}>{totalNotifications}</Text>
                </View>
              )}
            </TouchableOpacity> */}
            <TouchableOpacity onPress={toggleMenu} style={styles.profileContainer}>
              {isSignedIn ? (
                <Avatar.Image 
                  size={40} 
                  source={require('../../assets/default-profile.png')} 
                />
              ) : (
                <MaterialCommunityIcons name="menu" size={28} color={theme.colors.text} />
              )}
            </TouchableOpacity>
          </View>
        </View>
        {isMenuOpen && (
          <View style={[styles.mobileMenu, { backgroundColor: theme.colors.surfaceContrast }]}>
            {isSignedIn && (
              <View style={styles.mobileRoleToggleContainer}>
                <Text style={styles.mobileRoleToggleTitle}>Switch Role:</Text>
                <View style={styles.mobileRoleButtonsContainer}>
                  <TouchableOpacity
                    style={[
                      styles.mobileRoleButton,
                      isOwnerRole && styles.mobileRoleButtonActive
                    ]}
                    onPress={() => {
                      if (is_DEBUG) {
                        console.log('MBA98386196v Mobile Owner Role Button Press:', {
                          currentRole: userRole,
                          isApprovedProfessional
                        });
                      }
                      if (isProfessionalRole) {
                        handleRoleSwitch('petOwner');
                        setIsMenuOpen(false);
                      }
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      styles.mobileRoleButtonText,
                      isOwnerRole && styles.mobileRoleButtonTextActive
                    ]}>Owner</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.mobileRoleButton,
                      isProfessionalRole && styles.mobileRoleButtonActive,
                      !isApprovedProfessional && styles.mobileRoleButtonDisabled
                    ]}
                    onPress={() => {
                      if (is_DEBUG) {
                        console.log('MBA98386196v Mobile Professional Role Button Press:', {
                          currentRole: userRole,
                          isApprovedProfessional
                        });
                      }
                      if (isOwnerRole && isApprovedProfessional) {
                        handleRoleSwitch('professional');
                        setIsMenuOpen(false);
                      }
                    }}
                    disabled={!isApprovedProfessional}
                    activeOpacity={isApprovedProfessional ? 0.7 : 1}
                  >
                    <Text style={[
                      styles.mobileRoleButtonText,
                      isProfessionalRole && styles.mobileRoleButtonTextActive,
                      !isApprovedProfessional && styles.mobileRoleButtonTextDisabled
                    ]}>Professional</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
            {renderMenuItems().map((item, index) => {
              const showNotification = item.title === 'Messages' && hasUnreadMessages;
              
              return (
                <TouchableOpacity
                  key={index}
                  style={styles.mobileMenuItem}
                  onPress={() => {
                    handleNavigation(item.route, item.tab || 'Overview');
                    setIsMenuOpen(false);
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', position: 'relative' }}>
                    <MaterialCommunityIcons name={item.icon} size={24} color={theme.colors.text} />
                    {showNotification && (
                      <View style={styles.mobileMessageNotificationBadge}>
                        {unreadCount > 0 && (
                          <Text style={styles.mobileMessageNotificationText}>{unreadCount}</Text>
                        )}
                      </View>
                    )}
                  </View>
                  <Text style={styles.mobileMenuItemText}>
                    {item.title}
                    {item.title === 'Messages' && hasUnreadMessages && unreadCount > 0 && (
                      <Text style={{ color: theme.colors.error }}>{` (${unreadCount})`}</Text>
                    )}
                  </Text>
                </TouchableOpacity>
              );
            })}
            {isSignedIn && (
              <TouchableOpacity
                style={[styles.mobileMenuItem, styles.mobileLogoutItem]}
                onPress={() => {
                  handleLogout();
                  setIsMenuOpen(false);
                }}
              >
                <MaterialCommunityIcons name="logout" size={24} color="#F26969" />
                <Text style={[styles.mobileMenuItemText, styles.mobileLogoutText]}>Logout</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <>
      {Platform.OS === 'web' ? (
        <>
          {!isMobile && isSignedIn && (
            <View style={styles.navContainer}>
              {renderDesktopSidebar()}
            </View>
          )}
          {(isMobile || !isSignedIn) && renderMobileHeader()}
        </>
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
  sidebarContainer: {
    height: '100%',
    minHeight: '100vh',
    backgroundColor: theme.colors.surfaceContrast,
    borderRightWidth: 0,
    position: 'fixed',
    left: 0,
    top: 0,
    bottom: 0,
    zIndex: 1000,
    display: 'flex',
    flexDirection: 'column',
    transition: 'width 0.3s ease',
    borderTopRightRadius: 24,
    borderBottomRightRadius: 24,
  },
  sidebarLogoContainer: {
    padding: 16,
    borderBottomWidth: 3,
    borderBottomColor: theme.colors.surface,
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceContrast,
  },
  logoButton: {
    alignItems: 'center',
  },
  sidebarLogo: {
    height: 50,
    resizeMode: 'contain',
  },
  collapseButton: {
    position: 'absolute',
    right: -16,
    top: '50%',
    transform: [{ translateY: -20 }],
    width: 32,
    height: 40,
    backgroundColor: theme.colors.surfaceContrast,
    borderWidth: 0,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1001,
  },
  menuItems: {
    flex: 1,
    padding: 16,
    backgroundColor: theme.colors.surfaceContrast,
  },
  sidebarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginBottom: 8,
    borderRadius: 8,
    backgroundColor: 'transparent',
    cursor: 'pointer',
  },
  sidebarItemText: {
    marginLeft: 12,
    fontSize: theme.fontSizes.medium,
    fontFamily: theme.fonts.regular.fontFamily,
    fontWeight: '500',
  },
  logoutButton: {
    width: '100%',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 0,
    backgroundColor: theme.colors.surfaceContrast,
    borderBottomRightRadius: 24,
  },
  logoutText: {
    marginLeft: 12,
    fontSize: theme.fontSizes.medium,
    color: '#F26969',
    fontFamily: theme.fonts.regular.fontFamily,
    fontWeight: '500',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginRight: 16,
  },
  notificationButton: {
    position: 'relative',
    padding: 8,
  },
  notificationBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: theme.colors.error,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationCount: {
    color: theme.colors.whiteText,
    fontSize: 12,
    fontWeight: 'bold',
  },
  profileButton: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  menuContent: {
    marginTop: 45,
  },
  mobileHeader: {
    width: '100%',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
    position: 'relative',
  },
  mobileHeaderContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  mobileLogo: {
    resizeMode: 'contain',
  },
  mobileRightContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  mobileMenu: {
    position: 'absolute',
    top: '100%',
    right: 20,
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 1000,
    minWidth: 200,
  },
  mobileMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
  },
  mobileMenuItemText: {
    marginLeft: 12,
    fontSize: 16,
    color: theme.colors.text,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  profileContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
  },
  iconButton: {
    padding: 8,
    position: 'relative',
  },
  notificationText: {
    color: theme.colors.whiteText,
    fontSize: 12,
    fontWeight: 'bold',
  },
  navContainer: {
    position: 'fixed',
    top: 0,
    left: 0,
    bottom: 0,
    zIndex: 1000,
    backgroundColor: theme.colors.surface,
    borderRightWidth: 1,
    borderRightColor: theme.colors.border,
  },
  activeItem: {
    backgroundColor: '#F0F9E5',
  },
  roleToggleContainer: {
    padding: 12,
    marginBottom: 16,
    borderRadius: 8,
    backgroundColor: '#F0F9E5',
  },
  roleToggleTitle: {
    fontSize: theme.fontSizes.medium,
    color: theme.colors.text,
    fontFamily: theme.fonts.regular.fontFamily,
    fontWeight: '600',
    marginBottom: 8,
  },
  roleButtonsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  roleButton: {
    flex: 1,
    padding: 8,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.primary,
    cursor: 'pointer',
  },
  roleButtonDisabled: {
    opacity: 0.5,
    borderColor: theme.colors.border,
    cursor: 'not-allowed',
  },
  roleButtonText: {
    fontSize: theme.fontSizes.small,
    fontFamily: theme.fonts.regular.fontFamily,
    color: theme.colors.primary,
  },
  roleButtonTextDisabled: {
    color: theme.colors.border,
  },
  roleButtonActive: {
    backgroundColor: theme.colors.primary,
  },
  roleButtonTextActive: {
    color: theme.colors.surface,
  },
  mobileRoleToggleContainer: {
    padding: 16,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  mobileRoleToggleTitle: {
    fontSize: theme.fontSizes.medium,
    color: theme.colors.text,
    fontFamily: theme.fonts.regular.fontFamily,
    fontWeight: '600',
    marginBottom: 8,
  },
  mobileRoleButtonsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  mobileRoleButton: {
    flex: 1,
    padding: 8,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  mobileRoleButtonDisabled: {
    opacity: 0.5,
    borderColor: theme.colors.border,
  },
  mobileRoleButtonText: {
    fontSize: theme.fontSizes.small,
    fontFamily: theme.fonts.regular.fontFamily,
    color: theme.colors.primary,
  },
  mobileRoleButtonTextDisabled: {
    color: theme.colors.border,
  },
  mobileRoleButtonActive: {
    backgroundColor: theme.colors.primary,
  },
  mobileRoleButtonTextActive: {
    color: theme.colors.surface,
  },
  mobileLogoutItem: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    marginTop: 8,
  },
  mobileLogoutText: {
    color: '#F26969',
  },
  messageNotificationDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.colors.error,
    borderWidth: 1,
    borderColor: theme.colors.surface,
  },
  
  mobileMessageNotificationDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.error,
    borderWidth: 1,
    borderColor: theme.colors.surfaceContrast,
  },
  messageNotificationBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: theme.colors.error,
    borderWidth: 1,
    borderColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  messageNotificationText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  mobileMessageNotificationBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: theme.colors.error,
    borderWidth: 1,
    borderColor: theme.colors.surfaceContrast,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  mobileMessageNotificationText: {
    color: 'white',
    fontSize: 9,
    fontWeight: 'bold',
  },
});
