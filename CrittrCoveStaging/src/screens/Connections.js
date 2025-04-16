import React, { useState, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, TouchableOpacity, ActivityIndicator, Platform, Dimensions, ScrollView, Modal } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../styles/theme';
import ConnectionCard from '../components/ConnectionCard';
import { AuthContext, debugLog } from '../context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { navigateToFrom } from '../components/Navigation';
import { getUserConnections, inviteClient } from '../api/API';

const Connections = () => {
  const navigation = useNavigation();
  const { isApprovedProfessional, userRole, isCollapsed, screenWidth } = useContext(AuthContext);
  const [isMobile, setIsMobile] = useState(screenWidth < 900);
  const [isWideScreen, setIsWideScreen] = useState(screenWidth >= 1200);
  const [activeTab, setActiveTab] = useState('clients');
  const [searchQuery, setSearchQuery] = useState('');
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  const [hoveredFilter, setHoveredFilter] = useState(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [isInviting, setIsInviting] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);

  // Update layout based on screen size
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

  // Set the initial tab based on role
  useEffect(() => {
    if (userRole === 'professional') {
      setActiveTab('clients');
    } else {
      setActiveTab('professionals');
    }
  }, [userRole]);

  const fetchConnections = async (pageNum = 1, isLoadMore = false) => {
    if (isLoadingMore) {
      setIsLoadingMore(true);
    } else {
      setLoading(true);
      setError(null);
    }

    try {
      const response = await getUserConnections(activeTab, activeFilter, pageNum, 20);
      
      debugLog('MBA4321 Response from API:', response);

      const connectionsList = response.connections || [];
      
      if (isLoadMore) {
        setConnections(prev => [...prev, ...connectionsList]);
      } else {
        setConnections(connectionsList);
      }

      setHasMore(connectionsList.length === 20);
      setPage(pageNum);
    } catch (error) {
      debugLog('MBA4321 Error fetching connections:', error);
      setError('Failed to fetch connections');
    } finally {
      setLoading(false);
      setIsLoadingMore(false);
    }
  };

  // Fetch connections when component mounts or when dependencies change
  useEffect(() => {
    debugLog('MBA4321 Fetching connections due to dependency change:', {
      activeTab,
      userRole,
      activeFilter
    });
    setPage(1);
    setConnections([]);
    fetchConnections(1);
  }, [activeTab, userRole, activeFilter]);

  // Handle search
  const handleSearch = (query) => {
    setSearchQuery(query);
    
    if (!query.trim()) {
      setPage(1);
      setConnections([]);
      fetchConnections(1);
      return;
    }

    const searchLower = query.toLowerCase();
    const filtered = connections.filter(connection => 
      connection.name.toLowerCase().includes(searchLower) || 
      connection.email.toLowerCase().includes(searchLower) ||
      (activeTab === 'clients' && connection.pets?.some(pet => 
        pet.name.toLowerCase().includes(searchLower) || 
        pet.type.toLowerCase().includes(searchLower)
      )) ||
      (activeTab === 'professionals' && connection.services?.some(service => 
        service.toLowerCase().includes(searchLower)
      ))
    );

    setConnections(filtered);
  };

  const handleLoadMore = () => {
    if (!isLoadingMore && hasMore) {
      fetchConnections(page + 1, true);
    }
  };

  const handleViewProfile = async (connection) => {
    debugLog('MBA4321 Navigating to profile:', {
      connectionId: connection.id,
      connectionName: connection.name
    });
    
    // Navigate to the appropriate profile page based on the connection type
    const targetScreen = activeTab === 'clients' ? 'OwnerProfile' : 'ProfessionalProfile';
    await navigateToFrom(navigation, targetScreen, 'Connections', {
      userId: connection.id
    });
  };

  const handleCreateBooking = async (connection) => {
    debugLog('MBA4321 Creating booking with client:', {
      clientId: connection.id,
      clientName: connection.name
    });
    
    // Navigate to the booking creation screen with the client info
    await navigateToFrom(navigation, 'BookingDetails', 'Connections', {
      clientId: connection.id,
      clientName: connection.name,
      clientEmail: connection.email,
      pets: connection.pets,
      mode: 'create'
    });
  };

  const handleInviteClient = () => {
    debugLog('MBA4321 Opening invite client modal');
    setInviteEmail('');
    setShowInviteModal(true);
  };
  
  const handleSendInvite = async () => {
    if (!inviteEmail || !inviteEmail.includes('@')) {
      debugLog('MBA4321 Invalid email format:', inviteEmail);
      return;
    }
    
    setIsInviting(true);
    debugLog('MBA4321 Sending invite to:', inviteEmail);
    
    try {
      const response = await inviteClient(inviteEmail);
      debugLog('MBA4321 Invite sent successfully:', response);
      setShowInviteModal(false);
      // Refresh the connections list to show the new invited client
      fetchConnections(1);
    } catch (error) {
      debugLog('MBA4321 Error sending invite:', error);
    } finally {
      setIsInviting(false);
    }
  };

  const EmptyStateMessage = ({ type }) => {
    const messages = {
      clients: {
        all: "You don't have any clients yet. Invite a client to get started!",
        active: "You don't have any active clients.",
        pending: "You don't have any pending client requests.",
        past: "You don't have any past clients."
      },
      professionals: {
        all: "You're not connected with any professionals yet.",
        active: "You don't have any active professionals.",
        pending: "You don't have any pending professional connections.",
        past: "You don't have any past professional connections."
      }
    };

    return (
      <View style={styles.emptyContainer}>
        <MaterialCommunityIcons 
          name={type === 'clients' ? 'account-group-outline' : 'account-tie-outline'} 
          size={80} 
          color={theme.colors.primary} 
        />
        <Text style={styles.emptyText}>{messages[type][activeFilter]}</Text>
        {type === 'clients' && userRole === 'professional' && (
          <TouchableOpacity 
            style={styles.inviteButton}
            onPress={handleInviteClient}
          >
            <Text style={styles.inviteButtonText}>Invite Client</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderFooter = () => {
    if (isLoadingMore) {
      debugLog('MBA4321 Loading more connections');
      return (
        <View style={styles.footer}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
        </View>
      );
    }
    
    if (!hasMore && connections.length > 0) {
      debugLog('MBA4321 No more connections to load');
      return (
        <View style={styles.footer}>
          <Text style={styles.footerText}>No more {activeTab} to load</Text>
          {userRole === 'professional' && activeTab === 'clients' && (
            <TouchableOpacity 
              style={styles.createServiceButton}
              onPress={() => {
                debugLog('MBA4321 Create Service button clicked in footer');
                navigateToFrom(navigation, 'ServiceManager', 'Connections');
              }}
            >
              <Text style={styles.createServiceButtonText}>Create a Service to Get More Clients</Text>
            </TouchableOpacity>
          )}
        </View>
      );
    }
    
    return null;
  };

  const renderItem = ({ item }) => {
    debugLog('MBA4321 Rendering connection item:', item);
    return (
      <View style={[
        styles.cardWrapper,
        isMobile && styles.mobileCardWrapper,
        isWideScreen && styles.wideScreenCardWrapper
      ]}>
        <ConnectionCard
          connection={item}
          type={activeTab}
          onViewProfile={() => handleViewProfile(item)}
          onCreateBooking={activeTab === 'clients' ? () => handleCreateBooking(item) : null}
        />
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
            <Text style={styles.title}>Connections</Text>
            <View style={styles.tabContainer}>
              {userRole === 'professional' && (
                <TouchableOpacity
                  style={[styles.tab, activeTab === 'clients' && styles.activeTab]}
                  onPress={() => setActiveTab('clients')}
                >
                  <Text style={[styles.tabText, activeTab === 'clients' && styles.activeTabText]}>
                    My Clients
                  </Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.tab, activeTab === 'professionals' && styles.activeTab]}
                onPress={() => setActiveTab('professionals')}
              >
                <Text style={[styles.tabText, activeTab === 'professionals' && styles.activeTabText]}>
                  My Professionals
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.connectionsContent}>
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
              </View>
            ) : connections.length > 0 ? (
              <View style={styles.connectionsContent}>
                <View style={styles.stickyHeader}>
                  <View style={[styles.stickyHeaderContent, { 
                    flexDirection: isWideScreen ? 'row' : 'column'
                  }]}>
                    <View style={[
                      styles.searchAndInviteContainer,
                      isWideScreen ? { flex: 0.4, marginRight: 'auto', flexDirection: 'row', alignItems: 'center' } : { flexDirection: 'row', alignItems: 'center' }
                    ]}>
                      <View style={[
                        styles.searchContainer,
                        searchFocused && styles.searchContainerFocused
                      ]}>
                        <MaterialCommunityIcons 
                          name="magnify" 
                          size={24} 
                          color={searchFocused ? theme.colors.primary : "#666"} 
                        />
                        <TextInput
                          style={styles.searchInput}
                          placeholder={activeTab === 'clients' 
                            ? "Search by client name, email, or pet" 
                            : "Search by professional name, email, or service"
                          }
                          value={searchQuery}
                          onChangeText={handleSearch}
                          onFocus={() => setSearchFocused(true)}
                          onBlur={() => setSearchFocused(false)}
                        />
                      </View>
                      
                      {activeTab === 'clients' && userRole === 'professional' && (
                        <TouchableOpacity 
                          style={styles.inviteButtonSmall}
                          onPress={handleInviteClient}
                        >
                          <MaterialCommunityIcons name="account-plus" size={16} color={theme.colors.surface} />
                          <Text style={styles.inviteButtonSmallText}>Invite</Text>
                        </TouchableOpacity>
                      )}
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
                              Platform.OS === 'web' && hoveredFilter === 'all' && styles.filterButtonHovered
                            ]}
                            onPress={() => setActiveFilter('all')}
                            onMouseEnter={() => Platform.OS === 'web' && setHoveredFilter('all')}
                            onMouseLeave={() => Platform.OS === 'web' && setHoveredFilter(null)}
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
                              styles.activeBookingsButton,
                              Platform.OS === 'web' && hoveredFilter === 'active_bookings' && styles.filterButtonHovered
                            ]}
                            onPress={() => setActiveFilter('active_bookings')}
                            onMouseEnter={() => Platform.OS === 'web' && setHoveredFilter('active_bookings')}
                            onMouseLeave={() => Platform.OS === 'web' && setHoveredFilter(null)}
                          >
                            <View style={styles.filterContent}>
                              <MaterialCommunityIcons 
                                name="calendar-check" 
                                size={16} 
                                color="#4CAF50"
                              />
                              <Text style={[styles.filterText, styles.activeBookingsButtonText]}>
                                Active Bookings
                              </Text>
                              {activeFilter === 'active_bookings' && (
                                <MaterialCommunityIcons 
                                  name="check" 
                                  size={16} 
                                  color="#4CAF50"
                                  style={styles.checkmark}
                                />
                              )}
                            </View>
                          </TouchableOpacity>
                          <TouchableOpacity 
                            style={[
                              styles.filterButton,
                              styles.noBookingsButton,
                              Platform.OS === 'web' && hoveredFilter === 'no_bookings' && styles.filterButtonHovered
                            ]}
                            onPress={() => setActiveFilter('no_bookings')}
                            onMouseEnter={() => Platform.OS === 'web' && setHoveredFilter('no_bookings')}
                            onMouseLeave={() => Platform.OS === 'web' && setHoveredFilter(null)}
                          >
                            <View style={styles.filterContent}>
                              <MaterialCommunityIcons 
                                name="calendar-remove" 
                                size={16} 
                                color="#898974"
                              />
                              <Text style={[styles.filterText, styles.noBookingsButtonText]}>
                                No Bookings
                              </Text>
                              {activeFilter === 'no_bookings' && (
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
                              styles.pastBookingsButton,
                              Platform.OS === 'web' && hoveredFilter === 'past_bookings' && styles.filterButtonHovered
                            ]}
                            onPress={() => setActiveFilter('past_bookings')}
                            onMouseEnter={() => Platform.OS === 'web' && setHoveredFilter('past_bookings')}
                            onMouseLeave={() => Platform.OS === 'web' && setHoveredFilter(null)}
                          >
                            <View style={styles.filterContent}>
                              <MaterialCommunityIcons 
                                name="history" 
                                size={16} 
                                color="#9C27B0"
                              />
                              <Text style={[styles.filterText, styles.pastBookingsButtonText]}>
                                Past Bookings
                              </Text>
                              {activeFilter === 'past_bookings' && (
                                <MaterialCommunityIcons 
                                  name="check" 
                                  size={16} 
                                  color="#9C27B0"
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
                  data={connections}
                  renderItem={renderItem}
                  keyExtractor={item => item.id.toString()}
                  contentContainerStyle={styles.listContainer}
                  onEndReached={handleLoadMore}
                  onEndReachedThreshold={0.5}
                  ListFooterComponent={renderFooter}
                  ListHeaderComponent={<View style={[styles.listHeaderSpacing, { height: isWideScreen ? 130 : 190 }]} />}
                  numColumns={isWideScreen ? 3 : (isMobile ? 1 : 2)}
                  key={isWideScreen ? 'three-columns' : (isMobile ? 'one-column' : 'two-columns')}
                  columnWrapperStyle={!isMobile && styles.columnWrapper}
                />
              </View>
            ) : (
              <EmptyStateMessage type={activeTab} />
            )}
          </View>
        </View>
        
        {/* Invite Client Modal */}
        <Modal
          visible={showInviteModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowInviteModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Invite Client</Text>
                <TouchableOpacity 
                  style={styles.closeButton}
                  onPress={() => setShowInviteModal(false)}
                >
                  <MaterialCommunityIcons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>
              
              <Text style={styles.modalText}>
                Enter the email address of the client you'd like to invite.
                They'll receive an invitation to connect with you on CrittrCove.
              </Text>
              
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.emailInput}
                  placeholder="client@example.com"
                  value={inviteEmail}
                  onChangeText={setInviteEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
              
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setShowInviteModal(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.sendInviteButton,
                    (!inviteEmail || !inviteEmail.includes('@')) && styles.disabledButton
                  ]}
                  onPress={handleSendInvite}
                  disabled={isInviting || !inviteEmail || !inviteEmail.includes('@')}
                >
                  {isInviting ? (
                    <ActivityIndicator size="small" color={theme.colors.surface} />
                  ) : (
                    <Text style={styles.sendInviteButtonText}>Send Invite</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
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
    position: 'relative',
  },
  headerSection: {
    width: '100%',
    backgroundColor: theme.colors.surfaceContrast,
    paddingHorizontal: 24,
    paddingTop: 24,
    zIndex: 2,
  },
  connectionsContent: {
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
  searchAndInviteContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceContrast,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#CCCBC9',
    minHeight: 48,
  },
  searchContainerFocused: {
    borderColor: theme.colors.primary,
    borderWidth: 2,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  searchInput: {
    flex: 1,
    color: '#666',
    fontSize: 16,
    marginLeft: 8,
    fontFamily: theme.fonts.regular.fontFamily,
    outlineStyle: 'none',
    outlineWidth: 0,
    WebkitAppearance: 'none',
    padding: 0,
    minHeight: 24,
    ...(Platform.OS === 'web' && {
      caretColor: theme.colors.primary,
    }),
  },
  inviteButtonSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: theme.colors.primary,
    gap: 6,
    ...(Platform.OS === 'web' && {
      transition: 'all 0.2s ease-in-out',
      cursor: 'pointer',
    })
  },
  inviteButtonSmallText: {
    color: theme.colors.surface,
    fontSize: 14,
    fontWeight: '600',
    fontFamily: theme.fonts.regular.fontFamily,
  },
  filtersWrapper: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginRight: -16,
  },
  filterScrollContent: {
    flexGrow: 0,
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
    backgroundColor: '#EFF9FF',
  },
  allButtonText: {
    color: '#0784C6',
  },
  activeBookingsButton: {
    backgroundColor: '#E8F5E9',
  },
  activeBookingsButtonText: {
    color: '#4CAF50',
  },
  noBookingsButton: {
    backgroundColor: '#E8E9E2',
  },
  noBookingsButtonText: {
    color: '#898974',
  },
  pastBookingsButton: {
    backgroundColor: '#F3E5F5',
  },
  pastBookingsButtonText: {
    color: '#9C27B0',
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
    alignItems: 'stretch',
    width: '100%',
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  emptyText: {
    fontSize: 16,
    color: theme.colors.placeholder,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  inviteButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  inviteButtonText: {
    color: theme.colors.surface,
    fontSize: 16,
    fontWeight: '600',
    fontFamily: theme.fonts.regular.fontFamily,
  },
  footer: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  footerText: {
    color: theme.colors.placeholder,
    fontSize: 16,
    fontFamily: theme.fonts.regular.fontFamily,
    textAlign: 'center',
    marginBottom: 12,
  },
  createServiceButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: theme.colors.primary,
    borderRadius: 8,
    marginTop: 8,
  },
  createServiceButtonText: {
    color: theme.colors.surface,
    fontSize: 16,
    fontWeight: '600',
    fontFamily: theme.fonts.regular.fontFamily,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 24,
    width: '90%',
    maxWidth: 500,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.text,
    fontFamily: theme.fonts.header.fontFamily,
  },
  closeButton: {
    padding: 4,
  },
  modalText: {
    fontSize: 16,
    color: theme.colors.text,
    marginBottom: 24,
    fontFamily: theme.fonts.regular.fontFamily,
    lineHeight: 24,
  },
  inputContainer: {
    marginBottom: 24,
  },
  emailInput: {
    borderWidth: 1,
    borderColor: '#CCCBC9',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  cancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CCCBC9',
    backgroundColor: theme.colors.surface,
  },
  cancelButtonText: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '500',
    fontFamily: theme.fonts.regular.fontFamily,
  },
  sendInviteButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: theme.colors.primary,
    minWidth: 100,
    alignItems: 'center',
  },
  sendInviteButtonText: {
    color: theme.colors.surface,
    fontSize: 16,
    fontWeight: '600',
    fontFamily: theme.fonts.regular.fontFamily,
  },
  disabledButton: {
    backgroundColor: '#CCCCCC',
    opacity: 0.7,
  },
  columnWrapper: {
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 16,
    width: '100%',
  },
  cardWrapper: {
    flex: 1,
    width: '100%',
    marginBottom: 16,
  },
  mobileCardWrapper: {
    maxWidth: '100%',
  },
  wideScreenCardWrapper: {
    maxWidth: 'calc(33.33% - 16px)',
  },
});

export default Connections; 