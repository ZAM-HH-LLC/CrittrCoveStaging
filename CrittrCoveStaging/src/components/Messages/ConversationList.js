import React from 'react';
import { View, Text, TouchableOpacity, TextInput } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { debugLog } from '../../context/AuthContext';
import { theme } from '../../styles/theme';

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
  const filteredConversations = conversations.filter(conv => {
    if (!searchQuery) return true;
    
    const otherParticipantName = conv.participant1_id === CURRENT_USER_ID ? 
      conv.participant2_name : conv.participant1_name;
    const searchName = otherParticipantName || conv.name || conv.other_user_name || '';
    
    return searchName.toLowerCase().includes(searchQuery.toLowerCase()) ||
           (conv.last_message && conv.last_message.toLowerCase().includes(searchQuery.toLowerCase()));
  });

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

      {filteredConversations.map((conv) => {
        const otherParticipantName = conv.participant1_id === CURRENT_USER_ID ? 
          conv.participant2_name : conv.participant1_name;
        
        const isSelected = String(conv.conversation_id) === String(selectedConversation);
        const unreadCount = getConversationUnreadCount ? 
          getConversationUnreadCount(String(conv.conversation_id)) : 0;
        
        return (
          <TouchableOpacity
            key={conv.conversation_id}
            style={[
              styles.conversationItem,
              isSelected && styles.selectedConversation
            ]}
            onPress={() => {
              onSelectConversation(conv.conversation_id);
              
              if (markConversationAsRead && unreadCount > 0) {
                debugLog(`MBA4321: Marking conversation ${conv.conversation_id} as read when clicked`);
                markConversationAsRead(conv.conversation_id);
              }
            }}
          >
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
                  {conv.last_message}
                </Text>
                
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