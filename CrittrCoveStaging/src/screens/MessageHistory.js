import React, { useState, useCallback, useRef, useEffect, useContext } from 'react';
import { View, StyleSheet, FlatList, KeyboardAvoidingView, Platform, SafeAreaView, StatusBar, TextInput, Text, TouchableOpacity, Dimensions, Alert, Image } from 'react-native';
import { Button, Card, Paragraph, useTheme, ActivityIndicator, Badge } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons'; // Import the icon library
import { theme } from '../styles/theme';
import { AuthContext, getStorage, debugLog } from '../context/AuthContext';
import RequestBookingModal from '../components/RequestBookingModal';
import BookingStepModal from '../components/BookingStepModal';
import { createBooking, BOOKING_STATES, mockConversations, mockMessages, CURRENT_USER_ID } from '../data/mockData';
import { format } from 'date-fns';
import { useNavigation } from '@react-navigation/native';
import { API_BASE_URL } from '../config/config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { navigateToFrom } from '../components/Navigation';
import BookingMessageCard from '../components/BookingMessageCard';
import { formatOccurrenceFromUTC } from '../utils/time_utils';
import DraftConfirmationModal from '../components/DraftConfirmationModal';
import useWebSocket from '../hooks/useWebSocket';
import MessageNotificationContext from '../context/MessageNotificationContext';
import {
  getConnectionProfile,
  getUserConnections,
  approveBooking,
  requestBookingChanges,
  createDraftFromBooking,
  // ... other imports from API.js
} from '../api/API';

