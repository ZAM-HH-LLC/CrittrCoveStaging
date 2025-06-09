import React from 'react';
import { View, Text } from 'react-native';
import { formatMessageTime } from './messageTimeUtils';

/**
 * Component to display a message timestamp
 * 
 * @param {Object} props - Component props
 * @param {Object} props.message - Message object with timestamp
 * @param {boolean} props.isFromMe - Whether message is from current user
 * @param {Object} props.styles - Styles object from MessageHistory
 * @param {string} props.userTimezone - User's timezone
 * @param {boolean} props.show - Whether to show the timestamp
 */
const MessageTimestamp = ({ message, isFromMe, styles, userTimezone, show }) => {
  if (!show || !message || !message.timestamp) return null;
  
  const formattedTime = formatMessageTime(message.timestamp, userTimezone);
  
  return (
    <View style={[
      styles.messageTimestampContainer,
      isFromMe ? styles.sentMessageTimestamp : styles.receivedMessageTimestamp,
      // Add compact style for image messages
      message.type_of_message === 'image_message' || 
      message.image_url || 
      message.image_urls || 
      (message.metadata && message.metadata.image_urls) ? 
        { marginBottom: 0, marginTop: 20 } : null
    ]}>
      <Text style={styles.messageTimestampText}>{formattedTime}</Text>
    </View>
  );
};

export default MessageTimestamp; 