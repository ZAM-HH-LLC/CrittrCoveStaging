import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../../../styles/theme';
import { debugLog } from '../../../context/AuthContext';
import BookingMessageCard from '../../BookingMessageCard';

const MobileMessageBubble = ({ message, isOwn, userRole, showTimestamp, onBookingPress }) => {
  // Safety check for message
  if (!message) {
    debugLog('MobileMessageBubble: Received null/undefined message');
    return <View style={{ height: 1 }} />;
  }
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      });
    } catch (error) {
      return '';
    }
  };

  const isBookingMessage = message.message_type === 'booking_request' || 
                          message.message_type === 'booking_response' ||
                          message.booking_data;
  
  const isImageMessage = message.message_type === 'image' || 
                         message.image_url || 
                         (message.image_urls && message.image_urls.length > 0);

  const renderBookingContent = () => {
    if (!isBookingMessage) return null;

    // For booking messages, always use BookingMessageCard component
    // Create booking data if not available
    const bookingData = message.booking_data || {
      booking_id: message.id,
      service_type: 'Service Request',
      occurrences: [],
      cost_summary: {
        total_client_cost: '0.00',
        total_sitter_payout: '0.00'
      }
    };

    return (
      <BookingMessageCard
        type={message.message_type}
        data={bookingData}
        isFromMe={isOwn}
        onPress={() => onBookingPress?.(message)}
        isProfessional={userRole === 'professional'}
        bookingStatus={undefined}
        hasChangeRequest={false}
        isNewestMessage={false}
        messageCreatedAt={message.timestamp}
        hasNewerApprovalRequests={false}
        isAfterConfirmation={false}
        isBookingCompleted={false}
      />
    );
  };

  const renderImageContent = () => {
    if (!isImageMessage) return null;

    // Get images from either image_urls array or single image_url
    const images = message.image_urls || (message.image_url ? [message.image_url] : []);
    
    if (images.length === 0) return null;

    return (
      <View style={styles.imageMessageContainer}>
        {/* Images without background/border */}
        {images.map((imageUrl, index) => (
          <TouchableOpacity
            key={index}
            style={styles.imageWrapper}
            onPress={() => {
              // TODO: Open image viewer
              debugLog('Image pressed:', imageUrl);
            }}
          >
            <Image
              source={{ uri: imageUrl }}
              style={styles.messageImage}
              resizeMode="cover"
            />
          </TouchableOpacity>
        ))}
        
        {/* Caption in separate bubble below images */}
        {message.message && message.message.trim() && (
          <View style={[
            styles.captionBubble,
            isOwn ? styles.ownBubble : styles.otherBubble
          ]}>
            <Text style={[
              styles.messageText,
              isOwn ? styles.ownMessageText : styles.otherMessageText
            ]}>
              {message.message.trim()}
            </Text>
          </View>
        )}
      </View>
    );
  };

  const renderRegularMessage = () => {
    if (isBookingMessage || isImageMessage) return null;

    return (
      <Text style={[
        styles.messageText,
        isOwn ? styles.ownMessageText : styles.otherMessageText
      ]}>
        {message.message}
      </Text>
    );
  };

  // Handle image messages separately - no bubble wrapper
  if (isImageMessage) {
    return (
      <View style={[
        styles.container,
        isOwn ? styles.ownContainer : styles.otherContainer
      ]}>
        {renderImageContent()}
        
        {/* Timestamp for image messages */}
        {showTimestamp && (
          <View style={[styles.imageTimestamp, isOwn ? styles.ownImageTimestamp : styles.otherImageTimestamp]}>
            <Text style={[
              styles.timestamp,
              isOwn ? styles.ownTimestamp : styles.otherTimestamp
            ]}>
              {formatTimestamp(message.timestamp)}
            </Text>
            {isOwn && (
              <View style={styles.statusIcons}>
                {message.is_read ? (
                  <MaterialCommunityIcons 
                    name="check-all" 
                    size={16} 
                    color={theme.colors.success} 
                  />
                ) : (
                  <MaterialCommunityIcons 
                    name="check" 
                    size={16} 
                    color={theme.colors.textSecondary} 
                  />
                )}
              </View>
            )}
          </View>
        )}
      </View>
    );
  }

  // Handle booking messages separately - no bubble wrapper
  if (isBookingMessage) {
    return (
      <View style={[
        styles.container,
        isOwn ? styles.ownContainer : styles.otherContainer
      ]}>
        {renderBookingContent()}
        
        {/* Timestamp for booking messages */}
        {showTimestamp && (
          <View style={[styles.imageTimestamp, isOwn ? styles.ownImageTimestamp : styles.otherImageTimestamp]}>
            <Text style={[
              styles.timestamp,
              isOwn ? styles.ownTimestamp : styles.otherTimestamp
            ]}>
              {formatTimestamp(message.timestamp)}
            </Text>
            {isOwn && (
              <View style={styles.statusIcons}>
                {message.is_read ? (
                  <MaterialCommunityIcons 
                    name="check-all" 
                    size={16} 
                    color={theme.colors.success} 
                  />
                ) : (
                  <MaterialCommunityIcons 
                    name="check" 
                    size={16} 
                    color={theme.colors.textSecondary} 
                  />
                )}
              </View>
            )}
          </View>
        )}
      </View>
    );
  }

  // Regular text messages
  return (
    <View style={[
      styles.container,
      isOwn ? styles.ownContainer : styles.otherContainer
    ]}>
      <View style={[
        styles.bubble,
        isOwn ? styles.ownBubble : styles.otherBubble
      ]}>
        {renderRegularMessage()}
        
        {/* Message metadata */}
        {showTimestamp && (
          <View style={styles.metadata}>
            <Text style={[
              styles.timestamp,
              isOwn ? styles.ownTimestamp : styles.otherTimestamp
            ]}>
              {formatTimestamp(message.timestamp)}
            </Text>
          
            {isOwn && (
              <View style={styles.statusIcons}>
                {message.is_read ? (
                  <MaterialCommunityIcons 
                    name="check-all" 
                    size={16} 
                    color={theme.colors.success} 
                  />
                ) : (
                  <MaterialCommunityIcons 
                    name="check" 
                    size={16} 
                    color={theme.colors.textSecondary} 
                  />
                )}
              </View>
            )}
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
    paddingHorizontal: 8,
  },
  ownContainer: {
    alignItems: 'flex-end',
  },
  otherContainer: {
    alignItems: 'flex-start',
  },
  bubble: {
    maxWidth: '80%',
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  ownBubble: {
    backgroundColor: theme.colors.primary,
    borderBottomRightRadius: 4,
  },
  otherBubble: {
    backgroundColor: theme.colors.surfaceContrast,
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  ownMessageText: {
    color: theme.colors.whiteText,
  },
  otherMessageText: {
    color: theme.colors.text,
  },
  metadata: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
    gap: 8,
  },
  timestamp: {
    fontSize: 11,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  ownTimestamp: {
    color: theme.colors.whiteText,
    opacity: 0.8,
  },
  otherTimestamp: {
    color: theme.colors.placeHolderText,
  },
  statusIcons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  imageMessageContainer: {
    alignItems: 'flex-end', // Will be overridden by container alignment
  },
  imageWrapper: {
    marginBottom: 4,
    borderRadius: 8,
    overflow: 'hidden',
  },
  messageImage: {
    width: 200,
    height: 150,
    borderRadius: 8,
  },
  captionBubble: {
    maxWidth: '80%',
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  imageTimestamp: {
    marginTop: 4,
    alignItems: 'center',
  },
  ownImageTimestamp: {
    alignItems: 'flex-end',
  },
  otherImageTimestamp: {
    alignItems: 'flex-start',
  },
});

export default MobileMessageBubble;