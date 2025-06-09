import React, { useState, useCallback, useRef, useEffect, useContext, useMemo, useLayoutEffect } from 'react';
import { View, StyleSheet, Platform, SafeAreaView, StatusBar, Text, TouchableOpacity, Dimensions, Alert, ActivityIndicator, Image, TextInput, BackHandler } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useTheme, Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../styles/theme';
import { AuthContext, getStorage, setStorage, debugLog } from '../context/AuthContext';
import RequestBookingModal from '../components/RequestBookingModal';
import BookingStepModal from '../components/BookingStepModal';
import { CURRENT_USER_ID } from '../data/mockData';
import { useNavigation } from '@react-navigation/native';
import { API_BASE_URL } from '../config/config';
import axios from 'axios';
import BookingMessageCard from '../components/BookingMessageCard';
import { formatOccurrenceFromUTC } from '../utils/time_utils';
import DraftConfirmationModal from '../components/DraftConfirmationModal';
import useWebSocket from '../hooks/useWebSocket';
import MessageNotificationContext from '../context/MessageNotificationContext';
import { getConversationMessages, createDraftFromBooking, getConversations, sendDebugLog, logInputEvent } from '../api/API';
import { navigateToFrom } from '../components/Navigation';
import { applyViewportFix } from '../utils/viewport-fix';

// Import our new components
import MessageList from '../components/Messages/MessageList';
import ConversationList from '../components/Messages/ConversationList';
import MessageInput from '../components/Messages/MessageInput';
import MessageHeader from '../components/Messages/MessageHeader';
import { useMessageLogic } from '../components/Messages/useMessageLogic';
import { createMessageStyles } from '../components/Messages/styles';
import ClientPetsModal from '../components/ClientPetsModal';

