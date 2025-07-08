// Mobile Message List - Signal-like interface with fixed header/input, hidden nav bar
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  Text
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { theme } from '../../../styles/theme';
import { debugLog } from '../../../context/AuthContext';
import { 
  fetchMessagesWithLogic, 
  sendMessageWithOptimisticUI,
  useWebSocket 
} from '../../../utils/messages';
import MobileMessageHeader from './MobileMessageHeader';
import MobileMessageInput from './MobileMessageInput';
import MobileMessageBubble from './MobileMessageBubble';

const MobileMessageList = ({
  conversation,
  userRole,
  user,
  onBack,
  onConversationUpdate,
  navigation
}) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Refs
  const flatListRef = useRef(null);
  const isMountedRef = useRef(true);
  const previousMessageCountRef = useRef(0);
  const isUserScrollingRef = useRef(false);
  const paginationCooldownRef = useRef(false);
  const scrollPositionRef = useRef(0);
  const contentSizeRef = useRef({ width: 0, height: 0 });
  const layoutMeasurementRef = useRef({ width: 0, height: 0 });
  const pendingScrollRestoreRef = useRef(null);

  // WebSocket for real-time messages
  const { isConnected, registerHandler } = useWebSocket({
    messageTypes: ['new_message', 'message_update', 'conversation_update'],
    autoConnect: true
  });

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Navigation hiding is now handled by route parameters in MobileMessageHistory
  // The Navigation.js component will automatically hide when selectedConversation is set

  // Load messages when conversation changes
  useEffect(() => {
    if (conversation) {
      loadMessages(true);
    }
  }, [conversation]);

  // Register WebSocket handlers
  useEffect(() => {
    if (isConnected && conversation) {
      const unregisterMessage = registerHandler('new_message', handleNewMessage, 'mobile-message-list');
      const unregisterUpdate = registerHandler('message_update', handleMessageUpdate, 'mobile-message-update');
      
      return () => {
        unregisterMessage();
        unregisterUpdate();
      };
    }
  }, [isConnected, conversation]);

  const loadMessages = async (reset = false, page = 1) => {
    try {
      if (reset) {
        setLoading(true);
        setCurrentPage(1);
      } else {
        setLoadingMore(true);
      }

      debugLog('MobileMessageList: Loading messages', {
        conversationId: conversation.conversation_id,
        page,
        reset,
        currentMessageCount: messages.length,
        hasMoreMessages,
        loadingMore
      });

      const { messages: newMessages, hasMore } = await fetchMessagesWithLogic(
        conversation.conversation_id,
        { page, limit: 50 }
      );
      
      debugLog('MobileMessageList: Messages after fetch', {
        first3Messages: newMessages.slice(0, 3).map(m => ({ id: m.id, message: m.message?.substring(0, 20) })),
        last3Messages: newMessages.slice(-3).map(m => ({ id: m.id, message: m.message?.substring(0, 20) })),
        totalCount: newMessages.length
      });

      if (isMountedRef.current) {
        if (reset) {
          debugLog('MobileMessageList: Setting messages (reset)', {
            messagesBeforeSet: [],
            newMessagesFirst3: newMessages.slice(0, 3).map(m => ({ id: m.id, message: m.message?.substring(0, 20) })),
            newMessagesLast3: newMessages.slice(-3).map(m => ({ id: m.id, message: m.message?.substring(0, 20) }))
          });
          setMessages(newMessages);
          setCurrentPage(2);
          // For inverted list, scroll to top shows newest messages
          setTimeout(() => {
            flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
          }, 200);
        } else {
          debugLog('MobileMessageList: Adding messages (pagination)', {
            existingMessagesFirst3: messages.slice(0, 3).map(m => ({ id: m.id, message: m.message?.substring(0, 20) })),
            newMessagesFirst3: newMessages.slice(0, 3).map(m => ({ id: m.id, message: m.message?.substring(0, 20) })),
            existingCount: messages.length,
            newCount: newMessages.length
          });
          // Add older messages at the end for inverted pagination
          setMessages(prev => [...prev, ...newMessages]);
          setCurrentPage(prev => prev + 1);
        }
        setHasMoreMessages(hasMore);
        debugLog('MobileMessageList: hasMoreMessages set to:', hasMore);
        
        debugLog('MobileMessageList: Messages loaded successfully', {
          newMessagesCount: newMessages.length,
          totalMessagesCount: reset ? newMessages.length : messages.length + newMessages.length,
          hasMore,
          page,
          reset
        });
      }
    } catch (error) {
      debugLog('MobileMessageList: Error loading messages:', error);
      Alert.alert('Error', 'Failed to load messages');
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  };

  const handleLoadMore = () => {
    // Only allow pagination if user has scrolled AND we meet the other conditions
    if (hasMoreMessages && !loadingMore && !loading && !paginationCooldownRef.current) {
      debugLog('MobileMessageList: Loading more messages', {
        currentPage,
        hasMoreMessages,
        loadingMore,
        isUserScrolling: isUserScrollingRef.current
      });
      
      
      // Set cooldown to prevent rapid-fire pagination
      paginationCooldownRef.current = true;
      setTimeout(() => {
        paginationCooldownRef.current = false;
      }, 2000);
      
      loadMessages(false, currentPage);
    }
  };

  const handleNewMessage = (messageData) => {
    if (messageData.conversation_id === conversation.conversation_id) {
      setMessages(prev => [messageData, ...prev]);
      onConversationUpdate?.();
      
      // Scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  };

  const handleMessageUpdate = (messageData) => {
    setMessages(prev => 
      prev.map(msg => 
        msg.id === messageData.id ? { ...msg, ...messageData } : msg
      )
    );
  };

  const handleSendMessage = async (messageText, images = []) => {
    if (!messageText?.trim() && images.length === 0) return;

    await sendMessageWithOptimisticUI(
      conversation.conversation_id,
      user.id,
      messageText,
      images,
      '',
      // onOptimisticAdd
      (optimisticMessage) => {
        setMessages(prev => [optimisticMessage, ...prev]);
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      },
      // onOptimisticRemove
      (tempId) => {
        setMessages(prev => prev.filter(msg => msg.id !== tempId));
      },
      // onSuccess
      (realMessage) => {
        setMessages(prev => [realMessage, ...prev]);
        onConversationUpdate?.();
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      },
      // onError
      (error) => {
        debugLog('MobileMessageList: Error sending message:', error);
        Alert.alert('Error', 'Failed to send message');
      }
    );
  };

  const renderMessageItem = ({ item, index }) => {
    // Safety check for item
    if (!item) {
      debugLog('MobileMessageList: Received null/undefined item at index:', index);
      return <View />;
    }

    try {
      return (
        <View key={item.id || index}>
          {/* Date separator */}
          {item.showDateSeparator && item.formattedDate && (
            <View style={styles.dateSeparator}>
              <Text style={styles.dateSeparatorText}>{item.formattedDate}</Text>
            </View>
          )}
          
          {/* Message bubble */}
          <MobileMessageBubble
            message={item}
            isOwn={!item.sent_by_other_user}
            userRole={userRole}
            showTimestamp={item.showTimestamp}
          />
        </View>
      );
    } catch (error) {
      debugLog('MobileMessageList: Error rendering message item:', error);
      return <View style={{ height: 1 }} />;
    }
  };


  const keyExtractor = (item, index) => {
    return item.id ? item.id.toString() : `temp-${index}`;
  };

  const renderLoadingHeader = () => {
    debugLog('MobileMessageList: Rendering loading header', {
      loadingMore,
      hasMoreMessages,
      shouldShow: loadingMore && hasMoreMessages,
      messagesCount: messages.length
    });
    
    if (!hasMoreMessages) return null;
    
    return (
      <View style={styles.loadingContainer}>
        {loadingMore ? (
          <>
            <ActivityIndicator size="small" color={theme.colors.primary} />
            <Text style={styles.loadingText}>Loading more messages...</Text>
          </>
        ) : (
          <Text style={styles.loadingText}>Scroll up to load older messages</Text>
        )}
      </View>
    );
  };

  const insets = useSafeAreaInsets();
  
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Fixed Header */}
      <MobileMessageHeader
        conversation={conversation}
        userRole={userRole}
        onBack={onBack}
        isConnected={isConnected}
        navigation={navigation}
      />

      {/* Messages List */}
      <KeyboardAvoidingView 
        style={styles.messagesContainer}
        behavior={Platform.OS === 'ios' ? 'height' : 'height'}
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessageItem}
          keyExtractor={keyExtractor}
          ListFooterComponent={renderLoadingHeader}
          style={styles.messagesList}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
          onScroll={(event) => {
            const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
            const distanceFromTop = contentOffset.y;
            
            // Store current scroll metrics for pagination calculations
            scrollPositionRef.current = distanceFromTop;
            contentSizeRef.current = contentSize;
            layoutMeasurementRef.current = layoutMeasurement;
            
            // For inverted list, check distance from bottom to trigger pagination
            const distanceFromBottom = contentSize.height - (layoutMeasurement.height + distanceFromTop);
            const isNearBottom = distanceFromBottom <= 100;
            
            // Log scroll tracking for debugging
            if (distanceFromBottom <= 100 || distanceFromBottom % 500 === 0) {
              debugLog('MobileMessageList: Scroll tracking (inverted)', {
                distanceFromTop,
                distanceFromBottom,
                isNearBottom,
                hasMoreMessages,
                loadingMore,
                messagesCount: messages.length,
                isUserScrolling: isUserScrollingRef.current,
                contentHeight: contentSize.height,
                viewportHeight: layoutMeasurement.height
              });
            }
            
            // For inverted list, trigger pagination when scrolling to bottom (where older messages are loaded)
            if (isNearBottom && hasMoreMessages && !loadingMore && !loading && !paginationCooldownRef.current && isUserScrollingRef.current) {
              debugLog('MobileMessageList: Triggering pagination - near bottom (older messages)', {
                scrollPosition: distanceFromTop,
                distanceFromBottom,
                messagesCount: messages.length,
                isNearBottom,
                isUserScrolling: isUserScrollingRef.current
              });
              handleLoadMore();
            }
          }}
          onScrollBeginDrag={() => {
            isUserScrollingRef.current = true;
            debugLog('MobileMessageList: User started scrolling');
          }}
          onMomentumScrollEnd={() => {
            // Reset scrolling flag immediately when momentum ends
            isUserScrollingRef.current = false;
            debugLog('MobileMessageList: User stopped scrolling');
          }}
          onContentSizeChange={(width, height) => {
            contentSizeRef.current = { width, height };
            
            // For inverted list, scroll to top on initial load (shows newest messages)
            if (messages.length > 0 && currentPage === 2 && !loadingMore) {
              setTimeout(() => {
                flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
              }, 50);
            }
          }}
          scrollEventThrottle={16}
          removeClippedSubviews={false}
          maxToRenderPerBatch={10}
          windowSize={15}
          initialNumToRender={20}
          inverted={true}
          maintainVisibleContentPosition={{
            minIndexForVisible: 0,
            autoscrollToTopThreshold: 10
          }}
        />

        {/* Fixed Input */}
        <MobileMessageInput
          onSendMessage={handleSendMessage}
          conversation={conversation}
          userRole={userRole}
        />
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.surfaceContrast,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16, // Reduced padding
  },
  dateSeparator: {
    alignItems: 'center',
    marginVertical: 16,
  },
  dateSeparatorText: {
    fontSize: 12,
    color: theme.colors.placeHolderText,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  loadingText: {
    fontSize: 14,
    color: theme.colors.placeHolderText,
    fontFamily: theme.fonts.regular.fontFamily,
  },
});

export default MobileMessageList;