import React, { useState, useEffect, useContext } from 'react';
import { View, StyleSheet, Platform, Dimensions, TouchableOpacity, Text, useWindowDimensions, SafeAreaView } from 'react-native';
import SearchRefiner from '../components/SearchRefiner';
import ProfessionalList from '../components/ProfessionalList';
import MapView from '../components/MapView';
import { theme } from '../styles/theme';
import { mockProfessionals } from '../data/mockData'; // Import mock data
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { AuthContext } from '../context/AuthContext';
import BackHeader from '../components/BackHeader';

const SearchProfessionalsListing = ({ navigation, route }) => {
  const { width: windowWidth } = useWindowDimensions();
  const { screenWidth, isCollapsed, is_DEBUG } = useContext(AuthContext);
  const [isSingleView, setIsSingleView] = useState(screenWidth <= 1200);
  const [isMobile, setIsMobile] = useState(screenWidth <= 900);
  const [activeView, setActiveView] = useState(isSingleView ? 'filters' : 'all');
  const [professionals, setProfessionals] = useState(mockProfessionals); // Use mock data
  const [filters, setFilters] = useState({});
  const [isMapMinimized, setIsMapMinimized] = useState(false);
  const [isLeftColumnExpanded, setIsLeftColumnExpanded] = useState(true);
  const [showingSearch, setShowingSearch] = useState(true);
  const [region, setRegion] = useState({
    latitude: 38.8339,
    longitude: -104.8214,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });
  const [activeFilters, setActiveFilters] = useState({
    categories: ['Dogs', 'Within 5 miles'],
    // Add other filter categories as needed
  });

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

  const handleFiltersChange = (newFilters) => {
    setFilters(newFilters);
    // Implement filtering logic here
  };

  const handleLoadMore = () => {
    // Implement pagination logic
  };

  const handleProfessionalSelect = (professional) => {
    navigation.navigate('ProfessionalProfile', { professional });
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

  const createStyles = (screenWidth, isCollapsed) => StyleSheet.create({
    mainContainer: {
      flex: 1,
      backgroundColor: theme.colors.background,
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      marginLeft: screenWidth > 900 ? (isCollapsed ? 70 : 250) : 0,
      transition: 'margin-left 0.3s ease',
    },
    container: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
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

  const styles = createStyles(screenWidth, isCollapsed);

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
              />
            ) : (
            <ProfessionalList
              professionals={professionals}
              onLoadMore={handleLoadMore}
              onProfessionalSelect={handleProfessionalSelect}
                isMobile={isMobile}
                filters={activeFilters}
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
              isMobile={isSingleView}
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
        {isSingleView && (
          <BackHeader 
            title="Search Results" 
            onBackPress={() => navigation.goBack()}
          />
        )}
        <View style={styles.content}>
          {renderContent()}
        </View>
      </SafeAreaView>
    </View>
  );
};

export default SearchProfessionalsListing;

