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

  const renderBaseRate = () => {
    debugLog('MBA54321 Rendering base rate with data:', bookingData?.occurrences?.[0]?.rates);
    const occurrence = bookingData?.occurrences?.[0];
    if (!occurrence?.rates?.base_rate || !occurrence?.unit_of_time) {
      debugLog('MBA54321 No base rate or unit of time data available');
      return null;
    }

    return (
      <View>
        <Text style={styles.sectionHeader}>Base Rate</Text>
        <View style={[styles.card, { paddingTop: 16 }]}>
          <View style={[styles.rateItem, { paddingVertical: 0, borderBottomWidth: 0 }]}>
            <View>
              <Text style={styles.rateLabel}>Standard Rate</Text>
              <Text style={styles.subLabel}>{occurrence?.unit_of_time}</Text>
            </View>
            <Text style={styles.rateAmount}>{formatCurrency(occurrence.rates.base_rate)}</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderAdditionalRates = () => {
    debugLog('MBA54321 Rendering additional rates');
    const occurrence = bookingData?.occurrences?.[0];
    if (!occurrence?.rates) return null;

    const { additional_animal_rate, holiday_rate, additional_rates = [], applies_after } = occurrence.rates;

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeaderContainer}>
          <Text style={styles.sectionHeader}>Additional Rates</Text>
          <TouchableOpacity>
            <Text style={styles.addRateText}>+ Add Rate</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.card}>
          {additional_animal_rate && (
            <View style={styles.rateItem}>
              <View>
                <Text style={styles.rateLabel}>Additional Pet Rate</Text>
                <Text style={styles.subLabel}>Applies after {applies_after} pets</Text>
              </View>
              <Text style={styles.additionalAmount}>+{formatCurrency(additional_animal_rate)}</Text>
            </View>
          )}
          {holiday_rate && (
            <View style={styles.rateItem}>
              <View>
                <Text style={styles.rateLabel}>Holiday Rate</Text>
                <Text style={styles.subLabel}>Applied on holidays</Text>
              </View>
              <Text style={styles.additionalAmount}>+{formatCurrency(holiday_rate)}</Text>
            </View>
          )}
          {additional_rates.map((rate, index) => (
            <View 
              key={index} 
              style={[
                styles.rateItem, 
                index === additional_rates.length - 1 && !holiday_rate && styles.lastItem
              ]}
            >
              <View>
                <Text style={styles.rateLabel}>{rate.name}</Text>
                <Text style={styles.subLabel}>{rate.description}</Text>
              </View>
              <Text style={styles.additionalAmount}>+{formatCurrency(rate.amount)}</Text>
            </View>
          ))}
        </View>
      </View>
    );
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
        <Text style={styles.sectionHeader}>Booking Breakdown</Text>
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
            {/* Add any additional rate breakdowns here if needed */}
            <View style={[styles.breakdownItem, styles.totalItem, { borderBottomWidth: 0 }]}>
              <Text style={styles.breakdownLabel}>Date Range Total</Text>
              <Text style={styles.breakdownAmount}>{formatCurrency(occurrence.calculated_cost)}</Text>
            </View>
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
            <Text style={styles.totalAmount}>{formatCurrency(costSummary.total_owner_cost)}</Text>
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
      {renderBaseRate()}
      {renderAdditionalRates()}
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
  rateItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.modernBorder,
  },
  lastItem: {
    borderBottomWidth: 0,
    paddingBottom: 0,
  },
  rateLabel: {
    fontSize: 16,
    fontFamily: theme.fonts.regular.fontFamily,
    color: theme.colors.text,
    marginBottom: 4,
  },
  subLabel: {
    fontSize: 14,
    fontFamily: theme.fonts.regular.fontFamily,
    color: theme.colors.placeHolderText,
  },
  rateAmount: {
    fontSize: 24,
    fontFamily: theme.fonts.header.fontFamily,
    color: theme.colors.text,
  },
  additionalAmount: {
    fontSize: 24,
    fontFamily: theme.fonts.header.fontFamily,
    color: theme.colors.text,
  },
  addRateText: {
    color: theme.colors.mainColors.main,
    fontSize: 16,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  breakdownSection: {
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.modernBorder,
  },
  dateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dateTextContainer: {
    flex: 1,
    marginRight: 16,
  },
  dateText: {
    fontSize: 16,
    fontFamily: theme.fonts.regular.fontFamily,
    color: theme.colors.text,
    flexWrap: 'wrap',
  },
  recurringText: {
    fontSize: 16,
    fontFamily: theme.fonts.regular.fontFamily,
    color: theme.colors.text,
  },
  breakdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  totalItem: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.modernBorder,
    marginBottom: 0,
  },
  breakdownLabelContainer: {
    flex: 1,
  },
  breakdownLabel: {
    fontSize: 16,
    fontFamily: theme.fonts.regular.fontFamily,
    color: theme.colors.text,
  },
  breakdownCalculation: {
    fontSize: 14,
    fontFamily: theme.fonts.regular.fontFamily,
    color: theme.colors.placeHolderText,
    marginTop: 4,
  },
  breakdownAmount: {
    fontSize: 16,
    fontFamily: theme.fonts.regular.fontFamily,
    color: theme.colors.text,
  },
  subtotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.modernBorder,
  },
  subtotalLabel: {
    fontSize: 16,
    fontFamily: theme.fonts.regular.fontFamily,
    color: theme.colors.text,
  },
  subtotalAmount: {
    fontSize: 16,
    fontFamily: theme.fonts.regular.fontFamily,
    color: theme.colors.text,
  },
  totalAmountContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  totalLabel: {
    fontSize: 18,
    fontFamily: theme.fonts.header.fontFamily,
    color: theme.colors.text,
  },
  totalAmount: {
    fontSize: 18,
    fontFamily: theme.fonts.header.fontFamily,
    color: theme.colors.text,
  },
  feeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  feeLabel: {
    fontSize: 16,
    fontFamily: theme.fonts.regular.fontFamily,
    color: theme.colors.text,
  },
  feeAmount: {
    fontSize: 16,
    fontFamily: theme.fonts.regular.fontFamily,
    color: theme.colors.text,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.modernBorder,
    marginVertical: 16,
  },
  payoutContainer: {
    marginTop: 8,
  },
  payoutLabel: {
    fontSize: 18,
    fontFamily: theme.fonts.header.fontFamily,
    color: theme.colors.text,
    marginBottom: 4,
  },
  payoutAmount: {
    fontSize: 24,
    fontFamily: theme.fonts.header.fontFamily,
    color: theme.colors.text,
    marginBottom: 4,
  },
  payoutBreakdown: {
    fontSize: 14,
    fontFamily: theme.fonts.regular.fontFamily,
    color: theme.colors.placeHolderText,
  },
});

export default ReviewAndRatesCard; 