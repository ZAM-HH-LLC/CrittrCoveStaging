import React, { useContext, useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Switch } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../styles/theme';
import { AuthContext } from '../context/AuthContext';
import { debugLog } from '../context/AuthContext';

const ProfessionalServiceCard = ({ 
  item, 
  index, 
  onEdit, 
  onDelete,
  onUnarchive
}) => {
  const { screenWidth } = useContext(AuthContext);
  const [isActive, setIsActive] = useState(item.is_active !== false); // Default to true if not specified
  
  // Log the item data when it changes
  useEffect(() => {
    debugLog('MBA3377', 'ProfessionalServiceCard Item Data:', item);
  }, [item]);

  const handleToggleActive = () => {
    setIsActive(!isActive);
    // Here you would normally update this to the backend
  };

  // Determine background color for pricing section based on service type
  const getPricingBackgroundColor = () => {
    // This will cycle through different colors based on the index
    const colors = [
      // theme.colors.proDashboard.main, // Light green
      // theme.colors.proDashboard.secondary, // Light blue
      // theme.colors.proDashboard.tertiary, // Light orange
    ];
    return colors[index % colors.length];
  };

  // Format the display of unit of time in a user-friendly way
  const formatUnitOfTime = (unitOfTime) => {
    if (!unitOfTime) return 'visit';
    
    // If we receive a nicely formatted unit of time from the backend, use it
    return unitOfTime;
  };

  // Check if service is archived
  const isArchived = item.is_archived || false;

  return (
    <View style={[styles.serviceCard, isArchived && styles.archivedCard]}>
      {isArchived && (
        <View style={styles.archivedOverlay}>
          <Text style={styles.archivedText}>Archived due to past bookings</Text>
          <TouchableOpacity 
            onPress={onUnarchive} 
            style={styles.unarchiveButton}
          >
            <MaterialCommunityIcons name="restore" size={16} color={theme.colors.primary} />
            <Text style={styles.unarchiveButtonText}>Unarchive</Text>
          </TouchableOpacity>
        </View>
      )}
      
      <View style={[styles.cardHeader, isArchived && styles.archivedContent]}>
        <Text style={[styles.serviceName, isArchived && styles.archivedText]} numberOfLines={2} ellipsizeMode="tail">{item.serviceName}</Text>
        {/* TODO: Add back in after MVP and make it the primary toggle instead of active. 
        <View style={styles.activeToggleContainer}>
          <Text style={isActive ? styles.activeText : styles.inactiveText}>
            {isActive ? 'Active' : 'Inactive'}
          </Text>
          <Switch
            value={isActive}
            onValueChange={handleToggleActive}
            trackColor={{
              false: theme.colors.quaternary, 
              true: theme.colors.primary
            }}
            thumbColor={theme.colors.surfaceContrast}
            style={styles.switch}
          />
        </View> */}
      </View>

      <View style={[styles.ratesContainer, { backgroundColor: getPricingBackgroundColor() }, isArchived && styles.archivedContent]}>
        <View style={styles.rateRow}>
          <Text style={[styles.rateLabel, isArchived && styles.archivedText]}>Base Rate</Text>
          <Text style={[styles.rateValue, isArchived && styles.archivedText]}>${item.rates.base_rate || 'N/A'}/{formatUnitOfTime(item.lengthOfService)}</Text>
        </View>
        
        {item.rates.additionalAnimalRate && (
          <View style={styles.rateRow}>
            <Text style={[styles.rateLabel, isArchived && styles.archivedText]}>Additional Animal</Text>
            <Text style={[styles.rateValue, isArchived && styles.archivedText]}>${item.rates.additionalAnimalRate}</Text>
          </View>
        )}
        {/* {item.rates.holidayRate && (
          <View style={styles.rateRow}>
            <Text style={[styles.rateLabel, isArchived && styles.archivedText]}>Holiday Rate</Text>
            <Text style={[styles.rateValue, isArchived && styles.archivedText]}>{item.rates.holidayRate}</Text>
          </View>
        )} */}
        {item.additionalRates && item.additionalRates.map((rate, idx) => (
          <View key={idx} style={styles.rateRow}>
            <Text style={[styles.rateLabel, isArchived && styles.archivedText]}>{rate.label}</Text>
            <Text style={[styles.rateValue, isArchived && styles.archivedText]}>${rate.value}</Text>
          </View>
        ))}
      </View>
      
      <View style={[styles.buttonContainer, isArchived && styles.archivedContent]}>
        <TouchableOpacity 
          onPress={() => onDelete(index)} 
          style={[styles.deleteButton, isArchived && styles.archivedButton]}
          disabled={isArchived}
        >
          <MaterialCommunityIcons 
            name="trash-can" 
            size={20} 
            color={isArchived ? theme.colors.quaternary : '#F26969'} 
          />
          <Text style={[styles.deleteButtonText, isArchived && styles.archivedButtonText]}>Delete</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          onPress={() => onEdit(index)} 
          style={[styles.editButton, isArchived && styles.archivedButton]}
          disabled={isArchived}
        >
          <MaterialCommunityIcons 
            name="pencil" 
            size={20} 
            color={isArchived ? theme.colors.quaternary : theme.colors.surfaceContrast} 
          />
          <Text style={[styles.buttonText, isArchived && styles.archivedButtonText]}>Edit</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  serviceCard: {
    backgroundColor: theme.colors.surfaceContrast,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    display: 'flex',
    justifyContent: 'center',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  serviceName: {
    fontSize: theme.fontSizes.large,
    fontWeight: '600',
    color: theme.colors.text,
    fontFamily: theme.fonts.header.fontFamily,
    flex: 1,
    flexWrap: 'wrap',
    marginRight: 8,
  },
  activeToggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  activeText: {
    fontSize: theme.fontSizes.smallMedium,
    color: theme.colors.primary,
    fontFamily: theme.fonts.regular.fontFamily,
    fontWeight: '600',
  },
  inactiveText: {
    fontSize: theme.fontSizes.smallMedium,
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  switch: {
    transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }],
  },
  ratesContainer: {
    gap: 12,
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  rateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  rateLabel: {
    fontSize: theme.fontSizes.medium,
    color: theme.colors.text,
    fontFamily: theme.fonts.regular.fontFamily,
    fontWeight: '500',
  },
  rateValue: {
    fontSize: theme.fontSizes.medium,
    color: theme.colors.text,
    fontWeight: '500',
    fontFamily: theme.fonts.regular.fontFamily,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  editButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  deleteButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: '#F26969',
    borderWidth: 1,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  buttonText: {
    fontSize: theme.fontSizes.medium,
    color: theme.colors.surfaceContrast,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  deleteButtonText: {
    fontSize: theme.fontSizes.medium,
    fontWeight: '600',
    color: '#F26969',
    fontFamily: theme.fonts.regular.fontFamily,
  },
  // Archived service styles
  archivedCard: {
    opacity: 0.6,
    backgroundColor: theme.colors.quaternary,
  },
  archivedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    zIndex: 1,
    gap: 8,
  },
  archivedText: {
    color: theme.colors.tertiary,
    fontSize: theme.fontSizes.medium,
    fontWeight: '600',
    textAlign: 'center',
    fontFamily: theme.fonts.regular.fontFamily,
  },
  unarchiveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  unarchiveButtonText: {
    color: theme.colors.primary,
    fontSize: theme.fontSizes.small,
    fontWeight: '600',
    fontFamily: theme.fonts.regular.fontFamily,
  },
  archivedContent: {
    opacity: 0.4,
  },
  archivedButton: {
    opacity: 0.3,
  },
  archivedButtonText: {
    color: theme.colors.quaternary,
  },
});

export default ProfessionalServiceCard;