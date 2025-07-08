// WebSocket utilities - centralized, type-safe WebSocket logic
import { useEffect, useCallback, useState, useRef } from 'react';
import { Platform } from 'react-native';
import { getStorage, debugLog } from '../../context/AuthContext';
import type { WebSocketMessage } from './types';

interface WebSocketManager {
  isConnected: boolean;
  connect: (token: string) => void;
  disconnect: () => void;
  sendMessage: (message: any) => void;
  registerHandler: (type: string, callback: (data: any) => void, id: string) => () => void;
  unregisterHandler: (type: string, id: string) => void;
}

class WebSocketManagerImpl implements WebSocketManager {
  private socket: WebSocket | null = null;
  private handlers: Map<string, Map<string, (data: any) => void>> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private heartbeatInterval: any = null;
  public isConnected = false;

  connect(token: string): void {
    try {
      if (this.socket && (this.socket.readyState === WebSocket.CONNECTING || this.socket.readyState === WebSocket.OPEN)) {
        debugLog('WebSocketUtils: Already connected or connecting');
        return;
      }

      debugLog('WebSocketUtils: Connecting to WebSocket');
      
      // Platform-specific WebSocket URL construction
      let wsUrl: string;
      
      if (Platform.OS === 'web') {
        // Web platform
        const protocol = window?.location?.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window?.location?.host || 'localhost:8081';
        wsUrl = `${protocol}//${host}/ws/?token=${token}`;
      } else {
        // Mobile platforms - use development server
        wsUrl = `ws://10.0.0.169:8000/ws/?token=${token}`;
      }
      
      this.socket = new WebSocket(wsUrl);

      this.socket.onopen = () => {
        debugLog('WebSocketUtils: Connected to WebSocket');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.startHeartbeat();
      };

      this.socket.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (error) {
          debugLog('WebSocketUtils: Error parsing message:', error);
        }
      };

      this.socket.onclose = () => {
        debugLog('WebSocketUtils: WebSocket closed');
        this.isConnected = false;
        this.stopHeartbeat();
        this.attemptReconnect(token);
      };

      this.socket.onerror = (error) => {
        debugLog('WebSocketUtils: WebSocket error:', error);
        this.isConnected = false;
      };

    } catch (error) {
      debugLog('WebSocketUtils: Error connecting to WebSocket:', error);
    }
  }

  disconnect(): void {
    debugLog('WebSocketUtils: Disconnecting from WebSocket');
    this.isConnected = false;
    this.stopHeartbeat();
    
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    
    this.handlers.clear();
  }

  sendMessage(message: any): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message));
    } else {
      debugLog('WebSocketUtils: Cannot send message - WebSocket not connected');
    }
  }

  registerHandler(type: string, callback: (data: any) => void, id: string): () => void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Map());
    }
    
    this.handlers.get(type)!.set(id, callback);
    debugLog('WebSocketUtils: Registered handler', { type, id });
    
    // Return unregister function
    return () => this.unregisterHandler(type, id);
  }

  unregisterHandler(type: string, id: string): void {
    const typeHandlers = this.handlers.get(type);
    if (typeHandlers) {
      typeHandlers.delete(id);
      if (typeHandlers.size === 0) {
        this.handlers.delete(type);
      }
    }
    debugLog('WebSocketUtils: Unregistered handler', { type, id });
  }

  private handleMessage(message: WebSocketMessage): void {
    const { type, data } = message;
    const typeHandlers = this.handlers.get(type);
    
    if (typeHandlers) {
      typeHandlers.forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          debugLog('WebSocketUtils: Error in message handler:', error);
        }
      });
    }
  }

  private attemptReconnect(token: string): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
      
      debugLog('WebSocketUtils: Attempting reconnect', {
        attempt: this.reconnectAttempts,
        delay
      });
      
      setTimeout(() => {
        this.connect(token);
      }, delay);
    } else {
      debugLog('WebSocketUtils: Max reconnection attempts reached');
    }
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        this.sendMessage({ type: 'ping' });
      }
    }, 30000); // Send ping every 30 seconds
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }
}

// Singleton WebSocket manager
const websocketManager = new WebSocketManagerImpl();

/**
 * Custom hook for using WebSocket in React components
 */
export const useWebSocket = (options: {
  onMessage?: (type: string, data: any) => void;
  messageTypes?: string[];
  autoConnect?: boolean;
} = {}) => {
  const { onMessage, messageTypes = [], autoConnect = true } = options;
  const [isConnected, setIsConnected] = useState(websocketManager.isConnected);
  const handlerIdRef = useRef(Math.random().toString(36).substr(2, 9));
  const unregisterFunctionsRef = useRef<(() => void)[]>([]);

  // Initialize connection
  useEffect(() => {
    if (autoConnect) {
      const initConnection = async () => {
        try {
          const token = await getStorage('userToken');
          if (token) {
            websocketManager.connect(token);
          }
        } catch (error) {
          debugLog('useWebSocket: Error getting token:', error);
        }
      };
      
      initConnection();
    }

    return () => {
      // Clean up handlers on unmount
      unregisterFunctionsRef.current.forEach(unregister => unregister());
    };
  }, [autoConnect]);

  // Register message handlers
  useEffect(() => {
    if (onMessage) {
      const handlerId = handlerIdRef.current;
      
      if (messageTypes.length > 0) {
        // Register for specific message types
        messageTypes.forEach(type => {
          const unregister = websocketManager.registerHandler(
            type,
            (data) => onMessage(type, data),
            `${handlerId}-${type}`
          );
          unregisterFunctionsRef.current.push(unregister);
        });
      } else {
        // Register for all message types (if needed)
        const unregister = websocketManager.registerHandler(
          '*',
          (data) => onMessage('*', data),
          `${handlerId}-all`
        );
        unregisterFunctionsRef.current.push(unregister);
      }
    }
  }, [onMessage, messageTypes]);

  // Monitor connection status
  useEffect(() => {
    const checkConnection = () => {
      setIsConnected(websocketManager.isConnected);
    };

    const interval = setInterval(checkConnection, 1000);
    return () => clearInterval(interval);
  }, []);

  const sendMessage = useCallback((message: any) => {
    websocketManager.sendMessage(message);
  }, []);

  const registerHandler = useCallback((type: string, callback: (data: any) => void, id?: string) => {
    const handlerId = id || `${handlerIdRef.current}-${type}-${Date.now()}`;
    return websocketManager.registerHandler(type, callback, handlerId);
  }, []);

  const disconnect = useCallback(() => {
    websocketManager.disconnect();
  }, []);

  return {
    isConnected,
    sendMessage,
    registerHandler,
    disconnect
  };
};

export default websocketManager;