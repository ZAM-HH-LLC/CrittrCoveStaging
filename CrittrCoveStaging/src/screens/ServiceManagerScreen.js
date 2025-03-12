import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { Button } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import ServiceManager from '../components/ServiceManager';
import AddServiceModal from '../components/AddServiceModal';
import { theme } from '../styles/theme';
import { DEFAULT_SERVICES } from '../data/mockData';
import CrossPlatformView from '../components/CrossPlatformView';
import BackHeader from '../components/BackHeader';
import { handleBack } from '../components/Navigation';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getProfessionalServices } from '../api/API';

const ServiceManagerScreen = () => {
  const navigation = useNavigation();
  const [services, setServices] = useState([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchServices = async () => {
      const data = await getProfessionalServices();
      console.log('MBA123: Fetched services:', data);
      setServices(data);
      setIsLoading(false);
    };

    fetchServices();
  }, []);

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
        previousRoute = 'ProfessionalDashboard';
        currentRoute = 'ServiceManager';
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

  const handleAddService = (newService) => {
    setServices(prev => [...prev, newService]);
    setHasUnsavedChanges(true);
  };

  if (isLoading) {
    return (
      <CrossPlatformView fullWidthHeader={true}>
        <BackHeader 
          title="Service Manager" 
          onBackPress={() => navigation.navigate('More')} 
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </CrossPlatformView>
    );
  }

  return (
    <CrossPlatformView fullWidthHeader={true} style={{ position: 'relative', zIndex: 1 }}>
      <View style={{ position: 'relative', zIndex: 1 }}>
        <BackHeader 
          title="Service Manager" 
          onBackPress={() => handleBack(navigation)} 
          style={{ zIndex: 1 }}
        />
      </View>
      <View style={[styles.container, { marginTop: 20, position: 'relative', zIndex: 2 }]}>
        <ServiceManager
          services={services || []}
          setServices={setServices}
          setHasUnsavedChanges={setHasUnsavedChanges}
          isProfessionalTab={false}
        />
      </View>
    </CrossPlatformView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
    zIndex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    color: theme.colors.text,
    // marginBottom: 20,
  },
  addButton: {
    paddingHorizontal: 20,
  },
});

export default ServiceManagerScreen; 