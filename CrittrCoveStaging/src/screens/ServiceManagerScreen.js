import React, { useState, useEffect, useContext, useCallback } from 'react';
import { View, StyleSheet, ActivityIndicator, Platform, Dimensions } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import ServiceManager from '../components/ServiceManager';
import { theme } from '../styles/theme';
import BackHeader from '../components/BackHeader';
import { handleBack } from '../components/Navigation';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getProfessionalServices } from '../api/API';
import { AuthContext, debugLog } from '../context/AuthContext';
import { useToast } from '../components/ToastProvider';

const ServiceManagerScreen = () => {
  const navigation = useNavigation();
  const [services, setServices] = useState([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(Dimensions.get('window').width < 900);
  const { isCollapsed, is_DEBUG, isSignedIn, userRole } = useContext(AuthContext);
  const showToast = useToast();

  useEffect(() => {
    const updateLayout = () => {
      setIsMobile(Dimensions.get('window').width < 900);
    };

    const subscription = Dimensions.addEventListener('change', updateLayout);
    return () => {
      subscription?.remove();
    };
  }, []);

  const fetchServices = async () => {
    try {
      if (userRole === 'professional') {
        setIsLoading(true);
        const data = await getProfessionalServices();
        if (is_DEBUG) console.log('MBA7890: Fetched services:', data);
        setServices(data);
      }
    } catch (error) {
      console.error('MBA7890: Error fetching services:', error);
      if (userRole === 'professional') {
        showToast({
          message: 'Failed to load services',
          type: 'error',
          duration: 3000
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Only fetch services if user is signed in and has a role
    if (isSignedIn && userRole) {
      debugLog('MBA7890', 'Fetching services for user:', { userRole, isSignedIn });
      fetchServices();
    } else {
      // Clear services if user is not signed in
      setServices([]);
      setIsLoading(false);
    }
  }, [isSignedIn, userRole]);

  // Effect to handle unsaved changes
  useEffect(() => {
    if (hasUnsavedChanges) {
      fetchServices();
      setHasUnsavedChanges(false);
    }
  }, [hasUnsavedChanges]);

  // Fetch services when screen comes into focus (ensures fresh data after navigation)
  useFocusEffect(
    useCallback(() => {
      if (isSignedIn && userRole) {
        debugLog('MBA7890', 'Screen focused, fetching services for user:', { userRole, isSignedIn });
        fetchServices();
      }
    }, [isSignedIn, userRole])
  );

  useEffect(() => {
    const setRouteHistory = async () => {
      const currentRoute = 'ServiceManager';
      let previousRoute;

      if (Platform.OS === 'web') {
        previousRoute = sessionStorage.getItem('previousRoute');
        sessionStorage.setItem('previousRoute', previousRoute || '');
        sessionStorage.setItem('currentRoute', currentRoute);
      } else {
        previousRoute = await AsyncStorage.getItem('previousRoute');
        await AsyncStorage.setItem('previousRoute', previousRoute || '');
        await AsyncStorage.setItem('currentRoute', currentRoute);
      }

      if (!previousRoute) {
        previousRoute = 'Dashboard';
        if (Platform.OS === 'web') {
          sessionStorage.setItem('previousRoute', previousRoute || '');
          sessionStorage.setItem('currentRoute', currentRoute);
        } else {
          await AsyncStorage.setItem('previousRoute', previousRoute || '');
          await AsyncStorage.setItem('currentRoute', currentRoute);
        }
      }
    };
    setRouteHistory();
  }, []);

  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={[
      styles.container,
      { marginLeft: !isMobile ? (isCollapsed ? 70 : 250) : 0 }
    ]}>
      {isMobile && (
        <BackHeader 
          title="Service Manager" 
          onBackPress={() => handleBack(navigation)} 
        />
      )}
      <View style={[styles.content, { marginTop: isMobile ? 20 : 0 }]}>
        <ServiceManager
          services={services || []}
          setServices={setServices}
          setHasUnsavedChanges={setHasUnsavedChanges}
          isProfessionalTab={false}
          isMobile={isMobile}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    height: '100vh',
    backgroundColor: theme.colors.surface,
    position: 'fixed',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    overflow: 'hidden',
    transition: 'margin-left 0.3s ease',
  },
  content: {
    flex: 1,
    height: '100%',
    overflow: 'auto',
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ServiceManagerScreen; 