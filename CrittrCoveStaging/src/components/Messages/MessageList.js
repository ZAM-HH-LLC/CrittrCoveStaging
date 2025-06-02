import React, { useRef, useCallback } from 'react';
import { FlatList, ActivityIndicator } from 'react-native';
import { debugLog } from '../../context/AuthContext';

const MessageList = ({ 
  messages, 
  renderMessage, 
  hasMore, 
  isLoadingMore,
  onLoadMore,
  styles,
  theme 
}) => {
  const flatListRef = useRef(null);

  const handleEndReached = useCallback(() => {
    debugLog(`MBA2349f87g9qbh2nfv9cg: onEndReached triggered`, {
      messagesCount: messages.length,
      hasMore,
      isLoadingMore
    });
    
    if (hasMore && !isLoadingMore) {
      onLoadMore();
    }
  }, [hasMore, isLoadingMore, onLoadMore, messages.length]);

  const keyExtractor = useCallback((item, index) => {
    if (item.message_id) {
      return `message-${item.message_id}`;
    }
    
    const timestamp = item.timestamp || item.created_at || Date.now();
    const senderHash = item.sent_by_other_user ? 'other' : 'self';
    const contentHash = item.content ? item.content.substring(0, 10) : 'empty';
    return `message-${timestamp}-${senderHash}-${contentHash}-${index}`;
  }, []);

  return (
    <FlatList
      ref={flatListRef}
      data={messages}
      renderItem={renderMessage}
      keyExtractor={keyExtractor}
      style={styles.messageList}
      onEndReached={handleEndReached}
      onEndReachedThreshold={0.3}
      scrollEventThrottle={16}
      inverted={true}
      maintainVisibleContentPosition={{
        minIndexForVisible: 0,
        autoscrollToTopThreshold: 10
      }}
      contentContainerStyle={{
        flexGrow: 1,
        justifyContent: 'flex-end',
        paddingTop: 16,
      }}
      ListFooterComponent={isLoadingMore && (
        <ActivityIndicator 
          size="small" 
          color={theme.colors.primary}
          style={styles.loadingMore}
        />
      )}
      initialNumToRender={20}
      maxToRenderPerBatch={10}
      windowSize={15}
      removeClippedSubviews={false}
    />
  );
};

export default MessageList; 