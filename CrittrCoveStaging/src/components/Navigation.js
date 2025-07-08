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
import platformNavigation from '../utils/platformNavigation';

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
    const previousRoute = await getStorage('previousRoute');
    const currentRoute = await getStorage('currentRoute');
    
    // If we have a valid previous route, navigate to it
    if (previousRoute && previousRoute !== currentRoute) {
      debugLog('MBA6789: handleBack - navigating to previous route', { 
        from: currentRoute, 
        to: previousRoute 
      });
      
      // Use platform-aware navigation
      const success = platformNavigation.goBack(navigation);
      if (success) {
        await setStorage('currentRoute', previousRoute);
      }
      
      return success;
    } else {
      // If no previous route, go to Dashboard as fallback
      if (currentRoute !== 'Dashboard') {
        debugLog('MBA6789: handleBack - no previous route, going to Dashboard', { 
          from: currentRoute 
        });
        platformNavigation.navigateTo(navigation, 'Dashboard');
        await setStorage('currentRoute', 'Dashboard');
        return true;
      }
    }
    
    return false;
  } catch (error) {
    debugLog('MBA6789: handleBack - error', error);
    return false;
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
    
    // Get current route information using platform navigation
    const currentRouteInfo = platformNavigation.getCurrentRoute(navigation);
    
    // Only log if we're not already at the route to reduce spam
    if (currentRouteInfo.name !== toLocation || currentRoute !== toLocation) {
      debugLog('MBAuieo2o34nf navigateToFrom - current route check', {
        currentRouteName: currentRouteInfo.name,
        currentPath: currentRouteInfo.path,
        navigatingTo: toLocation
      });
    }
    
    // If we're already on this route according to the current info but not our state, just update state
    if (currentRouteInfo.name === toLocation && currentRoute !== toLocation) {
      await setStorage('currentRoute', toLocation);
      debugLog('MBAuieo2o34nf navigateToFrom - only updating state, already at route', {
        toLocation,
        currentRouteName: currentRouteInfo.name
      });
      return;
    }
    
    // Navigate to the new screen using platform navigation
    platformNavigation.navigateTo(navigation, toLocation, params);
    
    // Update current route in storage
    await setStorage('currentRoute', toLocation);
    
    // Only log if we're actually changing routes
    if (currentRoute !== toLocation) {
      debugLog('MBAuieo2o34nf navigateToFrom - navigation complete', {
        from: fromLocation,
        to: toLocation,
        params,
        previousRoute: currentRoute,
        newCurrentRoute: toLocation,
        currentPath: currentRouteInfo.path
      });
    }
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
  
  // Add render counter for debugging
  const renderCountRef = useRef(0);
  useEffect(() => {
    renderCountRef.current += 1;
  });
  
  // Get message notification state
  const {
    hasUnreadMessages,
    unreadCount,
    ownerUnreadCount,
    professionalUnreadCount,
    getCurrentRoleUnreadCount,
    getOtherRoleUnreadCount,
    hasCurrentRoleUnreadMessages,
    resetNotifications,
    updateRoute
  } = useContext(MessageNotificationContext);
  
  // Add a notification state update effect when the notification context changes
  useEffect(() => {
    debugLog('MBA3uiobv59u: Navigation received notification update:', {
      hasUnreadMessages,
      unreadCount,
      ownerUnreadCount,
      professionalUnreadCount,
      userRole,
      currentRoute
    });

    // Force update display of notifications on role change or when notification state changes
  }, [hasUnreadMessages, unreadCount, ownerUnreadCount, professionalUnreadCount, userRole]);
  
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
  
  // Add logging for message notifications on state change
  useEffect(() => {
    // Only log if there are unread messages to reduce noise
    if (hasUnreadMessages) {
      debugLog('MBA2o3uihf48hv: Navigation notification state changed', {
        hasUnreadMessages,
        unreadCount,
        currentRoute,
        isInMessageHistory: currentRoute === 'MessageHistory',
        selectedConversationId: typeof window !== 'undefined' ? window.selectedConversationId : null
      });
    }
  }, [hasUnreadMessages, unreadCount, currentRoute]);
  
  useEffect(() => {
    const updateLayout = () => {
      setIsMobile(Dimensions.get('window').width < 900);
    };

    const subscription = Dimensions.addEventListener('change', updateLayout);

    return () => {
      subscription?.remove();
    };
  }, []);

  // Helper function to check and reset conversation notifications if needed
  const checkAndResetConversationNotifications = () => {
    // Only run if we're on the MessageHistory screen
    if (currentRoute === 'MessageHistory') {
      // Check for selected conversation ID
      const selectedConvId = (typeof window !== 'undefined') ? window.selectedConversationId : null;
      
      if (selectedConvId) {
        debugLog('MBA2o3uihf48hv: Checking if notifications need reset for selected conversation', {
          selectedConvId,
          currentRoute,
          hasUnreadMessages,
          unreadCount
        });
        
        // When running resetNotifications from navigation, we need to make sure
        // we're not accumulating extra counts that don't exist in the real state
        if (hasUnreadMessages || unreadCount > 0) {
          // Reset notifications for this conversation - call even if hasUnreadMessages is false
          // to ensure any conversation-specific notifications are cleared
          resetNotifications && resetNotifications(currentRoute, selectedConvId);
        }
      }
    }
  };
  
  // Add effect to reset conversation notifications when selectedConversationId changes
  useEffect(() => {
    if (typeof window !== 'undefined' && window.selectedConversationId) {
      checkAndResetConversationNotifications();
    }
  }, [currentRoute, hasUnreadMessages]); // Removed unreadCount from dependencies to avoid infinite loops

  // Add a websocket-focused effect to ensure notifications are correctly synced
  useEffect(() => {
    // Log the current notification state when it changes
    debugLog('MBA2o3uihf48hv: Navigation notification state update', {
      unreadCount,
      hasUnreadMessages,
      currentRoute,
      userRole,
      onMessagesScreen: currentRoute === 'MessageHistory',
      selectedConversationId: typeof window !== 'undefined' ? window.selectedConversationId : null
    });
    
    // Make sure that hasUnreadMessages and unreadCount are consistent
    // unreadCount should be > 0 when hasUnreadMessages is true, and vice versa
    if ((hasUnreadMessages && unreadCount === 0) || (!hasUnreadMessages && unreadCount > 0)) {
      debugLog('MBA2o3uihf48hv: ⚠️ Inconsistent notification state detected', {
        hasUnreadMessages,
        unreadCount,
        userRole
      });
    }
    
    // Store unread count for current role in sessionStorage to help with role switching
    if (typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined') {
      try {
        const roleKey = `unreadCount_${userRole}`;
        window.sessionStorage.setItem(roleKey, unreadCount.toString());
        debugLog('MBA2o3uihf48hv: Stored unread count for role', {
          role: userRole,
          count: unreadCount
        });
      } catch (error) {
        // Ignore storage errors
      }
    }
    
    // Only run the sync check if we're on the MessageHistory page 
    // and we have a selected conversation
    if (currentRoute === 'MessageHistory' && 
        typeof window !== 'undefined' && 
        window.selectedConversationId) {
      
      // If we have a selected conversation but still show unread messages,
      // we might need to mark that conversation as read
      if (unreadCount > 0) {
        // We should check if the unread messages are for the current conversation
        checkAndResetConversationNotifications();
      }
    }
  }, [unreadCount, hasUnreadMessages, currentRoute, userRole]);

  useEffect(() => {
    const updateCurrentRoute = async () => {
      try {
        // Get current route using platform navigation
        const currentRouteInfo = platformNavigation.getCurrentRoute(navigation, reactRoute);
        const urlRoute = currentRouteInfo.name;
        
        // Only log if the route is different from current route to reduce spam
        if (urlRoute !== currentRoute) {
          debugLog('MBA2o3uihf48hv: Route check', { 
            urlRoute, 
            currentRoute,
            path: currentRouteInfo.path
          });
        }
        
        // If route info is different from current route, update it
        if (urlRoute && urlRoute !== currentRoute) {
          setCurrentRoute(urlRoute);
          await setStorage('currentRoute', urlRoute);
          
          // Update message notification context with new route
          updateRoute && updateRoute(urlRoute);
          
          // Only reset notifications when navigating to MessageHistory
          if (urlRoute === 'MessageHistory' && hasUnreadMessages) {
            // Check for a specific selected conversation ID from global variable (web only)
            const selectedConvId = platformNavigation.isWeb() && typeof window !== 'undefined' 
              ? window.selectedConversationId 
              : null;
            debugLog('MBA2o3uihf48hv: Navigation checking for selected conversation ID', { 
              selectedConvId, 
              hasUnreadMessages, 
              route: urlRoute 
            });
            
            // Pass the selected conversation ID if available
            resetNotifications && resetNotifications(urlRoute, selectedConvId);
          }
          
          debugLog('MBA2o3uihf48hv: Updated current route', { 
            urlRoute, 
            oldRoute: currentRoute,
            hasUnreadMessages,
            unreadCount
          });
          
          return; // Skip checking localStorage if we've already updated from route info
        }
        
        // Fall back to localStorage if route info didn't provide a different route
        const route = await getStorage('currentRoute');
        
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
            // Check for a specific selected conversation ID from global variable (web only)
            const selectedConvId = platformNavigation.isWeb() && typeof window !== 'undefined' 
              ? window.selectedConversationId 
              : null;
            debugLog('MBA2o3uihf48hv: Navigation checking for selected conversation ID from storage', { 
              selectedConvId, 
              hasUnreadMessages, 
              route 
            });
            
            // Pass the selected conversation ID if available
            resetNotifications && resetNotifications(route, selectedConvId);
          }
          
          debugLog('MBA2o3uihf48hv: Updated current route from storage', {
            route,
            oldRoute: currentRoute,
            hasUnreadMessages,
            unreadCount
          });
        }
      } catch (error) {
        console.error('Error updating current route:', error);
      }
    };

    // Initial update
    updateCurrentRoute();
    
    // Add navigation state listener with safety check
    let unsubscribe = () => {};
    if (navigation && typeof navigation.addListener === 'function') {
      unsubscribe = navigation.addListener('state', updateCurrentRoute);
    } else {
      debugLog('MBA4477: Warning - navigation.addListener not available', { 
        navigationExists: !!navigation,
        addListenerExists: navigation && typeof navigation.addListener === 'function'
      });
    }
    
    // Add platform-aware navigation listener for handling browser history changes
    const removeNavigationListener = platformNavigation.addNavigationListener((routeInfo, event) => {
      debugLog('MBA4477: Detected navigation change, updating route', {
        routeName: routeInfo.name,
        path: routeInfo.path
      });
      
      // Force immediate update on navigation change
      updateCurrentRoute();
    });
    
    // Set up periodic route checking for web platform
    let routeCheckInterval;
    if (platformNavigation.isWeb() && typeof window !== 'undefined') {
      // Store previous route check to avoid unnecessary updates
      let lastCheckedRoute = currentRoute;
      
      routeCheckInterval = setInterval(() => {
        const currentRouteInfo = platformNavigation.getCurrentRoute(navigation, reactRoute);
        const urlRoute = currentRouteInfo.name;
        
        // Only update if something has changed
        if (urlRoute !== lastCheckedRoute && urlRoute !== currentRoute) {
          lastCheckedRoute = urlRoute;
          updateCurrentRoute();
        }
      }, 5000); // Check every 5 seconds to reduce overhead even further
    }
    
    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
      removeNavigationListener();
      if (routeCheckInterval) {
        clearInterval(routeCheckInterval);
      }
    };
  }, [navigation, resetNotifications, updateRoute, hasUnreadMessages, currentRoute, reactRoute]);

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
  
  // Component to show notification indicator for the other role
  const OtherRoleNotificationIndicator = ({ roleToCheck, currentRole, style }) => {
    // Get the unread count for the role we're checking
    const roleCount = roleToCheck === 'professional' 
      ? professionalUnreadCount 
      : ownerUnreadCount;
    
    // Get if this is the currently active role
    const isCurrentRole = userRole === roleToCheck;
    
    // Add debug log to track state updates for notifications
    useEffect(() => {
      debugLog('MBA3uiobv59u: OtherRoleNotificationIndicator update:', {
        roleToCheck,
        roleCount,
        isCurrentRole,
        currentUserRole: userRole,
        ownerUnreadCount,
        professionalUnreadCount
      });
    }, [roleCount, isCurrentRole, roleToCheck, userRole, ownerUnreadCount, professionalUnreadCount]);
    
    // Only show notification if:
    // 1. This is not the current role (we're checking the other role)
    // 2. There are unread messages for this role
    if (isCurrentRole || roleCount === 0) return null;
    
    debugLog('MBA3uiobv59u: Rendering notification badge for role:', {
      roleToCheck,
      roleCount
    });
    
    return (
      <View style={[styles.roleNotificationBadge, style]}>
        <Text style={styles.roleNotificationText}>{roleCount}</Text>
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

  const handleNavigation = (route, params = {}) => {
    debugLog('MBA4477: Navigation handling', { route, currentRoute, params });
    if (route === currentRoute && !params.source) {
      return;
    }
    
    // Close the menu when navigating
    setIsMenuOpen(false);
    closeMenu();
    
    // Use the navigation helpers
    navigateToFrom(navigation, route, currentRoute, params);
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
    let logoutItem = null;
    
    // Get current role notification count directly
    const currentRoleCount = getCurrentRoleUnreadCount();
    const hasCurrentRoleUnread = hasCurrentRoleUnreadMessages();
    
    // Add logging for notification state when rendering menu
    debugLog('MBA3uiobv59u: Rendering menu items with notification state:', {
      hasUnreadMessages,
      unreadCount,
      ownerUnreadCount,
      professionalUnreadCount,
      currentRoleCount,
      hasCurrentRoleUnread,
      userRole,
      currentRoute
    });
    
    if (!isSignedIn) {
      // Signed-out menu items
      items = [
        { icon: 'login', label: 'Sign In', route: 'SignIn' },
        { icon: 'account-plus-outline', label: 'Sign Up', route: 'SignUp' },
        { icon: 'magnify', label: 'Search Pros', route: 'SearchProfessionalsListing' }
      ];
    } else if (userRole === 'professional') {
      // Professional menu items in the specified order
      items = [
        { icon: 'view-dashboard-outline', label: 'Dashboard', route: 'Dashboard' },
        { icon: 'message-text-outline', label: 'Messages', route: 'MessageHistory', notification: hasCurrentRoleUnread },
        { icon: 'briefcase-outline', label: 'Services', route: 'ServiceManager' },
        { icon: 'account-group-outline', label: 'Connections', route: 'Connections' },
        { icon: 'account-outline', label: 'Profile', route: 'MyProfile' },
        { icon: 'email-outline', label: 'Contact Us', route: 'ContactUs' }
      ];
      
      // Store logout item separately
      logoutItem = { icon: 'logout', label: 'Logout', route: 'logout', action: handleLogout };
    } else {
      // Pet Owner menu items in the specified order
      items = [
        { icon: 'view-dashboard-outline', label: 'Dashboard', route: 'Dashboard' },
        { icon: 'message-text-outline', label: 'Messages', route: 'MessageHistory', notification: hasCurrentRoleUnread },
        { icon: 'magnify', label: 'Search Pros', route: 'SearchProfessionalsListing' },
        { icon: 'account-group-outline', label: 'Become Professional', route: 'ContactUs', params: { source: 'becomeProfessional' } },
        { icon: 'account-outline', label: 'Profile', route: 'MyProfile' },
        { icon: 'email-outline', label: 'Contact Us', route: 'ContactUs' }
      ];
      
      // Store logout item separately
      logoutItem = { icon: 'logout', label: 'Logout', route: 'logout', action: handleLogout };
    }
    
    return {
      menuItems: items.map((item, index) => (
        <TouchableOpacity
          key={index}
          style={[
            styles.sidebarItem,
            currentRoute === item.route && styles.activeItem
          ]}
          onPress={() => item.action ? item.action() : handleNavigation(item.route, item.params)}
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
          {/* Only show notification badge with count when there are unread messages FOR CURRENT ROLE */}
          {item.route === 'MessageHistory' && currentRoleCount > 0 && (
            <View style={styles.messageNotificationBadge}>
              <Text style={styles.messageNotificationText}>
                {currentRoleCount}
              </Text>
            </View>
          )}
          {/* We've replaced the old dot with the badge above */}
        </TouchableOpacity>
      )),
      logoutItem
    };
  };
  
  const renderMobileMenuItems = () => {
    let items = [];
    
    // Get current role notification count directly
    const currentRoleCount = getCurrentRoleUnreadCount();
    const hasCurrentRoleUnread = hasCurrentRoleUnreadMessages();
    
    debugLog('MBA3uiobv59u: Rendering mobile menu items:', {
      currentRoleCount,
      hasCurrentRoleUnread,
      userRole
    });
    
    if (!isSignedIn) {
      // Signed-out menu items
      items = [
        { icon: 'login', label: 'Sign In', route: 'SignIn' },
        { icon: 'account-plus-outline', label: 'Sign Up', route: 'SignUp' },
        { icon: 'magnify', label: 'Search Pros', route: 'SearchProfessionalsListing' }
      ];
    } else if (userRole === 'professional') {
      // Professional menu items in the specified order - keep logout in the menu for mobile
      items = [
        { icon: 'view-dashboard-outline', label: 'Dashboard', route: 'Dashboard' },
        { icon: 'message-text-outline', label: 'Messages', route: 'MessageHistory', notification: hasCurrentRoleUnread, count: currentRoleCount },
        { icon: 'briefcase-outline', label: 'Services', route: 'ServiceManager' },
        { icon: 'account-group-outline', label: 'Connections', route: 'Connections' },
        { icon: 'account-outline', label: 'Profile', route: 'MyProfile' },
        { icon: 'email-outline', label: 'Contact Us', route: 'ContactUs' },
        { icon: 'logout', label: 'Logout', route: 'logout', action: handleLogout }
      ];
    } else {
      // Pet Owner menu items in the specified order - keep logout in the menu for mobile
      items = [
        { icon: 'view-dashboard-outline', label: 'Dashboard', route: 'Dashboard' },
        { icon: 'message-text-outline', label: 'Messages', route: 'MessageHistory', notification: hasCurrentRoleUnread, count: currentRoleCount },
        { icon: 'magnify', label: 'Search Pros', route: 'SearchProfessionalsListing' },
        { icon: 'account-group-outline', label: 'Become Professional', route: 'ContactUs', params: { source: 'becomeProfessional' } },
        { icon: 'account-outline', label: 'Profile', route: 'MyProfile' },
        { icon: 'email-outline', label: 'Contact Us', route: 'ContactUs' },
        { icon: 'logout', label: 'Logout', route: 'logout', action: handleLogout }
      ];
    }
    
    return (
      <>
        {/* Role Toggle for Mobile - Only show when signed in and approved professional */}
        {isSignedIn && isApprovedProfessional && (
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
                
                {/* Notification indicator for pet owner role */}
                {userRole !== 'petOwner' && ownerUnreadCount > 0 && (
                  <View style={[styles.roleNotificationBadge, { top: -8, right: -8 }]}>
                    <Text style={styles.roleNotificationText}>
                      {ownerUnreadCount}
                    </Text>
                  </View>
                )}
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
                
                {/* Notification indicator for professional role */}
                {userRole !== 'professional' && professionalUnreadCount > 0 && (
                  <View style={[styles.roleNotificationBadge, { top: -8, right: -8 }]}>
                    <Text style={styles.roleNotificationText}>
                      {professionalUnreadCount}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
        
        {/* Menu Items */}
        {items.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.mobileMenuItem,
              item.route === 'logout' && styles.mobileLogoutItem
            ]}
            onPress={() => {
              setIsMenuOpen(false);
              item.action ? item.action() : handleNavigation(item.route, item.params);
            }}
          >
            <MaterialCommunityIcons
              name={item.icon}
              size={24}
              color={item.route === 'logout' ? '#F26969' : theme.colors.text}
            />
            <Text style={[
              styles.mobileMenuItemText,
              item.route === 'logout' && styles.mobileLogoutText
            ]}>
              {item.label}
            </Text>
            {/* Only show notification badge with count when there are unread messages FOR CURRENT ROLE */}
            {item.route === 'MessageHistory' && currentRoleCount > 0 && (
              <View style={styles.mobileMessageNotificationBadge}>
                <Text style={styles.mobileMessageNotificationText}>{currentRoleCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </>
    );
  };
  
  const renderDesktopSidebar = () => {
    const sidebarWidth = isCollapsed ? 72 : 250;
    const { menuItems, logoutItem } = renderMenuItems();
    
    return (
      <View style={[styles.sidebarContainer, { width: sidebarWidth }]}>
        <View style={styles.sidebarLogoContainer}>
          <TouchableOpacity
            style={styles.logoButton}
            onPress={() => handleNavigation('Home')}
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
          <MaterialCommunityIcons
            name={isCollapsed ? 'chevron-right' : 'chevron-left'}
            size={24}
            color={theme.colors.text}
          />
        </TouchableOpacity>
        
        <View style={styles.menuItemsContainer}>
          {/* Role Toggle - Only show when signed in and approved professional */}
          {isSignedIn && isApprovedProfessional && (
            <View style={styles.roleToggleContainer}>
              {!isCollapsed && (
                <Text style={styles.roleToggleTitle}>Your Role</Text>
              )}
              <View style={styles.roleButtonsContainer}>
                <TouchableOpacity
                  style={[
                    styles.roleButton,
                    userRole === 'petOwner' && styles.roleButtonActive
                  ]}
                  onPress={() => handleRoleSwitch('petOwner')}
                >
                  <Text
                    style={[
                      styles.roleButtonText,
                      userRole === 'petOwner' && styles.roleButtonTextActive,
                      isCollapsed && styles.roleButtonTextCollapsed
                    ]}
                  >
                    {isCollapsed ? 'O' : 'Owner'}
                  </Text>
                  
                  {/* Notification indicator for pet owner role */}
                  {userRole !== 'petOwner' && ownerUnreadCount > 0 && (
                    <View style={[styles.roleNotificationBadge, { top: -8, right: -8 }]}>
                      <Text style={styles.roleNotificationText}>
                        {ownerUnreadCount}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.roleButton,
                    userRole === 'professional' && styles.roleButtonActive
                  ]}
                  onPress={() => handleRoleSwitch('professional')}
                >
                  <Text
                    style={[
                      styles.roleButtonText,
                      userRole === 'professional' && styles.roleButtonTextActive,
                      isCollapsed && styles.roleButtonTextCollapsed
                    ]}
                  >
                    {isCollapsed ? 'P' : 'Professional'}
                  </Text>
                  
                  {/* Notification indicator for professional role */}
                  {userRole !== 'professional' && professionalUnreadCount > 0 && (
                    <View style={[styles.roleNotificationBadge, { top: -8, right: -8 }]}>
                      <Text style={styles.roleNotificationText}>
                        {professionalUnreadCount}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}
          
          {menuItems}
        </View>
        
        {/* Logout Button at the bottom */}
        {isSignedIn && logoutItem && (
          <View style={styles.logoutButtonContainer}>
            <TouchableOpacity
              style={styles.sidebarItem}
              onPress={logoutItem.action}
            >
              <MaterialCommunityIcons
                name={logoutItem.icon}
                size={24}
                color="#F26969"
              />
              <Text
                style={[
                  styles.sidebarItemText,
                  {
                    color: '#F26969',
                    marginLeft: isCollapsed ? 0 : 12,
                    display: isCollapsed ? 'none' : 'flex',
                  }
                ]}
              >
                {logoutItem.label}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };
  
  const renderMobileHeader = () => {
    return (
      <View style={[styles.mobileHeader, { backgroundColor: theme.colors.surfaceContrast }]}>
        <View style={styles.mobileHeaderContent}>
          <TouchableOpacity onPress={() => handleNavigation('Home')}>
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
              {/* Add notification badge to hamburger menu for mobile */}
              {isSignedIn && unreadCount > 0 && (
                <View style={styles.hamburgerNotificationBadge}>
                  <Text style={styles.hamburgerNotificationText}>{unreadCount}</Text>
                </View>
              )}
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
    // Get current role notification count
    const currentRoleCount = getCurrentRoleUnreadCount();
    
    // For mobile nav bar when signed out
    if (!isSignedIn) {
      return (
        <SafeAreaView style={styles.customNavBar}>
          <TouchableOpacity
            style={styles.navButton}
            onPress={() => handleNavigation('SignIn')}
          >
            <MaterialCommunityIcons
              name="login"
              size={24}
              color={currentRoute === 'SignIn' ? theme.colors.secondary : theme.colors.whiteText}
            />
            <Text style={[
              styles.navText,
              { color: currentRoute === 'SignIn' ? theme.colors.secondary : theme.colors.whiteText }
            ]}>
              Sign In
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.navButton}
            onPress={() => handleNavigation('SignUp')}
          >
            <MaterialCommunityIcons
              name="account-plus-outline"
              size={24}
              color={currentRoute === 'SignUp' ? theme.colors.secondary : theme.colors.whiteText}
            />
            <Text style={[
              styles.navText,
              { color: currentRoute === 'SignUp' ? theme.colors.secondary : theme.colors.whiteText }
            ]}>
              Sign Up
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
        </SafeAreaView>
      );
    }
    
    return (
      <SafeAreaView style={styles.customNavBar}>
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => handleNavigation(isSignedIn ? 'Dashboard' : 'SearchProfessionalsListing')}
        >
          <MaterialCommunityIcons
            name={isSignedIn ? 'view-dashboard-outline' : 'magnify'}
            size={24}
            color={currentRoute === (isSignedIn ? 'Dashboard' : 'SearchProfessionalsListing') ? theme.colors.secondary : theme.colors.whiteText}
          />
          <Text style={[
            styles.navText,
            { color: currentRoute === (isSignedIn ? 'Dashboard' : 'SearchProfessionalsListing') ? theme.colors.secondary : theme.colors.whiteText }
          ]}>
            {isSignedIn ? 'Dashboard' : 'Search'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => handleNavigation(isSignedIn ? 'SearchProfessionalsListing' : 'SignUp')}
        >
          <MaterialCommunityIcons
            name={isSignedIn ? 'magnify' : 'account-plus-outline'}
            size={24}
            color={currentRoute === (isSignedIn ? 'SearchProfessionalsListing' : 'SignUp') ? theme.colors.secondary : theme.colors.whiteText}
          />
          <Text style={[
            styles.navText,
            { color: currentRoute === (isSignedIn ? 'SearchProfessionalsListing' : 'SignUp') ? theme.colors.secondary : theme.colors.whiteText }
          ]}>
            {isSignedIn ? 'Search' : 'Sign Up'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => handleNavigation(isSignedIn ? (userRole === 'professional' ? 'ServiceManager' : 'PetManager') : 'SignIn')}
        >
          <MaterialCommunityIcons
            name={isSignedIn ? 'paw' : 'login'}
            size={24}
            color={
              currentRoute === (isSignedIn ? (userRole === 'professional' ? 'ServiceManager' : 'PetManager') : 'SignIn')
                ? theme.colors.secondary
                : theme.colors.whiteText
            }
          />
          <Text style={[
            styles.navText,
            {
              color: currentRoute === (isSignedIn ? (userRole === 'professional' ? 'ServiceManager' : 'PetManager') : 'SignIn')
                ? theme.colors.secondary
                : theme.colors.whiteText
            }
          ]}>
            {isSignedIn ? (userRole === 'professional' ? 'Services' : 'Pets') : 'Sign In'}
          </Text>
        </TouchableOpacity>
        
        {isSignedIn && (
          <>
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
                {/* Only show notification badge with count when there are unread messages FOR CURRENT ROLE */}
                {currentRoleCount > 0 && (
                  <View style={styles.mobileMessageNotificationBadge}>
                    <Text style={styles.mobileMessageNotificationText}>{currentRoleCount}</Text>
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
              onPress={() => handleNavigation('MoreScreen')}
            >
              <MaterialCommunityIcons
                name="dots-horizontal"
                size={24}
                color={currentRoute === 'MoreScreen' ? theme.colors.secondary : theme.colors.whiteText}
              />
              <Text style={[
                styles.navText,
                { color: currentRoute === 'MoreScreen' ? theme.colors.secondary : theme.colors.whiteText }
              ]}>
                More
              </Text>
            </TouchableOpacity>
          </>
        )}
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
          {!isMobile && !isSignedIn && (
            <View style={styles.signedOutHeaderWeb}>
              <TouchableOpacity onPress={() => handleNavigation('Home')}>
                <Image
                  source={require('../../assets/logo.png')}
                  style={[styles.webLogo, { tintColor: theme.colors.primary }]}
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
          )}
          {isMobile && renderMobileHeader()}
          
          {isMenuOpen && !isMobile && !isSignedIn && (
            <View style={[styles.mobileMenu, styles.webDesktopMenu]}>
              {renderMobileMenuItems()}
            </View>
          )}
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
                                selectedConversation !== '' &&
                                selectedConversation !== 'null';
  
  // For mobile platforms (iOS/Android), hide navigation when in MessageHistory with selected conversation
  const isMobilePlatform = Platform.OS === 'ios' || Platform.OS === 'android';
  let shouldHideNavigation = false;
  if (isMobilePlatform) {
    shouldHideNavigation = isInMessageHistory && hasSelectedConversation;
  } else {
    shouldHideNavigation = isInMessageHistory && 
                           hasSelectedConversation && 
                           screenWidth <= 900 &&  
                           !shouldCheckMessageState;
  }
  // const shouldHideNavigation = isInMessageHistory && 
  //                             hasSelectedConversation && 
  //                             isMobilePlatform ? isMobilePlatform : screenWidth <= 900 && !shouldCheckMessageState;
  
  // Log visibility state
  debugLog('MBAo3hi4g4v: Navigation visibility check', { 
    routeName, 
    selectedConversation,
    isMobilePlatform,
    platformOS: Platform.OS,
    shouldHideNavigation,
    isInMessageHistory,
    hasSelectedConversation, 
    shouldCheckMessageState
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
  menuItemsContainer: {
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
  logoutItem: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: 16,
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
    top: '50%',
    right: -2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.colors.error,
    borderWidth: 1,
    borderColor: theme.colors.surface,
    transform: [{ translateY: -5 }],
  },
  
  mobileMessageNotificationDot: {
    position: 'absolute',
    top: '50%',
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.error,
    borderWidth: 1,
    borderColor: theme.colors.surfaceContrast,
    transform: [{ translateY: -4 }],
  },
  messageNotificationBadge: {
    position: 'absolute',
    top: '50%',
    right: -12,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: theme.colors.error,
    borderWidth: 1,
    borderColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
    transform: [{ translateY: -11 }],
  },
  messageNotificationText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  mobileMessageNotificationBadge: {
    position: 'absolute',
    top: '50%',
    right: -10,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    marginRight: 10,
    backgroundColor: theme.colors.error,
    borderWidth: 1,
    borderColor: theme.colors.surfaceContrast,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
    transform: [{ translateY: -10 }],
  },
  mobileMessageNotificationText: {
    color: 'white',
    fontSize: 11,
    fontWeight: 'bold',
  },
  roleNotificationIndicator: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.error,
    borderWidth: 1,
    borderColor: theme.colors.surface,
    zIndex: 1,
    top: '50%',
    right: -4,
    transform: [{ translateY: -4 }],
  },
  roleNotificationBadge: {
    position: 'absolute',
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: theme.colors.error,
    borderWidth: 1,
    borderColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
    zIndex: 10,
    top: '50%',
    right: -9,
    transform: [{ translateY: -9 }],
  },
  roleNotificationText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  hamburgerMenuContainer: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  signedOutOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  signedOutButton: {
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  signedOutButtonText: {
    fontSize: theme.fontSizes.small,
    fontFamily: theme.fonts.regular.fontFamily,
    color: theme.colors.primary,
  },
  signInButton: {
    backgroundColor: theme.colors.primary,
  },
  signedOutHeaderWeb: {
    height: 70,
    width: '100%',
    backgroundColor: theme.colors.surfaceContrast,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  webLogo: {
    height: 40,
    width: 120,
    resizeMode: 'contain',
  },
  signedOutNavButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
  },
  webSignInButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  webSignInText: {
    color: theme.colors.surface,
  },
  webDesktopMenu: {
    position: 'absolute',
    right: 0,
    top: 70,
    width: 250,
  },
  logoutButtonContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceContrast,
    borderBottomRightRadius: 24,
  },
  hamburgerNotificationBadge: {
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
    paddingHorizontal: 3,
    zIndex: 10,
  },
  hamburgerNotificationText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
});
