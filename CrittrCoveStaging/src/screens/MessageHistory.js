import React, { useState, useCallback, useRef, useEffect, useContext } from 'react';
import { View, StyleSheet, FlatList, KeyboardAvoidingView, Platform, SafeAreaView, StatusBar, TextInput, Text, TouchableOpacity, Dimensions, Alert, Image } from 'react-native';
import { Button, Card, Paragraph, useTheme, ActivityIndicator } from 'react-native-paper';
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
  },
  selectedConversation: {
    backgroundColor: theme.colors.primary + '20',
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.primary,
  },
  conversationName: {
    fontSize: 16,
    fontFamily: theme.fonts.header.fontFamily,
  },
  messageSection: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    paddingHorizontal: 5,
    backgroundColor: theme.colors.surface, // #FDFBF5
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
    fontSize: 16,
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
    fontSize: screenWidth <= 600 ? '14px' : 'inherit',
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
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  conversationTime: {
    fontSize: 12,
    color: theme.colors.placeholder,
  },
  conversationLastMessage: {
    fontSize: 14,
    color: theme.colors.placeholder,
    marginBottom: 8,
    fontFamily: theme.fonts.regular.fontFamily,
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
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    position: 'relative',
    zIndex: 10,
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
  },
  mobileHeaderName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
    textAlign: 'center',
    fontFamily: theme.fonts.header.fontFamily,
  },
  backArrow: {
    position: 'absolute',
    left: 16,
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
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: 16,
    color: theme.colors.text,
    fontFamily: theme.fonts.regular.fontFamily,
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
});

