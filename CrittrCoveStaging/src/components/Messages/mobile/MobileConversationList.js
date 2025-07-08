// Mobile Conversation List - Shows all conversations with nav bar visible
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  SafeAreaView
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../../../styles/theme';
import { filterConversations, getUnreadCountForRole } from '../../../utils/messages';
import MobileConversationItem from './MobileConversationItem';

const MobileConversationList = ({
  conversations,
  userRole,
  loading,
  refreshing,
  onRefresh,
  onConversationSelect,
  navigation
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredConversations, setFilteredConversations] = useState([]);

  // Filter conversations based on search
  useEffect(() => {
    const filtered = filterConversations(conversations, searchQuery);
    setFilteredConversations(filtered);
  }, [conversations, searchQuery]);

  // Calculate total unread count
  const totalUnreadCount = conversations.reduce((total, conversation) => {
    return total + getUnreadCountForRole(conversation, userRole);
  }, 0);

  const renderConversationItem = ({ item }) => (
    <MobileConversationItem
      conversation={item}
      userRole={userRole}
      onPress={() => onConversationSelect(item)}
    />
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <MaterialCommunityIcons 
        name="message-outline" 
        size={64} 
        color={theme.colors.placeHolderText} 
      />
      <Text style={styles.emptyTitle}>
        {searchQuery.trim() ? 'No conversations found' : 'No Messages Yet'}
      </Text>
      <Text style={styles.emptySubtitle}>
        {searchQuery.trim() 
          ? 'Try adjusting your search terms'
          : 'Start a conversation to see messages here'
        }
      </Text>
    </View>
  );

  const renderLoadingState = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={theme.colors.primary} />
      <Text style={styles.loadingText}>Loading conversations...</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
        {totalUnreadCount > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadText}>
              {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
            </Text>
          </View>
        )}
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <MaterialCommunityIcons 
          name="magnify" 
          size={20} 
          color={theme.colors.placeHolderText} 
        />
        <TextInput
          style={styles.searchInput}
          placeholder="Search conversations..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor={theme.colors.placeHolderText}
        />
        {searchQuery.length > 0 && (
          <MaterialCommunityIcons 
            name="close-circle" 
            size={20} 
            color={theme.colors.placeHolderText}
            onPress={() => setSearchQuery('')}
          />
        )}
      </View>

      {/* Conversations List */}
      {loading ? (
        renderLoadingState()
      ) : filteredConversations.length === 0 ? (
        renderEmptyState()
      ) : (
        <FlatList
          data={filteredConversations}
          renderItem={renderConversationItem}
          keyExtractor={(item) => item.conversation_id.toString()}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh}
              colors={[theme.colors.primary]}
              tintColor={theme.colors.primary}
            />
          }
          style={styles.conversationsList}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.surfaceContrast,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: theme.colors.surfaceContrast,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.text,
    fontFamily: theme.fonts.header.fontFamily,
  },
  unreadBadge: {
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 24,
    alignItems: 'center',
  },
  unreadText: {
    color: theme.colors.whiteText,
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: theme.fonts.regular.fontFamily,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.backgroundContrast,
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: theme.colors.text,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  conversationsList: {
    flex: 1,
  },
  separator: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginLeft: 76, // Align with conversation content
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.text,
    marginTop: 16,
    textAlign: 'center',
    fontFamily: theme.fonts.header.fontFamily,
  },
  emptySubtitle: {
    fontSize: 16,
    color: theme.colors.placeHolderText,
    marginTop: 8,
    textAlign: 'center',
    fontFamily: theme.fonts.regular.fontFamily,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: theme.colors.placeHolderText,
    fontFamily: theme.fonts.regular.fontFamily,
  },
});

export default MobileConversationList;