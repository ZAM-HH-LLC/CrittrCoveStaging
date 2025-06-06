import React, { useState, useContext, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Platform, SafeAreaView, Image } from 'react-native';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { theme } from '../styles/theme';
import { AuthContext, debugLog, getStorage, setStorage } from '../context/AuthContext';
import MessageNotificationContext from '../context/MessageNotificationContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appbar, Menu, useTheme, Avatar } from 'react-native-paper';
import { useNavigation as useReactNavigation, useRoute } from '@react-navigation/native';
import { BackHandler } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, interpolate } from 'react-native-reanimated';

/*
 * IMPORTANT ARCHITECTURE NOTE:
 * 
 * This Navigation component uses a specific architecture to prevent React hooks errors:
 * 
 * 1. The main Navigation component is a thin wrapper that:
 *    - Handles the conditional visibility logic (shouldHideNavigation)
 *    - Renders the NavigationContent with a shouldRender prop
 * 
 * 2. The NavigationContent component contains all the hooks and UI rendering:
 *    - ALL hooks are called unconditionally at the top of the component
 *    - We check shouldRender AFTER all hooks have been called
 *    - This ensures React's rules of hooks are followed (same hooks in same order every render)
 * 
 * If you modify this file, ensure that:
 * - You don't add any conditional hooks (hooks inside if statements or early returns)
 * - All hooks are called at the top of the component, before any conditional returns
 * - You maintain the parent/child structure to prevent hooks errors
 */

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

const useReactRoute = () => {
  try {
    // Try to get the current route, but return a safe fallback if it fails
    const route = useRoute();
    return route || { name: '', params: {}, key: '' };
  } catch (e) {
    // If we're in a context where useRoute doesn't work, return a safe object
    return { name: '', params: {}, key: '' };
  }
};

