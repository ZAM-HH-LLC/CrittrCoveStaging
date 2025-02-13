import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TextInput, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../styles/theme';
import { format } from 'date-fns';
import { TIME_OPTIONS } from '../data/mockData';

const EditOccurrenceModal = ({ visible, onClose, onSave, occurrence }) => {
  const [rates, setRates] = useState({
    baseRate: occurrence?.rates?.baseRate || 0,
    additionalRates: occurrence?.rates?.additionalRates || [],
    timeUnit: occurrence?.rates?.timeUnit || 'per visit'
  });

  useEffect(() => {
    if (occurrence) {
      setRates({
        baseRate: occurrence.rates?.baseRate || 0,
        additionalRates: occurrence.rates?.additionalRates || [],
        timeUnit: occurrence.rates?.timeUnit || 'per visit'
      });
    }
  }, [occurrence]);

  const calculateTotal = () => {
    const base = parseFloat(rates.baseRate ? rates.baseRate : 0) || 0;
    const additional = rates.additionalRates?.reduce((sum, rate) => 
      sum + (parseFloat(rate.amount) || 0), 0);
    return (base + additional).toFixed(2);
  };

  const formatTimeString = (dateStr, timeStr) => {
    if (!dateStr || !timeStr) return '';
    const [hours, minutes] = timeStr.split(':');
    const date = new Date(dateStr);
    date.setHours(parseInt(hours, 10), parseInt(minutes, 10));
    return format(date, 'h:mm a');
  };

  const handleSave = () => {
    const sanitizedRates = {
      baseRate: parseFloat(rates.baseRate ? rates.baseRate : 0) || 0,
      additionalRates: rates.additionalRates?.map(rate => ({
        name: rate.name,
        amount: parseFloat(rate.amount) || 0
      })) || [],
      timeUnit: rates.timeUnit,
    };

    onSave({
      ...occurrence,
      rates: sanitizedRates,
      totalCost: parseFloat(calculateTotal())
    });
    onClose();
  };

  const handleAdditionalRateChange = (index, field, value) => {
    const updated = [...rates?.additionalRates];
    updated[index] = { 
      ...updated[index], 
      [field]: field === 'amount' ? parseFloat(value) || 0 : value 
    };
    setRates(prev => ({
      ...prev,
      additionalRates: updated
    }));
  };

  const handleAddRate = () => {
    setRates(prev => ({
      ...prev,
      additionalRates: [
        ...(prev.additionalRates || []),
        { name: '', amount: 0 }
      ]
    }));
  };

  if (!occurrence) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              Edit Occurrence for {format(new Date(occurrence.startDate), 'MMM d, yyyy')}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <MaterialCommunityIcons name="close" size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView>
            <View style={styles.timeSection}>
              <Text style={styles.label}>Time:</Text>
              <Text style={styles.timeText}>
                {formatTimeString(occurrence.startDate, occurrence.startTime)} - 
                {formatTimeString(occurrence.endDate, occurrence.endTime)}
              </Text>
            </View>

            <View style={styles.rateSection}>
              <Text style={[styles.label, {marginTop: 10}]}>Base Rate ($)</Text>
              <TextInput
                style={styles.input}
                value={rates.baseRate ? rates.baseRate.toString() : ''}
                onChangeText={(text) => setRates(prev => ({
                  ...prev,
                  baseRate: text
                }))}
                keyboardType="decimal-pad"
              />
            </View>

            <View style={styles.rateSection}>
              <Text style={styles.sectionTitle}>Additional Rates</Text>
              {rates?.additionalRates?.map((rate, index) => (
                <View key={index} style={styles.additionalRate}>
                  <View style={styles.additionalRateHeader}>
                    <Text style={styles.additionalRateTitle}>{rate.name}</Text>
                    <TouchableOpacity
                      onPress={() => {
                        setRates(prev => ({
                          ...prev,
                          additionalRates: prev.additionalRates?.filter((_, i) => i !== index)
                        }));
                      }}
                    >
                      <MaterialCommunityIcons name="close" size={24} color={theme.colors.error} />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.label}>Rate Name</Text>
                  <TextInput
                    style={styles.rateNameInput}
                    value={rate.name}
                    onChangeText={(text) => handleAdditionalRateChange(index, 'name', text)}
                    placeholder="Rate Name"
                  />
                  <Text style={styles.label}>Rate Amount</Text>
                  <TextInput
                    style={styles.rateAmountInput}
                    value={rate.amount.toString()}
                    onChangeText={(text) => handleAdditionalRateChange(index, 'amount', text)}
                    keyboardType="decimal-pad"
                    placeholder="Amount"
                  />
                </View>
              ))}
              
              <TouchableOpacity
                style={styles.addRateButton}
                onPress={handleAddRate}
              >
                <MaterialCommunityIcons name="plus" size={20} color={theme.colors.primary} />
                <Text style={styles.addRateText}>Add Rate</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.totalSection}>
              <Text style={styles.totalLabel}>Total:</Text>
              <Text style={styles.totalAmount}>${calculateTotal()}</Text>
            </View>

            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={onClose}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.saveButton]}
                onPress={handleSave}
              >
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
    padding: 20,
    width: '90%',
    maxWidth: 500,
    maxHeight: '60%',
    position: 'relative',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    position: 'relative',
  },
  modalTitle: {
    fontSize: theme.fontSizes.mediumLarge,
    fontWeight: 'bold',
    flex: 1,
    paddingRight: 24,
  },
  closeButton: {
    position: 'absolute',
    right: -10,
    top: -10,
  },
  rateSection: {
    marginBottom: 20,
  },
  label: {
    fontSize: theme.fontSizes.smallMedium,
    marginBottom: 5,
    color: theme.colors.text,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 4,
    padding: 10,
    fontSize: theme.fontSizes.medium,
  },
  additionalRate: {
    marginBottom: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    padding: 15,
  },
  rateNameInput: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 4,
    padding: 10,
    marginBottom: 10,
    width: '100%',
  },
  rateAmountInput: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 4,
    padding: 10,
    width: '100%',
  },
  addRateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
  },
  addRateText: {
    color: theme.colors.primary,
    marginLeft: 5,
  },
  totalSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  totalLabel: {
    fontSize: theme.fontSizes.medium,
    fontWeight: 'bold',
  },
  totalAmount: {
    fontSize: theme.fontSizes.mediumLarge,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 20,
  },
  button: {
    padding: 10,
    borderRadius: 4,
    minWidth: 100,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  saveButton: {
    backgroundColor: theme.colors.primary,
  },
  cancelButtonText: {
    color: theme.colors.text,
  },
  saveButtonText: {
    color: theme.colors.surface,
    fontWeight: 'bold',
  },
  additionalRateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  additionalRateTitle: {
    fontSize: theme.fontSizes.medium,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
});

export default EditOccurrenceModal;