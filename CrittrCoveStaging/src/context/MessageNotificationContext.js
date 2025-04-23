import React, { createContext, useState, useEffect, useContext } from 'react';
import { AuthContext, debugLog } from './AuthContext';
import { getUnreadMessageCount } from '../api/API';

// Create the context
export const MessageNotificationContext = createContext();

export const MessageNotificationProvider = ({ children }) => {
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [currentRoute, setCurrentRoute] = useState('');
  const { isSignedIn } = useContext(AuthContext);

  // Function to check if we have unread messages based on conversations
  const checkUnreadMessages = async () => {
    try {
      debugLog('MBA4321: Checking for unread messages');
      
      // Call the API to get unread message count
      const result = await getUnreadMessageCount();
      const count = result.unread_count || 0;
      
      debugLog('MBA4321: Unread message count:', count);
      
      // Update state based on API response
      setUnreadCount(count);
      setHasUnreadMessages(count > 0);
      
      return count > 0;
    } catch (error) {
      debugLog('MBA4321: Error checking unread messages:', error);
      return hasUnreadMessages; // Return current state if there's an error
    }
  };

  // Check if user is currently on the Messages screen
  const isOnMessagesScreen = () => {
    return currentRoute === 'MessageHistory';
  };

  // Helper to handle new message notifications
  const handleNewMessageNotification = () => {
    // Only update unread count if user is not on messages screen
    if (!isOnMessagesScreen()) {
      debugLog('MBA4321: Adding unread message notification');
      setHasUnreadMessages(true);
      setUnreadCount(prevCount => prevCount + 1);
    } else {
      debugLog('MBA4321: User is on messages screen, not creating notification');
    }
  };

  // Function to handle incoming new messages
  const onNewMessage = (messageData) => {
    debugLog('MBA4321: onNewMessage called with data:', messageData);
    
    // Only create notification if the message is from another user
    if (messageData && messageData.sent_by_other_user) {
      // Check if user is already on the message screen for this conversation
      if (isOnMessagesScreen() && 
          messageData.conversation_id && 
          currentRoute === 'MessageHistory') {
        debugLog('MBA4321: User is viewing messages, not creating notification');
        return;
      }
      
      // Handle notification
      handleNewMessageNotification();
    }
  };

  // Mark a specific conversation as read
  const markConversationAsRead = async (conversationId) => {
    debugLog('MBA4321: Marking conversation as read:', conversationId);
    
    // After marking a conversation as read, refresh unread count
    await checkUnreadMessages();
    
    // Note: The backend automatically marks messages as read when 
    // get_conversation_messages is called, so we just need to update our state
    debugLog('MBA4321: Updated unread state after marking conversation as read');
  };

  // Update route information
  const updateRoute = (routeName) => {
    if (!routeName || routeName === currentRoute) return;
    
    debugLog('MBA4321: Updating route to:', routeName);
    setCurrentRoute(routeName);
    
    // Reset notifications if navigating to MessageHistory
    if (routeName === 'MessageHistory' && hasUnreadMessages) {
      setHasUnreadMessages(false);
      setUnreadCount(0);
    }
  };

  // Register a websocket handler for new message notifications
  useEffect(() => {
    if (!isSignedIn) return;

    let websocketManager;
    
    const setupWebSocketHandler = async () => {
      try {
        // Import websocket manager without causing circular dependency
        websocketManager = (await import('../utils/websocket')).default;
        
        // Register handler for incoming messages
        websocketManager.registerHandler('message', (data) => {
          debugLog('MBA4321: Message notification received via WebSocket');
          onNewMessage(data);
        }, 'notification-context');
      } catch (error) {
        debugLog('MBA4321: Error setting up WebSocket handler:', error);
      }
    };

    setupWebSocketHandler();
    
    // Cleanup function to unregister handler
    return () => {
      if (websocketManager) {
        try {
          websocketManager.unregisterHandler('message', 'notification-context');
        } catch (error) {
          debugLog('MBA4321: Error removing WebSocket handler:', error);
        }
      }
    };
  }, [isSignedIn]);

  // Initialize unread state 
  useEffect(() => {
    if (isSignedIn) {
      checkUnreadMessages();
    } else {
      setHasUnreadMessages(false);
      setUnreadCount(0);
    }
  }, [isSignedIn]);

  // Create a memoized value for the context to reduce rerenders
  const contextValue = {
    hasUnreadMessages,
    unreadCount,
    updateRoute,
    checkUnreadMessages,
    onNewMessage,
    markConversationAsRead,
    resetNotifications: (routeName) => {
      // If a route is provided, set it as the current route
      if (routeName && routeName !== currentRoute) {
        setCurrentRoute(routeName);
      }
      
      // Only reset notifications if we're on or going to the MessageHistory screen
      if (currentRoute === 'MessageHistory' || routeName === 'MessageHistory') {
        debugLog('MBA4321: Resetting message notifications');
        setHasUnreadMessages(false);
        setUnreadCount(0);
      }
    }
  };

  return (
    <MessageNotificationContext.Provider value={contextValue}>
      {children}
    </MessageNotificationContext.Provider>
  );
};

export default MessageNotificationContext; 