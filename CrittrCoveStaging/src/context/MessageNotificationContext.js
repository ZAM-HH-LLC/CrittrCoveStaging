import React, { createContext, useState, useEffect, useContext, useRef } from 'react';
import { AuthContext, debugLog } from './AuthContext';
import { getUnreadMessageCount } from '../api/API';
import websocketManager from '../utils/websocket';
import { getStorage } from './AuthContext';
import { Platform } from 'react-native';

// Create the context
export const MessageNotificationContext = createContext();

export const MessageNotificationProvider = ({ children }) => {
  const { isSignedIn, userRole } = useContext(AuthContext);
  
  // State for notification badges
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  // Add role-specific counts for more accurate notification management
  const [ownerUnreadCount, setOwnerUnreadCount] = useState(0);
  const [professionalUnreadCount, setProfessionalUnreadCount] = useState(0);
  const [conversationCounts, setConversationCounts] = useState({});
  const [currentRoute, setCurrentRoute] = useState('');
  const [lastApiResponse, setLastApiResponse] = useState(null);
  
  // State for WebSocket management
  const [websocketConnected, setWebsocketConnected] = useState(false);
  const [websocketInitialized, setWebsocketInitialized] = useState(false);
  const [lastApiCheck, setLastApiCheck] = useState(0);
  
  // Use refs to track initialization state and prevent duplicate calls
  const initialCheckDoneRef = useRef(false);
  const pendingCheckRef = useRef(false);
  const reconnectIntervalRef = useRef(null);
  const debounceTimerRef = useRef(null);
  const websocketDataReceivedRef = useRef(false);
  const lastCheckTimeRef = useRef(0);  // Track last time we checked
  const MIN_CHECK_INTERVAL = 5000; // Minimum 5 seconds between API checks
  
  // Ref to track connection health (separate from connected state)
  const connectionHealthyRef = useRef(false);
  // Track WebSocket initialization and reconnect attempts
  const websocketInitializedRef = useRef(false);
  const websocketRetryAttemptsRef = useRef(0);
  const MAX_WEBSOCKET_RETRIES = 12; // After 12 retries (60 seconds), fall back to API
  const WEBSOCKET_RETRY_INTERVAL = 5000; // 5 second wait between retries
  
  // Add connection status tracking
  const lastHeartbeatReceivedRef = useRef(0);
  const lastHeartbeatSentRef = useRef(0);
  const heartbeatTimeoutRef = useRef(null); // Track if connection is healthy
  const HEARTBEAT_TIMEOUT = 40000; // 40 seconds timeout for heartbeat responses
  
  // Add session-based flag to track if we already made an API call in this session
  const initialApiCallMadeRef = useRef(false);
  // Timeout ref for WebSocket heartbeat check
  const websocketTimeoutRef = useRef(null);
  // Add a lastApiCheckRef at the top of the component with other refs
  const lastApiCheckRef = useRef(0);
  
  // Ref to track user role changes
  const prevUserRoleRef = useRef(null);

  // Function to check if we have unread messages based on conversations
  const checkUnreadMessages = async (force = false) => {
    try {
      // If there's already a check in progress, don't start another one
      if (pendingCheckRef.current) {
        debugLog('MBA4321: Skipping unread check - another check is already in progress');
        return hasUnreadMessages;
      }
      
      // Stack trace logging to help identify what's triggering API calls
      const stackTrace = new Error().stack;
      debugLog(`MBA4321: checkUnreadMessages called from:\n${stackTrace}`);
      
      // Set pending flag before proceeding
      pendingCheckRef.current = true;
      
      // For forced refreshes, we should just make the API call immediately
      if (force) {
        debugLog('MBA432wihe21: Forced API call for unread messages');
        return await makeApiCall();
      }

      // NEW LOGIC: Check if websocket is connected first
      const websocketConnected = websocketManager && websocketManager.isWebSocketConnected();
      debugLog(`MBA4321: WebSocket connected: ${websocketConnected}`);
      
      // If WebSocket is connected and we've received data, return current state - no API call needed
      if (websocketConnected && websocketDataReceivedRef.current) {
        debugLog('MBA4321: WebSocket is connected and data received, using current state');
        pendingCheckRef.current = false;
        return hasUnreadMessages;
      }
      
      // Check if this is a page load (first time check)
      if (!initialApiCallMadeRef.current) {
        debugLog('MBA4321: First check on page load, implementing progressive WebSocket wait');
        
        // Clear any existing timeout
        if (websocketTimeoutRef.current) {
          clearTimeout(websocketTimeoutRef.current);
        }
        
        // Wait for WebSocket using progressive checks, with final API fallback
        return await waitForWebSocketWithFallback();
      }
      
      // We already made an initial call for this session and WebSocket isn't connected
      // However, we're not forcing a refresh, so just use current state
      debugLog('MBA4321: Using existing state, we already made an initial API call');
      pendingCheckRef.current = false;
      return hasUnreadMessages;
    } catch (error) {
      debugLog('MBA4321: Error in checkUnreadMessages:', error);
      pendingCheckRef.current = false;
      return hasUnreadMessages;
    }
  };

  // Function to wait for WebSocket with progressive checks and final API fallback
  const waitForWebSocketWithFallback = async () => {
    // Reset attempt counter
    websocketRetryAttemptsRef.current = 0;
    
    // IMPORTANT: If this is a fresh page load, ALWAYS make an API call first to get accurate state
    // The problem was that we would rely only on WebSocket which might miss messages that arrived
    // while the user was offline
    if (!initialApiCallMadeRef.current) {
      debugLog('MBA432wihe21: Fresh page load - making initial API call to get accurate unread count');
      return await makeApiCall();
    }
    
    return new Promise((resolve) => {
      // Define the progressive check function
      const checkWebSocketAndWait = () => {
        // First check if WebSocket is connected
        const connected = websocketManager && websocketManager.isWebSocketConnected();
        
        // Check if we've received any data (either from WebSocket or separate handlers)
        if (websocketDataReceivedRef.current) {
          debugLog('MBA4321: WebSocket data received during wait, using current state');
          pendingCheckRef.current = false;
          resolve(hasUnreadMessages);
          return;
        }
        
        // Increment attempt counter
        websocketRetryAttemptsRef.current++;
        debugLog(`MBA4321: WebSocket wait attempt ${websocketRetryAttemptsRef.current}/${MAX_WEBSOCKET_RETRIES}, connected: ${connected}`);
        
        // If connected, send a heartbeat to check if we get a response
        if (connected) {
          debugLog('MBA4321: WebSocket is connected, sending heartbeat request');
          websocketManager.send('heartbeat', { timestamp: Date.now() });
          lastHeartbeatSentRef.current = Date.now();
        }
        
        // If reached max attempts, fall back to API
        if (websocketRetryAttemptsRef.current >= MAX_WEBSOCKET_RETRIES) {
          debugLog('MBA432wihe21: Max WebSocket wait attempts reached, falling back to API');
          // Make the API call and resolve with its result
          makeApiCall().then(result => resolve(result));
          return;
        }
        
        // Schedule next check (after 5-second wait)
        websocketTimeoutRef.current = setTimeout(checkWebSocketAndWait, WEBSOCKET_RETRY_INTERVAL);
      };
      
      // Start the first check
      checkWebSocketAndWait();
    });
  };
  
  // Extract API call logic to separate function
  const makeApiCall = async () => {
    // Add new logging with the special prefix
    debugLog('MBA432wihe21: makeApiCall called, checking if necessary');
    
    // Check if we've made an API call in the last minute (60000ms)
    // This prevents frequent API calls which can disrupt components like BookingApprovalModal
    const now = Date.now();
    const timeSinceLastCheck = now - lastApiCheckRef.current;
    
    // Skip API calls if we've checked in the last minute, unless the connection is unhealthy
    if (timeSinceLastCheck < 60000 && websocketDataReceivedRef.current && connectionHealthyRef.current) {
      debugLog('MBA432wihe21: Skipping API call - checked recently and connection is healthy');
      return hasUnreadMessages;
    }
    
    debugLog('MBA432wihe21: Making API call for unread messages');
    
    try {
      // Call the API to get unread message count
      const result = await getUnreadMessageCount();
      const count = result.unread_count || 0;
      const conversationUnreadCounts = result.conversation_counts || {};
      
      debugLog('MBA432wihe21: Unread message count from API:', count);
      
      // Process conversation data to determine role-specific unread counts
      let ownerCount = 0;
      let proCount = 0;
      
      // Analyze the conversation_counts to separate by role
      if (result.conversation_role_map) {
        // If the API returns a role map, use it directly
        ownerCount = result.owner_unread_count || 0;
        proCount = result.professional_unread_count || 0;
        
        debugLog('MBA432wihe21: Got role-specific counts from API', {
          ownerCount,
          proCount
        });
      } else {
        // Otherwise, we need to infer from what's available
        // This is a fallback and won't be needed once the API is updated
        
        // We'll assume that the API already filters by the current role
        // So all counts are for the current role
        if (userRole === 'petOwner') {
          ownerCount = count;
        } else {
          proCount = count;
        }
        
        debugLog('MBA432wihe21: Inferred role-specific counts', {
          userRole,
          ownerCount,
          proCount,
          totalCount: count
        });
      }
      
      // Update the API response cache
      setLastApiResponse({
        unread_count: count,
        conversation_counts: conversationUnreadCounts,
        owner_unread_count: ownerCount,
        professional_unread_count: proCount,
        timestamp: now
      });
      
      // Update state based on API response
      setUnreadCount(count);
      setOwnerUnreadCount(ownerCount);
      setProfessionalUnreadCount(proCount);
      
      // Only set hasUnreadMessages based on the current role's count
      const currentRoleCount = userRole === 'petOwner' ? ownerCount : proCount;
      setHasUnreadMessages(currentRoleCount > 0);
      
      setConversationCounts(conversationUnreadCounts);
      setLastApiCheck(now);
      lastCheckTimeRef.current = now;
      lastApiCheckRef.current = now;
      
      // Mark initialization as complete
      initialCheckDoneRef.current = true;
      
      // Mark that we've made an API call in this session
      initialApiCallMadeRef.current = true;
      
      // Mark that we've received data
      websocketDataReceivedRef.current = true;
      
      // Clear pending flag
      pendingCheckRef.current = false;
      
      return count > 0;
    } catch (error) {
      debugLog('MBA432wihe21: Error in API call:', error);
      pendingCheckRef.current = false;
      return hasUnreadMessages;
    }
  };

  // Debounced version of checkUnreadMessages to prevent excessive API calls
  const debouncedCheckUnreadMessages = (force = false) => {
    // Clear any existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    // Set a new timer to delay the API call
    debounceTimerRef.current = setTimeout(() => {
      checkUnreadMessages(force);
      debounceTimerRef.current = null;
    }, 300); // 300ms debounce time
  };

  // Check how many unread messages a specific conversation has
  const getConversationUnreadCount = (conversationId) => {
    if (!conversationId) return 0;
    const count = conversationCounts[conversationId] || 0;
    
    // Add logging for debugging unread counts
    if (count > 0) {
      debugLog(`MBA2o3uihf48hv: getConversationUnreadCount for ${conversationId}`, {
        conversationId,
        count,
        allCounts: JSON.stringify(conversationCounts),
        totalUnreadCount: unreadCount,
        hasUnreadMessages
      });
    }
    
    return count;
  };

  // Check if user is currently on the Messages screen
  const isOnMessagesScreen = () => {
    return currentRoute === 'MessageHistory';
  };

  // Function to handle incoming new messages
  const onNewMessage = (messageData) => {
    debugLog('MBA3uiobv59u: onNewMessage called with data:', messageData);
    
    // Only create notification if the message is from another user
    if (messageData && messageData.sent_by_other_user) {
      const conversationId = messageData.conversation_id;
      
      // Check if user is viewing this specific conversation
      if (isOnMessagesScreen() && conversationId && 
          typeof window !== 'undefined' && String(conversationId) === String(window.selectedConversationId)) {
        debugLog('MBA3uiobv59u: User is viewing this conversation, not creating notification');
        return;
      }
      
      // Determine which role this message is for
      const messageRole = messageData.message_role || messageData.conversation_role;
      
      // IMPROVED ROLE DETECTION: Check sender role/type and recipient role to better determine
      // which role the message belongs to
      let isForOwnerRole = messageRole === 'petOwner' || messageRole === 'owner';
      let isForProfessionalRole = messageRole === 'professional';
      
      // If message doesn't have explicit role, try to infer from other data
      if (!isForOwnerRole && !isForProfessionalRole) {
        if (messageData.recipient_role) {
          // If we have recipient role, use that directly
          isForOwnerRole = messageData.recipient_role === 'petOwner' || messageData.recipient_role === 'owner';
          isForProfessionalRole = messageData.recipient_role === 'professional';
        } else if (messageData.sender_type) {
          // If sender is professional, message is likely for pet owner and vice versa
          isForOwnerRole = messageData.sender_type === 'professional';
          isForProfessionalRole = messageData.sender_type === 'petOwner' || messageData.sender_type === 'owner';
        }
      }
      
      debugLog('MBA3uiobv59u: Message role information:', {
        conversationId,
        messageRole,
        isForOwnerRole,
        isForProfessionalRole,
        currentUserRole: userRole,
        recipientRole: messageData.recipient_role,
        senderType: messageData.sender_type
      });
      
      // Update total unread count
      setUnreadCount(prevCount => {
        const newCount = prevCount + 1;
        debugLog(`MBA3uiobv59u: Total unread count: ${prevCount} → ${newCount}`);
        return newCount;
      });
      
      // CRITICAL: Always set hasUnreadMessages to true when receiving a new message
      // This ensures the Messages tab shows notification regardless of role specifics
      setHasUnreadMessages(true);
      debugLog('MBA3uiobv59u: Setting hasUnreadMessages=true for all new messages');
      
      // If we've successfully identified a specific role for this message
      if (isForOwnerRole || isForProfessionalRole) {
        // Only update the count for the specific role this message is for
        if (isForOwnerRole) {
          // This message is for the owner role
          setOwnerUnreadCount(prevCount => {
            const newCount = prevCount + 1;
            debugLog(`MBA3uiobv59u: Owner unread count: ${prevCount} → ${newCount}`);
            return newCount;
          });
        } else if (isForProfessionalRole) {
          // This message is for the professional role
          setProfessionalUnreadCount(prevCount => {
            const newCount = prevCount + 1;
            debugLog(`MBA3uiobv59u: Professional unread count: ${prevCount} → ${newCount}`);
            return newCount;
          });
        }
      } else {
        // Role is still ambiguous even after attempts to infer
        debugLog('MBA3uiobv59u: Message role still ambiguous, logging all available message data');
        
        // Full debug log of the entire message data to see what we have available
        // This should help us find the is_professional field if it exists
        debugLog('MBA3uiobv59u: FULL MESSAGE DATA:', JSON.stringify(messageData, null, 2));
        
        // Check if we have is_professional in the message data
        const userIsProfessionalInConversation = messageData.is_professional === true;
        
        debugLog('MBA3uiobv59u: User professional status in conversation:', {
          is_professional: messageData.is_professional,
          userIsProfessionalInConversation
        });
        
        // If we know the user's role in this conversation, update the appropriate count
        if (typeof messageData.is_professional === 'boolean') {
          if (userIsProfessionalInConversation) {
            // User is a professional in this conversation, so message is for professional
            setProfessionalUnreadCount(prevCount => {
              const newCount = prevCount + 1;
              debugLog(`MBA3uiobv59u: Professional unread count (from is_professional): ${prevCount} → ${newCount}`);
              return newCount;
            });
          } else {
            // User is an owner in this conversation, so message is for owner
            setOwnerUnreadCount(prevCount => {
              const newCount = prevCount + 1;
              debugLog(`MBA3uiobv59u: Owner unread count (from is_professional): ${prevCount} → ${newCount}`);
              return newCount;
            });
          }
        } else {
          // If we don't have is_professional, try other methods
          
          // For now, as a stopgap measure, update both counts
          // This ensures notifications appear for both roles
          // This isn't ideal, but it's better than missing notifications
          setProfessionalUnreadCount(prevCount => {
            const newCount = prevCount + 1;
            debugLog(`MBA3uiobv59u: Professional unread count (fallback): ${prevCount} → ${newCount}`);
            return newCount;
          });
          
          setOwnerUnreadCount(prevCount => {
            const newCount = prevCount + 1;
            debugLog(`MBA3uiobv59u: Owner unread count (fallback): ${prevCount} → ${newCount}`);
            return newCount;
          });
          
          debugLog('MBA3uiobv59u: WARNING: Updated both counts because is_professional is missing');
        }
        
        // Also log current state for debugging
        debugLog('MBA3uiobv59u: Current state for reference:', {
          userRole,
          hasUnreadMessages,
          unreadCount,
          ownerUnreadCount,
          professionalUnreadCount,
          conversationId: messageData.conversation_id,
          is_professional: messageData.is_professional
        });
      }
      
      // If we have a conversation ID, update that count too
      if (conversationId) {
        setConversationCounts(prevCounts => {
          const prevConvCount = prevCounts[conversationId] || 0;
          const newConvCount = prevConvCount + 1;
          
          debugLog(`MBA3uiobv59u: Conversation ${conversationId} count: ${prevConvCount} → ${newConvCount}`);
          
          return {
            ...prevCounts,
            [conversationId]: newConvCount
          };
        });
      }
    }
  };

  // Initialize global variable to track selected conversation across components
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.selectedConversationId = null;
    }
  }, []);

  // Mark a specific conversation as read
  const markConversationAsRead = async (conversationId) => {
    debugLog('MBA2o3uihf48hv: Marking conversation as read:', {
      conversationId,
      hasUnreadMessages,
      totalUnreadCount: unreadCount,
      ownerUnreadCount,
      professionalUnreadCount,
      userRole,
      conversationUnreadCount: conversationCounts[conversationId] || 0,
      allConversationCounts: JSON.stringify(conversationCounts)
    });
    
    // Update the global variable to track which conversation is currently selected
    if (typeof window !== 'undefined') {
      window.selectedConversationId = conversationId;
    }
    
    // Clear this conversation's unread count from local state
    if (conversationId && conversationCounts[conversationId]) {
      const previousCount = conversationCounts[conversationId] || 0;
      
      debugLog('MBA2o3uihf48hv: Found unread messages to clear', {
        conversationId,
        previousCount,
        currentTotalUnread: unreadCount
      });
      
      // IMPORTANT: Force immediate update of unreadCount first before updating state
      // This helps ensure the UI updates properly
      const newTotalCount = Math.max(0, unreadCount - previousCount);
      debugLog(`MBA2o3uihf48hv: DIRECTLY updating total unread count from ${unreadCount} to ${newTotalCount}`);
      
      // Update unread count directly first to ensure immediate UI update
      setUnreadCount(newTotalCount);
      
      // If this was the only conversation with unread messages, explicitly set hasUnreadMessages to false
      if (newTotalCount === 0) {
        debugLog(`MBA2o3uihf48hv: No more unread messages, setting hasUnreadMessages to false`);
        setHasUnreadMessages(false);
      }
      
      // Create new conversation counts object without this conversation
      const newCounts = { ...conversationCounts };
      delete newCounts[conversationId];
      setConversationCounts(newCounts);
      
      // Calculate new role-specific counts
      let newOwnerCount = ownerUnreadCount;
      let newProCount = professionalUnreadCount;
      
      // IMPORTANT: Only update the count for the CURRENT role
      // This fixes the issue where both role counts were being updated when a message was read
      if (userRole === 'petOwner') {
        // Only decrement owner count
        newOwnerCount = Math.max(0, ownerUnreadCount - previousCount);
        debugLog(`MBA2o3uihf48hv: Updating owner unread count: ${ownerUnreadCount} → ${newOwnerCount}`);
        setOwnerUnreadCount(newOwnerCount);
      } else if (userRole === 'professional') {
        // Only decrement professional count
        newProCount = Math.max(0, professionalUnreadCount - previousCount);
        debugLog(`MBA2o3uihf48hv: Updating professional unread count: ${professionalUnreadCount} → ${newProCount}`);
        setProfessionalUnreadCount(newProCount);
      }
      
      // Update API response cache if we have it
      if (lastApiResponse) {
        const updatedCounts = { ...lastApiResponse.conversation_counts };
        delete updatedCounts[conversationId];
        
        debugLog('MBA2o3uihf48hv: Updated role-specific counts after marking as read', {
          userRole,
          previousOwnerCount: ownerUnreadCount,
          previousProCount: professionalUnreadCount,
          newOwnerCount,
          newProCount,
          conversationId,
          conversationCount: previousCount
        });
        
        setLastApiResponse({
          unread_count: newTotalCount,
          conversation_counts: updatedCounts,
          owner_unread_count: newOwnerCount,
          professional_unread_count: newProCount,
          timestamp: Date.now()
        });
      }
      
      // Update hasUnreadMessages based on whether any conversations still have unread messages
      // for the CURRENT role
      const currentRoleHasUnread = userRole === 'petOwner' ? newOwnerCount > 0 : newProCount > 0;
      setHasUnreadMessages(currentRoleHasUnread);
      
      debugLog(`MBA2o3uihf48hv: After marking conversation ${conversationId} as read:`, {
        userRole,
        currentRoleHasUnread,
        newOwnerCount,
        newProCount,
        hasUnreadMessages: currentRoleHasUnread,
        conversationsRemaining: Object.keys(newCounts).length
      });
      
      // List remaining unread conversations
      if (Object.keys(newCounts).length > 0) {
        const remainingConvs = Object.keys(newCounts).map(id => `${id}:${newCounts[id]}`).join(', ');
        debugLog(`MBA2o3uihf48hv: Remaining unread conversations: ${remainingConvs}`);
      } else {
        debugLog('MBA2o3uihf48hv: No remaining unread conversations');
      }
    } else {
      debugLog('MBA2o3uihf48hv: No unread messages found for this conversation', {
        conversationId,
        conversationCounts: JSON.stringify(conversationCounts)
      });
    }
    
    // The backend automatically marks messages as read when 
    // get_conversation_messages is called, so we don't need to make another API call here
    
    debugLog('MBA2o3uihf48hv: Updated unread state after marking conversation as read');
  };

  // Update route information
  const updateRoute = (routeName) => {
    if (routeName && routeName !== currentRoute) {
      setCurrentRoute(routeName);
    }
  };

  // Initialize WebSocket connection when signed in - do this once globally
  useEffect(() => {
    const initializeWebSocket = async () => {
      if (!isSignedIn) {
        if (websocketInitialized) {
          debugLog('MBA4321: User signed out, force disconnecting WebSocket');
          websocketManager.disconnect(true); // Force disconnect on sign-out
          setWebsocketInitialized(false);
          
          // Clear any reconnect interval
          if (reconnectIntervalRef.current) {
            clearInterval(reconnectIntervalRef.current);
            reconnectIntervalRef.current = null;
          }
          
          // Clear any WebSocket timeout
          if (websocketTimeoutRef.current) {
            clearTimeout(websocketTimeoutRef.current);
            websocketTimeoutRef.current = null;
          }
          
          // Clear heartbeat timeout
          if (heartbeatTimeoutRef.current) {
            clearTimeout(heartbeatTimeoutRef.current);
            heartbeatTimeoutRef.current = null;
          }
          
          // Reset retry attempts and connection state
          websocketRetryAttemptsRef.current = 0;
          setWebsocketDataReceivedRef(false);
          connectionHealthyRef.current = false;
          initialApiCallMadeRef.current = false;
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
        
        // Reset WebSocket retry attempts when initialization starts
        websocketRetryAttemptsRef.current = 0;
        
        // IMPORTANT: Always make an initial API call on page load/refresh to get accurate count
        // This ensures we start with the correct server state
        setTimeout(() => {
          debugLog('MBA432wihe21: Forcing initial API check on page load to get accurate count');
          makeApiCall();
        }, 500);
      } catch (error) {
        debugLog('MBA4321: Error initializing WebSocket:', error);
      }
    };
    
    // Function to check WebSocket connection health
    const checkConnectionHealth = () => {
      // Only proceed if signed in and initialized
      if (!isSignedIn || !websocketInitialized) return;
      
      const now = Date.now();
      const timeSinceLastHeartbeat = now - lastHeartbeatReceivedRef.current;
      
      // Log the current connection state
      debugLog(`MBA4321: Connection health check - Last heartbeat: ${timeSinceLastHeartbeat}ms ago`);
      
      // If we haven't received a heartbeat in a while, connection might be dead
      if (timeSinceLastHeartbeat > HEARTBEAT_TIMEOUT) {
        debugLog('MBA4321: Connection seems unhealthy, attempting reconnection');
        connectionHealthyRef.current = false;
        
        // Reset the WebSocket data received flag if connection is unhealthy
        setWebsocketDataReceivedRef(false);
        
        // Attempt to reconnect
        websocketManager.reconnectIfNeeded();
        
        // Start progressive retry only if we haven't received data in a while
        if (timeSinceLastHeartbeat > 120000) { // 2 minutes
          startProgressiveWebSocketRetry();
        }
      } else {
        // Connection seems healthy, just send a heartbeat to keep it alive
        debugLog('MBA4321: Connection seems healthy, sending heartbeat');
        connectionHealthyRef.current = true;
        
        // Send heartbeat to keep connection alive
        if (websocketManager && websocketManager.isWebSocketConnected()) {
          websocketManager.send('heartbeat', { timestamp: now });
          lastHeartbeatSentRef.current = now;
        }
      }
    };
    
    // Function to progressively retry WebSocket connection with API fallback
    const startProgressiveWebSocketRetry = () => {
      debugLog('MBA4321: Starting progressive WebSocket retry');
      
      // Reset retry counter if we're starting fresh
      if (initialCheckDoneRef.current) {
        websocketRetryAttemptsRef.current = 0;
      }
      
      // If we've already received WebSocket data, no need to retry
      if (websocketDataReceivedRef.current) {
        debugLog('MBA4321: WebSocket data already received, skipping retry process');
        return;
      }
      
      // Check if the WebSocket is already connected
      const isConnected = websocketManager && websocketManager.isWebSocketConnected();
      if (isConnected) {
        debugLog('MBA4321: WebSocket is already connected, sending heartbeat to verify');
        websocketManager.send('heartbeat', { timestamp: Date.now() });
        lastHeartbeatSentRef.current = Date.now();
        
        // Set a single timeout to check if we got heartbeat response
        websocketTimeoutRef.current = setTimeout(() => {
          if (!websocketDataReceivedRef.current) {
            debugLog('MBA432wihe21: No heartbeat response received, falling back to API');
            checkUnreadMessages(true);
          }
        }, 5000); // Wait 5 seconds for heartbeat response
        
        return;
      }
      
      // WebSocket isn't connected, let's use our waitForWebSocketWithFallback
      // which is already implemented in checkUnreadMessages
      checkUnreadMessages(false);
    };
    
    initializeWebSocket();
    
    // Clean up on unmount
    return () => {
      if (reconnectIntervalRef.current) {
        debugLog('MBA4321: Cleaning up WebSocket reconnect interval');
        clearInterval(reconnectIntervalRef.current);
        reconnectIntervalRef.current = null;
      }
      
      // Clear debounce timer if it exists
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      
      // Clear WebSocket timeout if it exists
      if (websocketTimeoutRef.current) {
        clearTimeout(websocketTimeoutRef.current);
        websocketTimeoutRef.current = null;
      }
      
      // Clear heartbeat timeout
      if (heartbeatTimeoutRef.current) {
        clearTimeout(heartbeatTimeoutRef.current);
        heartbeatTimeoutRef.current = null;
      }
      
      // Note: We don't disconnect the WebSocket on unmount 
      // This allows the connection to persist when navigating between tabs
    };
  }, [isSignedIn]);

  // Register a websocket handler for new message notifications
  useEffect(() => {
    if (!isSignedIn || !websocketInitialized) return;

    debugLog('MBA3uiobv59u: Setting up WebSocket message handlers');
    
    // Add explicit handler for new_message events from the server
    const newMessageHandler = websocketManager.registerHandler('new_message', (data) => {
      debugLog('MBA3uiobv59u: New message notification received:', data);
      debugLog('MBA3uiobv59u: Current notification state BEFORE update:', {
        hasUnreadMessages,
        unreadCount,
        ownerUnreadCount,
        professionalUnreadCount,
        userRole
      });
      
      // Mark connection as healthy
      connectionHealthyRef.current = true;
      lastHeartbeatReceivedRef.current = Date.now();
      
      // Mark that we've received data from WebSocket
      websocketDataReceivedRef.current = true;
      
      // Process the new message
      onNewMessage(data);

      // Log state AFTER update (need setTimeout because setState is async)
      setTimeout(() => {
        debugLog('MBA3uiobv59u: Notification state AFTER update:', {
          hasUnreadMessages,
          unreadCount,
          ownerUnreadCount,
          professionalUnreadCount,
          userRole
        });
      }, 100);
    }, 'new-message-context');
    
    // Fallback handler for 'message' event type (keep for backward compatibility)
    const messageHandler = websocketManager.registerHandler('message', (data) => {
      debugLog('MBA4321: Message notification received via WebSocket:', data);
      
      // Mark connection as healthy
      connectionHealthyRef.current = true;
      lastHeartbeatReceivedRef.current = Date.now();
      
      // Mark that we've received data from WebSocket
      websocketDataReceivedRef.current = true;
      
      // Process the message
      onNewMessage(data);
    }, 'notification-context');
    
    const unreadUpdateHandler = websocketManager.registerHandler('unread_update', (data) => {
      debugLog('MBA4321: Unread update received via WebSocket:', data);
      
      // Update heartbeat timestamp
      lastHeartbeatReceivedRef.current = Date.now();
      
      // Mark connection as healthy
      connectionHealthyRef.current = true;
      
      // Update the state directly from the WebSocket data
      if (data && typeof data.unread_count !== 'undefined') {
        setUnreadCount(data.unread_count);
        setHasUnreadMessages(data.unread_count > 0);
        setConversationCounts(data.conversation_counts || {});
        
        // Also update the API response cache with this new data
        setLastApiResponse({
          unread_count: data.unread_count,
          conversation_counts: data.conversation_counts || {},
          timestamp: Date.now()
        });
        
        setLastApiCheck(Date.now()); // Consider websocket updates as api checks
        
        // Mark that we've received data from WebSocket
        websocketDataReceivedRef.current = true;
        
        // Mark initialization as complete since we got data from WebSocket
        initialCheckDoneRef.current = true;
      }
    }, 'unread-update-context');
    
    // Add a heartbeat acknowledgment handler
    const heartbeatHandler = websocketManager.registerHandler('heartbeat_ack', (data) => {
      debugLog('MBA4321: Heartbeat acknowledgment received');
      
      // Update heartbeat timestamp
      lastHeartbeatReceivedRef.current = Date.now();
      
      // Mark connection as healthy
      connectionHealthyRef.current = true;
      
      // Mark that we've received data from WebSocket
      websocketDataReceivedRef.current = true;
    }, 'heartbeat-context');
    
    // Handle WebSocket connection/disconnection
    const connectionHandler = websocketManager.registerHandler('connection', (data) => {
      debugLog('MBA4321: WebSocket connection event:', data);
      
      // Record heartbeat if we've established connection
      if (data.status === 'connected') {
        lastHeartbeatReceivedRef.current = Date.now();
        connectionHealthyRef.current = true;
      } else {
        // Only reset the WebSocket data flag if connection was explicitly closed
        // This prevents unnecessary API calls when the connection is temporarily unstable
        if (data.forced) {
          websocketDataReceivedRef.current = false;
          connectionHealthyRef.current = false;
          debugLog('MBA4321: Connection forcibly closed, resetting WebSocket data flag');
        }
      }
      
      // If we're (re)connecting and haven't done an initial check yet, do it now
      if (data.status === 'connected' && !initialCheckDoneRef.current) {
        // Use a small delay to avoid race conditions with other initialization
        setTimeout(() => {
          // Only call API if we haven't received WebSocket data yet
          if (!websocketDataReceivedRef.current) {
            debugLog('MBA432wihe21: in connection handler');
            checkUnreadMessages(true);
          }
        }, 1000);
      }
    }, 'connection-context');
    
    // Cleanup function to unregister handlers
    return () => {
      debugLog('MBA4321: Cleaning up WebSocket handlers');
      messageHandler();
      newMessageHandler();
      unreadUpdateHandler();
      connectionHandler();
      heartbeatHandler();
    };
  }, [isSignedIn, websocketInitialized]);

  // Setup visibility change listener to reconnect when tab becomes visible
  useEffect(() => {
    if (!isSignedIn) return;
    
    const handleVisibilityChange = () => {
      if (Platform.OS === 'web' && document.visibilityState === 'visible') {
        debugLog('MBA4321: Tab became visible, ensuring WebSocket connection');
        
        // First check if the WebSocket is already connected
        const isWSConnected = websocketManager && websocketManager.isWebSocketConnected();
        debugLog(`MBA4321: WebSocket connection status on visibility change: ${isWSConnected ? 'Connected' : 'Disconnected'}`);
        
        // If WebSocket is already connected, we don't need to do anything
        if (isWSConnected) {
          debugLog('MBA4321: WebSocket is already connected, no reconnection needed');
          
          // Optionally send a heartbeat to verify connection is still good
          websocketManager.send('heartbeat', { timestamp: Date.now() });
          lastHeartbeatSentRef.current = Date.now();
          
          // Reset the WebSocket data received flag since we have a good connection
          websocketDataReceivedRef.current = true;
          connectionHealthyRef.current = true;
          
          return;
        }
        
        // WebSocket isn't connected, try to reconnect
        if (websocketManager && typeof websocketManager.reconnectIfNeeded === 'function') {
          debugLog('MBA4321: WebSocket not connected, attempting reconnection');
          websocketManager.reconnectIfNeeded();
          
          // Start progressive retry instead of immediate API call
          // Reset retry attempts counter first
          websocketRetryAttemptsRef.current = 0;
          
          const startProgressiveRetry = () => {
            // Check if WebSocket connected during the retry process
            const nowConnected = websocketManager && websocketManager.isWebSocketConnected();
            
            // If WebSocket is now connected or data is received, we're done
            if (nowConnected || websocketDataReceivedRef.current) {
              debugLog('MBA4321: WebSocket reconnected successfully, stopping retry process');
              // Clear any scheduled retry
              if (websocketTimeoutRef.current) {
                clearTimeout(websocketTimeoutRef.current);
                websocketTimeoutRef.current = null;
              }
              return;
            }
            
            // Increment retry counter
            websocketRetryAttemptsRef.current++;
            debugLog(`MBA4321: WebSocket reconnection attempt ${websocketRetryAttemptsRef.current}/${MAX_WEBSOCKET_RETRIES}`);
            
            if (websocketRetryAttemptsRef.current >= MAX_WEBSOCKET_RETRIES) {
              // Max retries reached, fall back to API
              debugLog('MBA432wihe21: Max retries reached, fall back to API');
              debouncedCheckUnreadMessages(true);
              return;
            }
            
            // Try to reconnect again after interval
            websocketTimeoutRef.current = setTimeout(startProgressiveRetry, WEBSOCKET_RETRY_INTERVAL);
          };
          
          // Start the retry process after a short delay to allow immediate reconnection to complete
          setTimeout(startProgressiveRetry, 1000);
        }
      }
    };
    
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }
    
    return () => {
      if (Platform.OS === 'web' && typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }
      
      // Clear WebSocket timeout if it exists
      if (websocketTimeoutRef.current) {
        clearTimeout(websocketTimeoutRef.current);
        websocketTimeoutRef.current = null;
      }
      
      // Clear heartbeat timeout
      if (heartbeatTimeoutRef.current) {
        clearTimeout(heartbeatTimeoutRef.current);
        heartbeatTimeoutRef.current = null;
      }
    };
  }, [isSignedIn]); // Remove lastApiCheck from dependencies

  // Modified fallback strategy with much less frequent API calls
  useEffect(() => {
    if (!isSignedIn) {
      setHasUnreadMessages(false);
      setUnreadCount(0);
      setConversationCounts({});
      websocketDataReceivedRef.current = false;
      initialApiCallMadeRef.current = false;
      
      // Clear any WebSocket timeout
      if (websocketTimeoutRef.current) {
        clearTimeout(websocketTimeoutRef.current);
        websocketTimeoutRef.current = null;
      }
      
      return;
    }
    
    // Always get fresh unread count on page load or sign-in
    // This ensures we start with correct state
    if (!initialApiCallMadeRef.current) {
      debugLog('MBA4321: Ensuring we get fresh unread count on page load/sign-in');
      
      const initialCheckTimeout = setTimeout(() => {
        if (!initialApiCallMadeRef.current) {
          debugLog('MBA432wihe21: Making initial API call to get fresh unread count');
          makeApiCall();
        }
      }, 1000); // Short delay to allow WebSocket initialization
      
      // Clear timeout on cleanup
      return () => clearTimeout(initialCheckTimeout);
    }
    
    // No polling needed - WebSocket is the primary data source
    
    return () => {};
  }, [isSignedIn]);

  // Add effect to log changes to role-specific notification counts
  useEffect(() => {
    debugLog('MBA3uiobv59u: Notification state changed:', {
      hasUnreadMessages,
      unreadCount,
      ownerUnreadCount,
      professionalUnreadCount,
      userRole
    });
  }, [hasUnreadMessages, unreadCount, ownerUnreadCount, professionalUnreadCount, userRole]);

  // Update user role from AuthContext
  useEffect(() => {
    if (userRole !== prevUserRoleRef.current) {
      debugLog('MBA3uiobv59u: User role changed in MessageNotificationContext:', {
        from: prevUserRoleRef.current,
        to: userRole
      });
      
      // Store previous role to properly transition
      const previousRole = prevUserRoleRef.current;
      prevUserRoleRef.current = userRole;
      
      // When role changes, update hasUnreadMessages flag based on the new role's count
      if (userRole === 'petOwner') {
        // Switching to pet owner role
        setHasUnreadMessages(ownerUnreadCount > 0);
        debugLog('MBA3uiobv59u: Updated hasUnreadMessages for pet owner role:', {
          ownerUnreadCount,
          hasUnreadMessages: ownerUnreadCount > 0
        });
      } else if (userRole === 'professional') {
        // Switching to professional role
        setHasUnreadMessages(professionalUnreadCount > 0);
        debugLog('MBA3uiobv59u: Updated hasUnreadMessages for professional role:', {
          professionalUnreadCount,
          hasUnreadMessages: professionalUnreadCount > 0
        });
      }
      
      // Refresh notifications only if we have a valid role
      if (userRole) {
        // Slight delay to ensure role is fully updated
        setTimeout(() => {
          checkUnreadMessages(true);
        }, 50);
      }
    }
  }, [userRole, ownerUnreadCount, professionalUnreadCount]);

  // Create a memoized value for the context to reduce rerenders
  const contextValue = {
    hasUnreadMessages,
    unreadCount,
    ownerUnreadCount, 
    professionalUnreadCount,
    conversationCounts,
    currentRoute,
    getConversationUnreadCount,
    checkUnreadMessages,
    markConversationAsRead,
    resetNotifications: (routeName, conversationId) => {
      // If a route is provided, set it as the current route
      if (routeName && routeName !== currentRoute) {
        setCurrentRoute(routeName);
      }
      
      debugLog('MBA2o3uihf48hv: resetNotifications called', {
        routeName,
        conversationId,
        currentRoute,
        hasUnreadMessages,
        unreadCount,
        conversationCountsSize: Object.keys(conversationCounts).length
      });
      
      // If a specific conversation ID is provided, only clear that conversation's notifications
      if (conversationId) {
        debugLog(`MBA2o3uihf48hv: Resetting notifications for specific conversation: ${conversationId}`);
        markConversationAsRead(conversationId);
        return;
      }
      
      // IMPORTANT: Do NOT reset all notifications just because we're on the MessageHistory screen
      // This was the bug - we were clearing all notifications even when only one conversation was viewed
      
      // Only reset all notifications if explicitly requested with a special flag
      if (routeName === 'RESET_ALL') {
        debugLog('MBA2o3uihf48hv: Explicitly resetting ALL message notifications');
        setHasUnreadMessages(false);
        setUnreadCount(0);
        setConversationCounts({});
      }
    },
    updateRoute,
    // Helper function to get the count for the current role
    getCurrentRoleUnreadCount: () => {
      const count = userRole === 'petOwner' ? ownerUnreadCount : professionalUnreadCount;
      debugLog('MBA3uiobv59u: getCurrentRoleUnreadCount called:', {
        userRole,
        ownerUnreadCount,
        professionalUnreadCount,
        returned: count
      });
      return count;
    },
    // Helper function to get the count for the other role
    getOtherRoleUnreadCount: () => {
      const count = userRole === 'petOwner' ? professionalUnreadCount : ownerUnreadCount;
      debugLog('MBA3uiobv59u: getOtherRoleUnreadCount called:', {
        userRole,
        ownerUnreadCount,
        professionalUnreadCount,
        returned: count
      });
      return count;
    },
    // Helper to check if current role has unread messages
    hasCurrentRoleUnreadMessages: () => {
      const result = userRole === 'petOwner' ? ownerUnreadCount > 0 : professionalUnreadCount > 0;
      debugLog('MBA3uiobv59u: hasCurrentRoleUnreadMessages called:', {
        userRole,
        ownerUnreadCount,
        professionalUnreadCount,
        returned: result
      });
      return result;
    }
  };

  return (
    <MessageNotificationContext.Provider value={contextValue}>
      {children}
    </MessageNotificationContext.Provider>
  );
};

export default MessageNotificationContext; 