import React, { useState, useEffect, useContext } from 'react';
import { View, StyleSheet, Platform, Dimensions, TouchableOpacity, Text, useWindowDimensions, SafeAreaView } from 'react-native';
import SearchRefiner from '../components/SearchRefiner';
import ProfessionalList from '../components/ProfessionalList';
import MapView from '../components/MapView';
import ProfessionalServicesModal from '../components/ProfessionalServicesModal';
import { theme } from '../styles/theme';
// import { mockProfessionals } from '../data/mockData'; // TODO: Remove mock data after implementing real search
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { AuthContext, debugLog } from '../context/AuthContext';
import BackHeader from '../components/BackHeader';
import { searchProfessionals } from '../api/API';

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
  const [region, setRegion] = useState({
    latitude: 38.8339,
    longitude: -104.8214,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });
  const [activeFilters, setActiveFilters] = useState({
    categories: [],
  });
  const [servicesModalVisible, setServicesModalVisible] = useState(false);
  const [selectedProfessional, setSelectedProfessional] = useState(null);

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
    const unsubscribe = navigation.addListener('focus', () => {
      if (isSingleView) {
        setActiveView('filters');
      }
    });

    return unsubscribe;
  }, [navigation, isSingleView]);

  // Load initial professionals when component mounts
  useEffect(() => {
    loadInitialProfessionals();
  }, []);

  const loadInitialProfessionals = async () => {
    setIsLoading(true);
    try {
      debugLog('MBA9999', 'Loading initial professionals for Colorado Springs');
      
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
      
      const results = await searchProfessionals(searchParams);
      
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

  const handleSearchResults = (results, searchParams = null) => {
    debugLog('MBA9999', 'Received search results:', results);
    setSearchResults(results);
    setProfessionals(results.professionals || []);
    
    if (searchParams) {
      setCurrentSearchParams(searchParams);
      
      // Update active filters based on search parameters
      const filterCategories = generateFilterCategories(searchParams);
      setActiveFilters({
        categories: filterCategories
      });
      
      debugLog('MBA9999', 'Updated active filters:', filterCategories);
      debugLog('MBA9999', 'Search complete: Found ' + (results.professionals?.length || 0) + ' professionals with active filters: ' + filterCategories.join(', '));
    }
  };

  const handleFiltersChange = (newFilters) => {
    setFilters(newFilters);
    // Implement filtering logic here
  };

  const handleLoadMore = () => {
    // Implement pagination logic
  };

  const handleProfessionalSelect = (professional) => {
    // Instead of navigating to profile, show services modal
    setSelectedProfessional(professional);
    setServicesModalVisible(true);
  };

  const handleShowServicesModal = (professional) => {
    setSelectedProfessional(professional);
    setServicesModalVisible(true);
  };

  const handleCloseServicesModal = () => {
    setServicesModalVisible(false);
    setSelectedProfessional(null);
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
              onFilterPress={(view) => {
                if (view === 'map') {
                  setActiveView('map');
                } else {
                  setShowingSearch(true);
                }
              }}
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
              onFilterPress={(view) => {
                if (view === 'map') {
                  setActiveView('map');
                } else {
                  setActiveView('filters');
                }
              }}
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
      
      {/* Professional Services Modal */}
      <ProfessionalServicesModal
        visible={servicesModalVisible}
        onClose={handleCloseServicesModal}
        professional={selectedProfessional}
        primaryService={selectedProfessional?.primary_service}
      />
    </View>
  );
};

export default SearchProfessionalsListing;

