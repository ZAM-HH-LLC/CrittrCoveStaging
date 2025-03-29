import React, { useContext } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
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

  return (
    <View style={styles.serviceCard}>
      <View style={styles.cardHeader}>
        <Text style={styles.serviceName}>{item.serviceName}</Text>
        <View style={styles.actionButtons}>
          <TouchableOpacity onPress={() => onEdit(index)} style={styles.iconButton}>
            <MaterialCommunityIcons name="pencil" size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => onDelete(index)} style={styles.iconButton}>
            <MaterialCommunityIcons name="trash-can" size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>
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
        <View style={styles.expandedRates}>
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
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    padding: 8,
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
});

export default ProfessionalServiceCard;