import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import { theme } from '../styles/theme';
import { BACKEND_TO_FRONTEND_TIME_UNIT } from '../data/mockData';

// Conditional import for react-native-maps (iOS/Android only)
let ReactNativeMapView, RNMarker, Callout, PROVIDER_GOOGLE;
if (Platform.OS !== 'web') {
  try {
    const maps = require('react-native-maps');
    ReactNativeMapView = maps.default || maps.MapView;
    RNMarker = maps.Marker;
    Callout = maps.Callout;
    PROVIDER_GOOGLE = maps.PROVIDER_GOOGLE;
  } catch (error) {
    console.warn('Failed to load react-native-maps:', error);
  }
}

// Conditional imports for web-only libraries
let MapContainer, TileLayer, Marker, Popup, useMap, L;
if (Platform.OS === 'web') {
  try {
    const reactLeaflet = require('react-leaflet');
    MapContainer = reactLeaflet.MapContainer;
    TileLayer = reactLeaflet.TileLayer;
    Marker = reactLeaflet.Marker;
    Popup = reactLeaflet.Popup;
    useMap = reactLeaflet.useMap;
    
    L = require('leaflet');
    require('leaflet/dist/leaflet.css');
  } catch (error) {
    console.warn('Failed to load Leaflet libraries:', error);
  }
}

// Fix for default marker icons in Leaflet (web only)
if (Platform.OS === 'web' && L) {
  try {
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
      iconUrl: require('leaflet/dist/images/marker-icon.png'),
      shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
    });
  } catch (error) {
    console.warn('Failed to configure Leaflet icons:', error);
  }
}

const MapViewComponent = ({ professionals, onMarkerPress, region, isMobile, onShowServicesModal }) => {
  if (Platform.OS === 'web') {
    return (
      <WebMapComponent
        professionals={professionals}
        onMarkerPress={onMarkerPress}
        region={region}
        isMobile={isMobile}
        onShowServicesModal={onShowServicesModal}
      />
    );
  }

  return (
    <NativeMapComponent
      professionals={professionals}
      onMarkerPress={onMarkerPress}
      region={region}
      isMobile={isMobile}
      onShowServicesModal={onShowServicesModal}
    />
  );
};

