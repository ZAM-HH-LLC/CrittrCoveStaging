import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { theme } from '../styles/theme';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icons in Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

const MapView = ({ professionals, onMarkerPress, region, isMobile }) => {
  if (Platform.OS === 'web') {
    return (
      <WebMapComponent
        professionals={professionals}
        onMarkerPress={onMarkerPress}
        region={region}
        isMobile={isMobile}
      />
    );
  }

  return (
    <NativeMapComponent
      professionals={professionals}
      onMarkerPress={onMarkerPress}
      region={region}
      isMobile={isMobile}
    />
  );
};

const WebMapComponent = ({ professionals, onMarkerPress, region, isMobile }) => {
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

  return (
    <div style={styles.mapContainer}>
      <MapContainer
        center={[region.latitude, region.longitude]}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        {professionals.map((professional, index) => (
          <Marker
            key={professional.id}
            position={[professional.coordinates.latitude, professional.coordinates.longitude]}
            icon={MarkerIcon}
            eventHandlers={{
              click: () => onMarkerPress(professional),
            }}
          >
            <Popup>
              <div style={styles.popupContent}>
                <h3 style={{
                  margin: '0 0 8px 0',
                  fontSize: '16px',
                  fontWeight: '600',
                  fontFamily: theme.fonts.header.fontFamily,
                }}>{professional.name}</h3>
                <p style={{
                  margin: '0 0 4px 0',
                  fontSize: '14px',
                  color: theme.colors.textSecondary,
                }}>{professional.location}</p>
                <p style={{
                  margin: '0',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: theme.colors.primary,
                }}>from ${professional.startingRate}/night</p>
              </div>
            </Popup>
          </Marker>
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
    padding: 12,
    minWidth: 200,
  },
});

export default MapView;