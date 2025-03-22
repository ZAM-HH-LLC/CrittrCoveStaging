import React, { useState, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, TouchableOpacity, ActivityIndicator, Platform, Dimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../styles/theme';
import BackHeader from '../components/BackHeader';
import BookingCard from '../components/BookingCard';
import { AuthContext } from '../context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { handleBack, navigateToFrom } from '../components/Navigation';
import { API_BASE_URL } from '../config/config';

const MyBookings = () => {
  const navigation = useNavigation();
  const { isApprovedProfessional, userRole, is_DEBUG, isCollapsed } = useContext(AuthContext);
  const [isMobile, setIsMobile] = useState(Dimensions.get('window').width < 900);
  const [activeTab, setActiveTab] = useState(userRole === 'professional' ? 'professional' : 'client');
  const [searchQuery, setSearchQuery] = useState('');
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const updateLayout = () => {
      setIsMobile(Dimensions.get('window').width < 900);
    };

    const subscription = Dimensions.addEventListener('change', updateLayout);
    return () => {
      subscription?.remove();
    };
  }, []);

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
        isApprovedProfessional
      });
    }
    fetchBookings();
  }, [activeTab, userRole, isApprovedProfessional]);

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
    <View style={[
      styles.container,
      { marginLeft: isMobile ? 0 : (isCollapsed ? 70 : 250) }
    ]}>
      {isMobile && (
        <BackHeader
          title="My Bookings"
          onBackPress={() => handleBack(navigation)}
        />
      )}
      <View style={[styles.content, { marginTop: isMobile ? 20 : 0 }]}>
        <View style={styles.mainContent}>
          <View style={styles.headerSection}>
            <Text style={styles.title}>My Bookings</Text>
            {isApprovedProfessional && (
              <View style={styles.tabContainer}>
                <TouchableOpacity
                  style={[styles.tab, activeTab === 'professional' && styles.activeTab]}
                  onPress={() => setActiveTab('professional')}
                >
                  <Text style={[styles.tabText, activeTab === 'professional' && styles.activeTabText]}>
                    Your Bookings
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
          </View>
          <View style={styles.bookingsContent}>
            <View style={styles.searchContainer}>
              <MaterialCommunityIcons name="magnify" size={24} color={theme.colors.placeholder} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search by pet name, owner, or date"
                value={searchQuery}
                onChangeText={handleSearch}
              />
            </View>

            <View style={styles.filterContainer}>
              <TouchableOpacity 
                style={[styles.filterButton, styles.activeFilterButton]}
              >
                <Text style={[styles.filterText, styles.activeFilterText]}>Pending</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.filterButton}>
                <Text style={styles.filterText}>Confirmed</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.filterButton}>
                <Text style={styles.filterText}>In Progress</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.filterButton}>
                <Text style={styles.filterText}>Completed</Text>
              </TouchableOpacity>
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
        </View>
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
    // padding: 16,
  },
  mainContent: {
    flex: 1,
    width: '100%',
    // maxWidth: 632,
    alignSelf: 'center',
    backgroundColor: theme.colors.background,
  },
  headerSection: {
    width: '100%',
    backgroundColor: theme.colors.surfaceContrast,
    padding: 24,
  },
  bookingsContent: {
    padding: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 24,
    fontFamily: theme.fonts.header.fontFamily,
  },
  tabContainer: {
    flexDirection: 'row',
    gap: 32, // More space between tabs
  },
  tab: {
    paddingBottom: 8, // Space for the underline
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: theme.colors.primary,
  },
  tabText: {
    fontSize: 16,
    color: theme.colors.text,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  activeTabText: {
    color: theme.colors.primary,
    fontWeight: '500',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
    padding: 12,
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
  filterContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: theme.colors.surface,
  },
  activeFilterButton: {
    backgroundColor: theme.colors.mybookings.main,
  },
  filterText: {
    fontSize: 14,
    color: theme.colors.text,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  activeFilterText: {
    color: theme.colors.mybookings.secondary,
    fontWeight: '500',
  },
  listContainer: {
    paddingBottom: 16,
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