import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { theme } from '../styles/theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { format, parse } from 'date-fns';

const UnavailableTimeSlot = ({ startTime, endTime, reason, onPress, onRemove }) => {
  const [showAllServices, setShowAllServices] = useState(false);
  
  const isAllDay = startTime === '00:00' && endTime === '24:00';

  const formatTime = (time) => {
    if (isAllDay) {
      return 'All Day';
    }
    
    if (typeof time === 'string') {
      try {
        const date = parse(time, 'HH:mm', new Date());
        return format(date, 'h:mm a');
      } catch (error) {
        console.warn(`Invalid time format: ${time}`);
        return 'Invalid Time';
      }
    } else if (time instanceof Date) {
      return format(time, 'h:mm a');
    } else {
      console.warn(`Invalid time format: ${time}`);
      return 'Invalid Time';
    }
  };

  const formatServicesDisplay = () => {
    const services = reason?.replace('Unavailable for: ', '').split(', ') || [];
    
    if (services.length === 0) return 'No services specified';
    if (services.length === 10) return 'All Services';
    return `${services.length} ${services.length === 1 ? 'Service' : 'Services'}`;
  };

  return (
    <>
      <View style={styles.container}>
        <TouchableOpacity 
          style={styles.removeButton} 
          onPress={onRemove}
        >
          <MaterialCommunityIcons name="close" size={20} color={theme.colors.error} />
        </TouchableOpacity>
        
        <View style={styles.contentContainer}>
          <Text style={styles.time}>
            {isAllDay ? 'All Day' : `${formatTime(startTime)} - ${formatTime(endTime)}`}
          </Text>
          <View style={styles.serviceContainer}>
            <Text style={styles.reason}>{formatServicesDisplay()}</Text>
            {reason && (
              <TouchableOpacity 
                onPress={() => setShowAllServices(true)}
                style={styles.seeMoreButton}
              >
                <Text style={styles.seeMoreText}>See All</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      <Modal
        visible={showAllServices}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowAllServices(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowAllServices(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Unavailable Services</Text>
              <TouchableOpacity onPress={() => setShowAllServices(false)}>
                <MaterialCommunityIcons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalTime}>
              {formatTime(startTime)} - {formatTime(endTime)}
            </Text>
            {reason?.replace('Unavailable for: ', '').split(', ').map((service, index) => (
              <Text key={index} style={styles.serviceItem}>• {service}</Text>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: theme.colors.lightGrey,
    borderRadius: 5,
    marginBottom: 5,
  },
  removeButton: {
    padding: 5,
    marginRight: 5,
  },
  contentContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  time: {
    fontSize: theme.fontSizes.small,
    fontWeight: 'bold',
    flex: 1,
  },
  serviceContainer: {
    flex: 2,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  reason: {
    fontSize: theme.fontSizes.small,
    color: theme.colors.textSecondary,
    marginRight: 8,
  },
  seeMoreButton: {
    padding: 4,
    borderRadius: 4,
    backgroundColor: theme.colors.primary,
  },
  seeMoreText: {
    color: theme.colors.whiteText,
    fontSize: theme.fontSizes.small,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: theme.colors.background,
    borderRadius: 8,
    padding: 16,
    width: '80%',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: theme.fontSizes.large,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  modalTime: {
    fontSize: theme.fontSizes.medium,
    color: theme.colors.text,
    marginBottom: 12,
  },
  serviceItem: {
    fontSize: theme.fontSizes.medium,
    color: theme.colors.text,
    paddingVertical: 4,
  },
});

export default UnavailableTimeSlot;
