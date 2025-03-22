// components/BookingCard.js
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { theme } from '../styles/theme';

const getStatusInfo = (status) => {
  switch (status) {
    case 'Pending Initial Professional Changes':
    case 'Pending Professional Changes':
      return {
        text: 'Pending Pro',
        bgColor: theme.colors.mybookings.main,
        textColor: theme.colors.mybookings.secondary
      };
    case 'Pending Client Approval':
      return {
        text: 'Pending Client',
        bgColor: theme.colors.mybookings.main,
        textColor: theme.colors.mybookings.secondary
      };
    case 'Confirmed':
      return {
        text: 'Confirmed',
        bgColor: theme.colors.mybookings.confirmedBg,
        textColor: theme.colors.mybookings.confirmedText
      };
    case 'Completed':
      return {
        text: 'Completed',
        bgColor: theme.colors.mybookings.completedBg,
        textColor: theme.colors.mybookings.completedText
      };
    case 'Confirmed Pending Professional Changes':
      return {
        text: 'Confirmed • Pending Pro',
        bgColor: theme.colors.mybookings.confirmedBg,
        textColor: theme.colors.mybookings.confirmedText
      };
    case 'Confirmed Pending Client Approval':
      return {
        text: 'Confirmed • Pending Client',
        bgColor: theme.colors.mybookings.confirmedBg,
        textColor: theme.colors.mybookings.confirmedText
      };
    default:
      return {
        text: status,
        bgColor: theme.colors.mybookings.main,
        textColor: theme.colors.mybookings.secondary
      };
  }
};

const BookingCard = ({ booking, type, onViewDetails }) => {
  const { id, status, date, time, serviceName } = booking;
  const name = type === 'professional' ? booking.clientName : booking.professionalName;
  const statusInfo = getStatusInfo(status);
  const pets = booking.pets || [];

  return (
    <View style={styles.card}>
      <View style={styles.cardContent}>
        <View style={styles.leftContent}>
          <Image 
            source={require('../../assets/default-profile.png')} 
            style={styles.profileImage}
          />
          <View style={[styles.statusBadge, { backgroundColor: statusInfo.bgColor }]}>
            <Text style={[styles.statusText, { color: statusInfo.textColor }]}>
              {statusInfo.text}
            </Text>
          </View>
          <Text style={styles.name}>{name}</Text>
          <Text style={styles.petInfo}>
            {pets.map(pet => pet.name).join(', ')}
          </Text>
          <View style={styles.metaInfo}>
            <Text style={styles.metaText}>{date}</Text>
            <Text style={styles.metaText}> • </Text>
            <Text style={styles.metaText}>{time}</Text>
            <Text style={styles.metaText}> • </Text>
            <Text style={styles.metaText}>{serviceName}</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.viewDetailsButton}
          onPress={onViewDetails}
        >
          <Text style={styles.viewDetailsText}>View Details</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surfaceContrast,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  cardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leftContent: {
    flex: 1,
  },
  profileImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginBottom: 8,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    marginBottom: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    fontFamily: theme.fonts.regular.fontFamily,
  },
  name: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.mybookings.ownerName,
    marginBottom: 4,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  petInfo: {
    fontSize: 14,
    color: theme.colors.text,
    marginBottom: 4,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  metaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  metaText: {
    fontSize: 14,
    color: theme.colors.mybookings.metaText,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  viewDetailsButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  viewDetailsText: {
    color: theme.colors.surfaceContrast,
    fontSize: 14,
    fontWeight: '500',
    fontFamily: theme.fonts.regular.fontFamily,
  },
});

export default BookingCard;