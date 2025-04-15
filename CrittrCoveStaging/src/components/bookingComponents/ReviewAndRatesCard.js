// THIS FILE IS FOR THE BOOKING STEP MODAL
import React, { useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { theme } from '../../styles/theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { debugLog } from '../../context/AuthContext';
import { AuthContext } from '../../context/AuthContext';
import { formatDateTimeRangeFromUTC, formatFromUTC, FORMAT_TYPES } from '../../utils/time_utils';

const ReviewAndRatesCard = ({ bookingData }) => {
  const { timeSettings } = useContext(AuthContext);

  useEffect(() => {
    debugLog('MBA54321 ReviewAndRatesCard received bookingData:', bookingData);
  }, [bookingData]);

  const formatCurrency = (amount) => {
    if (!amount) return '$0.00';
    return `$${parseFloat(amount).toFixed(2)}`;
  };

  const renderBookingBreakdown = () => {
    debugLog('MBA54321 Rendering booking breakdown with data:', bookingData?.occurrences?.[0]);
    const occurrence = bookingData?.occurrences?.[0];
    if (!occurrence) return null;

    // Get the user's timezone from context
    const { timeSettings } = useContext(AuthContext);
    const userTimezone = timeSettings?.timezone || 'US/Mountain';

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

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeaderContainer}>
          <Text style={styles.sectionHeader}>Booking Breakdown</Text>
          <TouchableOpacity>
            <Text style={styles.addRateText}>+ Add Rate</Text>
          </TouchableOpacity>
        </View>
        <View style={[styles.card, { paddingTop: 16 }]}>
          <View style={styles.breakdownSection}>
            <View style={styles.dateHeader}>
              <View style={styles.dateTextContainer}>
                <Text style={styles.dateText}>{formattedDateRange}</Text>
              </View>
              <TouchableOpacity>
                <MaterialCommunityIcons name="pencil" size={20} color={theme.colors.mainColors.main} />
              </TouchableOpacity>
            </View>
            <View style={styles.breakdownItem}>
              <View style={styles.breakdownLabelContainer}>
                <Text style={styles.breakdownLabel}>
                  Base Rate ({occurrence.unit_of_time})
                </Text>
                <Text style={styles.breakdownCalculation}>
                  {occurrence.multiple} × {formatCurrency(occurrence.rates.base_rate)} = {formatCurrency(occurrence.base_total)}
                </Text>
              </View>
              <Text style={styles.breakdownAmount}>{formatCurrency(occurrence.base_total)}</Text>
            </View>
            
            {occurrence?.rates?.additional_animal_rate && occurrence.rates.applies_after < bookingData.pets.length && (
              <View style={styles.breakdownItem}>
                <View style={styles.breakdownLabelContainer}>
                  <Text style={styles.breakdownLabel}>
                    Additional Pet Rate (after {occurrence.rates?.applies_after || 1} {occurrence.rates?.applies_after !== 1 ? 'pets' : 'pet'})
                  </Text>
                  <Text style={styles.breakdownCalculation}>
                    ${occurrence.rates.additional_animal_rate} / pet / {occurrence.unit_of_time}
                  </Text>
                </View>
                <Text style={styles.breakdownAmount}>
                  {occurrence.rates.applies_after < bookingData.pets.length ? '+' : ''}{occurrence.rates.applies_after < bookingData.pets.length ? formatCurrency(occurrence.rates.additional_animal_rate_total || occurrence.rates.additional_animal_rate) : 'NA'}
                </Text>
              </View>
            )}
            
            {occurrence?.rates?.holiday_rate && occurrence.rates.holiday_days > 0 && (
              <View style={[styles.breakdownItem,{ borderBottomWidth: occurrence.rates?.additional_rates.length > 0 ? 1 : 0 }]}>
                <View style={styles.breakdownLabelContainer}>
                  <Text style={styles.breakdownLabel}>
                    Holiday Rate
                  </Text>
                  <Text style={styles.breakdownCalculation}>
                    {formatCurrency(occurrence.rates.holiday_rate)} × {occurrence.rates.holiday_days} {occurrence.rates?.holiday_days !== 1 ? 'holidays' : 'holiday'}
                  </Text>
                </View>
                <Text style={styles.breakdownAmount}>
                  {occurrence.rates.holiday_days ? '+' : ''}{occurrence.rates.holiday_days ? formatCurrency(occurrence.rates.holiday_rate_total || occurrence.rates.holiday_rate) : 'NA'}
                </Text>
              </View>
            )}
            
            {/* Add additional rates here if needed */}
            {(occurrence.rates?.additional_rates || []).map((rate, index) => (
              <View key={index} style={styles.breakdownItem}>
                <View style={styles.breakdownLabelContainer}>
                  <Text style={styles.breakdownLabel}>{rate.name}</Text>
                  <Text style={styles.breakdownCalculation}>{rate.description}</Text>
                </View>
                <Text style={styles.breakdownAmount}>+{formatCurrency(rate.amount)}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    );
  };

  const renderTotalAmount = () => {
    debugLog('MBA54321 Rendering total amount with data:', bookingData?.cost_summary);
    const costSummary = bookingData?.cost_summary;
    if (!costSummary) return null;

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
            <Text style={styles.feeAmount}>{formatCurrency(costSummary.platform_fee)}</Text>
          </View>
          
          {/* Taxes */}
          <View style={styles.feeRow}>
            <Text style={styles.feeLabel}>Taxes</Text>
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
              (Subtotal {formatCurrency(costSummary.subtotal)} - Service Fee {formatCurrency(costSummary.platform_fee)})
            </Text>
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
});

export default ReviewAndRatesCard; 