import React, { createContext, useState, useEffect, useContext, useRef } from 'react';
import { AuthContext, debugLog } from './AuthContext';
import { getUnreadMessageCount } from '../api/API';
import websocketManager from '../utils/websocket';
import { getStorage } from './AuthContext';

// Create the context
export const MessageNotificationContext = createContext();

export const MessageNotificationProvider = ({ children }) => {
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [conversationCounts, setConversationCounts] = useState({});
  const [currentRoute, setCurrentRoute] = useState('');
  const [websocketInitialized, setWebsocketInitialized] = useState(false);
  const [lastApiCheck, setLastApiCheck] = useState(0);
  const { isSignedIn } = useContext(AuthContext);
  
  // Use refs to track initialization state and prevent duplicate calls
  const initialCheckDoneRef = useRef(false);
  const pendingCheckRef = useRef(false);

  // Function to check if we have unread messages based on conversations
  const checkUnreadMessages = async (force = false) => {
    try {
      // If there's already a check in progress, don't start another one
      if (pendingCheckRef.current) {
        debugLog('MBA4321: Skipping unread check - another check is already in progress');
        return hasUnreadMessages;
      }
      
      // If we've checked in the last 5 minutes and this isn't a forced refresh,
      // don't make another API call (increased from 30 seconds to 5 minutes)
      const now = Date.now();
      if (!force && now - lastApiCheck < 300000) {
        debugLog('MBA4321: Skipping unread check - checked recently');
        return hasUnreadMessages;
      }
      
      // Set pending flag before making API call
      pendingCheckRef.current = true;
      debugLog('MBA4321: Checking for unread messages via API');
      
      // Call the API to get unread message count
      const result = await getUnreadMessageCount();
      const count = result.unread_count || 0;
      const conversationUnreadCounts = result.conversation_counts || {};
      
      debugLog('MBA4321: Unread message count:', count);
      debugLog('MBA4321: Conversation counts:', conversationUnreadCounts);
      
      // Update state based on API response
      setUnreadCount(count);
      setHasUnreadMessages(count > 0);
      setConversationCounts(conversationUnreadCounts);
      setLastApiCheck(now);
      
      // Mark initialization as complete
      initialCheckDoneRef.current = true;
      
      // Clear pending flag after API call completes
      pendingCheckRef.current = false;
      
      return count > 0;
    } catch (error) {
      debugLog('MBA4321: Error checking unread messages:', error);
      // Clear pending flag on error
      pendingCheckRef.current = false;
      return hasUnreadMessages; // Return current state if there's an error
    }
  };

  // Check how many unread messages a specific conversation has
  const getConversationUnreadCount = (conversationId) => {
    if (!conversationId) return 0;
    return conversationCounts[conversationId] || 0;
  };

  // Check if user is currently on the Messages screen
  const isOnMessagesScreen = () => {
    return currentRoute === 'MessageHistory';
  };

  // Helper to handle new message notifications
  const handleNewMessageNotification = (conversationId = null) => {
    // Only update unread count if user is not on messages screen
    if (!isOnMessagesScreen()) {
      debugLog('MBA4321: Adding unread message notification');
      setHasUnreadMessages(true);
      setUnreadCount(prevCount => prevCount + 1);
      
      // If we have a conversation ID, update that count too
      if (conversationId) {
        setConversationCounts(prevCounts => ({
          ...prevCounts,
          [conversationId]: (prevCounts[conversationId] || 0) + 1
        }));
      }
    } else {
      debugLog('MBA4321: User is on messages screen, not creating notification');
    }
  };

  // Function to handle incoming new messages
  const onNewMessage = (messageData) => {
    debugLog('MBA4321: onNewMessage called with data:', messageData);
    
    // Only create notification if the message is from another user
    if (messageData && messageData.sent_by_other_user) {
      const conversationId = messageData.conversation_id;
      
      // Check if user is already on the message screen for this conversation
      if (isOnMessagesScreen() && 
          conversationId) {
        debugLog('MBA4321: User is viewing messages, not creating notification');
        return;
      }
      
      // Handle notification with conversation ID
      handleNewMessageNotification(conversationId);
    }
  };

  // Mark a specific conversation as read
  const markConversationAsRead = async (conversationId) => {
    debugLog('MBA4321: Marking conversation as read:', conversationId);
    
    // Clear this conversation's unread count from local state
    if (conversationId && conversationCounts[conversationId]) {
      const previousCount = conversationCounts[conversationId] || 0;
      
      // Update the unread count and conversation counts
      setUnreadCount(prevCount => Math.max(0, prevCount - previousCount));
      
      // Create new conversation counts object without this conversation
      const newCounts = { ...conversationCounts };
      delete newCounts[conversationId];
      setConversationCounts(newCounts);
      
      // Update hasUnreadMessages based on whether any conversations still have unread messages
      setHasUnreadMessages(Object.keys(newCounts).length > 0);
    }
    
    // The backend automatically marks messages as read when 
    // get_conversation_messages is called, so we don't need to make another API call here
    
    debugLog('MBA4321: Updated unread state after marking conversation as read');
  };

  // Update route information
  const updateRoute = (routeName) => {
    if (!routeName || routeName === currentRoute) return;
    
    debugLog('MBA4321: Updating route to:', routeName);
    setCurrentRoute(routeName);
    
    // Don't reset all notifications when navigating to MessageHistory
    // Individual conversations will be marked as read when they are opened
  };

  // Initialize WebSocket connection when signed in
  useEffect(() => {
    // Reset initialization flag on sign-in state change
    initialCheckDoneRef.current = false;
    
    const initializeWebSocket = async () => {
      if (!isSignedIn) {
        if (websocketInitialized) {
          debugLog('MBA4321: User signed out, disconnecting WebSocket');
          websocketManager.disconnect();
          setWebsocketInitialized(false);
        }
        return;
      }
    
      try {
        const token = await getStorage('userToken');
        if (!token) {
          debugLog('MBA4321: No token available for WebSocket connection');
          return;
        }
        
        debugLog('MBA4321: Initializing WebSocket connection');
        websocketManager.init(token);
        setWebsocketInitialized(true);
        
        // No need to check messages here - will be handled by the dedicated effect
      } catch (error) {
        debugLog('MBA4321: Error initializing WebSocket:', error);
      }
    };
    
    initializeWebSocket();
  }, [isSignedIn]);

  // Register a websocket handler for new message notifications
  useEffect(() => {
    if (!isSignedIn || !websocketInitialized) return;

    debugLog('MBA4321: Setting up WebSocket message handler');
    
    // Register handlers for relevant event types
    const messageHandler = websocketManager.registerHandler('message', (data) => {
      debugLog('MBA4321: Message notification received via WebSocket:', data);
      onNewMessage(data);
    }, 'notification-context');
    
    const unreadUpdateHandler = websocketManager.registerHandler('unread_update', (data) => {
      debugLog('MBA4321: Unread update received via WebSocket:', data);
      // Update the state directly from the WebSocket data
      if (data && typeof data.unread_count !== 'undefined') {
        setUnreadCount(data.unread_count);
        setHasUnreadMessages(data.unread_count > 0);
        setConversationCounts(data.conversation_counts || {});
        setLastApiCheck(Date.now()); // Consider websocket updates as api checks
        
        // Mark initialization as complete since we got data from WebSocket
        initialCheckDoneRef.current = true;
      }
    }, 'unread-update-context');
    
    // Handle WebSocket connection/disconnection
    const connectionHandler = websocketManager.registerHandler('connection', (data) => {
      debugLog('MBA4321: WebSocket connection event:', data);
      
      // If we're (re)connecting and haven't done an initial check yet, do it now
      if (data.status === 'connected' && !initialCheckDoneRef.current) {
        // Use a small delay to avoid race conditions with other initialization
        setTimeout(() => {
          checkUnreadMessages(true);
        }, 100);
      }
    }, 'connection-context');
    
    // Cleanup function to unregister handlers
    return () => {
      debugLog('MBA4321: Cleaning up WebSocket handlers');
      messageHandler();
      unreadUpdateHandler();
      connectionHandler();
    };
  }, [isSignedIn, websocketInitialized]);

  // Check for unread messages less frequently as WebSocket should handle real-time updates
  useEffect(() => {
    if (!isSignedIn) {
      setHasUnreadMessages(false);
      setUnreadCount(0);
      setConversationCounts({});
      return;
    }
    
    // Only perform initial check if not already done
    if (!initialCheckDoneRef.current) {
      debugLog('MBA4321: Performing initial unread messages check');
      // Use timeout to ensure this doesn't conflict with WebSocket initialization
      const initialCheckTimeout = setTimeout(() => {
        checkUnreadMessages(true);
      }, 500);
      
      // Clear timeout on cleanup
      return () => clearTimeout(initialCheckTimeout);
    }
    
    // Set up a much less frequent interval (every 10 minutes) as a fallback
    // WebSocket should handle real-time updates, this is just for sync/fallback
    const intervalId = setInterval(() => {
      debugLog('MBA4321: Performing periodic unread messages check (fallback)');
      checkUnreadMessages(true);
    }, 600000); // 10 minutes
    
    return () => clearInterval(intervalId);
  }, [isSignedIn, initialCheckDoneRef.current]);

  // Create a memoized value for the context to reduce rerenders
  const contextValue = {
    hasUnreadMessages,
    unreadCount,
    conversationCounts,
    getConversationUnreadCount,
    updateRoute,
    checkUnreadMessages,
    onNewMessage,
    markConversationAsRead,
    resetNotifications: (routeName, conversationId) => {
      // If a route is provided, set it as the current route
      if (routeName && routeName !== currentRoute) {
        setCurrentRoute(routeName);
      }
      
      // If a specific conversation ID is provided, only clear that conversation's notifications
      if (conversationId) {
        debugLog(`MBA4321: Resetting notifications for specific conversation: ${conversationId}`);
        markConversationAsRead(conversationId);
        return;
      }
      
      // Only reset all notifications if explicitly requested (no conversationId)
      // and we're on the MessageHistory screen
      if (currentRoute === 'MessageHistory' || routeName === 'MessageHistory') {
        debugLog('MBA4321: Resetting all message notifications (deprecated, use markConversationAsRead instead)');
        setHasUnreadMessages(false);
        setUnreadCount(0);
        setConversationCounts({});
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