import React, { useState, useEffect, useContext } from 'react';
import { View, StyleSheet, Platform, Dimensions, TouchableOpacity, Text, useWindowDimensions, SafeAreaView } from 'react-native';
import SearchRefiner from '../components/SearchRefiner';
import ProfessionalList from '../components/ProfessionalList';
import MapView from '../components/MapView';
import { theme } from '../styles/theme';
// import { mockProfessionals } from '../data/mockData'; // TODO: Remove mock data after implementing real search
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { AuthContext, debugLog, getStorage, setStorage } from '../context/AuthContext';
import BackHeader from '../components/BackHeader';
import { searchProfessionals, submitGetMatchedRequest } from '../api/API';
import { createProfessionalSlug } from '../utils/urlUtils';

const SearchProfessionalsListing = ({ navigation, route }) => {
  const { width: windowWidth } = useWindowDimensions();
  const { screenWidth, isCollapsed, isSignedIn } = useContext(AuthContext);
  const [isSingleView, setIsSingleView] = useState(screenWidth <= 1200);
  const [isMobile, setIsMobile] = useState(screenWidth <= 900);
  const [activeView, setActiveView] = useState(isSingleView ? 'filters' : 'all');
  const [professionals, setProfessionals] = useState([]); // Start with empty array
  const [filters, setFilters] = useState({});
  const [isMapMinimized, setIsMapMinimized] = useState(false);
  const [isLeftColumnExpanded, setIsLeftColumnExpanded] = useState(true);
  const [showingSearch, setShowingSearch] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [searchResults, setSearchResults] = useState(null);
  const [currentSearchParams, setCurrentSearchParams] = useState(null);
  const [fallbackMessage, setFallbackMessage] = useState(null);
  const [region, setRegion] = useState({
    latitude: 38.8339,
    longitude: -104.8214,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });
  const [activeFilters, setActiveFilters] = useState({
    categories: [],
  });

  // Helper function to extract city from location string
  const extractCity = (location) => {
    if (!location) return '';
    
    // Try to extract city from "City, State" format
    const cityMatch = location.match(/^([^,]+)/);
    if (cityMatch && cityMatch[1]) {
      return cityMatch[1].trim();
    }
    
    // If no match, return the whole location or truncate if too long
    return truncateLocation(location);
  };
  
  // Helper function to truncate long location strings
  const truncateLocation = (location, maxLength = 20) => {
    if (!location) return '';
    if (location.length <= maxLength) return location;
    
    return location.substring(0, maxLength) + '...';
  };
  
  // Helper function to generate filter categories from search params
  const generateFilterCategories = (searchParams) => {
    if (!searchParams) return [];
    
    debugLog('MBA9999', 'Generating filter categories from search params:', searchParams);
    
    const categories = [];
    
    // Add animal types (limit to 2 to avoid overcrowding)
    if (searchParams.animal_types && searchParams.animal_types.length > 0) {
      if (searchParams.animal_types.length === 1) {
        categories.push(searchParams.animal_types[0]);
      } else if (searchParams.animal_types.length === 2) {
        categories.push(searchParams.animal_types[0]);
        categories.push(searchParams.animal_types[1]);
      } else {
        categories.push(searchParams.animal_types[0]);
        categories.push(`+${searchParams.animal_types.length - 1} more`);
      }
    }
    
    // Add location if available (extract city only)
    if (searchParams.location) {
      const extractedCity = extractCity(searchParams.location);
      categories.push(extractedCity);
      debugLog('MBA9999', `Extracted city "${extractedCity}" from location "${searchParams.location}"`);
    }
    
    // Add service query if available (truncate if too long)
    if (searchParams.service_query) {
      const service = truncateLocation(searchParams.service_query, 15);
      categories.push(service);
    }
    
    // Add overnight service if true
    if (searchParams.overnight_service) {
      categories.push('Overnight');
    }
    
    // Add price range if available and not the default max
    if (searchParams.price_max && searchParams.price_max < 250) {
      categories.push(`Under $${searchParams.price_max}`);
    }
    
    // Add badge filters
    if (searchParams.filter_background_checked) {
      categories.push('Background Checked');
    }
    if (searchParams.filter_insured) {
      categories.push('Insured');
    }
    if (searchParams.filter_elite_pro) {
      categories.push('Elite Pro');
    }
    
    // Limit to 4 filters max to avoid overflow
    const finalCategories = categories.length > 4 
      ? [...categories.slice(0, 3), `+${categories.length - 3} more`]
      : categories;
    
    debugLog('MBA9999', 'Generated filter categories:', finalCategories);
    return finalCategories;
  };

  useEffect(() => {
    const updateLayout = () => {
      setIsSingleView(screenWidth <= 1200);
      setIsMobile(screenWidth <= 900);
      setActiveView(screenWidth <= 1200 ? 'filters' : 'all');
    };
    updateLayout();
  }, [screenWidth]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', async () => {
      debugLog('MBAa3M$91vkP: Search screen focused, checking for stored state');
      try {
        const storedStateStr = await getStorage('search_professionals_state');
        if (storedStateStr) {
          const storedState = JSON.parse(storedStateStr);
          // Check if the stored state is recent (within 10 minutes)
          const maxAge = 10 * 60 * 1000; // 10 minutes
          if (Date.now() - storedState.timestamp < maxAge) {
            debugLog('MBAa3M$91vkP: Found recent search state', {
              professionalsCount: storedState.professionals?.length,
              activeView: storedState.activeView,
              isDesktop: screenWidth > 768
            });
            
            // Restore the previous state for navigation between screens
            debugLog('MBAa3M$91vkP: Restoring search state for navigation focus', { screenWidth });
            setProfessionals(storedState.professionals || []);
            setSearchResults(storedState.searchResults);
            setCurrentSearchParams(storedState.currentSearchParams);
            setActiveFilters(storedState.activeFilters || { categories: [] });
            setFallbackMessage(storedState.fallbackMessage || null);
            
            // Handle view state restoration - simple logic: if we have professionals, show them
            const hasProfessionals = storedState.professionals && storedState.professionals.length > 0;
            
            if (screenWidth <= 768) {
              // Mobile: handle view switching
              if (hasProfessionals) {
                setActiveView('list');
                setShowingSearch(false); // Show professional list, not search refiner
              } else {
                setActiveView('filters');
                setShowingSearch(true); // Show search refiner if no professionals
              }
            } else {
              // Desktop: if we have professionals, show them; otherwise show search refiner
              setShowingSearch(!hasProfessionals);
            }
            
            return;
          } else {
            debugLog('MBAa3M$91vkP: Stored state too old, ignoring');
          }
        }
      } catch (e) {
        debugLog('MBAa3M$91vkP: Error restoring search state', { message: e?.message });
      }
      
      // Fallback to default behavior if no valid stored state
      if (isSingleView) {
        setActiveView('filters');
      }
      // For desktop, the initial professional loading will be handled by the other useEffect
    });

    return unsubscribe;
  }, [navigation, isSingleView, screenWidth]);

  // Check for stored state on component mount (handles page reloads)
  useEffect(() => {
    const restoreStateOnMount = async () => {
      debugLog('MBAa3M$91vkP: Component mounted, checking for stored state (page reload)');
      try {
        const storedStateStr = await getStorage('search_professionals_state');
        if (storedStateStr) {
          const storedState = JSON.parse(storedStateStr);
          const maxAge = 10 * 60 * 1000; // 10 minutes
          if (Date.now() - storedState.timestamp < maxAge) {
            debugLog('MBAa3M$91vkP: Found recent search state on mount', {
              professionalsCount: storedState.professionals?.length,
              activeView: storedState.activeView,
              showingSearch: storedState.showingSearch,
              isDesktop: screenWidth > 768
            });
            
            // Restore the previous state for all screen sizes (mobile and desktop)
            setProfessionals(storedState.professionals || []);
            setSearchResults(storedState.searchResults);
            setCurrentSearchParams(storedState.currentSearchParams);
            setActiveFilters(storedState.activeFilters || { categories: [] });
            setFallbackMessage(storedState.fallbackMessage || null);
            
            // Handle view state restoration - simple logic: if we have professionals, show them
            const hasProfessionals = storedState.professionals && storedState.professionals.length > 0;
            
            if (screenWidth <= 768) {
              // Mobile: handle view switching
              if (hasProfessionals) {
                setActiveView('list');
                setShowingSearch(false); // Show professional list, not search refiner
              } else {
                setActiveView('filters');
                setShowingSearch(true); // Show search refiner if no professionals
              }
            } else {
              // Desktop: if we have professionals, show them; otherwise show search refiner
              setShowingSearch(!hasProfessionals);
            }
            
            debugLog('MBAa3M$91vkP: State restored on mount', {
              hasProfessionals: hasProfessionals,
              showingSearch: !hasProfessionals,
              activeView: hasProfessionals ? 'list' : 'filters'
            });
          }
        }
      } catch (e) {
        debugLog('MBAa3M$91vkP: Error restoring state on mount', { message: e?.message });
      }
    };

    restoreStateOnMount();
  }, []); // Run only once on mount

  // Load initial professionals when component mounts (for all screen sizes)
  useEffect(() => {
    const loadInitialIfNeeded = async () => {
      // Debug the screen width to understand what's happening
      debugLog('MBA9999', 'Screen width check:', { screenWidth, windowWidth });
      
      // Check if we have recent stored state before loading initial professionals
      try {
        const storedStateStr = await getStorage('search_professionals_state');
        if (storedStateStr) {
          const storedState = JSON.parse(storedStateStr);
          const maxAge = 10 * 60 * 1000; // 10 minutes
          if (Date.now() - storedState.timestamp < maxAge) {
            debugLog('MBA9999', 'Skipping initial load - have recent stored state');
            return; // Don't load initial professionals if we have recent stored state
          }
        }
      } catch (e) {
        debugLog('MBA9999', 'Error checking for stored state, proceeding with initial load');
      }
      
      // Use windowWidth from useWindowDimensions for more reliable detection
      const currentWidth = windowWidth || screenWidth;
      
      debugLog('MBA9999', 'Loading initial professionals for all screen sizes', { currentWidth });
      loadInitialProfessionals();
    };

    loadInitialIfNeeded();
  }, [screenWidth, windowWidth]);

  const loadInitialProfessionals = async () => {
    setIsLoading(true);
    try {
      debugLog('MBA9999', 'Loading initial professionals for Colorado Springs');
      
      // Clear any stored state since we're doing a fresh load
      try {
        await setStorage('search_professionals_state', '');
        debugLog('MBAa3M$91vkP: Cleared stored search state on initial load');
      } catch (e) {
        debugLog('MBAa3M$91vkP: Error clearing stored search state on initial load', { message: e?.message });
      }
      
      // Load first 20 professionals in Colorado Springs area with no filters
      const searchParams = {
        animal_types: [],
        location: 'Colorado Springs, Colorado',
        service_query: '',
        overnight_service: false,
        price_min: 0,
        price_max: 999999,
        radius_miles: 30,
        page: 1,
        page_size: 20
      };
      
      const results = await searchProfessionals(searchParams, 'loadInitialProfessionals', true);
      
      debugLog('MBA9999', 'Initial professionals loaded:', results);
      setSearchResults(results);
      setProfessionals(results.professionals || []);
      setCurrentSearchParams(searchParams);
      
      // Set initial active filters
      const filterCategories = generateFilterCategories(searchParams);
      setActiveFilters({
        categories: filterCategories
      });
      
    } catch (error) {
      debugLog('MBA9999', 'Error loading initial professionals:', error);
      console.error('Error loading initial professionals:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchResults = async (results, searchParams = null) => {
    debugLog('MBA9999', 'Received search results:', results);
    setSearchResults(results);
    setProfessionals(results.professionals || []);
    
    // Handle fallback message
    if (results.fallback_message) {
      setFallbackMessage(results.fallback_message);
      debugLog('MBA9999', 'Fallback message set:', results.fallback_message);
    } else {
      setFallbackMessage(null);
    }
    
    if (searchParams) {
      setCurrentSearchParams(searchParams);
      
      // Update active filters based on search parameters
      const filterCategories = generateFilterCategories(searchParams);
      setActiveFilters({
        categories: filterCategories
      });
      
      debugLog('MBA9999', 'Updated active filters:', filterCategories);
      debugLog('MBA9999', 'Search complete: Found ' + (results.professionals?.length || 0) + ' professionals with active filters: ' + filterCategories.join(', '));
      
      // Store search state for reload persistence
      try {
        const searchState = {
          professionals: results.professionals || [],
          searchResults: results,
          currentSearchParams: searchParams,
          activeFilters: { categories: filterCategories },
          activeView: activeView,
          fallbackMessage: results.fallback_message || null,
          showingSearch: showingSearch,
          timestamp: Date.now()
        };
        await setStorage('search_professionals_state', JSON.stringify(searchState));
        debugLog('MBAa3M$91vkP: Stored search state after search results', {
          professionalsCount: results.professionals?.length || 0,
          fallbackMessage: results.fallback_message,
          activeView: activeView,
          showingSearch: showingSearch
        });
      } catch (e) {
        debugLog('MBAa3M$91vkP: Error storing search state after search results', { message: e?.message });
      }
    }
  };

  const handleFiltersChange = (newFilters) => {
    setFilters(newFilters);
    // Implement filtering logic here
  };

  const handleLoadMore = () => {
    // Implement pagination logic
  };

  const handleGetMatched = async (email, searchQuery) => {
    try {
      debugLog('MBA8001', 'Handling get matched request', { email, searchQuery });
      await submitGetMatchedRequest(email, searchQuery);
      debugLog('MBA8001', 'Get matched request successful');
    } catch (error) {
      debugLog('MBA8001', 'Get matched request failed', error);
      throw error;
    }
  };

  const handleProfessionalSelect = async (professional) => {
    debugLog('MBAa3M$91vkP: Selecting professional from listing', { id: professional?.professional_id, name: professional?.name });
    try {
      // Persist selection for reload resilience
      await setStorage('last_professional_profile_id', String(professional.professional_id));
      const snapshot = {
        professional_id: professional.professional_id,
        name: professional.name,
        location: professional.location,
        profile_picture_url: professional.profile_picture_url || professional.profile_picture || null,
        badges: professional.badges || null,
        average_rating: professional.average_rating || 0,
        review_count: professional.review_count || 0
      };
      await setStorage('last_professional_profile_snapshot', JSON.stringify(snapshot));
      
      // Store current search state to restore when returning
      const searchState = {
        professionals: professionals,
        searchResults: searchResults,
        currentSearchParams: currentSearchParams,
        activeFilters: activeFilters,
        activeView: activeView,
        fallbackMessage: fallbackMessage,
        showingSearch: showingSearch,
        timestamp: Date.now()
      };
      await setStorage('search_professionals_state', JSON.stringify(searchState));
      debugLog('MBAa3M$91vkP: Stored search state before navigation', { 
        professionalsCount: professionals.length,
        activeView: activeView 
      });
    } catch (e) {
      debugLog('MBAa3M$91vkP: Error storing selection from listing', { message: e?.message });
    }

    // Navigate to ProfessionalProfile screen with friendly URL
    const professionalSlug = createProfessionalSlug(professional.name);
    navigation.navigate('ProfessionalProfile', {
      professionalId: professional.professional_id.toString(),
      professionalSlug: professionalSlug,
      professional: professional, // Pass the complete professional object to avoid unnecessary API call
    });
  };

  const handleShowServicesModal = async (professional) => {
    try {
      await setStorage('last_professional_profile_id', String(professional.professional_id));
      const snapshot = {
        professional_id: professional.professional_id,
        name: professional.name,
        location: professional.location,
        profile_picture_url: professional.profile_picture_url || professional.profile_picture || null,
        badges: professional.badges || null,
        average_rating: professional.average_rating || 0,
        review_count: professional.review_count || 0
      };
      await setStorage('last_professional_profile_snapshot', JSON.stringify(snapshot));
      
      // Store current search state to restore when returning
      const searchState = {
        professionals: professionals,
        searchResults: searchResults,
        currentSearchParams: currentSearchParams,
        activeFilters: activeFilters,
        activeView: activeView,
        fallbackMessage: fallbackMessage,
        showingSearch: showingSearch,
        timestamp: Date.now()
      };
      await setStorage('search_professionals_state', JSON.stringify(searchState));
      debugLog('MBAa3M$91vkP: Stored search state before navigation from services modal', { 
        professionalsCount: professionals.length,
        activeView: activeView 
      });
    } catch (e) {
      debugLog('MBAa3M$91vkP: Error storing selection from services modal', { message: e?.message });
    }

    const professionalSlug = createProfessionalSlug(professional.name);
    navigation.navigate('ProfessionalProfile', {
      professionalId: professional.professional_id.toString(),
      professionalSlug: professionalSlug,
      professional: professional, // Pass the complete professional object to avoid unnecessary API call
    });
  };

  const toggleMapSize = () => {
    setIsMapMinimized(!isMapMinimized);
  };

  const handleShowProfessionals = (view) => {
    setShowingSearch(false);
    if (isSingleView) {
      if (view === 'map') {
        setActiveView('map');
      } else {
        setActiveView('list');
      }
    }
  };

  const toggleLeftColumn = () => {
    setIsLeftColumnExpanded(!isLeftColumnExpanded);
    // If we're expanding the left column, make sure the map is minimized
    if (!isLeftColumnExpanded) {
      setIsMapMinimized(true);
    }
  };

  const createStyles = (screenWidth, isCollapsed, isSignedIn, isMobile) => StyleSheet.create({
    mainContainer: {
      flex: 1,
      backgroundColor: theme.colors.background,
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      // Only apply sidebar margin when signed in and on desktop
      marginLeft: (screenWidth > 900 && isSignedIn) ? (isCollapsed ? 70 : 250) : 0,
      // Add top padding when not signed in (mobile header) or on mobile when signed in
      paddingTop: (!isSignedIn || isMobile) ? 60 : 0,
      transition: 'margin-left 0.3s ease',
    },
    container: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      height: (!isSignedIn || isMobile) ? 'calc(100vh - 60px)' : '100vh',
      overflow: 'hidden',
    },
    content: {
      flex: 1,
      flexDirection: 'row',
      height: isMobile ? '100%' : 'calc(100vh - 64px)',
      overflow: 'hidden',
    },
    leftColumn: {
      height: '100%',
      borderRightWidth: 1,
      borderRightColor: theme.colors.border,
      backgroundColor: theme.colors.background,
      transition: 'width 0.3s ease',
      position: 'relative',
      zIndex: 1,
    },
    leftColumnToggle: {
      position: 'absolute',
      top: '50%',
      right: -16,
      transform: [{ translateY: -20 }],
      zIndex: 2000,
      backgroundColor: theme.colors.surface,
      padding: theme.spacing.small,
      borderRadius: 20,
      shadowColor: "#000",
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.1,
      shadowRadius: 3,
      elevation: 3,
      width: 32,
      height: 32,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    mapColumn: {
      flex: 1,
      backgroundColor: theme.colors.background,
      height: '100%',
      transition: 'width 0.3s ease',
      position: 'relative',
      zIndex: 0,
    },
    toggleButton: {
      position: 'absolute',
      top: theme.spacing.medium,
      right: theme.spacing.medium,
      zIndex: 1000,
      backgroundColor: theme.colors.surface,
      padding: theme.spacing.small,
      borderRadius: 8,
      shadowColor: "#000",
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.1,
      shadowRadius: 3,
      elevation: 3,
    },
    toggleButtonText: {
      color: theme.colors.primary,
      fontSize: theme.fontSizes.medium,
      fontFamily: theme.fonts.regular.fontFamily,
      fontWeight: '500',
    },
    containerMobile: {
      flex: 1,
      backgroundColor: theme.colors.background,
      height: '100%',
      overflow: 'hidden',
    },
    mobileHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderBottomWidth: 2,
      padding: 10,
      marginHorizontal: 10,
      backgroundColor: theme.colors.background,
    },
    mobileHeaderText: {
      fontSize: theme.fontSizes.large,
      fontWeight: '500',
      fontFamily: theme.fonts.header.fontFamily,
    },
    
    headerIcon: {
      padding: 8,
      marginLeft: 16,
    },
    searchButton: {
      backgroundColor: theme.colors.primary,
      padding: 10,
      alignItems: 'center',
      borderRadius: 5,
      margin: 10,
    },
    searchButtonText: {
      color: theme.colors.whiteText,
      fontSize: theme.fontSizes.medium + 2,
      fontFamily: theme.fonts.regular.fontFamily,
    },
    mapToggleButton: {
      position: 'absolute',
      top: theme.spacing.medium,
      right: theme.spacing.medium,
      zIndex: 1000,
      backgroundColor: theme.colors.surface,
      padding: theme.spacing.small,
      borderRadius: 8,
      shadowColor: "#000",
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.1,
      shadowRadius: 3,
      elevation: 3,
    },
  });

  const styles = createStyles(screenWidth, isCollapsed, isSignedIn, isMobile);

  const renderContent = () => {
    if (!isSingleView) {
      const leftColumnWidth = isLeftColumnExpanded ? '50%' : '33.333%';
      const mapColumnWidth = isMapMinimized ? '50%' : '66.666%';

      return (
        <>
          <View style={[styles.leftColumn, { width: leftColumnWidth }]}>
            <TouchableOpacity 
              style={[styles.toggleButton, styles.leftColumnToggle]} 
              onPress={toggleLeftColumn}
            >
              <MaterialCommunityIcons 
                name={isLeftColumnExpanded ? "chevron-left" : "chevron-right"} 
                size={24} 
                color={theme.colors.primary} 
              />
            </TouchableOpacity>
            {showingSearch ? (
              <SearchRefiner 
                onFiltersChange={handleFiltersChange}
                onShowProfessionals={handleShowProfessionals}
                onSearchResults={handleSearchResults}
                initialFilters={currentSearchParams}
              />
            ) : (
            <ProfessionalList
              professionals={professionals}
              onLoadMore={handleLoadMore}
              onProfessionalSelect={handleProfessionalSelect}
              isMobile={isMobile}
              filters={activeFilters}
              searchParams={currentSearchParams}
              fallbackMessage={fallbackMessage}
              onFilterPress={(view) => {
                if (view === 'map') {
                  setActiveView('map');
                } else {
                  setShowingSearch(true);
                }
              }}
              onGetMatched={handleGetMatched}
            />
            )}
          </View>
          <View style={[styles.mapColumn, { width: mapColumnWidth }]}>
            <TouchableOpacity 
              style={[styles.toggleButton, styles.mapToggleButton]} 
              onPress={toggleMapSize}
            >
              <MaterialCommunityIcons 
                name={isMapMinimized ? "arrow-expand" : "arrow-collapse"} 
                size={24} 
                color={theme.colors.primary} 
              />
            </TouchableOpacity>
            <MapView
              professionals={professionals}
              onMarkerPress={handleProfessionalSelect}
              onShowServicesModal={handleShowServicesModal}
              region={region}
              isMobile={isMobile}
            />
          </View>
        </>
      );
    }

    // Single view (below 1200px)
    return (
      <View style={styles.containerMobile}>
        {activeView === 'filters' && (
          <>
            <SearchRefiner 
              onFiltersChange={handleFiltersChange} 
              onShowProfessionals={handleShowProfessionals}
              onSearchResults={handleSearchResults}
              isMobile={isSingleView}
              initialFilters={currentSearchParams}
            />
          </>
        )}
        
        {activeView === 'list' && (
          <>
            <ProfessionalList
              professionals={professionals}
              onLoadMore={handleLoadMore}
              onProfessionalSelect={handleProfessionalSelect}
              isMobile={isSingleView}
              filters={activeFilters}
              searchParams={currentSearchParams}
              fallbackMessage={fallbackMessage}
              onFilterPress={(view) => {
                if (view === 'map') {
                  setActiveView('map');
                } else {
                  setActiveView('filters');
                }
              }}
              onGetMatched={handleGetMatched}
            />
          </>
        )}
        
        {activeView === 'map' && (
          <>
            <View style={styles.mobileHeader}>
              <TouchableOpacity onPress={() => setActiveView('list')}>
                <MaterialCommunityIcons name="arrow-left" size={24} color={theme.colors.primary} />
              </TouchableOpacity>
            </View>
            <MapView
              professionals={professionals}
              onMarkerPress={handleProfessionalSelect}
              onShowServicesModal={handleShowServicesModal}
              region={region}
              isMobile={isSingleView}
            />
          </>
        )}
      </View>
    );
  };

  return (
    <View style={styles.mainContainer}>
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          {renderContent()}
        </View>
      </SafeAreaView>
      
    </View>
  );
};

export default SearchProfessionalsListing;

