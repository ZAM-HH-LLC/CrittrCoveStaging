import React, { useContext, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Switch } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../styles/theme';
import { AuthContext } from '../context/AuthContext';

const ProfessionalServiceCard = ({ 
  item, 
  index, 
  isCollapsed, 
  onEdit, 
  onDelete, 
  onToggleCollapse 
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
      theme.colors.proDashboard.main, // Light green
      theme.colors.proDashboard.secondary, // Light blue
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

      <View style={styles.rateContainer}>
        <Text style={styles.baseRateText}>Base Rate: ${item.rates.base_rate || 'N/A'}/{item.lengthOfService || 'visit'}</Text>
      </View>

      <TouchableOpacity 
        onPress={() => onToggleCollapse(index)}
        style={styles.additionalRatesContainer}
      >
        <Text style={styles.viewRatesText}>View Additional Rates</Text>
        <MaterialCommunityIcons 
          name={isCollapsed ? "chevron-down" : "chevron-up"} 
          size={20} 
          color={theme.colors.textSecondary} 
        />
      </TouchableOpacity>

      {!isCollapsed && (
        <View style={[styles.expandedRates, { backgroundColor: getPricingBackgroundColor() }]}>
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
      )}
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity onPress={() => onDelete(index)} style={styles.deleteButton}>
          <MaterialCommunityIcons name="trash-can" size={20} color={theme.colors.textSecondary} />
          <Text style={styles.deleteButtonText}>Delete</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => onEdit(index)} style={styles.editButton}>
          <MaterialCommunityIcons name="pencil" size={20} color={theme.colors.textSecondary} />
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
    marginBottom: 12,
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
  rateContainer: {
    marginBottom: 12,
  },
  baseRateText: {
    fontSize: theme.fontSizes.medium,
    color: theme.colors.text,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  additionalRatesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  viewRatesText: {
    fontSize: theme.fontSizes.medium,
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  expandedRates: {
    marginTop: 12,
    gap: 8,
    padding: 12,
    borderRadius: 8,
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
    marginTop: 16,
    gap: 8,
  },
  editButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.proDashboard.main,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  deleteButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgb(253, 199, 199)', //rgb(245, 156, 156)
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  buttonText: {
    fontSize: theme.fontSizes.medium,
    color: theme.colors.text,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  deleteButtonText: {
    fontSize: theme.fontSizes.medium,
    color: theme.colors.black,
    fontFamily: theme.fonts.regular.fontFamily,
  },
});

export default ProfessionalServiceCard;