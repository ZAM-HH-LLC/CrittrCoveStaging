import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { theme } from '../styles/theme';
import { BACKEND_TO_FRONTEND_TIME_UNIT } from '../data/mockData';

const MapMarkerPopup = ({ professional, onViewDetails, onClose }) => {
  const formatTimeUnit = (unit) => {
    return BACKEND_TO_FRONTEND_TIME_UNIT[unit] || unit;
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.closeButton} onPress={onClose}>
        <Text style={styles.closeText}>×</Text>
      </TouchableOpacity>
      
      <Text style={styles.name}>{professional.name}</Text>
      <Text style={styles.location}>{professional.location}</Text>
      <Text style={styles.service}>{professional.primary_service?.service_name}</Text>
      <Text style={styles.price}>
        from ${professional.primary_service?.price_per_visit || 'N/A'}/{formatTimeUnit(professional.primary_service?.unit_of_time || 'visit')}
      </Text>
      
      <TouchableOpacity style={styles.detailsButton} onPress={onViewDetails}>
        <Text style={styles.detailsButtonText}>View Details</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    padding: 16,
    borderRadius: 12,
    minWidth: 250,
    maxWidth: 300,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  closeText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text,
    lineHeight: 16,
  },
  name: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4,
    fontFamily: theme.fonts.header.fontFamily,
    paddingRight: 32, // Make room for close button
  },
  location: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 8,
  },
  service: {
    fontSize: 14,
    color: theme.colors.text,
    marginBottom: 4,
    fontWeight: '500',
  },
  price: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.primary,
    marginBottom: 12,
  },
  detailsButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  detailsButtonText: {
    color: theme.colors.whiteText,
    fontSize: 14,
    fontWeight: '500',
  },
});

export default MapMarkerPopup; 