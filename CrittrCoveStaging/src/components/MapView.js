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

const MapView = ({ professionals, onMarkerPress, region }) => {
  if (Platform.OS === 'web') {
    return (
      <WebMapComponent
        professionals={professionals}
        onMarkerPress={onMarkerPress}
        region={region}
      />
    );
  }

  return (
    <NativeMapComponent
      professionals={professionals}
      onMarkerPress={onMarkerPress}
      region={region}
    />
  );
};

const WebMapComponent = ({ professionals, onMarkerPress, region }) => {
  const NumberedMarkerIcon = (number) => {
    return L.divIcon({
      className: 'custom-marker',
      html: `<div style="
        background-color: ${theme.colors.primary};
        color: white;
        width: 24px;
        height: 24px;
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
      ">${number}</div>`,
    });
  };

  return (
    <div style={styles.mapContainer}>
      <MapContainer
        center={[region.latitude, region.longitude]}
        zoom={13}
        style={{ height: 'calc(100vh - 64px)', width: '100%' }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        {professionals.map((professional, index) => (
          <Marker
            key={professional.id}
            position={[professional.coordinates.latitude, professional.coordinates.longitude]}
            icon={NumberedMarkerIcon(index + 1)}
            eventHandlers={{
              click: () => onMarkerPress(professional),
            }}
          >
            <Popup>
              <div style={styles.popupContent}>
                <h3>{index + 1}. {professional.name}</h3>
                <p>{professional.location}</p>
                <p>Starting at ${professional.startingRate}/night</p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};

const NativeMapComponent = ({ professionals, onMarkerPress, region }) => {
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
    borderLeftWidth: 1,
    borderLeftColor: theme.colors.border,
    // height: 'calc(100vh - 64px)',
  },
  map: {
    flex: 1,
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
    padding: 10,
  },
});

export default MapView;