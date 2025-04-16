import React, { useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../styles/theme';
import { AuthContext, debugLog } from '../context/AuthContext';

const ConnectionCard = ({ connection, type, onViewProfile, onCreateBooking }) => {
  // Determine if this is a client or professional connection
  const isClient = type === 'clients';
  const { screenWidth } = useContext(AuthContext);
  const isMobile = screenWidth < 900;
  const isWideScreen = screenWidth >= 1200;
  const isExtraWideScreen = screenWidth >= 1500;
  
  debugLog('MBA4321 Rendering ConnectionCard:', {
    connectionId: connection.id,
    connectionName: connection.name,
    connectionType: type,
    conversationId: connection.conversation_id,
    lastBookingDate: connection.last_booking_date,
    isMobile,
    isWideScreen,
    isExtraWideScreen,
    screenWidth
  });
  
  return (
    <View style={styles.card}>
      <View style={styles.contentContainer}>
        <View style={styles.topRow}>
          <View style={[
            styles.profileInfo,
            !isExtraWideScreen && styles.profileInfoWrap
          ]}>
            <Image 
              source={connection.avatar ? { uri: connection.avatar } : require('../../assets/default-profile.png')} 
              style={styles.avatar} 
            />
            
            <View style={[
              styles.nameContainer,
              isWideScreen && styles.nameContainerWide
            ]}>
              <Text style={styles.name}>{connection.name}</Text>
              
              {isClient ? (
                <View style={styles.petsContainer}>
                  <Text style={styles.petsLabel}>Pets: </Text>
                  <Text style={[
                    styles.petsText,
                    isWideScreen && styles.petsTextWide
                  ]}>
                    {connection.pets?.length > 0 
                      ? connection.pets.map(pet => `${pet.name} (${pet.type})`).join(', ') 
                      : 'No pets added yet'}
                  </Text>
                </View>
              ) : (
                <View style={styles.servicesContainer}>
                  <Text style={styles.servicesLabel}>Services: </Text>
                  <Text style={[
                    styles.servicesText,
                    isWideScreen && styles.servicesTextWide
                  ]}>
                    {connection.services?.join(', ') || 'No services'}
                  </Text>
                </View>
              )}
              
              {connection.last_booking_date ? (
                <View style={styles.pastBookingsContainer}>
                  <MaterialCommunityIcons name="calendar-clock" size={14} color={"#9C27B0"} />
                  <Text style={styles.pastBookingsText}>
                    Past Bookings
                  </Text>
                </View>
              ) : (
                <View style={styles.noBookingsContainer}>
                  <Text style={styles.noBookingsText}>
                    No Bookings Yet
                  </Text>
                </View>
              )}
            </View>
          </View>
          
          {!isMobile && (
            <View style={[
              styles.buttonSection,
              !isExtraWideScreen && styles.buttonSectionWrap
            ]}>
              <TouchableOpacity 
                style={styles.viewProfileButton}
                onPress={() => {
                  debugLog('MBA4321 View Messages button clicked', {
                    connectionName: connection.name,
                    conversationId: connection.conversation_id
                  });
                  onViewProfile(connection);
                }}
              >
                <Text style={styles.viewProfileText}>View Messages</Text>
              </TouchableOpacity>
              
              {isClient && (
                <TouchableOpacity 
                  style={styles.createBookingButton}
                  onPress={() => {
                    debugLog('MBA4321 Create Booking button clicked', {
                      connectionName: connection.name,
                      conversationId: connection.conversation_id
                    });
                    onCreateBooking(connection);
                  }}
                >
                  <Text style={styles.createBookingText}>Create Booking</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {connection.last_booking && (
          <View style={styles.statusSection}>
            <View style={styles.lastBookingContainer}>
              <MaterialCommunityIcons name="calendar-clock" size={16} color={theme.colors.text} />
              <Text style={styles.lastBookingText}>
                Last booking: {connection.last_booking}
              </Text>
            </View>
      
            {connection.upcoming_booking && (
              <View style={styles.upcomingContainer}>
                <MaterialCommunityIcons name="calendar-check" size={16} color={theme.colors.primary} />
                <Text style={styles.upcomingText}>
                  Upcoming Booking
                </Text>
              </View>
            )}
          </View>
        )}

        {isMobile && (
          <View style={styles.mobileBtnSection}>
            <TouchableOpacity 
              style={styles.viewProfileButton}
              onPress={() => {
                debugLog('MBA4321 View Messages button clicked (mobile)', {
                  connectionName: connection.name,
                  conversationId: connection.conversation_id
                });
                onViewProfile(connection);
              }}
            >
              <Text style={styles.viewProfileText}>View Messages</Text>
            </TouchableOpacity>
            
            {isClient && (
              <TouchableOpacity 
                style={styles.createBookingButton}
                onPress={() => {
                  debugLog('MBA4321 Create Booking button clicked (mobile)', {
                    connectionName: connection.name,
                    conversationId: connection.conversation_id
                  });
                  onCreateBooking(connection);
                }}
              >
                <Text style={styles.createBookingText}>Create Booking</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surfaceContrast,
    borderRadius: 8,
    // marginBottom: 16,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    width: '100%',
  },
  contentContainer: {
    width: '100%',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    width: '100%',
    flexWrap: 'wrap',
  },
  profileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
  },
  profileInfoWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: '70%',
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 16,
    flexShrink: 0,
  },
  nameContainer: {
    flex: 1,
    justifyContent: 'center',
    minWidth: 0,
    marginRight: 16,
  },
  nameContainerWide: {
    maxWidth: '60%',
  },
  name: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    fontFamily: theme.fonts.header.fontFamily,
    marginBottom: 8,
  },
  petsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginBottom: 8,
  },
  petsLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    fontFamily: theme.fonts.regular.fontFamily,
    flexShrink: 0,
  },
  petsText: {
    fontSize: 14,
    color: theme.colors.text,
    fontFamily: theme.fonts.regular.fontFamily,
    flex: 1,
    minWidth: 0,
  },
  petsTextWide: {
    maxWidth: '80%',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  servicesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginBottom: 8,
  },
  servicesLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    fontFamily: theme.fonts.regular.fontFamily,
    flexShrink: 0,
  },
  servicesText: {
    fontSize: 14,
    color: theme.colors.text,
    fontFamily: theme.fonts.regular.fontFamily,
    flex: 1,
    minWidth: 0,
  },
  servicesTextWide: {
    maxWidth: '80%',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  statusSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    marginTop: 8,
  },
  lastBookingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lastBookingText: {
    marginLeft: 6,
    fontSize: 14,
    color: theme.colors.text,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  noBookingsContainer: {
    alignSelf: 'flex-start',
    backgroundColor: '#F5F5F4',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: 2,
  },
  noBookingsText: {
    fontSize: 12,
    color: theme.colors.placeholder,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  pastBookingsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#F3E5F5',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: 2,
  },
  pastBookingsText: {
    marginLeft: 6,
    fontSize: 12,
    color: '#9C27B0',
    fontFamily: theme.fonts.regular.fontFamily,
  },
  upcomingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9E5',
    padding: 6,
    borderRadius: 16,
  },
  upcomingText: {
    marginLeft: 6,
    fontSize: 14,
    color: theme.colors.primary,
    fontFamily: theme.fonts.regular.fontFamily,
    fontWeight: '500',
  },
  buttonSection: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    justifyContent: 'flex-end',
    flexShrink: 0,
  },
  buttonSectionWrap: {
    marginTop: 12,
    marginLeft: 'auto',
  },
  mobileBtnSection: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 12,
  },
  viewProfileButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#F0F9E5',
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewProfileText: {
    color: theme.colors.primary,
    fontSize: 14,
    fontWeight: '600',
    fontFamily: theme.fonts.regular.fontFamily,
  },
  createBookingButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: theme.colors.primary,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createBookingText: {
    color: theme.colors.surfaceContrast,
    fontSize: 14,
    fontWeight: '600',
    fontFamily: theme.fonts.regular.fontFamily,
  },
});

export default ConnectionCard; 