const MessageHistory = ({ navigation, route }) => {
  const { colors } = useTheme();
  const { screenWidth } = useContext(AuthContext);
  const styles = createStyles(screenWidth, false);
  
  // Add loading states
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [selectedConversationData, setSelectedConversationData] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isSending, setIsSending] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const { is_DEBUG, is_prototype, isCollapsed, isApprovedProfessional, userRole, timeSettings } = useContext(AuthContext);
  const [conversations, setConversations] = useState([]);
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

  // Add a ref to track if we're handling route params
  const isHandlingRouteParamsRef = useRef(false);

  // Add a ref to track if messages have been fetched for the current conversation
  const hasLoadedMessagesRef = useRef(false);

  // Add a ref to track if we need to open booking creation
  const shouldOpenBookingCreationRef = useRef(false);

  // Modify the mount effect to handle initial load
  useEffect(() => {
    if (!initialLoadRef.current) return; // Only run on first mount
    
    if (is_DEBUG) {
      console.log('MBA98765 Component mounted - initializing data');
    }

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

        // Handle URL parameters on web
        if (Platform.OS === 'web') {
          const currentUrl = new URL(window.location.href);
          const urlConversationId = currentUrl.searchParams.get('conversationId');
          
          // Clear URL parameters
          if (currentUrl.searchParams.has('conversationId')) {
            currentUrl.searchParams.delete('conversationId');
            window.history.replaceState({}, '', currentUrl.toString());
            if (is_DEBUG) {
              console.log('MBA98765 Cleared URL parameters on initial load');
            }
          }

          // If we have a conversation ID in URL, we'll use that instead of auto-selecting
          if (urlConversationId) {
            // const conversationsData = await fetchConversations();
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
            if (is_DEBUG) {
              console.log('MBA98765 Will open booking creation after data loads');
            }
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

        // Normal initialization
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
      if (is_DEBUG) {
        console.log('MBA98765 Component unmounting - cleaning up');
      }
      setConversations([]);
      setMessages([]);
      setSelectedConversation(null);
      setSelectedConversationData(null);
      initialLoadRef.current = true;
      setIsInitialLoad(true);
      isHandlingRouteParamsRef.current = false;
      hasLoadedMessagesRef.current = false;
      shouldOpenBookingCreationRef.current = false;
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

    if (is_DEBUG) {
      console.log('MBA98765 Selected conversation changed:', {
        id: selectedConversation,
        type: typeof selectedConversation,
        isHandlingRouteParams: isHandlingRouteParamsRef.current
      });
    }

    // Find the conversation in our list
    const conversation = conversations.find(conv => String(conv.conversation_id) === String(selectedConversation));
    
    if (conversation) {
      setSelectedConversationData(conversation);
      
      // Update URL on web platform
      if (Platform.OS === 'web') {
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.set('conversationId', selectedConversation);
        window.history.pushState({}, '', newUrl.toString());
      }

      // Reset pagination state
      setCurrentPage(1);
      setHasMore(true);
      
      // Reset message loading flag for new conversation
      hasLoadedMessagesRef.current = false;
    } else {
      if (is_DEBUG) {
        console.log('MBA98765 Could not find conversation data for ID:', selectedConversation);
      }
    }
  }, [selectedConversation, conversations, isInitialLoad]);

  // Add dedicated effect for message fetching
  useEffect(() => {
    if (!selectedConversation || isInitialLoad || hasLoadedMessagesRef.current) {
      return;
    }

    if (is_DEBUG) {
      console.log('MBA98765 Fetching messages for conversation:', {
        id: selectedConversation,
        hasLoaded: hasLoadedMessagesRef.current,
        shouldOpenBookingCreation: shouldOpenBookingCreationRef.current
      });
    }

    hasLoadedMessagesRef.current = true;
    fetchMessages(selectedConversation, 1)
      .then(() => {
        // After messages are loaded, if we need to open booking creation,
        // we now have hasDraft and draftData set properly
        if (shouldOpenBookingCreationRef.current && selectedConversationData) {
          if (is_DEBUG) {
            console.log('MBA98765 Messages loaded, now draft data is available');
          }
        }
      })
      .catch(error => {
        console.error('Error fetching messages:', error);
      });
  }, [selectedConversation, isInitialLoad]);

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

  // Modify fetchConversations to return the data
  const fetchConversations = async () => {
    try {
      setIsLoadingConversations(true);

      const token = await getStorage('userToken');
      const requestUrl = `${API_BASE_URL}/api/conversations/v1/`;
      
      const response = await axios.get(requestUrl, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.data && Array.isArray(response.data)) {
        setConversations(response.data);
        return response.data;
      }
      return [];
    } catch (error) {
      console.error('Error fetching conversations:', error);
      return [];
    } finally {
      setIsLoadingConversations(false);
    }
  };

  // Modify fetchMessages to handle pagination better
  const fetchMessages = async (conversationId, page = 1) => {
    console.log('MBABOSS [1] Starting fetchMessages with conversationId:', conversationId, 'page:', page);
    try {
      console.log('MBABOSS [2] Entered try block');
      
      if (page === 1) {
        console.log('MBABOSS [3] Setting loading messages for page 1');
        setIsLoadingMessages(true);
        // Reset messages when fetching first page
        setMessages([]);
      } else {
        console.log('MBABOSS [3] Setting loading more for page:', page);
        setIsLoadingMore(true);
      }
      
      console.log('MBABOSS [4] Getting storage token');
      const token = await getStorage('userToken');
      console.log('MBABOSS [5] Got token:', token ? 'Token exists' : 'No token');
      
      const url = `${API_BASE_URL}/api/messages/v1/conversation/${conversationId}/?page=${page}`;
      console.log('MBABOSS [6] Making request to URL:', url);

      const response = await axios.get(url, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('MBABOSS [7] Got response:', response.status);
      
      // Update the messages state based on the page
      if (page === 1) {
        console.log('MBABOSS [8] Setting messages for page 1');
        setMessages(response.data.messages || []);
        // Set draft data only on first page load
        setHasDraft(response.data.has_draft || false);
        setDraftData(response.data.draft_data || null);
      } else {
        console.log('MBABOSS [8] Appending messages for page:', page);
        setMessages(prev => [...prev, ...(response.data.messages || [])]);
      }
      
      // Update pagination state
      setHasMore(response.data.has_more);
      setCurrentPage(page);

      console.log('MBABOSS [9] Successfully completed fetchMessages');
    } catch (error) {
      console.error('MBABOSS [ERROR] Error in fetchMessages:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        url: error.config?.url,
        method: error.config?.method
      });
    } finally {
      console.log('MBABOSS [10] In finally block, cleaning up');
      setIsLoadingMessages(false);
      setIsLoadingMore(false);
    }
    console.log('MBABOSS [11] Exiting fetchMessages');
  };

  // Function to send a message
  const SendNormalMessage = async (messageContent) => {
    try {
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

      // Add new message to the beginning of the list since FlatList is inverted
      setMessages(prevMessages => [response.data, ...prevMessages]);

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

      return response.data;
    } catch (error) {
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
  const loadMoreMessages = () => {
    if (is_DEBUG) {
      console.log('MBA98765 loadMoreMessages called:', {
        hasMore,
        isLoadingMore,
        currentPage,
        selectedConversation
      });
    }
    
    if (hasMore && !isLoadingMore && selectedConversation) {
      fetchMessages(selectedConversation, currentPage + 1);
    }
  };

  const renderMessage = useCallback(({ item }) => {
    // Create a map to keep track of which bookings have change requests
    // This is defined outside the component to persist between renders
    if (!renderMessage.changeRequestMap) {
      renderMessage.changeRequestMap = new Map();

      // Initialize the map with booking IDs that have change requests
      messages.forEach(msg => {
        if (msg.type_of_message === 'request_changes' && msg.metadata?.booking_id) {
          renderMessage.changeRequestMap.set(msg.metadata.booking_id, true);
        }
      });
    }

    // Update the map when we encounter a change request
    if (item.type_of_message === 'request_changes' && item.metadata?.booking_id) {
      renderMessage.changeRequestMap.set(item.metadata.booking_id, true);
    }

    // Handle booking messages (both requests and approvals)
    if (item.type_of_message === 'initial_booking_request' || 
        item.type_of_message === 'send_approved_message') {
      const isFromMe = !item.sent_by_other_user;

      // Check if this booking has a change request
      const bookingId = item.metadata?.booking_id;
      const hasChangeRequest = bookingId ? renderMessage.changeRequestMap.has(bookingId) : false;

      // Safely get total owner cost
      const totalOwnerCost = item.metadata?.cost_summary?.total_owner_cost || 
                            item.metadata?.total_owner_cost || 
                            0;

      if (is_DEBUG) {
        console.log('MBA9876i2ghv93 Message data:', {
          type: item.type_of_message,
          metadata: item.metadata,
          booking_id: item.metadata?.booking_id,
          service_type: item.metadata?.service_type,
          totalOwnerCost,
          userTimezone: timeSettings.timezone,
          occurrences: item.metadata.occurrences,
          hasChangeRequest
        });
      }

      // Determine if we should show edit draft button
      // Only show for initial_booking_request when we have a draft and user is professional
      const showEditDraft = item.type_of_message === 'initial_booking_request' && 
                           hasDraft && 
                           draftData && 
                           selectedConversationData?.is_professional;

      return (
        <BookingMessageCard
          type={item.type_of_message === 'initial_booking_request' ? 'request' : 'approval'}
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
              fetchMessages(selectedConversation, 1);
            }
          }}
          onApproveError={(error) => {
            Alert.alert('Error', error || 'Failed to approve booking');
          }}
          onEditDraft={showEditDraft ? () => handleEditDraft(item.metadata.draft_id) : undefined}
          bookingStatus={item.metadata?.booking_status}
          hasChangeRequest={hasChangeRequest}
        />
      );
    }

    if (item.type_of_message === 'request_changes') {
      const isFromMe = !item.sent_by_other_user;
      
      // Get booking details from metadata
      const bookingId = item.metadata?.booking_id;
      const serviceType = item.metadata?.service_type;
      const bookingStatus = item.metadata?.booking_status;
      
      // Log for debugging
      debugLog('MBA88899 Rendering change request message:', {
        bookingId,
        isFromMe,
        content: item.content,
        metadata: item.metadata
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
              fetchMessages(selectedConversation, 1);
            }
          }}
          onApproveError={(error) => {
            Alert.alert('Error', error || 'Failed to process changes');
          }}
          onEditDraft={() => {
            // Navigate to edit booking if professional
            if (selectedConversationData?.is_professional && bookingId) {
              navigation.navigate('EditBooking', { 
                bookingId: bookingId,
                from: 'MessageHistory'
              });
            }
          }}
          bookingStatus={bookingStatus}
          hasChangeRequest={false} // Change request message itself doesn't need an overlay
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
      if (message.trim() && !isSending) {
        setIsSending(true);
        try {
          await SendNormalMessage(message.trim());
          setMessage('');
          if (inputRef.current) {
            inputRef.current.style.height = '24px';
            inputRef.current.scrollTop = 0;
          }
        } catch (error) {
          console.error('Failed to send message:', error);
        } finally {
          setIsSending(false);
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

    const handleSend = async () => {
      if (message.trim() && !isSending) {
        setIsSending(true);
        try {
          await SendNormalMessage(message.trim());
          setMessage('');
        } catch (error) {
          console.error('Failed to send message:', error);
        } finally {
          setIsSending(false);
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

      if (is_DEBUG) {
        console.log('MBABOSS Created booking with ID:', bookingRequestResponse.data.booking_id);
      }

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

      if (is_DEBUG) {
        console.log('Sent message response:', messageResponse.data);
      }

      // Add the new message to the messages list
      setMessages(prevMessages => [messageResponse.data, ...prevMessages]);

      setShowRequestModal(false);
    } catch (error) {
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
    // TODO: Implement search logic here
  };

  // Update conversation list to include search
  const renderConversationList = () => (
    <View style={styles.conversationListContainer}>
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
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
          />
        </View>
      </View>
      {conversations.map((conv) => {
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
              setSelectedConversation(conv.conversation_id);
            }}
          >
            <View style={styles.conversationContent}>
              <View style={styles.conversationHeader}>
                <Text style={[
                  styles.conversationName
                ]}>
                  {otherParticipantName || conv.name || conv.other_user_name || 'Unknown'}
                </Text>
                <Text style={styles.conversationTime}>
                  {new Date(conv.last_message_time).toLocaleTimeString()}
                </Text>
              </View>
              <Text 
                style={[
                  styles.conversationLastMessage,
                  isSelected && styles.activeConversationText,
                  conv.unread && styles.unreadMessage
                ]} 
                numberOfLines={1}
              >
                {conv.last_message}
              </Text>
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
        {hasDraft && (
          <TouchableOpacity 
            style={styles.editDraftButton}
            onPress={() => {
              if (draftData?.draft_id) {
                handleEditDraft(draftData.draft_id);
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

  // Update message section to use new header
  const renderMessageSection = () => {
    if (!selectedConversation) {
      return null;
    }

    return (
      <View style={styles.mainSection}>
        {screenWidth > 900 && renderMessageHeader()}
        {/* Messages */}
        <View style={styles.messageSection}>
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
              <FlatList
                data={messages}
                renderItem={renderMessage}
                keyExtractor={item => {
                  // Use message_id if available, fallback to timestamp + content as unique key
                  return item.message_id ? 
                    `message-${item.message_id}` : 
                    `message-${item.timestamp}-${item.content?.substring(0, 10)}`;
                }}
                style={styles.messageList}
                onEndReached={loadMoreMessages}
                onEndReachedThreshold={0.5}
                inverted={true}
                contentContainerStyle={{
                  flexGrow: 1,
                  justifyContent: 'flex-end'
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
                      handleCreateBooking();
                      setShowDropdown(false);
                    }}
                  >
                    <MaterialCommunityIcons 
                      name="calendar-plus" 
                      size={20} 
                      color={theme.colors.primary} 
                    />
                    <Text style={styles.dropdownText}>
                      {selectedConversationData?.is_professional ? "Create Booking" : "Request Booking"}
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
    <View style={styles.mobileHeader}>
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
        <Text style={styles.mobileHeaderName}>
          {selectedConversationData?.name || selectedConversationData?.other_user_name}
        </Text>
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
        onPress={() => navigateToFrom(navigation, userRole === 'professional' ? 'Services' : 'SearchProfessionalListing', 'MessageHistory')}
        style={{ borderRadius: 8 }}
      >
        {userRole === 'professional' ? 'Create Services' : 'Find Professionals'}
      </Button>
    </View>
  );

  const handleEditDraft = (draft_id) => {
    if (is_DEBUG) {
      console.log('MBA98765 handleEditDraft:', {
        draft_id,
        showBookingStepModal
      });
    }
    
    // Use the provided draft_id
    setCurrentBookingId(draft_id);
    setShowDraftConfirmModal(false); // Ensure draft confirm modal is closed
    // Add a small delay to ensure modal state is updated
    setTimeout(() => {
      if (is_DEBUG) {
        console.log('MBA98765 Opening BookingStepModal with draft:', draft_id);
      }
      setShowBookingStepModal(true);
    }, 100);
  };

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
        }}
        bookingId={currentBookingId}
        onComplete={(bookingData) => {
          if (is_DEBUG) {
            console.log('MBA98765 Booking completed:', bookingData);
            console.log('MBA98765 New booking message:', bookingData.message);
            console.log('MBA98765 Message metadata:', bookingData.message?.metadata);
          }
          
          // Handle error case
          if (bookingData.error) {
            Alert.alert(
              'Error',
              bookingData.errorMessage || 'Failed to create booking. Please try again.'
            );
            
            // Close the modal and clean up
            setShowBookingStepModal(false);
            setCurrentBookingId(null);
            return;
          }
          
          // Add the newly created booking message to the messages list
          if (bookingData.message) {
            setMessages(prevMessages => [bookingData.message, ...prevMessages]);
            
            // Update conversation's last message
            setConversations(prev => prev.map(conv => 
              conv.conversation_id === selectedConversation 
                ? {
                    ...conv,
                    last_message: "Approval Request",
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

