// THIS FILE IS FOR THE BOOKING STEP MODAL
import React, { useEffect, useContext, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
} from 'react-native';
import { theme } from '../../styles/theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AuthContext, debugLog } from '../../context/AuthContext';
import { formatDateTimeRangeFromUTC, formatFromUTC, FORMAT_TYPES } from '../../utils/time_utils';
import { updateBookingDraftRates } from '../../api/API';

const ReviewAndRatesCard = ({ bookingData, onRatesUpdate, bookingId }) => {
  const { timeSettings } = useContext(AuthContext);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isAddingRate, setIsAddingRate] = useState(false);
  const [editedRates, setEditedRates] = useState(null);
  const [newRate, setNewRate] = useState({ name: '', amount: '', description: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    debugLog('MBA54321 ReviewAndRatesCard received bookingData:', bookingData);
    debugLog('MBA54321 ReviewAndRatesCard received bookingId:', bookingId);
    
    if (bookingData?.occurrences?.[0]) {
      // Create a safe default rates object
      const defaultRates = {
        base_rate: 0,
        additional_animal_rate: 0,
        applies_after: 1,
        holiday_rate: 0,
        holiday_days: 0,
        additional_rates: []
      };
      
      // Get the occurrence
      const occurrence = bookingData.occurrences[0];
      
      // Use the existing rates or default to our safe defaults
      const safeRates = occurrence.rates || defaultRates;
      
      // Initialize edited rates
      setEditedRates({ ...safeRates });
    }
  }, [bookingData, bookingId]);

  const formatCurrency = (amount) => {
    if (!amount) return '$0.00';
    return `$${parseFloat(amount).toFixed(2)}`;
  };

  const toggleEditMode = () => {
    if (isEditMode) {
      // Save changes
      saveRateChanges();
    } else {
      // Enter edit mode
      setIsEditMode(true);
      setIsAddingRate(false);
    }
  };

  const toggleAddRate = () => {
    setIsAddingRate(!isAddingRate);
    if (isEditMode) {
      setIsEditMode(false);
    }
    setNewRate({ name: '', amount: '', description: '' });
  };

  const saveRateChanges = async () => {
    // Create a copy of bookingData with updated rates
    if (!editedRates) return;

    try {
      setIsLoading(true);
      setError(null);
      
      debugLog('MBA66777 Saving rate changes:', editedRates);
      debugLog('MBA66777 Using bookingId:', bookingId);
      
      // Create the occurrence object with updated rates for the API
      const firstOccurrence = bookingData.occurrences[0];
      const occurrenceForApi = {
        occurrence_id: firstOccurrence.occurrence_id,
        rates: {
          base_rate: parseFloat(editedRates.base_rate),
          additional_animal_rate: parseFloat(editedRates.additional_animal_rate || 0),
          applies_after: parseInt(editedRates.applies_after || 1),
          holiday_rate: parseFloat(editedRates.holiday_rate || 0)
        }
      };
      
      // Add additional rates if present
      if (editedRates.additional_rates && editedRates.additional_rates.length > 0) {
        occurrenceForApi.rates.additional_rates = editedRates.additional_rates.map(rate => ({
          title: rate.name || rate.title,
          amount: parseFloat(rate.amount),
          description: rate.description || `Additional rate`
        }));
      } else {
        occurrenceForApi.rates.additional_rates = [];
      }
      
      // Call the API to update rates using the bookingId prop
      const response = await updateBookingDraftRates(
        bookingId, 
        [occurrenceForApi]
      );
      
      debugLog('MBA66777 Rate update API response:', response);
      
      // Update the local state with the response
      if (response.draft_data) {
        // Call onRatesUpdate with the updated data from the API
        if (onRatesUpdate) {
          onRatesUpdate(response.draft_data);
        }
      }
      
      setIsEditMode(false);
    } catch (err) {
      debugLog('MBA66777 Error saving rate changes:', err);
      setError('Failed to update rates. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const saveNewRate = async () => {
    if (!newRate.name || !newRate.amount) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      // Create the new rate object
      const newAdditionalRate = {
        title: newRate.name,
        amount: parseFloat(newRate.amount.replace(/[^0-9.]/g, '')),
        description: newRate.description || `Additional rate`
      };
      
      // Create an updated rates object
      const updatedRates = { ...editedRates };
      
      if (!updatedRates.additional_rates) {
        updatedRates.additional_rates = [];
      }
      
      updatedRates.additional_rates.push({
        name: newRate.name,
        amount: parseFloat(newRate.amount.replace(/[^0-9.]/g, '')),
        description: newRate.description || `Additional rate`
      });
      
      // Create the occurrence object for the API
      const firstOccurrence = bookingData.occurrences[0];
      const occurrenceForApi = {
        occurrence_id: firstOccurrence.occurrence_id,
        rates: {
          base_rate: parseFloat(updatedRates.base_rate),
          additional_animal_rate: parseFloat(updatedRates.additional_animal_rate || 0),
          applies_after: parseInt(updatedRates.applies_after || 1),
          holiday_rate: parseFloat(updatedRates.holiday_rate || 0),
          additional_rates: updatedRates.additional_rates.map(rate => ({
            title: rate.name || rate.title,
            amount: parseFloat(rate.amount),
            description: rate.description || `Additional rate`
          }))
        }
      };
      
      // Call the API to update rates using the bookingId prop
      const response = await updateBookingDraftRates(
        bookingId, 
        [occurrenceForApi]
      );
      
      debugLog('MBA66777 New rate added API response:', response);
      
      // Update the local state with the response
      if (response.draft_data) {
        // Set the edited rates from the response
        if (response.draft_data.occurrences && response.draft_data.occurrences[0]) {
          setEditedRates(response.draft_data.occurrences[0].rates);
        }
        
        // Call onRatesUpdate with the updated data from the API
        if (onRatesUpdate) {
          onRatesUpdate(response.draft_data);
        }
      }
      
      setIsAddingRate(false);
      setNewRate({ name: '', amount: '', description: '' });
    } catch (err) {
      debugLog('MBA66777 Error adding new rate:', err);
      setError('Failed to add new rate. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const updateBaseRate = (value) => {
    const numericValue = value.replace(/[^0-9.]/g, '');
    setEditedRates(prev => ({
      ...prev,
      base_rate: numericValue ? parseFloat(numericValue) : 0
    }));
  };

  const updateAdditionalAnimalRate = (value) => {
    const numericValue = value.replace(/[^0-9.]/g, '');
    setEditedRates(prev => ({
      ...prev,
      additional_animal_rate: numericValue ? parseFloat(numericValue) : 0
    }));
  };

  const updateHolidayRate = (value) => {
    const numericValue = value.replace(/[^0-9.]/g, '');
    setEditedRates(prev => ({
      ...prev,
      holiday_rate: numericValue ? parseFloat(numericValue) : 0
    }));
  };

  const updateAdditionalRate = (index, field, value) => {
    if (!editedRates?.additional_rates) return;
    
    const updatedAdditionalRates = [...editedRates.additional_rates];
    
    if (field === 'amount') {
      const numericValue = value.replace(/[^0-9.]/g, '');
      updatedAdditionalRates[index] = {
        ...updatedAdditionalRates[index],
        amount: numericValue ? parseFloat(numericValue) : 0
      };
    } else if (field === 'name') {
      updatedAdditionalRates[index] = {
        ...updatedAdditionalRates[index],
        name: value
      };
    }
    
    setEditedRates(prev => ({
      ...prev,
      additional_rates: updatedAdditionalRates
    }));
  };

  const deleteAdditionalRate = async (index) => {
    if (!editedRates?.additional_rates) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      // Create an updated rates object
      const updatedRates = { ...editedRates };
      const updatedAdditionalRates = [...updatedRates.additional_rates];
      updatedAdditionalRates.splice(index, 1);
      updatedRates.additional_rates = updatedAdditionalRates;
      
      // Create the occurrence object for the API
      const firstOccurrence = bookingData.occurrences[0];
      const occurrenceForApi = {
        occurrence_id: firstOccurrence.occurrence_id,
        rates: {
          base_rate: parseFloat(updatedRates.base_rate),
          additional_animal_rate: parseFloat(updatedRates.additional_animal_rate || 0),
          applies_after: parseInt(updatedRates.applies_after || 1),
          holiday_rate: parseFloat(updatedRates.holiday_rate || 0),
          additional_rates: updatedRates.additional_rates.map(rate => ({
            title: rate.name || rate.title,
            amount: parseFloat(rate.amount),
            description: rate.description || `Additional rate`
          }))
        }
      };
      
      // Call the API to update rates using the bookingId prop
      const response = await updateBookingDraftRates(
        bookingId, 
        [occurrenceForApi]
      );
      
      debugLog('MBA66777 Rate deleted API response:', response);
      
      // Update the local state with the response
      if (response.draft_data) {
        // Set the edited rates from the response
        if (response.draft_data.occurrences && response.draft_data.occurrences[0]) {
          setEditedRates(response.draft_data.occurrences[0].rates);
        }
        
        // Call onRatesUpdate with the updated data from the API
        if (onRatesUpdate) {
          onRatesUpdate(response.draft_data);
        }
      }
    } catch (err) {
      debugLog('MBA66777 Error deleting rate:', err);
      setError('Failed to delete rate. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderBookingBreakdown = () => {
    debugLog('MBA54321 Rendering booking breakdown with data:', bookingData?.occurrences?.[0]);
    const occurrence = bookingData?.occurrences?.[0];
    if (!occurrence) return null;

    // Get the user's timezone from context
    const { timeSettings } = useContext(AuthContext);
    const userTimezone = timeSettings?.timezone || 'US/Mountain';
    debugLog('MBA54321 userTimezone: ', userTimezone);

    const formattedDateRange = formatDateTimeRangeFromUTC({
      startDate: occurrence.start_date,
      startTime: occurrence.start_time,
      endDate: occurrence.end_date,
      endTime: occurrence.end_time,
      userTimezone: userTimezone,
      includeTimes: true,
      includeTimezone: true
    });

    debugLog('MBA54321 Formatted date range:', formattedDateRange);

    // Initialize rates object if it doesn't exist
    if (!occurrence.rates) {
      debugLog('MBA54321 occurrence.rates is undefined, initializing with defaults');
      occurrence.rates = {
        base_rate: 0,
        additional_animal_rate: 0,
        applies_after: 1,
        holiday_rate: 0,
        holiday_days: 0,
        additional_rates: []
      };
    }

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeaderContainer}>
          <Text style={styles.sectionHeader}>Booking Breakdown</Text>
          <TouchableOpacity onPress={toggleAddRate}>
            <Text style={styles.addRateText}>+ Add Rate</Text>
          </TouchableOpacity>
        </View>
        <View style={[styles.card, { paddingTop: 16 }]}>
          <View style={styles.breakdownSection}>
            <View style={styles.dateHeader}>
              <View style={styles.dateTextContainer}>
                <Text style={styles.dateText}>{formattedDateRange}</Text>
              </View>
              <TouchableOpacity onPress={toggleEditMode}>
                <MaterialCommunityIcons 
                  name={isEditMode ? "content-save" : "pencil"} 
                  size={20} 
                  color={theme.colors.mainColors.main} 
                />
              </TouchableOpacity>
            </View>
            
            {/* Base Rate */}
            <View style={styles.breakdownItem}>
              <View style={styles.breakdownLabelContainer}>
                <View style={styles.rateNameAmountRow}>
                  <Text style={styles.breakdownLabel}>
                    Base Rate ({occurrence.unit_of_time || 'visit'})
                  </Text>
                  {isEditMode ? (
                    <View style={styles.amountInputContainer}>
                      <Text style={styles.currencySymbol}>$</Text>
                      <TextInput
                        style={styles.rateInput}
                        keyboardType="numeric"
                        value={editedRates?.base_rate?.toString() || '0'}
                        onChangeText={updateBaseRate}
                      />
                    </View>
                  ) : null}
                </View>
                {!isEditMode && (
                  <Text style={styles.breakdownCalculation}>
                    {occurrence.multiple || 1} × {formatCurrency(occurrence.rates?.base_rate || 0)} = {formatCurrency(occurrence.base_total || occurrence.rates?.base_rate || 0)}
                  </Text>
                )}
              </View>
              {!isEditMode && (
                <Text style={styles.breakdownAmount}>{formatCurrency(occurrence.base_total || occurrence.rates?.base_rate || 0)}</Text>
              )}
            </View>
            
            {/* Additional Animal Rate */}
            {occurrence.rates?.additional_animal_rate && occurrence.rates?.applies_after && occurrence.rates.applies_after < (bookingData.pets?.length || 0) && (
              <View style={styles.breakdownItem}>
                <View style={styles.breakdownLabelContainer}>
                  <View style={styles.rateNameAmountRow}>
                    <Text style={styles.breakdownLabel}>
                      Additional Pet Rate (after {occurrence.rates?.applies_after || 1} {occurrence.rates?.applies_after !== 1 ? 'pets' : 'pet'})
                    </Text>
                    {isEditMode ? (
                      <View style={styles.amountInputContainer}>
                        <Text style={styles.currencySymbol}>$</Text>
                        <TextInput
                          style={styles.rateInput}
                          keyboardType="numeric"
                          value={editedRates?.additional_animal_rate?.toString() || '0'}
                          onChangeText={updateAdditionalAnimalRate}
                        />
                        <Text style={styles.inputLabel}> / pet / {occurrence.unit_of_time || 'visit'}</Text>
                      </View>
                    ) : null}
                  </View>
                  {!isEditMode && (
                    <Text style={styles.breakdownCalculation}>
                      ${occurrence.rates?.additional_animal_rate || 0} / pet / {occurrence.unit_of_time || 'visit'}
                    </Text>
                  )}
                </View>
                {!isEditMode && (
                  <Text style={styles.breakdownAmount}>
                    {(occurrence.rates?.applies_after && occurrence.rates.applies_after < (bookingData.pets?.length || 0)) ? '+' : ''}
                    {(occurrence.rates?.applies_after && occurrence.rates.applies_after < (bookingData.pets?.length || 0)) 
                      ? formatCurrency(occurrence.rates?.additional_animal_rate_total || occurrence.rates?.additional_animal_rate || 0) 
                      : 'NA'}
                  </Text>
                )}
              </View>
            )}
            
            {/* Holiday Rate */}
            {occurrence.rates?.holiday_rate && occurrence.rates?.holiday_days && occurrence.rates.holiday_days > 0 && (
              <View style={[styles.breakdownItem, { borderBottomWidth: (occurrence.rates?.additional_rates?.length > 0 || isAddingRate) ? 1 : 0 }]}>
                <View style={styles.breakdownLabelContainer}>
                  <View style={styles.rateNameAmountRow}>
                    <Text style={styles.breakdownLabel}>
                      Holiday Rate
                    </Text>
                    {isEditMode ? (
                      <View style={styles.amountInputContainer}>
                        <Text style={styles.currencySymbol}>$</Text>
                        <TextInput
                          style={styles.rateInput}
                          keyboardType="numeric"
                          value={editedRates?.holiday_rate?.toString() || '0'}
                          onChangeText={updateHolidayRate}
                        />
                        <Text style={styles.inputLabel}> × {occurrence.rates?.holiday_days || 0} {occurrence.rates?.holiday_days !== 1 ? 'holidays' : 'holiday'}</Text>
                      </View>
                    ) : null}
                  </View>
                  {!isEditMode && (
                    <Text style={styles.breakdownCalculation}>
                      {formatCurrency(occurrence.rates?.holiday_rate || 0)} × {occurrence.rates?.holiday_days || 0} {occurrence.rates?.holiday_days !== 1 ? 'holidays' : 'holiday'}
                    </Text>
                  )}
                </View>
                {!isEditMode && (
                  <Text style={styles.breakdownAmount}>
                    {occurrence.rates?.holiday_days ? '+' : ''}
                    {occurrence.rates?.holiday_days ? formatCurrency(occurrence.rates?.holiday_rate_total || occurrence.rates?.holiday_rate || 0) : 'NA'}
                  </Text>
                )}
              </View>
            )}
            
            {/* Additional Rates */}
            {(editedRates?.additional_rates || []).map((rate, index) => (
              <View key={index} style={styles.breakdownItem}>
                <View style={styles.breakdownLabelContainer}>
                  {isEditMode ? (
                    <View style={styles.editableAdditionalRateRow}>
                      <View style={styles.rateNameAmountRowWithDelete}>
                        <TextInput
                          style={styles.nameInput}
                          value={rate.name}
                          onChangeText={(value) => updateAdditionalRate(index, 'name', value)}
                          placeholder="Rate Name"
                        />
                        <View style={styles.amountInputContainer}>
                          <Text style={styles.currencySymbol}>$</Text>
                          <TextInput
                            style={styles.rateInput}
                            keyboardType="numeric"
                            value={rate.amount?.toString() || '0'}
                            onChangeText={(value) => updateAdditionalRate(index, 'amount', value)}
                          />
                        </View>
                      </View>
                      <TouchableOpacity 
                        style={styles.deleteButton} 
                        onPress={() => deleteAdditionalRate(index)}
                      >
                        <MaterialCommunityIcons 
                          name="trash-can-outline" 
                          size={22} 
                          color={theme.colors.error} 
                        />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <>
                      <Text style={styles.breakdownLabel}>{rate.name || rate.title}</Text>
                      <Text style={styles.breakdownCalculation}>{rate.description || "Additional Rate"}</Text>
                    </>
                  )}
                </View>
                {!isEditMode && (
                  <Text style={styles.breakdownAmount}>+{formatCurrency(rate.amount)}</Text>
                )}
              </View>
            ))}
            
            {/* Add New Rate Form */}
            {isAddingRate && (
              <View>
                <View style={styles.addRateContainer}>
                  <View style={styles.formDivider} />
                  
                  <View style={styles.rateNameAmountRow}>
                    <TextInput
                      style={styles.nameInput}
                      value={newRate.name}
                      onChangeText={(text) => setNewRate(prev => ({ ...prev, name: text }))}
                      placeholder="Rate Name"
                      placeholderTextColor={theme.colors.placeHolderText}
                    />
                    <View style={styles.amountInputContainer}>
                      <Text style={styles.currencySymbol}>$</Text>
                      <TextInput
                        style={styles.rateInput}
                        keyboardType="numeric"
                        value={newRate.amount}
                        onChangeText={(text) => setNewRate(prev => ({ ...prev, amount: text }))}
                        placeholder="0.00"
                        placeholderTextColor={theme.colors.placeHolderText}
                      />
                    </View>
                  </View>
                  
                  <TextInput
                    style={styles.descriptionInput}
                    value={newRate.description}
                    onChangeText={(text) => setNewRate(prev => ({ ...prev, description: text }))}
                    placeholder="Description (optional)"
                    placeholderTextColor={theme.colors.placeHolderText}
                  />
                  
                  <View style={styles.formDivider} />
                </View>
                <View style={styles.buttonsContainer}>
                  <TouchableOpacity style={styles.cancelButton} onPress={toggleAddRate}>
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.saveButton} onPress={saveNewRate}>
                    <Text style={styles.saveButtonText}>Save New Rate</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
            
            {/* Save button for edit mode */}
            {isEditMode && (
              <TouchableOpacity style={[styles.saveButton, {alignSelf: 'flex-end', marginRight: 16, marginTop: 16, marginBottom: 8}]} onPress={saveRateChanges}>
                <Text style={styles.saveButtonText}>Save Changes</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  };

  const renderTotalAmount = () => {
    debugLog('MBA54321 Rendering total amount with data:', bookingData?.cost_summary);
    
    // Create default cost summary in case it's missing
    const defaultCostSummary = {
      subtotal: 0,
      client_platform_fee: 0,
      pro_platform_fee: 0,
      taxes: 0,
      tax_state: '',
      total_client_cost: 0,
      total_sitter_payout: 0,
      pro_subscription_plan: 0
    };
    
    // Use the actual cost summary or our default
    const costSummary = bookingData?.cost_summary || defaultCostSummary;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionHeader}>Cost Summary</Text>
        <View style={[styles.card, { paddingTop: 16 }]}>
          <View style={styles.subtotalRow}>
            <Text style={styles.subtotalLabel}>Subtotal</Text>
            <Text style={styles.subtotalAmount}>{formatCurrency(costSummary.subtotal)}</Text>
          </View>
          
          {/* Platform Fee */}
          <View style={styles.feeRow}>
            <Text style={styles.feeLabel}>Service Fee</Text>
            <Text style={styles.feeAmount}>{formatCurrency(costSummary.client_platform_fee)}</Text>
          </View>
          
          {/* Taxes */}
          <View style={styles.feeRow}>
            <Text style={styles.feeLabel}>{costSummary.tax_state}{costSummary.tax_state ? ' - ' : ''}Taxes</Text>
            <Text style={styles.feeAmount}>{formatCurrency(costSummary.taxes)}</Text>
          </View>

          {/* Total Owner Cost */}
          <View style={styles.totalAmountContainer}>
            <Text style={styles.totalLabel}>Total Owner Cost</Text>
            <Text style={styles.totalAmount}>{formatCurrency(costSummary.total_client_cost)}</Text>
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Professional Payout */}
          <View style={styles.payoutContainer}>
            <Text style={styles.payoutLabel}>Professional Payout</Text>
            <Text style={styles.payoutAmount}>{formatCurrency(costSummary.total_sitter_payout)}</Text>
            <Text style={styles.payoutBreakdown}>
              (Subtotal {formatCurrency(costSummary.subtotal)} - Service Fee {formatCurrency(costSummary.pro_platform_fee)})
            </Text>
            {costSummary.pro_platform_fee === 0 && (
              <Text style={styles.badge}>{costSummary.pro_subscription_plan === 0 ? 'Free Tier - ' 
                : costSummary.pro_subscription_plan === 1 ? 'Waitlist Tier - ' 
                : costSummary.pro_subscription_plan === 2 ? 'Commission Tier - ' 
                : costSummary.pro_subscription_plan === 3 ? 'Pro Subscription - ' 
                : costSummary.pro_subscription_plan === 4 ? 'Pro Subscription - ' 
                :  costSummary.pro_subscription_plan === 5 ? 'Client Subscription - ' 
                : ''} Saved {formatCurrency(costSummary.subtotal * 0.15)}</Text>
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {renderBookingBreakdown()}
      {renderTotalAmount()}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  contentContainer: {
    padding: 16,
  },
  section: {
    marginTop: 24,
  },
  badge: {
    fontSize: 12,
    color: theme.colors.whiteText,
    fontFamily: theme.fonts.regular.fontFamily,
    fontWeight: 'bold',
    backgroundColor: theme.colors.mainColors.main,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginTop: 4,
  },
  sectionHeaderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionHeader: {
    fontSize: 20,
    fontFamily: theme.fonts.header.fontFamily,
    color: theme.colors.text,
    marginBottom: 8,
  },
  addRateText: {
    color: theme.colors.mainColors.main,
    fontSize: 14,
    fontWeight: '600',
    fontFamily: theme.fonts.regular.fontFamily,
  },
  card: {
    backgroundColor: theme.colors.surfaceContrast,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  breakdownSection: {
    width: '100%',
  },
  dateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  dateTextContainer: {
    flex: 1,
    marginRight: 8,
  },
  dateText: {
    fontSize: 16,
    color: theme.colors.text,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  breakdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  breakdownLabelContainer: {
    flex: 1,
    marginRight: 16,
  },
  breakdownLabel: {
    fontSize: 16,
    color: theme.colors.text,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  breakdownCalculation: {
    fontSize: 14,
    color: theme.colors.placeHolderText,
    marginTop: 4,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  breakdownAmount: {
    fontSize: 16,
    color: theme.colors.text,
    fontWeight: '600',
    fontFamily: theme.fonts.regular.fontFamily,
  },
  totalItem: {
    marginTop: 8,
    paddingTop: 16,
  },
  // Fee and total styles
  subtotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  subtotalLabel: {
    fontSize: 16,
    color: theme.colors.text,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  subtotalAmount: {
    fontSize: 16,
    color: theme.colors.text,
    fontWeight: '600',
    fontFamily: theme.fonts.regular.fontFamily,
  },
  feeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  feeLabel: {
    fontSize: 16,
    color: theme.colors.text,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  feeAmount: {
    fontSize: 16,
    color: theme.colors.text,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  totalAmountContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingBottom: 16,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.mainColors.main,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginBottom: 16,
  },
  payoutContainer: {
    alignItems: 'flex-end',
  },
  payoutLabel: {
    fontSize: 16,
    color: theme.colors.text,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  payoutAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.success,
    fontFamily: theme.fonts.regular.fontFamily,
    marginTop: 4,
  },
  payoutBreakdown: {
    fontSize: 12,
    color: theme.colors.placeHolderText,
    fontFamily: theme.fonts.regular.fontFamily,
    marginTop: 4,
  },
  // Input styles for editable fields
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  addRateContainer: {
    padding: 16,
    width: '100%',
  },
  rateNameAmountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 12,
  },
  rateEditContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 120,
    maxWidth: 150,
  },
  rateInput: {
    fontSize: 16,
    color: theme.colors.text,
    fontFamily: theme.fonts.regular.fontFamily,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
    minWidth: 100,
    flex: 1,
  },
  currencySymbol: {
    fontSize: 16,
    color: theme.colors.text,
    fontFamily: theme.fonts.regular.fontFamily,
    marginRight: 4,
    marginLeft: 2,
  },
  inputLabel: {
    fontSize: 14,
    color: theme.colors.placeHolderText,
    fontFamily: theme.fonts.regular.fontFamily,
    marginLeft: 4,
  },
  nameInput: {
    fontSize: 16,
    color: theme.colors.text,
    fontFamily: theme.fonts.regular.fontFamily,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
    flex: 1,
    marginRight: 16,
  },
  descriptionInput: {
    fontSize: 16,
    color: theme.colors.text,
    fontFamily: theme.fonts.regular.fontFamily,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
    width: '100%',
  },
  saveButton: {
    backgroundColor: theme.colors.mainColors.main,
    borderRadius: 4,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginTop: 0,
    marginBottom: 0,
    marginRight: 0,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: theme.fonts.regular.fontFamily,
  },
  formDivider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: 12,
    width: '100%',
  },
  editableAdditionalRateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  rateNameAmountRowWithDelete: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  deleteButton: {
    padding: 8,
    backgroundColor: theme.colors.surface,
    borderRadius: 4,
    marginLeft: 8,
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 8,
    marginRight: 16,
  },
  cancelButton: {
    backgroundColor: theme.colors.surface,
    borderRadius: 4,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginRight: 12,
  },
  cancelButtonText: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '600',
    fontFamily: theme.fonts.regular.fontFamily,
  },
});

export default ReviewAndRatesCard; 