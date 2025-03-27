import React, { useEffect } from 'react';
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

const ReviewAndRatesCard = ({ bookingData }) => {
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
    if (!occurrence?.rates?.base_rate) {
      debugLog('MBA54321 No base rate data available');
      return (
        <View>
          <Text style={styles.sectionHeader}>Base Rate</Text>
          <View style={styles.card}>
            <View style={styles.rateItem}>
              <View>
                <Text style={styles.rateLabel}>Standard Rate</Text>
                <Text style={styles.subLabel}>Per day rate</Text>
              </View>
              <Text style={styles.rateAmount}>$150.00</Text>
            </View>
          </View>
        </View>
      );
    }

    return (
      <View>
        <Text style={styles.sectionHeader}>Base Rate</Text>
        <View style={styles.card}>
          <View style={styles.rateItem}>
            <View>
              <Text style={styles.rateLabel}>Standard Rate</Text>
              <Text style={styles.subLabel}>Per day rate</Text>
            </View>
            <Text style={styles.rateAmount}>{formatCurrency(occurrence.rates.base_rate)}</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderAdditionalRates = () => {
    debugLog('MBA54321 Rendering additional rates');
    return (
      <View style={styles.section}>
        <View style={styles.sectionHeaderContainer}>
          <Text style={styles.sectionHeader}>Additional Rates</Text>
          <TouchableOpacity>
            <Text style={styles.addRateText}>+ Add Rate</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.card}>
          <View style={styles.rateItem}>
            <View>
              <Text style={styles.rateLabel}>Extended Hours</Text>
              <Text style={styles.subLabel}>After 5:00 PM</Text>
            </View>
            <Text style={styles.additionalAmount}>+$50</Text>
          </View>
          <View style={[styles.rateItem, styles.lastItem]}>
            <View>
              <Text style={styles.rateLabel}>Weekend Rate</Text>
              <Text style={styles.subLabel}>Saturdays & Sundays</Text>
            </View>
            <Text style={styles.additionalAmount}>+$75</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderBookingBreakdown = () => {
    debugLog('MBA54321 Rendering booking breakdown with data:', bookingData?.occurrences?.[0]);
    const occurrence = bookingData?.occurrences?.[0];
    if (!occurrence) {
      debugLog('MBA54321 No occurrence data available');
      return (
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Booking Breakdown</Text>
          <View style={styles.card}>
            <View style={styles.breakdownSection}>
              <View style={styles.dateHeader}>
                <Text style={styles.dateText}>Mar 5, 2025</Text>
                <TouchableOpacity>
                  <MaterialCommunityIcons name="pencil" size={20} color={theme.colors.mainColors.main} />
                </TouchableOpacity>
              </View>
              <View style={styles.breakdownItem}>
                <Text style={styles.breakdownLabel}>Base Rate (9:00 AM - 5:00 PM)</Text>
                <Text style={styles.breakdownAmount}>$150.00</Text>
              </View>
              <View style={styles.breakdownItem}>
                <Text style={styles.breakdownLabel}>Extended Hours (2 hours)</Text>
                <Text style={styles.breakdownAmount}>$50.00</Text>
              </View>
              <View style={[styles.breakdownItem, styles.totalItem]}>
                <Text style={styles.breakdownLabel}>Day Total</Text>
                <Text style={styles.breakdownAmount}>$200.00</Text>
              </View>
            </View>

            <View style={styles.breakdownSection}>
              <View style={styles.dateHeader}>
                <Text style={styles.recurringText}>Weekly Recurring (Mon, Wed, Fri)</Text>
                <TouchableOpacity>
                  <MaterialCommunityIcons name="pencil" size={20} color={theme.colors.mainColors.main} />
                </TouchableOpacity>
              </View>
              <View style={styles.breakdownItem}>
                <Text style={styles.breakdownLabel}>Base Rate × 3 days</Text>
                <Text style={styles.breakdownAmount}>$450.00</Text>
              </View>
              <View style={[styles.breakdownItem, styles.totalItem]}>
                <Text style={styles.breakdownLabel}>Weekly Total</Text>
                <Text style={styles.breakdownAmount}>$450.00</Text>
              </View>
            </View>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.section}>
        <Text style={styles.sectionHeader}>Booking Breakdown</Text>
        <View style={styles.card}>
          <View style={styles.breakdownSection}>
            <View style={styles.dateHeader}>
              <Text style={styles.dateText}>
                {new Date(occurrence.start_date).toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric', 
                  year: 'numeric' 
                })}
              </Text>
              <TouchableOpacity>
                <MaterialCommunityIcons name="pencil" size={20} color={theme.colors.mainColors.main} />
              </TouchableOpacity>
            </View>
            <View style={styles.breakdownItem}>
              <Text style={styles.breakdownLabel}>Base Rate ({occurrence.start_time} - {occurrence.end_time})</Text>
              <Text style={styles.breakdownAmount}>{formatCurrency(occurrence.base_total)}</Text>
            </View>
            <View style={styles.breakdownItem}>
              <Text style={styles.breakdownLabel}>Extended Hours (2 hours)</Text>
              <Text style={styles.breakdownAmount}>$50.00</Text>
            </View>
            <View style={[styles.breakdownItem, styles.totalItem]}>
              <Text style={styles.breakdownLabel}>Day Total</Text>
              <Text style={styles.breakdownAmount}>{formatCurrency(occurrence.calculated_cost)}</Text>
            </View>
          </View>

          <View style={styles.breakdownSection}>
            <View style={styles.dateHeader}>
              <Text style={styles.recurringText}>Weekly Recurring (Mon, Wed, Fri)</Text>
              <TouchableOpacity>
                <MaterialCommunityIcons name="pencil" size={20} color={theme.colors.mainColors.main} />
              </TouchableOpacity>
            </View>
            <View style={styles.breakdownItem}>
              <Text style={styles.breakdownLabel}>Base Rate × 3 days</Text>
              <Text style={styles.breakdownAmount}>$450.00</Text>
            </View>
            <View style={[styles.breakdownItem, styles.totalItem]}>
              <Text style={styles.breakdownLabel}>Weekly Total</Text>
              <Text style={styles.breakdownAmount}>$450.00</Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  const renderTotalAmount = () => {
    debugLog('MBA54321 Rendering total amount with data:', bookingData?.cost_summary);
    const costSummary = bookingData?.cost_summary;
    if (!costSummary) {
      debugLog('MBA54321 No cost summary data available');
      return (
        <View style={styles.section}>
          <View style={styles.card}>
            <View style={styles.subtotalRow}>
              <Text style={styles.subtotalLabel}>Subtotal</Text>
              <Text style={styles.subtotalAmount}>$650.00</Text>
            </View>
            <View style={styles.totalAmountContainer}>
              <Text style={styles.totalLabel}>Total Amount</Text>
              <Text style={styles.totalAmount}>$650.00</Text>
            </View>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.section}>
        <View style={styles.card}>
          <View style={styles.subtotalRow}>
            <Text style={styles.subtotalLabel}>Subtotal</Text>
            <Text style={styles.subtotalAmount}>{formatCurrency(costSummary.subtotal)}</Text>
          </View>
          <View style={styles.totalAmountContainer}>
            <Text style={styles.totalLabel}>Total Amount</Text>
            <Text style={styles.totalAmount}>{formatCurrency(costSummary.total_client_cost)}</Text>
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
    padding: 16,
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
    paddingBottom: 16,
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
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.modernBorder,
  },
  breakdownSection: {
    marginBottom: 16,
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
  dateText: {
    fontSize: 16,
    fontFamily: theme.fonts.regular.fontFamily,
    color: theme.colors.text,
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
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.modernBorder,
    marginBottom: 0,
  },
  breakdownLabel: {
    fontSize: 16,
    fontFamily: theme.fonts.regular.fontFamily,
    color: theme.colors.text,
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
});

export default ReviewAndRatesCard; 