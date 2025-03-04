// components/BookingCard.js
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { theme } from '../styles/theme';

const BookingCard = ({ booking, type, onViewDetails, onCancel }) => {
  const { id, status, date, time } = booking;
  const name = type === 'professional' ? booking.clientName : booking.professionalName;

  return (
    <TouchableOpacity 
      style={styles.card}
      onPress={() => onViewDetails()}
      activeOpacity={0.7}
    >
      <View>
        <View style={styles.header}>
          <Text style={styles.bookingId}>Booking #{id}</Text>
          <Text style={[
            styles.status,
            { color: status === 'Confirmed' ? theme.colors.success : theme.colors.warning }
          ]}>
            {status}
          </Text>
        </View>

        <Text style={styles.name}>
          {type === 'professional' ? 'Client: ' : 'Professional: '}{name}
        </Text>
        
        <Text style={styles.datetime}>
          {date} at {time}
        </Text>

        <View style={styles.buttonContainer}>
          
          <TouchableOpacity
            style={[styles.button, styles.cancelButton]}
            onPress={(e) => {
              e.stopPropagation(); // Prevent card click when button is clicked
              onCancel();
            }}
          >
            <Text style={[styles.buttonText, styles.cancelButtonText]}>
              Cancel Booking
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.viewButton]}
            onPress={(e) => {
              e.stopPropagation(); // Prevent card click when button is clicked
              onViewDetails();
            }}
          >
            <Text style={styles.buttonText}>View Details</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  bookingId: {
    fontSize: theme.fontSizes.medium,
    fontWeight: 'bold',
    color: theme.colors.primary,
    fontFamily: theme.fonts.header.fontFamily,
  },
  status: {
    fontSize: theme.fontSizes.smallMedium,
    fontWeight: '500',
    fontFamily: theme.fonts.regular.fontFamily,
  },
  name: {
    fontSize: theme.fontSizes.medium,
    marginBottom: 4,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  datetime: {
    fontSize: theme.fontSizes.smallMedium,
    color: theme.colors.placeholder,
    marginBottom: 16,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  button: {
    flex: 1,
    padding: 8,
    borderRadius: 4,
    alignItems: 'center',
  },
  viewButton: {
    backgroundColor: theme.colors.primary,
  },
  cancelButton: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.error,
  },
  buttonText: {
    color: theme.colors.surface,
    fontWeight: '500',
    fontFamily: theme.fonts.regular.fontFamily,
  },
  cancelButtonText: {
    color: theme.colors.error,
    fontFamily: theme.fonts.regular.fontFamily,
  },
});

export default BookingCard;