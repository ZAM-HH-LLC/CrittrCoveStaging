// First, create a new BookingCard component
// src/components/BookingCard.js

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../styles/theme';
import { format, parse } from 'date-fns';
import { useNavigation } from '@react-navigation/native';

const AvailabilityBookingCard = ({ booking, onPress, onEdit }) => {
  const navigation = useNavigation();
  const formatTime = (time) => {
    try {
      const date = parse(time, 'HH:mm', new Date());
      return format(date, 'h:mm a');
    } catch (error) {
      console.warn(`Invalid time format: ${time}`);
      return 'Invalid Time';
    }
  };

  const handlePress = () => {
    if (onPress) {
      onPress(booking);
    }
  };

  return (
    <TouchableOpacity 
      style={styles.card} 
      onPress={handlePress}
    >
      <View style={styles.cardContent}>
        <View style={styles.timeContainer}>
          <MaterialCommunityIcons name="clock-outline" size={20} color={theme.colors.primary} />
          <Text style={styles.timeText}>
            {formatTime(booking.startTime)} - {formatTime(booking.endTime)}
          </Text>
        </View>
        <Text style={styles.clientName}>Booked with {booking.client_name}</Text>
      </View>
      <TouchableOpacity 
        style={styles.editButton} 
        onPress={handlePress}
      >
        <MaterialCommunityIcons name="pencil" size={20} color={theme.colors.primary} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  cardContent: {
    flex: 1,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  timeText: {
    marginLeft: 8,
    fontSize: theme.fontSizes.medium,
    color: theme.colors.text,
    fontWeight: '500',
  },
  clientName: {
    fontSize: theme.fontSizes.small,
    color: theme.colors.textSecondary,
  },
  editButton: {
    padding: 8,
  },
});

export default AvailabilityBookingCard;