// Create a separate component for NavigationContent to prevent conditional hooks
const NavigationContent = ({ 
  propState, 
  descriptors, 
  propNavigation, 
  shouldRender = true
}) => {
  // All hooks are used here unconditionally
  const reactNavigation = useReactNavigation();
  const reactRoute = useReactRoute();
  const navigation = propNavigation || reactNavigation;
  const [visible, setVisible] = useState(false);
  const [isMobile, setIsMobile] = useState(Dimensions.get('window').width < 900);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [currentRoute, setCurrentRoute] = useState('');
  const [notificationCount, setNotificationCount] = useState(3);
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
  
  // Animation values for hamburger menu
  const line1Rotation = useSharedValue(0);
  const line2Opacity = useSharedValue(1);
  const line3Rotation = useSharedValue(0);
  const line1TranslateY = useSharedValue(0);
  const line3TranslateY = useSharedValue(0);
  
  // Create a synthetic state object
  const routeFromProps = propState?.routes?.[propState?.index];
  const routeFromHook = reactRoute;
  
  const routeName = routeFromProps?.name || routeFromHook?.name || '';
  const selectedConversation = 
    routeFromProps?.params?.selectedConversation || 
    routeFromHook?.params?.selectedConversation;
    
  const effectiveState = propState || {
    routes: routeFromHook ? [routeFromHook] : [],
    index: routeFromHook ? 0 : -1
  };
  
  const isInMessageHistory = routeName === 'MessageHistory';
  
  // Update animation when menu state changes
  useEffect(() => {
    animateHamburgerMenu(isMenuOpen);
  }, [isMenuOpen]);
  
  // Only log on the first render or when these values change to reduce console spam
  const renderLogRef = useRef({ routeName, isInMessageHistory, selectedConversation, screenWidth });
  const shouldLog = 
    renderLogRef.current.routeName !== routeName || 
    renderLogRef.current.isInMessageHistory !== isInMessageHistory ||
    renderLogRef.current.selectedConversation !== selectedConversation ||
    renderLogRef.current.screenWidth !== screenWidth;
    
  if (shouldLog) {
    renderLogRef.current = { routeName, isInMessageHistory, selectedConversation, screenWidth };
    // Debug log all relevant conditions for visibility
    debugLog('MBAo3hi4g4v: Navigation render conditions', { 
      routeName,
      isInMessageHistory,
      selectedConversation,
      screenWidth,
      platform: Platform.OS,
      route: JSON.stringify(reactRoute?.params || propState?.routes?.[propState?.index]?.params),
      stateSource: propState ? 'props' : 'hook',
      navSource: propNavigation ? 'props' : 'hook'
    });
  }
  
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
  }, [isSignedIn, userRole, isApprovedProfessional, currentRoute, is_DEBUG]);
  
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
  }, [navigation, resetNotifications, updateRoute, hasUnreadMessages, is_DEBUG, currentRoute]);

  // Animated hamburger menu component
  const AnimatedHamburgerMenu = ({ size = 28, color = theme.colors.text }) => {
    const line1Style = useAnimatedStyle(() => ({
      width: size,
      height: 3,
      backgroundColor: color,
      marginVertical: 2,
      borderRadius: 1.5,
      transform: [
        { translateY: line1TranslateY.value },
        { rotate: `${line1Rotation.value}deg` }
      ],
    }));

    const line2Style = useAnimatedStyle(() => ({
      width: size,
      height: 3,
      backgroundColor: color,
      marginVertical: 2,
      borderRadius: 1.5,
      opacity: line2Opacity.value,
    }));

    const line3Style = useAnimatedStyle(() => ({
      width: size,
      height: 3,
      backgroundColor: color,
      marginVertical: 2,
      borderRadius: 1.5,
      transform: [
        { translateY: line3TranslateY.value },
        { rotate: `${line3Rotation.value}deg` }
      ],
    }));

    return (
      <View style={{ alignItems: 'center', justifyContent: 'center' }}>
        <Animated.View style={line1Style} />
        <Animated.View style={line2Style} />
        <Animated.View style={line3Style} />
      </View>
    );
  };
  
  // Include all the other helper functions from the original component
  const animateHamburgerMenu = (toX) => {
    const duration = 300;
    
    debugLog('MBA4477: Animating hamburger menu', { toX, isMenuOpen });
    
    if (toX) {
      // Transform to X
      line1Rotation.value = withTiming(45, { duration });
      line2Opacity.value = withTiming(0, { duration });
      line3Rotation.value = withTiming(-45, { duration });
      line1TranslateY.value = withTiming(7, { duration });
      line3TranslateY.value = withTiming(-7, { duration });
    } else {
      // Transform back to hamburger
      line1Rotation.value = withTiming(0, { duration });
      line2Opacity.value = withTiming(1, { duration });
      line3Rotation.value = withTiming(0, { duration });
      line1TranslateY.value = withTiming(0, { duration });
      line3TranslateY.value = withTiming(0, { duration });
    }
  };

  const openMenu = () => setVisible(true);
  const closeMenu = () => setVisible(false);
  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  const handleNavigation = (route) => {
    debugLog('MBA4477: Navigation handling', { route, currentRoute });
    if (route === currentRoute) {
      return;
    }
    
    // Close the menu when navigating
    setIsMenuOpen(false);
    closeMenu();
    
    // Use the navigation helpers
    navigateToFrom(navigation, route, currentRoute);
  };
  
  const handleRoleSwitch = async (role) => {
    if (role !== userRole) {
      await switchRole(role);
    }
  };
  
  const handleLogout = async () => {
    setIsMenuOpen(false);
    closeMenu();
    await signOut();
  };
  
  const renderMenuItems = () => {
    let items = [];
    
    if (userRole === 'professional') {
      // Professional menu items in the specified order
      items = [
        { icon: 'view-dashboard-outline', label: 'Dashboard', route: 'Dashboard' },
        { icon: 'message-text-outline', label: 'Messages', route: 'MessageHistory', notification: hasUnreadMessages, count: unreadCount },
        { icon: 'briefcase-outline', label: 'Services', route: 'ServiceManager' },
        { icon: 'account-group-outline', label: 'Connections', route: 'Connections' },
        { icon: 'account-outline', label: 'Profile', route: 'MyProfile' },
        { icon: 'email-outline', label: 'Contact Us', route: 'ContactUs' }
      ];
    } else {
      // Pet Owner menu items in the specified order
      items = [
        { icon: 'view-dashboard-outline', label: 'Dashboard', route: 'Dashboard' },
        { icon: 'message-text-outline', label: 'Messages', route: 'MessageHistory', notification: hasUnreadMessages, count: unreadCount },
        { icon: 'magnify', label: 'Search Pros', route: 'SearchProfessionalsListing' },
        { icon: 'account-outline', label: 'Profile', route: 'MyProfile' },
        { icon: 'email-outline', label: 'Contact Us', route: 'ContactUs' }
      ];
    }
    
    return items.map((item, index) => (
      <TouchableOpacity
        key={index}
        style={[
          styles.sidebarItem,
          currentRoute === item.route && styles.activeItem
        ]}
        onPress={() => handleNavigation(item.route)}
      >
        <MaterialCommunityIcons
          name={item.icon}
          size={24}
          color={currentRoute === item.route ? theme.colors.primary : theme.colors.text}
        />
        <Text
          style={[
            styles.sidebarItemText,
            {
              color: currentRoute === item.route ? theme.colors.primary : theme.colors.text,
              marginLeft: isCollapsed ? 0 : 12,
              display: isCollapsed ? 'none' : 'flex',
            }
          ]}
        >
          {item.label}
        </Text>
        {item.notification && (
          <View style={styles.messageNotificationDot} />
        )}
        {item.count > 0 && (
          <View style={styles.messageNotificationBadge}>
            <Text style={styles.messageNotificationText}>{item.count}</Text>
          </View>
        )}
      </TouchableOpacity>
    ));
  };
  
  const renderMobileMenuItems = () => {
    let items = [];
    
    if (userRole === 'professional') {
      // Professional menu items in the specified order
      items = [
        { icon: 'view-dashboard-outline', label: 'Dashboard', route: 'Dashboard' },
        { icon: 'message-text-outline', label: 'Messages', route: 'MessageHistory', notification: hasUnreadMessages, count: unreadCount },
        { icon: 'briefcase-outline', label: 'Services', route: 'ServiceManager' },
        { icon: 'account-group-outline', label: 'Connections', route: 'Connections' },
        { icon: 'account-outline', label: 'Profile', route: 'MyProfile' },
        { icon: 'email-outline', label: 'Contact Us', route: 'ContactUs' }
      ];
    } else {
      // Pet Owner menu items in the specified order
      items = [
        { icon: 'view-dashboard-outline', label: 'Dashboard', route: 'Dashboard' },
        { icon: 'message-text-outline', label: 'Messages', route: 'MessageHistory', notification: hasUnreadMessages, count: unreadCount },
        { icon: 'magnify', label: 'Search Pros', route: 'SearchProfessionalsListing' },
        { icon: 'account-outline', label: 'Profile', route: 'MyProfile' },
        { icon: 'email-outline', label: 'Contact Us', route: 'ContactUs' }
      ];
    }
    
    return (
      <>
        {/* Role Toggle for Mobile */}
        {isApprovedProfessional && (
          <View style={styles.mobileRoleToggleContainer}>
            <Text style={styles.mobileRoleToggleTitle}>Your Role</Text>
            <View style={styles.mobileRoleButtonsContainer}>
              <TouchableOpacity
                style={[
                  styles.mobileRoleButton,
                  userRole === 'petOwner' && styles.mobileRoleButtonActive
                ]}
                onPress={() => userRole !== 'owner' && handleRoleSwitch('owner')}
              >
                <Text
                  style={[
                    styles.mobileRoleButtonText,
                    userRole === 'petOwner' && styles.mobileRoleButtonTextActive
                  ]}
                >
                  Owner
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.mobileRoleButton,
                  userRole === 'professional' && styles.mobileRoleButtonActive
                ]}
                onPress={() => userRole !== 'professional' && handleRoleSwitch('professional')}
              >
                <Text
                  style={[
                    styles.mobileRoleButtonText,
                    userRole === 'professional' && styles.mobileRoleButtonTextActive
                  ]}
                >
                  Professional
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        
        {/* Menu Items */}
        {items.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={styles.mobileMenuItem}
            onPress={() => {
              setIsMenuOpen(false);
              handleNavigation(item.route);
            }}
          >
            <MaterialCommunityIcons
              name={item.icon}
              size={24}
              color={theme.colors.text}
            />
            <Text style={styles.mobileMenuItemText}>{item.label}</Text>
            {item.notification && (
              <View style={styles.mobileMessageNotificationDot} />
            )}
            {item.count > 0 && (
              <View style={styles.mobileMessageNotificationBadge}>
                <Text style={styles.mobileMessageNotificationText}>{item.count}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
        
        {/* Logout Button */}
        <TouchableOpacity
          style={[styles.mobileMenuItem, styles.mobileLogoutItem]}
          onPress={handleLogout}
        >
          <MaterialCommunityIcons
            name="logout"
            size={24}
            color="#F26969"
          />
          <Text style={[styles.mobileMenuItemText, styles.mobileLogoutText]}>
            Logout
          </Text>
        </TouchableOpacity>
      </>
    );
  };
  
  const renderDesktopSidebar = () => {
    const sidebarWidth = isCollapsed ? 72 : 250;
    
    return (
      <View style={[styles.sidebarContainer, { width: sidebarWidth }]}>
        <View style={styles.sidebarLogoContainer}>
          <TouchableOpacity
            style={styles.logoButton}
            onPress={() => handleNavigation('Dashboard')}
          >
            <Image
              source={require('../../assets/logo.png')}
              style={[
                styles.sidebarLogo,
                { width: isCollapsed ? 40 : 120, tintColor: theme.colors.primary }
              ]}
            />
          </TouchableOpacity>
        </View>
        
        <TouchableOpacity
          style={styles.collapseButton}
          onPress={() => setIsCollapsed(!isCollapsed)}
        >
          <MaterialIcons
            name={isCollapsed ? 'chevron-right' : 'chevron-left'}
            size={24}
            color={theme.colors.text}
          />
        </TouchableOpacity>
        
        <View style={styles.menuItems}>
          {isApprovedProfessional && !isCollapsed && (
            <View style={styles.roleToggleContainer}>
              <Text style={styles.roleToggleTitle}>Your Role</Text>
              <View style={styles.roleButtonsContainer}>
                <TouchableOpacity
                  style={[
                    styles.roleButton,
                    userRole === 'owner' && styles.roleButtonActive
                  ]}
                  onPress={() => userRole !== 'owner' && handleRoleSwitch('owner')}
                >
                  <Text
                    style={[
                      styles.roleButtonText,
                      userRole === 'owner' && styles.roleButtonTextActive
                    ]}
                  >
                    Pet Owner
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.roleButton,
                    userRole === 'professional' && styles.roleButtonActive
                  ]}
                  onPress={() => userRole !== 'professional' && handleRoleSwitch('professional')}
                >
                  <Text
                    style={[
                      styles.roleButtonText,
                      userRole === 'professional' && styles.roleButtonTextActive
                    ]}
                  >
                    Professional
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          
          {renderMenuItems()}
        </View>
        
        <TouchableOpacity
          style={styles.logoutButton}
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
  
  const renderMobileHeader = () => {
    return (
      <View style={[styles.mobileHeader, { backgroundColor: theme.colors.surfaceContrast }]}>
        <View style={styles.mobileHeaderContent}>
          <TouchableOpacity onPress={() => handleNavigation('Dashboard')}>
            <Image
              source={require('../../assets/logo.png')}
              style={[styles.mobileLogo, { width: 120, height: 40, tintColor: theme.colors.primary }]}
            />
          </TouchableOpacity>
          
          <View style={styles.mobileRightContent}>
            <TouchableOpacity
              style={styles.hamburgerMenuContainer}
              onPress={toggleMenu}
            >
              <AnimatedHamburgerMenu size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </View>
        </View>
        
        {isMenuOpen && (
          <View style={styles.mobileMenu}>
            {renderMobileMenuItems()}
          </View>
        )}
      </View>
    );
  };
  
  const renderMobileNavBar = () => {
    return (
      <SafeAreaView style={styles.customNavBar}>
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => handleNavigation('Dashboard')}
        >
          <MaterialCommunityIcons
            name="view-dashboard-outline"
            size={24}
            color={currentRoute === 'Dashboard' ? theme.colors.secondary : theme.colors.whiteText}
          />
          <Text style={[
            styles.navText,
            { color: currentRoute === 'Dashboard' ? theme.colors.secondary : theme.colors.whiteText }
          ]}>
            Home
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => handleNavigation('SearchProfessionalsListing')}
        >
          <MaterialCommunityIcons
            name="magnify"
            size={24}
            color={currentRoute === 'SearchProfessionalsListing' ? theme.colors.secondary : theme.colors.whiteText}
          />
          <Text style={[
            styles.navText,
            { color: currentRoute === 'SearchProfessionalsListing' ? theme.colors.secondary : theme.colors.whiteText }
          ]}>
            Search
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => handleNavigation(userRole === 'professional' ? 'ServiceManager' : 'PetManager')}
        >
          <MaterialCommunityIcons
            name="paw"
            size={24}
            color={
              currentRoute === (userRole === 'professional' ? 'ServiceManager' : 'PetManager')
                ? theme.colors.secondary
                : theme.colors.whiteText
            }
          />
          <Text style={[
            styles.navText,
            {
              color: currentRoute === (userRole === 'professional' ? 'ServiceManager' : 'PetManager')
                ? theme.colors.secondary
                : theme.colors.whiteText
            }
          ]}>
            {userRole === 'professional' ? 'Services' : 'Pets'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => handleNavigation('MessageHistory')}
        >
          <View style={{ position: 'relative' }}>
            <MaterialCommunityIcons
              name="message-text-outline"
              size={24}
              color={currentRoute === 'MessageHistory' ? theme.colors.secondary : theme.colors.whiteText}
            />
            {hasUnreadMessages && (
              <View style={styles.mobileMessageNotificationDot} />
            )}
            {unreadCount > 0 && (
              <View style={styles.mobileMessageNotificationBadge}>
                <Text style={styles.mobileMessageNotificationText}>{unreadCount}</Text>
              </View>
            )}
          </View>
          <Text style={[
            styles.navText,
            { color: currentRoute === 'MessageHistory' ? theme.colors.secondary : theme.colors.whiteText }
          ]}>
            Messages
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => handleNavigation('MyProfile')}
        >
          <MaterialCommunityIcons
            name="account-outline"
            size={24}
            color={currentRoute === 'MyProfile' ? theme.colors.secondary : theme.colors.whiteText}
          />
          <Text style={[
            styles.navText,
            { color: currentRoute === 'MyProfile' ? theme.colors.secondary : theme.colors.whiteText }
          ]}>
            Profile
          </Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  };
  
  // If we shouldn't render (for example when navigation should be hidden),
  // we still need to return something to avoid React errors
  // IMPORTANT: All hooks must be called BEFORE this check to ensure consistent hook order
  if (!shouldRender) {
    return null;
  }
  
  // The return statement should be similar to the original component
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
};

// Main Navigation component - this is the one that gets exported
export default function Navigation(props) {
  const { state: propState, descriptors, navigation: propNavigation } = props;
  
  // IMPORTANT: All hooks must be called here unconditionally
  const reactRoute = useReactRoute();
  const [shouldCheckMessageState, setShouldCheckMessageState] = useState(true);
  const { screenWidth } = useContext(AuthContext);
  
  // Determine routeName and selectedConversation
  const routeFromProps = propState?.routes?.[propState?.index];
  const routeName = routeFromProps?.name || reactRoute?.name || '';
  const selectedConversation = 
    routeFromProps?.params?.selectedConversation || 
    reactRoute?.params?.selectedConversation;
  
  const isInMessageHistory = routeName === 'MessageHistory';
  
  // IMPORTANT: React hooks rules require that hooks are called in the same order
  // on every render. Never put hooks inside conditional blocks or early returns.
  // For safety, we've moved all hooks to the top of the component.
  
  // On first render, we check if this is a page reload with URL params
  // ALWAYS call hooks unconditionally to avoid React hooks errors
  useEffect(() => {
    // Only execute the effect logic if the conditions are met
    if (Platform.OS === 'web' && isInMessageHistory && selectedConversation && screenWidth <= 900) {
      // If URL has conversation params, wait for MessageHistory to set its state
      const isPageReload = typeof performance !== 'undefined' && 
                         performance.navigation && 
                         performance.navigation.type === performance.navigation.TYPE_RELOAD;
      
      debugLog('MBAo3hi4g4v: Page load check', {
        isPageReload: isPageReload || 'API not available',
        hasURLParams: !!selectedConversation,
        shouldCheckMessageState
      });
      
      if (shouldCheckMessageState) {
        // First render with URL params - don't hide navigation yet
        setShouldCheckMessageState(false);
      }
    }
  }, [isInMessageHistory, selectedConversation, screenWidth, shouldCheckMessageState]);
  
  // Check if we should hide navigation
  // More robust check for selectedConversation to prevent falsy values from causing issues
  const hasSelectedConversation = selectedConversation !== null && 
                                selectedConversation !== undefined && 
                                selectedConversation !== '';
  
  const shouldHideNavigation = isInMessageHistory && 
                              hasSelectedConversation && 
                              screenWidth <= 900 && 
                              !shouldCheckMessageState;
  
  // Log visibility state
  debugLog('MBAo3hi4g4v: Navigation visibility check', { 
    routeName, 
    selectedConversation, 
    screenWidth,
    shouldCheckMessageState,
    shouldHideNavigation
  });
  
  // We ALWAYS render the NavigationContent component but control visibility
  // via the shouldRender prop. This ensures hooks are always called in the same order.
  return (
    <NavigationContent 
      propState={propState}
      descriptors={descriptors}
      propNavigation={propNavigation}
      shouldRender={!shouldHideNavigation}
    />
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
    right: 0,
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 1000,
    marginRight: 20, 
    minWidth: 250,
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
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
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
  hamburgerMenuContainer: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
