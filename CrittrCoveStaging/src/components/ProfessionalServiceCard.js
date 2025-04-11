import React, { useContext, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Switch } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../styles/theme';
import { AuthContext } from '../context/AuthContext';

const ProfessionalServiceCard = ({ 
  item, 
  index, 
  onEdit, 
  onDelete 
}) => {
  const { screenWidth } = useContext(AuthContext);
  const [isActive, setIsActive] = useState(true);

  const handleToggleActive = () => {
    setIsActive(!isActive);
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

  return (
    <View style={styles.serviceCard}>
      <View style={styles.cardHeader}>
        <Text style={styles.serviceName}>{item.serviceName}</Text>
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
        </View>
      </View>

      <View style={[styles.ratesContainer, { backgroundColor: getPricingBackgroundColor() }]}>
        <View style={styles.rateRow}>
          <Text style={styles.rateLabel}>Base Rate</Text>
          <Text style={styles.rateValue}>${item.rates.base_rate || 'N/A'}/{item.lengthOfService || 'visit'}</Text>
        </View>
        
        {item.rates.additionalAnimalRate && (
          <View style={styles.rateRow}>
            <Text style={styles.rateLabel}>Additional Animal</Text>
            <Text style={styles.rateValue}>${item.rates.additionalAnimalRate}</Text>
          </View>
        )}
        {item.rates.holidayRate && (
          <View style={styles.rateRow}>
            <Text style={styles.rateLabel}>Holiday Rate</Text>
            <Text style={styles.rateValue}>${item.rates.holidayRate}</Text>
          </View>
        )}
        {item.additionalRates && item.additionalRates.map((rate, idx) => (
          <View key={idx} style={styles.rateRow}>
            <Text style={styles.rateLabel}>{rate.label}</Text>
            <Text style={styles.rateValue}>${rate.value}</Text>
          </View>
        ))}
      </View>
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity onPress={() => onDelete(index)} style={styles.deleteButton}>
          <MaterialCommunityIcons name="trash-can" size={20} color={'#F26969'} />
          <Text style={styles.deleteButtonText}>Delete</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => onEdit(index)} style={styles.editButton}>
          <MaterialCommunityIcons name="pencil" size={20} color={theme.colors.surfaceContrast} />
          <Text style={styles.buttonText}>Edit</Text>
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
    alignItems: 'center',
    marginBottom: 16,
  },
  serviceName: {
    fontSize: theme.fontSizes.large,
    fontWeight: '600',
    color: theme.colors.text,
    fontFamily: theme.fonts.header.fontFamily,
    flex: 1,
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
});

export default ProfessionalServiceCard;