import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Platform, Dimensions, TouchableOpacity, Text, useWindowDimensions } from 'react-native';
import SearchRefiner from '../components/SearchRefiner';
import ProfessionalList from '../components/ProfessionalList';
import MapView from '../components/MapView';
import { theme } from '../styles/theme';
import { mockProfessionals } from '../data/mockData'; // Import mock data
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

const SearchProfessionalsListing = ({ navigation, route }) => {
  const { width } = useWindowDimensions();
  const isMobile = width < 1000;
  const [activeView, setActiveView] = useState(isMobile ? 'filters' : 'all');
  const [professionals, setProfessionals] = useState(mockProfessionals); // Use mock data
  const [filters, setFilters] = useState({});
  const [region, setRegion] = useState({
    latitude: 38.8339,
    longitude: -104.8214,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });

  useEffect(() => {
    // Update active view when screen size changes
    setActiveView(width < 1000 ? 'filters' : 'all');
  }, [width]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if (isMobile) {
        setActiveView('filters');
      }
    });

    return unsubscribe;
  }, [navigation, isMobile]);

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

  const renderContent = () => {
    if (!isMobile) {
      return (
        <View style={styles.container}>
          <View style={styles.filterColumn}>
            <SearchRefiner onFiltersChange={handleFiltersChange} />
          </View>
          <View style={styles.listColumn}>
            <ProfessionalList
              professionals={professionals}
              onLoadMore={handleLoadMore}
              onProfessionalSelect={handleProfessionalSelect}
            />
          </View>
          <View style={styles.mapColumn}>
            <MapView
              professionals={professionals}
              onMarkerPress={handleProfessionalSelect}
              region={region}
            />
          </View>
        </View>
      );
    }

    // Mobile view
    return (
      <View style={styles.containerMobile}>
        {activeView === 'filters' && (
          <>
            <SearchRefiner onFiltersChange={handleFiltersChange} />
            <TouchableOpacity 
              style={styles.searchButton}
              onPress={() => setActiveView('list')}
            >
              <Text style={styles.searchButtonText}>Search</Text>
            </TouchableOpacity>
          </>
        )}
        
        {activeView === 'list' && (
          <>
            <View style={styles.mobileHeader}>
              <Text style={styles.mobileHeaderText}>Professionals</Text>
              <View style={styles.mobileHeaderRight}>
                <TouchableOpacity onPress={() => setActiveView('filters')} style={styles.headerIcon}>
                  <MaterialCommunityIcons name="filter" size={24} color={theme.colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setActiveView('map')} style={styles.headerIcon}>
                  <MaterialCommunityIcons name="map" size={24} color={theme.colors.primary} />
                </TouchableOpacity>
              </View>
            </View>
            <ProfessionalList
              professionals={professionals}
              onLoadMore={handleLoadMore}
              onProfessionalSelect={handleProfessionalSelect}
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
            />
          </>
        )}
      </View>
    );
  };

  return renderContent();
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: theme.colors.background,
    height: 'calc(100vh - 64px)',
    maxHeight: 'calc(100vh - 64px)',
    overflow: 'hidden',
  },
  column: {
    flex: 1,
  },
  filterColumn: {
    flex: Platform.OS === 'web' ? 0.25 : 1,
    borderRightWidth: 1,
    borderRightColor: theme.colors.border,
    backgroundColor: theme.colors.background,
  },
  listColumn: {
    flex: Platform.OS === 'web' ? 0.4 : 1,
    backgroundColor: theme.colors.background,
    overflow: 'hidden',
    height: '100%',
    maxHeight: '100%',
  },
  mapColumn: {
    flex: Platform.OS === 'web' ? 0.35 : 1,
    borderLeftWidth: 1,
    borderLeftColor: theme.colors.border,
    backgroundColor: theme.colors.background,
  },
  mobileNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: theme.colors.primary,
    padding: 10,
  },
  navButton: {
    flex: 1,
    padding: 10,
    alignItems: 'center',
  },
  activeNavButton: {
    backgroundColor: theme.colors.secondary,
    borderRadius: 5,
  },
  navButtonText: {
    color: theme.colors.whiteText,
    fontSize: theme.fontSizes.medium + 2,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  containerMobile: {
    flex: 1,
    backgroundColor: theme.colors.background,
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
  mobileHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIcon: {
    padding: 8,
    marginLeft: 16,
  },
  mapButton: {
    marginLeft: 20,
  },
  searchButton: {
    backgroundColor: theme.colors.primary,
    padding: 10,
    alignItems: 'center',
    borderRadius: 5,
  },
  searchButtonText: {
    color: theme.colors.whiteText,
    fontSize: theme.fontSizes.medium + 2,
    fontFamily: theme.fonts.regular.fontFamily,
  },
});

export default SearchProfessionalsListing;

