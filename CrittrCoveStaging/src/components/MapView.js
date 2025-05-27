import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { theme } from '../styles/theme';
import { BACKEND_TO_FRONTEND_TIME_UNIT } from '../data/mockData';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icons in Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

const MapView = ({ professionals, onMarkerPress, region, isMobile, onShowServicesModal }) => {
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

  return (
    <Marker
      ref={markerRef}
      position={[professional.coordinates.latitude, professional.coordinates.longitude]}
      icon={MarkerIcon}
    >
      <Popup
        ref={popupRef}
        closeButton={true}
        autoClose={false}
        closeOnClick={false}
        closeOnEscapeKey={true}
      >
        <div style={styles.popupContent}>
          <h3 style={{
            margin: '0 0 8px 0',
            fontSize: '18px',
            fontWeight: '600',
            fontFamily: theme.fonts.header.fontFamily,
            color: theme.colors.text,
          }}>{professional.name}</h3>
          <p style={{
            margin: '0 0 4px 0',
            fontSize: '14px',
            color: theme.colors.textSecondary,
          }}>{professional.location}</p>
          <p style={{
            margin: '0 0 8px 0',
            fontSize: '14px',
            color: theme.colors.text,
            fontWeight: '500',
          }}>{professional.primary_service?.service_name}</p>
          <p style={{
            margin: '0 0 12px 0',
            fontSize: '16px',
            fontWeight: '600',
            color: theme.colors.primary,
          }}>from ${professional.primary_service?.price_per_visit || 'N/A'}/{formatTimeUnit(professional.primary_service?.unit_of_time || 'visit')}</p>
          <button 
            style={{
              backgroundColor: theme.colors.primary,
              color: theme.colors.whiteText,
              border: 'none',
              padding: '10px 16px',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              width: '100%',
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
    <div style={styles.mapContainer}>
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
    </div>
  );
};

const NativeMapComponent = ({ professionals, onMarkerPress, region, isMobile }) => {
  return (
    <View style={styles.mapContainer}>
      {/* Implement native map component here if needed */}
    </View>
  );
};

const styles = StyleSheet.create({
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
    backgroundColor: theme.colors.primary,
    borderRadius: 20,
    padding: theme.spacing.small,
    borderWidth: 2,
    borderColor: 'white',
  },
  markerText: {
    color: theme.colors.whiteText,
    fontWeight: 'bold',
  },
  calloutContainer: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.small,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
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
});

export default MapView;