import { useEffect, useCallback, useState, useRef } from 'react';
import websocketManager from '../utils/websocket';
import { getStorage, debugLog } from '../context/AuthContext';
import axios from 'axios';
import { API_BASE_URL } from '../config/config';

/**
 * Custom hook to use WebSocket in React components
 * @param {string} messageType - Type of messages to subscribe to
 * @param {function} callback - Callback to handle received messages
 * @param {object} options - Additional options
 * @returns {object} WebSocket state and methods
 */
const useWebSocket = (messageType, callback, options = {}) => {
  const { disabled = false, handlerId = Math.random().toString(36).substr(2, 9) } = options;
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const statusUpdateTimeRef = useRef(Date.now());
  const handlerRegisteredRef = useRef(false);
  const failedAttemptsRef = useRef(0);

  // Initialize WebSocket connection
  useEffect(() => {
    if (disabled) return;

    debugLog(`MBA3210: useWebSocket hook initializing for ${messageType}, handler ${handlerId}`);
    let unregisterHandlers = [];
    
    const initialize = async () => {
      try {
        const token = await getStorage('userToken');
        if (!token) {
          debugLog('MBA3210: No token available for WebSocket connection');
          return;
        }
        
        // Initialize WebSocket connection
        websocketManager.init(token);
        
        // Register handlers
        if (messageType && !handlerRegisteredRef.current) {
          // Register for specific message type
          const unregister = websocketManager.registerHandler(
            messageType, 
            callback, 
            `${handlerId}-${messageType}`
          );
          unregisterHandlers.push(unregister);
          handlerRegisteredRef.current = true;
          debugLog(`MBA3210: Registered handler for ${messageType}`);
        }
        
        // Always register for connection status updates
        const unregisterConn = websocketManager.registerHandler(
          'connection',
          (data) => {
            const prevStatus = connectionStatus;
            const prevConnected = isConnected;
            statusUpdateTimeRef.current = Date.now();
            
            if (data.status === 'connected') {
              debugLog('MBA3210: Setting connection status to connected');
              setIsConnected(true);
              setConnectionStatus('connected');
              failedAttemptsRef.current = 0; // Reset failed attempts counter
            } else {
              debugLog('MBA3210: Setting connection status to disconnected');
              setIsConnected(false);
              setConnectionStatus('disconnected');
            }
            
            debugLog(`MBA3210: Connection status changed in hook: ${prevStatus} -> ${data.status}`);
            debugLog(`MBA3210: isConnected changed in hook: ${prevConnected} -> ${data.status === 'connected'}`);
          },
          `${handlerId}-connection`
        );
        unregisterHandlers.push(unregisterConn);
        debugLog(`MBA3210: Registered connection status handler`);
        
        // Always register for user status updates (needed across components for online indicators)
        const unregisterUserStatus = websocketManager.registerHandler(
          'user_status_update',
          (data) => {
            // Call the callback if we're listening for user_status_update messages,
            // or if the callback is meant to handle all message types
            if (messageType === 'user_status_update' || messageType === '*') {
              callback(data);
            }
            
            debugLog(`MBA3210: Received user status update for user ${data.user_id}: ${data.is_online ? 'online' : 'offline'}`);
          },
          `${handlerId}-user_status_update`
        );
        unregisterHandlers.push(unregisterUserStatus);
        debugLog(`MBA3210: Registered user status update handler`);
        
        // Check initial socket state
        if (websocketManager.isConnected) {
          debugLog('MBA3210: WebSocket manager reports connected on init, updating state');
          setIsConnected(true);
          setConnectionStatus('connected');
        }
        
      } catch (error) {
        debugLog(`MBA3210: Error initializing WebSocket in hook: ${error.message}`);
      }
    };
    
    initialize();
    
    // Check connection every second for the first 5 seconds
    const initialConnectionCheck = setInterval(() => {
      if (websocketManager.isConnected) {
        debugLog('MBA3210: Initial connection check: WebSocket is connected');
        setIsConnected(true);
        setConnectionStatus('connected');
        clearInterval(initialConnectionCheck);
      } else {
        debugLog('MBA3210: Initial connection check: WebSocket not connected yet');
      }
    }, 1000);
    
    // Clear the interval after 5 seconds if it hasn't been cleared already
    const initialCheckTimeout = setTimeout(() => {
      clearInterval(initialConnectionCheck);
    }, 5000);
    
    // Cleanup handlers on unmount
    return () => {
      debugLog(`MBA3210: useWebSocket hook cleaning up for ${messageType}, handler ${handlerId}`);
      unregisterHandlers.forEach(unregister => unregister());
      clearInterval(initialConnectionCheck);
      clearTimeout(initialCheckTimeout);
      
      handlerRegisteredRef.current = false;
      
      // We no longer disconnect WebSocket on unmount
      // This allows the connection to persist when navigating between screens
    };
  }, [disabled, messageType, callback, handlerId]);
  
  // Add periodic check for connection status
  useEffect(() => {
    if (disabled) return;
    
    const checkStatus = setInterval(() => {
      const now = Date.now();
      const lastUpdate = statusUpdateTimeRef.current;
      const secondsSinceUpdate = (now - lastUpdate) / 1000;
      
      // If it's been more than 30 seconds since we got a status update, check connection manually
      if (secondsSinceUpdate > 30) {
        debugLog(`MBA3210: [MY CONNECTION] No updates on MY OWN connection in ${secondsSinceUpdate.toFixed(0)} seconds, verifying status`);
        
        // Check actual connection state from the WebSocket manager
        const actuallyConnected = websocketManager.isConnected;
        
        if (actuallyConnected !== isConnected) {
          debugLog(`MBA3210: [MY CONNECTION] State mismatch detected - WebSocket manager: ${actuallyConnected}, hook state: ${isConnected}`);
          
          // Update our state to match reality
          setIsConnected(actuallyConnected);
          setConnectionStatus(actuallyConnected ? 'connected' : 'disconnected');
        }
        
        // Try to send heartbeat if we think we're connected
        if (isConnected) {
          debugLog('MBA3210: [MY CONNECTION] Sending heartbeat to verify MY OWN connection');
          websocketManager.send('heartbeat');
        } else if (actuallyConnected) {
          // Try to send heartbeat even if our state says we're not connected
          // This helps ensure the backend knows we're still here
          debugLog('MBA3210: [MY CONNECTION] Sending heartbeat despite disconnected state in hook');
          websocketManager.send('heartbeat');
        }
        
        // Reset the timer
        statusUpdateTimeRef.current = now;
      }
    }, 15000); // Check every 15 seconds
    
    return () => clearInterval(checkStatus);
  }, [disabled, isConnected]);

  // Send a message through the WebSocket
  const sendMessage = useCallback((type, data) => {
    debugLog(`MBA3210: [MY CONNECTION] Attempting to send ${type} message through MY OWN WebSocket`);
    
    if (!isConnected) {
      debugLog('MBA3210: [MY CONNECTION] Cannot send message, MY OWN WebSocket not connected, falling back to REST');
      // Return a promise that resolves when the message is sent
      return (async () => {
        try {
          const token = await getStorage('userToken');
          if (!token) {
            debugLog('MBA3210: [MY CONNECTION] No token available for REST message send');
            return false;
          }
          
          // Handle different message types
          let endpoint = `${API_BASE_URL}/api/messages/v1/send_norm_message/`;
          let payload = {
            conversation_id: data.conversation_id,
            content: data.content
          };
          
          // Modify endpoint based on message type
          if (type === 'request_booking') {
            endpoint = `${API_BASE_URL}/api/messages/v1/send_request_booking/`;
            // Add any additional booking request data
            payload = {
              ...payload,
              ...data
            };
          }
          
          debugLog(`MBA3210: [MY CONNECTION] Sending message via REST API to ${endpoint} (fallback for failed WebSocket)`);
          const response = await axios.post(endpoint, payload, {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          
          // Try WebSocket reconnection after sending message
          setTimeout(() => {
            if (websocketManager.reconnect) {
              debugLog('MBA3210: [MY CONNECTION] Attempting reconnection after REST fallback');
              websocketManager.reconnect();
            }
          }, 1000);
          
          return response.data;
        } catch (error) {
          debugLog(`MBA3210: [MY CONNECTION] Error sending message via REST fallback: ${error.message}`);
          return false;
        }
      })();
    }
    
    return websocketManager.send(type, data);
  }, [isConnected]);

  // Mark messages as read
  const markMessagesAsRead = useCallback((conversationId, messageIds) => {
    // Skip if no conversation or message IDs
    if (!conversationId || !messageIds || messageIds.length === 0) {
      debugLog('MBA3210: [MY CONNECTION] Skipping markMessagesAsRead - missing data');
      return Promise.resolve(false);
    }
    
    debugLog(`MBA3210: [MY CONNECTION] Marking messages as read for conversation ${conversationId}`);
    
    if (!isConnected) {
      debugLog('MBA3210: [MY CONNECTION] Cannot mark messages as read through WebSocket, using REST API instead');
      
      // Return a promise that resolves when the messages are marked as read
      return (async () => {
        try {
          const token = await getStorage('userToken');
          if (!token) {
            debugLog('MBA3210: [MY CONNECTION] No token available for REST mark as read');
            return false;
          }
          
          debugLog(`MBA3210: [MY CONNECTION] Sending mark_read via REST API for ${messageIds.length} messages (fallback)`);
          const response = await axios.post(`${API_BASE_URL}/api/messages/v1/mark_read/`, {
            conversation_id: conversationId,
            message_ids: messageIds
          }, {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          
          return response.data;
        } catch (error) {
          debugLog(`MBA3210: [MY CONNECTION] Error marking messages as read via REST fallback: ${error.message}`);
          return false;
        }
      })();
    }
    
    return websocketManager.markMessagesAsRead(conversationId, messageIds);
  }, [isConnected]);

  // Force a reconnection attempt
  const reconnect = useCallback(() => {
    debugLog('MBA3210: [MY CONNECTION] Hook requesting reconnection of MY OWN WebSocket');
    
    try {
      // First reinitialize the connection
      if (websocketManager.disconnect) {
        debugLog('MBA3210: [MY CONNECTION] Disconnecting MY OWN existing WebSocket before reconnect');
        websocketManager.disconnect();
      }
      
      // Then attempt reconnection with a short delay
      setTimeout(() => {
        if (websocketManager.reconnect) {
          debugLog('MBA3210: [MY CONNECTION] Calling websocketManager.reconnect() for MY OWN connection');
          websocketManager.reconnect();
        } else if (websocketManager.connect) {
          debugLog('MBA3210: [MY CONNECTION] Calling websocketManager.connect() as fallback for MY OWN connection');
          websocketManager.connect();
        } else {
          // If neither method exists, reinitialize the connection
          debugLog('MBA3210: [MY CONNECTION] No reconnect method found, reinitializing MY OWN connection');
          getStorage('userToken').then(token => {
            if (token) {
              websocketManager.init(token);
            } else {
              debugLog('MBA3210: [MY CONNECTION] No token available for WebSocket reconnection');
            }
          }).catch(error => {
            debugLog(`MBA3210: [MY CONNECTION] Error getting token for reconnection: ${error.message}`);
          });
        }
      }, 300);  // Short delay to ensure disconnect completes
    } catch (error) {
      debugLog(`MBA3210: [MY CONNECTION] Error during reconnection of MY OWN connection: ${error.message}`);
    }
  }, []);

  // Explicitly disconnect the WebSocket
  const disconnect = useCallback(() => {
    if (disabled) return;
    
    debugLog(`MBA3210: useWebSocket hook explicitly disconnecting for ${messageType}, handler ${handlerId}`);
    websocketManager.disconnect();
    
    // Update local state
    setIsConnected(false);
    setConnectionStatus('disconnected');
    failedAttemptsRef.current = 0;
  }, [disabled, messageType, handlerId]);

  // Return WebSocket state and methods
  return {
    isConnected,
    connectionStatus,
    sendMessage,
    markMessagesAsRead, 
    reconnect: websocketManager.reconnect ? websocketManager.reconnect.bind(websocketManager) : null,
    disconnect,
    simulateConnection: websocketManager.connect ? websocketManager.connect.bind(websocketManager) : null,
    isUsingFallback: !isConnected
  };
};

export default useWebSocket; 