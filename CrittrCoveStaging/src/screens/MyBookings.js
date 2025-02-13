import React, { useState, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../styles/theme';
import CrossPlatformView from '../components/CrossPlatformView';
import BackHeader from '../components/BackHeader';
import BookingCard from '../components/BookingCard';
import { mockProfessionalBookings, mockClientBookings } from '../data/mockData';
import { AuthContext } from '../context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { handleBack, navigateToFrom } from '../components/Navigation';
import { API_BASE_URL } from '../config/config';

const MyBookings = () => {
  const navigation = useNavigation();
  const { is_prototype, isApprovedProfessional, userRole, is_DEBUG } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState(userRole === 'professional' ? 'professional' : 'client');
  const [searchQuery, setSearchQuery] = useState('');
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Handle role changes
  useEffect(() => {
    if (userRole === 'professional' && isApprovedProfessional) {
      setActiveTab('professional');
    }
  }, [userRole, isApprovedProfessional]);

  const fetchBookings = async () => {
    setLoading(true);
    setError(null);
    try {
      if (is_prototype) {
        if (is_DEBUG) {
          console.log('Fetching mock bookings:', {
            isApprovedProfessional,
            userRole,
            activeTab
          });
        }
        
        // In prototype mode, use mock data
        if (activeTab === 'professional' && isApprovedProfessional) {
          setBookings(mockProfessionalBookings);
        } else {
          setBookings(mockClientBookings);
        }
      } else {
        // Real API call logic
        let token = Platform.OS === 'web' ? sessionStorage.getItem('userToken') : await AsyncStorage.getItem('userToken');
        if (!token) {
          throw new Error('No authentication token found');
        }

        if (is_DEBUG) {
          console.log('Fetching real bookings:', {
            isApprovedProfessional,
            userRole,
            activeTab
          });
        }

        const response = await axios.get(
          `${API_BASE_URL}/api/bookings/v1/`,
          { headers: { Authorization: `Bearer ${token}` }}
        );

        if (activeTab === 'professional') {
          setBookings(response.data.bookings.professional_bookings || []);
        } else {
          setBookings(response.data.bookings.client_bookings || []);
        }
      }
    } catch (error) {
      console.error('Error fetching bookings:', error);
      setError('Failed to fetch bookings');
    } finally {
      setLoading(false);
    }
  };

  // Fetch bookings when component mounts or when dependencies change
  useEffect(() => {
    if (is_DEBUG) {
      console.log('Fetching bookings due to dependency change:', {
        activeTab,
        userRole,
        isApprovedProfessional,
        is_prototype
      });
    }
    fetchBookings();
  }, [activeTab, userRole, isApprovedProfessional, is_prototype]);

  // Handle search
  const handleSearch = (query) => {
    setSearchQuery(query);
    
    if (!query.trim()) {
      fetchBookings();
      return;
    }

    const searchLower = query.toLowerCase();
    const filtered = bookings.filter(booking => {
      if (activeTab === 'professional') {
        return (
          booking.id.toLowerCase().includes(searchLower) ||
          booking.clientName.toLowerCase().includes(searchLower)
        );
      } else {
        return (
          booking.id.toLowerCase().includes(searchLower) ||
          booking.professionalName.toLowerCase().includes(searchLower)
        );
      }
    });

    setBookings(filtered);
  };

  const handleViewDetails = async (booking) => {
    if (is_DEBUG) {
      console.log('Navigating to booking details:', {
        bookingId: booking.booking_id || booking.id,
        isProfessional: activeTab === 'professional'
      });
    }
    
    await navigateToFrom(navigation, 'BookingDetails', 'MyBookings', {
      bookingId: booking.booking_id || booking.id,
      isProfessional: activeTab === 'professional'
    });
  };

  const handleCancelBooking = async (bookingId) => {
    // Implement booking cancellation logic
    if (is_DEBUG) {
      console.log('Cancel booking:', bookingId);
    }
  };

  const renderBookingCard = ({ item }) => (
    <BookingCard
      booking={{
        id: item.booking_id || item.id,
        clientName: item.client_name || item.clientName,
        professionalName: item.professional_name || item.professionalName,
        serviceName: item.service_type || item.serviceName,
        date: item.start_date || item.date,
        time: item.start_time || item.time,
        status: item.status
      }}
      type={activeTab}
      onViewDetails={() => handleViewDetails(item)}
      onCancel={() => handleCancelBooking(item.booking_id || item.id)}
    />
  );

  const EmptyStateMessage = () => (
    <View style={styles.emptyStateContainer}>
      <MaterialCommunityIcons 
        name={error ? "alert-circle-outline" : "calendar-blank-outline"} 
        size={64} 
        color={error ? theme.colors.error : theme.colors.primary} 
      />
      <Text style={styles.emptyStateTitle}>
        {error ? 'Error Getting Bookings' : 'No Bookings Found'}
      </Text>
      <Text style={styles.emptyStateSubtitle}>
        {error 
          ? 'There was an error fetching your bookings. Please try again later.' 
          : activeTab === 'professional' 
            ? isApprovedProfessional 
              ? 'Create a service to start receiving bookings'
              : 'Apply to become a professional to start receiving bookings'
            : 'Browse available services to make your first booking'
        }
      </Text>
      {!error && (
        <TouchableOpacity
          style={styles.createServiceButton}
          onPress={() => navigation.navigate(
            activeTab === 'professional'
              ? isApprovedProfessional
                ? 'ServiceManager'
                : 'BecomeProfessional'
              : 'SearchProfessionalsListing'
          )}
        >
          <Text style={styles.createServiceButtonText}>
            {activeTab === 'professional'
              ? isApprovedProfessional
                ? 'Create Service'
                : 'Become Professional'
              : 'Browse Services'
            }
          </Text>
        </TouchableOpacity>
      )}
      {error && (
        <TouchableOpacity
          style={styles.retryButton}
          onPress={fetchBookings}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <CrossPlatformView fullWidthHeader={true}>
      <BackHeader
        title="My Bookings"
        onBackPress={() => handleBack(navigation)} // Use default 'More' route
      />
      
      <View style={styles.container}>
      {isApprovedProfessional && (
        <View style={styles.tabContainer}>
          <TouchableOpacity
              style={[styles.tab, activeTab === 'professional' && styles.activeTab]}
            onPress={() => setActiveTab('professional')}
          >
              <Text style={[styles.tabText, activeTab === 'professional' && styles.activeTabText]}>
                Professional Bookings
              </Text>
          </TouchableOpacity>
          <TouchableOpacity
              style={[styles.tab, activeTab === 'client' && styles.activeTab]}
            onPress={() => setActiveTab('client')}
          >
              <Text style={[styles.tabText, activeTab === 'client' && styles.activeTabText]}>
                Client Bookings
              </Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.searchContainer}>
          <MaterialCommunityIcons name="magnify" size={24} color={theme.colors.placeholder} />
        <TextInput
          style={styles.searchInput}
            placeholder="Search by Booking ID or Name"
          value={searchQuery}
          onChangeText={handleSearch}
        />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
        ) : bookings.length > 0 ? (
        <FlatList
          data={bookings}
          renderItem={renderBookingCard}
          keyExtractor={item => (item.booking_id || item.id || Math.random().toString()).toString()}
          contentContainerStyle={styles.listContainer}
        />
        ) : (
          <EmptyStateMessage />
      )}
      </View>
    </CrossPlatformView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    maxWidth: Platform.OS === 'web' ? 632 : 600, // 600 + padding for scrollbar
    alignSelf: 'center',
    padding: 16,
    height: Platform.OS === 'web' ? 'calc(100vh - 124px)' : '100%',
    maxHeight: Platform.OS === 'web' ? 'calc(100vh - 124px)' : '100%',
    overflow: Platform.OS === 'web' ? 'auto' : 'scroll',
    backgroundColor: theme.colors.background,
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  tab: {
    flex: 1,
    padding: 12,
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
  },
  activeTab: {
    backgroundColor: theme.colors.primary,
  },
  tabText: {
    color: theme.colors.primary,
    fontWeight: '500',
    fontFamily: theme.fonts.regular.fontFamily,
  },
  activeTabText: {
    color: theme.colors.surface,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
    padding: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  listContainer: {
    paddingBottom: 16,
    paddingHorizontal: Platform.OS === 'web' ? 16 : 0, // Space for scrollbar
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  emptyStateTitle: {
    fontSize: theme.fontSizes.large,
    fontWeight: '600',
    color: theme.colors.text,
    marginTop: 16,
    textAlign: 'center',
    fontFamily: theme.fonts.header.fontFamily,
  },
  emptyStateSubtitle: {
    fontSize: 16,
    color: theme.colors.placeholder,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  createServiceButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  createServiceButtonText: {
    color: theme.colors.surface,
    fontSize: 16,
    fontWeight: '600',
    fontFamily: theme.fonts.regular.fontFamily,
  },
  retryButton: {
    backgroundColor: theme.colors.error,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  retryButtonText: {
    color: theme.colors.surface,
    fontSize: 16,
    fontWeight: '600',
    fontFamily: theme.fonts.regular.fontFamily,
  },
});

export default MyBookings;