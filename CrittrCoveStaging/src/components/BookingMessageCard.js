import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../styles/theme';
import { approveBooking } from '../api/API';

const BookingMessageCard = ({ 
  type,  // 'request' or 'approval'
  data,
  isFromMe,
  onPress,
  isProfessional,
  onApproveSuccess,
  onApproveError
}) => {
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

  return (
    <View style={getCardStyle()}>
      <View style={getHeaderStyle()}>
        <MaterialCommunityIcons 
          name={getIcon()} 
          size={24} 
          color={type === 'approval' ? theme.colors.success : theme.colors.primary}
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
              ${data.total_client_cost ? 
                parseFloat(data.total_client_cost).toFixed(2) : 
                typeof data.total_client_cost === 'number' ? 
                  data.total_client_cost.toFixed(2) : 
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
                    {occ.formatted_start} to {occ.formatted_end}
                  </Text>
                  <Text style={styles.durationText}>
                    Event Duration: {occ.duration} ({occ.timezone})
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
            onPress={onPress}
          >
            <Text style={styles.detailsButtonText}>Click for Details</Text>
          </TouchableOpacity>
          {type === 'approval' && !isProfessional && (
            <TouchableOpacity 
              style={styles.approveButton}
              onPress={handleApprove}
            >
              <Text style={styles.approveButtonText}>Approve</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 12,
    margin: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    maxWidth: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
    borderColor: theme.colors.success,
    borderWidth: 1,
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
    borderBottomColor: theme.colors.primary + '30',
  },
  approvalHeader: {
    borderBottomColor: theme.colors.success + '30',
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
    color: theme.colors.success,
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
  },
  durationText: {
    fontSize: 14,
    color: theme.colors.text,
    fontWeight: '500',
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
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  detailsButtonText: {
    color: theme.colors.text,
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
});

export default BookingMessageCard; 