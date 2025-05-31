// components/BookingCard.js
import React, { useContext, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../styles/theme';
import { AuthContext, debugLog } from '../context/AuthContext';
import { convertDateTimeFromUTC, formatDate } from '../utils/time_utils';
import { supportsHover } from '../utils/deviceUtils';

const getStatusInfo = (status) => {
  // Add debugging for status values
  debugLog("MBA5677: Processing status", { status });
  
  switch (status) {
    case 'Pending Initial Professional Changes':
    case 'Pending Professional Changes':
      return {
        text: 'Pending Pro',
        bgColor: theme.colors.mybookings.main,
        textColor: theme.colors.mybookings.secondary,
        icon: 'clock-outline'
      };
    case 'Pending Owner Approval':
      return {
        text: 'Pending Owner',
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
    case 'Confirmed Pending Owner Approval':
      return {
        text: 'Confirmed • Pending Owner',
        bgColor: theme.colors.mybookings.confirmedBg,
        textColor: theme.colors.mybookings.confirmedText,
        icon: 'check-circle-outline'
      };
    default:
      return {
        text: status || 'Unknown',
        bgColor: theme.colors.mybookings.main,
        textColor: theme.colors.mybookings.secondary,
        icon: 'clock-outline'
      };
  }
};

const BookingCard = ({ booking, type, onViewDetails }) => {
  const { id, status, date, time, serviceName } = booking;
  
  // Handle both client_name and professional_name, with fallbacks for backward compatibility
  let name = '';
  if (type === 'professional') {
    name = booking.client_name || booking.ownerName || 'Client';
    debugLog("MBA5677: Using client name for professional view", { client_name: booking.client_name, ownerName: booking.ownerName });
  } else {
    name = booking.professional_name || booking.professionalName || 'Professional';
    debugLog("MBA5677: Using professional name for client view", { professional_name: booking.professional_name, professionalName: booking.professionalName });
  }
  
  const statusInfo = getStatusInfo(status);
  const pets = booking.pets || [];
  const { screenWidth, timeSettings } = useContext(AuthContext);
  const isMobile = screenWidth < 600;
  const [isHovered, setIsHovered] = useState(false);
  
  // Check if device supports hover
  const deviceSupportsHover = supportsHover();

  // Add debugging for incoming date
  debugLog("MBA5677: Original booking date/time", { date, time });

  // Convert time from UTC to user's timezone if needed
  const convertedDateTime = timeSettings?.timezone !== 'UTC' && date && time
    ? convertDateTimeFromUTC(date, time, timeSettings?.timezone || 'America/Denver', timeSettings?.use_military_time || false)
    : date && time ? { date, time } : null;

  // Format the date for display using the moment-based approach
  const formattedDate = convertedDateTime?.date 
    ? (() => {
        debugLog("MBA5677: Formatting with direct date", convertedDateTime.date);
        const parts = convertedDateTime.date.split('-');
        if (parts.length === 3) {
          const [year, month, day] = parts;
          // Create date object directly
          const dateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
          if (!isNaN(dateObj.getTime())) {
            const monthName = dateObj.toLocaleString('default', { month: 'short' });
            debugLog("MBA5677: Formatted date parts", { year, month, day, monthName, day: dateObj.getDate() });
            return `${monthName} ${dateObj.getDate()}`;
          }
        }
        // Fallback to original date if parsing fails
        return convertedDateTime.date;
      })()
    : 'No date selected';
    
  const convertedTime = convertedDateTime?.time;

  debugLog("MBA5677: Converted date/time", { 
    formattedDate,
    convertedTime,
    convertedDateTime,
    timezone: timeSettings?.timezone,
    originalDate: date,
    originalTime: time
  });

  const getMetaText = () => {
    const timeText = convertedTime || 'No time selected';
    const serviceText = serviceName || 'No service selected';

    if (isMobile) {
      return (
        <View style={styles.mobileMetaInfo}>
          <View style={styles.mobileMetaRow}>
            <View style={styles.metaItemContainer}>
              <MaterialCommunityIcons name="calendar" size={14} color={theme.colors.mybookings.metaText} />
              <Text style={styles.metaText}>{formattedDate}</Text>
            </View>
            <View style={styles.metaItemContainer}>
              <MaterialCommunityIcons name="clock-outline" size={14} color={theme.colors.mybookings.metaText} />
              <Text style={styles.metaText}>{timeText}</Text>
            </View>
            <View style={styles.metaItemContainer}>
              <MaterialCommunityIcons name="briefcase-outline" size={14} color={theme.colors.mybookings.metaText} />
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
          <Text style={styles.metaText}>{formattedDate}</Text>
        </View>
        <Text style={styles.metaText}> • </Text>
        <View style={styles.metaItemContainer}>
          <MaterialCommunityIcons name="clock-outline" size={16} color={theme.colors.mybookings.metaText} />
          <Text style={styles.metaText}>{timeText}</Text>
        </View>
        <Text style={styles.metaText}> • </Text>
        <View style={styles.metaItemContainer}>
          <MaterialCommunityIcons name="briefcase-outline" size={16} color={theme.colors.mybookings.metaText} />
          <Text style={styles.metaText}>{serviceText}</Text>
        </View>
      </View>
    );
  };

  // Add debugging for complete booking object and type
  debugLog("MBA5677: Rendering BookingCard", { 
    booking,
    type,
    name,
    status
  });

  return (
    <TouchableOpacity 
      style={[
        styles.card,
        Platform.OS === 'web' && isHovered && styles.cardHovered
      ]}
      onPress={onViewDetails}
      onMouseEnter={() => deviceSupportsHover && setIsHovered(true)}
      onMouseLeave={() => deviceSupportsHover && setIsHovered(false)}
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
                <View style={[styles.clientContainer, isMobile && styles.mobileClientContainer]}>
                  <MaterialCommunityIcons 
                    name="account" 
                    size={isMobile ? 16 : 18} 
                    color={theme.colors.mybookings.ownername} 
                  />
                  <Text style={[styles.name, isMobile && styles.mobileName]}>{name}</Text>
                </View>
                <View style={[styles.petContainer, isMobile && styles.mobilePetContainer]}>
                  <MaterialCommunityIcons name="paw" size={isMobile ? 14 : 14} color={theme.colors.mybookings.metaText} />
                  <Text style={[styles.petInfo, isMobile && styles.mobilePetInfo]}>
                    {pets.length > 0 ? pets.map(pet => pet.name).join(', ') : 'No pets selected'}
                  </Text>
                </View>
              </View>
              <View style={[
                styles.statusBadge, 
                { backgroundColor: statusInfo.bgColor },
                isMobile && styles.mobileStatusBadge
              ]}>
                <View style={styles.statusContent}>
                  <MaterialCommunityIcons 
                    name={statusInfo.icon} 
                    size={isMobile ? 12 : 16} 
                    color={statusInfo.textColor}
                  />
                  <Text style={[
                    styles.statusText, 
                    { color: statusInfo.textColor },
                    isMobile && styles.mobileStatusText
                  ]}>
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
  clientContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.mybookings.ownerName,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  petContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  petInfo: {
    fontSize: 14,
    color: '#888975',
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
  mobileClientContainer: {
    marginBottom: 4,
  },
  mobileName: {
    fontSize: 15,
    color: theme.colors.mybookings.ownerName,
  },
  mobilePetContainer: {
    marginBottom: 2,
  },
  mobilePetInfo: {
    fontSize: 13,
    color: theme.colors.mybookings.metaText,
  },
  mobileStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  mobileStatusText: {
    fontSize: 10,
  },
});

export default BookingCard;