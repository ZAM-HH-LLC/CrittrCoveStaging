import React, { useState, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, TouchableOpacity, ActivityIndicator, Platform, Dimensions, ScrollView } from 'react-native';
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
import { supportsHover } from '../utils/deviceUtils';

const MyBookings = () => {
  const navigation = useNavigation();
  const { isApprovedProfessional, userRole, is_DEBUG, isCollapsed, screenWidth } = useContext(AuthContext);
  const [isMobile, setIsMobile] = useState(screenWidth < 900);
  const [isWideScreen, setIsWideScreen] = useState(screenWidth >= 1200);
  const [activeTab, setActiveTab] = useState(userRole === 'professional' ? 'professional' : 'owner');
  const [searchQuery, setSearchQuery] = useState('');
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  const [hoveredFilter, setHoveredFilter] = useState(null);
  
  // Check if device supports hover
  const deviceSupportsHover = supportsHover();

  useEffect(() => {
    const updateLayout = () => {
      setIsMobile(Dimensions.get('window').width < 900);
      setIsWideScreen(Dimensions.get('window').width >= 1200);
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

  const fetchBookings = async (pageNum = 1, isLoadMore = false) => {
    if (isLoadMore) {
      setIsLoadingMore(true);
    } else {
      setLoading(true);
      setError(null);
    }

    try {
      let token = Platform.OS === 'web' ? sessionStorage.getItem('userToken') : await AsyncStorage.getItem('userToken');
      if (!token) {
        throw new Error('No authentication token found');
      }

      if (is_DEBUG) {
        console.log('MBA1234 Fetching bookings:', {
          isApprovedProfessional,
          userRole,
          activeTab,
          page: pageNum,
          status: activeFilter
        });
      }

      const response = await axios.get(
        `${API_BASE_URL}/api/bookings/v1/`,
        { 
          headers: { Authorization: `Bearer ${token}` },
          params: {
            page: pageNum,
            page_size: 20,
            status: activeFilter
          }
        }
      );

      const newBookings = activeTab === 'professional' 
        ? response.data.bookings.professional_bookings || []
        : response.data.bookings.owner_bookings || [];

      if (isLoadMore) {
        setBookings(prev => [...prev, ...newBookings]);
      } else {
        setBookings(newBookings);
      }

      setHasMore(newBookings.length === 20);
      setPage(pageNum);
    } catch (error) {
      console.error('Error fetching bookings:', error);
      setError('Failed to fetch bookings');
    } finally {
      setLoading(false);
      setIsLoadingMore(false);
    }
  };

  // Fetch bookings when component mounts or when dependencies change
  useEffect(() => {
    if (is_DEBUG) {
      console.log('MBA1234 Fetching bookings due to dependency change:', {
        activeTab,
        userRole,
        isApprovedProfessional,
        activeFilter
      });
    }
    setPage(1);
    setBookings([]);
    fetchBookings(1);
  }, [activeTab, userRole, isApprovedProfessional, activeFilter]);

  // Handle search
  const handleSearch = (query) => {
    setSearchQuery(query);
    
    if (!query.trim()) {
      setPage(1);
      setBookings([]);
      fetchBookings(1);
      return;
    }

    const searchLower = query.toLowerCase();
    const filtered = bookings.filter(booking => {
      if (activeTab === 'professional') {
        return (
          booking.id.toLowerCase().includes(searchLower) ||
          booking.ownerName.toLowerCase().includes(searchLower)
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

  const handleLoadMore = () => {
    if (!isLoadingMore && hasMore) {
      fetchBookings(page + 1, true);
    }
  };

  const handleViewDetails = async (booking) => {
    if (is_DEBUG) {
      console.log('MBA1234 Navigating to booking details:', {
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
    if (is_DEBUG) {
      console.log('MBA1234 Cancel booking:', bookingId);
    }
  };

  const renderBookingCard = ({ item }) => (
    <BookingCard
      booking={{
        id: item.booking_id || item.id,
        ownerName: item.owner_name || item.ownerName,
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
          onPress={() => fetchBookings(1)}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderFooter = () => {
    if (!isLoadingMore) return null;
    return (
      <View style={styles.loadingMoreContainer}>
        <ActivityIndicator size="small" color={theme.colors.primary} />
      </View>
    );
  };

  return (
    <View style={[
      styles.container,
      { marginLeft: isMobile ? 0 : (isCollapsed ? 70 : 250) }
    ]}>
      <View style={[styles.content, { marginTop: isMobile ? 60 : 0 }]}>
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
                  style={[styles.tab, activeTab === 'owner' && styles.activeTab]}
                  onPress={() => setActiveTab('owner')}
                >
                  <Text style={[styles.tabText, activeTab === 'owner' && styles.activeTabText]}>
                    Owner Bookings
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
          <View style={styles.bookingsContent}>
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
              </View>
            ) : bookings.length > 0 ? (
              <View style={styles.bookingsContent}>
                <View style={styles.stickyHeader}>
                  <View style={[styles.stickyHeaderContent, { 
                    flexDirection: isWideScreen ? 'row' : 'column'
                  }]}>
                    <View style={[
                      styles.searchContainer, 
                      isWideScreen ? { flex: 0.4, marginRight: 'auto' } : null
                    ]}>
                      <MaterialCommunityIcons name="magnify" size={24} color={theme.colors.mybookings.searchBar} />
                      <TextInput
                        style={[styles.searchInput, { color: theme.colors.mybookings.searchBar, width: '100%', height: '100%' }]}
                        placeholder="Search by pet name, owner, or date"
                        value={searchQuery}
                        onChangeText={handleSearch}
                        outlineStyle="none"
                      />
                    </View>

                    <View style={[
                      styles.filtersWrapper,
                      isWideScreen ? { flex: 0.6, alignItems: 'flex-end' } : null
                    ]}>
                      <ScrollView 
                        horizontal 
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.filterScrollContent}
                      >
                        <View style={styles.filterContainer}>
                          <TouchableOpacity 
                            style={[
                              styles.filterButton,
                              styles.allButton,
                              deviceSupportsHover && hoveredFilter === 'all' && styles.filterButtonHovered
                            ]}
                            onPress={() => setActiveFilter('all')}
                            onMouseEnter={() => deviceSupportsHover && setHoveredFilter('all')}
                            onMouseLeave={() => deviceSupportsHover && setHoveredFilter(null)}
                          >
                            <View style={styles.filterContent}>
                              <MaterialCommunityIcons 
                                name="filter-variant" 
                                size={16} 
                                color="#0784C6" 
                              />
                              <Text style={[styles.filterText, styles.allButtonText]}>
                                All
                              </Text>
                              {activeFilter === 'all' && (
                                <MaterialCommunityIcons 
                                  name="check" 
                                  size={16} 
                                  color="#0784C6" 
                                  style={styles.checkmark}
                                />
                              )}
                            </View>
                          </TouchableOpacity>
                          <TouchableOpacity 
                            style={[
                              styles.filterButton,
                              styles.pendingButton,
                              deviceSupportsHover && hoveredFilter === 'pending' && styles.filterButtonHovered
                            ]}
                            onPress={() => setActiveFilter('pending')}
                            onMouseEnter={() => deviceSupportsHover && setHoveredFilter('pending')}
                            onMouseLeave={() => deviceSupportsHover && setHoveredFilter(null)}
                          >
                            <View style={styles.filterContent}>
                              <MaterialCommunityIcons 
                                name="clock-outline" 
                                size={16} 
                                color={theme.colors.mybookings.secondary}
                              />
                              <Text style={[styles.filterText, styles.pendingButtonText]}>
                                Pending
                              </Text>
                              {activeFilter === 'pending' && (
                                <MaterialCommunityIcons 
                                  name="check" 
                                  size={16} 
                                  color={theme.colors.mybookings.secondary}
                                  style={styles.checkmark}
                                />
                              )}
                            </View>
                          </TouchableOpacity>
                          <TouchableOpacity 
                            style={[
                              styles.filterButton,
                              styles.confirmedButton,
                              deviceSupportsHover && hoveredFilter === 'confirmed' && styles.filterButtonHovered
                            ]}
                            onPress={() => setActiveFilter('confirmed')}
                            onMouseEnter={() => deviceSupportsHover && setHoveredFilter('confirmed')}
                            onMouseLeave={() => deviceSupportsHover && setHoveredFilter(null)}
                          >
                            <View style={styles.filterContent}>
                              <MaterialCommunityIcons 
                                name="check-circle-outline" 
                                size={16} 
                                color="#898974"
                              />
                              <Text style={[styles.filterText, styles.confirmedButtonText]}>
                                Confirmed
                              </Text>
                              {activeFilter === 'confirmed' && (
                                <MaterialCommunityIcons 
                                  name="check" 
                                  size={16} 
                                  color="#898974"
                                  style={styles.checkmark}
                                />
                              )}
                            </View>
                          </TouchableOpacity>
                          <TouchableOpacity 
                            style={[
                              styles.filterButton,
                              styles.completedButton,
                              deviceSupportsHover && hoveredFilter === 'completed' && styles.filterButtonHovered
                            ]}
                            onPress={() => setActiveFilter('completed')}
                            onMouseEnter={() => deviceSupportsHover && setHoveredFilter('completed')}
                            onMouseLeave={() => deviceSupportsHover && setHoveredFilter(null)}
                          >
                            <View style={styles.filterContent}>
                              <MaterialCommunityIcons 
                                name="flag-checkered" 
                                size={16} 
                                color={theme.colors.mybookings.completedText}
                              />
                              <Text style={[styles.filterText, styles.completedButtonText]}>
                                Completed
                              </Text>
                              {activeFilter === 'completed' && (
                                <MaterialCommunityIcons 
                                  name="check" 
                                  size={16} 
                                  color={theme.colors.mybookings.completedText}
                                  style={styles.checkmark}
                                />
                              )}
                            </View>
                          </TouchableOpacity>
                        </View>
                      </ScrollView>
                    </View>
                  </View>
                </View>

                <FlatList
                  data={bookings}
                  renderItem={renderBookingCard}
                  keyExtractor={item => (item.booking_id || item.id || Math.random().toString()).toString()}
                  contentContainerStyle={styles.listContainer}
                  onEndReached={handleLoadMore}
                  onEndReachedThreshold={0.5}
                  ListFooterComponent={renderFooter}
                  ListHeaderComponent={<View style={[styles.listHeaderSpacing, { height: isWideScreen ? 130 : 190 }]} />}
                />
              </View>
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
  },
  mainContent: {
    flex: 1,
    width: '100%',
    alignSelf: 'center',
    backgroundColor: theme.colors.background,
  },
  headerSection: {
    width: '100%',
    backgroundColor: theme.colors.surfaceContrast,
    paddingHorizontal: 24,
    paddingTop: 24,
    zIndex: 2,
  },
  bookingsContent: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    position: 'relative',
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
    gap: 32,
  },
  tab: {
    paddingBottom: 8,
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
  stickyHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: theme.colors.surfaceContrast,
    zIndex: 2,
    marginHorizontal: 24,
    marginTop: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderRadius: 8,
    padding: 16,
  },
  stickyHeaderContent: {
    width: '100%',
    gap: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceContrast,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#CCCBC9', // #CCCBC9
  },
  filterScrollContent: {
    flexGrow: 0,
  },
  filtersWrapper: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginRight: -16,
  },
  filterContainer: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: theme.colors.surfaceContrast,
    paddingVertical: 8,
    paddingLeft: 4,
    paddingRight: 16,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    justifyContent: 'center',
    ...(Platform.OS === 'web' && {
      transition: 'all 0.2s ease-in-out',
      cursor: 'pointer',
    })
  },
  filterButtonHovered: {
    transform: [{ scale: 1.05 }],
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  filterContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  checkmark: {
    marginLeft: 4,
  },
  allButton: {
    backgroundColor: '#EFF9FF', // #EFF9FF
  },
  allButtonText: {
    color: '#0784C6', // #0784C6
  },
  pendingButton: {
    backgroundColor: theme.colors.mybookings.main,
  },
  pendingButtonText: {
    color: theme.colors.mybookings.secondary,
  },
  confirmedButton: {
    backgroundColor: '#E8E9E2', // #E8E9E2
  },
  confirmedButtonText: {
    color: '#898974', // #898974
  },
  completedButton: {
    backgroundColor: '#F5F5F4', // #F5F5F4
  },
  completedButtonText: {
    color: theme.colors.mybookings.completedText,
  },
  filterText: {
    fontSize: 14,
    fontFamily: theme.fonts.regular.fontFamily,
    textAlign: 'center',
  },
  listHeaderSpacing: {
    paddingTop: 16,
  },
  listContainer: {
    paddingHorizontal: 24,
    paddingBottom: 34,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingMoreContainer: {
    paddingVertical: 16,
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
  searchInput: {
    outlineStyle: 'none',
    outlineWidth: 0,
    outline: 'none',
    marginLeft: 8,
  },
});

export default MyBookings;