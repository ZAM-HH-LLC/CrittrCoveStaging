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
  const pollingIntervalRef = useRef(null);
  const isUsingPollingFallbackRef = useRef(false);

  // Function to check user online status through REST API as fallback
  const checkUserStatusViaREST = useCallback(async () => {
    try {
      debugLog('MBA3210: Checking user status via REST API fallback');
      const token = await getStorage('userToken');
      
      if (!token) {
        debugLog('MBA3210: No token available for REST status check');
        return;
      }
      
      const response = await axios.get(`${API_BASE_URL}/api/users/v1/online_status/`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.data && response.data.status === 'success') {
        debugLog('MBA3210: REST API reports user as online');
        
        // If we're in polling mode but weren't connected before, update status
        if (!isConnected) {
          setIsConnected(true);
          setConnectionStatus('connected');
          statusUpdateTimeRef.current = Date.now();
          debugLog('MBA3210: Setting connection status to connected via REST fallback');
        }
        
        // If there are new messages, process them
        if (response.data.new_messages && Array.isArray(response.data.new_messages)) {
          response.data.new_messages.forEach(message => {
            if (typeof callback === 'function') {
              callback(message);
            }
          });
        }
      } else {
        debugLog('MBA3210: REST API reports user as offline or error');
        
        // Only update if we thought we were connected
        if (isConnected) {
          setIsConnected(false);
          setConnectionStatus('disconnected');
          statusUpdateTimeRef.current = Date.now();
          debugLog('MBA3210: Setting connection status to disconnected via REST fallback');
        }
      }
    } catch (error) {
      debugLog(`MBA3210: Error checking status via REST: ${error.message}`);
    }
  }, [isConnected, callback]);

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
              
              // If we were using polling fallback, clear it
              if (isUsingPollingFallbackRef.current && pollingIntervalRef.current) {
                debugLog('MBA3210: WebSocket connected, clearing polling fallback');
                clearInterval(pollingIntervalRef.current);
                pollingIntervalRef.current = null;
                isUsingPollingFallbackRef.current = false;
              }
            } else {
              debugLog('MBA3210: Setting connection status to disconnected');
              setIsConnected(false);
              setConnectionStatus('disconnected');
              
              // Increment failed attempts if this was due to a connection problem
              if (data.code !== 1000) {
                failedAttemptsRef.current++;
                debugLog(`MBA3210: Connection failed, attempt #${failedAttemptsRef.current}`);
              }
              
              // If we've failed too many times, switch to polling fallback
              if (failedAttemptsRef.current >= 3 && !isUsingPollingFallbackRef.current) {
                debugLog('MBA3210: Too many failed attempts, switching to polling fallback');
                setupPollingFallback();
              }
            }
            
            debugLog(`MBA3210: Connection status changed in hook: ${prevStatus} -> ${data.status}`);
            debugLog(`MBA3210: isConnected changed in hook: ${prevConnected} -> ${data.status === 'connected'}`);
          },
          `${handlerId}-connection`
        );
        unregisterHandlers.push(unregisterConn);
        debugLog(`MBA3210: Registered connection status handler`);
        
        // Check initial socket state
        if (websocketManager.isConnected) {
          debugLog('MBA3210: WebSocket manager reports connected on init, updating state');
          setIsConnected(true);
          setConnectionStatus('connected');
        }
        
      } catch (error) {
        debugLog(`MBA3210: Error initializing WebSocket in hook: ${error.message}`);
        failedAttemptsRef.current++;
        
        // If we've failed too many times during initialization, switch to polling
        if (failedAttemptsRef.current >= 3 && !isUsingPollingFallbackRef.current) {
          debugLog('MBA3210: Too many initialization failures, switching to polling fallback');
          setupPollingFallback();
        }
      }
    };
    
    // Helper function to set up polling fallback
    const setupPollingFallback = () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
      
      isUsingPollingFallbackRef.current = true;
      debugLog('MBA3210: Setting up polling fallback for connection status');
      
      // Poll for status every 10 seconds
      pollingIntervalRef.current = setInterval(() => {
        checkUserStatusViaREST();
      }, 10000);
      
      // Immediately check status
      checkUserStatusViaREST();
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
      
      // If still not connected after 5 seconds, increment failed attempts
      if (!isConnected && failedAttemptsRef.current < 3) {
        failedAttemptsRef.current++;
        debugLog(`MBA3210: Initial connection failed, attempt #${failedAttemptsRef.current}`);
      }
      
      // Switch to polling fallback if we've failed multiple times
      if (failedAttemptsRef.current >= 3 && !isUsingPollingFallbackRef.current) {
        debugLog('MBA3210: Failed initial connection multiple times, switching to polling fallback');
        setupPollingFallback();
      }
    }, 5000);
    
    // Cleanup handlers on unmount
    return () => {
      debugLog(`MBA3210: useWebSocket hook cleaning up for ${messageType}, handler ${handlerId}`);
      unregisterHandlers.forEach(unregister => unregister());
      clearInterval(initialConnectionCheck);
      clearTimeout(initialCheckTimeout);
      
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      
      handlerRegisteredRef.current = false;
      isUsingPollingFallbackRef.current = false;
    };
  }, [disabled, messageType, callback, handlerId, checkUserStatusViaREST]);
  
  // Add periodic check for connection status
  useEffect(() => {
    if (disabled) return;
    
    const checkStatus = setInterval(() => {
      // Skip if we're using polling fallback
      if (isUsingPollingFallbackRef.current) {
        return;
      }
      
      const now = Date.now();
      const lastUpdate = statusUpdateTimeRef.current;
      const secondsSinceUpdate = (now - lastUpdate) / 1000;
      
      // If it's been more than 30 seconds since we got a status update, check connection manually
      if (secondsSinceUpdate > 30) {
        debugLog(`MBA3210: No connection updates in ${secondsSinceUpdate.toFixed(0)} seconds, verifying status`);
        
        // Check actual connection state from the WebSocket manager
        const actuallyConnected = websocketManager.isConnected;
        
        if (actuallyConnected !== isConnected) {
          debugLog(`MBA3210: Connection state mismatch detected - WebSocket manager: ${actuallyConnected}, hook state: ${isConnected}`);
          
          // Update our state to match reality
          setIsConnected(actuallyConnected);
          setConnectionStatus(actuallyConnected ? 'connected' : 'disconnected');
        }
        
        // Try to send heartbeat if we think we're connected
        if (isConnected) {
          debugLog('MBA3210: Sending heartbeat to verify connection');
          websocketManager.send('heartbeat');
        } else if (actuallyConnected) {
          // Try to send heartbeat even if our state says we're not connected
          // This helps ensure the backend knows we're still here
          debugLog('MBA3210: Sending heartbeat despite disconnected state in hook');
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
    debugLog(`MBA3210: Sending message of type ${type}`);
    
    // If we're using the polling fallback, send via REST API instead
    if (isUsingPollingFallbackRef.current) {
      debugLog('MBA3210: Using REST API to send message due to WebSocket fallback');
      
      // Return a promise that resolves when the message is sent
      return (async () => {
        try {
          const token = await getStorage('userToken');
          if (!token) {
            debugLog('MBA3210: No token available for REST message send');
            return false;
          }
          
          const response = await axios.post(`${API_BASE_URL}/api/messages/v1/send_norm_message/`, {
            conversation_id: data.conversation_id,
            content: data.content,
            type: 'normal_message'
          }, {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          
          return response.data && response.data.status === 'success';
        } catch (error) {
          debugLog(`MBA3210: Error sending message via REST: ${error.message}`);
          return false;
        }
      })();
    }
    
    return websocketManager.send(type, data);
  }, []);

  // Mark messages as read
  const markMessagesAsRead = useCallback((conversationId, messageIds) => {
    debugLog(`MBA3210: Marking messages as read for conversation ${conversationId}`);
    
    // If we're using the polling fallback, use REST API instead
    if (isUsingPollingFallbackRef.current) {
      debugLog('MBA3210: Using REST API to mark messages as read due to WebSocket fallback');
      
      // Return a promise that resolves when the messages are marked as read
      return (async () => {
        try {
          const token = await getStorage('userToken');
          if (!token) {
            debugLog('MBA3210: No token available for REST mark as read');
            return false;
          }
          
          const response = await axios.post(`${API_BASE_URL}/api/messages/v1/mark_read/`, {
            conversation_id: conversationId,
            message_ids: messageIds
          }, {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          
          return response.data && response.data.status === 'success';
        } catch (error) {
          debugLog(`MBA3210: Error marking messages as read via REST: ${error.message}`);
          return false;
        }
      })();
    }
    
    return websocketManager.markMessagesAsRead(conversationId, messageIds);
  }, []);

  // Force a reconnection attempt
  const reconnect = useCallback(() => {
    debugLog('MBA3210: Hook requesting WebSocket reconnection');
    
    // Reset the fallback state to try WebSocket again
    if (isUsingPollingFallbackRef.current) {
      debugLog('MBA3210: Resetting fallback state to try WebSocket again');
      
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      
      isUsingPollingFallbackRef.current = false;
      failedAttemptsRef.current = 0;
    }
    
    if (websocketManager.reconnect) {
      websocketManager.reconnect();
    } else {
      // Fallback if reconnect method doesn't exist
      websocketManager.connect();
    }
  }, []);

  // Simulate connection for testing/development when WebSockets are failing
  const simulateConnection = useCallback(() => {
    debugLog('MBA3210: Simulating WebSocket connection for testing');
    setIsConnected(true);
    setConnectionStatus('connected');
    statusUpdateTimeRef.current = Date.now();
  }, []);

  return {
    isConnected,
    connectionStatus,
    sendMessage,
    markMessagesAsRead,
    reconnect,
    simulateConnection,
    isUsingFallback: isUsingPollingFallbackRef.current
  };
};

export default useWebSocket; 