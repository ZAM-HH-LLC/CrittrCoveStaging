import React, { useContext } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../styles/theme';
import { SCREEN_WIDTH } from '../context/AuthContext';
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
      <View style={styles.topRow}>
        <Text style={styles.serviceName}>{item.serviceName}</Text>
        <View style={styles.topRowIcons}>
          <TouchableOpacity onPress={() => onDelete(index)} style={styles.iconButton}>
            <MaterialCommunityIcons name="trash-can" size={24} color={theme.colors.error} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => onEdit(index)} style={styles.iconButton}>
            <MaterialCommunityIcons name="pencil" size={24} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>
      </View>
      
      {isCollapsed ? (
        <View style={styles.collapsedContent}>
          <Text style={styles.rateText}>Base Rate: ${item.rates.base_rate || 'N/A'}</Text>
        </View>
      ) : (
        <View style={styles.contentRow}>
          <Text style={[styles.rateText, { 
            fontSize: screenWidth <= 600 ? theme.fontSizes.small : theme.fontSizes.medium 
          }]}>Base Rate: ${item.rates.base_rate || 'N/A'}</Text>
          <Text style={[styles.rateText, { 
            fontSize: screenWidth <= 600 ? theme.fontSizes.small : theme.fontSizes.medium 
          }]}>Additional Animal: ${item.rates.additionalAnimalRate || 'N/A'}</Text>
          <Text style={[styles.rateText, { 
            fontSize: screenWidth <= 600 ? theme.fontSizes.small : theme.fontSizes.medium 
          }]}>Holiday Rate: ${item.rates.holidayRate || 'N/A'}</Text>
          {item.additionalRates && item.additionalRates.map((rate, idx) => (
            <Text key={idx} style={[styles.rateText, { 
              fontSize: screenWidth <= 600 ? theme.fontSizes.small : theme.fontSizes.medium 
            }]}>
              {rate.label}: ${rate.value} {rate.description ? `(${rate.description})` : ''}
            </Text>
          ))}
          <Text style={[styles.rateText, { 
            fontSize: screenWidth <= 600 ? theme.fontSizes.small : theme.fontSizes.medium 
          }]}>Duration: {item.lengthOfService || 'N/A'}</Text>
        </View>
      )}

      <TouchableOpacity 
        onPress={() => onToggleCollapse(index)} 
        style={styles.collapseButton}
      >
        <MaterialCommunityIcons 
          name={isCollapsed ? "chevron-down" : "chevron-up"} 
          size={24} 
          color={theme.colors.primary} 
        />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  serviceCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginVertical: 8,
    padding: 12,
    position: 'relative',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  serviceName: {
    fontSize: theme.fontSizes.medium,
    color: theme.colors.primary,
    fontWeight: 'bold',
  },
  topRowIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    padding: 4,
  },
  contentRow: {
    gap: 4,
  },
  collapsedContent: {
    marginTop: 4,
  },
  rateText: {
    color: theme.colors.text,
  },
  collapseButton: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    padding: 4,
  },
});

export default ProfessionalServiceCard;