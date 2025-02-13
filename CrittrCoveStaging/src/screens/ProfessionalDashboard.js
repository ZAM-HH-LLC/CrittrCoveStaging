import React, { useContext, useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Platform, SafeAreaView, Dimensions, StatusBar, TouchableOpacity, Text } from 'react-native';
import { Card, Title, Paragraph, List, Button, useTheme, Appbar, ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import axios from 'axios';
import { API_BASE_URL } from '../config/config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthContext } from '../context/AuthContext';
import CrossPlatformView from '../components/CrossPlatformView';
import { theme } from '../styles/theme';
import { navigateToFrom } from '../components/Navigation';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const ProfessionalDashboard = ({ navigation }) => {
  const { colors } = useTheme();
  const { signOut, firstName, screenWidth, is_DEBUG } = useContext(AuthContext);
  const [upcomingBookings, setUpcomingBookings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const isLargeScreen = screenWidth > 600;

  // Dynamic styles based on screen size
  const dynamicStyles = {
    headerTitle: {
      fontSize: isLargeScreen ? theme.fontSizes.extraLarge : theme.fontSizes.large,
      fontWeight: '500',
      color: theme.colors.text,
      fontFamily: theme.fonts.header.fontFamily,
    },
    emptyStateText: {
      fontSize: isLargeScreen ? theme.fontSizes.large : theme.fontSizes.smallMedium,
      marginBottom: 16,
      textAlign: 'center',
      fontFamily: theme.fonts.regular.fontFamily,
    },
    cardTitle: {
      fontSize: isLargeScreen ? theme.fontSizes.largeLarge : theme.fontSizes.large,
      fontFamily: theme.fonts.header.fontFamily,
    },
    cardParagraph: {
      fontSize: isLargeScreen ? theme.fontSizes.large : theme.fontSizes.medium,
      fontFamily: theme.fonts.regular.fontFamily,
    },
    listItemTitle: {
      fontSize: isLargeScreen ? theme.fontSizes.large : theme.fontSizes.medium,
      fontFamily: theme.fonts.regular.fontFamily,
    },
    listItemDescription: {
      fontSize: isLargeScreen ? theme.fontSizes.mediumLarge : theme.fontSizes.smallMedium,
      fontFamily: theme.fonts.regular.fontFamily,
    },
    buttonText: {
      fontSize: isLargeScreen ? theme.fontSizes.mediumLarge : theme.fontSizes.smallMedium,
      fontFamily: theme.fonts.regular.fontFamily,
    },
  };

  const refreshToken = async () => {
    try {
      const refreshToken = await AsyncStorage.getItem('refreshToken');
      const response = await axios.post(`${API_BASE_URL}/api/token/refresh/`, {
        refresh: refreshToken,
      });
      const { access } = response.data;
      await AsyncStorage.setItem('userToken', access);
      return access;
    } catch (error) {
      console.error('Error refreshing token:', error);
      await signOut();
      navigation.navigate('SignIn');
    }
  };

  // Prototype data
  const prototypeBookings = [
    { id: '56782', client: 'John Doe', pet: 'Max (Dog)', date: '2023-05-15', time: '14:00' },
    { id: '5678', client: 'Jane Smith', pet: 'Whiskers (Cat)', date: '2023-05-17', time: '10:00' },
  ];

  const fetchDashboardData = async () => {

    try {
      setIsLoading(true);
      let token = Platform.OS === 'web' ? sessionStorage.getItem('userToken') : await AsyncStorage.getItem('userToken');
      const response = await axios.get(`${API_BASE_URL}/api/professionals/v1/dashboard/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUpcomingBookings(response.data.upcoming_bookings || []);
    } catch (error) {
      if (error.response?.status === 401) {
        const newToken = await refreshToken();
        if (newToken) {
          try {
            const response = await axios.get(`${API_BASE_URL}/api/professionals/v1/dashboard/`, {
              headers: { Authorization: `Bearer ${newToken}` }
            });
            setUpcomingBookings(response.data.upcoming_bookings || []);
          } catch (retryError) {
            console.error('Error fetching dashboard data after token refresh:', retryError);
          }
        }
      } else {
        console.error('Error fetching dashboard data:', error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // TODO: Fetch client requests from the backend
  const clientRequests = [
    { id: '1', client: 'Alice Johnson', pet: 'Fluffy (Rabbit)', date: '2023-05-20', time: '09:00' },
    { id: '2', client: 'Bob Williams', pet: 'Spike (Iguana)', date: '2023-05-22', time: '16:00' },
  ];

  const IconComponent = Platform.OS === 'web'
    ? ({ name, ...props }) => <MaterialCommunityIcons name={name} {...props} />
    : List.Icon;

  const navigateToServiceManager = async () => {
    if (is_DEBUG) {
      console.log('Setting previousRoute to:', 'ProfessionalDashboard');
      console.log('Setting currentRoute to:', 'ServiceManager');
    }
    setTimeout(async () => {
      await navigateToFrom(navigation, 'ServiceManager', 'ProfessionalDashboard');
    }, 100);
  };

  const Content = () => (
    <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer}>
      <View style={styles.cardContainer}>
        <Card style={styles.card}>
          <Card.Content>
            <Title style={dynamicStyles.cardTitle}>Welcome back, {firstName}!</Title>
            <Paragraph style={dynamicStyles.cardParagraph}>Here's an overview of your upcoming activities.</Paragraph>
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Title style={dynamicStyles.cardTitle}>Upcoming Bookings</Title>
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            ) : upcomingBookings.length > 0 ? (
              upcomingBookings.map((booking) => (
                <TouchableOpacity
                  key={booking.booking_id}
                  onPress={() => navigateToFrom(navigation, 'BookingDetails', 'ProfessionalDashboard', { 
                    bookingId: booking.booking_id 
                  })}
                  style={styles.bookingItem}
                >
                  <List.Item
                    titleStyle={dynamicStyles.listItemTitle}
                    descriptionStyle={dynamicStyles.listItemDescription}
                    title={`${booking.client_name} - ${booking.pets.slice(0, 3).map(pet => pet.name).join(', ')}${booking.pets.length > 3 ? '...' : ''} (${booking.pets.slice(0, 3).map(pet => pet.species).join(', ')}${booking.pets.length > 3 ? '...' : ''})`}
                    description={`${booking.start_date} at ${booking.start_time}`}
                    left={(props) => <IconComponent {...props} icon="calendar" name="calendar" />}
                    right={(props) => <IconComponent {...props} icon="chevron-right" name="chevron-right" />}
                  />
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.emptyStateContainer}>
                <Paragraph style={dynamicStyles.emptyStateText}>No bookings yet!</Paragraph>
                <Button 
                  mode="contained" 
                  onPress={() => navigateToFrom(navigation, 'ServiceManager', 'ProfessionalDashboard')}
                  style={styles.createServiceButton}
                  labelStyle={dynamicStyles.buttonText}
                >
                  Create Services
                </Button>
              </View>
            )}
          </Card.Content>
          {upcomingBookings.length > 0 && (
            <Card.Actions>
              <Button 
                onPress={() => navigateToFrom(navigation, 'MyBookings', 'ProfessionalDashboard')}
                labelStyle={dynamicStyles.buttonText}
              >
                View All Bookings
              </Button>
            </Card.Actions>
          )}
        </Card>

        {/* <Card style={styles.card}>
          <Card.Content>
            <Title>Client Requests</Title>
            {clientRequests.map((request) => (
              <TouchableOpacity
                key={request.id}
                onPress={() => navigation.navigate('RequestDetails', { requestId: request.id })}
              >
                <List.Item
                  title={`${request.client} - ${request.pet}`}
                  description={`${request.date} at ${request.time}`}
                  left={(props) => <IconComponent {...props} icon="account-clock" name="account-clock" />}
                  right={(props) => <IconComponent {...props} icon="chevron-right" name="chevron-right" />}
                />
              </TouchableOpacity>
            ))}
          </Card.Content>
          <Card.Actions>
            <Button onPress={() => navigation.navigate('ClientRequests')}>View All Requests</Button>
          </Card.Actions>
        </Card> */}

        <Card style={styles.card}>
          <Card.Content>
            <Title style={dynamicStyles.cardTitle}>Quick Actions</Title>
            <View style={styles.quickActions}>
              <Button 
                icon={Platform.OS === 'web' ? ({ size, color }) => <MaterialCommunityIcons name="clock" size={size} color={color} /> : "clock"}
                mode="outlined" 
                onPress={() => navigateToFrom(navigation, 'AvailabilitySettings', 'ProfessionalDashboard')}
                style={styles.quickActionButton}
                labelStyle={dynamicStyles.buttonText}
              >
                {Platform.OS === 'web' ? 'Update Availability' : 'Availability'}
              </Button>
              <Button 
                icon={Platform.OS === 'web' ? ({ size, color }) => <MaterialCommunityIcons name="briefcase" size={size} color={color} /> : "briefcase"}
                mode="outlined" 
                onPress={navigateToServiceManager}
                style={styles.quickActionButton}
                labelStyle={dynamicStyles.buttonText}
              >
                My Services
              </Button>
            </View>
          </Card.Content>
        </Card>
      </View>
    </ScrollView>
  );

  return (
    <CrossPlatformView fullWidthHeader={true}>
      <View style={styles.header}>
        <Text style={dynamicStyles.headerTitle}>Professional Dashboard</Text>
      </View>
      <Content />
    </CrossPlatformView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f0f0',
  },
  safeArea: {
    flex: 0,
    backgroundColor: '#f0f0f0',
  },
  bookingItem: {
    padding: 6,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
    marginVertical: 4,
    borderRadius: 4,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: Platform.OS === 'web' ? 0 : 80,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 16,
  },
  cardContainer: {
    maxWidth: Platform.OS === 'web' ? 800 : '100%',
    alignSelf: 'center',
    width: '100%',
  },
  card: {
    marginBottom: 16,
  },
  quickActions: {
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    gap: 8,
    marginTop: 16,
  },
  quickActionButton: {
    marginVertical: Platform.OS === 'web' ? 0 : 8,
    marginHorizontal: Platform.OS === 'web' ? 0 : 0,
    flex: Platform.OS === 'web' ? 1 : 0,
    minWidth: Platform.OS === 'web' ? 200 : 'auto',
  },
  header: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    justifyContent: 'center',
    alignItems: Platform.OS === 'web' ? undefined : 'center',
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyStateContainer: {
    padding: 20,
    alignItems: 'center',
  },
  createServiceButton: {
    marginTop: 8,
  },
});

export default ProfessionalDashboard;