// First, create a function to generate dynamic styles
const createStyles = (screenWidth, isCollapsed) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingTop: screenWidth > 900 ? 0 : 0,
    paddingRight: screenWidth > 900 ? 0 : 0,
    paddingLeft: screenWidth > 900 ? 0 : 0,
    height: screenWidth > 900 ? '100vh' : 'calc(100vh - 64px)',
    overflow: 'hidden',
    position: 'fixed',
    top: screenWidth > 900 ? 0 : 64,
    left: 0,
    right: 0,
    bottom: 0,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.primary,
    fontFamily: theme.fonts.header.fontFamily,
  },
  filterButton: {
    marginLeft: 'auto',
  },
  contentContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    maxWidth: screenWidth > 900 ? '100%' : 900,
    alignSelf: 'center',
    width: '100%',
    overflow: 'hidden',
    height: '100%',
  },
  mainSection: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    maxWidth: Platform.OS === 'web' ? 
      (screenWidth <= 900 ? '100%' : '70%') : 
      '100%',
    alignSelf: screenWidth <= 900 ? 'stretch' : 'flex-start',
    width: screenWidth <= 900 ? '100%' : 'auto',
    height: '100%',
  },
  conversationListContainer: {
    width: screenWidth <= 900 ? '100%' : '30%',
    maxWidth: screenWidth < 900 ? '' : 600,
    backgroundColor: theme.colors.surfaceContrast,
    overflow: 'auto',
  },
  conversationItem: {
    padding: 16,
    maxWidth: screenWidth < 900 ? '' : 600,
    width: '100%',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  selectedConversation: {
    backgroundColor: theme.colors.primary + '20',
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.primary,
  },
  conversationName: {
    fontSize: 16,
    fontFamily: theme.fonts.header.fontFamily,
    flex: 1,
  },
  messageSection: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    paddingHorizontal: 5,
    backgroundColor: theme.colors.surface, // #FDFBF5
    // Add bottom padding on mobile web to account for fixed input
    ...(Platform.OS === 'web' && screenWidth <= 900 ? {
      paddingBottom: 80, // Account for fixed input height
    } : {}),
  },
  messageHeader: {
    padding: 22,
    backgroundColor: theme.colors.surfaceContrast,
    width: '100%',
    // marginVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: .5 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
    zIndex: 1,
  },
  profilePhoto: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  messageHeaderName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
    fontFamily: theme.fonts.header.fontFamily,
  },
  messagesContainer: {
    flex: 1,
    overflow: 'auto',
    width: '100%',
  },
  messageList: {
    width: '100%',
    paddingBottom: 16,
  },
  inputSection: {
    width: '100%',
    backgroundColor: theme.colors.surfaceContrast,
    padding: screenWidth > 600 ? 16 : 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -.5 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
    zIndex: 1,
    // Fix for mobile browsers - position fixed at bottom
    ...(Platform.OS === 'web' && screenWidth <= 900 ? {
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 1000,
    } : {}),
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  attachButtonContainer: {
    marginRight: 8,
  },
  attachButton: {
    padding: 8,
    backgroundColor: theme.colors.surfaceContrast,
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputInnerContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceContrast,
    borderRadius: 20,
    marginRight: 8,
  },
  messageInput: {
    flex: 1,
    backgroundColor: theme.colors.background,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 8,
  },
  sendButton: {
    borderRadius: 20,
    marginLeft: 8,
  },
  messageCard: {
    marginVertical: 4,
    maxWidth: screenWidth > 900 ? '40%' : '75%',
    borderRadius: 12,
    overflow: 'hidden',
  },
  // This is for the messages that are sent and received
  messageContent: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  sentMessage: {
    alignSelf: 'flex-end',
    backgroundColor: theme.colors.primary,
  },
  receivedMessage: {
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.receivedMessage,
  },
  messageText: {
    fontSize: 20,
    lineHeight: 20,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  sentMessageContainer: {
    alignItems: 'flex-end',
    marginBottom: 4,
  },
  receivedMessageContainer: {
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  senderAbove: {
    fontWeight: 'bold',
    marginBottom: 4,
    fontSize: 12,
    fontFamily: theme.fonts.header.fontFamily,
  },
  sentSenderName: {
    alignSelf: 'flex-end',
  },
  receivedSenderName: {
    alignSelf: 'flex-start',
  },
  timestampBelow: {
    fontSize: 12,
    color: theme.colors.placeholder,
    marginTop: 4,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  sentTimestamp: {
    alignSelf: 'flex-end',
  },
  receivedTimestamp: {
    alignSelf: 'flex-start',
  },
  sentMessageText: {
    color: theme.colors.whiteText,
  },
  receivedMessageText: {
    color: theme.colors.text,
  },
  webInput: {
    flex: 1,
    backgroundColor: 'transparent',
    paddingVertical: '8px',
    paddingLeft: '12px',
    height: 24,
    maxHeight: '120px', // This will accommodate 5 lines of text
    border: '1px solid ' + theme.colors.border,
    borderRadius: 20,
    fontFamily: theme.fonts.regular.fontFamily,
    fontSize: '20px',
    appearance: 'none',
    touchAction: 'manipulation',
    WebkitTapHighlightColor: 'transparent',
    WebkitUserSelect: 'none',
    userSelect: 'none',
    resize: 'none',
    overflowY: 'auto', // Enable scrolling
    lineHeight: '20px',
    paddingRight: '12px', // Add right padding for scroll bar
  },
  conversationContent: {
    flex: 1,
    width: '100%',
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
    width: '100%',
  },
  conversationNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  conversationTime: {
    fontSize: 12,
    color: theme.colors.placeholder,
  },
  conversationLastMessageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 6,
  },
  conversationLastMessage: {
    fontSize: 14,
    color: theme.colors.placeholder,
    flex: 1,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  conversationUnreadBadge: {
    position: 'relative',
    backgroundColor: theme.colors.error,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    marginLeft: 8,
  },
  unreadMessage: {
    color: theme.colors.text,
    fontWeight: 'bold',
  },
  bookingStatusContainer: {
    backgroundColor: theme.colors.primary + '20',
    padding: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  bookingStatus: {
    fontSize: 12,
    color: theme.colors.primary,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  requestBookingButton: {
    marginTop: 4,
    height: 28,
    alignSelf: 'flex-start',
  },
  requestBookingLabel: {
    fontSize: 12,
    marginVertical: 0,
  },
  messageListContainer: {
    flex: 1,
  },
  inputWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    zIndex: 1,
    width: '100%',
    padding: screenWidth > 600 ? 16 : 8,
  },
  dropdownMenu: {
    position: 'absolute',
    bottom: '100%',
    left: 0,
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    marginBottom: 8,
    minWidth: 150,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  dropdownItem: {
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  dropdownText: {
    color: theme.colors.text,
    fontSize: 14,
    marginLeft: 8,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  activeConversationText: {
    color: theme.colors.text,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  mobileMessageView: {
    flex: 1,
    width: '100%',
    height: '100%',
    position: 'relative',
    backgroundColor: theme.colors.background,
    display: 'flex',
    flexDirection: 'column',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  backButtonText: {
    marginLeft: 8,
    color: theme.colors.primary,
    fontSize: 16,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  mobileHeader: {
    width: '100%',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    position: 'relative',
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
  },
  mobileContent: {
    flex: 1,
    position: 'relative',
    height: 'calc(100% - 56px)',
  },
  mobileContainer: {
    paddingTop: 0,
    paddingLeft: 0,
    paddingRight: 0,
  },
  sendButtonMobile: {
    width: 24,
    height: 24,
    minWidth: 0,
    padding: 0,
    marginLeft: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mobileHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    paddingVertical: 16,
    paddingHorizontal: 8,
    width: '100%',
    minHeight: 60,
  },
  mobileHeaderName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
    textAlign: 'center',
    fontFamily: theme.fonts.header.fontFamily,
    flexWrap: 'wrap',
    maxWidth: '70%',
  },
  mobileHeaderNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  backArrow: {
    position: 'absolute',
    left: 16,
    zIndex: 10,
    padding: 8,
  },
  bookingRequestCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 16,
    margin: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    maxWidth: '75%',
    position: 'relative',
  },
  sentBookingRequest: {
    alignSelf: 'flex-end',
    marginLeft: '20%',
  },
  receivedBookingRequest: {
    alignSelf: 'flex-start',
    marginRight: '20%',
  },
  bookingRequestHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  bookingRequestTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.primary,
    fontFamily: theme.fonts.header.fontFamily,
  },
  bookingRequestDetails: {
    gap: 8,
  },
  inlineDetailRow: {
    flexDirection: 'row',
    // alignItems: 'flex-start',
    gap: 8,
    marginBottom: 8,
  },
  dateSection: {
    gap: 8,
  },
  detailLabel: {
    fontSize: 16,
    fontWeight: '502',
    color: theme.colors.text,
    // minWidth: 70,
  },
  detailText: {
    fontSize: 16,
    color: theme.colors.text,
    flex: 1,
  },
  acceptButton: {
    backgroundColor: theme.colors.primary,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  acceptButtonText: {
    color: theme.colors.surface,
    fontSize: 16,
    fontWeight: '500',
  },
  viewBookingButton: {
    backgroundColor: theme.colors.primary,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  viewBookingText: {
    color: theme.colors.surface,
    fontSize: 16,
    fontWeight: '500',
    fontFamily: theme.fonts.regular.fontFamily,
  },
  statusContainer: {
    backgroundColor: theme.colors.primary + '15',
    padding: 8,
    borderRadius: 4,
    marginBottom: 12,
  },
  statusText: {
    color: theme.colors.primary,
    fontSize: 14,
    fontWeight: '500',
    fontFamily: theme.fonts.regular.fontFamily,
  },
  deletedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  deletedText: {
    color: theme.colors.surface,
    fontSize: 18,
    fontWeight: 'bold',
  },
  occurrenceItem: {
    marginBottom: 12,
    borderBottomWidth: 1,
    borderColor: theme.colors.border,
  },
  occurrenceNumber: {
    fontWeight: 'bold',
    marginBottom: 4,
    color: theme.colors.primary,
  },
  occurrenceDetails: {
    backgroundColor: theme.colors.background,
    padding: 8,
    borderRadius: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: theme.colors.placeholder,
    fontSize: 16,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  emptyText: {
    padding: 16,
    color: theme.colors.placeholder,
    fontSize: 16,
    fontFamily: theme.fonts.regular.fontFamily,
    textAlign: 'center',
  },
  loadingMore: {
    padding: 16,
  },
  searchContainer: {
    padding: 16,
    backgroundColor: theme.colors.surfaceContrast,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    paddingHorizontal: 12,
    marginVertical: 6,
    height: 40,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  searchIcon: {
    marginRight: 8,
  },
  clearButton: {
    padding: 4,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: 16,
    color: theme.colors.text,
    fontFamily: theme.fonts.regular.fontFamily,
    outline: 'none',  // Remove outline for web
    WebkitTapHighlightColor: 'transparent', // Remove tap highlight on iOS/Safari
    WebkitAppearance: 'none', // Standardize appearance
  },
  messageHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  editDraftButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginLeft: 'auto',
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  editDraftText: {
    marginLeft: 4,
    color: theme.colors.primary,
    fontSize: 14,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  createBookingContainer: {
    position: 'absolute',
    top: 8,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    alignItems: 'center',
    zIndex: 10,
    pointerEvents: 'box-none',
  },
  createBookingHangingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    paddingHorizontal: screenWidth <= 600 ? 12 : 16,
    paddingVertical: screenWidth <= 600 ? 8 : 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
    width: '50%',
    justifyContent: 'center',
  },
  createBookingHangingText: {
    marginLeft: 8,
    color: theme.colors.primary,
    fontSize: screenWidth <= 600 ? 14 : 16,
    fontWeight: '500',
    fontFamily: theme.fonts.regular.fontFamily,
  },
  conversationUnreadBadge: {
    position: 'relative',
    backgroundColor: theme.colors.error,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  conversationUnreadText: {
    color: theme.colors.whiteText,
    fontSize: 11,
    fontWeight: 'bold',
    fontFamily: theme.fonts.regular.fontFamily,
  },
  timeContainer: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
  },
  unreadBadge: {
    backgroundColor: theme.colors.error,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    marginLeft: 8,
    alignSelf: 'flex-start',
  },
  
  unreadBadgeText: {
    color: 'white',
    fontSize: 11,
    fontWeight: 'bold',
    fontFamily: theme.fonts.regular.fontFamily,
  },
  
  conversationNameRow: {
    flexDirection: 'row', 
    alignItems: 'center',
    marginBottom: 4,
  },
  mobileEditDraftButton: {
    marginRight: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.surface,
    minWidth: 55,
    alignSelf: 'flex-start',
  },
});

const MessageHistory = ({ navigation, route }) => {
  const { colors } = useTheme();
  const { screenWidth } = useContext(AuthContext);
  const styles = createStyles(screenWidth, false);
  
  // Add loading states
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isLoading, setIsLoading] = useState(false); // Add isLoading state for edit draft
  const [isSearchFocused, setIsSearchFocused] = useState(false); // Add state for search input focus
  
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [selectedConversationData, setSelectedConversationData] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isSending, setIsSending] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const { is_DEBUG, is_prototype, isCollapsed, isApprovedProfessional, userRole, timeSettings } = useContext(AuthContext);
  const [conversations, setConversations] = useState([]);
  const [filteredConversations, setFilteredConversations] = useState([]); // Add filtered conversations state
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
    debugLog('MBA2349f87g9qbh2nfv9cg: WebSocket message received:', {
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
    // debugLog(`MBA2349f87g9qbh2nfv9cg: [MY CONNECTION] WebSocket connection status changed to ${connectionStatus}`);
    // debugLog(`MBA2349f87g9qbh2nfv9cg: [MY CONNECTION] isConnected state: ${isConnected}`);
    // debugLog(`MBA2349f87g9qbh2nfv9cg: [MY CONNECTION] isUsingFallback: ${isUsingFallback}`);
    
    // Add more debug logs to check actual WebSocket readyState
    if (window && window.WebSocket) {
      // debugLog(`MBA2349f87g9qbh2nfv9cg: [MY CONNECTION] WebSocket readyState constants: CONNECTING=${WebSocket.CONNECTING}, OPEN=${WebSocket.OPEN}, CLOSING=${WebSocket.CLOSING}, CLOSED=${WebSocket.CLOSED}`);
    }
    
    // Only log status changes but don't trigger fetches here - that's handled in the mount effect
    if ((connectionStatus === 'connected' && isConnected) || isUsingFallback) {
      debugLog('MBA2349f87g9qbh2nfv9cg: [MY CONNECTION] Connection fully verified as connected or using fallback');
    } else {
      debugLog('MBA2349f87g9qbh2nfv9cg: [MY CONNECTION] Connection not fully verified, status and state mismatch');
      // debugLog(`MBA2349f87g9qbh2nfv9cg: [MY CONNECTION] Details - status: ${connectionStatus}, isConnected: ${isConnected}`);
    }
  }, [connectionStatus, isConnected, isUsingFallback]);
  
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
  
  // Remove the problematic effect and instead add a proper mount effect to load initial data
  useEffect(() => {
    if (!initialLoadRef.current) return; // Skip if not initial load

    debugLog('MBA2349f87g9qbh2nfv9cg: Component mounted - initializing data');
    
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

        // Handle URL parameters on web
        if (Platform.OS === 'web') {
          const currentUrl = new URL(window.location.href);
          const urlConversationId = currentUrl.searchParams.get('conversationId');
          
          // Clear URL parameters
          if (currentUrl.searchParams.has('conversationId')) {
            currentUrl.searchParams.delete('conversationId');
            window.history.replaceState({}, '', currentUrl.toString());
            debugLog('MBA2349f87g9qbh2nfv9cg: Cleared URL parameters on initial load');
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
            debugLog('MBA2349f87g9qbh2nfv9cg: Will open booking creation after data loads');
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

        // Normal initialization - only fetch conversations once
        const conversationsData = await fetchConversations();
        if (Platform.OS === 'web' && screenWidth > 900 && conversationsData?.length > 0) {
          setSelectedConversation(conversationsData[0].conversation_id);
        }
      } catch (error) {
        console.error('Error in initialization:', error);
      } finally {
        initialLoadRef.current = false;
        setIsInitialLoad(false);
        isHandlingRouteParamsRef.current = false;
      }
    };

    initializeData();

    return () => {
      debugLog('MBA2349f87g9qbh2nfv9cg: Component unmounting - cleaning up');
      
      // No longer disconnect on component unmount
      // This was causing message loss when switching tabs
      
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
      
      // Clear the global selected conversation tracking
      if (typeof window !== 'undefined') {
        window.selectedConversationId = null;
      }
    };
  }, []); // Empty dependency array means this runs once on mount
  
  // Modify route params effect to only handle non-reload cases
  useEffect(() => {
    // Skip if this is the initial load/reload or if we're already handling route params
    if (initialLoadRef.current || isHandlingRouteParamsRef.current || !route.params?.conversationId) {
      return;
    }

    if (is_DEBUG) {
      console.log('MBA98765 Route params detected (non-reload):', {
        messageId: route.params.messageId,
        conversationId: route.params.conversationId,
        otherUserName: route.params.otherUserName,
        isProfessional: route.params.isProfessional,
        clientId: route.params.clientId
      });
    }
    
    isHandlingRouteParamsRef.current = true;
    
    // Check if we should open booking creation (coming from Connections)
    if (route.params.isProfessional === true) {
      shouldOpenBookingCreationRef.current = true;
      if (is_DEBUG) {
        console.log('MBA98765 Will open booking creation after data loads');
      }
    }
    
    // Set the selected conversation and fetch data
    setSelectedConversation(route.params.conversationId);
    
    // Reset pagination state
    setCurrentPage(1);
    setHasMore(true);
    
    // Fetch fresh conversations and messages
    fetchConversations().then(() => {
      isHandlingRouteParamsRef.current = false;
    });
    
    // Clear the params to prevent re-fetching
    navigation.setParams({ 
      messageId: null, 
      conversationId: null,
      otherUserName: null,
      isProfessional: null,
      clientId: null
    });
  }, [route.params]);

  // Effect to trigger booking creation once conversation data is loaded
  useEffect(() => {
    // Only run if we should open booking creation, have conversation data, and messages are loaded
    if (shouldOpenBookingCreationRef.current && selectedConversationData && hasLoadedMessagesRef.current) {
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
  }, [selectedConversationData, hasLoadedMessagesRef.current, hasDraft, draftData]);

  // Keep the conversation selection effect but remove message fetching
  useEffect(() => {
    if (!selectedConversation || isInitialLoad) {
      if (is_DEBUG) {
        console.log('MBA98765 Skipping conversation data update - initial load or no conversation');
      }
      return;
    }

    // Skip redundant updates if we're already viewing this conversation
    if (lastViewedConversationRef.current === selectedConversation) {
      if (is_DEBUG) {
        console.log('MBA98765 Skipping redundant conversation update - already viewing this conversation');
      }
      return;
    }

    if (is_DEBUG) {
      console.log('MBA98765 Selected conversation changed:', {
        id: selectedConversation,
        type: typeof selectedConversation,
        isHandlingRouteParams: isHandlingRouteParamsRef.current
      });
    }

    // Update global tracking of selected conversation
    if (typeof window !== 'undefined') {
      window.selectedConversationId = selectedConversation;
      debugLog(`MBA4321: Updated global selectedConversationId to ${selectedConversation}`);
    }

    // Find the conversation in our list
    const conversation = conversations.find(conv => String(conv.conversation_id) === String(selectedConversation));
    
    if (conversation) {
      debugLog(`MBA3210: [OTHER USER STATUS] Setting selected conversation to ${conversation.conversation_id} with user "${conversation.other_user_name}"`);
      debugLog(`MBA3210: [OTHER USER STATUS] Initial online status for "${conversation.other_user_name}": ${conversation.other_participant_online ? 'ONLINE' : 'OFFLINE'}`);
      
      setSelectedConversationData(conversation);
      
      // Mark this conversation as read in the notification context
      if (markConversationAsRead) {
        debugLog(`MBA4321: Marking ONLY conversation ${selectedConversation} as read when selected`);
        markConversationAsRead(selectedConversation);
      }
      
      // Update URL on web platform
      if (Platform.OS === 'web') {
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.set('conversationId', selectedConversation);
        window.history.replaceState({}, '', newUrl.toString());
      }

      // Reset pagination state
      setCurrentPage(1);
      setHasMore(true);
      
      // Reset message loading flag for new conversation
      hasLoadedMessagesRef.current = false;
      
      // Update the last viewed conversation
      lastViewedConversationRef.current = selectedConversation;
    } else {
      if (is_DEBUG) {
        console.log('MBA98765 Could not find conversation data for ID:', selectedConversation);
      }
      debugLog(`MBA3210: [OTHER USER STATUS] Could not find conversation data for ID: ${selectedConversation}`);
    }
  }, [selectedConversation, conversations, isInitialLoad, markConversationAsRead]);

  // Add cleanup when unmounting the component
  useEffect(() => {
    return () => {
      // Clear the selected conversation tracking when unmounting
      if (typeof window !== 'undefined') {
        window.selectedConversationId = null;
        debugLog('MBA4321: Cleared global selectedConversationId on unmount');
      }
    };
  }, []);

  // Add dedicated effect for message fetching with optimizations
  useEffect(() => {
    if (!selectedConversation || isInitialLoad) {
      return;
    }

    // Skip if we've already loaded messages for this conversation and nothing has changed
    const hasSelectedConversationChanged = lastViewedConversationRef.current !== selectedConversation;
    
    if (!hasSelectedConversationChanged && hasLoadedMessagesRef.current) {
      debugLog('MBA4321: Skipping message fetch - conversation unchanged and messages already loaded');
      return;
    }

    if (is_DEBUG) {
      console.log('MBA98765 Fetching messages for conversation:', {
        id: selectedConversation,
        hasLoaded: hasLoadedMessagesRef.current,
        hasChanged: hasSelectedConversationChanged,
        shouldOpenBookingCreation: shouldOpenBookingCreationRef.current
      });
    }

    // Create a flag to track if this effect's async operation is still relevant
    let isCurrentOperation = true;
    
    // Set loading flags
    hasLoadedMessagesRef.current = true;
    setIsLoadingMessages(true);
    
    // Fetch messages
    fetchMessages(selectedConversation, 1)
      .then(() => {
        // Skip updates if component unmounted or conversation changed
        if (!isCurrentOperation) return;
        
        setIsLoadingMessages(false);
        
        // After messages are loaded, if we need to open booking creation,
        // we now have hasDraft and draftData set properly
        if (shouldOpenBookingCreationRef.current && selectedConversationData) {
          if (is_DEBUG) {
            console.log('MBA98765 Messages loaded, now draft data is available');
          }
        }
        
        // Mark this specific conversation's notifications as read 
        // We do this here after successful message fetch to ensure it actually happened
        if (markConversationAsRead && hasSelectedConversationChanged) {
          debugLog(`MBA4321: Marking conversation ${selectedConversation} as read after successful message fetch`);
          markConversationAsRead(selectedConversation);
        }
      })
      .catch(error => {
        if (!isCurrentOperation) return;
        setIsLoadingMessages(false);
        console.error('Error fetching messages:', error);
      });
    
    // Cleanup function
    return () => {
      isCurrentOperation = false;
    };
  }, [selectedConversation, isInitialLoad, markConversationAsRead]);

  // Modify existing screen width effect
  useEffect(() => {
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
  }, [screenWidth]);

  // Update conversations list when main conversation list or search query changes
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredConversations(conversations);
    } else {
      const lowercaseQuery = searchQuery.trim().toLowerCase();
      const filtered = conversations.filter(conv => 
        conv.other_user_name && conv.other_user_name.toLowerCase().includes(lowercaseQuery)
      );
      setFilteredConversations(filtered);
    }
  }, [conversations, searchQuery]);

  // Modify fetchConversations to update filtered conversations
  const fetchConversations = async () => {
    try {
      // Don't reload if already loading or if conversations are already loaded and this isn't initialization
      if (isLoadingConversations && conversations.length > 0 && !initialLoadRef.current) {
        debugLog('MBA3210: [OTHER USERS STATUS] Skipping duplicate conversation fetch - already loading');
        return conversations;
      }
      
      setIsLoadingConversations(true);
      debugLog('MBA3210: [OTHER USERS STATUS] Starting to fetch conversations with online status data');

      const token = await getStorage('userToken');
      const requestUrl = `${API_BASE_URL}/api/conversations/v1/`;
      
      debugLog('MBA3210: [OTHER USERS STATUS] Making API request to get conversations with online statuses');
      const response = await axios.get(requestUrl, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.data && Array.isArray(response.data)) {
        // Add default false value for other_participant_online if not present
        const conversationsWithOnlineStatus = response.data.map(conv => ({
          ...conv,
          other_participant_online: conv.other_participant_online || false
        }));
        
        // Log each conversation's online status for debugging
        conversationsWithOnlineStatus.forEach(conv => {
          const otherUserName = conv.other_user_name || 'Unknown';
          debugLog(`MBA3210: [OTHER USERS STATUS] User "${otherUserName}" (conversation ${conv.conversation_id}) online status: ${conv.other_participant_online ? 'ONLINE' : 'OFFLINE'}`);
        });
        
        debugLog(`MBA3210: [OTHER USERS STATUS] Fetched ${conversationsWithOnlineStatus.length} conversations with online status data`);
        
        setConversations(conversationsWithOnlineStatus);
        setFilteredConversations(conversationsWithOnlineStatus); // Update filtered conversations too
        return conversationsWithOnlineStatus;
      }
      return [];
    } catch (error) {
      console.error('Error fetching conversations:', error);
      debugLog(`MBA3210: [OTHER USERS STATUS] Error fetching conversation status data: ${error.message}`);
      return [];
    } finally {
      setIsLoadingConversations(false);
    }
  };

  // Modify fetchMessages to handle pagination better and prevent duplicate requests
  const fetchMessages = async (conversationId, page = 1) => {
    try {
      debugLog(`MBA2349f87g9qbh2nfv9cg: fetchMessages called`, {
        conversationId,
        page,
        currentPage,
        isLoadingMore: isLoadingMoreRef.current,
        messagesLength: messages.length,
        hasMore,
        processedPagesSize: processedPagesRef.current.size
      });
      
      // Skip if we've already processed this page for the current conversation
      const pageKey = `${conversationId}-${page}`;
      if (processedPagesRef.current.has(pageKey) && page > 1) {
        debugLog(`MBA2349f87g9qbh2nfv9cg: Skipping duplicate fetch for page ${page} of conversation ${conversationId}`);
        return;
      }
      
      if (page === 1) {
        debugLog(`MBA2349f87g9qbh2nfv9cg: Fetching page 1 - resetting messages list`);
        setIsLoadingMessages(true);
        // Reset messages when fetching first page
        setMessages([]);
        // Clear processed pages and message IDs when starting fresh
        processedPagesRef.current.clear();
        messageIdsRef.current.clear();
        
        debugLog(`MBA2349f87g9qbh2nfv9cg: Reset state for page 1 fetch`, {
          processedPagesCleared: processedPagesRef.current.size === 0,
          messageIdsCleared: messageIdsRef.current.size === 0
        });
      } else {
        // Set the loading ref first to block concurrent requests
        if (isLoadingMoreRef.current) {
          debugLog(`MBA2349f87g9qbh2nfv9cg: Already loading more messages, skipping request for page ${page}`);
          return;
        }
        
        debugLog(`MBA2349f87g9qbh2nfv9cg: Setting pagination loading state for page ${page}`);
        // Mark that we're loading more
        isLoadingMoreRef.current = true;
        setIsLoadingMore(true);
      }
      
      // Mark this page as being processed
      processedPagesRef.current.add(pageKey);
      debugLog(`MBA2349f87g9qbh2nfv9cg: Added page ${pageKey} to processed pages. Total processed: ${processedPagesRef.current.size}`);
      
      const token = await getStorage('userToken');
      
      const url = `${API_BASE_URL}/api/messages/v1/conversation/${conversationId}/?page=${page}`;
      debugLog(`MBA2349f87g9qbh2nfv9cg: Making API request to ${url}`);

      const response = await axios.get(url, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      debugLog(`MBA2349f87g9qbh2nfv9cg: API response received for page ${page}`, {
        messageCount: response.data.messages?.length || 0,
        hasNext: response.data.has_more,
        currentMessageCount: messages.length,
        hasDraft: response.data.has_draft
      });
      
      // Process messages to remove duplicates
      const newMessages = response.data.messages || [];
      const uniqueMessages = newMessages.filter(msg => {
        // Skip messages we already have
        if (msg.message_id && messageIdsRef.current.has(msg.message_id)) {
          debugLog(`MBA2349f87g9qbh2nfv9cg: Skipping duplicate message ${msg.message_id}`);
          return false;
        }
        
        // Add to our set of seen message IDs
        if (msg.message_id) {
          messageIdsRef.current.add(msg.message_id);
        }
        
        return true;
      });
      
      debugLog(`MBA2349f87g9qbh2nfv9cg: Processed ${newMessages.length} messages, ${uniqueMessages.length} unique for page ${page}`);
      
      // Update the messages state based on the page
      if (page === 1) {
        debugLog(`MBA2349f87g9qbh2nfv9cg: Setting page 1 messages - count: ${uniqueMessages.length}`);
        setMessages(uniqueMessages);
        setIsLoadingMessages(false);
        setHasMore(response.data.has_more || false);
        
        // Set draft data only on first page load
        setHasDraft(response.data.has_draft || false);
        setDraftData(response.data.draft_data || null);
        
        debugLog(`MBA2349f87g9qbh2nfv9cg: Page 1 state updated`, {
          messageCount: uniqueMessages.length,
          hasMore: response.data.has_more || false,
          hasDraft: response.data.has_draft || false
        });
        
        // Force a rerender after setting messages to fix scroll issues
        setTimeout(() => {
          debugLog(`MBA2349f87g9qbh2nfv9cg: Triggering force rerender after page 1 load`);
        }, 100);
      } else {
        debugLog(`MBA2349f87g9qbh2nfv9cg: Appending page ${page} messages`, {
          newCount: uniqueMessages.length,
          existingCount: messages.length,
          totalAfter: messages.length + uniqueMessages.length
        });
        
        setMessages(prev => {
          debugLog(`MBA2349f87g9qbh2nfv9cg: Before pagination update`, {
            existingMessagesLength: prev.length,
            messagesToAdd: uniqueMessages.length,
            page: page
          });
          
          // Create a set of existing message IDs for quick lookups
          const existingIds = new Set(prev.map(m => m.message_id).filter(Boolean));
          
          // Only add messages we don't already have
          const messagesToAdd = uniqueMessages.filter(msg => 
            !msg.message_id || !existingIds.has(msg.message_id)
          );
          
          debugLog(`MBA2349f87g9qbh2nfv9cg: Filtered messages for pagination`, {
            uniqueMessagesFromAPI: uniqueMessages.length,
            afterDuplicateFilter: messagesToAdd.length,
            existingIdsCount: existingIds.size
          });
          
          const updatedMessages = [...prev, ...messagesToAdd];
          
          debugLog(`MBA2349f87g9qbh2nfv9cg: Messages array updated via pagination`, {
            before: prev.length,
            added: messagesToAdd.length,
            after: updatedMessages.length,
            pageBeingAdded: page
          });
          
          return updatedMessages;
        });
        
        setHasMore(response.data.has_more || false);
        setIsLoadingMore(false);
        isLoadingMoreRef.current = false;
        
        debugLog(`MBA2349f87g9qbh2nfv9cg: Pagination state updated`, {
          page,
          hasMore: response.data.has_more || false,
          isLoadingMore: false,
          currentPageAfter: page
        });
      }

      setCurrentPage(page);
      
      debugLog(`MBA2349f87g9qbh2nfv9cg: fetchMessages completed successfully`, {
        page,
        finalMessageCount: page === 1 ? uniqueMessages.length : messages.length + uniqueMessages.length,
        currentPage: page,
        hasMore: response.data.has_more || false
      });

      setTimeout(() => {
        debugLog(`MBA2349f87g9qbh2nfv9cg: Messages state should be updated now`, {
          page,
          addedCount: uniqueMessages.length,
          totalAfterUpdate: page === 1 ? uniqueMessages.length : (messages.length + uniqueMessages.length),
          isLoadingMoreAfter: isLoadingMoreRef.current,
          currentPageAfter: currentPage
        });
      }, 100);

    } catch (error) {
      debugLog(`MBA2349f87g9qbh2nfv9cg: Error in fetchMessages for page ${page}:`, {
        error: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      console.error('Error fetching messages:', error);
      setIsLoadingMessages(false);
      if (page > 1) {
        isLoadingMoreRef.current = false;
        setIsLoadingMore(false);
      }
    }
  };

  // Function to send a message
  const SendNormalMessage = async (messageContent) => {
    try {
      debugLog('MBA2349f87g9qbh2nfv9cg: SendNormalMessage called', {
        messageLength: messageContent.length,
        conversationId: selectedConversation,
        currentMessageCount: messages.length
      });
      
      const token = await getStorage('userToken');
      const response = await axios.post(`${API_BASE_URL}/api/messages/v1/send_norm_message/`, {
        conversation_id: selectedConversation,
        content: messageContent
      }, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      debugLog('MBA2349f87g9qbh2nfv9cg: Message sent successfully', {
        messageId: response.data.message_id,
        timestamp: response.data.timestamp
      });

      // Add new message to the beginning of the list since FlatList is inverted
      setMessages(prevMessages => {
        debugLog('MBA2349f87g9qbh2nfv9cg: Adding sent message to list', {
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

      debugLog('MBA2349f87g9qbh2nfv9cg: SendNormalMessage completed successfully');
      return response.data;
    } catch (error) {
      debugLog('MBA2349f87g9qbh2nfv9cg: Error in SendNormalMessage:', error);
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
    
    if (hasMore && !isLoadingMoreRef.current && selectedConversation) {
      debugLog(`MBA2349f87g9qbh2nfv9cg: Starting pagination load for page ${currentPage + 1}`);
      fetchMessages(selectedConversation, currentPage + 1);
    } else {
      debugLog('MBA2349f87g9qbh2nfv9cg: Not loading more messages - conditions not met', {
        hasMore,
        isLoadingMoreRefCurrent: isLoadingMoreRef.current,
        selectedConversation: !!selectedConversation
      });
    }
  }, [hasMore, currentPage, selectedConversation, messages.length]);

  const renderMessage = useCallback(({ item }) => {
    // Create a map to keep track of which bookings have change requests and latest message timestamps
    const bookingMessages = groupMessagesByBookingId(messages);
    
    // Track bookings that have been confirmed
    const confirmedBookingIds = messages
      .filter(m => m.type_of_message === 'booking_confirmed')
      .map(m => m.metadata?.booking_id)
      .filter(Boolean);
    
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

    // Handle normal messages
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

  const WebInput = () => {
    const [message, setMessage] = useState('');
    const inputRef = useRef(null);
    const isProcessingRef = useRef(false);

    const adjustHeight = () => {
      if (inputRef.current) {
        // Store the current scroll position
        const scrollTop = inputRef.current.scrollTop;
        
        // Reset height to recalculate
        inputRef.current.style.height = 'inherit';
        
        // Set new height
        const newHeight = Math.min(inputRef.current.scrollHeight, 120);
        inputRef.current.style.height = `${newHeight}px`;
        
        // If we've hit max height, restore scroll position
        if (inputRef.current.scrollHeight > 120) {
          inputRef.current.scrollTop = scrollTop;
        }
      }
    };

    const handleChange = (e) => {
      setMessage(e.target.value);
      adjustHeight();
    };

    const handleSend = async () => {
      // Prevent duplicate sends by checking if we're already sending
      if (message.trim() && !isSending && !isProcessingRef.current) {
        isProcessingRef.current = true;
        setIsSending(true);
        
        try {
          // Clear input right away before API call to prevent double-sending
          const messageToSend = message.trim(); // Save message content
          setMessage(''); // Clear input field
          if (inputRef.current) {
            inputRef.current.style.height = '24px';
            inputRef.current.scrollTop = 0;
          }
          
          // Generate a unique temporary ID for optimistic update
          const tempId = `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
          
          // Optimistically add message to UI immediately
          const optimisticMessage = {
            message_id: tempId,
            content: messageToSend,
            timestamp: new Date().toISOString(),
            status: 'sent',
            type_of_message: 'normal_message',
            is_clickable: false,
            sent_by_other_user: false,
            _isOptimistic: true // Flag to identify this as an optimistic update
          };
          
          // Add to messages state
          setMessages(prevMessages => {
            // First check if we already have this message (prevent doubles)
            const messageExists = prevMessages.some(msg => 
              msg._isOptimistic && msg.content === messageToSend
            );
            
            if (messageExists) {
              debugLog('MBA3210: Skipping duplicate optimistic message');
              return prevMessages;
            }
            
            return [optimisticMessage, ...prevMessages];
          });
          
          // Actually send the message to the server
          const sentMessage = await SendNormalMessage(messageToSend);
          
          // Replace optimistic message with actual one
          setMessages(prevMessages => {
            // Remove optimistic message and add real one, ensuring no duplicates
            const filteredMessages = prevMessages.filter(msg => 
              // Keep all messages that are NOT our optimistic update
              !(msg._isOptimistic && msg.content === messageToSend)
            );
            
            // Check if the real message is already in the list
            const realMessageExists = filteredMessages.some(msg => 
              msg.message_id && sentMessage.message_id && 
              String(msg.message_id) === String(sentMessage.message_id)
            );
            
            if (realMessageExists) {
              debugLog('MBA3210: Real message already exists, skipping');
              return filteredMessages;
            }
            
            // Add the real message
            return [sentMessage, ...filteredMessages];
          });
        } catch (error) {
          console.error('Failed to send message:', error);
          
          // Restore the message in the input field on error
          setMessage(message);
          
          // Remove optimistic message on error
          setMessages(prevMessages => 
            prevMessages.filter(msg => !msg._isOptimistic)
          );
          
          // Show error
          Alert.alert('Error', 'Failed to send message. Please try again.');
        } finally {
          setIsSending(false);
          
          // Add delay before allowing another send
          setTimeout(() => {
            isProcessingRef.current = false;
          }, 300);
        }
      }
    };

    return (
      <View style={styles.inputInnerContainer}>
        <textarea
          ref={inputRef}
          style={styles.webInput}
          placeholder="Type a message..."
          value={message}
          onChange={handleChange}
          onKeyPress={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          disabled={isSending}
          rows={1}
        />
        <Button 
          mode="contained" 
          onPress={handleSend} 
          disabled={isSending}
          style={[styles.sendButton, screenWidth <= 600 && styles.sendButtonMobile]}
        >
          {isSending ? (
            <ActivityIndicator color={theme.colors.whiteText} size="small" />
          ) : screenWidth <= 600 ? (
            <MaterialCommunityIcons name="arrow-up" size={16} color={theme.colors.whiteText} />
          ) : (
            'Send'
          )}
        </Button>
      </View>
    );
  };

  const MobileInput = () => {
    const [message, setMessage] = useState('');
    const inputRef = useRef(null);
    const isProcessingRef = useRef(false);

    const handleSend = async () => {
      // Prevent duplicate sends by checking if we're already sending
      if (message.trim() && !isSending && !isProcessingRef.current) {
        isProcessingRef.current = true;
        setIsSending(true);
        
        try {
          // Clear input right away before API call to prevent double-sending
          const messageToSend = message.trim(); // Save message content
          setMessage(''); // Clear input field immediately
          
          // Generate a unique temporary ID for optimistic update
          const tempId = `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
          
          // Optimistically add message to UI immediately
          const optimisticMessage = {
            message_id: tempId,
            content: messageToSend,
            timestamp: new Date().toISOString(),
            status: 'sent',
            type_of_message: 'normal_message',
            is_clickable: false,
            sent_by_other_user: false,
            _isOptimistic: true // Flag to identify this as an optimistic update
          };
          
          // Add to messages state
          setMessages(prevMessages => {
            // First check if we already have this message (prevent doubles)
            const messageExists = prevMessages.some(msg => 
              msg._isOptimistic && msg.content === messageToSend
            );
            
            if (messageExists) {
              debugLog('MBA3210: Skipping duplicate optimistic message');
              return prevMessages;
            }
            
            return [optimisticMessage, ...prevMessages];
          });
          
          // Actually send the message to the server
          const sentMessage = await SendNormalMessage(messageToSend);
          
          // Replace optimistic message with actual one
          setMessages(prevMessages => {
            // Remove optimistic message and add real one, ensuring no duplicates
            const filteredMessages = prevMessages.filter(msg => 
              // Keep all messages that are NOT our optimistic update
              !(msg._isOptimistic && msg.content === messageToSend)
            );
            
            // Check if the real message is already in the list
            const realMessageExists = filteredMessages.some(msg => 
              msg.message_id && sentMessage.message_id && 
              String(msg.message_id) === String(sentMessage.message_id)
            );
            
            if (realMessageExists) {
              debugLog('MBA3210: Real message already exists, skipping');
              return filteredMessages;
            }
            
            // Add the real message
            return [sentMessage, ...filteredMessages];
          });
        } catch (error) {
          console.error('Failed to send message:', error);
          
          // Restore the message in the input field on error
          setMessage(message);
          
          // Remove optimistic message on error
          setMessages(prevMessages => 
            prevMessages.filter(msg => !msg._isOptimistic)
          );
          
          // Show error
          Alert.alert('Error', 'Failed to send message. Please try again.');
        } finally {
          setIsSending(false);
          
          // Add delay before allowing another send
          setTimeout(() => {
            isProcessingRef.current = false;
          }, 300);
        }
      }
    };

    return (
      <View style={styles.inputContainer}>
        <TextInput
          ref={inputRef}
          style={styles.input}
          placeholder="Type a message..."
          value={message}
          onChangeText={setMessage}
          multiline
          blurOnSubmit={false}
          editable={!isSending}
        />
        <Button 
          mode="contained" 
          onPress={handleSend}
          disabled={isSending}
        >
          {isSending ? (
            <ActivityIndicator color={theme.colors.primary} size="small" />
          ) : (
            'Send'
          )}
        </Button>
      </View>
    );
  };

  const MessageInput = Platform.OS === 'web' ? <WebInput /> : <MobileInput />;
  
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
    // Filtering is now handled by the useEffect defined above
  };

  // Update conversation list to include search
  const renderConversationList = () => (
    <View style={styles.conversationListContainer}>
      <View style={styles.searchContainer}>
        <View style={[
          styles.searchInputContainer, 
          isSearchFocused && { borderColor: theme.colors.primary }
        ]}>
          <MaterialCommunityIcons 
            name="magnify" 
            size={20} 
            color={theme.colors.placeholder}
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Search conversations"
            placeholderTextColor={theme.colors.placeholder}
            value={searchQuery}
            onChangeText={handleSearch}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity 
              style={styles.clearButton}
              onPress={() => setSearchQuery('')}
            >
              <MaterialCommunityIcons 
                name="close-circle" 
                size={16} 
                color={theme.colors.placeholder}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>
      {filteredConversations.map((conv) => {
        const otherParticipantName = conv.participant1_id === CURRENT_USER_ID ? 
          conv.participant2_name : conv.participant1_name;
        
        if (is_DEBUG) {
          console.log('MBA98765 Rendering conversation item:', {
            convId: conv.conversation_id,
            convIdType: typeof conv.conversation_id,
            selectedId: selectedConversation,
            selectedIdType: typeof selectedConversation,
            isSelected: String(conv.conversation_id) === String(selectedConversation)
          });
        }
        
        const isSelected = String(conv.conversation_id) === String(selectedConversation);
          
        // Get unread count for this conversation from MessageNotificationContext
        const unreadCount = getConversationUnreadCount ? 
          getConversationUnreadCount(String(conv.conversation_id)) : 0;
        
        // Only log if there are unread messages to reduce noise in logs
        if (unreadCount > 0) {
          debugLog(`MBA4321: Conversation ${conv.conversation_id} has ${unreadCount} unread messages`);
        }
          
        return (
          <TouchableOpacity
            key={conv.conversation_id}
            style={[
              styles.conversationItem,
              isSelected && styles.selectedConversation
            ]}
            onPress={() => {
              if (is_DEBUG) {
                console.log('MBA98765 Setting selected conversation:', {
                  id: conv.conversation_id,
                  type: typeof conv.conversation_id
                });
              }
              
              // Set the selected conversation
              setSelectedConversation(conv.conversation_id);
              
              // Mark this conversation as read when clicked
              if (markConversationAsRead && unreadCount > 0) {
                debugLog(`MBA4321: Explicitly marking ONLY conversation ${conv.conversation_id} as read when clicked`);
                markConversationAsRead(conv.conversation_id);
              }
            }}
          >
            <View style={styles.conversationContent}>
              <View style={styles.conversationHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                  <Text style={styles.conversationName}>
                    {otherParticipantName || conv.name || conv.other_user_name || 'Unknown'}
                  </Text>
                </View>
                
                <Text style={styles.conversationTime}>
                  {new Date(conv.last_message_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </Text>
              </View>
              <View style={styles.conversationLastMessageContainer}>
                <Text 
                  style={[
                    styles.conversationLastMessage,
                    isSelected && styles.activeConversationText,
                    (conv.unread || unreadCount > 0) && !isSelected && styles.unreadMessage
                  ]} 
                  numberOfLines={1}
                >
                  {conv.last_message}
                </Text>
                
                {/* Show unread count badge next to the last message */}
                {unreadCount > 0 && !isSelected && (
                  <View style={styles.unreadBadge}>
                    <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
                  </View>
                )}
              </View>
              {conv.bookingStatus && (
                <View style={[
                  styles.bookingStatusContainer,
                  styles[`booking${conv.bookingStatus}Status`] || styles.bookingPendingStatus
                ]}>
                  <Text style={styles.bookingStatus}>
                    {conv.bookingStatus}
                  </Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  // Update message header to include profile photo and edit draft button
  const renderMessageHeader = () => (
    <View style={styles.messageHeader}>
      <View style={styles.messageHeaderContent}>
        <Image
          source={selectedConversationData?.profile_photo || require('../../assets/default-profile.png')}
          style={styles.profilePhoto}
        />
        <Text style={styles.messageHeaderName}>
          {selectedConversationData?.other_user_name}
        </Text>
        
        {hasDraft && draftData?.draft_id && selectedConversationData?.is_professional && (
          <TouchableOpacity 
            style={styles.editDraftButton}
            onPress={() => {
              if (draftData?.draft_id) {
                handleOpenExistingDraft(draftData.draft_id);
              }
            }}
          >
            <MaterialCommunityIcons 
              name="pencil" 
              size={20} 
              color={theme.colors.primary} 
            />
            <Text style={styles.editDraftText}>Edit Draft</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  // Extract FlatList into a dedicated component
  const MessageFlatList = React.memo(({ 
    messages, 
    renderMessage, 
    loadMoreMessages, 
    isLoadingMore, 
    hasMore 
  }) => {
    const flatListRef = useRef(null);
    const lastScrollYRef = useRef(0);
    const scrollEventCountRef = useRef(0);
    
    const handleScroll = useCallback((event) => {
      const currentScrollY = event.nativeEvent.contentOffset.y;
      const contentHeight = event.nativeEvent.contentSize.height;
      const layoutHeight = event.nativeEvent.layoutMeasurement.height;
      
      scrollEventCountRef.current++;
      
      // Detect significant scroll jumps
      const scrollDelta = Math.abs(currentScrollY - lastScrollYRef.current);
      if (scrollDelta > 500) {
        debugLog(`MBA2349f87g9qbh2nfv9cg: LARGE SCROLL JUMP DETECTED`, {
          from: lastScrollYRef.current,
          to: currentScrollY,
          delta: scrollDelta,
          messagesCount: messages.length,
          contentHeight,
          layoutHeight,
          eventCount: scrollEventCountRef.current
        });
      }
      
      lastScrollYRef.current = currentScrollY;
      
      // Only log scroll events periodically to avoid spam
      if (scrollEventCountRef.current % 10 === 0) {
        debugLog(`MBA2349f87g9qbh2nfv9cg: Scroll position (every 10th event)`, {
          scrollY: currentScrollY,
          contentHeight,
          layoutHeight,
          messagesCount: messages.length,
          eventCount: scrollEventCountRef.current,
          lastScrollY: lastScrollYRef.current
        });
      }
    }, [messages.length]);
    
    const handleEndReached = useCallback(() => {
      debugLog(`MBA2349f87g9qbh2nfv9cg: onEndReached triggered`, {
        scrollY: lastScrollYRef.current,
        messagesCount: messages.length,
        hasMore,
        isLoadingMore
      });
      
      loadMoreMessages();
    }, [loadMoreMessages, messages.length, hasMore, isLoadingMore]);
    
    const handleMomentumScrollEnd = useCallback((event) => {
      const scrollY = event.nativeEvent.contentOffset.y;
      debugLog(`MBA2349f87g9qbh2nfv9cg: Scroll momentum ended`, {
        scrollY,
        messagesCount: messages.length,
        lastScrollY: lastScrollYRef.current
      });
    }, [messages.length]);
    
    const handleContentSizeChange = useCallback((contentWidth, contentHeight) => {
      debugLog(`MBA2349f87g9qbh2nfv9cg: FlatList content size changed`, {
        contentWidth,
        contentHeight,
        messagesCount: messages.length,
        currentScrollY: lastScrollYRef.current
      });
    }, [messages.length]);
    
    const handleLayoutChange = useCallback((event) => {
      const { width, height } = event.nativeEvent.layout;
      debugLog(`MBA2349f87g9qbh2nfv9cg: FlatList layout changed`, {
        width,
        height,
        messagesCount: messages.length,
        currentScrollY: lastScrollYRef.current
      });
    }, [messages.length]);
    
    // Log when messages prop changes
    useEffect(() => {
      debugLog(`MBA2349f87g9qbh2nfv9cg: MessageFlatList messages prop changed`, {
        messageCount: messages.length,
        firstMessageId: messages[0]?.message_id,
        lastMessageId: messages[messages.length - 1]?.message_id
      });
    }, [messages]);
    
    return (
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={item => {
          // Prioritize message_id if available
          if (item.message_id) {
            return `message-${item.message_id}`;
          }
          
          // Create a more robust fallback key using multiple properties
          const timestamp = item.timestamp || item.created_at || Date.now();
          const senderHash = item.sent_by_other_user ? 'other' : 'self';
          const contentHash = item.content ? 
            `${item.content.substring(0, 10)}-${item.content.length}` : 
            'no-content';
          const typeHash = item.type_of_message || 'normal';
          
          // Combine all these factors for a more unique key
          return `message-${timestamp}-${senderHash}-${typeHash}-${contentHash}`;
        }}
        style={styles.messageList}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.3}
        onScroll={handleScroll}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        onContentSizeChange={handleContentSizeChange}
        onLayout={handleLayoutChange}
        scrollEventThrottle={16}
        inverted={true}
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: 'flex-end',
          paddingTop: 16,
        }}
        maintainVisibleContentPosition={{
          minIndexForVisible: 0,
          autoscrollToTopThreshold: 10
        }}
        ListFooterComponent={isLoadingMore && (
          <ActivityIndicator 
            size="small" 
            color={theme.colors.primary}
            style={styles.loadingMore}
          />
        )}
        initialNumToRender={20}
        maxToRenderPerBatch={10}
        windowSize={15}
        removeClippedSubviews={false}
        getItemLayout={(data, index) => ({
          length: 100, // Estimated item height
          offset: 100 * index,
          index,
        })}
      />
    );
  });

  // Update renderMessageSection to use our new component
  const renderMessageSection = () => {
    if (!selectedConversation) {
      return null;
    }

    return (
      <View style={styles.mainSection}>
        {screenWidth > 900 && renderMessageHeader()}
        {/* Messages */}
        <View style={styles.messageSection}>
          {/* Create Booking Button overlay */}
          {selectedConversationData?.is_professional && (
            <View style={styles.createBookingContainer}>
              <TouchableOpacity 
                style={styles.createBookingHangingButton}
                onPress={handleCreateBooking}
              >
                <MaterialCommunityIcons 
                  name="calendar-plus" 
                  size={20} 
                  color={theme.colors.primary} 
                />
                <Text style={styles.createBookingHangingText}>
                  Create Booking
                </Text>
              </TouchableOpacity>
            </View>
          )}
          
          <View style={styles.messagesContainer}>
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
              <MessageFlatList
                messages={messages}
                renderMessage={renderMessage}
                loadMoreMessages={loadMoreMessages}
                isLoadingMore={isLoadingMore}
                hasMore={hasMore} 
              />
            )}
          </View>
        </View>

        {/* Input Section */}
        <View style={styles.inputSection}>
          <View style={styles.inputContainer}>
            <View style={styles.attachButtonContainer}>
              <TouchableOpacity 
                style={styles.attachButton}
                onPress={() => setShowDropdown(!showDropdown)}
              >
                <MaterialCommunityIcons 
                  name={showDropdown ? "close" : "plus"} 
                  size={24} 
                  color={theme.colors.primary} 
                />
              </TouchableOpacity>
              {showDropdown && (
                <View style={styles.dropdownMenu}>
                  <TouchableOpacity 
                    style={styles.dropdownItem}
                    onPress={() => {
                      setShowDropdown(false);
                    }}
                  >
                    <MaterialCommunityIcons 
                      name="image" 
                      size={20} 
                      color={theme.colors.placeholder} 
                    />
                    <Text style={[styles.dropdownText, { color: theme.colors.placeholder }]}>
                      Coming Soon - Images
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
            {Platform.OS === 'web' ? <WebInput /> : <MobileInput />}
          </View>
        </View>
      </View>
    );
  };

  const renderMobileHeader = () => (
    <View style={[
      styles.mobileHeader,
      { backgroundColor: theme.colors.surfaceContrast }  // Updated to use surfaceContrast
    ]}>
      <View style={styles.mobileHeaderContent}>
        <TouchableOpacity 
          style={styles.backArrow}
          onPress={() => setSelectedConversation(null)}
        >
          <MaterialCommunityIcons 
            name="arrow-left" 
            size={24} 
            color={theme.colors.primary} 
          />
        </TouchableOpacity>
        
        <View style={styles.mobileHeaderNameContainer}>
          <Text style={styles.mobileHeaderName}>
            {selectedConversationData?.name || selectedConversationData?.other_user_name}
          </Text>
        </View>
        
        {/* Add Edit Draft button positioned at the right */}
        {hasDraft && draftData?.draft_id && selectedConversationData?.is_professional && (
          <TouchableOpacity 
            style={[styles.editDraftButton, styles.mobileEditDraftButton, { 
              position: 'absolute', 
              right: 10,
              top: '50%',
              transform: [{ translateY: -20 }]  // Adjusted to perfectly align with text
            }]}
            onPress={() => {
              if (draftData?.draft_id) {
                handleOpenExistingDraft(draftData.draft_id);
              }
            }}
          >
            <MaterialCommunityIcons 
              name="pencil" 
              size={16} 
              color={theme.colors.primary} 
            />
            <View style={{ alignItems: 'center' }}>
              <Text style={[styles.editDraftText, { fontSize: 12, lineHeight: 14 }]}>Edit</Text>
              <Text style={[styles.editDraftText, { fontSize: 12, lineHeight: 14 }]}>Draft</Text>
            </View>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

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
        size={64} 
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

  // Add a loading overlay component at the bottom of the return statement, before any modals
  return (
    <SafeAreaView style={[
      styles.container,
      screenWidth <= 900 && selectedConversation && styles.mobileContainer,
      { marginLeft: screenWidth > 900 ? (isCollapsed ? 70 : 250) : 0 },
    ]}>
      {isLoadingConversations ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={{ marginTop: 16, color: theme.colors.placeholder }}>Loading conversations...</Text>
        </View>
      ) : conversations.length > 0 ? (
        <>
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
        </>
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

      <DraftConfirmationModal
        visible={showDraftConfirmModal}
        onClose={() => setShowDraftConfirmModal(false)}
        onContinueExisting={handleContinueExisting}
        onCreateNew={handleCreateNew}
      />
    </SafeAreaView>
  );
};

export default MessageHistory;

