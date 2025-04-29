import React, { useState, useEffect, useContext, useRef } from 'react';
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
  const [isWideScreen, setIsWideScreen] = useState(screenWidth >= 1500);
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
  const searchInputRef = useRef(null);
  const [allConnections, setAllConnections] = useState([]);
  const [invitationType, setInvitationType] = useState('email');
  const [generatedLink, setGeneratedLink] = useState('');
  const [inviteError, setInviteError] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState('');
  const [isInviteButtonHovered, setIsInviteButtonHovered] = useState(false);
  const [isCreateServiceButtonHovered, setIsCreateServiceButtonHovered] = useState(false);

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

  // Handle navigation based on the user role
  useEffect(() => {
    const handleRoleNavigation = async () => {
      debugLog('MBA4321 Checking user role for navigation', { userRole });
      if (userRole === 'petOwner') {
        // Store Dashboard as the current route before navigating
        if (Platform.OS === 'web') {
          sessionStorage.setItem('previousRoute', '');
          sessionStorage.setItem('currentRoute', 'Dashboard');
        } else {
          await AsyncStorage.setItem('previousRoute', '');
          await AsyncStorage.setItem('currentRoute', 'Dashboard');
        }
        debugLog('MBA4321 User is pet owner, navigating to Dashboard');
        navigation.navigate('Dashboard');
      }
    };

    handleRoleNavigation();
  }, [userRole, navigation]);

  const fetchConnections = async (pageNum = 1, isLoadMore = false) => {
    setLoading(!isLoadMore);
    isLoadMore && setIsLoadingMore(true);
    
    debugLog('MBA4321 Fetching connections:', {
      page: pageNum,
      isLoadMore
    });

    try {
      const response = await getUserConnections(pageNum);
      
      debugLog('MBA4321 Response from API:', response);

      const connectionsList = response.connections || [];
      
      if (isLoadMore) {
        const newConnections = [...connections, ...connectionsList];
        setConnections(newConnections);
        setAllConnections(newConnections);
      } else {
        setConnections(connectionsList);
        setAllConnections(connectionsList);
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

  // Update useEffect to only fetch once and not refetch when filter changes
  useEffect(() => {
    debugLog('MBA4321 Fetching connections due to dependency change:', {
      activeTab,
      userRole
    });
    setPage(1);
    setConnections([]);
    fetchConnections(1);
  }, [activeTab, userRole]);

  // Add new useEffect to filter connections locally when filter changes
  useEffect(() => {
    debugLog('MBA4321 Filtering connections locally based on:', {
      activeFilter
    });
    if (allConnections.length > 0) {
      filterConnectionsLocally();
    }
  }, [activeFilter, allConnections]);

  // Add function to filter connections locally
  const filterConnectionsLocally = () => {
    if (!allConnections.length) return;
    
    debugLog('MBA4321 Filtering connections locally with filter:', activeFilter);
    
    if (activeFilter === 'all') {
      setConnections(allConnections);
      return;
    }
    
    // Filter based on activeFilter
    let filtered = [];
    
    switch (activeFilter) {
      case 'active_bookings':
        filtered = allConnections.filter(connection => 
          connection.upcoming_booking_date != null
        );
        break;
      case 'no_bookings':
        filtered = allConnections.filter(connection => 
          connection.upcoming_booking_date == null
        );
        break;
      case 'past_bookings':
        // This would require additional data from the API to implement properly
        // For now, we'll just show all connections
        filtered = allConnections;
        break;
      default:
        filtered = allConnections;
    }
    
    setConnections(filtered);
  };

  // Handle search
  const handleSearch = (query) => {
    setSearchQuery(query);
    
    // If query is empty, reapply the current filter
    if (!query.trim()) {
      debugLog('MBA4321 Empty search query, reapplying current filter');
      filterConnectionsLocally();
      return;
    }

    debugLog('MBA4321 Searching connections with query:', query);
    
    // Get the base set of connections to search from (already filtered by activeFilter)
    let baseConnections = [];
    if (activeFilter === 'all') {
      baseConnections = allConnections;
    } else {
      // Re-apply the active filter to get the current filtered set
      switch (activeFilter) {
        case 'active_bookings':
          baseConnections = allConnections.filter(connection => 
            connection.upcoming_booking_date != null
          );
          break;
        case 'no_bookings':
          baseConnections = allConnections.filter(connection => 
            connection.upcoming_booking_date == null
          );
          break;
        case 'past_bookings':
          baseConnections = allConnections;
          break;
        default:
          baseConnections = allConnections;
      }
    }
    
    // Filter the already filtered list based on search query
    const searchLower = query.toLowerCase();
    const filtered = baseConnections.filter(connection => 
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

  const handleViewMessages = async (connection) => {
    debugLog('MBA4321 Navigating to messages with connection:', {
      connectionId: connection.id,
      connectionName: connection.name,
      conversationId: connection.conversation_id
    });
    
    // Navigate to MessageHistory screen with conversation ID
    await navigateToFrom(navigation, 'MessageHistory', 'Connections', {
      conversationId: connection.conversation_id,
      otherUserName: connection.name
      // No isProfessional flag here as we don't want to trigger booking creation
    });
  };

  const handleCreateBooking = async (connection) => {
    debugLog('MBA4321 Creating booking with client:', {
      clientId: connection.id,
      clientName: connection.name,
      conversationId: connection.conversation_id
    });
    
    // Navigate directly to the MessageHistory screen with the conversation ID
    await navigateToFrom(navigation, 'MessageHistory', 'Connections', {
      conversationId: connection.conversation_id,
      otherUserName: connection.name,
      clientId: connection.client_id, // Include client_id for potential future use
      isProfessional: true // Since this is called from the professional's perspective
    });
  };

  const handleInviteClient = () => {
    debugLog('MBA4321 Opening invite client modal');
    setInviteEmail('');
    setGeneratedLink('');
    setInviteError('');
    setInviteSuccess('');
    setInvitationType('email');
    setShowInviteModal(true);
  };
  
  const handleSendInvite = async () => {
    setInviteError('');
    setInviteSuccess('');
    
    if (invitationType === 'email') {
      if (!inviteEmail || !inviteEmail.includes('@')) {
        setInviteError('Please enter a valid email address');
        debugLog('MBA4321 Invalid email format:', inviteEmail);
        return;
      }
    }
    
    setIsInviting(true);
    debugLog('MBA4321 Creating invitation:', { 
      type: invitationType, 
      email: invitationType === 'email' ? inviteEmail : null 
    });
    
    try {
      const response = await inviteClient(invitationType, invitationType === 'email' ? inviteEmail : null);
      debugLog('MBA4321 Invitation created successfully:', response);
      
      if (invitationType === 'email') {
        setInviteSuccess(`Invitation sent to ${inviteEmail}`);
        setInviteEmail('');
      } else {
        setGeneratedLink(response.invitation_link);
        setInviteSuccess('Invitation link created successfully!');
      }
      
      // Refresh the connections list only if needed
      if (activeFilter === 'pending' || activeFilter === 'all') {
        fetchConnections(1);
      }
    } catch (error) {
      debugLog('MBA4321 Error creating invitation:', error);
      setInviteError(error.response?.data?.error || 'Failed to send invitation. Please try again.');
    } finally {
      setIsInviting(false);
    }
  };

  const handleCopyLink = () => {
    if (generatedLink) {
      navigator.clipboard.writeText(generatedLink);
      setInviteSuccess('Link copied to clipboard!');
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
              style={[
                styles.createServiceButton,
                isCreateServiceButtonHovered && styles.buttonHovered
              ]}
              onPress={() => {
                debugLog('MBA4321 Create Service button clicked in footer');
                navigateToFrom(navigation, 'ServiceManager', 'Connections');
              }}
              onMouseEnter={() => setIsCreateServiceButtonHovered(true)}
              onMouseLeave={() => setIsCreateServiceButtonHovered(false)}
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
          onViewProfile={() => handleViewMessages(item)}
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
              {/* My Professionals tab commented out until implementation
              <TouchableOpacity
                style={[styles.tab, activeTab === 'professionals' && styles.activeTab]}
                onPress={() => setActiveTab('professionals')}
              >
                <Text style={[styles.tabText, activeTab === 'professionals' && styles.activeTabText]}>
                  My Professionals
                </Text>
              </TouchableOpacity>
              */}
            </View>
          </View>
          <View style={styles.connectionsContent}>
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
              </View>
            ) : (
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
                          ref={searchInputRef}
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
                        {searchQuery ? (
                          <TouchableOpacity 
                            onPress={() => {
                              setSearchQuery('');
                              filterConnectionsLocally();
                            }}
                          >
                            <MaterialCommunityIcons name="close-circle" size={20} color="#777" />
                          </TouchableOpacity>
                        ) : null}
                      </View>
                      
                      {activeTab === 'clients' && userRole === 'professional' && (
                        <TouchableOpacity 
                          style={[
                            styles.inviteButtonSmall,
                            isInviteButtonHovered && styles.buttonHovered
                          ]}
                          onPress={handleInviteClient}
                          onMouseEnter={() => setIsInviteButtonHovered(true)}
                          onMouseLeave={() => setIsInviteButtonHovered(false)}
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

                {connections.length > 0 ? (
                  <FlatList
                    data={connections}
                    renderItem={renderItem}
                    keyExtractor={item => item.client_id.toString()}
                    contentContainerStyle={styles.listContainer}
                    onEndReached={handleLoadMore}
                    onEndReachedThreshold={0.5}
                    ListFooterComponent={renderFooter}
                    ListHeaderComponent={<View style={[styles.listHeaderSpacing, { height: isWideScreen ? 130 : 190 }]} />}
                    numColumns={isWideScreen ? 3 : (isMobile ? 1 : 2)}
                    key={isWideScreen ? 'three-columns' : (isMobile ? 'one-column' : 'two-columns')}
                    columnWrapperStyle={!isMobile && styles.columnWrapper}
                  />
                ) : searchQuery ? (
                  <View style={styles.emptyContainer}>
                    <View style={[styles.listHeaderSpacing, { height: isWideScreen ? 130 : 190 }]} />
                    <MaterialCommunityIcons 
                      name="magnify-close" 
                      size={80} 
                      color={theme.colors.placeholder} 
                    />
                    <Text style={styles.emptyText}>
                      No {activeTab} found matching "{searchQuery}"
                    </Text>
                    <TouchableOpacity 
                      style={styles.inviteButton}
                      onPress={() => {
                        setSearchQuery('');
                        filterConnectionsLocally();
                      }}
                    >
                      <Text style={styles.inviteButtonText}>Clear Search</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <EmptyStateMessage type={activeTab} />
                )}
              </View>
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
                Invite a client to connect with you on CrittrCove. 
                You can either send them an email invitation or generate a link to share.
              </Text>
              
              <View style={styles.inviteTypeToggle}>
                <TouchableOpacity
                  style={[
                    styles.inviteTypeButton,
                    invitationType === 'email' && styles.inviteTypeButtonActive
                  ]}
                  onPress={() => {
                    setInvitationType('email');
                    setInviteError('');
                    setInviteSuccess('');
                  }}
                >
                  <MaterialCommunityIcons 
                    name="email-outline" 
                    size={20} 
                    color={invitationType === 'email' ? theme.colors.primary : "#666"} 
                  />
                  <Text 
                    style={[
                      styles.inviteTypeText,
                      invitationType === 'email' && styles.inviteTypeTextActive
                    ]}
                  >
                    Email Invitation
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.inviteTypeButton,
                    invitationType === 'link' && styles.inviteTypeButtonActive
                  ]}
                  onPress={() => {
                    setInvitationType('link');
                    setInviteError('');
                    setInviteSuccess('');
                  }}
                >
                  <MaterialCommunityIcons 
                    name="link-variant" 
                    size={20} 
                    color={invitationType === 'link' ? theme.colors.primary : "#666"} 
                  />
                  <Text 
                    style={[
                      styles.inviteTypeText,
                      invitationType === 'link' && styles.inviteTypeTextActive
                    ]}
                  >
                    Generate Link
                  </Text>
                </TouchableOpacity>
              </View>
              
              {invitationType === 'email' ? (
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Client's Email Address</Text>
                  <TextInput
                    style={styles.emailInput}
                    placeholder="client@example.com"
                    value={inviteEmail}
                    onChangeText={setInviteEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
              ) : generatedLink ? (
                <View style={styles.linkContainer}>
                  <Text style={styles.inputLabel}>Shareable Invitation Link</Text>
                  <View style={styles.generatedLinkContainer}>
                    <Text 
                      style={styles.generatedLink}
                      numberOfLines={1}
                      ellipsizeMode="middle"
                    >
                      {generatedLink}
                    </Text>
                    {Platform.OS === 'web' && (
                      <TouchableOpacity 
                        style={styles.copyButton}
                        onPress={handleCopyLink}
                      >
                        <MaterialCommunityIcons name="content-copy" size={20} color={theme.colors.primary} />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ) : null}
              
              {inviteError ? (
                <Text style={styles.errorText}>{inviteError}</Text>
              ) : null}
              
              {inviteSuccess ? (
                <Text style={styles.successText}>{inviteSuccess}</Text>
              ) : null}
              
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setShowInviteModal(false)}
                >
                  <Text style={styles.cancelButtonText}>Close</Text>
                </TouchableOpacity>
                
                {!generatedLink || invitationType === 'email' ? (
                  <TouchableOpacity
                    style={[
                      styles.sendInviteButton,
                      (invitationType === 'email' && (!inviteEmail || !inviteEmail.includes('@'))) && styles.disabledButton,
                      isInviting && styles.disabledButton
                    ]}
                    onPress={handleSendInvite}
                    disabled={isInviting || (invitationType === 'email' && (!inviteEmail || !inviteEmail.includes('@')))}
                  >
                    {isInviting ? (
                      <ActivityIndicator size="small" color={theme.colors.surface} />
                    ) : (
                      <Text style={styles.sendInviteButtonText}>
                        {invitationType === 'email' ? 'Send Invitation' : 'Generate Link'}
                      </Text>
                    )}
                  </TouchableOpacity>
                ) : null}
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
      transition: 'all 0.2s ease',
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
    ...(Platform.OS === 'web' && {
      transition: 'all 0.2s ease',
      cursor: 'pointer',
    })
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
  inviteTypeToggle: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  inviteTypeButton: {
    flex: 1,
    padding: 12,
    borderWidth: 1,
    borderColor: '#CCCBC9',
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    ...(Platform.OS === 'web' && {
      cursor: 'pointer',
    }),
  },
  inviteTypeButtonActive: {
    borderColor: theme.colors.primary,
    backgroundColor: 'rgba(7, 132, 198, 0.05)',
  },
  inviteTypeText: {
    fontSize: 16,
    color: '#666',
    fontFamily: theme.fonts.regular.fontFamily,
  },
  inviteTypeTextActive: {
    color: theme.colors.primary,
    fontWeight: '500',
  },
  inputContainer: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.text,
    marginBottom: 8,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  emailInput: {
    borderWidth: 1,
    borderColor: '#CCCBC9',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  linkContainer: {
    marginBottom: 24,
  },
  generatedLinkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#CCCBC9',
    borderRadius: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
  },
  generatedLink: {
    flex: 1,
    color: theme.colors.text,
    fontSize: 16,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  copyButton: {
    padding: 8,
    ...(Platform.OS === 'web' && {
      cursor: 'pointer',
    }),
  },
  errorText: {
    color: theme.colors.error || '#D32F2F',
    fontSize: 16,
    marginBottom: 16,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  successText: {
    color: theme.colors.success || '#4CAF50',
    fontSize: 16,
    marginBottom: 16,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CCCBC9',
    backgroundColor: theme.colors.surface,
    ...(Platform.OS === 'web' && {
      cursor: 'pointer',
    }),
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
    minWidth: 140,
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web' && {
      cursor: 'pointer',
    }),
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
    ...(Platform.OS === 'web' && {
      cursor: 'not-allowed',
    }),
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
    maxWidth: 'calc(50% - 11px)',
    // width: 'calc(33.33% - 11px)',
  },
  buttonHovered: {
    transform: [{translateY: -3}],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
  },
});

export default Connections; 