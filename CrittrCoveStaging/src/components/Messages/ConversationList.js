import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, TextInput } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { debugLog } from '../../context/AuthContext';
import { theme } from '../../styles/theme';
import ProfilePhoto from './ProfilePhoto';
import { sanitizeContactDetails, containsContactDetails } from '../../data/contactSanitization';

const ConversationList = ({
  conversations,
  selectedConversation,
  onSelectConversation,
  searchQuery,
  onSearchChange,
  styles,
  CURRENT_USER_ID,
  getConversationUnreadCount,
  markConversationAsRead
}) => {
  // Add logging on initial render to check what props we're receiving
  useEffect(() => {
    debugLog('MBA2o3uihf48hv: ConversationList component mounted', {
      conversationsCount: conversations?.length || 0,
      selectedConversation,
      hasGetConversationUnreadCount: !!getConversationUnreadCount,
      hasMarkConversationAsRead: !!markConversationAsRead
    });

    // Log unread counts for each conversation
    if (getConversationUnreadCount && conversations?.length > 0) {
      const conversationUnreadCounts = conversations.map(conv => ({
        conversationId: conv.conversation_id,
        unreadCount: getConversationUnreadCount(String(conv.conversation_id))
      }));
      
      debugLog('MBA2o3uihf48hv: Current conversation unread counts', {
        conversationUnreadCounts
      });
    }
  }, [conversations, selectedConversation, getConversationUnreadCount, markConversationAsRead]);

  return (
    <View style={styles.conversationListContainer}>
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <MaterialCommunityIcons 
            name="magnify" 
            size={20} 
            color={theme.colors.placeholder}
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Search conversations..."
            placeholderTextColor={theme.colors.placeholder}
            value={searchQuery}
            onChangeText={onSearchChange}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity 
              style={styles.clearButton}
              onPress={() => onSearchChange('')}
            >
              <MaterialCommunityIcons 
                name="close-circle" 
                size={16} 
                color={theme.colors.placeholder}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {conversations.map((conv) => {
        const otherParticipantName = conv.participant1_id === CURRENT_USER_ID ? 
          conv.participant2_name : conv.participant1_name;
        
        const isSelected = String(conv.conversation_id) === String(selectedConversation);
        const unreadCount = getConversationUnreadCount ? 
          getConversationUnreadCount(String(conv.conversation_id)) : 0;
        
        // Log details about each conversation's unread state for debugging
        if (unreadCount > 0) {
          debugLog(`MBA2o3uihf48hv: Conversation ${conv.conversation_id} has ${unreadCount} unread messages`, {
            conversationId: conv.conversation_id,
            unreadCount,
            isSelected,
            convUnreadFlag: conv.unread,
            name: otherParticipantName
          });
        }
        
        return (
          <TouchableOpacity
            key={conv.conversation_id}
            style={[
              styles.conversationItem,
              isSelected && styles.selectedConversation
            ]}
            onPress={() => {
              debugLog(`MBA2o3uihf48hv: Conversation ${conv.conversation_id} clicked`, {
                previouslySelected: isSelected,
                unreadCount,
                willCallMarkAsRead: markConversationAsRead && unreadCount > 0
              });
              
              // Set the selected conversation in the global variable immediately
              if (typeof window !== 'undefined') {
                window.selectedConversationId = conv.conversation_id;
              }
              
              // First mark as read if needed, before changing selection
              if (markConversationAsRead && unreadCount > 0) {
                debugLog(`MBA2o3uihf48hv: Marking conversation ${conv.conversation_id} as read when clicked`, {
                  unreadCount
                });
                
                try {
                  // Call markConversationAsRead first to clear notifications
                  markConversationAsRead(conv.conversation_id);
                  
                  // Send explicit command to parent to reset message refs
                  debugLog(`MBA2o3uihf48hv: Forcing message state reset for conversation`, {
                    conversationId: conv.conversation_id,
                    hasUnread: unreadCount > 0
                  });
                  
                  // Use a custom data attribute to tell MessageHistory to force refresh
                  onSelectConversation(conv.conversation_id, { forceRefresh: true });
                } catch (error) {
                  debugLog(`MBA2o3uihf48hv: Error marking conversation as read`, {
                    error: error.message
                  });
                  // Still select the conversation even if marking as read fails
                  onSelectConversation(conv.conversation_id, { forceRefresh: true });
                }
              } else {
                // If no unread messages, just update selection
                // Still pass forceRefresh: true to ensure messages are loaded
                onSelectConversation(conv.conversation_id, { forceRefresh: true });
              }
            }}
          >
            <ProfilePhoto 
              profilePicture={conv.profile_picture}
              style={styles.conversationProfilePhoto}
            />
            
            <View style={styles.conversationContent}>
              <View style={styles.conversationHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                  <Text style={styles.conversationName}>
                    {otherParticipantName || conv.name || conv.other_user_name || 'Unknown'}
                  </Text>
                </View>
                
                <Text style={styles.conversationTime}>
                  {new Date(conv.last_message_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </Text>
              </View>
              
              <View style={styles.conversationLastMessageContainer}>
                <Text 
                  style={[
                    styles.conversationLastMessage,
                    isSelected && styles.activeConversationText,
                    (conv.unread || unreadCount > 0) && !isSelected && styles.unreadMessage
                  ]} 
                  numberOfLines={1}
                >
                  {containsContactDetails(conv.last_message)
                    ? sanitizeContactDetails(conv.last_message)
                    : conv.last_message}
                </Text>
                {/* Make sure unread indicator is shown when unreadCount > 0 */}
                {unreadCount > 0 && !isSelected && (
                  <View style={styles.unreadBadge}>
                    <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
                  </View>
                )}
              </View>
              
              {conv.bookingStatus && (
                <View style={[
                  styles.bookingStatusContainer,
                  styles[`booking${conv.bookingStatus}Status`] || styles.bookingPendingStatus
                ]}>
                  <Text style={styles.bookingStatus}>
                    {conv.bookingStatus}
                  </Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

export default ConversationList; 