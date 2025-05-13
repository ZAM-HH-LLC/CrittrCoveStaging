import React, { useContext, useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Platform, SafeAreaView, Dimensions, StatusBar, TouchableOpacity, Text } from 'react-native';
import { Card, Title, Paragraph, List, Button, useTheme, Appbar, ActivityIndicator, Avatar } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import axios from 'axios';
import { API_BASE_URL } from '../config/config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthContext, debugLog } from '../context/AuthContext';
import { TutorialContext } from '../context/TutorialContext';
import CrossPlatformView from '../components/CrossPlatformView';
import { theme } from '../styles/theme';
import { navigateToFrom } from '../components/Navigation';
import ProfessionalServiceCard from '../components/ProfessionalServiceCard';
import { getProfessionalServices } from '../api/API';
import BookingCard from '../components/BookingCard';
import TutorialModal from '../components/TutorialModal';
import BookingApprovalModal from '../components/BookingApprovalModal';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const Dashboard = ({ navigation }) => {
  const { colors } = useTheme();
  const { signOut, firstName, is_prototype, screenWidth, is_DEBUG, isSignedIn, isCollapsed, userRole } = useContext(AuthContext);
  const { 
    isVisible: isTutorialVisible,
    currentStep,
    totalSteps,
    stepData,
    handleNext,
    handlePrevious,
    handleSkip,
    completeTutorial,
  } = useContext(TutorialContext);
  const [bookings, setBookings] = useState([]);
  const [services, setServices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('upcoming');
  const [onboardingProgress, setOnboardingProgress] = useState({
    profile_complete: 0,
    has_bank_account: false,
    has_services: false,
    subscription_plan: 0
  });

  // Add state for the BookingApprovalModal
  const [bookingModalVisible, setBookingModalVisible] = useState(false);
  const [selectedBookingId, setSelectedBookingId] = useState(null);

  const isLargeScreen = screenWidth > 900;
  const isMobile = screenWidth <= 900;
  const isProfessional = userRole === 'professional';

  // Filter bookings based on active filter
  const filteredBookings = bookings.filter(booking => {
    const now = new Date();
    let bookingDate = null;
    
    // Ensure we have a valid date before parsing
    if (booking.start_date) {
      try {
        bookingDate = new Date(booking.start_date);
        // Check if date is valid
        if (isNaN(bookingDate.getTime())) {
          debugLog("MBA5677: Invalid booking date", booking.start_date);
          return false;
        }
      } catch (error) {
        debugLog("MBA5677: Error parsing booking date", { date: booking.start_date, error });
        return false;
      }
    }
    
    debugLog("MBA5677: Filtering booking", { 
      id: booking.booking_id || booking.id,
      date: booking.start_date || booking.date,
      parsedDate: bookingDate ? bookingDate.toISOString() : null,
      now: now.toISOString(),
      filter: activeFilter
    });
    
    switch (activeFilter) {
      case 'upcoming':
        return bookingDate && bookingDate > now;
      case 'active':
        return bookingDate && bookingDate <= now && !booking.completed;
      case 'past':
        return bookingDate && bookingDate < now && booking.completed;
      default:
        return true;
    }
  });

  // Limit bookings for owner view
  const displayedBookings = !isProfessional ? filteredBookings.slice(0, 3) : filteredBookings;

  // Dynamic styles based on screen size
  const dynamicStyles = {
    welcomeTitle: {
      fontSize: isLargeScreen ? 32 : 24,
      fontWeight: '600',
      color: theme.colors.whiteText,
      fontFamily: theme.fonts.header.fontFamily,
    },
    bookingCount: {
      fontSize: isLargeScreen ? 16 : 14,
      color: theme.colors.whiteText,
      fontFamily: theme.fonts.regular.fontFamily,
      opacity: 0.8,
      marginTop: 12,
    },
    statValue: {
      fontSize: isLargeScreen ? 20 : 16,
      fontWeight: '600',
      color: theme.colors.text,
      fontFamily: theme.fonts.header.fontFamily,
    },
    statLabel: {
      fontSize: isLargeScreen ? 16 : 14,
      color: theme.colors.textSecondary,
      fontFamily: theme.fonts.regular.fontFamily,
      marginTop: 4,
    },
    statChange: {
      fontSize: isLargeScreen ? 14 : 12,
      fontFamily: theme.fonts.regular.fontFamily,
      marginTop: 4,
    },
    sectionTitle: {
      fontSize: isLargeScreen ? 20 : 18,
      fontWeight: '600',
      color: theme.colors.text,
      fontFamily: theme.fonts.header.fontFamily,
      marginBottom: 16,
      marginTop: 24,
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
    { id: '56782', owner: 'John Doe', pet: 'Max (Dog)', date: '2023-05-15', time: '14:00', status: 'upcoming' },
    { id: '5678', owner: 'Jane Smith', pet: 'Whiskers (Cat)', date: '2023-05-17', time: '10:00', status: 'active' },
  ];

  const prototypeServices = [
    {
      service_name: "Dog Walking",
      description: "Professional dog walking service",
      unit_of_time: "30 minutes",
      base_rate: 25,
      additional_animal_rate: 10,
      holiday_rate: 35,
      additional_rates: []
    },
    // Add more prototype services as needed
  ];

  const fetchDashboardData = async () => {
    if (is_prototype) {
      setBookings(prototypeBookings);
      setServices(prototypeServices);
      setOnboardingProgress({
        profile_complete: 0.5,
        has_bank_account: false,
        has_services: true,
        subscription_plan: 0
      });
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      let token = Platform.OS === 'web' ? sessionStorage.getItem('userToken') : await AsyncStorage.getItem('userToken');
      
      // Fetch bookings based on user role
      const endpoint = isProfessional ? 'professionals' : 'clients';
      const response = await axios.get(
        `${API_BASE_URL}/api/${endpoint}/v1/dashboard/`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      debugLog('MBA5677: Dashboard response data', response.data);
      
      // Log the structure of the first booking for debugging
      if (response.data && response.data.upcoming_bookings && response.data.upcoming_bookings.length > 0) {
        const firstBooking = response.data.upcoming_bookings[0];
        debugLog('MBA5677: First booking complete structure', firstBooking);
        
        // Log all the keys in the booking object to see available fields
        debugLog('MBA5677: First booking keys', Object.keys(firstBooking));
        
        // Explicitly check for client_name
        debugLog('MBA5677: First booking client_name field', {
          client_name: firstBooking.client_name,
          owner_name: firstBooking.owner_name,
          client_name_exists: 'client_name' in firstBooking
        });
      }

      // Process the incoming bookings to ensure dates are properly formatted
      const processedBookings = (response.data.upcoming_bookings || []).map(booking => {
        debugLog('MBA5677: Processing booking', booking);
        
        // Make sure we have a valid booking object
        if (!booking) {
          debugLog('MBA5677: Null booking received');
          return null;
        }
        
        // Normalize date format if needed
        let normalizedDate = booking.start_date;
        if (normalizedDate && normalizedDate.includes(' ')) {
          // Handle if the date includes time
          normalizedDate = normalizedDate.split(' ')[0];
        }
        
        // Return a properly formatted booking object with the client_name explicitly mapped
        return {
          ...booking,
          start_date: normalizedDate, // Ensure date is in YYYY-MM-DD format
          client_name: booking.client_name || booking.owner_name // Ensure client_name is set
        };
      }).filter(booking => booking !== null); // Remove any null bookings

      debugLog('MBA5677: Processed bookings', processedBookings);
      setBookings(processedBookings);
      
      setOnboardingProgress(response.data.onboarding_progress || {
        profile_complete: 0,
        has_bank_account: false,
        has_services: false,
        subscription_plan: 0
      });

      // Fetch services if professional
      if (isProfessional) {
        try {
          const servicesData = await getProfessionalServices();
          setServices(servicesData || []);
        } catch (error) {
          console.error('Error fetching professional services:', error);
        }
      }
    } catch (error) {
      if (error.response?.status === 401) {
        const newToken = await refreshToken();
        if (newToken) {
          try {
            // Retry fetching data with new token
            const response = await axios.get(
              `${API_BASE_URL}/api/${isProfessional ? 'professionals' : 'owners'}/v1/dashboard/`,
              { headers: { Authorization: `Bearer ${newToken}` } }
            );
            setBookings(response.data.upcoming_bookings || []);
            setOnboardingProgress(response.data.onboarding_progress || {
              profile_complete: 0,
              has_bank_account: false,
              has_services: false,
              subscription_plan: 0
            });
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
  }, [userRole, is_prototype]);

  // Add useEffect to check for active bookings and select the active tab if there are any
  useEffect(() => {
    if (!isLoading && bookings.length > 0) {
      const now = new Date();
      
      // Check if there are any active bookings (date <= now && !completed)
      const hasActiveBookings = bookings.some(booking => {
        try {
          const bookingDate = booking.start_date ? new Date(booking.start_date) : null;
          return bookingDate && bookingDate <= now && !booking.completed;
        } catch (error) {
          return false;
        }
      });
      
      debugLog("MBA5677: Checking for active bookings", { 
        hasActiveBookings, 
        bookingsCount: bookings.length,
        currentActiveFilter: activeFilter
      });
      
      // If there are active bookings, set the active filter to 'active'
      if (hasActiveBookings && activeFilter !== 'active') {
        debugLog("MBA5677: Setting active filter to 'active' due to active bookings");
        setActiveFilter('active');
      }
    }
  }, [bookings, isLoading]);

  // TODO: Fetch owner requests from the backend
  const ownerRequests = [
    { id: '1', owner: 'Alice Johnson', pet: 'Fluffy (Rabbit)', date: '2023-05-20', time: '09:00' },
    { id: '2', owner: 'Bob Williams', pet: 'Spike (Iguana)', date: '2023-05-22', time: '16:00' },
  ];

  const IconComponent = Platform.OS === 'web'
    ? ({ name, ...props }) => <MaterialCommunityIcons name={name} {...props} />
    : List.Icon;

  const navigateToServiceManager = async () => {
    if (is_DEBUG) {
      console.log('Setting previousRoute to:', 'Dashboard');
      console.log('Setting currentRoute to:', 'ServiceManager');
    }
    setTimeout(async () => {
      await navigateToFrom(navigation, 'ServiceManager', 'Dashboard');
    }, 100);
  };

  const renderHeader = () => {
    if (isMobile) return null;
    
    return (
      <View style={styles.headerContainer}>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.notificationButton}>
            <MaterialCommunityIcons name="bell-outline" size={24} color={theme.colors.text} />
            <View style={styles.notificationBadge}>
              <Text style={styles.notificationCount}>3</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.profileButton}
            onPress={() => navigateToFrom(navigation, 'MyProfile', 'Dashboard')}
          >
            <Avatar.Image 
              size={40} 
              source={require('../../assets/default-profile.png')} 
            />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderWelcomeSection = () => (
    <View style={styles.welcomeSection}>
      <View style={styles.welcomeContent}>
        <View style={styles.welcomeCard}>
          <View style={styles.welcomeHeader}>
            <View style={styles.welcomeTextContainer}>
              <Text style={dynamicStyles.welcomeTitle}>
                Welcome back{firstName ? ', ' + firstName : ''}! 👋
              </Text>
              <Text style={dynamicStyles.bookingCount}>
                You have {bookings.filter(b => !b.completed).length} active bookings and {bookings.filter(b => new Date(b.start_date) > new Date()).length} upcoming appointments today.
              </Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );

  const renderOnboardingProgress = () => (
    <View style={styles.statsContainer}>
      <View style={styles.statsGrid}>
        {isProfessional ? (
          // Professional onboarding cards
          <>
            <TouchableOpacity 
              style={styles.statCard}
              onPress={() => navigateToFrom(navigation, 'MyProfile', 'Dashboard', { initialTab: 'profile_info' })}
            >
              <View style={styles.statHeader}>
                <View style={[styles.statIconContainer, { backgroundColor: '#F0F9E5' }]}>
                  <MaterialCommunityIcons name="account-check" size={24} color={theme.colors.primary} />
                </View>
                <Text style={[dynamicStyles.statChange, { color: onboardingProgress.profile_complete === 1 ? theme.colors.success : theme.colors.warning }]}>
                  {Math.round(onboardingProgress.profile_complete * 100)}% Complete
                </Text>
              </View>
              <Text style={dynamicStyles.statValue}>Profile</Text>
              <Text style={dynamicStyles.statLabel}>Complete your profile to get started</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.statCard}
              onPress={() => navigateToFrom(navigation, 'MyProfile', 'Dashboard', { initialTab: 'settings_payments' })}
            >
              <View style={styles.statHeader}>
                <View style={[styles.statIconContainer, { backgroundColor: '#E7F3F8' }]}>
                  <MaterialCommunityIcons name="bank" size={24} color={theme.colors.primary} />
                </View>
                <Text style={[dynamicStyles.statChange, { color: onboardingProgress.has_bank_account ? theme.colors.success : theme.colors.warning }]}>
                  {onboardingProgress.has_bank_account ? 'Connected' : 'Not Connected'}
                </Text>
              </View>
              <Text style={dynamicStyles.statValue}>Bank Account</Text>
              <Text style={dynamicStyles.statLabel}>Connect your bank to receive payments</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.statCard}
              onPress={() => navigateToFrom(navigation, 'ServiceManager', 'Dashboard')}
            >
              <View style={styles.statHeader}>
                <View style={[styles.statIconContainer, { backgroundColor: '#FEF0DA' }]}>
                  <MaterialCommunityIcons name="briefcase" size={24} color={theme.colors.primary} />
                </View>
                <Text style={[dynamicStyles.statChange, { color: onboardingProgress.has_services ? theme.colors.success : theme.colors.warning }]}>
                  {onboardingProgress.has_services ? 'Active' : 'No Services'}
                </Text>
              </View>
              <Text style={dynamicStyles.statValue}>Services</Text>
              <Text style={dynamicStyles.statLabel}>Add services to start accepting bookings</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.statCard}
              onPress={() => navigateToFrom(navigation, 'MyProfile', 'Dashboard', { initialTab: 'settings_payments' })}
            >
              <View style={styles.statHeader}>
                <View style={[styles.statIconContainer, { backgroundColor: '#E1E2DB' }]}>
                  <MaterialCommunityIcons name="star" size={24} color={theme.colors.primary} />
                </View>
                <Text style={[dynamicStyles.statChange, { color: onboardingProgress.subscription_plan > 0 ? theme.colors.success : theme.colors.warning }]}>
                  {onboardingProgress.subscription_plan === 0 ? 'Free Tier' : 'Premium'}
                </Text>
              </View>
              <Text style={dynamicStyles.statValue}>Subscription</Text>
              <Text style={dynamicStyles.statLabel}>Upgrade for more features</Text>
            </TouchableOpacity>
          </>
        ) : (
          // Owner onboarding cards
          <>
            <TouchableOpacity 
              style={styles.statCard}
              onPress={() => navigateToFrom(navigation, 'MyProfile', 'Dashboard', { initialTab: 'profile_info' })}
            >
              <View style={styles.statHeader}>
                <View style={[styles.statIconContainer, { backgroundColor: '#F0F9E5' }]}>
                  <MaterialCommunityIcons name="account-check" size={24} color={theme.colors.primary} />
                </View>
                <Text style={[dynamicStyles.statChange, { color: onboardingProgress.profile_complete === 1 ? theme.colors.success : theme.colors.warning }]}>
                  {Math.round(onboardingProgress.profile_complete * 100)}% Complete
                </Text>
              </View>
              <Text style={dynamicStyles.statValue}>Profile</Text>
              <Text style={dynamicStyles.statLabel}>Complete your profile to get started</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.statCard}
              onPress={() => navigateToFrom(navigation, 'MyProfile', 'Dashboard', { initialTab: 'settings_payments' })}
            >
              <View style={styles.statHeader}>
                <View style={[styles.statIconContainer, { backgroundColor: '#E7F3F8' }]}>
                  <MaterialCommunityIcons name="credit-card" size={24} color={theme.colors.primary} />
                </View>
                <Text style={[dynamicStyles.statChange, { color: onboardingProgress.has_payment_method ? theme.colors.success : theme.colors.warning }]}>
                  {onboardingProgress.has_payment_method ? 'Connected' : 'Not Connected'}
                </Text>
              </View>
              <Text style={dynamicStyles.statValue}>Payment Method</Text>
              <Text style={dynamicStyles.statLabel}>Add a payment method to book services</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.statCard}
              onPress={() => navigateToFrom(navigation, 'MyProfile', 'Dashboard', { initialTab: 'pets_preferences' })}
            >
              <View style={styles.statHeader}>
                <View style={[styles.statIconContainer, { backgroundColor: '#FEF0DA' }]}>
                  <MaterialCommunityIcons name="paw" size={24} color={theme.colors.primary} />
                </View>
                <Text style={[dynamicStyles.statChange, { color: onboardingProgress.has_pets ? theme.colors.success : theme.colors.warning }]}>
                  {onboardingProgress.has_pets ? 'Added' : 'No Pets'}
                </Text>
              </View>
              <Text style={dynamicStyles.statValue}>Pets</Text>
              <Text style={dynamicStyles.statLabel}>Add your pets to book services</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.statCard}
              onPress={() => navigateToFrom(navigation, 'MyProfile', 'Dashboard', { initialTab: 'settings_payments' })}
            >
              <View style={styles.statHeader}>
                <View style={[styles.statIconContainer, { backgroundColor: '#E1E2DB' }]}>
                  <MaterialCommunityIcons name="star" size={24} color={theme.colors.primary} />
                </View>
                <Text style={[dynamicStyles.statChange, { color: onboardingProgress.subscription_plan > 0 ? theme.colors.success : theme.colors.warning }]}>
                  {onboardingProgress.subscription_plan === 0 ? 'Free Tier' : 'Premium'}
                </Text>
              </View>
              <Text style={dynamicStyles.statValue}>Subscription</Text>
              <Text style={dynamicStyles.statLabel}>Upgrade for more features</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );

  const renderBookingFilters = () => (
    <View style={styles.filterContainer}>
      <View style={styles.filterButtons}>
        {['upcoming', 'active'].map((filter) => (
          <TouchableOpacity
            key={filter}
            style={[
              styles.filterButton,
              activeFilter === filter && styles.activeFilterButton
            ]}
            onPress={() => setActiveFilter(filter)}
          >
            <Text style={[
              styles.filterText,
              activeFilter === filter && styles.activeFilterText
            ]}>
              {filter.charAt(0).toUpperCase() + filter.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {/* TODO: UNCOMMONT THIS SECTION after mvp launch and implementation of mybookings screen
      <TouchableOpacity
        style={styles.viewAllButton}
        onPress={() => navigateToFrom(navigation, 'MyBookings', 'Dashboard')}
      >
        <Text style={styles.viewAllText}>View All</Text>
        <MaterialCommunityIcons name="chevron-right" size={20} color={theme.colors.primary} />
      </TouchableOpacity> */}
    </View>
  );

  // Handle opening the booking modal
  const handleViewBookingDetails = (bookingId) => {
    setSelectedBookingId(bookingId);
    setBookingModalVisible(true);
    debugLog("MBA5677: Opening booking modal for ID:", bookingId);
  };

  // Handle closing the booking modal
  const handleCloseBookingModal = () => {
    setBookingModalVisible(false);
    setSelectedBookingId(null);
  };

  const renderBookings = () => (
    <View style={styles.bookingsContainer}>
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      ) : filteredBookings.length > 0 ? (
        filteredBookings.map((booking) => {
          debugLog('MBA5677: Rendering booking', { 
            id: is_prototype ? booking.id : booking.booking_id,
            date: is_prototype ? booking.date : booking.start_date,
            time: is_prototype ? booking.time : booking.start_time,
            client_name: is_prototype ? booking.owner : booking.client_name,
            professional_name: is_prototype ? booking.professional : booking.professional_name,
            status: is_prototype ? booking.status : booking.status
          });
          
          const bookingId = is_prototype ? booking.id : booking.booking_id;
          
          // Set name based on user role
          let name;
          if (isProfessional) {
            name = is_prototype ? booking.owner : (booking.client_name || booking.owner_name || 'Client');
            debugLog('MBA5677: Using client name', name);
          } else {
            name = is_prototype ? booking.professional : (booking.professional_name || 'Professional');
            debugLog('MBA5677: Using professional name', name);
          }
          
          return (
            <BookingCard
              key={bookingId}
              booking={{
                id: bookingId,
                client_name: isProfessional ? name : null,
                professional_name: !isProfessional ? name : null,
                serviceName: is_prototype ? booking.service : booking.service_type,
                date: is_prototype ? booking.date : booking.start_date,
                time: is_prototype ? booking.time : booking.start_time,
                status: is_prototype ? booking.status : booking.status,
                pets: is_prototype ? [{ name: booking.pet }] : booking.pets
              }}
              type={isProfessional ? "professional" : "client"}
              onViewDetails={() => handleViewBookingDetails(bookingId)}
            />
          );
        })
      ) : (
        <View style={styles.emptyStateContainer}>
          <MaterialCommunityIcons name="calendar" size={48} color={theme.colors.textSecondary} />
          <Text style={styles.emptyStateTitle}>No {activeFilter} bookings</Text>
          <Text style={styles.emptyStateText}>
            {isProfessional 
              ? 'Create services to start receiving bookings from owners.'
              : 'Find professional services to book your first appointment.'}
          </Text>
          <TouchableOpacity
            style={styles.createServiceButton}
            onPress={() => navigateToFrom(navigation, 
              isProfessional ? 'ServiceManager' : 'SearchProfessionals', 
              'Dashboard'
            )}
          >
            <MaterialCommunityIcons 
              name={isProfessional ? "plus" : "magnify"} 
              size={20} 
              color={theme.colors.surface} 
            />
            <Text style={styles.createServiceButtonText}>
              {isProfessional ? 'Create Service' : 'Find Professionals'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const renderServiceCard = (service) => (
    <View style={styles.serviceCard} key={service.id}>
      <View style={styles.serviceContent}>
        <View style={styles.serviceHeader}>
          <Text 
            style={styles.serviceTitle}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {service.service_name}
          </Text>
          <Text style={styles.serviceRate}>${service.base_rate} {service.unit_of_time || 'Per Visit'}</Text>
        </View>
        <Text style={styles.serviceCategory}>{service.category || 'Exotic'}</Text>
      </View>
      <View style={styles.serviceFooter}>
        {/* TODO: Implement this section after mvp */}
        {/* <View style={styles.bookingsCount}>
          <MaterialCommunityIcons name="calendar" size={16} color={theme.colors.textSecondary} />
          <Text style={styles.bookingsText}>{service.booking_count || 8} bookings</Text>
        </View> */}
        <TouchableOpacity 
          style={styles.viewButton}
          onPress={() => navigateToFrom(navigation, 'ServiceManager', 'Dashboard', { serviceId: service.id })}
        >
          <Text style={styles.viewButtonText}>View</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderServices = () => {
    if (!isProfessional) return null;

    return (
      <View style={styles.servicesContainer}>
        <View style={styles.sectionHeader}>
          <Text style={dynamicStyles.sectionTitle}>My Services</Text>
          <TouchableOpacity
            style={styles.viewAllButton}
            onPress={() => navigateToFrom(navigation, 'ServiceManager', 'Dashboard')}
          >
            <Text style={styles.viewAllText}>View All</Text>
            <MaterialCommunityIcons name="chevron-right" size={20} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>
        <View style={styles.servicesGrid}>
          {services.map(service => renderServiceCard(service))}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.mainContainer}>
      <ScrollView 
        style={[
          styles.scrollView,
          {
            marginLeft: !isMobile && isSignedIn ? (isCollapsed ? 70 : 250) : 0,
            marginTop: isMobile ? 60 : 0,
          }
        ]}
        contentContainerStyle={[
          styles.scrollViewContent,
          {
            maxWidth: 1200,
            marginHorizontal: 'auto',
            paddingTop: isMobile ? 24 : 0,
          }
        ]}
      >
        {renderHeader()}
        {renderWelcomeSection()}
        {renderOnboardingProgress()}
        {renderBookingFilters()}
        {renderBookings()}
        {renderServices()}
      </ScrollView>
      
      {/* Custom BookingApprovalModal with modified title */}
      <BookingApprovalModal
        visible={bookingModalVisible}
        onClose={handleCloseBookingModal}
        bookingId={selectedBookingId}
        isProfessional={isProfessional}
        modalTitle="Review Details" // Custom title for dashboard view
        hideButtons={true} // Hide action buttons when viewed from dashboard
      />
      
      {isTutorialVisible && stepData?.screen === 'Dashboard' && (
        <TutorialModal
          step={currentStep}
          totalSteps={totalSteps}
          title={stepData.title}
          description={stepData.description}
          position={stepData.position}
          onNext={() => handleNext(navigation)}
          onPrevious={handlePrevious}
          onSkip={handleSkip}
          onClose={completeTutorial}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    height: '100vh',
    backgroundColor: '#f5f5f5',
    position: 'fixed',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    overflow: 'hidden',
  },
  scrollView: {
    flex: 1,
    height: '100%',
    overflow: 'auto',
  },
  scrollViewContent: {
    width: '100%',
    paddingBottom: 40,
  },
  headerContainer: {
    padding: 24,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 24 : 24,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
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
  welcomeSection: {
    padding: 24,
    paddingTop: 0,
  },
  welcomeContent: {
    maxWidth: 1200,
    marginHorizontal: 'auto',
    width: '100%',
  },
  welcomeCard: {
    backgroundColor: 'transparent',
    backgroundImage: 'linear-gradient(to right, #6B6C53, #86C5D9)',
    borderRadius: 12,
    padding: 24,
    marginBottom: 24,
  },
  welcomeHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  welcomeTextContainer: {
    flex: 1,
    minWidth: 280,
  },
  statsContainer: {
    padding: 24,
    paddingTop: 0,
    backgroundColor: '#f5f5f5',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
    gap: 24,
    maxWidth: 1200,
    marginHorizontal: 'auto',
    width: '100%',
  },
  statCard: {
    backgroundColor: theme.colors.surface,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    ...Platform.select({
      ios: {
        activeOpacity: 0.7,
      },
      android: {
        android_ripple: {
          color: 'rgba(0, 0, 0, 0.1)',
        },
      },
    }),
  },
  statHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bookingsContainer: {
    padding: 24,
    paddingTop: 0,
    backgroundColor: '#f5f5f5',
    maxWidth: 1200,
    marginHorizontal: 'auto',
    width: '100%',
  },
  bookingItem: {
    marginBottom: 16,
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  bookingContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bookingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  bookingDetails: {
    marginLeft: 12,
  },
  bookingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4,
  },
  bookingTime: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  bookingStatus: {
    alignItems: 'flex-end',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  progressBar: {
    width: 100,
    height: 4,
    backgroundColor: theme.colors.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progress: {
    height: '100%',
    backgroundColor: theme.colors.primary,
  },
  timeLeft: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  emptyStateContainer: {
    padding: 40,
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
    marginBottom: 24,
  },
  emptyStateTitle: {
    fontSize: theme.fontSizes.large,
    color: theme.colors.text,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
    fontFamily: theme.fonts.header.fontFamily,
  },
  emptyStateText: {
    fontSize: theme.fontSizes.medium,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    fontFamily: theme.fonts.regular.fontFamily,
    marginBottom: 24,
  },
  createServiceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6B6C53',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    gap: 8,
  },
  createServiceButtonText: {
    color: theme.colors.surface,
    fontSize: 16,
    fontWeight: '600',
    fontFamily: theme.fonts.regular.fontFamily,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderRadius: 30,
    // marginHorizontal: 24,
  },
  filterButtons: {
    flexDirection: 'row',
    backgroundColor: 'rgb(238, 241, 245)', //rgb(227, 229, 232)
    padding: 4,
    borderRadius: 5,
    // gap: 4,
  },
  filterButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
  },
  activeFilterButton: {
    backgroundColor: theme.colors.surface,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  filterText: {
    color: '#6B7280',
    fontSize: 16,
    fontFamily: theme.fonts.regular.fontFamily,
    fontWeight: '500',
  },
  activeFilterText: {
    color: '#111827',
    fontWeight: '600',
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingRight: 12,
  },
  viewAllText: {
    color: theme.colors.primary,
    fontSize: 16,
    fontFamily: theme.fonts.regular.fontFamily,
    fontWeight: '500',
  },
  servicesContainer: {
    padding: 24,
    paddingTop: 0,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  servicesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: 16,
  },
  serviceCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    justifyContent: 'space-between',
  },
  serviceContent: {
    marginBottom: 20,
  },
  serviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  serviceTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    fontFamily: theme.fonts.header.fontFamily,
    maxWidth: '50%',
  },
  serviceCategory: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  serviceFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bookingsCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  bookingsText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  serviceRate: {
    fontSize: 16,
    color: '#6B6C53',
    fontWeight: '600',
    fontFamily: theme.fonts.regular.fontFamily,
  },
  viewButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    backgroundColor: theme.colors.surface,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  viewButtonText: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '500',
    fontFamily: theme.fonts.regular.fontFamily,
  },
});

export default Dashboard;
