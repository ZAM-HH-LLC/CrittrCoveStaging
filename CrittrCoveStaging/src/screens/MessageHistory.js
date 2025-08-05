import React, { useState, useCallback, useRef, useEffect, useContext, useMemo, useLayoutEffect } from 'react';
import { View, StyleSheet, Platform, SafeAreaView, StatusBar, Text, TouchableOpacity, Dimensions, Alert, ActivityIndicator, Image, TextInput, BackHandler, KeyboardAvoidingView } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useTheme, Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../styles/theme';
import { AuthContext, getStorage, setStorage, debugLog } from '../context/AuthContext';
import RequestBookingModal from '../components/RequestBookingModal';
import BookingStepModal from '../components/BookingStepModal';
import { CURRENT_USER_ID } from '../data/mockData';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { API_BASE_URL } from '../config/config';
import axios from 'axios';
import BookingMessageCard from '../components/BookingMessageCard';
import { formatOccurrenceFromUTC } from '../utils/time_utils';
import DraftConfirmationModal from '../components/DraftConfirmationModal';
import useWebSocket from '../hooks/useWebSocket';
import MessageNotificationContext from '../context/MessageNotificationContext';
import { getConversationMessages, createDraftFromBooking, getConversations, sendDebugLog } from '../api/API';
import { navigateToFrom } from '../components/Navigation';
import { applyViewportFix } from '../utils/viewport-fix';
import ImageViewer from '../components/Messages/ImageViewer';
import { useImageViewer } from '../components/Messages/useImageViewer';
import ClickableImage from '../components/Messages/ClickableImage';

// Import our new components
import MessageList from '../components/Messages/MessageList';
import ConversationList from '../components/Messages/ConversationList';
import MessageInput from '../components/Messages/MessageInput';
import MessageHeader from '../components/Messages/MessageHeader';
import { useMessageLogic } from '../components/Messages/useMessageLogic';
import { createMessageStyles } from '../components/Messages/styles';
import ClientPetsModal from '../components/ClientPetsModal';
import { formatMessageTime, shouldShowTimestamp } from '../components/Messages/messageTimeUtils';
import MessageTimestamp from '../components/Messages/MessageTimestamp';
import ReviewRequestCard from '../components/ReviewRequestCard';

