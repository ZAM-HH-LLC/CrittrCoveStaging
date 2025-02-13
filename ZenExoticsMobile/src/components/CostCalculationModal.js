import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Switch,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import DatePicker from './DatePicker';
import { theme } from '../styles/theme';
import { MaterialIcons } from '@expo/vector-icons';

export const CostCalculationModal = ({
  visible,
  onClose,
  serviceName,
  additionalRates = [],
  professionalName = "Professional",
  onContactPress,
}) => {
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [additionalAnimals, setAdditionalAnimals] = useState(0);
  const [isHolidayRate, setIsHolidayRate] = useState(false);
  const [selectedRates, setSelectedRates] = useState({});
  const [totalCost, setTotalCost] = useState(0);
  const [platformFees, setPlatformFees] = useState(0);

  const BASE_RATE = 20;
  const ADDITIONAL_ANIMAL_RATE = 10;
  const HOLIDAY_RATE = 40;
  const PLATFORM_FEE_PERCENTAGE = 0.10;

  const calculateTotalCost = () => {
    // Start with either holiday rate or base rate
    let subtotal = isHolidayRate ? HOLIDAY_RATE : BASE_RATE;
    
    // Add additional animal costs
    subtotal += additionalAnimals * ADDITIONAL_ANIMAL_RATE;
    
    // Add any selected additional rates
    Object.entries(selectedRates).forEach(([_, rate]) => {
      if (rate.selected) {
        subtotal += rate.amount;
      }
    });

    setTotalCost(subtotal);
    setPlatformFees(subtotal * PLATFORM_FEE_PERCENTAGE);
  };

  useEffect(() => {
    // Initialize selectedRates object
    const ratesObj = {};
    additionalRates.forEach(rate => {
      ratesObj[rate.title] = { ...rate, selected: false };
    });
    setSelectedRates(ratesObj);
  }, [additionalRates]);

  useEffect(() => {
    calculateTotalCost();
  }, [additionalAnimals, isHolidayRate, selectedRates]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <TouchableOpacity 
            style={styles.closeIcon} 
            onPress={onClose}
          >
            <MaterialIcons name="close" size={24} color={theme.colors.text} />
          </TouchableOpacity>

          <Text style={styles.modalTitle}>{serviceName}</Text>
          
          <ScrollView 
            style={styles.scrollContent} 
            showsVerticalScrollIndicator={true}
            persistentScrollbar={true}
          >
            {/* Date Selection
            <View style={styles.dateSection}>
              <View style={styles.dateColumn}>
                <Text style={styles.dateLabel}>Start Date:</Text>
                <DatePicker
                  value={startDate}
                  mode="date"
                  onChange={(event, date) => {
                    if (date) setStartDate(date);
                  }}
                />
              </View>
              
              <View style={styles.dateColumn}>
                <Text style={styles.dateLabel}>End Date:</Text>
                <DatePicker
                  value={endDate}
                  mode="date"
                  onChange={(event, date) => {
                    if (date) setEndDate(date);
                  }}
                />
              </View>
            </View> */}

            {/* Base Rate */}
            <View style={styles.rateItem}>
              <Text>Base Rate</Text>
              <Text>${BASE_RATE}</Text>
            </View>

            {/* Additional Animals */}
            <View style={styles.rateItem}>
              <Text>Additional Animals (${ADDITIONAL_ANIMAL_RATE} each)</Text>
              <View style={styles.counterContainer}>
                <TouchableOpacity 
                  onPress={() => setAdditionalAnimals(Math.max(0, additionalAnimals - 1))}
                  style={styles.counterButton}
                >
                  <MaterialIcons name="remove" size={24} color={theme.colors.primary} />
                </TouchableOpacity>
                <Text style={styles.counterText}>{additionalAnimals}</Text>
                <TouchableOpacity 
                  onPress={() => setAdditionalAnimals(additionalAnimals + 1)}
                  style={styles.counterButton}
                >
                  <MaterialIcons name="add" size={24} color={theme.colors.primary} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Holiday Rate */}
            <View style={styles.rateItem}>
              <Text>Holiday Rate (${HOLIDAY_RATE})</Text>
              <Switch
                value={isHolidayRate}
                onValueChange={setIsHolidayRate}
                trackColor={{ false: "#767577", true: theme.colors.primary }}
              />
            </View>

            {/* Additional Rates */}
            {Object.entries(selectedRates).map(([title, rate]) => (
              <View key={title} style={styles.rateItem}>
                <Text>{title} (${rate.amount})</Text>
                <Switch
                  value={rate.selected}
                  onValueChange={(value) => {
                    setSelectedRates({
                      ...selectedRates,
                      [title]: { ...rate, selected: value },
                    });
                  }}
                  trackColor={{ false: "#767577", true: theme.colors.primary }}
                />
              </View>
            ))}

            {/* Total and Fees */}
            <View style={styles.totalSection}>
              <View style={styles.totalItem}>
                <Text style={styles.totalLabel}>Subtotal:</Text>
                <Text style={styles.totalAmount}>${totalCost}</Text>
              </View>
              <View style={styles.totalItem}>
                <Text style={styles.totalLabel}>Service Fees (10%):</Text>
                <Text style={styles.totalAmount}>${platformFees.toFixed(2)}</Text>
              </View>
              <View style={[styles.totalItem, styles.finalTotal]}>
                <Text style={[styles.totalLabel, styles.finalTotalText]}>Total Cost:</Text>
                <Text style={[styles.totalAmount, styles.finalTotalText]}>${(totalCost + platformFees).toFixed(2)}</Text>
              </View>
            </View>
          </ScrollView>

          <TouchableOpacity 
            style={styles.contactButton} 
            onPress={onContactPress}
          >
            <Text style={styles.contactButtonText}>Contact {professionalName}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 20,
    paddingRight: 15,
    width: '90%',
    maxHeight: '43%',
    maxWidth: 400,
  },
  scrollContent: {
    flexGrow: 0,
    marginBottom: 10,
    paddingRight: 12,
    marginRight: -7,
  },
  modalTitle: {
    fontSize: theme.fontSizes.large,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
    marginTop: 5,
    paddingHorizontal: 30,
  },
  dateSection: {
    marginBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  dateColumn: {
    flex: 1,
  },
  dateLabel: {
    marginBottom: 8,
    fontSize: theme.fontSizes.smallMedium,
    color: theme.colors.text,
  },
  rateItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  counterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  counterButton: {
    padding: 5,
  },
  counterText: {
    marginHorizontal: 10,
    fontSize: theme.fontSizes.medium,
  },
  totalSection: {
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: 15,
  },
  totalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  finalTotal: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: 10,
    marginTop: 5,
  },
  totalLabel: {
    fontSize: theme.fontSizes.medium,
    fontWeight: '600',
  },
  totalAmount: {
    fontSize: theme.fontSizes.medium,
    fontWeight: 'bold',
  },
  finalTotalText: {
    fontSize: theme.fontSizes.mediumLarge,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  closeButton: {
    backgroundColor: theme.colors.primary,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  closeButtonText: {
    color: theme.colors.surface,
    fontSize: theme.fontSizes.medium,
    fontWeight: '600',
  },
  closeIcon: {
    position: 'absolute',
    right: 15,
    top: 15,
    zIndex: 1,
    padding: 5,
  },
  contactButton: {
    backgroundColor: theme.colors.primary,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  contactButtonText: {
    color: theme.colors.surface,
    fontSize: theme.fontSizes.medium,
    fontWeight: '600',
  },
});