const MessageHistory = ({ navigation, route }) => {
  // IMPORTANT: React hooks rules require that hooks are called in the same order
  // on every render. Never put hooks inside conditional blocks or early returns.
  // Always declare all hooks at the top level of the component.
  
  const { colors } = useTheme();
  const { screenWidth, isCollapsed, isSignedIn, loading } = useContext(AuthContext);
  const styles = createMessageStyles(screenWidth, isCollapsed);
  
  // Add loading states
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [selectedConversationData, setSelectedConversationData] = useState(null);
  
  // Move these state declarations before the useEffect that uses them
  const [messages, setMessages] = useState([]);
  const [isSending, setIsSending] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const { is_DEBUG, is_prototype, isApprovedProfessional, userRole, timeSettings } = useContext(AuthContext);
  const [conversations, setConversations] = useState([]);
  const [filteredConversations, setFilteredConversations] = useState([]);
  
  // Track whether we're intentionally deselecting
  const isIntentionallyDeselecting = useRef(false);
  
  // Add state for keyboard visibility
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const keyboardHeightRef = useRef(0);
  
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
  const actualViewportHeightRef = useRef(null);
  const inputContainerHeightRef = useRef(0);
  const isAndroidChromeRef = useRef(false);
  
  // No viewport fix needed, we're using pure flexbox

  // Add a ref to track if conversations fetch is already in progress
  const isFetchingConversationsRef = useRef(false);

  // Add a ref to track if messages fetch is already in progress for specific conversations
  const isFetchingMessagesRef = useRef(new Set());

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

  // Add code to attach keyboard detection event for better handling in MessageHistory component root
  useEffect(() => {
    if (Platform.OS === 'web' && isAndroidChromeRef.current) {
      // Setup a global keyboard visibility tracker
      const detectKeyboard = () => {
        // Use visualViewport API to detect keyboard
        if (window.visualViewport) {
          const keyboardHeight = window.innerHeight - window.visualViewport.height;
          const keyboardVisible = keyboardHeight > 100;
          
          // Log keyboard visibility changes
          debugLog('MBA9876: [KEYBOARD] Global keyboard visibility check', {
            keyboardHeight,
            keyboardVisible,
            visualViewportHeight: window.visualViewport.height,
            innerHeight: window.innerHeight
          });
          
          // Apply CSS classes to document for keyboard visibility
          if (keyboardVisible) {
            document.documentElement.classList.add('keyboard-visible');
            // Force bottom positioning for input container
            setTimeout(() => {
              window.scrollTo(0, document.body.scrollHeight);
            }, 50);
          } else {
            document.documentElement.classList.remove('keyboard-visible');
          }
        }
      };
      
      // Add visualViewport event listener
      if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', detectKeyboard);
        
        // Run initial detection
        detectKeyboard();
        
        return () => {
          window.visualViewport.removeEventListener('resize', detectKeyboard);
          document.documentElement.classList.remove('keyboard-visible');
        };
      }
    }
  }, []);

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
      
      // Refetch conversations for the new role
      fetchConversations();
    }
  }, [userRole, isSignedIn]);

  useEffect(() => {
    debugLog('MBA9876: [VIEWPORT] useEffect running', {
      timestamp: Date.now(),
      screenWidth,
      isWebMobile: Platform.OS === 'web' && screenWidth <= 900
    });
    
    if (Platform.OS === 'web' && screenWidth <= 900) {
      // Detect Android Chrome once at initialization
      if (typeof navigator !== 'undefined') {
        isAndroidChromeRef.current = /Chrome/i.test(navigator.userAgent) && 
                                     /Android/i.test(navigator.userAgent);
        
        debugLog('MBA9876: [BROWSER] Browser detection', {
          userAgent: navigator.userAgent,
          isAndroidChrome: isAndroidChromeRef.current
        });

        // Add mobile-only CSS for Android Chrome
        if (isAndroidChromeRef.current) {
          // Create a style tag for our Android Chrome specific CSS
          const styleTag = document.createElement('style');
          styleTag.id = 'android-chrome-fixes';
          styleTag.innerHTML = `
            /* Android Chrome keyboard fixes */
            body.keyboard-open {
              height: 100% !important;
              overflow: hidden !important;
              position: fixed !important;
              width: 100% !important;
            }
            
            .message-input-container {
              background-color: white;
            }
            
            .message-input-container.keyboard-open {
              position: fixed !important;
              bottom: 0 !important;
              left: 0 !important;
              right: 0 !important;
              z-index: 1000 !important;
              margin-bottom: 0 !important;
              padding-bottom: 0 !important;
              transform: translateZ(0) !important;
            }
            
            .message-container.keyboard-open {
              padding-bottom: 60px !important;
              height: calc(100vh - 60px) !important;
              overflow-y: auto !important;
            }
            
            textarea:focus {
              /* Prevent browser from zooming on focus */
              font-size: 16px !important;
            }
          `;
          document.head.appendChild(styleTag);
          
          // Clean up the style tag when component unmounts
          return () => {
            const existingStyle = document.getElementById('android-chrome-fixes');
            if (existingStyle) {
              existingStyle.remove();
            }
          };
        }
      }
    
      const updateViewportHeight = () => {
        // Get the actual viewport height (works better than 100vh on mobile)
        const vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
        const newHeight = window.innerHeight;
        
        debugLog('MBA9876: [VIEWPORT] updateViewportHeight called', {
          timestamp: Date.now(),
          newHeight,
          previousHeight: actualViewportHeightRef.current,
          vh,
          currentActiveElement: document.activeElement?.tagName
        });
        
        actualViewportHeightRef.current = newHeight;
      };

      // Mobile keyboard handling - completely revised approach
      const handleResize = () => {
        debugLog('MBA9876: [VIEWPORT] handleResize called', {
          timestamp: Date.now(),
          innerHeight: window.innerHeight,
          activeElement: document.activeElement?.tagName,
          visualViewport: window.visualViewport?.height,
          documentHeight: document.documentElement.clientHeight,
          screenHeight: window.screen.height
        });
        
        updateViewportHeight();
        
        // Use visualViewport API if available (better for Android Chrome)
        if (window.visualViewport) {
          // For Android Chrome, calculate keyboard height differently
          let keyboardHeight;
          
          if (isAndroidChromeRef.current) {
            // For Android Chrome, use the difference between window.innerHeight and visualViewport.height
            // This is more reliable than using screen.height on Android
            keyboardHeight = window.innerHeight - window.visualViewport.height;
            
            // On some Android devices, we need to account for URL bar
            if (document.documentElement.clientHeight > window.innerHeight) {
              // Adjust for URL bar height
              const urlBarHeight = document.documentElement.clientHeight - window.innerHeight;
              keyboardHeight = Math.max(0, keyboardHeight - urlBarHeight);
            }
          } else {
            // For other browsers, use the original calculation
            keyboardHeight = window.screen.height - window.visualViewport.height;
          }
          
          // Only consider keyboard open if height is significant
          keyboardHeightRef.current = keyboardHeight > 100 ? keyboardHeight : 0;
          
          debugLog('MBA9876: [KEYBOARD] Detected keyboard height:', {
            keyboardHeight: keyboardHeightRef.current,
            screenHeight: window.screen.height,
            visualViewportHeight: window.visualViewport.height,
            innerHeight: window.innerHeight,
            clientHeight: document.documentElement.clientHeight,
            isKeyboardOpen: keyboardHeight > 100,
            isAndroidChrome: isAndroidChromeRef.current
          });
          
          // Apply direct style to input container if we have a keyboard
          const inputContainer = document.querySelector('.message-input-container');
          if (inputContainer) {
            if (keyboardHeight > 100) {
              // Keyboard is open - stick input to keyboard
              inputContainer.style.position = 'fixed';
              inputContainer.style.bottom = '0px';
              inputContainer.style.left = '0px';
              inputContainer.style.right = '0px';
              inputContainer.style.zIndex = '1000';
              
              // Explicitly prevent any margin that might create space
              inputContainer.style.marginBottom = '0px';
              
              // Force the browser to recalculate layout
              inputContainer.style.transform = 'translateZ(0)';
              
              // Save the height for message container calculations
              inputContainerHeightRef.current = inputContainer.offsetHeight;
              
              // Adjust the message container to make room for fixed input
              const messageContainer = document.querySelector('.message-container');
              if (messageContainer) {
                messageContainer.style.paddingBottom = `${inputContainerHeightRef.current}px`;
              }
              
              // For Android Chrome, we need additional handling
              if (isAndroidChromeRef.current) {
                // Prevent entire page from scrolling
                document.body.style.overflow = 'hidden';
                document.documentElement.style.overflow = 'hidden';
                
                // Add a small delay to ensure proper positioning after keyboard is fully visible
                setTimeout(() => {
                  // For Chrome on Android, we need to force the input into view
                  if (document.activeElement && document.activeElement.tagName === 'TEXTAREA') {
                    // Scroll to bottom of page to ensure input is visible
                    window.scrollTo(0, document.body.scrollHeight);
                    
                    // If input is still not visible enough, scroll it into view
                    const inputRect = document.activeElement.getBoundingClientRect();
                    const viewportHeight = window.visualViewport.height;
                    
                    if (inputRect.bottom > viewportHeight) {
                      document.activeElement.scrollIntoView(false);
                    }
                    
                    debugLog('MBA9876: [KEYBOARD] Android Chrome positioning adjustment', {
                      inputBottom: inputRect.bottom,
                      viewportHeight: viewportHeight,
                      needsExtraScroll: inputRect.bottom > viewportHeight
                    });
                  }
                }, 100);
              }
              
              debugLog('MBA9876: [KEYBOARD] Fixed input to bottom with keyboard open', {
                inputHeight: inputContainerHeightRef.current,
                browser: navigator.userAgent
              });
            } else {
              // Keyboard is closed - reset positioning
              inputContainer.style.position = '';
              inputContainer.style.bottom = '';
              inputContainer.style.left = '';
              inputContainer.style.right = '';
              inputContainer.style.zIndex = '';
              inputContainer.style.marginBottom = '';
              inputContainer.style.transform = '';
              
              // Reset message container padding
              const messageContainer = document.querySelector('.message-container');
              if (messageContainer) {
                messageContainer.style.paddingBottom = '';
              }
              
              // Reset body overflow for Android Chrome
              if (isAndroidChromeRef.current) {
                document.body.style.overflow = '';
                document.documentElement.style.overflow = '';
              }
              
              debugLog('MBA9876: [KEYBOARD] Reset input positioning with keyboard closed');
            }
          }
        }
        
        // Fix for mobile Chrome keyboard issues
        if (document.activeElement && document.activeElement.tagName === 'TEXTAREA') {
          debugLog('MBA9876: [VIEWPORT] Found active textarea, scheduling scroll', {
            timestamp: Date.now()
          });
          
          // Small delay to allow keyboard to settle
          setTimeout(() => {
            debugLog('MBA9876: [VIEWPORT] Executing scrollIntoView', {
              timestamp: Date.now(),
              stillActive: document.activeElement?.tagName === 'TEXTAREA'
            });
            
            if (document.activeElement && document.activeElement.tagName === 'TEXTAREA') {
              // For Android Chrome, use a different scrolling approach
              if (isAndroidChromeRef.current) {
                window.scrollTo(0, document.body.scrollHeight);
              } else {
                document.activeElement.scrollIntoView({ 
                  behavior: 'smooth', 
                  block: 'center' 
                });
              }
            }
          }, 100);
        }
      };

      updateViewportHeight();
      
      // Use visualViewport API for more accurate keyboard detection on Android
      if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', handleResize);
        window.visualViewport.addEventListener('scroll', handleResize);
      } else {
        // Fallback to window resize events
        window.addEventListener('resize', handleResize);
      }
      
      window.addEventListener('orientationchange', updateViewportHeight);
      
      // Android Chrome gray space fix
      const handleFocusOut = () => {
        debugLog('MBA9876: [VIEWPORT] handleFocusOut called - fixing gray space', {
          timestamp: Date.now()
        });
        
        // Fix gray space on Android Chrome when keyboard closes
        setTimeout(() => {
          window.scrollTo(0, 0);
          
          // Reset any fixed positioning on input
          const inputContainer = document.querySelector('.message-input-container');
          if (inputContainer) {
            inputContainer.style.position = '';
            inputContainer.style.bottom = '';
            
            // Reset message container padding
            const messageContainer = document.querySelector('.message-container');
            if (messageContainer) {
              messageContainer.style.paddingBottom = '';
            }
          }
          
          debugLog('MBA9876: [VIEWPORT] Gray space fix - scrolled to top');
        }, 150);
      };
      
      window.addEventListener('focusout', handleFocusOut);

      return () => {
        if (window.visualViewport) {
          window.visualViewport.removeEventListener('resize', handleResize);
          window.visualViewport.removeEventListener('scroll', handleResize);
        } else {
          window.removeEventListener('resize', handleResize);
        }
        window.removeEventListener('orientationchange', updateViewportHeight);
        window.removeEventListener('focusout', handleFocusOut);
      };
    }
  }, [screenWidth]);

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
  
  // MAIN INITIALIZATION - Keep only one, safer initialization effect  
  useEffect(() => {
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
    
    if (!needsInitialization) {
      debugLog('MBA1111 MessageHistory: Already initialized with conversations, skipping re-init');
      return;
    }

    debugLog('MBA1111 MessageHistory: Starting initialization for signed in user');
    
    const initializeData = async () => {
      try {
        // Mark as initialized IMMEDIATELY to prevent race conditions
        initialLoadRef.current = false;
        
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
          const urlConversationId = currentUrl.searchParams.get('conversationId');
          
          // Clear URL parameters
          if (currentUrl.searchParams.has('conversationId')) {
            currentUrl.searchParams.delete('conversationId');
            window.history.replaceState({}, '', currentUrl.toString());
            debugLog('MBA9999: Cleared URL parameters on initial load');
          }

          // If we have a conversation ID in URL, we'll use that instead of auto-selecting
          if (urlConversationId) {
            const conversationsData = await fetchConversations();
            setSelectedConversation(urlConversationId);
            return;
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

        // Normal initialization - fetch conversations once
        debugLog('MBA1111 About to fetch conversations for initialization');
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
        if (currentUrl.searchParams.has('conversationId')) {
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

  // Effect to update selected conversation data when conversations are loaded
  useEffect(() => {
    if (!selectedConversation || !isSignedIn) {
      debugLog('MBA98765 Skipping conversation data update - no conversation or not signed in');
      return;
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
      // If we have a selected conversation but it's not in the list,
      // we should fetch conversations again
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
    
    const prevWidth = prevScreenWidthRef.current;
    const hasWidthCrossedThreshold = 
      (prevWidth <= 900 && screenWidth > 900) || 
      (prevWidth > 900 && screenWidth <= 900);

    if (is_DEBUG) {
      console.log('MBA98765 Screen width change:', {
        prev: prevWidth,
        current: screenWidth,
        crossedThreshold: hasWidthCrossedThreshold
      });
    }

    prevScreenWidthRef.current = screenWidth;

    // Only handle width threshold crossing
    if (hasWidthCrossedThreshold) {
      if (screenWidth > 900 && conversations.length > 0 && !selectedConversation) {
        if (is_DEBUG) {
          console.log('MBA98765 Auto-selecting first conversation on width change');
        }
        setSelectedConversation(conversations[0].conversation_id);
      }
    }
  }, [screenWidth, isSignedIn]);

  // Add effect to filter conversations based on user role
  useEffect(() => {
    if (!conversations || conversations.length === 0) return;
    
    debugLog('MBA3456: Filtering conversations by role', {
      currentRole: userRole,
      totalConversations: conversations.length,
      conversationDetails: conversations.map(c => ({
        id: c.conversation_id,
        is_professional: c.is_professional,
        other_user_name: c.other_user_name
      }))
    });
    
    // Filter conversations based on the role from context
    const filteredByRole = conversations.filter(conv => {
      // For professional role, show only conversations where is_professional is true
      if (userRole === 'professional') {
        debugLog('MBA3456: Filtering for professional role', {
          conversation_id: conv.conversation_id,
          is_professional: conv.is_professional,
          should_include: conv.is_professional === true
        });
        return conv.is_professional === true;
      }
      // For pet owner role, show only conversations where is_professional is false
      else if (userRole === 'petOwner' || userRole === 'owner') {
        debugLog('MBA3456: Filtering for pet owner role', {
          conversation_id: conv.conversation_id,
          is_professional: conv.is_professional,
          should_include: conv.is_professional === false
        });
        return conv.is_professional === false;
      }
      // If no role specified, show all conversations (fallback)
      return true;
    });
    
    debugLog('MBA3456: Filtered conversations result', {
      originalCount: conversations.length,
      filteredCount: filteredByRole.length,
      currentRole: userRole,
      filteredConversations: filteredByRole.map(c => ({
        id: c.conversation_id,
        is_professional: c.is_professional
      }))
    });
    
    // Update the filteredConversations state
    setFilteredConversations(filteredByRole);
    
    // Auto-select logic for desktop view
    if (Platform.OS === 'web' && screenWidth > 900) {
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
              last_message_time: sortedConversations[0].last_message_time,
              other_user_name: sortedConversations[0].other_user_name
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
  }, [conversations, userRole, screenWidth, selectedConversation]);

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

  // Fetch conversations 
  const fetchConversations = async () => {
    // Get stack trace to see where this is being called from
    const stackTrace = new Error().stack;
    
    // Prevent duplicate fetches
    if (isFetchingConversationsRef.current) {
      debugLog('MBA3456: Conversations fetch already in progress, skipping duplicate call', {
        caller: stackTrace.split('\n')[2]
      });
      return conversations; // Return existing conversations if available
    }

    try {
      isFetchingConversationsRef.current = true;
      setIsLoadingConversations(true);
      debugLog('MBA3456: Fetching conversations...', {
        userRole,
        isSignedIn,
        caller: stackTrace.split('\n')[2],
        routeParams: route.params ? JSON.stringify(route.params) : 'none'
      });
      
      const data = await getConversations();
      
      if (data && Array.isArray(data)) {
        debugLog('MBA3456: Conversations fetched successfully:', {
          count: data.length,
          userRole,
          conversations: data.map(c => ({
            conversation_id: c.conversation_id,
            is_professional: c.is_professional,
            other_user_name: c.other_user_name
          }))
        });
        
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
      debugLog('MBA98765 No conversation ID provided for message fetch');
      return;
    }

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
        debugLog('MBA98765 Messages fetched successfully:', {
          conversationId,
          page,
          count: newMessages.length,
          hasNext: !!data.has_more,
          isPagination: page > 1
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
      console.log('MBA98765 No conversation data found, refreshing conversations');
      await fetchConversations();
      const updatedConversation = conversations.find(conv => conv.conversation_id === selectedConversation);
      if (!updatedConversation) {
        console.log('MBA98765 Still no conversation data after refresh');
        return;
      }
      setSelectedConversationData(updatedConversation);
      if (is_DEBUG) {
        console.log('MBA98765 Updated conversation data:', updatedConversation);
      }
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

  const renderMessage = useCallback(({ item }) => {
    // Create a map to keep track of which bookings have change requests and latest message timestamps
    const bookingMessages = groupMessagesByBookingId(messages);
    
    // Track bookings that have been confirmed
    const confirmedBookingIds = messages
      .filter(m => m.type_of_message === 'booking_confirmed')
      .map(m => m.metadata?.booking_id)
      .filter(Boolean);
      
    // Check if the message has images in various formats
    const hasImages = item.image_urls && item.image_urls.length > 0;
    // For backwards compatibility with older messages that might have a single image_url
    const hasLegacyImage = !hasImages && item.image_url && item.image_url.length > 0;
    // Check if this is an image_message type message
    const isImageMessage = item.type_of_message === 'image_message';
    // If it's an image message but we don't have any detected images yet, force hasLegacyImage to true
    // This is needed for single image messages without a separate image_urls array
    const forceHasImage = isImageMessage && !hasImages && !hasLegacyImage && item.image_url;
    
    // Debug log the message details to see what we're working with
    debugLog('MBA9999: Rendering message:', {
      messageId: item.message_id,
      type: item.type_of_message,
      hasImages,
      hasLegacyImage,
      isImageMessage,
      imageUrl: item.image_url,
      imageUrls: item.image_urls,
      metadata: item.metadata
    });
    
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
        />
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
        />
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
        />
      );
    }

    // Check if this is an attachment message (temporary image container)
    const isAttachmentMessage = item.metadata && item.metadata.is_attachment === true;
    
    // Skip rendering attachment messages - they should not be displayed directly
    // They're only containers for images that get referenced in actual image messages
    if (isAttachmentMessage) {
      debugLog('MBA9999: Skipping attachment message (container only):', {
        messageId: item.message_id,
        hasImageUrl: !!item.image_url,
        imageUrl: item.image_url,
        type: item.type_of_message
      });
      return null;
    }
    
    // Handle image messages or normal messages with images
    if (isImageMessage || hasImages || hasLegacyImage || forceHasImage) {
      const isFromMe = !item.sent_by_other_user;
      
      // For images, first render the caption (if exists) and then the images
      debugLog('MBA4567: Rendering message with images and possibly caption:', {
        messageId: item.message_id,
        hasCaption: item.content && item.content.trim().length > 0,
        captionText: item.content,
        isFromMe
      });
      return (
        <>
          {/* Render caption first if it exists */}
          {item.content && item.content.trim().length > 0 && (
            <View style={[
              isFromMe ? styles.sentMessageContainer : styles.receivedMessageContainer,
              { marginBottom: 4 } // Add space between caption and images
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
                    marginVertical: 8,
                    width: '100%',
                  }}>
                    {item.image_urls.map((imageUrl, index) => (
                      <Image 
                        key={`${imageUrl}-${index}`}
                        source={{ uri: API_BASE_URL + imageUrl }} 
                        style={{
                          width: 250,
                          height: 250,
                          borderRadius: 8,
                          marginVertical: 4,
                          resizeMode: 'cover',
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
                      <Image 
                        key={`${imageUrl}-${index}`}
                        source={{ uri: API_BASE_URL + imageUrl }} 
                        style={{
                          width: 250,
                          height: 250,
                          borderRadius: 8,
                          marginVertical: 4,
                          resizeMode: 'cover',
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
                    <Image 
                      source={{ uri: item.image.url }} 
                      style={{
                        width: 250,
                        height: 250,
                        borderRadius: 8,
                        marginVertical: 4,
                        resizeMode: 'cover',
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
                    <Image 
                      source={{ uri: API_BASE_URL + item.image_url }} 
                      style={{
                        width: 250,
                        height: 250,
                        borderRadius: 8,
                        marginVertical: 4,
                        resizeMode: 'cover',
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
                    <Image 
                      source={{ uri: API_BASE_URL + item.image_url }} 
                      style={{
                        width: 250,
                        height: 250,
                        borderRadius: 8,
                        marginVertical: 4,
                        resizeMode: 'cover',
                      }}
                    />
                  </View>
                )}
              </View>
            </View>
          </View>
        </>
      );
    }
    
    // Handle normal text messages
    const isFromMe = !item.sent_by_other_user;
    return (
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
    );
  }, [navigation, selectedConversationData, timeSettings, hasDraft, draftData, selectedConversation, fetchMessages, messages]);

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
    debugLog('MBA3456: Rendering conversation list', {
      filteredConversationsCount: filteredConversations.length,
      safeConversationsCount: renderedConversations.length,
      conversationsCount: conversations.length,
      currentRole: userRole,
      filteredConversations: renderedConversations.map(c => ({
        id: c.conversation_id,
        is_professional: c.is_professional,
        name: c.other_user_name
      }))
    });
    
    return (
      <ConversationList
        conversations={renderedConversations}
        selectedConversation={selectedConversation}
              onSelectConversation={(convId) => {
        // Only log on initial selection, not re-selections
        if (convId !== selectedConversation) {
          debugLog('MBA3456: Conversation selected from list', {
            conversationId: convId,
            previousConversation: selectedConversation
          });
          
          // Make sure to update navigation params directly to ensure Navigation component detects change
          if (Platform.OS === 'web' && typeof window !== 'undefined') {
            window.selectedConversationId = convId;
            
            // Update URL to include conversation ID
            const currentUrl = new URL(window.location.href);
            currentUrl.searchParams.set('conversationId', convId);
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
      <View style={styles.mainSection}>
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
                messages={messages}
                renderMessage={renderMessage}
                hasMore={hasMore}
                isLoadingMore={isLoadingMore}
                onLoadMore={loadMoreMessages}
                styles={styles}
                theme={theme}
                className="message-list-component"
              />
            )}
          </View>
        </View>

        {/* Input Section - Simplified to use flexbox positioning */}
        <MessageInput 
          onSendMessage={async (messageContent, imageMessageIds, messageObject, alreadySent) => {
            try {
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
      </View>
    );
  };

  // Update the back button handler to better clear URL parameters
  const handleBack = () => {
    // Only log if there's actually a conversation selected
    if (selectedConversation) {
      debugLog('MBA3456: Back button pressed, clearing selected conversation');
    }
    
    // Set flag to indicate we're intentionally deselecting (to prevent URL param reloading)
    isIntentionallyDeselecting.current = true;
    
    // First clear the URL parameter to prevent it from being re-read
    navigation.setParams({ selectedConversation: undefined });
    
    // Also update URL directly to ensure Navigation component sees the change
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const currentUrl = new URL(window.location.href);
      currentUrl.searchParams.delete('conversationId');
      window.history.replaceState({}, '', currentUrl.toString());
      
      // Clear global context variable used by Navigation
      window.selectedConversationId = null;
      
      debugLog('MBA4477: Cleared conversationId from URL in handleBack', {
        oldValue: selectedConversation
      });
    }
    
    // Clear the selected conversation state immediately
    setSelectedConversation(null);
    
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
          const urlConversationId = currentUrl.searchParams.get('conversationId');
          
          if (urlConversationId) {
            initialConversationId = urlConversationId;
            debugLog(`MBA4321: Using conversation ID ${urlConversationId} from URL parameters`);
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
  
  // Fix the beforeunload effect
  useEffect(() => {
    // Only run in browser environment
    if (typeof window !== 'undefined') {
      const handleBeforeUnload = () => {
        debugLog('MBA3210: Page unloading, but keeping websocket alive for session restore');
        // No longer disconnect WebSocket on page unload
      };
      
      window.addEventListener('beforeunload', handleBeforeUnload);
      
      return () => {
        window.removeEventListener('beforeunload', handleBeforeUnload);
      };
    }
  }, []);

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
        // Set the conversationId parameter
        currentUrl.searchParams.set('conversationId', selectedConversation);
        // Store selectedConversation in global context for Navigation component
        window.selectedConversationId = selectedConversation;
        
        debugLog('MBA4477: Updated URL with selectedConversation', {
          selectedConversation,
          newUrl: currentUrl.toString()
        });
      } else {
        // Remove the parameter if no conversation is selected
        currentUrl.searchParams.delete('conversationId');
        // Clear global context
        window.selectedConversationId = null;
        
        debugLog('MBA4477: Cleared conversationId from URL', {
          oldValue: selectedConversation
        });
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

  // Add a function to handle View Pets button click
  const handleViewPets = () => {
    debugLog('MBA3456', 'View Pets button clicked', {
      conversation_id: selectedConversationData?.conversation_id,
      other_user_name: selectedConversationData?.other_user_name
    });
    
    setShowClientPetsModal(true);
  };

  // Add a special effect specifically for Android Chrome keyboard handling
  useEffect(() => {
    if (Platform.OS === 'web' && screenWidth <= 900 && isAndroidChromeRef.current) {
      debugLog('MBA9876: [ANDROID] Setting up Android Chrome-specific keyboard handler');
      
      // Helper function to detect keyboard visibility more reliably on Android Chrome
      const checkAndroidKeyboard = () => {
        // If input is focused, keyboard is likely open
        const isInputFocused = document.activeElement && 
                              (document.activeElement.tagName === 'TEXTAREA' || 
                               document.activeElement.tagName === 'INPUT');
        
        // Visual viewport height change is a good indicator
        const viewportHeightReduced = window.visualViewport && 
                                     window.innerHeight - window.visualViewport.height > 100;
        
        const keyboardIsLikelyOpen = isInputFocused && viewportHeightReduced;
        
        debugLog('MBA9876: [ANDROID] Android keyboard check', {
          isInputFocused,
          activeElement: document.activeElement?.tagName,
          viewportHeightReduced,
          innerHeight: window.innerHeight,
          visualViewportHeight: window.visualViewport?.height,
          keyboardIsLikelyOpen
        });
        
        if (keyboardIsLikelyOpen) {
          // Force input into view on Android Chrome
          const inputContainer = document.querySelector('.message-input-container');
          if (inputContainer) {
            // Make sure input container is fixed to bottom
            inputContainer.style.position = 'fixed';
            inputContainer.style.bottom = '0px';
            inputContainer.style.left = '0px';
            inputContainer.style.right = '0px';
            inputContainer.style.zIndex = '1000';
            
            // Explicitly ensure no margin
            inputContainer.style.marginBottom = '0px';
            
            // Force visual viewport to bottom
            setTimeout(() => {
              window.scrollTo(0, document.body.scrollHeight);
            }, 50);
          }
        }
      };
      
      // Create event listeners specifically for Android Chrome
      const handleAndroidFocus = () => {
        debugLog('MBA9876: [ANDROID] Focus event on Android Chrome');
        
        // Add repeated checks for the keyboard
        const checkInterval = setInterval(checkAndroidKeyboard, 100);
        
        // Stop checking after 1 second
        setTimeout(() => {
          clearInterval(checkInterval);
        }, 1000);
        
        // Do an immediate check
        checkAndroidKeyboard();
      };
      
      document.addEventListener('focusin', handleAndroidFocus);
      
      return () => {
        document.removeEventListener('focusin', handleAndroidFocus);
      };
    }
  }, [screenWidth]);

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
  
  // Ref for debounce timeout - define at component level to avoid hooks errors
  const resizeTimeoutRef = useRef(null);
  
  // Add effect to handle screen width changes with debouncing to prevent excessive re-renders
  useEffect(() => {
    const handleScreenWidthChange = () => {
      // Clear any existing timeout
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
      
      // Set a new timeout to debounce the navigation param update
      resizeTimeoutRef.current = setTimeout(() => {
        // Only update if we have a selected conversation and we're at the width threshold
        if (selectedConversation && Platform.OS === 'web' && typeof window !== 'undefined') {
          const isMobile = window.innerWidth <= 900;
          
          // Update the navigation params to ensure Navigation component detects the change
          navigation.setParams({ 
            selectedConversation: selectedConversation,
            isMobile: isMobile
          });
          
          debugLog('MBA4477: Updated navigation params after screen width change', {
            selectedConversation,
            screenWidth: window.innerWidth,
            isMobile
          });
        }
      }, 200); // 200ms debounce
    };
    
    // Add resize event listener
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.addEventListener('resize', handleScreenWidthChange);
    }
    
    // Cleanup
    return () => {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.removeEventListener('resize', handleScreenWidthChange);
      }
      
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
      
      <RequestBookingModal
        visible={showRequestModal}
        onClose={() => setShowRequestModal(false)}
        onSubmit={handleBookingRequest}
        conversationId={selectedConversation}
      />

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
        otherUserName={selectedConversationData?.other_user_name}
        onCreateBooking={handleCreateBooking}
      />

      <DraftConfirmationModal
        visible={showDraftConfirmModal}
        onClose={() => setShowDraftConfirmModal(false)}
        onContinueExisting={handleContinueExisting}
        onCreateNew={handleCreateNew}
      />
    </View>
  );
};

export default MessageHistory;

