import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, Animated } from 'react-native';
import { theme } from '../styles/theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { format, parse } from 'date-fns';
import { useNavigation } from '@react-navigation/native';
import { navigateToFrom } from '../components/Navigation';

const UnavailableTimesModal = ({ 
  visible, 
  onClose, 
  selectedDates,
  currentAvailability,
  onRemoveTimeSlot,
  bookings
}) => {
  const navigation = useNavigation();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(600)).current;

  useEffect(() => {
    if (visible) {
      // Fade in the background overlay
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();

      // Slide up the modal content
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const handleClose = () => {
    // Animate out
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 600,
        duration: 300,
        useNativeDriver: true,
      })
    ]).start(() => {
      // Call onClose after animations complete
      onClose();
    });
  };

  const formatTime = (time) => {
    const [hours, minutes] = time.split(':');
    const date = new Date();
    date.setHours(parseInt(hours), parseInt(minutes));
    return format(date, 'h:mm a');
  };

  const handleBookingPress = async (bookingId) => {
    onClose(); // Close the modal first
    await navigateToFrom(navigation, 'BookingDetails', 'AvailabilitySettings', { bookingId });
  };

  const getUnavailableTimes = () => {
    if (!selectedDates || selectedDates.length === 0) return [];

    const allTimes = [];
    const processedTimes = new Set(); // Track processed time slots

    selectedDates.forEach(date => {
      const dateBookings = bookings[date] || [];
      const dateAvailability = currentAvailability[date];

      // Add bookings first
      dateBookings.forEach(booking => {
        const timeKey = `${date}-${booking.startTime}-${booking.endTime}`;
        if (!processedTimes.has(timeKey)) {
          allTimes.push({
            date,
            startTime: booking.startTime,
            endTime: booking.endTime,
            reason: `${booking.service_type}\nBooked with ${booking.client_name}`,
            isBooking: true,
            clientId: booking.clientId
          });
          processedTimes.add(timeKey);
        }
      });

      // Add personal unavailable times, excluding any that overlap with bookings
      if (dateAvailability?.unavailableTimes) {
        dateAvailability.unavailableTimes
          .filter(time => !time.clientId) // Only include non-booking unavailable times
          .forEach(time => {
            const timeKey = `${date}-${time.startTime}-${time.endTime}`;
            if (!processedTimes.has(timeKey)) {
              allTimes.push({
                date,
                startTime: time.startTime,
                endTime: time.endTime,
                reason: time.reason,
                isBooking: false
              });
              processedTimes.add(timeKey);
            }
          });
      }
    });

    // Sort by date and then by start time
    return allTimes.sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.startTime.localeCompare(b.startTime);
    });
  };

  const renderActionButton = (item) => {
    if (item.isBooking) {
      return (
        <TouchableOpacity
          style={styles.bookingButton}
          onPress={() => handleBookingPress(item.clientId)}
        >
          <MaterialCommunityIcons name="arrow-right" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
      );
    }
    
    return (
      <TouchableOpacity
        style={styles.removeButton}
        onPress={() => onRemoveTimeSlot(item.date, item)}
      >
        <MaterialCommunityIcons name="close" size={24} color={theme.colors.error} />
      </TouchableOpacity>
    );
  };

  const renderTimeSlot = (item, index) => {
    const formattedDate = format(parse(item.date, 'yyyy-MM-dd', new Date()), 'MMM d, yyyy');
    const formattedStartTime = formatTime(item.startTime);
    const formattedEndTime = formatTime(item.endTime);

    return (
      <View key={index} style={styles.timeSlotContainer}>
        <View style={styles.dateHeader}>
          <Text style={styles.dateText}>{formattedDate}</Text>
        </View>
        <View style={[
          styles.timeSlotContent,
          item.isBooking && styles.bookingContent
        ]}>
          <View style={styles.timeAndReason}>
            <Text style={styles.timeText}>
              {formattedStartTime} - {formattedEndTime}
            </Text>
            <Text style={styles.reasonText}>
              {item.reason}
            </Text>
          </View>
          {renderActionButton(item)}
        </View>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      onRequestClose={handleClose}
    >
      <Animated.View style={[
        styles.modalContainer,
        {
          opacity: fadeAnim,
        }
      ]}>
        <Animated.View style={[
          styles.modalContent,
          {
            transform: [{ translateY: slideAnim }]
          }
        ]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Unavailable Times</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <MaterialCommunityIcons name="close" size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.timesList}>
            {getUnavailableTimes().map((item, index) => renderTimeSlot(item, index))}
            {getUnavailableTimes().length === 0 && (
              <Text style={styles.emptyText}>No unavailable times for selected date(s)</Text>
            )}
          </ScrollView>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    padding: 20,
    width: '90%',
    maxWidth: 500,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: theme.fontSizes.large,
    fontWeight: 'bold',
    color: theme.colors.text,
    fontFamily: theme.fonts.header.fontFamily,
  },
  closeButton: {
    padding: 5,
  },
  timesList: {
    maxHeight: '90%',
  },
  timeSlotContainer: {
    marginBottom: 15,
  },
  dateHeader: {
    marginBottom: 8,
  },
  dateText: {
    fontSize: theme.fontSizes.medium,
    fontWeight: 'bold',
    color: theme.colors.text,
    fontFamily: theme.fonts.header.fontFamily,
  },
  timeSlotContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    backgroundColor: theme.colors.background,
    padding: 12,
    borderRadius: 8,
  },
  bookingContent: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  timeAndReason: {
    flex: 1,
  },
  timeText: {
    fontSize: theme.fontSizes.medium,
    color: theme.colors.text,
    marginBottom: 4,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  reasonText: {
    fontSize: theme.fontSizes.medium,
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  removeButton: {
    padding: 5,
    marginLeft: 10,
  },
  bookingButton: {
    padding: 5,
    marginLeft: 10,
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 2,
  },
  emptyText: {
    textAlign: 'center',
    color: theme.colors.textSecondary,
    fontSize: theme.fontSizes.medium,
    marginTop: 20,
    fontFamily: theme.fonts.regular.fontFamily,
  },
});

export default UnavailableTimesModal; 