import { API_BASE_URL } from '../config/config';
import { debugLog } from '../context/AuthContext';

/**
 * WebSocket manager for real-time messaging
 */
class WebSocketManager {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.token = null;
    this.connectionAttempts = 0;
    this.maxConnectionAttempts = 5;
    this.heartbeatInterval = null;
    this.disconnectTimeout = null;
    this.messageHandlers = new Map();
    this.connectionId = null;
    this.wsUrl = API_BASE_URL.replace('http://', 'ws://').replace('https://', 'wss://');
    debugLog('MBA3210: WebSocketManager initialized, wsUrl is ' + this.wsUrl);
  }

  /**
   * Initialize the WebSocket connection with the provided token
   * @param {string} token - JWT authentication token
   */
  init(token) {
    if (!token) {
      debugLog('MBA3210: [MY CONNECTION] Cannot initialize WebSocket without a token');
      return false;
    }

    // Save token for reconnection attempts
    this.token = token;
    debugLog('MBA3210: [MY CONNECTION] WebSocket token set, token exists: ' + (!!token));
    
    // Connect to WebSocket
    return this.connect();
  }

  /**
   * Connect to the WebSocket server
   */
  connect() {
    if (this.socket) {
      // Check if socket is in a closing or closed state before trying to reconnect
      if (this.socket.readyState === WebSocket.CLOSING || this.socket.readyState === WebSocket.CLOSED) {
        this.socket = null;
      } else if (this.isConnected && this.socket.readyState === WebSocket.OPEN) {
        debugLog('MBA3210: [MY CONNECTION] Already connected with open socket');
        return true;
      } else {
        // Socket exists but not properly connected, clean it up
        debugLog('MBA3210: [MY CONNECTION] Socket exists but not in OPEN state, recreating');
        this.socket.onclose = null; // Remove existing handlers to prevent reconnect loops
        this.socket.onerror = null;
        this.socket.onmessage = null;
        this.socket.onopen = null;
        this.socket.close();
        this.socket = null;
      }
    }
    
    // If we're still connected, disconnect first
    if (this.isConnected) {
      this.isConnected = false;
      debugLog('MBA3210: [MY CONNECTION] Resetting isConnected flag before new connection');
    }
    
    try {
      this.connectionAttempts++;
      
      const wsEndpoint = `${this.wsUrl}/ws/messages/?token=${this.token}`;
      debugLog(`MBA3210: [MY CONNECTION] Connecting MY OWN WebSocket at ${wsEndpoint} (attempt ${this.connectionAttempts})`);
      
      this.socket = new WebSocket(wsEndpoint);
      debugLog('MBA3210: [MY CONNECTION] WebSocket instance created');
      
      // Setup event handlers
      this.socket.onopen = this.handleOpen.bind(this);
      this.socket.onclose = this.handleClose.bind(this);
      this.socket.onmessage = this.handleMessage.bind(this);
      this.socket.onerror = this.handleError.bind(this);
      
      return true;
    } catch (error) {
      debugLog(`MBA3210: [MY CONNECTION] WebSocket connection error: ${error.message}`);
      this.scheduleReconnect();
      return false;
    }
  }

  /**
   * Handle WebSocket connection open
   */
  handleOpen(event) {
    debugLog('MBA3210: [MY CONNECTION] MY OWN WebSocket connection established');
    this.isConnected = true;
    this.connectionAttempts = 0; // Reset connection attempts on successful connection
    
    // Start sending heartbeats
    this.startHeartbeat();
    
    // Log connection status for debugging
    debugLog(`MBA3210: [MY CONNECTION] MY OWN isConnected set to ${this.isConnected}, socket state: ${this.socket?.readyState}`);
    
    // Notify all handlers of connection
    this.notifyHandlers('connection', { 
      status: 'connected',
      timestamp: new Date().toISOString()
    });
    
    // Send immediate heartbeat to verify connection on both sides
    setTimeout(() => {
      if (this.isConnected) {
        debugLog('MBA3210: [MY CONNECTION] Sending initial heartbeat after MY OWN connection');
        this.send('heartbeat');
      }
    }, 500);
  }

  /**
   * Handle WebSocket connection close
   */
  handleClose(event) {
    debugLog(`MBA3210: [MY CONNECTION] MY OWN WebSocket closed with code ${event.code}, reason: ${event.reason || 'No reason provided'}`);
    
    // Only change state if we were previously connected or if this is an unexpected closure
    if (this.isConnected || event.code !== 1000) {
      this.isConnected = false;
      
      // Log disconnection for debugging
      debugLog(`MBA3210: [MY CONNECTION] MY OWN isConnected set to ${this.isConnected}, socket state: ${this.socket?.readyState}`);
      
      // Notify all handlers of disconnection
      this.notifyHandlers('connection', { 
        status: 'disconnected',
        code: event.code,
        reason: event.reason || 'Connection closed',
        timestamp: new Date().toISOString()
      });
    }
    
    this.clearTimers();
    
    // Try to reconnect for any unexpected closures
    if (event.code !== 1000) {
      // For code 1006 (abnormal closure), reconnect immediately
      if (event.code === 1006) {
        debugLog('MBA3210: [MY CONNECTION] Abnormal closure (1006) detected, reconnecting MY OWN connection immediately');
        // Small timeout to prevent rapid reconnection attempts
        setTimeout(() => this.connect(), 1000);
      } else {
        this.scheduleReconnect();
      }
    }
  }

  /**
   * Handle WebSocket messages
   */
  handleMessage(event) {
    try {
      const message = JSON.parse(event.data);
      debugLog(`MBA3210: [MY CONNECTION] WebSocket message received: ${message.type}`);
      
      // For detailed message logging, use debugLog instead of is_DEBUG check
      debugLog(`MBA3210: [MY CONNECTION] WebSocket message content: ${event.data}`);
      
      // For heartbeat responses, just log and return
      if (message.type === 'heartbeat_ack') {
        return;
      }
      
      // Notify handlers based on message type
      this.notifyHandlers(message.type, message.data || {});
      
      // Also notify global handlers
      this.notifyHandlers('all', { type: message.type, data: message.data || {} });
      
    } catch (error) {
      debugLog(`MBA3210: [MY CONNECTION] Error handling WebSocket message: ${error.message}`);
    }
  }

  /**
   * Handle WebSocket errors
   */
  handleError(error) {
    debugLog(`MBA3210: [MY CONNECTION] MY OWN WebSocket error: ${error.message || 'Unknown error'}`);
    
    // Notify handlers of the error
    this.notifyHandlers('error', { 
      error: error.message || 'Unknown error',
      timestamp: new Date().toISOString()
    });
    
    // Try to reconnect on error
    this.scheduleReconnect();
  }

  /**
   * Send a message through the WebSocket
   */
  send(type, data = {}) {
    if (!this.isConnected || !this.socket) {
      debugLog('MBA3210: [MY CONNECTION] Cannot send message, MY OWN WebSocket not connected');
      return false;
    }

    try {
      const message = JSON.stringify({
        type,
        data
      });
      
      this.socket.send(message);
      debugLog(`MBA3210: [MY CONNECTION] Sent ${type} message through MY OWN connection`);
      return true;
    } catch (error) {
      debugLog(`MBA3210: [MY CONNECTION] Error sending message through MY OWN connection: ${error.message}`);
      return false;
    }
  }

  /**
   * Start sending heartbeat messages to keep the connection alive
   */
  startHeartbeat() {
    // Clear any existing heartbeat
    this.clearTimers();
    
    // Send heartbeat every 15 seconds (reduced from 30)
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected && this.socket && this.socket.readyState === WebSocket.OPEN) {
        debugLog('MBA3210: [MY CONNECTION] Sending heartbeat to maintain MY OWN WebSocket connection');
        this.send('heartbeat');
      } else if (this.isConnected) {
        debugLog('MBA3210: [MY CONNECTION] Skipping heartbeat - MY OWN socket not OPEN');
        // If we think we're connected but socket isn't open, fix the mismatch
        if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
          this.isConnected = false;
          this.notifyHandlers('connection', { 
            status: 'disconnected',
            code: 'internal',
            reason: 'Socket not in OPEN state but isConnected is true',
            timestamp: new Date().toISOString()
          });
          // Force reconnect
          this.reconnect();
        }
      } else {
        debugLog('MBA3210: [MY CONNECTION] Skipping heartbeat - MY OWN connection not connected');
      }
    }, 15000);
    
    // Add a connection verification interval that runs more frequently (every 3 seconds)
    this.connectionVerification = setInterval(() => {
      if (this.socket) {
        const socketState = this.socket.readyState;
        const stateNames = ['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED'];
        debugLog(`MBA3210: [MY CONNECTION] Verifying MY OWN connection - isConnected: ${this.isConnected}, socketState: ${stateNames[socketState]}`);
        
        if (this.isConnected && socketState === WebSocket.OPEN) {
          // All good
        } else if (this.isConnected && socketState !== WebSocket.OPEN) {
          // Mismatch - we think we're connected but socket isn't open
          debugLog('MBA3210: [MY CONNECTION] State mismatch detected - MY OWN socket not OPEN');
          this.isConnected = false;
          this.notifyHandlers('connection', { 
            status: 'disconnected',
            code: 'internal',
            reason: 'Socket state mismatch',
            timestamp: new Date().toISOString()
          });
          this.reconnect();
        } else if (!this.isConnected && socketState === WebSocket.OPEN) {
          // Mismatch - socket is open but we don't think we're connected
          debugLog('MBA3210: [MY CONNECTION] State mismatch detected - MY OWN socket OPEN but isConnected false');
          this.isConnected = true;
          this.notifyHandlers('connection', { 
            status: 'connected',
            timestamp: new Date().toISOString()
          });
        }
      } else if (this.isConnected) {
        // Mismatch - we think we're connected but socket doesn't exist
        debugLog('MBA3210: [MY CONNECTION] State mismatch - no socket but MY OWN isConnected is true');
        this.isConnected = false;
        this.notifyHandlers('connection', { 
          status: 'disconnected',
          code: 'internal',
          reason: 'Socket does not exist',
          timestamp: new Date().toISOString()
        });
        this.reconnect();
      }
    }, 3000);
  }
  
  /**
   * Force an immediate reconnection attempt
   */
  reconnect() {
    debugLog('MBA3210: [MY CONNECTION] Forcing reconnection of MY OWN WebSocket');
    
    // Clean up existing socket if any
    if (this.socket) {
      this.socket.onclose = null;
      this.socket.onerror = null;
      this.socket.onmessage = null;
      this.socket.onopen = null;
      try {
        this.socket.close();
      } catch (e) {
        debugLog(`MBA3210: [MY CONNECTION] Error closing MY OWN socket during reconnect: ${e.message}`);
      }
      this.socket = null;
    }
    
    // Clear timers
    this.clearTimers();
    
    // Small delay before reconnecting
    setTimeout(() => {
      this.connect();
    }, 500);
  }

  /**
   * Schedule a reconnection attempt
   */
  scheduleReconnect() {
    // Clear any existing reconnect timer
    if (this.disconnectTimeout) {
      clearTimeout(this.disconnectTimeout);
    }
    
    // Check if max attempts reached
    if (this.connectionAttempts >= this.maxConnectionAttempts) {
      debugLog('MBA3210: Maximum reconnection attempts reached');
      this.notifyHandlers('connection', { 
        status: 'failed',
        reason: 'Max reconnection attempts reached',
        timestamp: new Date().toISOString()
      });
      return;
    }
    
    // Calculate backoff delay (exponential backoff)
    const delay = Math.min(1000 * Math.pow(2, this.connectionAttempts - 1), 30000);
    
    debugLog(`MBA3210: Scheduling reconnect in ${delay}ms (attempt ${this.connectionAttempts})`);
    
    this.disconnectTimeout = setTimeout(() => {
      this.connect();
    }, delay);
  }

  /**
   * Clear all timers
   */
  clearTimers() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    
    if (this.disconnectTimeout) {
      clearTimeout(this.disconnectTimeout);
      this.disconnectTimeout = null;
    }
    
    if (this.connectionVerification) {
      clearInterval(this.connectionVerification);
      this.connectionVerification = null;
    }
  }

  /**
   * Close the WebSocket connection
   */
  disconnect() {
    debugLog('MBA3210: Disconnecting WebSocket');
    this.clearTimers();
    
    if (this.socket) {
      this.socket.close(1000, 'User disconnected');
      this.socket = null;
    }
    
    this.isConnected = false;
  }

  /**
   * Register a handler for specific message types
   * @param {string} messageType - Type of message to handle
   * @param {function} handler - Handler function
   * @param {string} handlerId - Unique identifier for this handler
   */
  registerHandler(messageType, handler, handlerId) {
    if (!this.messageHandlers.has(messageType)) {
      this.messageHandlers.set(messageType, new Map());
    }
    
    this.messageHandlers.get(messageType).set(handlerId, handler);
    debugLog(`MBA3210: Registered handler ${handlerId} for ${messageType} messages`);
    
    return () => this.unregisterHandler(messageType, handlerId);
  }

  /**
   * Unregister a handler
   * @param {string} messageType - Type of message
   * @param {string} handlerId - Handler ID to remove
   */
  unregisterHandler(messageType, handlerId) {
    if (this.messageHandlers.has(messageType)) {
      this.messageHandlers.get(messageType).delete(handlerId);
      debugLog(`MBA3210: Unregistered handler ${handlerId} for ${messageType} messages`);
    }
  }

  /**
   * Notify all registered handlers for a specific message type
   * @param {string} messageType - Type of message
   * @param {object} data - Message data
   */
  notifyHandlers(messageType, data) {
    if (this.messageHandlers.has(messageType)) {
      const handlers = this.messageHandlers.get(messageType);
      
      handlers.forEach((handler, id) => {
        try {
          handler(data);
        } catch (error) {
          debugLog(`MBA3210: Error in ${messageType} handler ${id}: ${error.message}`);
        }
      });
    }
    
    // Also notify global handlers (if any)
    if (messageType !== 'all' && this.messageHandlers.has('all')) {
      const globalHandlers = this.messageHandlers.get('all');
      
      globalHandlers.forEach((handler, id) => {
        try {
          handler({ type: messageType, data });
        } catch (error) {
          debugLog(`MBA3210: Error in global handler ${id}: ${error.message}`);
        }
      });
    }
  }

  /**
   * Mark messages as read
   * @param {number} conversationId - Conversation ID
   * @param {Array} messageIds - Array of message IDs to mark as read
   */
  markMessagesAsRead(conversationId, messageIds) {
    if (!Array.isArray(messageIds) || messageIds.length === 0) {
      return false;
    }
    
    return this.send('mark_read', {
      conversation_id: conversationId,
      message_ids: messageIds
    });
  }
}

// Create a singleton instance
const websocketManager = new WebSocketManager();

export default websocketManager; 