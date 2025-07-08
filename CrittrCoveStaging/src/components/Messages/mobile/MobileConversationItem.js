import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../../../styles/theme';
import { getUnreadCountForRole } from '../../../utils/messages';

const MobileConversationItem = ({ conversation, onPress, userRole }) => {
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffInHours = (now - date) / (1000 * 60 * 60);
      
      if (diffInHours < 24) {
        // Show time for today
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      } else if (diffInHours < 168) {
        // Show day of week for this week
        return date.toLocaleDateString([], { weekday: 'short' });
      } else {
        // Show date for older messages
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
      }
    } catch (error) {
      return '';
    }
  };

  const unreadCount = getUnreadCountForRole(conversation, userRole);
  const hasUnread = unreadCount > 0;

  return (
    <TouchableOpacity
      style={[
        styles.container,
        hasUnread && styles.unreadContainer
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Avatar */}
      <View style={styles.avatarContainer}>
        <View style={[styles.avatar, hasUnread && styles.unreadAvatar]}>
          <MaterialCommunityIcons 
            name="account" 
            size={24} 
            color={hasUnread ? theme.colors.whiteText : theme.colors.primary} 
          />
        </View>
        {hasUnread && (
          <View style={styles.unreadDot}>
            <Text style={styles.unreadDotText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
          </View>
        )}
      </View>

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={[
            styles.name,
            hasUnread && styles.unreadName
          ]}>
            {conversation.other_user_name || 'Unknown User'}
          </Text>
          <Text style={styles.timestamp}>
            {formatTimestamp(conversation.last_message_timestamp)}
          </Text>
        </View>
        
        <View style={styles.messageRow}>
          <Text 
            style={[
              styles.lastMessage,
              hasUnread && styles.unreadMessage
            ]}
            numberOfLines={2}
          >
            {conversation.last_message || 'No messages yet'}
          </Text>
        </View>

        {/* Status indicators */}
        <View style={styles.statusRow}>
          {conversation.has_active_booking && (
            <View style={styles.statusBadge}>
              <MaterialCommunityIcons name="calendar-check" size={12} color={theme.colors.success} />
              <Text style={styles.statusText}>Active Booking</Text>
            </View>
          )}
          {conversation.has_draft && (
            <View style={[styles.statusBadge, styles.draftBadge]}>
              <MaterialCommunityIcons name="pencil" size={12} color={theme.colors.warning} />
              <Text style={styles.statusText}>Draft</Text>
            </View>
          )}
        </View>
      </View>

      {/* Arrow indicator */}
      <MaterialCommunityIcons 
        name="chevron-right" 
        size={20} 
        color={theme.colors.placeHolderText} 
      />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: theme.colors.surfaceContrast,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  unreadContainer: {
    backgroundColor: theme.colors.surfaceContrast,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: theme.colors.border,
  },
  unreadAvatar: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  unreadDot: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: theme.colors.error,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: theme.colors.surface,
  },
  unreadDotText: {
    color: theme.colors.whiteText,
    fontSize: 10,
    fontWeight: 'bold',
    fontFamily: theme.fonts.regular.fontFamily,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    fontFamily: theme.fonts.regular.fontFamily,
    flex: 1,
  },
  unreadName: {
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  timestamp: {
    fontSize: 12,
    color: theme.colors.placeHolderText,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  messageRow: {
    marginBottom: 4,
  },
  lastMessage: {
    fontSize: 14,
    color: theme.colors.placeHolderText,
    fontFamily: theme.fonts.regular.fontFamily,
    lineHeight: 18,
  },
  unreadMessage: {
    color: theme.colors.text,
    fontWeight: '500',
  },
  statusRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: theme.colors.successLight,
  },
  draftBadge: {
    backgroundColor: theme.colors.warningLight,
  },
  statusText: {
    fontSize: 10,
    color: theme.colors.text,
    fontWeight: '500',
    fontFamily: theme.fonts.regular.fontFamily,
  },
});

export default MobileConversationItem;