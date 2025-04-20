import React, { useContext, useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../styles/theme';
import { approveBooking } from '../api/API';
import { formatDateTimeRangeFromUTC, convertTo24Hour } from '../utils/time_utils';
import { AuthContext, debugLog } from '../context/AuthContext';
import moment from 'moment-timezone';
import BookingApprovalModal from './BookingApprovalModal';

// A simplified version of checkDSTChange that only relies on moment-timezone
const checkDSTChange = (startDate, startTime, endDate, endTime, timezone) => {
  try {
    // Create UTC moments for start and end time
    const startMoment = moment.utc(`${startDate}T${startTime}:00Z`).tz(timezone);
    const endMoment = moment.utc(`${endDate}T${endTime}:00Z`).tz(timezone);
    
    // Check if the offset from UTC (in minutes) is different
    return startMoment.utcOffset() !== endMoment.utcOffset();
  } catch (error) {
    debugLog('MBA9876DST Error checking DST change:', error);
    return false;
  }
};

const BookingMessageCard = ({ 
  type,  // 'request' or 'approval'
  data,
  isFromMe,
  onPress,
  isProfessional,
  onApproveSuccess,
  onApproveError,
  onEditDraft
}) => {
  const { timeSettings } = useContext(AuthContext);
  const userTimezone = timeSettings?.timezone || 'US/Mountain';
  const [approvalModalVisible, setApprovalModalVisible] = useState(false);
  const [safeInitialData, setSafeInitialData] = useState(null);
  
  // Create safe data on component load
  useEffect(() => {
    // Ensure we have basic rate data for the initial load
    const preparedData = {
      ...data,
      occurrences: data.occurrences?.map(occ => ({
        ...occ,
        rates: occ.rates || {
          base_rate: 0,
          additional_animal_rate: 0,
          applies_after: 1,
          holiday_rate: 0,
          holiday_days: 0,
          additional_rates: []
        }
      }))
    };
    setSafeInitialData(preparedData);
  }, [data]);

  const getIcon = () => {
    switch (type) {
      case 'request':
        return 'calendar-plus';
      case 'approval':
        return 'calendar-check';
      default:
        return 'calendar';
    }
  };

  const getTitle = () => {
    switch (type) {
      case 'request':
        return 'Booking Request';
      case 'approval':
        return 'Approval Request';
      default:
        return 'Booking';
    }
  };

  const getCardStyle = () => {
    const baseStyle = [
      styles.card,
      isFromMe ? styles.sentCard : styles.receivedCard
    ];

    if (type === 'approval') {
      baseStyle.push(styles.approvalCard);
    }

    return baseStyle;
  };

  const getHeaderStyle = () => {
    return [
      styles.header,
      type === 'approval' ? styles.approvalHeader : styles.requestHeader
    ];
  };

  const handleApprove = async () => {
    try {
      const response = await approveBooking(data.booking_id);
      
      // Call the success callback if provided
      if (onApproveSuccess) {
        onApproveSuccess(response);
      }
    } catch (error) {
      console.error('Error approving booking from message card:', error);
      // Call the error callback if provided
      if (onApproveError) {
        onApproveError(error.response?.data?.error || 'Failed to approve booking');
      }
    }
  };

  const handleOpenApprovalModal = () => {
    // Use the modal for approval type cards
    if (type === 'approval') {
      if (!safeInitialData) {
        // If safeInitialData isn't ready yet, create it now
        const tempData = {
          ...data,
          occurrences: data.occurrences?.map(occ => ({
            ...occ,
            rates: occ.rates || {
              base_rate: 0,
              additional_animal_rate: 0,
              applies_after: 1,
              holiday_rate: 0,
              holiday_days: 0,
              additional_rates: []
            }
          })) || []
        };
        setSafeInitialData(tempData);
      }
      
      debugLog('MBA9876 Opening approval modal with booking ID:', data.booking_id);
      setApprovalModalVisible(true);
    } else {
      // For other types, use the onPress callback
      if (onPress) {
        onPress();
      }
    }
  };

  const handleApprovalSuccess = (response) => {
    if (onApproveSuccess) {
      onApproveSuccess(response);
    }
  };

  const handleApprovalError = (error) => {
    if (onApproveError) {
      onApproveError(error);
    }
  };

  const handleRequestChangesSuccess = (response) => {
    debugLog('MBA9999 Change request submitted successfully:', response);
    // Any additional handling can be added here
  };

  const handleRequestChangesError = (error) => {
    debugLog('MBA9999 Error submitting change request:', error);
    // Any additional error handling can be added here
  };

  // Format a date/time range for an occurrence using the time_utils function
  const formatOccurrenceDateRange = (occ) => {
    // Check if we have direct UTC dates and times
    if (occ.start_date && occ.end_date && occ.start_time && occ.end_time) {
      // Format the date range
      const formattedRange = formatDateTimeRangeFromUTC({
        startDate: occ.start_date,
        startTime: occ.start_time,
        endDate: occ.end_date,
        endTime: occ.end_time,
        userTimezone: userTimezone,
        includeTimes: true,
        includeTimezone: true
      });
      
      // Check for DST change between start and end times
      const hasDSTChange = checkDSTChange(
        occ.start_date,
        occ.start_time,
        occ.end_date,
        occ.end_time,
        userTimezone
      );
      
      // Add DST change message if needed
      if (hasDSTChange && !occ.dst_message) {
        debugLog('MBA9876DST Detected DST change for occurrence:', {
          start: `${occ.start_date} ${occ.start_time}`,
          end: `${occ.end_date} ${occ.end_time}`,
          timezone: userTimezone
        });
        
        // Add DST message to the occurrence
        occ.dst_message = "Elapsed time may be different than expected due to Daylight Savings Time.";
      }
      
      return formattedRange;
    }
    
    // Fallback to pre-formatted dates if available
    if (occ.formatted_start && occ.formatted_end) {
      return `${occ.formatted_start} to ${occ.formatted_end}`;
    }
    
    // Last resort fallback
    return 'Date information unavailable';
  };

  // Calculate duration for the occurrence if not provided
  const getOccurrenceDuration = (occ) => {
    if (occ.duration) {
      return occ.duration;
    }
    
    // Try to calculate the duration if we have the necessary data
    if (occ.start_date && occ.end_date && occ.start_time && occ.end_time) {
      try {
        // Create moment objects for start and end times
        const startMoment = moment.utc(`${occ.start_date}T${occ.start_time}:00Z`);
        const endMoment = moment.utc(`${occ.end_date}T${occ.end_time}:00Z`);
        
        // Calculate the difference in hours and days
        const hoursDiff = endMoment.diff(startMoment, 'hours');
        const daysDiff = endMoment.diff(startMoment, 'days');
        
        // Format the duration nicely
        if (daysDiff > 0) {
          return `${daysDiff} ${daysDiff === 1 ? 'day' : 'days'}, ${hoursDiff % 24} ${hoursDiff % 24 === 1 ? 'hour' : 'hours'}`;
        } else {
          return `${hoursDiff} ${hoursDiff === 1 ? 'hour' : 'hours'}`;
        }
      } catch (error) {
        debugLog('MBA9876DST Error calculating duration:', error);
      }
    }
    
    return 'N/A';
  };

  return (
    <View style={getCardStyle()}>
      {/* Green bar on left or right side based on sender */}
      {type === 'approval' && (
        <View style={[
          styles.colorBar, 
          isFromMe ? styles.colorBarLeft : styles.colorBarRight
        ]} />
      )}
      
      <View style={styles.cardContent}>
        <View style={getHeaderStyle()}>
          <MaterialCommunityIcons 
            name={getIcon()} 
            size={24} 
            color={theme.colors.primary}
          />
          <Text style={[
            styles.title,
            type === 'approval' ? styles.approvalTitle : styles.requestTitle
          ]}>
            {getTitle()}
          </Text>
        </View>

        <View style={styles.content}>
          <View style={styles.infoSection}>
            <View style={styles.row}>
              <Text style={styles.label}>Booking ID:</Text>
              <Text style={styles.value}>{data.booking_id || 'N/A'}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Service:</Text>
              <Text style={styles.value}>{data.service_type || 'N/A'}</Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>Total Cost:</Text>
              <Text style={styles.value}>
                ${data.cost_summary.total_client_cost ? 
                  parseFloat(data.cost_summary.total_client_cost).toFixed(2) : 
                  typeof data.cost_summary.total_client_cost === 'number' ? 
                    data.cost_summary.total_client_cost.toFixed(2) : 
                  '0.00'}
              </Text>
            </View>
          </View>

          <View style={styles.datesSection}>
            <Text style={styles.label}>Dates:</Text>
            {(data.occurrences || []).map((occ, index) => {
              return (
                <View key={index} style={styles.occurrenceContainer}>
                  <View style={styles.occurrenceItem}>
                    <Text style={styles.dateTimeText}>
                      {formatOccurrenceDateRange(occ)}
                    </Text>
                    <Text style={styles.durationText}>
                      Event Duration: {getOccurrenceDuration(occ)} ({occ.timezone || userTimezone.split('/')[1] || userTimezone})
                    </Text>
                    {occ.dst_message ? (
                      <Text style={styles.dstMessage}>
                        {occ.dst_message}
                      </Text>
                    ) : null}
                  </View>
                </View>
              );
            })}
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={styles.detailsButton}
              onPress={handleOpenApprovalModal}
            >
              <Text style={styles.detailsButtonText}>Review Details</Text>
            </TouchableOpacity>
            
            {type === 'approval' && !isProfessional && (
              <TouchableOpacity 
                style={styles.approveButton}
                onPress={handleApprove}
              >
                <Text style={styles.approveButtonText}>Approve</Text>
              </TouchableOpacity>
            )}
            
            {type === 'request' && isProfessional && onEditDraft && (
              <TouchableOpacity 
                style={styles.editButton}
                onPress={onEditDraft}
              >
                <Text style={styles.editButtonText}>Edit Draft</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      {/* Approval Modal */}
      <BookingApprovalModal
        visible={approvalModalVisible}
        onClose={() => setApprovalModalVisible(false)}
        bookingId={data.booking_id}
        onApproveSuccess={handleApprovalSuccess}
        onApproveError={handleApprovalError}
        onRequestChangesSuccess={handleRequestChangesSuccess}
        onRequestChangesError={handleRequestChangesError}
        initialData={safeInitialData}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 0, // Removed padding here as it's now on cardContent
    margin: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    maxWidth: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden', // To ensure the green bar doesn't overflow
    position: 'relative', // To position the green bar
  },
  sentCard: {
    alignSelf: 'flex-end',
    marginLeft: '20%',
  },
  receivedCard: {
    alignSelf: 'flex-start',
    marginRight: '20%',
  },
  approvalCard: {
    borderColor: theme.colors.border, // Changed to regular border color
    borderWidth: 1,
  },
  colorBar: {
    width: 4, // Width of the green vertical bar
    backgroundColor: theme.colors.primary, // Green color
    position: 'absolute',
    top: 0,
    bottom: 0,
    zIndex: 1,
  },
  colorBarLeft: {
    left: 0,
  },
  colorBarRight: {
    right: 0,
  },
  cardContent: {
    padding: 12, // Moved padding here from card
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    gap: 8,
  },
  requestHeader: {
    borderBottomColor: theme.colors.border + '40',
  },
  approvalHeader: {
    borderBottomColor: theme.colors.border + '40',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: theme.fonts.header.fontFamily,
  },
  requestTitle: {
    color: theme.colors.primary,
  },
  approvalTitle: {
    color: theme.colors.primary, // Keep the approval request text the same color
  },
  content: {
    gap: 8,
  },
  infoSection: {
    gap: 4,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border + '40',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.text,
    minWidth: 80,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  value: {
    fontSize: 14,
    color: theme.colors.text,
    flex: 1,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  datesSection: {
    gap: 4,
  },
  occurrenceContainer: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border + '40',
    paddingBottom: 8,
    marginBottom: 4,
  },
  occurrenceItem: {
    gap: 2,
    marginLeft: 4,
  },
  dateTimeText: {
    fontSize: 14,
    color: theme.colors.text,
    fontFamily: theme.fonts.regular.fontFamily,
    fontStyle: 'italic', // Italicized date text
  },
  durationText: {
    fontSize: 14,
    color: theme.colors.placeHolderText, // Changed to placeholder text color
    fontFamily: theme.fonts.regular.fontFamily,
  },
  dstMessage: {
    fontSize: 12,
    color: theme.colors.error,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    gap: 8,
  },
  detailsButton: {
    flex: 1,
    padding: 8,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: theme.colors.primary, // Changed to primary color
  },
  detailsButtonText: {
    color: 'white', // Changed text color to white for better contrast
    fontSize: 14,
    fontWeight: '500',
    fontFamily: theme.fonts.regular.fontFamily,
  },
  approveButton: {
    flex: 1,
    padding: 8,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  approveButtonText: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '500',
    fontFamily: theme.fonts.regular.fontFamily,
  },
  editButton: {
    flex: 1,
    padding: 8,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  editButtonText: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '500',
    fontFamily: theme.fonts.regular.fontFamily,
  },
});

export default BookingMessageCard; 