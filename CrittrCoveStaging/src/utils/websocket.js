import { API_BASE_URL } from '../config/config';
import { debugLog } from '../context/AuthContext';
import { Platform } from 'react-native';

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
    this._reconnectTimeout = null;
    this.forceDisconnect = false;
    this._hasVisibilityListener = false;
    debugLog('MBA4321: WebSocketManager initialized, wsUrl is ' + this.wsUrl);
  }

  /**
   * Initialize the WebSocket connection with authentication token
   * @param {string} token - JWT token for authentication
   */
  init(token) {
    if (!token) {
      debugLog('MBA4321: Cannot initialize WebSocket without a valid token');
      return;
    }
    
    // If we already have this token and connection, no need to reconnect
    if (this.token === token && this.isConnected && this.socket && this.socket.readyState === WebSocket.OPEN) {
      debugLog('MBA4321: WebSocket already connected with this token');
      return;
    }
    
    // If we already had a token and it's different, this is a re-login, so force disconnect
    if (this.token && this.token !== token) {
      debugLog('MBA4321: Token changed, force disconnecting before reconnecting');
      this.disconnect(true); // Force disconnect on token change
    }
    
    this.token = token;
    this.forceDisconnect = false; // Reset force disconnect flag
    
    // If we already have a socket but it's not working, close it first
    if (this.socket && (this.socket.readyState === WebSocket.CLOSING || this.socket.readyState === WebSocket.CLOSED)) {
      debugLog('MBA4321: Closing existing non-functional socket');
      this.disconnect(false); // Non-forced disconnect
    }
    
    // Connect with the token
    this.connect();
    
    // Set up disconnect timeout (10 minutes of inactivity)
    this.resetDisconnectTimeout();
    
    // Set up visibility change listener if in browser environment
    this.setupVisibilityListener();
  }

  /**
   * Set up visibility change listener to reconnect when tab becomes visible again
   */
  setupVisibilityListener() {
    // Only run in browser environment
    if (typeof document === 'undefined' || typeof window === 'undefined') {
      return;
    }
    
    // Skip if we've already set up the listener
    if (this._hasVisibilityListener) {
      return;
    }
    
    debugLog('MBA4321: Setting up visibility change listener');
    
    // Create the handler function
    const handleVisibilityChange = () => {
      if (Platform.OS === 'web' && document.visibilityState === 'visible') {
        debugLog('MBA4321: Document became visible, checking WebSocket connection');
        
        // Only reconnect if we have a token and weren't explicitly disconnected
        if (this.token && !this.forceDisconnect) {
          this.reconnectIfNeeded();
        }
      }
    };
    
    // Add the listener only for web
    if (Platform.OS === 'web') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
      this._hasVisibilityListener = true;
      
      // Set up cleanup on page unload if needed
      window.addEventListener('beforeunload', () => {
        // Note: we deliberately don't disconnect here, as this would prevent
        // browser session restoration from working properly
        debugLog('MBA4321: Page unloading, connection may persist for session restore');
      });
    }
  }

  /**
   * Connect to the WebSocket server
   */
  connect() {
    // Skip connection if token is null or empty
    if (!this.token) {
      debugLog('MBA4321: Cannot connect WebSocket without a valid token');
      return false;
    }
    
    // If already connected, no need to reconnect
    if (this.isConnected && this.socket && this.socket.readyState === WebSocket.OPEN) {
      debugLog('MBA4321: WebSocket already connected and open');
      return true;
    }
    
    // If socket exists but is in CONNECTING state, don't start another connection
    if (this.socket && this.socket.readyState === WebSocket.CONNECTING) {
      debugLog('MBA4321: WebSocket already connecting, skipping duplicate connect');
      return true;
    }
    
    // Clear any existing heartbeat
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    
    // If too many connection attempts, back off
    if (this.connectionAttempts >= this.maxConnectionAttempts) {
      debugLog(`MBA4321: Too many connection attempts (${this.connectionAttempts}), backing off`);
      setTimeout(() => {
        this.connectionAttempts = 0;
        this.connect();
      }, 60000);
      return false;
    }
    
    try {
      this.connectionAttempts++;
      
      const wsEndpoint = `${this.wsUrl}/ws/messages/?token=${this.token}`;
      debugLog(`MBA4321: [MY CONNECTION] Connecting WebSocket at ${wsEndpoint} (attempt ${this.connectionAttempts})`);
      
      this.socket = new WebSocket(wsEndpoint);
      debugLog('MBA4321: [MY CONNECTION] WebSocket instance created');
      
      // Setup event handlers
      this.socket.onopen = this.handleOpen.bind(this);
      this.socket.onclose = this.handleClose.bind(this);
      this.socket.onmessage = this.handleMessage.bind(this);
      this.socket.onerror = this.handleError.bind(this);
      
      return true;
    } catch (error) {
      debugLog(`MBA4321: [MY CONNECTION] WebSocket connection error: ${error.message}`);
      this.scheduleReconnect();
      return false;
    }
  }

  /**
   * Handle WebSocket connection open
   */
  handleOpen(event) {
    debugLog('MBA4321: [MY CONNECTION] WebSocket connection established');
    this.isConnected = true;
    this.connectionAttempts = 0; // Reset connection attempts on successful connection
    
    // Start sending heartbeats
    this.startHeartbeat();
    
    // Log connection status for debugging
    debugLog(`MBA4321: [MY CONNECTION] isConnected set to ${this.isConnected}, socket state: ${this.socket?.readyState}`);
    
    // Notify all handlers of connection
    this.notifyHandlers('connection', { 
      status: 'connected',
      timestamp: new Date().toISOString()
    });
    
    // Send immediate heartbeat to verify connection on both sides
    setTimeout(() => {
      if (this.isConnected) {
        debugLog('MBA4321: [MY CONNECTION] Sending initial heartbeat after connection');
        this.send('heartbeat');
      }
    }, 500);
  }

  /**
   * Handle WebSocket connection close
   */
  handleClose(event) {
    // Skip redundant close events
    if (!this.isConnected && !this.socket) {
      return;
    }

    const wasConnected = this.isConnected;
    this.isConnected = false;
    this.socket = null;
    
    debugLog(`MBA4321: [MY CONNECTION] WebSocket connection closed: code=${event.code}, reason=${event.reason}`);
    
    // Clear heartbeat
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    
    // Notify handlers of the disconnection, but only if we were previously connected
    if (wasConnected) {
      this.notifyHandlers('disconnection', {
        code: event.code,
        reason: event.reason,
        timestamp: new Date().toISOString()
      });
    }
    
    // Attempt to reconnect
    this.scheduleReconnect();
  }

  /**
   * Handle WebSocket messages
   */
  handleMessage(event) {
    try {
      const message = JSON.parse(event.data);
      debugLog(`MBA4321: [MY CONNECTION] WebSocket message received: ${message.type}`);
      
      // For detailed message logging, use debugLog instead of is_DEBUG check
      debugLog(`MBA4321: [MY CONNECTION] WebSocket message content: ${event.data}`);
      
      // For heartbeat responses, just log and return
      if (message.type === 'heartbeat_ack') {
        return;
      }
      
      // Notify handlers based on message type
      this.notifyHandlers(message.type, message.data || {});
      
      // Also notify global handlers
      this.notifyHandlers('all', { type: message.type, data: message.data || {} });
      
    } catch (error) {
      debugLog(`MBA4321: [MY CONNECTION] Error handling WebSocket message: ${error.message}`);
    }
  }

  /**
   * Handle WebSocket errors
   */
  handleError(error) {
    debugLog(`MBA4321: [MY CONNECTION] WebSocket error: ${error.message || 'Unknown error'}`);
    
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
      debugLog('MBA4321: [MY CONNECTION] Cannot send message, WebSocket not connected');
      return false;
    }

    try {
      const message = JSON.stringify({
        type,
        data,
        timestamp: Date.now()
      });
      
      this.socket.send(message);
      debugLog(`MBA4321: [MY CONNECTION] Sent ${type} message through connection`);
      return true;
    } catch (error) {
      debugLog(`MBA4321: [MY CONNECTION] Error sending message through connection: ${error.message}`);
      return false;
    }
  }

  /**
   * Schedule a reconnection attempt
   */
  scheduleReconnect() {
    // Skip if a reconnection is already scheduled
    if (this._reconnectTimeout) {
      debugLog('MBA4321: Reconnect already scheduled, skipping duplicate');
      return;
    }
    
    const delay = Math.min(1000 * Math.pow(2, this.connectionAttempts - 1), 30000);
    debugLog(`MBA4321: Scheduling reconnect in ${delay}ms (attempt ${this.connectionAttempts})`);
    
    this._reconnectTimeout = setTimeout(() => {
      this._reconnectTimeout = null;
      if (!this.isConnected) {
        this.connect();
      }
    }, delay);
  }

  /**
   * Start sending heartbeat messages
   */
  startHeartbeat() {
    // Clear any existing interval
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    // Start a new interval
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected) {
        this.send('heartbeat', { timestamp: Date.now() });
        debugLog('MBA4321: Heartbeat sent');
      } else {
        debugLog('MBA4321: Skipping heartbeat, not connected');
        clearInterval(this.heartbeatInterval);
        this.heartbeatInterval = null;
      }
    }, 30000); // 30 seconds

    debugLog('MBA4321: Heartbeat mechanism started');
  }

  /**
   * Disconnect the WebSocket
   * @param {boolean} force - Whether to force disconnect (true) or allow reconnect on visibility change (false)
   */
  disconnect(force = false) {
    debugLog(`MBA4321: [MY CONNECTION] Disconnecting WebSocket connection (force=${force})`);
    
    // Set the force disconnect flag if requested
    this.forceDisconnect = force;
    
    // If this is just a tab change and not a forced disconnect,
    // we'll preserve the token to allow reconnection
    const preserveToken = !force;
    const savedToken = preserveToken ? this.token : null;
    
    // Clear heartbeat interval
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    
    // Clear disconnect timeout
    if (this.disconnectTimeout) {
      clearTimeout(this.disconnectTimeout);
      this.disconnectTimeout = null;
    }
    
    // Close the socket if it exists
    if (this.socket) {
      try {
        // Remove all event handlers to prevent reconnection attempts from them
        this.socket.onopen = null;
        this.socket.onclose = null;
        this.socket.onmessage = null;
        this.socket.onerror = null;
        
        // Close the connection
        this.socket.close();
        this.socket = null;
        
        debugLog('MBA4321: [MY CONNECTION] WebSocket connection closed successfully');
      } catch (error) {
        debugLog(`MBA4321: [MY CONNECTION] Error closing WebSocket: ${error.message}`);
      }
    }
    
    // Reset connection state
    this.isConnected = false;
    
    // Restore token if this wasn't a forced disconnect (just a tab change)
    if (preserveToken && savedToken) {
      this.token = savedToken;
      debugLog('MBA4321: [MY CONNECTION] Preserved token for reconnection on tab visibility change');
    }
    
    // Notify handlers of the disconnection
    this.notifyHandlers('connection', { 
      status: 'disconnected',
      forced: force,
      timestamp: new Date().toISOString()
    });
    
    return true;
  }

  /**
   * Reset the disconnect timeout
   * This timeout will disconnect the WebSocket after 10 minutes of inactivity
   */
  resetDisconnectTimeout() {
    // Clear any existing timeout
    if (this.disconnectTimeout) {
      clearTimeout(this.disconnectTimeout);
    }
    
    // Set a new timeout
    this.disconnectTimeout = setTimeout(() => {
      debugLog('MBA4321: Disconnecting due to inactivity');
      this.disconnect();
    }, 600000); // 10 minutes
  }

  /**
   * Check if WebSocket is connected
   * @returns {boolean} Connection status
   */
  isWebSocketConnected() {
    return this.isConnected && this.socket && this.socket.readyState === WebSocket.OPEN;
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
    debugLog(`MBA4321: Registered handler ${handlerId} for ${messageType} messages`);
    
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
      debugLog(`MBA4321: Unregistered handler ${handlerId} for ${messageType} messages`);
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
          debugLog(`MBA4321: Error in ${messageType} handler ${id}: ${error.message}`);
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
          debugLog(`MBA4321: Error in global handler ${id}: ${error.message}`);
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

  /**
   * Check if WebSocket is connected and reconnect if needed
   * @returns {boolean} Whether a reconnection was attempted
   */
  reconnectIfNeeded() {
    debugLog('MBA4321: [MY CONNECTION] Checking if WebSocket reconnection needed');
    
    // If we don't have a token or were force disconnected, don't try to reconnect
    if (!this.token || this.forceDisconnect) {
      debugLog(`MBA4321: [MY CONNECTION] Cannot reconnect - ${!this.token ? 'no token' : 'force disconnected'}`);
      return false;
    }
    
    // Check if we need to reconnect
    const needsReconnect = (
      !this.isConnected || 
      !this.socket || 
      (this.socket && (
        this.socket.readyState === WebSocket.CLOSED || 
        this.socket.readyState === WebSocket.CLOSING
      ))
    );
    
    if (needsReconnect) {
      debugLog('MBA4321: [MY CONNECTION] WebSocket needs reconnection, attempting now');
      
      // Reset the force disconnect flag
      this.forceDisconnect = false;
      
      // Ensure old connection is properly closed
      if (this.socket) {
        try {
          this.socket.onclose = null; // Prevent recursive reconnection
          this.socket.close();
          this.socket = null;
        } catch (e) {
          debugLog(`MBA4321: [MY CONNECTION] Error closing existing socket: ${e.message}`);
        }
      }
      
      this.isConnected = false;
      
      // Reconnect
      setTimeout(() => {
        this.connect();
      }, 100);
      
      return true;
    }
    
    // If we're connected, send a heartbeat to verify connection
    if (this.isConnected && this.socket && this.socket.readyState === WebSocket.OPEN) {
      debugLog('MBA4321: [MY CONNECTION] WebSocket appears connected, sending heartbeat to verify');
      this.send('heartbeat');
      
      // Reset the disconnect timeout to prevent inactivity disconnection
      this.resetDisconnectTimeout();
    }
    
    return false;
  }
}

// Create a singleton instance
const websocketManager = new WebSocketManager();

// Export the singleton
export default websocketManager; 