// Custom marker component that handles hover behavior
const HoverMarker = ({ professional, onShowServicesModal }) => {
  const markerRef = useRef(null);
  const popupRef = useRef(null);

  // Return null if Leaflet is not available
  if (!L || !Marker || !Popup) {
    return null;
  }

  const MarkerIcon = L.divIcon({
    className: 'custom-marker',
    html: `<div style="
    width: 32px;
    height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
  ">
    <svg viewBox="0 0 24 24" width="32" height="32">
      <path fill="${theme.colors.primary}" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
    </svg>
  </div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });

  const formatTimeUnit = (unit) => {
    return BACKEND_TO_FRONTEND_TIME_UNIT[unit] || unit;
  };

  const handleViewDetails = () => {
    if (onShowServicesModal) {
      onShowServicesModal(professional);
    }
  };

  const handleMarkerClick = (e) => {
    // Prevent event bubbling and ensure popup opens properly
    e.originalEvent?.stopPropagation();
    
    // Small delay to ensure marker position is properly set before opening popup
    setTimeout(() => {
      if (markerRef.current && popupRef.current) {
        markerRef.current.openPopup();
      }
    }, 10);
  };

  useEffect(() => {
    const marker = markerRef.current;
    if (marker) {
      const leafletMarker = marker.getElement ? marker : marker._leaflet_marker;
      
      if (leafletMarker) {
        leafletMarker.on('mouseover', () => {
          if (popupRef.current) {
            popupRef.current.openOn(marker._map);
          }
        });
      }
    }
  }, []);

  // Ensure coordinates exist and are valid
  if (!professional.coordinates || 
      typeof professional.coordinates.latitude !== 'number' || 
      typeof professional.coordinates.longitude !== 'number') {
    return null;
  }

  const position = [professional.coordinates.latitude, professional.coordinates.longitude];

  return (
    <Marker
      ref={markerRef}
      position={position}
      icon={MarkerIcon}
      eventHandlers={{
        click: handleMarkerClick,
      }}
    >
      <Popup
        ref={popupRef}
        closeButton={true}
        autoClose={false}
        closeOnClick={false}
        closeOnEscapeKey={true}
      >
        <div style={{
          padding: '16px',
          minWidth: '250px',
          maxWidth: '300px',
          fontFamily: 'system-ui, -apple-system, sans-serif'
        }}>
          <h3 style={{
            margin: '0 0 8px 0',
            fontSize: '18px',
            fontWeight: '600',
            color: '#1a1a1a'
          }}>{professional.name}</h3>
          <p style={{
            margin: '0 0 4px 0',
            fontSize: '14px',
            color: '#666'
          }}>{professional.location}</p>
          <p style={{
            margin: '0 0 8px 0',
            fontSize: '14px',
            color: '#1a1a1a',
            fontWeight: '500'
          }}>{professional.primary_service?.service_name}</p>
          <p style={{
            margin: '0 0 12px 0',
            fontSize: '16px',
            fontWeight: '600',
            color: theme.colors.primary
          }}>from ${professional.primary_service?.price_per_visit || 'N/A'}/{formatTimeUnit(professional.primary_service?.unit_of_time || 'visit')}</p>
          <button 
            style={{
              backgroundColor: theme.colors.primary,
              color: 'white',
              border: 'none',
              padding: '10px 16px',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              width: '100%'
            }}
            onClick={handleViewDetails}
          >
            View Details
          </button>
        </div>
      </Popup>
    </Marker>
  );
};

const WebMapComponent = ({ professionals, onMarkerPress, region, isMobile, onShowServicesModal }) => {
  // Return fallback if Leaflet libraries failed to load
  if (!MapContainer || !TileLayer || !Marker || !Popup || !L) {
    return (
      <View style={styles.container}>
        <View style={styles.fallbackContainer}>
          <Text style={styles.fallbackText}>Map not available</Text>
        </View>
      </View>
    );
  }

  const formatTimeUnit = (unit) => {
    return BACKEND_TO_FRONTEND_TIME_UNIT[unit] || unit;
  };

  const handleViewDetails = (professional) => {
    if (onShowServicesModal) {
      onShowServicesModal(professional);
    }
  };

  // Calculate map bounds and center based on professionals
  const calculateMapBounds = () => {
    const validProfessionals = professionals.filter(professional => 
      professional.coordinates && 
      professional.coordinates.latitude && 
      professional.coordinates.longitude
    );

    if (validProfessionals.length === 0) {
      // Default to provided region if no professionals
      return {
        center: [region.latitude, region.longitude],
        zoom: 13
      };
    }

    if (validProfessionals.length === 1) {
      // Single professional - center on them
      const prof = validProfessionals[0];
      return {
        center: [prof.coordinates.latitude, prof.coordinates.longitude],
        zoom: 14
      };
    }

    // Multiple professionals - calculate bounds
    const lats = validProfessionals.map(p => p.coordinates.latitude);
    const lngs = validProfessionals.map(p => p.coordinates.longitude);
    
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    const centerLat = (minLat + maxLat) / 2;
    const centerLng = (minLng + maxLng) / 2;

    // Calculate zoom level based on bounds
    const latDiff = maxLat - minLat;
    const lngDiff = maxLng - minLng;
    const maxDiff = Math.max(latDiff, lngDiff);

    let zoom = 13;
    if (maxDiff > 0.5) zoom = 10;
    else if (maxDiff > 0.2) zoom = 11;
    else if (maxDiff > 0.1) zoom = 12;
    else if (maxDiff > 0.05) zoom = 13;
    else zoom = 14;

    return {
      center: [centerLat, centerLng],
      zoom: zoom
    };
  };

  const mapBounds = calculateMapBounds();

  return (
    <View style={styles.mapContainer}>
      <MapContainer
        center={mapBounds.center}
        zoom={mapBounds.zoom}
        style={{ height: '100%', width: '100%' }}
        key={`${mapBounds.center[0]}-${mapBounds.center[1]}-${mapBounds.zoom}`}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        {professionals.filter(professional => 
          professional.coordinates && 
          professional.coordinates.latitude && 
          professional.coordinates.longitude
        ).map((professional, index) => (
          <HoverMarker
            key={professional.professional_id}
            professional={professional}
            onShowServicesModal={onShowServicesModal}
          />
        ))}
      </MapContainer>
    </View>
  );
};

const NativeMapComponent = ({ professionals, onMarkerPress, region, isMobile, onShowServicesModal }) => {
  const [mapReady, setMapReady] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  
  // Debug logging for Android
  console.log('NativeMapComponent - Platform:', Platform.OS);
  console.log('NativeMapComponent - ReactNativeMapView available:', !!ReactNativeMapView);
  console.log('NativeMapComponent - RNMarker available:', !!RNMarker);
  console.log('NativeMapComponent - Callout available:', !!Callout);
  console.log('NativeMapComponent - PROVIDER_GOOGLE available:', !!PROVIDER_GOOGLE);
  
  // Return fallback if react-native-maps failed to load
  if (!ReactNativeMapView || !RNMarker || !Callout) {
    console.log('NativeMapComponent - Returning fallback due to missing components');
    return (
      <View style={styles.container}>
        <View style={styles.fallbackContainer}>
          <Text style={styles.fallbackText}>Map not available - missing components</Text>
          <Text style={styles.fallbackText}>
            MapView: {ReactNativeMapView ? '✓' : '✗'} | 
            Marker: {RNMarker ? '✓' : '✗'} | 
            Callout: {Callout ? '✓' : '✗'}
          </Text>
        </View>
      </View>
    );
  }

  const formatTimeUnit = (unit) => {
    return BACKEND_TO_FRONTEND_TIME_UNIT[unit] || unit;
  };

  // Calculate map region based on professionals
  const calculateMapRegion = () => {
    const validProfessionals = professionals.filter(professional => 
      professional.coordinates && 
      professional.coordinates.latitude && 
      professional.coordinates.longitude
    );

    if (validProfessionals.length === 0) {
      // Default to provided region if no professionals
      return {
        latitude: region.latitude,
        longitude: region.longitude,
        latitudeDelta: region.latitudeDelta || 0.0922,
        longitudeDelta: region.longitudeDelta || 0.0421,
      };
    }

    if (validProfessionals.length === 1) {
      // Single professional - center on them
      const prof = validProfessionals[0];
      return {
        latitude: prof.coordinates.latitude,
        longitude: prof.coordinates.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
    }

    // Multiple professionals - calculate bounds
    const lats = validProfessionals.map(p => p.coordinates.latitude);
    const lngs = validProfessionals.map(p => p.coordinates.longitude);
    
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    const latitudeDelta = (maxLat - minLat) * 1.3; // Add 30% padding
    const longitudeDelta = (maxLng - minLng) * 1.3; // Add 30% padding

    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: Math.max(latitudeDelta, 0.01), // Minimum delta
      longitudeDelta: Math.max(longitudeDelta, 0.01), // Minimum delta
    };
  };

  const mapRegion = calculateMapRegion();
  console.log('NativeMapComponent - Map region:', mapRegion);
  console.log('NativeMapComponent - Professionals count:', professionals.length);
  
  // Add more detailed logging for Android
  if (Platform.OS === 'android') {
    console.log('Android Map Debug - Region details:', {
      latitude: mapRegion.latitude,
      longitude: mapRegion.longitude,
      latitudeDelta: mapRegion.latitudeDelta,
      longitudeDelta: mapRegion.longitudeDelta,
      isValidLatitude: mapRegion.latitude >= -90 && mapRegion.latitude <= 90,
      isValidLongitude: mapRegion.longitude >= -180 && mapRegion.longitude <= 180,
      isValidDeltas: mapRegion.latitudeDelta > 0 && mapRegion.longitudeDelta > 0
    });
  }

    const handleLayout = (event) => {
      const { width, height } = event.nativeEvent.layout;
      console.log('Container layout:', { width, height });
      setDimensions({ width, height });
    };

    const handleMapReady = () => {
      console.log('Map is ready!');
      setMapReady(true);
    };

    return (
    <View style={styles.container} onLayout={handleLayout}>
      {Platform.OS === 'android' && dimensions.width === 0 ? (
        <View style={styles.fallbackContainer}>
          <Text style={styles.fallbackText}>Loading map...</Text>
        </View>
      ) : (
        <ReactNativeMapView
          key={Platform.OS === 'android' ? `android-map-${dimensions.width}-${dimensions.height}` : 'ios-map'}
          style={[styles.map, Platform.OS === 'android' && { width: dimensions.width, height: dimensions.height }]}
          {...(Platform.OS === 'android' ? { region: mapRegion } : { initialRegion: mapRegion })}
          provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
          showsUserLocation={false}
          showsMyLocationButton={false}
          mapType="standard"
          loadingEnabled={false}
          moveOnMarkerPress={false}
          showsCompass={false}
          showsScale={false}
          showsBuildings={true}
          showsTraffic={false}
          showsIndoors={true}
          onMapReady={handleMapReady}
          onError={(error) => console.log('Map error:', error)}
          onLayout={() => console.log('Map layout complete')}
          onRegionChangeComplete={(region) => console.log('Region changed:', region)}
        >
        {professionals.filter(professional => 
          professional.coordinates && 
          professional.coordinates.latitude && 
          professional.coordinates.longitude
        ).map((professional, index) => (
          <RNMarker
            key={professional.professional_id}
            coordinate={{
              latitude: professional.coordinates.latitude,
              longitude: professional.coordinates.longitude,
            }}
            title={professional.name}
            description={professional.primary_service?.service_name}
            onPress={() => onMarkerPress && onMarkerPress(professional)}
          >
            {Platform.OS === 'ios' && (
              <View style={styles.customMarker}>
                <View style={styles.markerPin}>
                  <View style={styles.markerInner} />
                </View>
              </View>
            )}
            <Callout onPress={() => onShowServicesModal && onShowServicesModal(professional)}>
              <View style={styles.calloutContainer}>
                <Text style={styles.calloutTitle}>{professional.name}</Text>
                <Text style={styles.calloutLocation}>{professional.location}</Text>
                <Text style={styles.calloutService}>{professional.primary_service?.service_name}</Text>
                <Text style={styles.calloutPrice}>
                  from ${professional.primary_service?.price_per_visit || 'N/A'}/{formatTimeUnit(professional.primary_service?.unit_of_time || 'visit')}
                </Text>
                <TouchableOpacity 
                  style={styles.calloutButton}
                  onPress={() => onShowServicesModal && onShowServicesModal(professional)}
                >
                  <Text style={styles.calloutButtonText}>View Details</Text>
                </TouchableOpacity>
              </View>
            </Callout>
          </RNMarker>
        ))}
        </ReactNativeMapView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    height: '100%',
    width: '100%',
    overflow: 'hidden',
  },
  mapContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
    height: '100%',
    width: '100%',
    overflow: 'hidden',
  },
  map: {
    flex: 1,
    height: '100%',
    width: '100%',
  },
  markerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerPin: {
    width: 30,
    height: 30,
    backgroundColor: theme.colors.primary,
    borderRadius: 15,
    borderWidth: 3,
    borderColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  markerInner: {
    width: 12,
    height: 12,
    backgroundColor: 'white',
    borderRadius: 6,
  },
  markerText: {
    color: theme.colors.whiteText,
    fontWeight: 'bold',
  },
  calloutContainer: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.medium,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    minWidth: 200,
    maxWidth: 250,
  },
  calloutTitle: {
    fontSize: theme.fontSizes.medium,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4,
  },
  calloutLocation: {
    fontSize: theme.fontSizes.small,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  calloutService: {
    fontSize: theme.fontSizes.small,
    color: theme.colors.text,
    fontWeight: '500',
    marginBottom: 4,
  },
  calloutPrice: {
    fontSize: theme.fontSizes.medium,
    fontWeight: '600',
    color: theme.colors.primary,
    marginBottom: 8,
  },
  calloutButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  calloutButtonText: {
    color: theme.colors.whiteText,
    fontSize: theme.fontSizes.small,
    fontWeight: '500',
  },
  calloutText: {
    color: theme.colors.text,
    fontSize: theme.fontSizes.small,
  },
  popupContent: {
    padding: 16,
    minWidth: 250,
    maxWidth: 300,
  },
  popupTitle: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: theme.fonts.header.fontFamily,
    color: theme.colors.text,
    marginBottom: 8,
  },
  popupLocation: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  popupService: {
    fontSize: 14,
    color: theme.colors.text,
    fontWeight: '500',
    marginBottom: 8,
  },
  popupPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.primary,
    marginBottom: 12,
  },
  popupButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  popupButtonText: {
    color: theme.colors.whiteText,
    fontSize: 14,
    fontWeight: '500',
  },
  fallbackContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  fallbackText: {
    fontSize: theme.fontSizes.medium,
    color: theme.colors.textSecondary,
  },
  customMarker: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default MapViewComponent;