const MessageHistory = ({ navigation, route }) => {
  // IMPORTANT: React hooks rules require that hooks are called in the same order
  // on every render. Never put hooks inside conditional blocks or early returns.
  // Always declare all hooks at the top level of the component.
  
  const { colors } = useTheme();
  const { screenWidth, isCollapsed, isSignedIn, loading } = useContext(AuthContext);
  const styles = createMessageStyles(screenWidth, isCollapsed);
  
  // Helper function to safely get initial width
  const getInitialWidth = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      return window.innerWidth;
    }
    return screenWidth; // Fall back to context screenWidth
  };
  
  // Add loading states
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [selectedConversationData, setSelectedConversationData] = useState(null);
  
  // Add image viewer state
  const { 
    isImageViewerVisible, 
    selectedImageUrl, 
    handleImagePress, 
    closeImageViewer 
  } = useImageViewer();
  
  // Move these state declarations before the useEffect that uses them
  const [messages, setMessages] = useState([]);
  const [isSending, setIsSending] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const { is_DEBUG, is_prototype, userRole, timeSettings } = useContext(AuthContext);
  const [conversations, setConversations] = useState([]);
  const [filteredConversations, setFilteredConversations] = useState([]);
  
  // Track whether we're intentionally deselecting
  const isIntentionallyDeselecting = useRef(false);
  
  // Add state for keyboard visibility
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  
  // All other state declarations
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const prevScreenWidthRef = useRef(screenWidth);
  const hasLoadedInitialDataRef = useRef(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const initialLoadRef = useRef(true);
  const [showBookingStepModal, setShowBookingStepModal] = useState(false);
  const [currentBookingId, setCurrentBookingId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [hasDraft, setHasDraft] = useState(false);
  const [draftData, setDraftData] = useState(null);
  const [showDraftConfirmModal, setShowDraftConfirmModal] = useState(false);
  const [wsConnectionStatus, setWsConnectionStatus] = useState('disconnected');
  const { resetNotifications, updateRoute, markConversationAsRead, getConversationUnreadCount } = useContext(MessageNotificationContext);
  const [showClientPetsModal, setShowClientPetsModal] = useState(false);

  // Add a ref to track if we're handling route params
  const isHandlingRouteParamsRef = useRef(false);

  // Add a ref to track if messages have been fetched for the current conversation
  const hasLoadedMessagesRef = useRef(false);

  // Add a ref to track if we need to open booking creation
  const shouldOpenBookingCreationRef = useRef(false);
  
  // Add a ref for the markMessagesAsRead function that will come from the useWebSocket hook
  const markMessagesAsReadRef = useRef(null);

  // Add a ref to track the last viewed conversation to avoid redundant API calls
  const lastViewedConversationRef = useRef(null);

  // Add these refs at the top level of the component, near other ref declarations
  const isLoadingMoreRef = useRef(false);
  const processedPagesRef = useRef(new Set());
  const messageIdsRef = useRef(new Set());

  // Add viewport height detection for mobile browsers - using ref instead of state
  
  // No viewport fix needed, we're using pure flexbox

  // Add a ref to track if conversations fetch is already in progress
  const isFetchingConversationsRef = useRef(false);

  // Add a ref to track if messages fetch is already in progress for specific conversations
  const isFetchingMessagesRef = useRef(new Set());
  
  // Ref to store the keyboard dismissal handler from MessageInput
  const keyboardDismissHandlerRef = useRef(null);

  // Add re-render tracking - MOVED HERE after all state declarations
  const renderCountRef = useRef(0);
  renderCountRef.current++;
  
  debugLog('MBA9876: [COMPONENT] MessageHistory render #' + renderCountRef.current, {
    timestamp: Date.now(),
    selectedConversation,
    isSignedIn,
    loading,
    screenWidth,
    routeParams: route.params
  });


  // Simple cleanup on sign out
  useEffect(() => {
    if (!isSignedIn) {
      debugLog('MBA9999: User signed out, resetting MessageHistory state');
      setConversations([]);
      setMessages([]);
      setSelectedConversation(null);
      setSelectedConversationData(null);
      setHasDraft(false);
      setDraftData(null);
      hasLoadedMessagesRef.current = false;
      lastViewedConversationRef.current = null;
      processedPagesRef.current.clear();
      messageIdsRef.current.clear();
      initialLoadRef.current = true;
      setIsInitialLoad(true);
      
      // Clear fetch tracking refs
      isFetchingConversationsRef.current = false;
      isFetchingMessagesRef.current.clear();
    }
  }, [isSignedIn]);
  
  // Handle role changes by refreshing conversations and clearing selection
  useEffect(() => {
    if (isSignedIn) {
      debugLog('MBA9999: User role changed, refreshing conversations', { userRole });
      
      // Clear the current selection
      setSelectedConversation(null);
      setSelectedConversationData(null);
      setMessages([]);
      hasLoadedMessagesRef.current = false;
      lastViewedConversationRef.current = null;
      
      debugLog('MBA24u45vn: Refetching conversations for the new role');
      // Refetch conversations for the new role
      fetchConversations();
    }
  }, [userRole, isSignedIn]);


  // Outside the renderMessage callback, add a function to group messages by booking ID
  const groupMessagesByBookingId = (messages) => {
    const bookingMessages = {};
    
    // First pass: collect messages by booking ID
    messages.forEach(message => {
      if (message.metadata && message.metadata.booking_id) {
        const bookingId = message.metadata.booking_id;
        if (!bookingMessages[bookingId]) {
          bookingMessages[bookingId] = [];
        }
        bookingMessages[bookingId].push({
          messageId: message.message_id,
          type: message.type_of_message,
          timestamp: new Date(message.created_at || message.timestamp),
          message: message
        });
      }
    });
    
    // Second pass: sort messages by timestamp (newest first)
    Object.keys(bookingMessages).forEach(bookingId => {
      bookingMessages[bookingId].sort((a, b) => b.timestamp - a.timestamp);
    });
    
    return bookingMessages;
  };

  // WebSocket message handler defined as a memoized callback
  const handleWebSocketMessage = useCallback((data) => {
    debugLog('MBA9876: WebSocket message received:', {
      type: data.type,
      conversationId: data.conversation_id,
      messageId: data.message_id,
      selectedConversation,
      currentMessageCount: messages.length
    });
    
    try {
      // Validate message data
      if (!data || (!data.message_id && !data.conversation_id && !data.type)) {
        debugLog('MBA2349f87g9qbh2nfv9cg: Invalid message data received');
        return;
      }
      
      // Handle user status updates
      if (data.type === 'user_status_update' && data.user_id) {
        debugLog('MBA2349f87g9qbh2nfv9cg: [OTHER USER STATUS] Received online status update for user ID:', data.user_id);
        
        // Normalize the user_id to string for comparison
        const statusUserId = String(data.user_id);
        const isOnline = !!data.is_online;
        
        debugLog(`MBA2349f87g9qbh2nfv9cg: [OTHER USER STATUS] Processing status change for user ${statusUserId}, online=${isOnline}`);
        
        // Update the conversations list with the new online status
        setConversations(prevConversations => {
          // Log the current conversations for debugging
          debugLog(`MBA2349f87g9qbh2nfv9cg: [OTHER USER STATUS] Checking ${prevConversations.length} conversations for user ${statusUserId}`);
          
          // Apply the update
          const updatedConversations = prevConversations.map(conv => {
            // Normalize participant IDs to strings for comparison
            const participant1Id = conv.participant1_id ? String(conv.participant1_id) : '';
            const participant2Id = conv.participant2_id ? String(conv.participant2_id) : '';
            
            // Check if this conversation involves the user whose status changed
            const matchesUser = (statusUserId === participant1Id || statusUserId === participant2Id);
            
            if (matchesUser) {
              debugLog(`MBA2349f87g9qbh2nfv9cg: [OTHER USER STATUS] Found match in conversation ${conv.conversation_id}, setting other_participant_online=${isOnline}`);
              
              // Update this conversation with the new online status
              return {
                ...conv,
                other_participant_online: isOnline
              };
            }
            return conv;
          });
          
          // Check if any conversations were updated
          const updatedCount = updatedConversations.filter(
            (conv, i) => conv.other_participant_online !== prevConversations[i].other_participant_online
          ).length;
          
          debugLog(`MBA2349f87g9qbh2nfv9cg: [OTHER USER STATUS] Updated ${updatedCount} conversations with new status for user ${statusUserId}`);
          
          return updatedConversations;
        });
        
        // Also update the selected conversation if it's affected
        if (selectedConversationData) {
          // Normalize participant IDs to strings
          const selectedParticipant1Id = selectedConversationData.participant1_id 
            ? String(selectedConversationData.participant1_id) 
            : '';
          const selectedParticipant2Id = selectedConversationData.participant2_id 
            ? String(selectedConversationData.participant2_id) 
            : '';
          
          // Check if selected conversation involves this user
          if (statusUserId === selectedParticipant1Id || statusUserId === selectedParticipant2Id) {
            debugLog(`MBA2349f87g9qbh2nfv9cg: [OTHER USER STATUS] Updating selected conversation with online status: ${isOnline} for user ${statusUserId}`);
            
            setSelectedConversationData(prev => ({
              ...prev,
              other_participant_online: isOnline
            }));
          }
        }
        
        return;
      }
      
      // If this message is for our current conversation
      if (selectedConversation && data.conversation_id && 
          String(data.conversation_id) === String(selectedConversation)) {
        
        debugLog('MBA2349f87g9qbh2nfv9cg: Message is for current conversation, adding to list');
        
        // Add the new message to the list (at the beginning since FlatList is inverted)
        setMessages(prevMessages => {
          debugLog('MBA2349f87g9qbh2nfv9cg: Before adding WebSocket message:', {
            currentMessageCount: prevMessages.length,
            newMessageId: data.message_id,
            newMessageContent: data.content?.substring(0, 50)
          });
          
          // Check if message already exists to avoid duplicates - be more thorough
          const messageExists = prevMessages.some(msg => {
            // Check by ID if available (most reliable)
            if (msg.message_id && data.message_id && 
                String(msg.message_id) === String(data.message_id)) {
              debugLog('MBA2349f87g9qbh2nfv9cg: Duplicate detected by ID');
              return true;
            }
            
            // Also check for messages with the same content, timestamp and sender
            // to catch duplicates that might have different/temporary IDs
            if (msg.content === data.content && 
                msg.sent_by_other_user === data.sent_by_other_user) {
              
              // If the timestamp exists, compare with some tolerance
              if (msg.timestamp && data.timestamp) {
                const timeDiff = Math.abs(
                  new Date(msg.timestamp).getTime() - 
                  new Date(data.timestamp).getTime()
                );
                
                // 5 seconds tolerance (messages sent close to each other)
                if (timeDiff < 5000) {
                  debugLog('MBA2349f87g9qbh2nfv9cg: Duplicate detected by content+timestamp');
                  return true;
                }
              } else {
                // If no timestamp, just assume it's the same message
                debugLog('MBA2349f87g9qbh2nfv9cg: Duplicate detected by content+sender');
                return true;
              }
            }
            
            // Check for optimistic messages that match
            if (msg._isOptimistic && 
                msg.content === data.content && 
                !data.sent_by_other_user) {
              debugLog('MBA2349f87g9qbh2nfv9cg: Found matching optimistic message, replacing');
              return true;
            }
            
            return false;
          });
          
          if (messageExists) {
            debugLog('MBA2349f87g9qbh2nfv9cg: Message already exists in the list, skipping');
            
            // For optimistic messages that now have a real ID, update them
            if (data.message_id) {
              const updatedMessages = prevMessages.map(msg => {
                if (msg._isOptimistic && 
                    msg.content === data.content && 
                    !data.sent_by_other_user) {
                  // Replace the optimistic message with the real one
                  return { ...data, _wasOptimistic: true };
                }
                return msg;
              });
              
              debugLog('MBA2349f87g9qbh2nfv9cg: Updated optimistic message with real data');
              return updatedMessages;
            }
            
            return prevMessages;
          }
          
          debugLog('MBA2349f87g9qbh2nfv9cg: Adding new message to list:', {
            messageId: data.message_id,
            messageLength: prevMessages.length,
            newMessageLength: prevMessages.length + 1
          });
          
          const updatedMessages = [data, ...prevMessages];
          
          debugLog('MBA2349f87g9qbh2nfv9cg: Messages array updated via WebSocket:', {
            oldLength: prevMessages.length,
            newLength: updatedMessages.length,
            addedMessageId: data.message_id
          });
          
          return updatedMessages;
        });
        
        // Mark the message as read if we're viewing this conversation
        if (data.message_id && markMessagesAsReadRef.current && data.sent_by_other_user) {
          debugLog('MBA2349f87g9qbh2nfv9cg: Marking message as read:', data.message_id);
          markMessagesAsReadRef.current(selectedConversation, [data.message_id]);
        }
      } else if (data.conversation_id) {
        // Update the conversation list for unread messages in other conversations
        debugLog('MBA2349f87g9qbh2nfv9cg: Message is for another conversation, updating conversation list');
        setConversations(prevConversations => 
          prevConversations.map(conv => 
            String(conv.conversation_id) === String(data.conversation_id)
              ? {
                  ...conv,
                  last_message: data.content,
                  last_message_time: data.timestamp,
                  unread: true
                }
              : conv
          )
        );
      }
    } catch (error) {
      debugLog('MBA2349f87g9qbh2nfv9cg: Error handling WebSocket message:', error);
    }
  }, [selectedConversation]);

  // Initialize WebSocket with the message handler
  const { isConnected, connectionStatus, markMessagesAsRead, reconnect, disconnect, simulateConnection, isUsingFallback } = useWebSocket(
    'message', 
    handleWebSocketMessage,
    { handlerId: 'message-history' }
  );
  
  // Update our ref when markMessagesAsRead changes
  useEffect(() => {
    markMessagesAsReadRef.current = markMessagesAsRead;
  }, [markMessagesAsRead]);
  

  // Add a function to manually force reconnection
  const handleForceReconnect = useCallback(() => {
    debugLog('MBA2349f87g9qbh2nfv9cg: [CONNECTION] User manually requested WebSocket reconnection');
    if (typeof reconnect === 'function') {
      reconnect();
    }
  }, [reconnect, selectedConversationData]);
  
  // Add a function to simulate connection for testing
  // const handleSimulateConnection = useCallback(() => {
  //   debugLog('MBA2349f87g9qbh2nfv9cg: User requested simulated connection');
  //   if (typeof simulateConnection === 'function') {
  //     simulateConnection();
  //   }
  // }, [simulateConnection]);
  
  // Update connection status UI and log more detailed information
  useEffect(() => {
    setWsConnectionStatus(connectionStatus);
    
    // Add more debug logs to check actual WebSocket readyState
    if (window && window.WebSocket) {
      debugLog(`MBA3456: [MY CONNECTION] WebSocket connection status changed to ${connectionStatus}`, {
        isConnected,
        isUsingFallback,
        userRole
      });
    }
    
    // Only log status changes but don't trigger fetches here - that's handled in the mount effect
    if ((connectionStatus === 'connected' && isConnected) || isUsingFallback) {
      debugLog('MBA3456: [MY CONNECTION] Connection fully verified as connected or using fallback', {
        userRole,
        selectedConversation: selectedConversation ? `ID: ${selectedConversation}` : 'none'
      });
    } else {
      debugLog('MBA3456: [MY CONNECTION] Connection not fully verified, status and state mismatch', {
        connectionStatus,
        isConnected,
        userRole
      });
    }
  }, [connectionStatus, isConnected, isUsingFallback, userRole]);
  
  // Force reconnection on component mount to ensure connection
  useEffect(() => {
    // Short delay to allow other initializations to complete
    const timer = setTimeout(() => {
      debugLog('MBA2349f87g9qbh2nfv9cg: [MY CONNECTION] Forcing reconnection on component mount');
      if (typeof reconnect === 'function') {
        reconnect();
      }
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [reconnect]);
  
    // Add a ref to track if initialization is in progress
  const isInitializingRef = useRef(false);
  
  // Add a ref to track the last window width to detect resize events
  const lastWindowWidthRef = useRef(typeof window !== 'undefined' ? window.innerWidth : 0);
  
  // Track the last execution time to avoid excessive initialization
  const lastInitTimeRef = useRef(0);
  
  // Keep track of the currently selected conversation to preserve during resizes
  const lastSelectedConversationRef = useRef(null);
  
  // Add a ref to track screen focus to detect returning to screen
  const isScreenFocusedRef = useRef(true);
  const lastFocusRefreshTimeRef = useRef(0);
  
  // Use useFocusEffect to detect when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      debugLog('MBA24u45vn: MessageHistory screen focused');
      isScreenFocusedRef.current = true;
      
      // If we're returning to the screen and have existing conversations, refresh them
      // Skip if this is initial load (initialLoadRef.current = true) or if we have no conversations yet
      // Also throttle to prevent excessive API calls
      const now = Date.now();
      const minTimeBetweenRefresh = 2000; // 2 seconds minimum between focus refreshes
      
      if (!initialLoadRef.current && 
          conversations.length > 0 && 
          isSignedIn && 
          (now - lastFocusRefreshTimeRef.current > minTimeBetweenRefresh)) {
        debugLog('MBA24u45vn: Returning to MessageHistory screen, refreshing conversations');
        lastFocusRefreshTimeRef.current = now;
        fetchConversations();
      } else {
        debugLog('MBA24u45vn: Screen focused but not refreshing conversations', {
          isInitialLoad: initialLoadRef.current,
          hasConversations: conversations.length > 0,
          conversationsCount: conversations.length,
          isSignedIn,
          timeSinceLastRefresh: now - lastFocusRefreshTimeRef.current,
          minTimeBetweenRefresh
        });
      }

      return () => {
        debugLog('MBA24u45vn: MessageHistory screen blurred');
        isScreenFocusedRef.current = false;
      };
    }, [conversations.length, isSignedIn])
  );
  
  // Effect to preserve selected conversation during resizes
  useEffect(() => {
    // Store current selection when it changes
    if (selectedConversation) {
      lastSelectedConversationRef.current = {
        conversationId: selectedConversation,
        conversationData: selectedConversationData
      };
    }
  }, [selectedConversation, selectedConversationData]);
  
  // MAIN INITIALIZATION - Keep only one, safer initialization effect  
  useEffect(() => {
    // Check if this is likely a resize event
    const currentWindowWidth = typeof window !== 'undefined' ? window.innerWidth : 0;
    const isResizeEvent = lastWindowWidthRef.current !== 0 && 
                          lastWindowWidthRef.current !== currentWindowWidth;
    
    // Update the window width reference for next time
    if (typeof window !== 'undefined') {
      lastWindowWidthRef.current = window.innerWidth;
    }
    
    // For resize events, just ensure we preserve the selected conversation
    if (isResizeEvent) {
      debugLog('MBA24u45vn', 'Detected resize event, preserving conversation', {
        oldWidth: lastWindowWidthRef.current,
        newWidth: currentWindowWidth,
        hasSelectedConversation: !!selectedConversation,
        hasStoredConversation: !!lastSelectedConversationRef.current
      });
      
      // If we've lost our selected conversation but have one stored, restore it
      if (!selectedConversation && lastSelectedConversationRef.current?.conversationId) {
        debugLog('MBA24u45vn', 'Restoring conversation after resize', {
          conversationId: lastSelectedConversationRef.current.conversationId
        });
        
        // Set the flag to indicate this is a resize-triggered selection change
        if (typeof isResizeTriggeredSelectionRef !== 'undefined') {
          isResizeTriggeredSelectionRef.current = true;
          debugLog('MBA24u45vn', 'Marked selection as resize-triggered to prevent redundant fetches');
        }
        
        setSelectedConversation(lastSelectedConversationRef.current.conversationId);
        if (lastSelectedConversationRef.current.conversationData) {
          setSelectedConversationData(lastSelectedConversationRef.current.conversationData);
        }
      }
      
      // Skip full initialization for resize events
      return;
    }
    
    // Prevent running multiple initializations in a short time period
    const now = Date.now();
    const minTimeBetweenInits = 1000; // 1 second minimum between initializations
    
    if (now - lastInitTimeRef.current < minTimeBetweenInits) {
      debugLog('MBA24u45vn', 'Initialization throttled - too frequent', {
        timeSinceLastInit: now - lastInitTimeRef.current,
        minRequiredTime: minTimeBetweenInits
      });
      return;
    }
    
    // Only run if not signed in (cleaning up) or first time signed in (initializing)
    if (!isSignedIn || loading) {
      debugLog('MBA1111 MessageHistory: User not signed in, skipping initialization');
      return;
    }

    // More robust check: Allow initialization only if we truly need it
    // Either first time (initialLoadRef.current = true) OR user just signed in but has no conversations
    const isFirstTime = initialLoadRef.current;
    const hasNoConversationsAfterSignIn = !initialLoadRef.current && conversations.length === 0;
    const needsInitialization = isFirstTime || hasNoConversationsAfterSignIn;
    
    // Skip if we're already initialized
    if (!needsInitialization) {
      return;
    }
    
    // Skip if initialization is already in progress
    if (isInitializingRef.current) {
      debugLog('MBA24u45vn', 'Initialization already in progress, skipping duplicate call');
      return;
    }
    
    // Update the last initialization time
    lastInitTimeRef.current = now;

    debugLog('MBA1111 MessageHistory: Starting initialization for signed in user');
    
    const initializeData = async () => {
      // Mark initialization as in progress
      isInitializingRef.current = true;
    try {
      // Mark as initialized IMMEDIATELY to prevent race conditions
      initialLoadRef.current = false;
      
      // Add debug logging for route params in initializeData
      if (route.params?.conversationId) {
        debugLog('MBA24u45vn', 'Processing route params in initializeData', {
          conversationId: route.params.conversationId,
          otherUserName: route.params.otherUserName,
          currentTime: Date.now()
        });
      }
      
      // Only reset states if we don't already have conversations loaded
      if (conversations.length === 0) {
        setConversations([]);
        setMessages([]);
        setSelectedConversation(null);
        setSelectedConversationData(null);
        setIsLoadingConversations(true);
        setIsLoadingMessages(false);
        setCurrentPage(1);
        setHasMore(true);
        lastViewedConversationRef.current = null;
      }

                // Handle URL parameters on web
        if (Platform.OS === 'web') {
          const currentUrl = new URL(window.location.href);
          
          // Check for selectedConversation parameter (this is the main one we care about for reloads)
          const rawSelectedConversationId = currentUrl.searchParams.get('selectedConversation');
          const selectedConversationId = (rawSelectedConversationId && rawSelectedConversationId !== 'null') 
                                         ? rawSelectedConversationId : null;
          
          // Also check conversationId for compatibility
          const rawUrlConversationId = currentUrl.searchParams.get('conversationId');
          const urlConversationId = (rawUrlConversationId && rawUrlConversationId !== 'null') 
                                    ? rawUrlConversationId : null;
          
          // Use selectedConversation first, then fall back to conversationId
          const conversationToLoad = selectedConversationId || urlConversationId;
          
          debugLog('MBA24u45vn', 'Checking URL parameters on initialization', {
            url: window.location.href,
            rawSelectedConversationId,
            selectedConversationId,
            rawUrlConversationId,
            urlConversationId,
            conversationToLoad,
            hasSelectedConversation: !!selectedConversation,
            timestamp: Date.now()
          });
          
                     // If we have a valid conversation ID from URL, process it (don't clear URL params yet)
           if (conversationToLoad) {
             debugLog('MBA24u45vn', 'Processing valid conversation ID from URL', {
               conversationId: conversationToLoad,
               source: selectedConversationId ? 'selectedConversation' : 'conversationId',
               timestamp: Date.now()
             });
             
             debugLog('MBA24u45vn: Fetching conversations for URL conversation ID');
             
             // Fetch conversations and wait for the result
             const conversationsData = await fetchConversations();
             
             // Make sure we have data before proceeding
             if (conversationsData && Array.isArray(conversationsData) && conversationsData.length > 0) {
               // Find the conversation in the data
               const conversation = conversationsData.find(c => c.conversation_id === conversationToLoad);
               
               if (conversation) {
                 debugLog('MBA24u45vn', 'Found conversation from URL in data', {
                   conversation_id: conversation.conversation_id,
                   other_user_name: conversation.other_user_name,
                   has_profile_pic: !!conversation.profile_picture
                 });
                 
                 // Set the selected conversation
                 setSelectedConversation(conversationToLoad);
                 setSelectedConversationData(conversation);
                 
                 // Set global variable for Navigation component
                 if (typeof window !== 'undefined') {
                   window.selectedConversationId = conversationToLoad;
                 }
                 
                 // Update URL to maintain selectedConversation parameter, but clean up other params
                 const cleanUrl = new URL(window.location.href);
                 const paramsToKeep = ['selectedConversation'];
                 const paramsToRemove = [...cleanUrl.searchParams.keys()].filter(key => !paramsToKeep.includes(key));
                 
                 paramsToRemove.forEach(key => {
                   cleanUrl.searchParams.delete(key);
                 });
                 
                 // Ensure selectedConversation is set correctly
                 cleanUrl.searchParams.set('selectedConversation', conversationToLoad);
                 
                 window.history.replaceState({}, '', cleanUrl.toString());
                 debugLog('MBA24u45vn', 'Updated URL to preserve selectedConversation', {
                   newUrl: cleanUrl.toString()
                 });
                 
                 // Fetch messages for this conversation
                 fetchMessages(conversationToLoad);
                 
                 return;
               } else {
                 debugLog('MBA24u45vn', 'Conversation from URL NOT found in conversations data', {
                   conversationId: conversationToLoad,
                   conversationsCount: conversationsData.length,
                   availableIds: conversationsData.map(c => c.conversation_id)
                 });
                 
                 // Clear invalid conversation parameters only if we have conversation data but conversation not found
                 const cleanUrl = new URL(window.location.href);
                 cleanUrl.searchParams.delete('selectedConversation');
                 cleanUrl.searchParams.delete('conversationId');
                 window.history.replaceState({}, '', cleanUrl.toString());
                 debugLog('MBA24u45vn', 'Cleared invalid conversation parameters from URL');
               }
             } else {
               debugLog('MBA24u45vn', 'No conversations data available yet, keeping URL parameters', {
                 conversationId: conversationToLoad,
                 conversationsData: conversationsData ? 'empty array' : 'null/undefined'
               });
               
               // Don't clear URL parameters if we don't have conversation data yet
               // Let the normal initialization proceed and handle this later
               // Set the conversation ID anyway in case the data loads later
               setSelectedConversation(conversationToLoad);
               
               // Set global variable for Navigation component
               if (typeof window !== 'undefined') {
                 window.selectedConversationId = conversationToLoad;
               }
               
               // Clean up other URL parameters but keep selectedConversation
               const cleanUrl = new URL(window.location.href);
               const paramsToKeep = ['selectedConversation'];
               const paramsToRemove = [...cleanUrl.searchParams.keys()].filter(key => !paramsToKeep.includes(key));
               
               paramsToRemove.forEach(key => {
                 cleanUrl.searchParams.delete(key);
               });
               
               window.history.replaceState({}, '', cleanUrl.toString());
               debugLog('MBA24u45vn', 'Cleaned up other URL parameters but preserved selectedConversation');
               
               return;
             }
           } else {
             // No valid conversation parameters, clean up URL
             const cleanUrl = new URL(window.location.href);
             const hasAnyParams = cleanUrl.searchParams.toString().length > 0;
             
             if (hasAnyParams) {
               // Only clear params if we're not coming from another screen with valid params
               const isNavigatingFromOtherScreen = urlConversationId || rawUrlConversationId;
               
               if (!isNavigatingFromOtherScreen) {
                 [...cleanUrl.searchParams.keys()].forEach(key => {
                   cleanUrl.searchParams.delete(key);
                 });
                 
                 window.history.replaceState({}, '', cleanUrl.toString());
                 debugLog('MBA24u45vn', 'Cleared all URL parameters - no valid conversation found');
               }
             }
           }
        }

        // If we have route params on initial load, handle them here
        if (route.params?.conversationId) {
          isHandlingRouteParamsRef.current = true;
          
          // Check if we should open booking creation (coming from Connections)
          if (route.params.isProfessional === true) {
            shouldOpenBookingCreationRef.current = true;
            debugLog('MBA9999: Will open booking creation after data loads');
          }
          
          debugLog('MBA24u45vn: Fetching conversations from initializeData in route.params?.conversationId');
          const conversationsData = await fetchConversations();
          setSelectedConversation(route.params.conversationId);
          
          navigation.setParams({ 
            messageId: null, 
            conversationId: null,
            otherUserName: null,
            isProfessional: null,
            clientId: null
          });
          return;
        }

        // If conversations are already loaded but we're not coming from route params,
        // and this is not an initial load, refresh the conversations to get latest data
        if (conversations.length > 0 && !initialLoadRef.current) {
          debugLog('MBA24u45vn: Refreshing existing conversations on re-initialization');
          const conversationsData = await fetchConversations();
          
          // Auto-select conversation on desktop if needed
          if (Platform.OS === 'web' && screenWidth > 900 && conversationsData?.length > 0 && !selectedConversation) {
            setSelectedConversation(conversationsData[0].conversation_id);
            setSelectedConversationData(conversationsData[0]);
          }
          return;
        }

        // Normal initialization - fetch conversations once
        debugLog('MBA24u45vn About to fetch conversations for normal initialization');
        const conversationsData = await fetchConversations();
        
        // Filter conversations by role
        const filteredByRole = conversationsData.filter(conv => {
          if (userRole === 'professional') {
            return conv.is_professional === true;
          } else if (userRole === 'petOwner') {
            return conv.is_professional === false;
          }
          return true;
        });
        
        if (Platform.OS === 'web' && screenWidth > 900 && filteredByRole.length > 0) {
          // Sort conversations by last message time to find the most recent
          const sortedConversations = [...filteredByRole].sort((a, b) => {
            const timeA = a.last_message_time ? new Date(a.last_message_time).getTime() : 0;
            const timeB = b.last_message_time ? new Date(b.last_message_time).getTime() : 0;
            return timeB - timeA; // Sort descending (newest first)
          });
          
          debugLog('MBA3456: Auto-selecting most recent conversation on initialization', {
            conversation_id: sortedConversations[0].conversation_id,
            role: userRole
          });
          
          setSelectedConversation(sortedConversations[0].conversation_id);
          setSelectedConversationData(sortedConversations[0]);
        }
      } catch (error) {
        console.error('Error in initialization:', error);
        // Reset initialization flag on error so it can be retried
        initialLoadRef.current = true;
      } finally {
        setIsInitialLoad(false);
        isHandlingRouteParamsRef.current = false;
        // Reset initialization in progress flag
        isInitializingRef.current = false;
      }
    };

    initializeData();

    return () => {
      debugLog('MBA9999: Component unmounting - cleaning up');
      
      // Reset everything for future component mount
      setConversations([]);
      setMessages([]);
      setSelectedConversation(null);
      setSelectedConversationData(null);
      initialLoadRef.current = true;
      setIsInitialLoad(true);
      isHandlingRouteParamsRef.current = false;
      hasLoadedMessagesRef.current = false;
      shouldOpenBookingCreationRef.current = false;
      lastViewedConversationRef.current = null;
      
      // Clear fetch tracking refs
      isFetchingConversationsRef.current = false;
      isFetchingMessagesRef.current.clear();
      
      // Clear the global selected conversation tracking and URL params
      if (typeof window !== 'undefined') {
        window.selectedConversationId = null;
        
        // Clear URL params
        const currentUrl = new URL(window.location.href);
        if (currentUrl.searchParams.has('selectedConversation') || currentUrl.searchParams.has('conversationId')) {
          currentUrl.searchParams.delete('selectedConversation');
          currentUrl.searchParams.delete('conversationId');
          window.history.replaceState({}, '', currentUrl.toString());
          debugLog('MBA4477: Cleared URL params on component unmount');
        }
      }
      
      // Clear navigation params
      if (navigation && navigation.setParams) {
        navigation.setParams({ selectedConversation: undefined });
        debugLog('MBA4477: Cleared navigation params on component unmount');
      }
    };
  }, [isSignedIn, loading, userRole, screenWidth]); // Added userRole, screenWidth to dependencies
  
  // Effect to trigger booking creation once conversation data is loaded
  useEffect(() => {
    // Only run if we should open booking creation, have conversation data, and messages are loaded
    if (shouldOpenBookingCreationRef.current && selectedConversationData && hasLoadedMessagesRef.current && isSignedIn) {
      if (is_DEBUG) {
        console.log('MBA98765 Conversation data and messages loaded, triggering booking creation', {
          conversationId: selectedConversationData.conversation_id,
          isProfessional: selectedConversationData.is_professional,
          hasDraft: hasDraft,
          draftData: draftData ? 'exists' : 'none'
        });
      }
      
      // Reset the flag to prevent re-triggering
      shouldOpenBookingCreationRef.current = false;
      
      // Add a small delay to ensure everything is properly loaded
      setTimeout(() => {
        handleCreateBooking();
      }, 300);
    }
  }, [selectedConversationData, hasLoadedMessagesRef.current, hasDraft, draftData, isSignedIn]);

  // Ref to track the last time we fetched conversations
  const lastConversationFetchTimeRef = useRef(0);
  
  // Ref to track if a resize event triggered this selection change
  const isResizeTriggeredSelectionRef = useRef(false);
  
  // Effect to update selected conversation data when conversations are loaded
  useEffect(() => {
    if (!selectedConversation || !isSignedIn) {
      debugLog('MBA98765 Skipping conversation data update - no conversation or not signed in');
      return;
    }

    // If this is a resize-triggered selection change, don't trigger another fetch
    if (isResizeTriggeredSelectionRef.current) {
      debugLog('MBA24u45vn: Skipping fetch for resize-triggered selection change', {
        conversationId: selectedConversation
      });
      isResizeTriggeredSelectionRef.current = false;
    }

    const conversation = conversations.find(c => c.conversation_id === selectedConversation);
    if (conversation) {
      debugLog('MBA98765 Updating selected conversation data:', {
        conversation_id: conversation.conversation_id,
        is_professional: conversation.is_professional,
        other_user_name: conversation.other_user_name
      });
      setSelectedConversationData(conversation);
    } else {
      debugLog('MBA98765 Selected conversation not found in conversations list');
      
      // Throttle fetch operations on conversation change
      const now = Date.now();
      const minTimeBetweenFetches = 1000; // 1 second minimum between fetches
      
      if (now - lastConversationFetchTimeRef.current < minTimeBetweenFetches) {
        debugLog('MBA24u45vn: Throttled conversation fetch - too frequent', {
          timeSinceLastFetch: now - lastConversationFetchTimeRef.current,
          conversationId: selectedConversation
        });
        return;
      }
      
      // Update the last fetch time
      lastConversationFetchTimeRef.current = now;
      
      // If we have a selected conversation but it's not in the list,
      // we should fetch conversations again
      debugLog('MBA24u45vn: Fetching conversations from useEffect in selectedConversation');
      fetchConversations();
    }
  }, [selectedConversation, conversations, isSignedIn]);

  // Effect to fetch messages when conversation is selected
  useEffect(() => {
    if (!selectedConversation || !isSignedIn) {
      debugLog('MBA98765 Skipping message fetch - no conversation selected or not signed in');
      return;
    }

    // Only fetch if we haven't loaded messages for this conversation yet
    if (!hasLoadedMessagesRef.current || lastViewedConversationRef.current !== selectedConversation) {
      debugLog('MBA98765 Fetching messages for conversation:', selectedConversation);
      fetchMessages(selectedConversation, 1);
      hasLoadedMessagesRef.current = true;
      lastViewedConversationRef.current = selectedConversation;
    }
  }, [selectedConversation, isSignedIn]);

  // Modify existing screen width effect to be safer
  useEffect(() => {
    if (!isSignedIn) return; // Don't do anything if not signed in
    
    // Only track width changes for actual threshold crossings
    const prevWidth = prevScreenWidthRef.current;
    const hasWidthCrossedThreshold = 
      (prevWidth <= 900 && screenWidth > 900) || 
      (prevWidth > 900 && screenWidth <= 900);

    // Skip the effect if we haven't crossed the threshold
    if (!hasWidthCrossedThreshold) {
      // Still update the reference for next check
      prevScreenWidthRef.current = screenWidth;
      return;
    }

    if (is_DEBUG) {
      console.log('MBA98765 Screen width threshold crossed:', {
        prev: prevWidth,
        current: screenWidth,
        crossedFrom: prevWidth <= 900 ? 'mobile' : 'desktop',
        crossedTo: screenWidth <= 900 ? 'mobile' : 'desktop'
      });
    }

    // Update reference
    prevScreenWidthRef.current = screenWidth;

    // Only auto-select a conversation when crossing from mobile to desktop
    if (prevWidth <= 900 && screenWidth > 900 && conversations.length > 0 && !selectedConversation) {
      if (is_DEBUG) {
        console.log('MBA98765 Auto-selecting first conversation when crossing to desktop');
      }
      setSelectedConversation(conversations[0].conversation_id);
    }
  }, [screenWidth, isSignedIn]);

  // Add a ref outside of any effect to track previous screen width
  const prevFilterScreenWidthRef = useRef(getInitialWidth());
  
  // Add effect to filter conversations based on user role
  useEffect(() => {
    if (!conversations || conversations.length === 0) return;
    
    const isDesktopView = screenWidth > 900;
    const wasPreviouslyDesktopView = prevFilterScreenWidthRef.current > 900;
    
    // Only log when there's an actual change to filter (not on every resize)
    const shouldDetailLog = conversations.length < 20;  // Limit detailed logging for performance
    
    if (shouldDetailLog) {
      debugLog('MBA3456: Filtering conversations by role', {
        currentRole: userRole,
        totalConversations: conversations.length,
        screenWidth: screenWidth,
        isDesktopView
      });
    }
    
    // Filter conversations based on the role from context
    const filteredByRole = conversations.filter(conv => {
      // For professional role, show only conversations where is_professional is true
      if (userRole === 'professional') {
        return conv.is_professional === true;
      }
      // For pet owner role, show only conversations where is_professional is false
      else if (userRole === 'petOwner' || userRole === 'owner') {
        return conv.is_professional === false;
      }
      // If no role specified, show all conversations (fallback)
      return true;
    });
    
    if (shouldDetailLog) {
      debugLog('MBA3456: Filtered conversations result', {
        originalCount: conversations.length,
        filteredCount: filteredByRole.length,
        currentRole: userRole
      });
    }
    
    // Update the filteredConversations state
    setFilteredConversations(filteredByRole);
    
    // Only run auto-select logic when:
    // 1. We're in desktop view
    // 2. AND either we just crossed from mobile to desktop OR we need to select an initial conversation
    const justCrossedToDesktop = isDesktopView && !wasPreviouslyDesktopView;
    const needsInitialSelection = isDesktopView && !selectedConversation;
    
    if (Platform.OS === 'web' && (justCrossedToDesktop || needsInitialSelection)) {
      // If we have filtered conversations, ensure one is selected
      if (filteredByRole.length > 0) {
        // Check if the currently selected conversation is in the filtered list
        const isSelectedConversationInFiltered = selectedConversation && 
          filteredByRole.some(conv => conv.conversation_id === selectedConversation);
        
        if (!isSelectedConversationInFiltered) {
          // Sort conversations by last message time to find the most recent
          const sortedConversations = [...filteredByRole].sort((a, b) => {
            const timeA = a.last_message_time ? new Date(a.last_message_time).getTime() : 0;
            const timeB = b.last_message_time ? new Date(b.last_message_time).getTime() : 0;
            return timeB - timeA; // Sort descending (newest first)
          });
          
          // Select the most recent conversation
          if (sortedConversations.length > 0) {
            debugLog('MBA3456: Auto-selecting most recent conversation after role filter', {
              conversation_id: sortedConversations[0].conversation_id,
              justCrossedToDesktop,
              needsInitialSelection
            });
            setSelectedConversation(sortedConversations[0].conversation_id);
            setSelectedConversationData(sortedConversations[0]);
          }
        }
      } else {
        // No conversations for this role, clear selection
        setSelectedConversation(null);
        setSelectedConversationData(null);
      }
    }
    
    // Update the screenWidth reference for next comparison
    prevFilterScreenWidthRef.current = screenWidth;
    
  }, [conversations, userRole, selectedConversation, screenWidth]);

  // Update the existing useEffect for search query to work with the filtered conversations
  useEffect(() => {
    if (!conversations || conversations.length === 0) {
      return;
    }
    
    // First filter by role regardless of search query
    const roleFiltered = conversations.filter(conv => {
      if (userRole === 'professional') {
        return conv.is_professional === true;
      } else if (userRole === 'petOwner') {
        return conv.is_professional === false;
      }
      return true; // fallback
    });
    
    // Then apply search filter if needed
    if (searchQuery.trim() === '') {
      // No search query, just use the role-filtered list
      setFilteredConversations(roleFiltered);
    } else {
      // Apply search filter on top of role filter
      const lowercaseQuery = searchQuery.trim().toLowerCase();
      const searchFiltered = roleFiltered.filter(conv => {
        const matchesSearch = conv.other_user_name && 
          conv.other_user_name.toLowerCase().includes(lowercaseQuery);
        return matchesSearch;
      });
      
      setFilteredConversations(searchFiltered);
      
      debugLog('MBA3456: Search filtered conversations', {
        roleFilteredCount: roleFiltered.length,
        searchFilteredCount: searchFiltered.length,
        searchQuery: searchQuery.trim()
      });
    }
  }, [searchQuery, conversations, userRole]);

  // Effect to validate preserved selectedConversation from URL once conversations are loaded
  useEffect(() => {
    // Only run this effect if:
    // 1. We have conversations loaded
    // 2. We have a selected conversation 
    // 3. We're signed in
    // 4. We're on web platform
    if (Platform.OS === 'web' && conversations.length > 0 && selectedConversation && isSignedIn) {
      // Check if the current selectedConversation is actually in the loaded conversations
      const conversationExists = conversations.find(c => c.conversation_id === selectedConversation);
      
      if (conversationExists) {
        debugLog('MBA24u45vn', 'Validated preserved selectedConversation from URL', {
          conversationId: selectedConversation,
          conversationName: conversationExists.other_user_name,
          isFound: true
        });
        
        // Ensure the conversation data is set
        if (!selectedConversationData) {
          setSelectedConversationData(conversationExists);
        }
        
        // Ensure messages are loaded for this conversation
        if (!hasLoadedMessagesRef.current || lastViewedConversationRef.current !== selectedConversation) {
          debugLog('MBA24u45vn', 'Loading messages for validated preserved conversation');
          fetchMessages(selectedConversation, 1);
          hasLoadedMessagesRef.current = true;
          lastViewedConversationRef.current = selectedConversation;
        }
      } else {
        debugLog('MBA24u45vn', 'Preserved selectedConversation not found in loaded conversations', {
          conversationId: selectedConversation,
          totalConversations: conversations.length,
          availableIds: conversations.map(c => c.conversation_id)
        });
        
        // Clear invalid conversation from URL and state
        if (typeof window !== 'undefined') {
          const currentUrl = new URL(window.location.href);
          if (currentUrl.searchParams.has('selectedConversation')) {
            currentUrl.searchParams.delete('selectedConversation');
            window.history.replaceState({}, '', currentUrl.toString());
            debugLog('MBA24u45vn', 'Cleared invalid selectedConversation from URL');
          }
          window.selectedConversationId = null;
        }
        
        // Clear selected conversation state
        setSelectedConversation(null);
        setSelectedConversationData(null);
      }
    }
  }, [conversations, selectedConversation, isSignedIn, selectedConversationData]);

    // Fetch conversations 
  const fetchConversations = async () => {
    // Get stack trace to see where this is being called from
    const stackTrace = new Error().stack;
    
    // Get current state for debug logging
    const currentRoute = navigation.getState()?.routes?.[navigation.getState()?.index];
    const routeName = currentRoute?.name;
    const screenParams = currentRoute?.params;
    
    debugLog('MBA24u45vn', 'fetchConversations called', {
      stack: stackTrace.split('\n')[2],
      selectedConversation,
      hasExistingConversations: conversations.length > 0,
      routeName,
      screenParams: JSON.stringify(screenParams),
      routeParams: route.params ? JSON.stringify(route.params) : 'none',
      timestamp: Date.now()
    });

    // Prevent duplicate fetches
    if (isFetchingConversationsRef.current) {
      debugLog('MBA24u45vn', 'Conversations fetch already in progress, skipping duplicate call', {
        caller: stackTrace.split('\n')[2],
        currentlySelected: selectedConversation
      });
      return conversations; // Return existing conversations if available
    }

    try {
      isFetchingConversationsRef.current = true;
      setIsLoadingConversations(true);
      debugLog('MBA24u45vn', 'Making API call to fetch conversations', {
        userRole,
        isSignedIn,
        selectedConversation,
        current_url: typeof window !== 'undefined' ? window.location.href : 'not-web',
        caller: stackTrace.split('\n')[2]
      });
      
      const data = await getConversations();
      
      // Check if there's a new conversation from route params that we should look for
      if (route.params?.conversationId) {
        const newConversation = data.find(c => c.conversation_id === route.params.conversationId);
        debugLog('MBA24u45vn', 'Checking for new conversation in API response', {
          conversationId: route.params.conversationId,
          found: !!newConversation,
          total_conversations: data.length
        });
      }
      
      if (data && Array.isArray(data)) {
        debugLog('MBA24u45vn', 'Conversations API response received', {
          count: data.length,
          userRole,
          route_params: route.params ? JSON.stringify(route.params) : 'none',
          current_url: typeof window !== 'undefined' ? window.location.href : 'not-web',
          conversations: data.map(c => ({
            conversation_id: c.conversation_id,
            is_professional: c.is_professional,
            other_user_name: c.other_user_name,
            has_profile_pic: !!c.profile_picture
          }))
        });
        
        // Check if route params contains a conversation ID we should be selecting
        if (route.params?.conversationId) {
          const matchingConversation = data.find(c => c.conversation_id === route.params.conversationId);
          
          if (matchingConversation) {
            debugLog('MBA24u45vn', 'Found conversation in API response matching route params', {
              conversation_id: matchingConversation.conversation_id,
              other_user_name: matchingConversation.other_user_name,
              has_profile_pic: !!matchingConversation.profile_picture,
              is_selected: selectedConversation === matchingConversation.conversation_id
            });
          } else {
            debugLog('MBA24u45vn', 'Conversation from route params NOT found in API response', {
              conversation_id: route.params.conversationId,
              total_conversations: data.length
            });
          }
        }
        
        // Store the full list of conversations
        setConversations(data);
        
        // Filter conversations by user role immediately
        const filteredByRole = data.filter(conv => {
          if (userRole === 'professional') {
            return conv.is_professional === true;
          } else if (userRole === 'petOwner' || userRole === 'owner') {
            return conv.is_professional === false;
          }
          return true; // fallback
        });
        
        debugLog('MBA3456: Filtered conversations by role:', {
          originalCount: data.length,
          filteredCount: filteredByRole.length,
          userRole,
          filteredConversations: filteredByRole.map(c => ({
            id: c.conversation_id,
            is_professional: c.is_professional,
            name: c.other_user_name
          }))
        });
        
                  // Update filtered conversations with role-filtered data
        setFilteredConversations(filteredByRole);
        
        // If we have a selected conversation, make sure it's still valid for the current role
        if (selectedConversation) {
          const conversation = filteredByRole.find(c => c.conversation_id === selectedConversation);
          if (conversation) {
            // Conversation is valid for current role, update data
            setSelectedConversationData(conversation);
          } else {
            // Conversation is not valid for current role, clear selection
            setSelectedConversation(null);
            setSelectedConversationData(null);
            debugLog('MBA3456: Clearing selected conversation - not valid for current role', {
              selectedConversation,
              userRole
            });
          }
        }
        
        // Return the data for chaining
        return data;
      } else {
        debugLog('MBA3456: Invalid conversations data structure:', data);
        return [];
      }
    } catch (error) {
      debugLog('MBA3456: Error fetching conversations:', error);
      return [];
    } finally {
      setIsLoadingConversations(false);
      isFetchingConversationsRef.current = false;
    }
  };

  // Fetch messages 
  const fetchMessages = async (conversationId, page = 1) => {
    if (!conversationId) {
      debugLog('MBA24u45vn', 'No conversation ID provided for message fetch');
      return;
    }
    
    debugLog('MBA24u45vn', 'fetchMessages called', {
      conversationId,
      page,
      stack: new Error().stack.split('\n')[2],
      routeParams: route.params ? JSON.stringify(route.params) : 'none',
      url: typeof window !== 'undefined' ? window.location.href : 'not-web',
      selectedConversation,
      hasConversationData: !!selectedConversationData,
      timestamp: Date.now()
    });

    // First check if this conversation is valid for the current role
    // Skip validation if we don't have any conversations yet - this could be a brand new conversation
    if (conversations.length > 0) {
      const isValidForRole = conversations.some(conv => {
        const matchesId = conv.conversation_id === conversationId;
        
        let matchesRole = false;
        if (userRole === 'professional') {
          matchesRole = conv.is_professional === true;
        } else if (userRole === 'petOwner' || userRole === 'owner') {
          matchesRole = conv.is_professional === false;
        }
        
        debugLog('MBA3456: Validating conversation for role', {
          conversationId,
          userRole,
          conversation_is_professional: conv.is_professional,
          matchesId,
          matchesRole,
          valid: matchesId && matchesRole
        });
        
        return matchesId && matchesRole;
      });
      
      if (!isValidForRole) {
        debugLog('MBA3456: Attempted to fetch messages for conversation not valid for current role', {
          conversationId,
          userRole,
          // This might be a new conversation, so we'll check if it's in route params
          fromRouteParams: route.params?.conversationId === conversationId,
          allConversations: conversations.map(c => ({
            id: c.conversation_id,
            is_professional: c.is_professional
          }))
        });
        
        // If this is coming from route params, it might be a new conversation
        // We'll try to fetch messages anyway
        if (route.params?.conversationId === conversationId) {
          debugLog('MBA3456: Conversation from route params, attempting to fetch messages anyway');
        } else {
          // Clear messages and selection for invalid conversations
          setMessages([]);
          setSelectedConversation(null);
          setSelectedConversationData(null);
          return;
        }
      }
    } else {
      debugLog('MBA3456: No conversations in state yet, skipping role validation');
    }

    // Create a unique key for this fetch operation
    const fetchKey = `${conversationId}-${page}`;
    
    // Prevent duplicate fetches for the same conversation and page
    if (isFetchingMessagesRef.current.has(fetchKey)) {
      debugLog('MBA98765 Messages fetch already in progress for conversation:', conversationId, 'page:', page, '- skipping duplicate call');
      return;
    }

    try {
      isFetchingMessagesRef.current.add(fetchKey);
      debugLog('MBA98765 Fetching messages for conversation:', conversationId, 'page:', page);
      
      // Only clear messages for the first page (initial load)
      // For pagination, we'll append the new messages
      if (page === 1) {
        setMessages([]);
        setHasDraft(false);
        setDraftData(null);
        processedPagesRef.current.clear();
        messageIdsRef.current.clear();
        // Reset pagination state
        setCurrentPage(1);
        // Don't set hasMore to true here - wait for API response
      }

      // Set loading state
      if (page > 1) {
        setIsLoadingMore(true);
        isLoadingMoreRef.current = true;
      } else {
        setIsLoadingMessages(true);
      }

      const data = await getConversationMessages(conversationId, page);
      
      // Check for auth issues in response
      if (!data) {
        debugLog('MBA1111 fetchMessages: No data returned, possible auth issue');
        return;
      }

      if (data && Array.isArray(data.messages)) {
        const newMessages = data.messages;
        debugLog('MBA24u45vn', 'Messages API response received', {
          conversationId,
          page,
          count: newMessages.length,
          has_more: !!data.has_more,
          has_draft: !!data.has_draft,
          isPagination: page > 1,
          url: typeof window !== 'undefined' ? window.location.href : 'not-web',
          timestamp: Date.now()
        });

        // Check for draft data in the response
        if (data.has_draft) {
          setHasDraft(true);
          setDraftData(data.draft_data);
          debugLog('MBA98765 Draft data found:', data.draft_data);
        }

        // For first page, just set the messages
        // For pagination, append to existing messages
        if (page === 1) {
          setMessages(newMessages);
        } else {
          setMessages(prevMessages => {
            // Track existing message IDs to avoid duplicates
            const existingIds = new Set(prevMessages.map(m => m.message_id));
            
            // Filter out duplicates from new messages
            const uniqueNewMessages = newMessages.filter(
              msg => !existingIds.has(msg.message_id)
            );
            
            // Create combined array with all unique messages
            const combinedMessages = [...prevMessages, ...uniqueNewMessages];
            
            debugLog('MBA98765 Combined messages for pagination:', {
              previous: prevMessages.length,
              newUnique: uniqueNewMessages.length,
              combined: combinedMessages.length
            });
            
            return combinedMessages;
          });
        }

        // Update pagination state
        setHasMore(!!data.has_more);
        setCurrentPage(page);
        processedPagesRef.current.add(page);

        // Track message IDs to avoid duplicates
        newMessages.forEach(msg => {
          if (msg.message_id) {
            messageIdsRef.current.add(msg.message_id);
          }
        });

        debugLog('MBA98765 Message fetch completed for conversation:', conversationId);
      } else {
        debugLog('MBA98765 Invalid message data structure:', data);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
      debugLog('MBA98765 Error in fetchMessages:', error);
    } finally {
      // Reset loading states
      setIsLoadingMore(false);
      setIsLoadingMessages(false);
      
      // Add a small delay before resetting the loading ref to prevent immediate re-fetch
      setTimeout(() => {
        isLoadingMoreRef.current = false;
      }, 500);
      
      isFetchingMessagesRef.current.delete(fetchKey);
    }
  };

  // Function to send a message
  const SendNormalMessage = async (messageContent, imageMessageIds = [], messageObject = null) => {
    try {
      debugLog('MBA2u3f89fbno4: [API] SendNormalMessage called', {
        messageContentLength: messageContent?.length,
        messageContentPreview: messageContent?.substring(0, 50),
        selectedConversation,
        hasSelectedConversation: !!selectedConversation,
        selectedConversationType: typeof selectedConversation,
        hasImageMessageIds: imageMessageIds && imageMessageIds.length > 0,
        imageMessageIds,
        imageCount: imageMessageIds?.length || 0,
        hasMessageObject: !!messageObject,
        isImageMessage: messageObject?.type_of_message === 'image_message',
        currentMessageCount: messages.length,
        timestamp: Date.now()
      });

      if (!selectedConversation) {
        throw new Error('No conversation selected');
      }

      // If we have a pre-created message object from an image upload, use it directly
      if (messageObject) {
        debugLog('MBA5511: Using pre-created message object:', {
          messageId: messageObject.message_id,
          type: messageObject.type_of_message,
          hasImageUrls: !!messageObject.image_urls && messageObject.image_urls.length > 0,
          imageCount: messageObject.image_urls?.length || 0
        });
        
        // Add new message to the beginning of the list since FlatList is inverted
        setMessages(prevMessages => {
          debugLog('MBA5511: Adding message object directly to list', {
            beforeLength: prevMessages.length,
            afterLength: prevMessages.length + 1,
            newMessageId: messageObject.message_id
          });
          
          return [messageObject, ...prevMessages];
        });
        
        // Update conversation's last message
        setConversations(prev => prev.map(conv => 
          conv.conversation_id === selectedConversation 
            ? {
                ...conv,
                last_message: messageObject.content || 'Image message',
                last_message_time: messageObject.timestamp
              }
            : conv
        ));
        
        return messageObject;
      }

      // Normal message flow (text only or with separate image IDs)
      // Allow empty content if we have images
      if ((!imageMessageIds || imageMessageIds.length === 0) && (!messageContent || !messageContent.trim())) {
        throw new Error('Message content is empty and no images provided');
      }
      
      // Log that we're sending either text or images or both
      debugLog('MBA2u3f89fbno4: [API] Sending message with content and/or images', {
        hasContent: !!messageContent && messageContent.trim().length > 0,
        hasImages: imageMessageIds && imageMessageIds.length > 0,
        imageCount: imageMessageIds?.length || 0
      });
      
      const token = await getStorage('userToken');
      
      const requestData = {
        conversation_id: selectedConversation,
        content: messageContent ? messageContent.trim() : ''
      };
      
      // Add the image message IDs if available
      if (imageMessageIds && imageMessageIds.length > 0) {
        requestData.image_message_ids = imageMessageIds;
      }
      
      debugLog('MBA2u3f89fbno4: [API] About to send API request', {
        requestData,
        apiUrl: `${API_BASE_URL}/api/messages/v1/send_norm_message/`,
        hasToken: !!token,
        timestamp: Date.now()
      });
      
      const response = await axios.post(`${API_BASE_URL}/api/messages/v1/send_norm_message/`, requestData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      debugLog('MBA2u3f89fbno4: [API] Message sent successfully', {
        messageId: response.data.message_id,
        timestamp: response.data.timestamp,
        responseStatus: response.status,
        responseData: response.data
      });

      // Add new message to the beginning of the list since FlatList is inverted
      setMessages(prevMessages => {
        debugLog('MBA2u3f89fbno4: [API] Adding sent message to list', {
          beforeLength: prevMessages.length,
          afterLength: prevMessages.length + 1,
          newMessageId: response.data.message_id
        });
        
        return [response.data, ...prevMessages];
      });

      // Update conversation's last message
      setConversations(prev => prev.map(conv => 
        conv.conversation_id === selectedConversation 
          ? {
              ...conv,
              last_message: messageContent,
              last_message_time: response.data.timestamp
            }
          : conv
      ));

      debugLog('MBA2u3f89fbno4: [API] SendNormalMessage completed successfully');
      return response.data;
    } catch (error) {
      debugLog('MBA2u3f89fbno4: [API] Error in SendNormalMessage', {
        errorMessage: error.message,
        errorResponse: error.response?.data,
        errorStatus: error.response?.status,
        requestedConversationId: selectedConversation,
        requestedMessageContent: messageContent?.substring(0, 50),
        timestamp: Date.now()
      });
      
      console.error('Error sending message:', error);
      throw error;
    }
  };

  // Update the handleCreateBooking function
  const handleCreateBooking = async () => {
    if (is_DEBUG) {
      console.log('MBA98765 handleCreateBooking:', {
        selectedConversationData,
        selectedConversation,
        isProfessional: selectedConversationData?.is_professional,
        hasDraft,
        draftData
      });
    }
    
    if (!selectedConversationData) {
      debugLog('MBA24u45vn: No conversation data found, Fetching conversations from handleCreateBooking');
      await fetchConversations();
      const updatedConversation = conversations.find(conv => conv.conversation_id === selectedConversation);
      if (!updatedConversation) {
        console.log('MBA98765 Still no conversation data after refresh');
        return;
      }
      setSelectedConversationData(updatedConversation);
      debugLog('MBA24u45vn: Conversation data found in handleCreateBooking', {
        updatedConversation
      });
    }

    // Check if current user is the professional by checking their role in the conversation
    const isProfessional = selectedConversationData.is_professional === true;
    
    if (is_DEBUG) {
      console.log('MBA98765 Is Professional?', isProfessional);
    }

    setShowDropdown(false); // Close dropdown first to prevent any UI issues

    if (isProfessional) {
      if (is_DEBUG) {
        console.log('MBA98765 User is professional - checking for existing draft', { hasDraft, draftData });
      }

      if (hasDraft && draftData) {
        // Show the draft confirmation modal
        setShowDraftConfirmModal(true);
      } else {
        // No existing draft, create new one
        await createNewDraft();
      }
    } else {
      console.log('MBA98765 User is owner - showing request modal');
      setShowRequestModal(true);
    }
  };

  // Helper function to create a new draft
  const createNewDraft = async () => {
    try {
      const token = await getStorage('userToken');
      const response = await axios.post(
        `${API_BASE_URL}/api/bookings/v1/create/`,
        {
          conversation_id: selectedConversation
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (is_DEBUG) {
        console.log('MBA98765 Create draft response:', response.data);
      }

      // Refresh messages to update draft status
      await fetchMessages(selectedConversation, 1);

      // Open BookingStepModal with new draft
      if (response.data.draft_id) {
        setCurrentBookingId(response.data.draft_id);
        setTimeout(() => {
          setShowBookingStepModal(true);
        }, 100);
      }
    } catch (error) {
      console.error('Error creating draft:', error);
      Alert.alert('Error', 'Unable to create draft. Please try again.');
    }
  };

  // Add the handleContinueExisting function
  const handleContinueExisting = () => {
    if (is_DEBUG) {
      console.log('MBA98765 handleContinueExisting:', {
        draftData,
        showDraftConfirmModal,
        showBookingStepModal
      });
    }

    setShowDraftConfirmModal(false);
    
    // Use draft_id instead of booking_id
    if (draftData?.draft_id) {
      setCurrentBookingId(draftData.draft_id);
      // Add a small delay to ensure modal state is updated
      setTimeout(() => {
        if (is_DEBUG) {
          console.log('MBA98765 Opening BookingStepModal with draft:', draftData.draft_id);
        }
        setShowBookingStepModal(true);
      }, 100);
    } else {
      console.error('MBA98765 No draft_id found in draftData:', draftData);
    }
  };

  // Add the handleCreateNew function
  const handleCreateNew = async () => {
    setShowDraftConfirmModal(false);
    await createNewDraft();
  };

  // Update loadMoreMessages to check current state before loading
  const loadMoreMessages = useCallback(() => {
    debugLog('MBA2349f87g9qbh2nfv9cg: loadMoreMessages called', {
      hasMore,
      isLoadingMore,
      isLoadingMoreRef: isLoadingMoreRef.current,
      currentPage,
      selectedConversation,
      messagesLength: messages.length
    });
    
    // Add a safety check to ensure we have a conversation selected
    if (!selectedConversation) {
      debugLog('MBA2349f87g9qbh2nfv9cg: No conversation selected, cannot load more messages');
      return;
    }
    
    // More reliable condition checking with better logging
    const isAlreadyLoading = isLoadingMoreRef.current || isLoadingMore;
    const nextPageAlreadyProcessed = processedPagesRef.current.has(currentPage + 1);
    
    // Only load more messages if:
    // 1. There are more messages to load
    // 2. We're not already loading (both state and ref)
    // 3. We have a selected conversation
    // 4. The next page hasn't already been processed
    if (hasMore && 
        !isAlreadyLoading && 
        !nextPageAlreadyProcessed) {
      
      debugLog(`MBA2349f87g9qbh2nfv9cg: Starting pagination load for page ${currentPage + 1}`, {
        hasMore,
        isAlreadyLoading,
        nextPageAlreadyProcessed,
        currentPage
      });
      
      // Set loading state before fetch to prevent multiple triggers
      isLoadingMoreRef.current = true;
      setIsLoadingMore(true);
      
      // Fetch the next page of messages
      fetchMessages(selectedConversation, currentPage + 1);
      
      // Extra protection against rapid pagination requests
      // This acts as a backup to prevent request spam
      setTimeout(() => {
        // Reset loading flags if they're still set after 5 seconds
        // This helps recover from cases where the loadingMore state gets stuck
        if (isLoadingMoreRef.current) {
          debugLog('MBA2349f87g9qbh2nfv9cg: Resetting stuck loading state after timeout');
          isLoadingMoreRef.current = false;
          setIsLoadingMore(false);
        }
      }, 5000);
      
      return true;
    } else {
      debugLog('MBA2349f87g9qbh2nfv9cg: Not loading more messages - conditions not met', {
        hasMore,
        isLoadingMoreRefCurrent: isLoadingMoreRef.current,
        isLoadingMore,
        selectedConversation: !!selectedConversation,
        nextPageProcessed: nextPageAlreadyProcessed,
        reasonText: !hasMore ? 'no more messages' : 
                   isAlreadyLoading ? 'already loading messages' :
                   nextPageAlreadyProcessed ? 'page already processed' : 'unknown'
      });
      return false;
    }
  }, [hasMore, currentPage, selectedConversation, messages.length, isLoadingMore]);

  // Function to refresh messages (fetch page 1) - used after marking bookings complete
  const refreshMessages = useCallback(async () => {
    if (selectedConversation) {
      debugLog('MBA9999: Refreshing messages for conversation:', selectedConversation);
      await fetchMessages(selectedConversation, 1);
    }
  }, [selectedConversation, fetchMessages]);

  const renderMessage = useCallback(({ item, index }) => {
    // Create a map to keep track of which bookings have change requests and latest message timestamps
    const bookingMessages = groupMessagesByBookingId(messages);
    
    // Track bookings that have been confirmed
    const confirmedBookingIds = messages
      .filter(m => m.type_of_message === 'booking_confirmed')
      .map(m => m.metadata?.booking_id)
      .filter(Boolean);
      
    // Track bookings that have been completed
    const completedBookingIds = messages
      .filter(m => 
        (m.type_of_message === 'booking_confirmed' && m.metadata?.is_review_request) ||
        (m.type_of_message === 'request_review')
      )
      .map(m => m.metadata?.booking_id)
      .filter(Boolean);
      
    // Check if the current message's booking has been completed
    const isBookingCompleted = item.metadata?.booking_id && 
      completedBookingIds.includes(item.metadata.booking_id);
      
    // Handle review request messages - check for both request_review and booking_confirmed with review metadata
    if (item.type_of_message === 'request_review' || 
        (item.type_of_message === 'booking_confirmed' && 
         (item.metadata?.is_review_request || item.metadata?.client_review || item.metadata?.professional_review))) {
      debugLog('MBA8675309: Rendering review request message:', {
        messageId: item.message_id,
        content: item.content,
        metadata: item.metadata,
        bookingId: item.metadata?.booking_id,
        isProfessional: selectedConversationData?.is_professional,
        sender: item.sender
      });
      
      // For review request messages, we don't show a timestamp since it spans the full width
      return (
        <View style={styles.fullWidthMessage}>
          <ReviewRequestCard
            data={{
              ...item.metadata,
              booking_id: item.metadata?.booking_id,
              service_type: item.metadata?.service_type,
            }}
            isProfessional={selectedConversationData?.is_professional}
            conversationId={selectedConversation}
            navigation={navigation}
            onPress={(action) => {
              // Only handle the leave review action since view details now opens the modal directly
              if (action === 'leaveReview') {
                // Handle review action
                Alert.alert('Review', 'Review functionality will be implemented soon');
              }
            }}
          />
        </View>
      );
    }
    
    // Get previous message (newer in the timeline since the list is inverted)
    const prevMessage = index < messages.length - 1 ? messages[index + 1] : null;
    
    // Check if we should show timestamp for this message
    const showTimestamp = shouldShowTimestamp(item, prevMessage, index === 0);
    
    // Format the message time if we have a timestamp
    const formattedTime = item.timestamp ? 
      formatMessageTime(item.timestamp, timeSettings?.timezone || 'America/Denver') : '';
      
    // Add extra debug logging for booking-related messages
    if (item.type_of_message === 'send_approved_message' || 
        item.type_of_message === 'request_changes' || 
        item.type_of_message === 'initial_booking_request' ||
        item.type_of_message === 'booking_confirmed') {
      debugLog('MBA6677: Booking message timestamp details', {
        messageId: item.message_id,
        messageType: item.type_of_message,
        timestamp: item.timestamp,
        formattedTime,
        timezone: timeSettings?.timezone || 'America/Denver'
      });
    }
      
    // Check if the message has images in various formats
    const hasImages = item.image_urls && item.image_urls.length > 0;
    // For backwards compatibility with older messages that might have a single image_url
    const hasLegacyImage = !hasImages && item.image_url && item.image_url.length > 0;
    // Check if this is an image_message type message
    const isImageMessage = item.type_of_message === 'image_message';
    // If it's an image message but we don't have any detected images yet, force hasLegacyImage to true
    // This is needed for single image messages without a separate image_urls array
    const forceHasImage = isImageMessage && !hasImages && !hasLegacyImage && item.image_url;
    
    // Find approval requests for already confirmed bookings
    const bookingsWithUpdates = {};
    
    // For each confirmed booking, check if there are newer approval requests
    confirmedBookingIds.forEach(bookingId => {
      const messagesForBooking = messages.filter(m => 
        m.metadata?.booking_id === bookingId
      ).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      
      // Find the confirmation message for this booking
      const confirmationMessage = messagesForBooking.find(m => 
        m.type_of_message === 'booking_confirmed'
      );
      
      // Find any newer approval request messages for this booking
      if (confirmationMessage) {
        const confirmationTime = new Date(confirmationMessage.timestamp);
        const newerApprovalRequests = messagesForBooking.filter(m => 
          m.type_of_message === 'send_approved_message' && 
          new Date(m.timestamp) > confirmationTime
        );
        
        // If we found newer approval requests, mark this booking as having updates
        if (newerApprovalRequests.length > 0) {
          bookingsWithUpdates[bookingId] = true;
          debugLog('MBA6428: Detected booking update for confirmed booking:', {
            bookingId,
            confirmationTime,
            newerApprovalRequests: newerApprovalRequests.map(m => m.message_id)
          });
        }
      }
    });
    
    const hasChangeRequest = item.metadata?.booking_id && 
      messages.some(m => 
        m.type_of_message === 'request_changes' && 
        m.metadata?.booking_id === item.metadata.booking_id
      );
    
    // Determine if booking is confirmed
    const bookingIsConfirmed = item.metadata?.booking_id && 
      confirmedBookingIds.includes(item.metadata.booking_id);
      
    // Check if this confirmed booking has newer approval requests
    const hasNewerApprovalRequests = item.metadata?.booking_id && 
      bookingsWithUpdates[item.metadata.booking_id];
    
    // Determine if this is the newest message for this booking
    let isNewestMessage = false;
    let messageCreatedAt = new Date(item.created_at || item.timestamp);
    
    if (item.metadata?.booking_id && bookingMessages[item.metadata.booking_id]) {
      const bookingMessagesList = bookingMessages[item.metadata.booking_id];
      
      // Check if this is the newest message for this booking
      isNewestMessage = bookingMessagesList.length > 0 && 
        bookingMessagesList[0].messageId === item.message_id;
      
      debugLog(`MBA7321: Message ${item.message_id} for booking ${item.metadata.booking_id} isNewestMessage: ${isNewestMessage}`);
    }

    if (item.type_of_message === 'initial_booking_request' || item.type_of_message === 'send_approved_message') {
      const isFromMe = !item.sent_by_other_user;

      // Determine if this booking has an associated change request
      const bookingId = item.metadata?.booking_id;
      const hasAssociatedChangeRequest = bookingId && messages.some(m => 
        m.type_of_message === 'request_changes' && 
        m.metadata?.booking_id === bookingId
      );

      // Check if this is an approval request message
      const isApprovalMessage = item.type_of_message === 'send_approved_message';
      
      // Get booking status from metadata
      const bookingStatus = bookingIsConfirmed ? "Confirmed" : item.metadata?.booking_status;
      
      // For approval requests: determine if this is for an already confirmed booking
      // by checking if there's a booking_confirmed message with an earlier timestamp
      const isUpdateToConfirmedBooking = isApprovalMessage && bookingIsConfirmed && bookingId && 
        messages.some(m => 
          m.type_of_message === 'booking_confirmed' && 
          m.metadata?.booking_id === bookingId &&
          new Date(m.timestamp) < new Date(item.timestamp)
        );
      
      // Check if there are newer request changes messages for this booking update
      const hasNewerRequestChanges = isUpdateToConfirmedBooking && bookingId &&
        messages.some(m =>
          m.type_of_message === 'request_changes' &&
          m.metadata?.booking_id === bookingId &&
          new Date(m.timestamp) > new Date(item.timestamp)
        );
      
      // Log info if this is an update to a confirmed booking
      if (isUpdateToConfirmedBooking) {
        debugLog('MBA6428: Detected approval request for already confirmed booking:', {
          messageId: item.message_id,
          bookingId,
          isApprovalMessage,
          bookingIsConfirmed,
          isUpdateToConfirmedBooking,
          hasNewerRequestChanges
        });
      }
      
      // Check if the pro should be able to edit the draft
      const showEditDraft = selectedConversationData?.is_professional && 
        (item.type_of_message === 'initial_booking_request' || 
         (item.type_of_message === 'send_approved_message' && hasAssociatedChangeRequest));

      // This is for logging purposes
      if (showEditDraft) {
        debugLog('MBA6428: Showing edit draft button for message:', {
          messageId: item.message_id,
          bookingId: bookingId,
          type: item.type_of_message
        });
      }

      // Get total owner cost
      let totalOwnerCost = '0.00';
      try {
        if (item.metadata.cost_summary && item.metadata.cost_summary.total_client_cost) {
          totalOwnerCost = item.metadata.cost_summary.total_client_cost;
        }
      } catch (error) {
        console.error('Error parsing total cost:', error);
      }

      return (
        <View>
          <MessageTimestamp 
            message={item}
            isFromMe={isFromMe}
            styles={styles}
            userTimezone={timeSettings?.timezone || 'America/Denver'}
            show={showTimestamp}
          />
          <BookingMessageCard
            type={item.type_of_message === 'initial_booking_request' ? 'request' : 'approval'}
            displayType={isUpdateToConfirmedBooking ? 'booking_update' : undefined}
            data={{
              ...item.metadata,
              booking_id: item.metadata.booking_id,
              service_type: item.metadata.service_type,
              total_owner_cost: totalOwnerCost,
              occurrences: item.metadata.occurrences || []
            }}
            isFromMe={isFromMe}
            onPress={() => {
              // Navigate to booking details if we have a booking_id
              if (item.metadata.booking_id) {
                navigation.navigate('BookingDetails', { 
                  bookingId: item.metadata.booking_id,
                  from: 'MessageHistory'
                });
              }
            }}
            isProfessional={selectedConversationData?.is_professional}
            onApproveSuccess={(response) => {
              // Update the messages list to reflect the approval
              // You would typically update the booking status here
              if (response && response.status) {
                Alert.alert('Success', 'Booking approved successfully');
                // Refresh messages to update the UI
                debugLog(`MBA2349f87g9qbh2nfv9cg: Refreshing messages after approval success`);
                fetchMessages(selectedConversation, 1);
              }
            }}
            onApproveError={(error) => {
              Alert.alert('Error', error || 'Failed to approve booking');
            }}
            onEditDraft={showEditDraft ? () => {
              debugLog('MBA6428: Edit Draft button clicked, calling handleEditDraft with bookingId:', bookingId);
              handleEditDraft(bookingId);
            } : undefined}
            bookingStatus={bookingStatus}
            hasChangeRequest={hasAssociatedChangeRequest || hasNewerRequestChanges}
            isNewestMessage={isNewestMessage}
            messageCreatedAt={messageCreatedAt}
            isAfterConfirmation={isUpdateToConfirmedBooking}
            isBookingCompleted={isBookingCompleted}
          />
        </View>
      );
    }

    if (item.type_of_message === 'request_changes') {
      const isFromMe = !item.sent_by_other_user;
      
      // Get booking details from metadata
      const bookingId = item.metadata?.booking_id;
      const serviceType = item.metadata?.service_type;
      const bookingStatus = bookingIsConfirmed ? "Confirmed" : item.metadata?.booking_status;
      
      // For a request_changes message, it should be considered the newest if:
      // 1. It's the most recent message for this booking (already calculated)
      // 2. OR there are no newer approval requests for this booking after this request_changes message
      let isNewestChangeRequest = isNewestMessage;
      
      if (!isNewestChangeRequest && item.type_of_message === 'request_changes' && bookingId) {
        // Check if there are any newer approval messages
        const hasNewerApprovalMessages = messages.some(m => 
          m.type_of_message === 'send_approved_message' && 
          m.metadata?.booking_id === bookingId &&
          new Date(m.timestamp) > new Date(item.timestamp)
        );
        
        // If there are no newer approval messages, this can be treated as the newest message
        isNewestChangeRequest = !hasNewerApprovalMessages;
        
        debugLog('MBA4321: Checking if request_changes is effectively newest:', {
          messageId: item.message_id,
          originalIsNewest: isNewestMessage,
          hasNewerApprovals: hasNewerApprovalMessages,
          effectivelyNewest: isNewestChangeRequest
        });
      }
      
      // Check if this change request is related to a booking update
      // (i.e., an approval that came after a booking confirmation)
      const isRelatedToUpdate = bookingIsConfirmed && bookingId &&
        messages.some(m => 
          (m.type_of_message === 'send_approved_message' || m.type_of_message === 'booking_confirmed') &&
          m.metadata?.booking_id === bookingId
        );
      
      // Log for debugging
      debugLog('MBA4321: Rendering change request message:', {
        bookingId,
        isFromMe,
        content: item.content,
        metadata: item.metadata,
        isNewestMessage,
        isNewestChangeRequest,
        isConfirmed: bookingIsConfirmed,
        isRelatedToUpdate,
        hasOlderBookingConfirmedMessage: messages.some(m => 
          m.type_of_message === 'booking_confirmed' && 
          m.metadata?.booking_id === bookingId &&
          new Date(m.timestamp) < new Date(item.timestamp)
        ),
        hasOlderApprovalMessage: messages.some(m => 
          m.type_of_message === 'send_approved_message' && 
          m.metadata?.booking_id === bookingId &&
          new Date(m.timestamp) < new Date(item.timestamp)
        )
      });
      
      return (
        <View>
          <MessageTimestamp 
            message={item}
            isFromMe={isFromMe}
            styles={styles}
            userTimezone={timeSettings?.timezone || 'America/Denver'}
            show={showTimestamp}
          />
          <BookingMessageCard
            type="request_changes"
            data={{
              ...item.metadata,
              booking_id: bookingId,
              service_type: serviceType,
              cost_summary: item.metadata?.cost_summary || {},
              occurrences: item.metadata?.occurrences || [],
              content: item.content // Include the message content for display
            }}
            isFromMe={isFromMe}
            onPress={() => {
              // Navigate to booking details if we have a booking_id
              if (bookingId) {
                navigation.navigate('BookingDetails', { 
                  bookingId: bookingId,
                  from: 'MessageHistory'
                });
              }
            }}
            isProfessional={selectedConversationData?.is_professional}
            onApproveSuccess={(response) => {
              if (response && response.status) {
                Alert.alert('Success', 'Changes handled successfully');
                debugLog(`MBA2349f87g9qbh2nfv9cg: Refreshing messages after change approval`);
                fetchMessages(selectedConversation, 1);
              }
            }}
            onApproveError={(error) => {
              Alert.alert('Error', error || 'Failed to process changes');
            }}
            onEditDraft={selectedConversationData?.is_professional ? () => {
              handleEditDraft(bookingId);
            } : undefined}
            bookingStatus={bookingStatus}
            hasChangeRequest={false} // Change requests don't have change requests themselves
            isNewestMessage={isNewestChangeRequest} // Use enhanced newest message check
            messageCreatedAt={messageCreatedAt}
            isAfterConfirmation={isRelatedToUpdate} // Flag for change requests after an update
            isBookingCompleted={isBookingCompleted}
          />
        </View>
      );
    }

    // Handle booking confirmation messages
    if (item.type_of_message === 'booking_confirmed') {
      const isFromMe = !item.sent_by_other_user;
      
      // Get booking details from metadata
      const bookingId = item.metadata?.booking_id;
      const serviceType = item.metadata?.service_type;
      
      // Get cost info from metadata
      let totalCost = '0.00';
      let payout = '0.00';
      try {
        if (item.metadata.cost_summary) {
          totalCost = item.metadata.cost_summary.total_client_cost || '0.00';
          payout = item.metadata.cost_summary.total_sitter_payout || '0.00';
        }
      } catch (error) {
        console.error('Error parsing cost data:', error);
      }
      
      debugLog('MBA6428: Rendering booking confirmation message:', {
        bookingId,
        isFromMe,
        metadata: item.metadata,
        totalCost,
        payout,
        hasNewerApprovalRequests
      });
      
      return (
        <View>
          <MessageTimestamp 
            message={item}
            isFromMe={isFromMe}
            styles={styles}
            userTimezone={timeSettings?.timezone || 'America/Denver'}
            show={showTimestamp}
          />
          <BookingMessageCard
            type="booking_confirmed"
            data={{
              booking_id: bookingId,
              service_type: serviceType,
              cost_summary: {
                total_client_cost: totalCost,
                total_sitter_payout: payout
              }
            }}
            isFromMe={isFromMe}
            onPress={() => {
              // Navigate to booking details if we have a booking_id
              if (bookingId) {
                navigation.navigate('BookingDetails', { 
                  bookingId: bookingId,
                  from: 'MessageHistory'
                });
              }
            }}
            isProfessional={selectedConversationData?.is_professional}
            bookingStatus="Confirmed"
            isNewestMessage={isNewestMessage}
            messageCreatedAt={messageCreatedAt}
            onEditDraft={selectedConversationData?.is_professional ? () => {
              debugLog('MBA6428: Edit Draft button clicked for confirmed booking with bookingId:', bookingId);
              handleEditDraft(bookingId);
            } : undefined}
            hasNewerApprovalRequests={hasNewerApprovalRequests}
            isBookingCompleted={isBookingCompleted}
            onMarkCompletedSuccess={(response) => {
              debugLog('MBA8675309: Booking marked as completed successfully:', response);
              Alert.alert('Success', 'Booking marked as completed successfully');
              // Refresh messages to update the UI
              fetchMessages(selectedConversation, 1);
            }}
            onMarkCompletedError={(error) => {
              debugLog('MBA8675309: Error marking booking as completed:', error);
              Alert.alert('Error', error || 'Failed to mark booking as completed');
            }}
          />
        </View>
      );
    }

    // Check if this is an attachment message (temporary image container)
    const isAttachmentMessage = item.metadata && item.metadata.is_attachment === true;
    
    // Skip rendering attachment messages - they should not be displayed directly
    // They're only containers for images that get referenced in actual image messages
    if (isAttachmentMessage) {
      return null;
    }
    
    // Handle image messages or normal messages with images
    if (isImageMessage || hasImages || hasLegacyImage || forceHasImage) {
      const isFromMe = !item.sent_by_other_user;
      
      // For images, first render the caption (if exists) and then the images
      return (
        <View>
          <MessageTimestamp 
            message={item}
            isFromMe={isFromMe}
            styles={styles}
            userTimezone={timeSettings?.timezone || 'America/Denver'}
            show={showTimestamp}
          />
          
          {/* Image Container */}
          <View style={isFromMe ? styles.sentMessageContainer : styles.receivedMessageContainer}>
            <View style={[
              styles.messageCard, 
              // Don't use colored background for image messages
              { backgroundColor: 'transparent', shadowColor: 'transparent' }
            ]}>
              <View style={styles.messageContent}>
                {/* Handle images from image_urls in the message itself */}
                {hasImages && (
                  <View style={{
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    // marginVertical: 8,
                    width: '100%',
                  }}>
                    {item.image_urls.map((imageUrl, index) => (
                      <ClickableImage
                        key={`${imageUrl}-${index}`}
                        imageUrl={imageUrl}
                        onPress={handleImagePress}
                        style={{
                          image: {
                            width: 250,
                            height: 250,
                            borderRadius: 8,
                            // marginVertical: 4,
                          }
                        }}
                      />
                    ))}
                  </View>
                )}
                
                {/* Handle images from metadata.image_urls */}
                {!hasImages && item.metadata && item.metadata.image_urls && item.metadata.image_urls.length > 0 && (
                  <View style={{
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginVertical: 8,
                    width: '100%',
                  }}>
                    {item.metadata.image_urls.map((imageUrl, index) => (
                      <ClickableImage
                        key={`${imageUrl}-${index}`}
                        imageUrl={imageUrl}
                        onPress={handleImagePress}
                        style={{
                          image: {
                            width: 250,
                            height: 250,
                            borderRadius: 8,
                            marginVertical: 4,
                          }
                        }}
                      />
                    ))}
                  </View>
                )}
                
                {/* Handle single image directly attached to the message */}
                {item.image && item.image.url && (
                  <View style={{
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginVertical: 8,
                    width: '100%',
                  }}>
                    <ClickableImage
                      imageUrl={item.image.url}
                      onPress={handleImagePress}
                      style={{
                        image: {
                          width: 250,
                          height: 250,
                          borderRadius: 8,
                          marginVertical: 4,
                        }
                      }}
                    />
                  </View>
                )}
                
                {/* Handle legacy single image for backward compatibility */}
                {(hasLegacyImage || forceHasImage) && (
                  <View style={{
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginVertical: 8,
                    width: '100%',
                  }}>
                    <ClickableImage
                      imageUrl={item.image_url}
                      onPress={handleImagePress}
                      style={{
                        image: {
                          width: 250,
                          height: 250,
                          borderRadius: 8,
                          marginVertical: 4,
                        }
                      }}
                    />
                  </View>
                )}
                
                {/* Handle attachment messages with image_url */}
                {isAttachmentMessage && item.image_url && (
                  <View style={{
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginVertical: 8,
                    width: '100%',
                  }}>
                    <ClickableImage
                      imageUrl={item.image_url}
                      onPress={handleImagePress}
                      style={{
                        image: {
                          width: 250,
                          height: 250,
                          borderRadius: 8,
                          marginVertical: 4,
                        }
                      }}
                    />
                  </View>
                )}
              </View>
            </View>
          </View>
          
          {/* Render caption AFTER the images if it exists */}
          {item.content && item.content.trim().length > 0 && (
            <View style={[
              isFromMe ? styles.sentMessageContainer : styles.receivedMessageContainer
            ]}>
              <View style={[
                styles.messageCard, 
                isFromMe ? styles.sentMessage : styles.receivedMessage
              ]}>
                <View style={styles.messageContent}>
                  <Text style={[
                    styles.messageText,
                    isFromMe ? styles.sentMessageText : styles.receivedMessageText
                  ]}>
                    {item.content}
                  </Text>
                </View>
              </View>
            </View>
          )}
        </View>
      );
    }
    
    // Handle normal text messages
    const isFromMe = !item.sent_by_other_user;
    return (
      <View>
        <MessageTimestamp 
          message={item}
          isFromMe={isFromMe}
          styles={styles}
          userTimezone={timeSettings?.timezone || 'America/Denver'}
          show={showTimestamp}
        />
        <View style={isFromMe ? styles.sentMessageContainer : styles.receivedMessageContainer}>
          <View style={[
            styles.messageCard, 
            isFromMe ? styles.sentMessage : styles.receivedMessage
          ]}>
            <View style={styles.messageContent}>
              <Text style={[
                styles.messageText,
                isFromMe ? styles.sentMessageText : styles.receivedMessageText
              ]}>
                {item.content}
              </Text>
            </View>
          </View>
        </View>
      </View>
    );
  }, [navigation, selectedConversationData, timeSettings, hasDraft, draftData, selectedConversation, fetchMessages, messages, handleImagePress]);

  const handleBookingRequest = async (modalData) => {
    try {
      debugLog('MBA2349f87g9qbh2nfv9cg: handleBookingRequest called', {
        conversationId: modalData.conversation_id,
        currentMessageCount: messages.length
      });
      
      const token = await getStorage('userToken');
      
      // First, create the booking request
      const bookingRequestResponse = await axios.post(
        `${API_BASE_URL}/api/bookings/v1/request_booking/`,
        modalData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      debugLog('MBA2349f87g9qbh2nfv9cg: Booking request created', {
        bookingId: bookingRequestResponse.data.booking_id
      });

      // Then, send the booking request message with the booking ID
      const messageResponse = await axios.post(
        `${API_BASE_URL}/api/messages/v1/send_request_booking/`,
        {
          ...modalData,
          booking_id: bookingRequestResponse.data.booking_id
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      debugLog('MBA2349f87g9qbh2nfv9cg: Booking message sent', {
        messageId: messageResponse.data.message_id,
        bookingId: bookingRequestResponse.data.booking_id
      });

      // Add the new message to the messages list
      setMessages(prevMessages => {
        debugLog('MBA2349f87g9qbh2nfv9cg: Adding booking request message to list', {
          beforeLength: prevMessages.length,
          afterLength: prevMessages.length + 1,
          messageId: messageResponse.data.message_id
        });
        
        return [messageResponse.data, ...prevMessages];
      });

      setShowRequestModal(false);
      debugLog('MBA2349f87g9qbh2nfv9cg: handleBookingRequest completed successfully');
    } catch (error) {
      debugLog('MBA2349f87g9qbh2nfv9cg: Error in handleBookingRequest:', error);
      console.error('Error creating booking:', error);
      Alert.alert(
        'Error',
        'Unable to create booking. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  // Add search functionality
  const handleSearch = (text) => {
    setSearchQuery(text);
  };

  // Add a useEffect to filter conversations when searchQuery changes
  useEffect(() => {
    if (!searchQuery) {
      // When search is empty, show all conversations
      setFilteredConversations(conversations);
    } else {
      // Filter conversations based on search text
      const filtered = conversations.filter(conv => {
        const otherParticipantName = conv.participant1_id === CURRENT_USER_ID ? 
          conv.participant2_name : conv.participant1_name;
        const searchName = otherParticipantName || conv.name || conv.other_user_name || '';
        
        return searchName.toLowerCase().includes(searchQuery.toLowerCase()) ||
              (conv.last_message && conv.last_message.toLowerCase().includes(searchQuery.toLowerCase()));
      });
      setFilteredConversations(filtered);
    }
    
    debugLog('MBA5557: Filtering conversations based on search', { 
      searchQuery, 
      totalConversations: conversations.length,
      filteredCount: filteredConversations.length 
    });
  }, [searchQuery, conversations]);

  // Conversation list component
  const renderConversationList = () => {
    // Final double check at render time
    const renderedConversations = userRole === 'professional'
      ? filteredConversations.filter(c => c.is_professional === true)
      : userRole === 'petOwner' || userRole === 'owner'
        ? filteredConversations.filter(c => c.is_professional === false) 
        : filteredConversations;
    
    // Add debug logging right at render time
    debugLog('MBA24u45vn', 'Rendering conversation list', {
      filteredConversationsCount: filteredConversations.length,
      safeConversationsCount: renderedConversations.length,
      conversationsCount: conversations.length,
      currentRole: userRole,
      selectedConversation,
      url: typeof window !== 'undefined' ? window.location.href : 'not-web',
      routeParams: route.params ? JSON.stringify(route.params) : 'none',
      timestamp: Date.now(),
      filteredConversations: renderedConversations.map(c => ({
        id: c.conversation_id,
        is_professional: c.is_professional,
        name: c.other_user_name,
        has_profile_pic: !!c.profile_picture
      }))
    });
    
    return (
      <ConversationList
        conversations={renderedConversations}
        selectedConversation={selectedConversation}
              onSelectConversation={(convId) => {
                  // Only log on initial selection, not re-selections
        if (convId !== selectedConversation) {
          debugLog('MBA24u45vn', 'Conversation selected from list', {
            conversationId: convId,
            previousConversation: selectedConversation,
            url: typeof window !== 'undefined' ? window.location.href : 'not-web',
            timestamp: Date.now()
          });
          
          // Fetch messages for this conversation
          fetchMessages(convId);
          
          // Make sure to update navigation params directly to ensure Navigation component detects change
          if (Platform.OS === 'web' && typeof window !== 'undefined') {
            window.selectedConversationId = convId;
            
            // Update URL to include selectedConversation parameter (this is what we check on reload)
            const currentUrl = new URL(window.location.href);
            currentUrl.searchParams.set('selectedConversation', convId);
            window.history.replaceState({}, '', currentUrl.toString());
          }
          
          // Update navigation params directly
          navigation.setParams({ selectedConversation: convId });
        }
        setSelectedConversation(convId);
      }}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        styles={styles}
        CURRENT_USER_ID={CURRENT_USER_ID}
        getConversationUnreadCount={getConversationUnreadCount}
        markConversationAsRead={markConversationAsRead}
      />
    );
  };

  // Update message header to include profile photo and edit draft button
  const renderMessageHeader = () => (
    <View style={styles.messageHeader}>
      <MessageHeader
        selectedConversationData={selectedConversationData}
        hasDraft={hasDraft}
        draftData={draftData}
        onEditDraft={(draftId) => {
          if (draftId) {
            handleOpenExistingDraft(draftId);
          }
        }}
        styles={styles}
        onCreateBooking={handleCreateBooking}
        onViewPets={handleViewPets}
      />
    </View>
  );

  // Update renderMessageSection to use simplified flexbox layout
  const renderMessageSection = () => {
    if (!selectedConversation) {
      return null;
    }

    return (
      <KeyboardAvoidingView 
        style={styles.mainSection}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {screenWidth > 900 && renderMessageHeader()}
        {/* Messages */}
        <View style={styles.messageSection} className="message-container">
          <View 
            style={styles.messagesContainer} 
            className="messagesContainer"
          >
            {isLoadingMessages ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={styles.loadingText}>Loading messages...</Text>
              </View>
            ) : messages.length === 0 ? (
              <Text style={styles.emptyText}>
                No messages yet, start the conversation!
              </Text>
            ) : (
              <MessageList
                conversationId={selectedConversation}
                messages={messages}
                renderMessage={renderMessage}
                hasMore={hasMore}
                isLoadingMore={isLoadingMore}
                onLoadMore={loadMoreMessages}
                onRefreshMessages={refreshMessages}
                isProfessional={selectedConversationData?.is_professional}
                styles={styles}
                theme={theme}
                className="message-list-component"
                userTimezone={timeSettings?.timezone || 'America/Denver'}
                onScrollStart={(handlerSetter) => {
                  // MessageList will call this with a function that accepts the actual handler
                  handlerSetter(() => {
                    // This is the handler that will be called when scrolling starts
                    if (keyboardDismissHandlerRef.current) {
                      debugLog('MBA8765: Scroll detected, calling keyboard dismiss handler');
                      keyboardDismissHandlerRef.current();
                    }
                  });
                }}
              />
            )}
          </View>
        </View>

        {/* Input Section - Simplified to use flexbox positioning */}
        <MessageInput 
          onScrollStart={(handler) => {
            // Store the keyboard dismiss handler from MessageInput
            keyboardDismissHandlerRef.current = handler;
            debugLog('MBA8765: Registered keyboard dismiss handler from MessageInput');
          }}
          onSendMessage={async (messageContent, imageMessageIds, messageObject, alreadySent) => {
            try {
              // Prevent multiple simultaneous send operations
              if (isSending) {
                debugLog('MBA5511: Send operation already in progress in parent, ignoring duplicate call');
                return;
              }
              
              setIsSending(true);
              
              // If the message was already sent directly through uploadAndSendImageMessage
              if (alreadySent && messageObject) {
                debugLog('MBA5511: Message already sent directly:', {
                  messageId: messageObject.message_id,
                  messageType: messageObject.type_of_message
                });
                
                // Add message to UI without making another API call
                setMessages(prevMessages => [messageObject, ...prevMessages]);
                
                // Update conversation's last message
                setConversations(prev => prev.map(conv => 
                  conv.conversation_id === selectedConversation 
                    ? {
                        ...conv,
                        last_message: messageObject.content || 'Image message',
                        last_message_time: messageObject.timestamp
                      }
                    : conv
                ));
              } 
              // Otherwise, send normally through SendNormalMessage
              else {
                // Add the image message IDs to the request if available
                if (imageMessageIds && imageMessageIds.length > 0) {
                  debugLog('MBA5678: Sending message with images:', {
                    messageContent,
                    imageMessageIds,
                    imageCount: imageMessageIds.length
                  });
                }
                await SendNormalMessage(messageContent, imageMessageIds, messageObject);
              }
              
              setIsSending(false);
            } catch (error) {
              debugLog('MBA5678: Error sending message:', error);
              setIsSending(false);
            }
          }}
          onShowDropdown={(show) => setShowDropdown(show)}
          showDropdown={showDropdown}
          styles={styles}
          screenWidth={screenWidth}
          selectedConversation={selectedConversation}
        />
      </KeyboardAvoidingView>
    );
  };

  // Update the back button handler to better clear URL parameters
  const handleBack = () => {
    // Only log if there's actually a conversation selected
    if (selectedConversation) {
      debugLog('MBA24u45vn', 'Back button pressed', {
        selectedConversation,
        hasConversationData: !!selectedConversationData,
        url: typeof window !== 'undefined' ? window.location.href : 'not-web',
        timestamp: Date.now()
      });
    }
    
    // Set flag to indicate we're intentionally deselecting (to prevent URL param reloading)
    isIntentionallyDeselecting.current = true;
    
    // First clear the URL parameter to prevent it from being re-read
    navigation.setParams({ selectedConversation: undefined });
    
    // Also update URL directly to ensure Navigation component sees the change
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const currentUrl = new URL(window.location.href);
      currentUrl.searchParams.delete('selectedConversation');
      currentUrl.searchParams.delete('conversationId'); // Also clear this for compatibility
      window.history.replaceState({}, '', currentUrl.toString());
      
      // Clear global context variable used by Navigation
      window.selectedConversationId = null;
      
      debugLog('MBA24u45vn', 'Cleared URL parameters in handleBack', {
        oldValue: selectedConversation,
        url_after: currentUrl.toString(),
        timestamp: Date.now()
      });
    }
    
    // Clear the selected conversation state immediately
    setSelectedConversation(null);
    
    // Clear conversation data and messages
    setSelectedConversationData(null);
    setMessages([]);
    
    // Fetch conversations to update the list after going back
    debugLog('MBA24u45vn: Fetching conversations from handleBack');
    fetchConversations();
    
    // Add a timeout to reset the flag as a safety mechanism
    setTimeout(() => {
      if (isIntentionallyDeselecting.current) {
        isIntentionallyDeselecting.current = false;
      }
    }, 500);
  };
  
  // Use static counter to reduce logging frequency
  const renderMobileHeader = () => {
    // We don't need to log mobile header rendering at all
    // This function is called very frequently and doesn't need logging
    
    return (
      <View style={[
        styles.mobileHeader,
        { 
          backgroundColor: theme.colors.surfaceContrast,  // Updated to use surfaceContrast
          marginTop: selectedConversation && screenWidth <= 900 ? 0 : undefined
        }
      ]}>
        <MessageHeader
          selectedConversationData={selectedConversationData}
          hasDraft={hasDraft}
          draftData={draftData}
          onEditDraft={(draftId) => {
            if (draftId) {
              handleOpenExistingDraft(draftId);
            }
          }}
          onBackPress={handleBack} // Use our new handleBack function
          styles={styles}
          isMobile={true}
          onCreateBooking={handleCreateBooking}
          onViewPets={handleViewPets}
        />
      </View>
    );
  };

  // Update renderEmptyState to remove prototype references
  const renderEmptyState = () => (
    <View style={{
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    }}>
      <MaterialCommunityIcons 
        name="message-text-outline" 
        color={theme.colors.placeholder}
        style={{ marginBottom: 16 }}
      />
      <Text style={{
        fontSize: 20,
        fontWeight: 'bold',
        color: theme.colors.text,
        marginBottom: 8,
        textAlign: 'center'
      }}>
        No Messages Yet
      </Text>
      <Text style={{
        fontSize: 16,
        color: theme.colors.placeholder,
        marginBottom: 24,
        textAlign: 'center'
      }}>
        {userRole === 'professional' ? 
          'Create services to start getting bookings and messages from owners' :
          'Search professionals to find services and start messaging'}
      </Text>
      <Button
        mode="contained"
        onPress={() => navigateToFrom(navigation, userRole === 'professional' ? 'ServiceManager' : 'SearchProfessionalsListing', 'MessageHistory')}
        style={{ borderRadius: 8 }}
      >
        {userRole === 'professional' ? 'Create Services' : 'Find Professionals'}
      </Button>
    </View>
  );

  const handleEditDraft = async (bookingId) => {
    debugLog('MBA6428: handleEditDraft called with booking ID:', bookingId);
    
    if (!bookingId) {
      debugLog('MBA6428: Error - No booking ID provided');
      Alert.alert('Error', 'Missing booking information. Please try again.');
      return;
    }
    
    try {
      setIsLoading(true);
      debugLog('MBA6428: Calling createDraftFromBooking API with booking ID:', bookingId);
      
      // Call our new API function to create a draft from the booking
      const response = await createDraftFromBooking(bookingId);
      
      // Check for error in response
      if (response.error) {
        debugLog('MBA6428: Error returned from createDraftFromBooking:', response);
        Alert.alert('Error', response.message || 'Failed to create draft from booking. Please try again.');
        return;
      }
      
      if (response && response.draft_id) {
        debugLog('MBA6428: Draft created successfully:', response);
        
        // Update local state with the new draft info
        setHasDraft(true);
        setDraftData(response.draft_data);
        
        // Use the returned draft_id for opening the booking step modal
        setCurrentBookingId(response.draft_id);
        
        // Close any open modal and open the booking step modal
        setShowDraftConfirmModal(false);
        
        // Add a small delay to ensure modal state is updated
        setTimeout(() => {
          debugLog('MBA6428: Opening BookingStepModal with draft:', response.draft_id);
          setShowBookingStepModal(true);
        }, 100);
      } else {
        debugLog('MBA6428: Error - Invalid response from createDraftFromBooking:', response);
        Alert.alert('Error', 'Failed to create draft from booking. Please try again.');
      }
    } catch (error) {
      debugLog('MBA6428: Error creating draft from booking:', error);
      Alert.alert('Error', 'Failed to create draft from booking. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // New function for opening an existing draft directly
  const handleOpenExistingDraft = (draftId) => {
    debugLog('MBA6428: handleOpenExistingDraft called with draft ID:', draftId);
    
    if (!draftId) {
      debugLog('MBA6428: Error - No draft ID provided');
      Alert.alert('Error', 'Missing draft information. Please try again.');
      return;
    }
    
    try {
      // Set the current booking ID to the provided draft ID
      setCurrentBookingId(draftId);
      
      // Close any open modal and open the booking step modal
      setShowDraftConfirmModal(false);
      
      // Add a small delay to ensure modal state is updated
      setTimeout(() => {
        debugLog('MBA6428: Opening BookingStepModal with existing draft:', draftId);
        setShowBookingStepModal(true);
      }, 100);
    } catch (error) {
      debugLog('MBA6428: Error opening booking modal with draft:', error);
      Alert.alert('Error', 'Failed to open booking draft. Please try again.');
    }
  };

  // Add polling for online status of the other participant
  useEffect(() => {
    if (!selectedConversationData || !selectedConversation) {
      return; // No conversation selected, nothing to poll
    }
    
    const otherUserName = selectedConversationData.other_user_name || 'Unknown user';
    debugLog(`MBA3210: [OTHER USER STATUS] Setting up polling for "${otherUserName}" online status`);
    
    
    return () => {
      debugLog(`MBA3210: [OTHER USER STATUS] Cleaning up polling interval for "${otherUserName}"`);
      // clearInterval(statusPollingInterval);
    };
  }, [selectedConversationData, selectedConversation]);

  useEffect(() => {
    // Clean up on component unmount
    return () => {
      debugLog('MBA3210: MessageHistory unmounting, cleaning up websocket references');
      // No need to explicitly disconnect here - the hook will handle it
    };
  }, []);

  // Replace the existing beforeunload effect that disconnects the WebSocket
  useEffect(() => {
    // When a user signs out or navigates away, make sure to disconnect
    const handleBeforeUnload = () => {
      debugLog('MBA3210: Page unloading, but keeping websocket alive for session restore');
      // Deliberately NOT disconnecting websocket on page unload
      // This was causing message loss when refreshing or switching tabs
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', handleBeforeUnload);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('beforeunload', handleBeforeUnload);
      }
    };
  }, []);

  // Add a useEffect to reset notifications when component mounts
  useEffect(() => {
    // Only reset notifications once when the component mounts
    updateRoute && updateRoute('MessageHistory');
    
    // No need to reset all notifications, individual conversations will be marked as read when selected
    
    // Return cleanup function
    return () => {
      // If needed, add cleanup code here
    };
  }, []); // Empty dependency array to run only once on mount

  // Add a useEffect to handle route updates and message notification resets when component mounts
  useEffect(() => {
    // Tell the notification context we're on the Messages screen
    if (updateRoute) {
      debugLog('MBA4321: Updating route in MessageNotificationContext to MessageHistory');
      updateRoute('MessageHistory');
      
      // Important: DO NOT call resetNotifications() here
      // That was causing all notifications to be cleared when opening MessageHistory
      // Instead, we only mark the selected conversation as read when it's selected
    }
    
    // Return cleanup function
    return () => {
      debugLog('MBA4321: Cleaning up message notification tracking for MessageHistory');
    };
  }, [updateRoute]);
  
  // Add an effect to mark the current conversation as read when selected
  useEffect(() => {
    if (selectedConversation && markConversationAsRead) {
      debugLog(`MBA4321: Marking conversation ${selectedConversation} as read`);
      markConversationAsRead(selectedConversation);
    }
  }, [selectedConversation, markConversationAsRead]);

  // When component initializes, ensure we properly handle any route parameters
  // that specify a conversation to open, but don't reset all notifications
  useEffect(() => {
    if (!initialLoadRef.current) return; // Skip if not initial load
    
    const initializeData = async () => {
      try {
        // Reset states
        setConversations([]);
        setMessages([]);
        setSelectedConversation(null);
        setSelectedConversationData(null);
        setIsLoadingConversations(true);
        setIsLoadingMessages(false);
        setCurrentPage(1);
        setHasMore(true);
        lastViewedConversationRef.current = null;
        
        // Handle parameters first
        let initialConversationId = null;
        
        // First check URL parameters on web
        if (Platform.OS === 'web') {
          const currentUrl = new URL(window.location.href);
          
          // Check both possible parameter names
          let urlConversationId = currentUrl.searchParams.get('selectedConversation');
          
          // If not found, try the alternate parameter name
          if (!urlConversationId) {
            urlConversationId = currentUrl.searchParams.get('conversationId');
          }
          
          if (urlConversationId) {
            initialConversationId = urlConversationId;
            debugLog(`MBA4321: Using conversation ID ${urlConversationId} from URL parameters`);
            
            // Clean up URL parameters to be consistent
            currentUrl.searchParams.delete('conversationId');
            currentUrl.searchParams.delete('selectedConversation');
            
            // Set to the standard parameter name
            currentUrl.searchParams.set('selectedConversation', urlConversationId);
            window.history.replaceState({}, '', currentUrl.toString());
          }
        }
        
        // Next check route params if no URL param was found
        if (!initialConversationId && route.params?.conversationId) {
          initialConversationId = route.params.conversationId;
          debugLog(`MBA4321: Using conversation ID ${initialConversationId} from route parameters`);
          
          // Check if we should open booking creation (coming from Services)
          if (route.params.isProfessional === true) {
            shouldOpenBookingCreationRef.current = true;
          }
        }
        
        debugLog('MBA24u45vn: Fetching conversations from initializeData');
        // Fetch conversations
        const conversationsData = await fetchConversations();
        
        // Set initial selected conversation - either from params or first one
        if (initialConversationId) {
          setSelectedConversation(initialConversationId);
          debugLog(`MBA4321: Setting initially selected conversation to ${initialConversationId}`);
        } else if (Platform.OS === 'web' && screenWidth > 900 && conversationsData?.length > 0) {
          setSelectedConversation(conversationsData[0].conversation_id);
          debugLog(`MBA4321: Auto-selecting first conversation ${conversationsData[0].conversation_id} on desktop`);
        }
        
        // Important: We DON'T mark all conversations as read here
        // Only the selected conversation will be marked as read when it's selected
      } catch (error) {
        console.error('Error initializing MessageHistory:', error);
      } finally {
        initialLoadRef.current = false;
        setIsInitialLoad(false);
      }
    };
    
    initializeData();
    
    return () => {
      debugLog('MBA4321: Cleaning up MessageHistory component');
      lastViewedConversationRef.current = null;
      
      // Clear the global selected conversation tracking
      if (typeof window !== 'undefined') {
        window.selectedConversationId = null;
      }
      
      // IMPORTANT: We no longer disconnect the WebSocket here
      // This allows the connection to persist when navigating away from this screen
    };
  }, []);
  
  // Handle web-specific URL parameters on page reload
  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      // When the page reloads, we need to clear the conversation parameters
      if (window.performance) {
        // This checks specifically for reload events (not initial page load)
        const navigationEntry = window.performance.getEntriesByType('navigation')[0];
        if (navigationEntry && navigationEntry.type === 'reload') {
          debugLog('MBA3210: Page reload detected, clearing conversation parameters from URL');
          
          // Clear all possible URL parameters - handle both parameter names
          const currentUrl = new URL(window.location.href);
          
          // Check for selectedConversation param
          if (currentUrl.searchParams.has('selectedConversation')) {
            currentUrl.searchParams.delete('selectedConversation');
            debugLog('MBA3210: Removed selectedConversation parameter from URL');
          }
          
          // Also check for conversationId param
          if (currentUrl.searchParams.has('conversationId')) {
            currentUrl.searchParams.delete('conversationId');
            debugLog('MBA3210: Removed conversationId parameter from URL');
          }
          
          // And check for isMobile param if needed
          if (currentUrl.searchParams.has('isMobile')) {
            currentUrl.searchParams.delete('isMobile');
            debugLog('MBA3210: Removed isMobile parameter from URL');
          }
          
          // Update the URL without refreshing the page
          window.history.replaceState({}, '', currentUrl.toString());
          debugLog('MBA3210: Updated URL:', currentUrl.toString());
          
          // Reset the selected conversation state
          setSelectedConversation(null);
          setSelectedConversationData(null);
          
          // Clear global tracking variable
          window.selectedConversationId = null;
          
          // Update navigation params directly
          if (navigation && navigation.setParams) {
            navigation.setParams({ 
              selectedConversation: null,
              conversationId: null,
              isMobile: null
            });
          }
        }
      }
      
      // Keep the WebSocket alive on page unload
      const handleBeforeUnload = () => {
        debugLog('MBA3210: Page unloading, but keeping websocket alive for session restore');
        // No longer disconnect WebSocket on page unload
      };
      
      window.addEventListener('beforeunload', handleBeforeUnload);
      
      return () => {
        window.removeEventListener('beforeunload', handleBeforeUnload);
      };
    }
  }, [navigation]);

  // Clear processed messages cache when switching conversations
  useEffect(() => {
    if (selectedConversation) {
      debugLog('MBA2349f87g9qbh2nfv9cg: Clearing processed messages cache for new conversation', {
        conversationId: selectedConversation,
        previousCacheSize: processedPagesRef.current.size,
        previousMessageIdsSize: messageIdsRef.current.size
      });
      
      // Reset our tracking refs when switching conversations
      processedPagesRef.current.clear();
      messageIdsRef.current.clear();
      isLoadingMoreRef.current = false;
      
      debugLog('MBA2349f87g9qbh2nfv9cg: Cache cleared for conversation switch', {
        processedPagesSize: processedPagesRef.current.size,
        messageIdsSize: messageIdsRef.current.size,
        isLoadingMoreRef: isLoadingMoreRef.current
      });
    }
  }, [selectedConversation]);

  // Add state change tracking for debugging
  useEffect(() => {
    debugLog('MBA2u3f89fbno4: [STATE] selectedConversation changed', {
      newValue: selectedConversation,
      timestamp: Date.now()
    });
    
    // Update URL params and navigation state when selectedConversation changes
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      // Update the URL with the selected conversation
      const currentUrl = new URL(window.location.href);
      
      if (selectedConversation) {
        // First clear any existing conversation parameters for consistency
        if (currentUrl.searchParams.has('conversationId')) {
          currentUrl.searchParams.delete('conversationId');
        }
        
        // Set the selectedConversation parameter (match the parameter name used in the URL)
        currentUrl.searchParams.set('selectedConversation', selectedConversation);
        
        // Store selectedConversation in global context for Navigation component
        window.selectedConversationId = selectedConversation;
        
        debugLog('MBA4477: Updated URL with selectedConversation', {
          selectedConversation,
          newUrl: currentUrl.toString()
        });
      } else {
        // Remove both possible parameter names if no conversation is selected
        if (currentUrl.searchParams.has('conversationId')) {
          currentUrl.searchParams.delete('conversationId');
        }
        if (currentUrl.searchParams.has('selectedConversation')) {
          currentUrl.searchParams.delete('selectedConversation');
        }
        
        // Clear global context
        window.selectedConversationId = null;
        
        debugLog('MBA4477: Cleared conversation parameters from URL');
      }
      
      // Update the URL without refreshing the page
      window.history.replaceState({}, '', currentUrl.toString());
      
      // Also update the navigation params directly
      if (navigation && navigation.setParams) {
        navigation.setParams({ selectedConversation });
        
        debugLog('MBA4477: Updated navigation params with selectedConversation', {
          selectedConversation
        });
      }
    }
  }, [selectedConversation, navigation]);

  useEffect(() => {
    debugLog('MBA2u3f89fbno4: [STATE] isSignedIn changed', {
      newValue: isSignedIn,
      timestamp: Date.now()
    });
  }, [isSignedIn]);

  useEffect(() => {
    debugLog('MBA2u3f89fbno4: [STATE] loading changed', {
      newValue: loading,
      timestamp: Date.now()
    });
  }, [loading]);

  useEffect(() => {
    debugLog('MBA2u3f89fbno4: [STATE] screenWidth changed', {
      newValue: screenWidth,
      timestamp: Date.now()
    });
  }, [screenWidth]);

  // Add a function to handle View Profile button click
  const handleViewPets = () => {
    debugLog('MBA3456', 'View Profile button clicked', {
      conversation_id: selectedConversationData?.conversation_id,
      other_user_name: selectedConversationData?.other_user_name
    });
    
    setShowClientPetsModal(true);
  };

  // Add a special effect specifically for Android Chrome keyboard handling

  // Function to ensure the latest message is visible - update to be more thorough
  const ensureLatestMessageVisible = () => {
    // Only run on web
    if (Platform.OS === 'web') {
      // Add a significant bottom padding to the FlatList content container
      setTimeout(() => {
        // Try different selectors to find the FlatList content container
        const selectors = [
          '.messagesContainer .message-list-component > div > div',
          '.messagesContainer .message-list-component > div',
          '.messagesContainer div[data-interactable="true"]',
          '.messagesContainer > *',
        ];
        
        let targetFound = false;
        
        // Try each selector until we find a match
        for (const selector of selectors) {
          const elements = document.querySelectorAll(selector);
          if (elements && elements.length > 0) {
            // Apply padding to ensure messages are visible
            elements.forEach(el => {
              // Use cssText to ensure !important works properly
              el.style.cssText += '; padding-top: 300px !important; margin-top: 300px !important;';
              targetFound = true;
              debugLog('MBA9876: Added padding to element', {
                selector,
                element: el.tagName,
                childCount: el.childElementCount
              });
            });
            
            // If we found a target with this selector, stop trying others
            if (targetFound) break;
          }
        }
        
        // If we couldn't find any suitable container, try a more direct approach but don't log warning
        // This reduces console spam while still trying to fix the issue
        if (!targetFound) {
          // Try applying padding to the message container directly
          const messageContainer = document.querySelector('.messagesContainer');
          if (messageContainer) {
            messageContainer.style.cssText += '; padding-bottom: 300px !important;';
          }
        }
        
        // Also try to force scroll to top of inverted list to show latest message
        const messageList = document.querySelector('.messagesContainer');
        if (messageList) {
          messageList.scrollTop = 0;
          debugLog('MBA9876: Forced scroll to top of message list');
        }
      }, 100); // Decreased timeout for faster response
    }
  };

  // Add an interval to keep checking and fixing the padding
  useEffect(() => {
    if (Platform.OS !== 'web' || !selectedConversation) return;
    
    // Run immediately
    ensureLatestMessageVisible();
    
    // Set up an interval to continuously check and fix
    const intervalId = setInterval(ensureLatestMessageVisible, 500);
    
    // Clean up interval on unmount
    return () => {
      clearInterval(intervalId);
    };
  }, [selectedConversation, messages]);

  // Add this useEffect after the existing ones to directly fix message visibility after sending
  useEffect(() => {
    // Only run this on web
    if (Platform.OS !== 'web' || !selectedConversation) return;
    
    // Function to directly fix message visibility with a direct approach
    const fixMessageVisibility = () => {
      // Target the FlatList directly
      const flatList = document.querySelector('.messagesContainer .message-list-component');
      if (!flatList) return;
      
      // Force scroll to top (latest message) for inverted list
      flatList.scrollTop = 0;
      
      // Get the content container - this is what we need to add padding to
      const contentContainer = flatList.querySelector('div > div');
      if (contentContainer) {
        // Check current padding before applying
        const computedStyle = window.getComputedStyle(contentContainer);
        const currentPaddingTop = parseInt(computedStyle.paddingTop) || 0;
        
        // Only apply if needed
        if (currentPaddingTop < 300) {
          // Add a very large padding to ensure latest message is visible
          contentContainer.style.paddingTop = '300px';
          // Also try margin in case padding is being overridden
          contentContainer.style.marginTop = '300px';
          
          debugLog('MBA9876: Applied direct padding fix to FlatList content container', {
            element: 'content container',
            paddingApplied: '300px',
            marginApplied: '300px'
          });
        }
      }
      
      // Also try to apply padding to all direct children
      const directChildren = flatList.querySelectorAll(':scope > div');
      directChildren.forEach(child => {
        // Check current padding
        const computedStyle = window.getComputedStyle(child);
        const currentPaddingTop = parseInt(computedStyle.paddingTop) || 0;
        
        // Only apply if needed
        if (currentPaddingTop < 300) {
          child.style.paddingTop = '300px';
          child.style.marginTop = '300px';
          
          debugLog('MBA9876: Applied padding to direct child', {
            child: child.className || child.tagName,
            paddingApplied: '300px',
            marginApplied: '300px'
          });
        }
      });
    };
    
    // Run the fix whenever messages change (new message sent or received)
    if (messages.length > 0) {
      // Run immediately
      fixMessageVisibility();
      
      // And after a short delay to ensure the DOM has updated
      setTimeout(fixMessageVisibility, 100);
      setTimeout(fixMessageVisibility, 500);
    }
  }, [messages, selectedConversation]);

  // Add a specific WebInput focus handler to fix message visibility when keyboard opens
  // Improved input focus handler for cross-browser compatibility
  const handleInputFocus = () => {
    if (Platform.OS === 'web') {
      // On mobile browsers, when keyboard opens, force scroll to show latest message
      setTimeout(() => {
        // Scroll the message list to show the latest messages (top for inverted list)
        const messageList = document.querySelector('.messagesContainer');
        if (messageList) {
          messageList.scrollTop = 0;
          debugLog('MBA9876: Forced scroll on input focus to show latest messages');
        }
        
        // For iOS Safari, we need additional handling to avoid the gray space
        // This ensures content doesn't shift weirdly when the keyboard opens
        if (isKeyboardVisible) {
          // Force window scroll to ensure input is visible
          window.scrollTo(0, 0);
          
          // Fix for iOS browsers - scroll input into view
          const inputContainer = document.querySelector('.message-input-container');
          if (inputContainer) {
            // Make sure the input stays visible by forcing a reflow
            inputContainer.style.transform = 'translateZ(0)';
            
            debugLog('MBA9876: Applied iOS input visibility fix');
          }
        }
      }, 150);
    }
  };

  // Add an effect to ensure keyboard handling works properly on iOS
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    
    // Helper function to make adjustments when keyboard is visible
    const adjustForKeyboard = () => {
      // Only run if we have a selected conversation
      if (!selectedConversation) return;
      
      if (isKeyboardVisible) {
        // When keyboard is visible, ensure the input is visible
        const inputContainer = document.querySelector('.message-input-container');
        if (inputContainer) {
          // Ensure the input stays in view
          inputContainer.style.position = 'fixed';
          inputContainer.style.bottom = '0';
          inputContainer.style.left = '0';
          inputContainer.style.right = '0';
          inputContainer.style.zIndex = '1000';
          
          // On iOS, use hardware acceleration to prevent rendering issues
          inputContainer.style.transform = 'translateZ(0)';
          
          // Ensure messages have enough padding to not be hidden behind the input
          const messageContainer = document.querySelector('.messagesContainer');
          if (messageContainer) {
            messageContainer.style.paddingBottom = '80px';
          }
          
          debugLog('MBA9876: [KEYBOARD] Applied keyboard adjustments');
        }
        
        // Force scroll if textarea is focused
        if (document.activeElement && document.activeElement.tagName === 'TEXTAREA') {
          const messageList = document.querySelector('.messagesContainer');
          if (messageList) {
            // For inverted list, scroll to top to see latest messages
            messageList.scrollTop = 0;
          }
        }
      }
    };
    
    // Add event listeners for iOS keyboard detection
    window.addEventListener('focusin', adjustForKeyboard);
    
    // Run once on mount
    adjustForKeyboard();
    
    // Clear the handlers on unmount
    return () => {
      window.removeEventListener('focusin', adjustForKeyboard);
    };
  }, [selectedConversation, isKeyboardVisible]);

  // Add iOS-specific style adjustments
  useLayoutEffect(() => {
    if (Platform.OS !== 'web') return;
    
    // Create a style element with cross-browser compatible styles
    const styleEl = document.createElement('style');
    styleEl.id = 'ios-message-fix-style';
    styleEl.innerHTML = `
      /* Ensure proper message container height and scrolling */
      .messagesContainer {
        -webkit-overflow-scrolling: touch;
        padding-bottom: 80px !important;
      }
      
      /* Fix for inverted FlatList in Safari */
      .message-list-component {
        padding-bottom: 0 !important;
        transform: translateZ(0);
      }
      
      /* Make sure there's enough space at the bottom to not cut off messages */
      .message-list-component > div > div {
        padding-bottom: 100px !important;
      }
      
      /* Fix for iOS keyboard issues */
      .message-input-container {
        transform: translateZ(0);
        z-index: 1000;
      }
    `;
    
    // Add the style to the document head
    document.head.appendChild(styleEl);
    
    debugLog('MBA9876: Added iOS-compatible style fixes', {
      styleId: 'ios-message-fix-style'
    });
    
    // Clean up function
    return () => {
      const existingStyle = document.getElementById('ios-message-fix-style');
      if (existingStyle) {
        existingStyle.remove();
      }
    };
  }, []);
  
  // Add focused cleanup effect for iOS layout issues
  useLayoutEffect(() => {
    if (Platform.OS !== 'web' || !selectedConversation) return;
    
    // Simple function to ensure message list has proper padding
    const ensureMessageListPadding = () => {
      const messageList = document.querySelector('.messagesContainer');
      if (messageList) {
        // Ensure the message container has enough padding at the bottom
        // to accommodate for the fixed input bar
        if (parseInt(messageList.style.paddingBottom || '0') < 80) {
          messageList.style.paddingBottom = '80px';
        }
        
        // Make sure iOS properly renders the scroll container
        messageList.style.WebkitOverflowScrolling = 'touch';
        
        debugLog('MBA9876: [iOS] Ensured message list has proper padding');
      }
    };
    
    // Run immediately
    ensureMessageListPadding();
    
    // And also after a short delay to account for async rendering
    const timeoutId = setTimeout(ensureMessageListPadding, 500);
    
    // Clean up function
    return () => {
      clearTimeout(timeoutId);
    };
  }, [selectedConversation]);
  
  // Add a lightweight effect to ensure iOS scrolling works properly
  useEffect(() => {
    if (Platform.OS !== 'web' || !selectedConversation) return;
    
    // This timeout ensures the message container can scroll properly
    // by adding the -webkit-overflow-scrolling property
    const timeoutId = setTimeout(() => {
      // Apply iOS-specific scrolling property
      const messageContainer = document.querySelector('.messagesContainer');
      if (messageContainer) {
        messageContainer.style.WebkitOverflowScrolling = 'touch';
        debugLog('MBA9876: [iOS] Applied smooth scrolling to message container');
      }
      
      // Make sure input stays in place on iOS
      const inputContainer = document.querySelector('.message-input-container');
      if (inputContainer) {
        // Force hardware acceleration to avoid rendering issues
        inputContainer.style.transform = 'translateZ(0)';
        debugLog('MBA9876: [iOS] Applied hardware acceleration to input container');
      }
    }, 250);
    
    return () => {
      clearTimeout(timeoutId);
    };
  }, [selectedConversation]);

  // Add a loading overlay component at the bottom of the return statement, before any modals
  // Final sanity check right before rendering
  debugLog('MBA3456: FINAL CHECK before rendering UI', {
    conversationsTotal: conversations.length,
    filteredTotal: filteredConversations.length,
    role: userRole,
    originalConversations: conversations.map(c => ({
      id: c.conversation_id,
      is_professional: c.is_professional
    })),
    filteredConversations: filteredConversations.map(c => ({
      id: c.conversation_id,
      is_professional: c.is_professional
    }))
  });
  
  // Ensure no inappropriate conversations are showing - redundant safety check
  const safeFilteredConversations = userRole === 'professional'
    ? filteredConversations.filter(c => c.is_professional === true)
    : userRole === 'petOwner' || userRole === 'owner'
      ? filteredConversations.filter(c => c.is_professional === false) 
      : filteredConversations;
  
  // Refs for resize handling
  const resizeTimeoutRef = useRef(null);
  
  // Track previous width for threshold crossing detection
  const lastWidthRef = useRef(getInitialWidth());
  
  // Add effect to handle screen width changes with debouncing to prevent excessive re-renders
  useEffect(() => {
    // Only run on web platform
    if (Platform.OS !== 'web' || typeof window === 'undefined') {
      return;
    }
    
    const handleScreenWidthChange = () => {
      // Clear any existing timeout
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
      
      // Set a new timeout to debounce the navigation param update
      resizeTimeoutRef.current = setTimeout(() => {
        // Only update if we have a selected conversation
        if (selectedConversation && typeof window !== 'undefined') {
          const currentWidth = window.innerWidth;
          const lastWidth = lastWidthRef.current;
          const isMobile = currentWidth <= 900;
          const wasMobile = lastWidth <= 900;
          
          // Only update if crossing the mobile/desktop threshold to avoid unnecessary API calls
          if (isMobile !== wasMobile) {
            // Update the navigation params to ensure Navigation component detects the change
            navigation.setParams({ 
              selectedConversation: selectedConversation,
              isMobile: isMobile
            });
            
            debugLog('MBA4477: Updated navigation params after crossing width threshold', {
              selectedConversation,
              previousWidth: lastWidth,
              currentWidth,
              isMobile
            });
            
            // Update the last width reference
            lastWidthRef.current = currentWidth;
          }
        }
      }, 500); // 500ms debounce (increased from 200ms)
    };
    
    // Add resize event listener
    window.addEventListener('resize', handleScreenWidthChange);
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', handleScreenWidthChange);
      
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
    };
  }, [selectedConversation, navigation]);
  
  // Direct solution for Brave/DuckDuckGo overlay issues
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    
    // Brave/DuckDuckGo mobile detection attempt
    const userAgent = navigator.userAgent.toLowerCase();
    const isBrave = userAgent.includes('brave') || (navigator.brave && navigator.brave.isBrave && navigator.brave.isBrave.name === 'isBrave');
    const isDuckDuckGo = userAgent.includes('duckduckgo');
    const isMobile = userAgent.includes('iphone') || userAgent.includes('ipad') || userAgent.includes('mobile');

    // Create a more aggressive CSS fix
    const styleEl = document.createElement('style');
    styleEl.id = 'brave-duckduckgo-fix';
    styleEl.innerHTML = `
      /* Target CSS fix specifically for mobile */
      @media (max-width: 900px) {
        /* Fix input container with !important flags to override browser styles */
        .message-input-container, .inputSection {
          background-color: #FFFFFF !important;
          background: #FFFFFF !important;
          border-top: 1px solid #ECECEC !important;
          position: relative !important;
          z-index: 999 !important;
          bottom: 0 !important;
          left: 0 !important;
          right: 0 !important;
          margin: 0 !important;
          padding: 8px !important;
        }
        
        /* Aggressively remove any translucent overlays */
        .messagesContainer::after,
        .inputSection::after,
        .message-input-container::after,
        .messagesContainer::before,
        .inputSection::before,
        .message-input-container::before,
        .mainSection::after,
        .mainSection::before {
          display: none !important;
          opacity: 0 !important;
          content: none !important;
          visibility: hidden !important;
        }
        
        /* Force white background on containers */
        html, body, #root, .mainSection, .messageSection, .messagesContainer {
          background-color: #FFFFFF !important;
        }
        
        /* Ensure message input stays on top */
        .message-input-container textarea,
        .message-input-container input {
          position: relative !important;
          z-index: 1000 !important;
          opacity: 1 !important;
          visibility: visible !important;
        }
      }
    `;
    
    // Add style to document
    document.head.appendChild(styleEl);
    
    // For Brave/DuckDuckGo on mobile, add extra fix
    if ((isBrave || isDuckDuckGo || true) && isMobile) {
      // Wait for DOM to be fully loaded
      setTimeout(() => {
        // Direct DOM fix
        const fixGreySpace = () => {
          // Fix input container
          const inputContainer = document.querySelector('.message-input-container');
          if (inputContainer) {
            // Make sure input is visible
            inputContainer.style.backgroundColor = '#FFFFFF';
            inputContainer.style.position = 'relative';
            inputContainer.style.zIndex = '999';
            inputContainer.style.borderTop = '1px solid #ECECEC';
            
            // Fix parent containers
            const inputSection = document.querySelector('.inputSection');
            if (inputSection) {
              inputSection.style.backgroundColor = '#FFFFFF';
              inputSection.style.position = 'relative';
              inputSection.style.zIndex = '998';
            }
          }
          
          // Fix message container
          const messageContainer = document.querySelector('.messagesContainer');
          if (messageContainer) {
            messageContainer.style.backgroundColor = '#FFFFFF';
          }
        };
        
        // Run fix
        fixGreySpace();
        
        // Run again after slight delay
        setTimeout(fixGreySpace, 100);
        
        // Run on resize or orientation change
        window.addEventListener('resize', fixGreySpace);
        window.addEventListener('orientationchange', fixGreySpace);
        
        // Run on input focus (when keyboard appears)
        document.addEventListener('focusin', (e) => {
          if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') {
            setTimeout(fixGreySpace, 100);
          }
        });
      }, 500);
      
      // Return cleanup function
      return () => {
        window.removeEventListener('resize', () => {});
        window.removeEventListener('orientationchange', () => {});
        document.removeEventListener('focusin', () => {});
        
        const existingStyle = document.getElementById('brave-duckduckgo-fix');
        if (existingStyle) {
          existingStyle.remove();
        }
      };
    } else {
      // Clean up for non-mobile browsers
      return () => {
        const existingStyle = document.getElementById('brave-duckduckgo-fix');
        if (existingStyle) {
          existingStyle.remove();
        }
      };
    }
  }, []);
  
  // A ref to track if we've already processed a specific navigation timestamp
  const processedNavigationTimestampsRef = useRef(new Set());
  
  // Just after useState declarations, add one debug log for route params
  useEffect(() => {
    if (route.params?.conversationId) {
      debugLog('MBA24u45vn', 'Route params detected', {
        conversationId: route.params.conversationId,
        otherUserName: route.params.otherUserName,
        timestamp: route.params._timestamp,
        has_fullConversationData: !!route.params.fullConversationData
      });
      
      // Only process this useEffect if:
      // 1. We have a recent timestamp (likely from ProfessionalServicesModal)
      // 2. We have fullConversationData (confirms it's from ProfessionalServicesModal)
      // 3. We haven't already processed this exact timestamp
      // 4. This isn't a screen resize event
      const hasRecentTimestamp = route.params._timestamp && 
                               (Date.now() - route.params._timestamp < 10000);
      const isFromProfessionalModal = !!route.params.fullConversationData;
      const hasProcessedThisTimestamp = route.params._timestamp && 
                                      processedNavigationTimestampsRef.current.has(route.params._timestamp);
      
      // Check if this is a screen resize event
      // Screen resize typically changes isMobile param but keeps the same timestamp
      const isScreenResizeEvent = route.params.isMobile !== undefined && 
                                !hasRecentTimestamp;
      
      debugLog('MBA24u45vn', 'Checking if we should fetch based on navigation source', {
        hasRecentTimestamp,
        isFromProfessionalModal,
        hasProcessedThisTimestamp,
        isScreenResizeEvent,
        currentTimestamp: Date.now(),
        navigationTimestamp: route.params._timestamp,
        isMobile: route.params.isMobile
      });
      
      // Only trigger fetch for new navigations from ProfessionalServicesModal
      // Skip if this is a screen resize event
      if (hasRecentTimestamp && isFromProfessionalModal && !hasProcessedThisTimestamp && 
          !isScreenResizeEvent && !isFetchingConversationsRef.current) {
        debugLog('MBA24u45vn', 'Triggering fetch based on navigation from ProfessionalServicesModal', {
          conversationId: route.params.conversationId,
          currentConversation: selectedConversation,
          timestamp: Date.now()
        });
        
        // Mark this timestamp as processed to prevent duplicate processing
        if (route.params._timestamp) {
          processedNavigationTimestampsRef.current.add(route.params._timestamp);
          
          // Clean up old timestamps to prevent memory leaks
          setTimeout(() => {
            processedNavigationTimestampsRef.current.delete(route.params._timestamp);
          }, 10000);
        }
        
        // Set the selected conversation first
        setSelectedConversation(route.params.conversationId);
        
        // Fetch conversations to update the list
        fetchConversations().then(data => {
          if (data && Array.isArray(data)) {
            debugLog('MBA24u45vn', 'Conversations fetched from ProfessionalServicesModal navigation', {
              conversationCount: data.length,
              conversationId: route.params.conversationId,
              found: !!data.find(c => c.conversation_id === route.params.conversationId)
            });
            
            // Fetch messages for this conversation
            fetchMessages(route.params.conversationId);
          }
        });
      }
    }
  }, [route.params]);
  
  return (
    <View style={[
      styles.container,
      screenWidth <= 900 && selectedConversation && styles.mobileContainer,
      { marginLeft: screenWidth > 900 ? (isCollapsed ? 70 : 250) : 0 },
    ]}>
      {isLoadingConversations ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={{ marginTop: 16, color: theme.colors.placeholder }}>Loading conversations...</Text>
        </View>
      ) : safeFilteredConversations.length > 0 ? (
        <View style={styles.contentContainer}>
          {screenWidth <= 900 ? (
            selectedConversation ? (
              <View style={styles.mobileMessageView}>
                {renderMobileHeader()}
                {renderMessageSection()}
              </View>
            ) : (
              renderConversationList()
            )
          ) : (
            <>
              {renderConversationList()}
              {renderMessageSection()}
            </>
          )}
        </View>
      ) : (
        renderEmptyState()
      )}
      
      {/* Loading overlay for draft creation */}
      {isLoading && (
        <View style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.4)',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <View style={{
            backgroundColor: theme.colors.surface,
            borderRadius: 12,
            padding: 24,
            alignItems: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 3.84,
            elevation: 5,
          }}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={{ marginTop: 16, color: theme.colors.text, fontFamily: theme.fonts.regular.fontFamily }}>
              Creating draft from booking...
            </Text>
          </View>
        </View>
      )}
      
      {/* <RequestBookingModal
        visible={showRequestModal}
        onClose={() => setShowRequestModal(false)}
        onSubmit={handleBookingRequest}
        conversationId={selectedConversation}
      /> */}

      <BookingStepModal
        visible={showBookingStepModal}
        onClose={() => {
          setShowBookingStepModal(false);
          setCurrentBookingId(null);
          
          // Refresh message data when modal is closed to get latest draft status
          if (selectedConversation) {
            debugLog('MBA2349f87g9qbh2nfv9cg: Refreshing message data after closing BookingStepModal');
            fetchMessages(selectedConversation, 1);
          }
        }}
        navigation={navigation}
        bookingId={currentBookingId}
        onComplete={(bookingData) => {
          debugLog('MBA6428: Booking completed:', bookingData);
          debugLog('MBA6428: New booking message:', bookingData.message);
          debugLog('MBA6428: Message metadata:', bookingData.message?.metadata);
          debugLog('MBA6428: Is this an update?', bookingData.isUpdate);
          
          // Handle error case
          if (bookingData.error) {
            Alert.alert(
              'Error',
              bookingData.errorMessage || 'Failed to process booking. Please try again.'
            );
            
            // Close the modal and clean up
            setShowBookingStepModal(false);
            setCurrentBookingId(null);
            
            // Refresh message data to get latest draft status
            if (selectedConversation) {
              debugLog('MBA2349f87g9qbh2nfv9cg: Refreshing message data after booking error');
              fetchMessages(selectedConversation, 1);
            }
            
            return;
          }
          
          // Add the new booking message to the messages list
          if (bookingData.message) {
            debugLog('MBA2349f87g9qbh2nfv9cg: Adding booking completion message to list', {
              messageId: bookingData.message.message_id,
              currentMessageCount: messages.length
            });
            
            setMessages(prevMessages => {
              const updatedMessages = [bookingData.message, ...prevMessages];
              debugLog('MBA2349f87g9qbh2nfv9cg: Booking message added to list', {
                oldLength: prevMessages.length,
                newLength: updatedMessages.length
              });
              return updatedMessages;
            });
            
            // Update conversation's last message with appropriate text
            const lastMessageText = bookingData.isUpdate 
              ? "Updated Booking Request" 
              : "Approval Request";
              
            setConversations(prev => prev.map(conv => 
              conv.conversation_id === selectedConversation 
                ? {
                    ...conv,
                    last_message: lastMessageText,
                    last_message_time: bookingData.message.timestamp
                  }
                : conv
            ));
          }
          
          // Update draft state since the draft is deleted after booking creation
          setHasDraft(false);
          setDraftData(null);
          
          // Close the modal and clean up
          setShowBookingStepModal(false);
          setCurrentBookingId(null);
          
          // Refresh message data to get latest draft status
          if (selectedConversation) {
            debugLog('MBA2349f87g9qbh2nfv9cg: Refreshing message data after successful booking completion');
            fetchMessages(selectedConversation, 1);
          }

          // Show success message to the user
          const successMessage = bookingData.isUpdate
            ? "Booking update request sent successfully!"
            : "Booking request sent successfully!";
          
          Alert.alert("Success", successMessage);
        }}
      />

      <ClientPetsModal
        visible={showClientPetsModal}
        onClose={() => setShowClientPetsModal(false)}
        conversation={{
          id: selectedConversationData?.conversation_id
        }}
        otherUserProfilePhoto={selectedConversationData?.profile_picture}
        otherUserName={selectedConversationData?.other_user_name}
        onCreateBooking={handleCreateBooking}
      />

      <DraftConfirmationModal
        visible={showDraftConfirmModal}
        onClose={() => setShowDraftConfirmModal(false)}
        onContinueExisting={handleContinueExisting}
        onCreateNew={handleCreateNew}
      />
      
      {/* Image Viewer Modal */}
      <ImageViewer
        visible={isImageViewerVisible}
        imageUrl={selectedImageUrl}
        onClose={closeImageViewer}
      />
    </View>
  );
};

export default MessageHistory;

