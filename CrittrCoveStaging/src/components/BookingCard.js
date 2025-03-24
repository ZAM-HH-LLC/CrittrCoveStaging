// components/BookingCard.js
import React, { useContext, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../styles/theme';
import { AuthContext } from '../context/AuthContext';
import { convertDateTimeFromUTC, formatDate } from '../utils/time_utils';

const getStatusInfo = (status) => {
  switch (status) {
    case 'Pending Initial Professional Changes':
    case 'Pending Professional Changes':
      return {
        text: 'Pending Pro',
        bgColor: theme.colors.mybookings.main,
        textColor: theme.colors.mybookings.secondary,
        icon: 'clock-outline'
      };
    case 'Pending Client Approval':
      return {
        text: 'Pending Client',
        bgColor: theme.colors.mybookings.main,
        textColor: theme.colors.mybookings.secondary,
        icon: 'clock-outline'
      };
    case 'Confirmed':
      return {
        text: 'Confirmed',
        bgColor: theme.colors.mybookings.confirmedBg,
        textColor: theme.colors.mybookings.confirmedText,
        icon: 'check-circle-outline'
      };
    case 'Completed':
      return {
        text: 'Completed',
        bgColor: theme.colors.mybookings.completedBg,
        textColor: theme.colors.mybookings.completedText,
        icon: 'flag-checkered'
      };
    case 'Confirmed Pending Professional Changes':
      return {
        text: 'Confirmed • Pending Pro',
        bgColor: theme.colors.mybookings.confirmedBg,
        textColor: theme.colors.mybookings.confirmedText,
        icon: 'check-circle-outline'
      };
    case 'Confirmed Pending Client Approval':
      return {
        text: 'Confirmed • Pending Client',
        bgColor: theme.colors.mybookings.confirmedBg,
        textColor: theme.colors.mybookings.confirmedText,
        icon: 'check-circle-outline'
      };
    default:
      return {
        text: status,
        bgColor: theme.colors.mybookings.main,
        textColor: theme.colors.mybookings.secondary,
        icon: 'clock-outline'
      };
  }
};

const BookingCard = ({ booking, type, onViewDetails }) => {
  const { id, status, date, time, serviceName } = booking;
  const name = type === 'professional' ? booking.clientName : booking.professionalName;
  const statusInfo = getStatusInfo(status);
  const pets = booking.pets || [];
  const { screenWidth, timeSettings } = useContext(AuthContext);
  const isMobile = screenWidth < 600;
  const [isHovered, setIsHovered] = useState(false);

  // Convert time from UTC to user's timezone if needed
  const convertedDateTime = timeSettings?.timezone !== 'UTC' && date && time
    ? convertDateTimeFromUTC(date, time, timeSettings.timezone, timeSettings.use_military_time)
    : date && time ? { date, time } : null;

  const convertedTime = convertedDateTime?.time;
  const convertedDate = convertedDateTime?.date ? formatDate(convertedDateTime.date) : 'No date selected';

  console.log('MBA134njo0vh03 convertedTime: ', convertedTime);
  console.log('MBA134njo0vh03 convertedDate: ', convertedDate);
  const getMetaText = () => {
    // const dateText = date ? formatDate(date) : 'No date selected';
    const timeText = convertedTime || 'No time selected';
    const serviceText = serviceName || 'No service selected';

    if (isMobile) {
      return (
        <View style={styles.mobileMetaInfo}>
          <View style={styles.mobileMetaRow}>
            <View style={styles.metaItemContainer}>
              <MaterialCommunityIcons name="calendar" size={16} color={theme.colors.mybookings.metaText} />
              <Text style={styles.metaText}>{convertedDate}</Text>
            </View>
            <View style={styles.metaItemContainer}>
              <MaterialCommunityIcons name="clock-outline" size={16} color={theme.colors.mybookings.metaText} />
              <Text style={styles.metaText}>{timeText}</Text>
            </View>
            <View style={styles.metaItemContainer}>
              <MaterialCommunityIcons name="paw" size={16} color={theme.colors.mybookings.metaText} />
              <Text style={styles.metaText}>{serviceText}</Text>
            </View>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.metaInfo}>
        <View style={styles.metaItemContainer}>
          <MaterialCommunityIcons name="calendar" size={16} color={theme.colors.mybookings.metaText} />
          <Text style={styles.metaText}>{convertedDate}</Text>
        </View>
        <Text style={styles.metaText}> • </Text>
        <View style={styles.metaItemContainer}>
          <MaterialCommunityIcons name="clock-outline" size={16} color={theme.colors.mybookings.metaText} />
          <Text style={styles.metaText}>{timeText}</Text>
        </View>
        <Text style={styles.metaText}> • </Text>
        <View style={styles.metaItemContainer}>
          <MaterialCommunityIcons name="paw" size={16} color={theme.colors.mybookings.metaText} />
          <Text style={styles.metaText}>{serviceText}</Text>
        </View>
      </View>
    );
  };

  return (
    <TouchableOpacity 
      style={[
        styles.card,
        Platform.OS === 'web' && isHovered && styles.cardHovered
      ]}
      onPress={onViewDetails}
      onMouseEnter={() => Platform.OS === 'web' && setIsHovered(true)}
      onMouseLeave={() => Platform.OS === 'web' && setIsHovered(false)}
    >
      <View style={[styles.cardContent, isMobile && styles.mobileCardContent]}>
        <View style={[styles.topContent, isMobile && styles.mobileTopContent]}>
          <Image 
            source={require('../../assets/default-profile.png')} 
            style={[
              styles.profileImage,
              isMobile && styles.mobileProfileImage
            ]}
          />
          <View style={[styles.contentContainer, isMobile && styles.mobileContentContainer]}>
            <View style={[styles.headerContainer, isMobile && styles.mobileHeaderContainer]}>
              <View style={styles.nameAndPets}>
                <Text style={styles.name}>{name}</Text>
                <Text style={styles.petInfo}>
                  {pets.length > 0 ? pets.map(pet => pet.name).join(', ') : 'No pets selected'}
                </Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: statusInfo.bgColor }]}>
                <View style={styles.statusContent}>
                  <MaterialCommunityIcons 
                    name={statusInfo.icon} 
                    size={16} 
                    color={statusInfo.textColor}
                  />
                  <Text style={[styles.statusText, { color: statusInfo.textColor }]}>
                    {statusInfo.text}
                  </Text>
                </View>
              </View>
            </View>
            {!isMobile && getMetaText()}
          </View>
          {!isMobile && (
            <TouchableOpacity
              style={styles.viewDetailsButton}
              onPress={onViewDetails}
            >
              <Text style={styles.viewDetailsText}>View Details</Text>
            </TouchableOpacity>
          )}
        </View>
        {isMobile && (
          <>
            <View style={styles.mobileDivider} />
            {getMetaText()}
          </>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surfaceContrast,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    ...(Platform.OS === 'web' && {
      transition: 'all 0.2s ease-in-out',
      cursor: 'pointer',
    })
  },
  cardHovered: {
    transform: [{ scale: 1.02 }],
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  cardContent: {
    flexDirection: 'column',
  },
  mobileCardContent: {
    gap: 12,
  },
  topContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  mobileTopContent: {
    marginBottom: 0,
  },
  profileImage: {
    width: 88,
    height: 88,
    borderRadius: 44,
  },
  mobileProfileImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  contentContainer: {
    flex: 1,
  },
  mobileContentContainer: {
    flex: 1,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  mobileHeaderContainer: {
    marginBottom: 0,
  },
  nameAndPets: {
    flex: 1,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
  },
  statusContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    fontFamily: theme.fonts.regular.fontFamily,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.mybookings.ownerName,
    marginBottom: 8,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  petInfo: {
    fontSize: 14,
    color: '#888975',
    // marginBottom: 4,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  mobileDivider: {
    height: 1,
    backgroundColor: theme.colors.surface,
    width: '100%',
    // marginVertical: 12,
  },
  metaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  mobileMetaInfo: {
    width: '100%',
  },
  mobileMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
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