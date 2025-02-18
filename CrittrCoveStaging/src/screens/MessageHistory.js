import React, { useState, useCallback, useRef, useEffect, useContext } from 'react';
import { View, StyleSheet, FlatList, KeyboardAvoidingView, Platform, SafeAreaView, StatusBar, TextInput, Text, TouchableOpacity, Dimensions, Alert } from 'react-native';
import { Button, Card, Paragraph, useTheme, ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons'; // Import the icon library
import { theme } from '../styles/theme';
import { AuthContext, getStorage } from '../context/AuthContext';
import RequestBookingModal from '../components/RequestBookingModal';
import { createBooking, BOOKING_STATES, mockConversations, mockMessages, CURRENT_USER_ID } from '../data/mockData';
import { format } from 'date-fns';
import { useNavigation } from '@react-navigation/native';
import { API_BASE_URL } from '../config/config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { navigateToFrom } from '../components/Navigation';

// First, create a function to generate dynamic styles
const createStyles = (screenWidth) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingTop: screenWidth > 1000 ? 0 : 0,
    paddingRight: screenWidth > 1000 ? 0 : 0,
    paddingLeft: screenWidth > 1000 ? 0 : 0,
    height: 'calc(100vh - 64px)',
    overflow: 'hidden',
    position: 'fixed',
    top: 64,
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
    maxWidth: screenWidth > 1000 ? '100%' : 1000,
    alignSelf: 'center',
    width: '100%',
    overflow: 'hidden',
    height: '100%',
  },
  conversationListContainer: {
    width: screenWidth <= 1000 ? '100%' : '30%',
    maxWidth: screenWidth < 1000 ? '' : 600,
    borderRightWidth: 2,
    backgroundColor: theme.colors.surface,
    overflow: 'auto',
  },
  conversationItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    maxWidth: screenWidth < 1000 ? '' : 600,
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
    position: 'relative',
    height: '100%',
    marginLeft: screenWidth > 1000 ? 0 : 0,
    maxWidth: Platform.OS === 'web' ? 
      (screenWidth <= 1000 ? '100%' : '70%') : 
      '100%',
    alignSelf: screenWidth <= 1000 ? 'stretch' : 'flex-start',
    width: screenWidth <= 1000 ? '100%' : 'auto',
    overflow: 'hidden',
    paddingRight: screenWidth > 1000 ? 100 : 0,
    paddingBottom: 60,
  },
  messagesContainer: {
    flex: 1,
    overflow: 'auto',
    width: '100%',
    position: 'absolute',
    padding: 16,
    paddingTop: screenWidth > 1000 ? 72 : 0,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  messageList: {
    // padding: 16,
    width: '100%',
    paddingTop: 80, // the list is inverted, so we need to pad the top to account for the footer on mobile
  },
  messageInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  attachButton: {
    padding: 8,
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
  },
  messageCard: {
    marginVertical: 4,
    maxWidth: screenWidth > 1000 ? '40%' : '60%',
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
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  input: {
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingHorizontal: 8,
    paddingVertical: 8,
    maxHeight: 100,
  },
  webInput: {
    flex: 1,
    backgroundColor: 'transparent',
    paddingVertical: '8px',
    paddingLeft: '12px',
    height: screenWidth <= 600 ? 36 : 40,
    border: '1px solid ' + theme.colors.border,
    borderRadius: 20,
    fontFamily: theme.fonts.regular.fontFamily,
    fontSize: screenWidth <= 600 ? '14px' : 'inherit',
    appearance: 'none',
    touchAction: 'manipulation',
    WebkitTapHighlightColor: 'transparent',
    WebkitUserSelect: 'none',
    userSelect: 'none',
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
  inputInnerContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    borderRadius: 20,
    marginRight: screenWidth <= 600 ? 4 : 8,
    
  },
  attachButton: {
    padding: 8,
    marginRight: 8,
    backgroundColor: theme.colors.background,
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButton: {
    marginLeft: 8,
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  attachButtonContainer: {
    position: 'relative',
    zIndex: 2,
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
  messageHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 2,
  },
  messageHeaderName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
    textAlign: 'center',
    fontFamily: theme.fonts.header.fontFamily,
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
    borderRadius: 8,
    padding: 16,
    margin: 8,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    maxWidth: 500,
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
  detailLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.placeholder,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  detailText: {
    fontSize: 16,
    color: theme.colors.text,
    fontFamily: theme.fonts.regular.fontFamily,
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
});

const MessageHistory = ({ navigation, route }) => {
  const { colors } = useTheme();
  const { screenWidth } = useContext(AuthContext);
  const styles = createStyles(screenWidth);
  
  // Add loading states
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [selectedConversationData, setSelectedConversationData] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isSending, setIsSending] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const { is_DEBUG, is_prototype, isApprovedProfessional } = useContext(AuthContext);
  const [conversations, setConversations] = useState([]);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Clear data on unmount
  useEffect(() => {
    return () => {
      setConversations([]);
      setMessages([]);
      setSelectedConversation(null);
      setSelectedConversationData(null);
      setIsLoadingConversations(is_prototype ? false :true);
      setIsLoadingMessages(false);
      setCurrentPage(1);
      setHasMore(true);
    };
  }, []);

  // Function to fetch conversations
  const fetchConversations = async () => {
    try {
      setIsLoadingConversations(true);
      
      if (is_prototype) {
        // In prototype mode, use mock data
        console.log('MBABOSS Setting mock conversations in prototype mode');
        setConversations(mockConversations);
        if (mockConversations.length > 0 && screenWidth > 1000) {
          setSelectedConversation(mockConversations[0].id);
        }
        setIsLoadingConversations(false);
        return;
      }

      console.log('MBABOSS Fetching conversations...');
      const token = await getStorage('userToken');
      console.log('MBABOSS User token exists:', !!token);
      
      // Log the full request details
      const requestUrl = `${API_BASE_URL}/api/conversations/v1/`;
      console.log('MBABOSS Making request to:', requestUrl);
      
      const response = await axios.get(requestUrl, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('MBABOSS Conversations response status:', response.status);
      console.log('MBABOSS Conversations data:', response.data);
      
      if (response.data && Array.isArray(response.data)) {
        setConversations(response.data);
        
        // Auto-select first conversation on web
        if (response.data.length > 0 && screenWidth > 1000) {
          console.log('MBABOSS Auto-selecting first conversation:', response.data[0].conversation_id);
          setSelectedConversation(response.data[0].conversation_id);
        }
      } else {
        console.error('Invalid response format:', response.data);
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
      if (error.response) {
        console.error('Error response:', error.response.data);
        console.error('Error status:', error.response.status);
      } else if (error.request) {
        console.error('No response received:', error.request);
      } else {
        console.error('Error setting up request:', error.message);
      }
    } finally {
      setIsLoadingConversations(false);
    }
  };

  // Function to fetch messages for a conversation
  const fetchMessages = async (conversationId, page = 1) => {
    console.log('MBABOSS [1] Starting fetchMessages with conversationId:', conversationId, 'type:', typeof conversationId);
    try {
      console.log('MBABOSS [2] Entered try block');
      
      if (page === 1) {
        console.log('MBABOSS [3] Setting loading messages for page 1');
        setIsLoadingMessages(true);
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
      
      if (page === 1) {
        console.log('MBABOSS [8] Setting messages for page 1');
        setMessages(response.data.messages);
      } else {
        console.log('MBABOSS [8] Appending messages for page:', page);
        setMessages(prev => [...prev, ...response.data.messages]);
      }
      
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
    if (is_prototype) {
      // Keep existing prototype message send logic
      try {
        const messageData = {
          content: messageContent,
          sender: 'Me',
          timestamp: new Date().toISOString(),
        };

        const response = await new Promise((resolve) => {
          setTimeout(() => {
            resolve({ status: 200, data: messageData });
          }, 1000);
        });

        console.log('MBABOSS Message sent:', response.data);
        setMessages(prevMessages => [response.data, ...prevMessages]);
        return response.data;
      } catch (error) {
        console.error('Error sending message:', error);
        throw error;
      }
    } else {
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
    }
  };

  // Effect to load initial data
  useEffect(() => {
    console.log('MBABOSS MessageHistory mounted, is_prototype:', is_prototype);
    if (is_prototype) {
      console.log('MBABOSS Setting mock conversations');
      setIsLoadingConversations(false);
      setConversations(mockConversations);
      if (mockConversations.length > 0 && screenWidth > 1000) {
        setSelectedConversation(mockConversations[0].id);
      }
    } else {
      console.log('MBABOSS Fetching real conversations');
      fetchConversations();
    }
  }, [is_prototype, screenWidth]);

  // Effect to load messages when conversation is selected
  useEffect(() => {
    if (!selectedConversation) return;
    console.log('MBABOSS Fetching messages for conversation:', selectedConversation);
    fetchMessages(selectedConversation);
    const conversation = conversations.find(conv => conv.conversation_id === selectedConversation);
    setSelectedConversationData(conversation);
  }, [selectedConversation]);

  // Add loadMoreMessages function for infinite scroll
  const loadMoreMessages = () => {
    if (hasMore && !isLoadingMore && !is_prototype) {
      fetchMessages(selectedConversation, currentPage + 1);
    }
  };

  const isCurrentUserMessage = useCallback((message) => {
    return message.sender === 'Me';
  }, []);

  const renderBookingRequestMessage = useCallback(({ item }) => {
    const isFromMe = item.sender === CURRENT_USER_ID;
    
    return (
      <BookingRequestMessage 
        data={item.data}
        isFromMe={isFromMe}
        timestamp={item.timestamp}
        onAccept={() => {
          navigateToFrom(navigation, 'BookingDetails', 'MessageHistory', {
            bookingId: null,
            initialData: {
              serviceType: item.data.serviceType,
              pets: item.data.pets,
              occurrences: item.data.occurrences,
              status: BOOKING_STATES.PENDING_INITIAL_PROFESSIONAL_CHANGES,
              clientName: selectedConversationData.name || selectedConversationData.other_user_name,
              professionalName: 'Me'
            }
          });
        }}
      />
    );
  }, [navigation, selectedConversationData, CURRENT_USER_ID]);

  const renderMessage = useCallback(({ item }) => {
    // Handle booking request messages
    if (item.type_of_message === 'initial_booking_request') {
      const isFromMe = !item.sent_by_other_user;
      return (
        <View style={[
          styles.bookingRequestCard,
          isFromMe ? styles.sentBookingRequest : styles.receivedBookingRequest
        ]}>
          <View style={styles.bookingRequestHeader}>
            <MaterialCommunityIcons name="calendar-clock" size={24} color={theme.colors.primary} />
            <Text style={styles.bookingRequestTitle}>Booking Request</Text>
          </View>
          
          <View style={styles.bookingRequestDetails}>
            <Text style={styles.detailLabel}>Service:</Text>
            <Text style={styles.detailText}>{item.metadata.service_type}</Text>
            
            <Text style={styles.detailLabel}>Pets:</Text>
            <Text style={styles.detailText}>
              {item.metadata.pets.join(', ')}
            </Text>
            
            <Text style={styles.detailLabel}>Dates:</Text>
            {item.metadata.occurrences.map((occ, index) => (
              <Text key={index} style={styles.detailText}>
                {format(new Date(occ.start_date), 'MMM d, yyyy')} {occ.start_time} - {occ.end_time}
              </Text>
            ))}
          </View>

          {item.metadata.booking_id && (
            <TouchableOpacity 
              style={styles.viewBookingButton}
              onPress={() => navigateToFrom(navigation, 'BookingDetails', 'MessageHistory', {
                bookingId: item.metadata.booking_id,
                initialData: null
              })}
            >
              <Text style={styles.viewBookingText}>View Booking Details</Text>
            </TouchableOpacity>
          )}
        </View>
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
  }, [navigation]);

  const WebInput = () => {
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
      <View style={styles.inputInnerContainer}>
        <input
          ref={inputRef}
          type="text"
          style={styles.webInput}
          placeholder="Type a message..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          disabled={isSending}
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
  
  const handleCreateBooking = async () => {
    const currentConversation = conversations.find(c => c.conversation_id === selectedConversation);
    if (is_DEBUG) {
      console.log('MBABOSS Current conversation:', currentConversation);
      console.log('MBABOSS CURRENT_USER_ID:', CURRENT_USER_ID);
      console.log('MBABOSS Selected conversation ID:', selectedConversation);
    }
    
    if (!currentConversation) {
      console.log('MBABOSS No conversation found');
      return;
    }

    // Log participant and role information
    if (is_DEBUG) {
      console.log('MBABOSS Participant1 ID:', currentConversation.participant1_id);
      console.log('MBABOSS Participant2 ID:', currentConversation.participant2_id);
      console.log('MBABOSS Role map:', currentConversation.role_map);
    }

    // Check if current user is the professional by checking their role in the conversation
    const isProfessional = currentConversation.is_professional === true;
    
    if (is_DEBUG) {
      console.log('MBABOSS Is Professional?', isProfessional);
    }

    if (isProfessional) {
      if (is_DEBUG) {
        console.log('MBABOSS User is professional - creating booking and navigating to details');
      }
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
          console.log('MBABOSS Created booking with ID:', response.data.booking_id);
        }

        if (response.data.booking_id) {
          if (is_DEBUG) {
            console.log('MBABOSS Navigating to BookingDetails with:', {
              bookingId: response.data.booking_id,
              initialData: null
            });
          }
          
          navigateToFrom(navigation, 'BookingDetails', 'MessageHistory', {
            bookingId: response.data.booking_id,
            initialData: null
          });
        }
      } catch (error) {
        console.error('Error creating booking:', error);
        Alert.alert('Error', 'Unable to create booking. Please try again.');
      }
    } else {
      console.log('MBABOSS User is client - showing request modal');
      setShowRequestModal(true);
    }
    
    setShowDropdown(false);
  };

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


  // Add new header component
  const renderHeader = () => {
    if (screenWidth <= 1000 && selectedConversation) {
      return null;
    }
    return (
      <View style={styles.headerContainer}>
        <Text style={styles.headerTitle}>Conversations</Text>
        <Button 
          mode="text" 
          onPress={() => {/* Handle filter */}}
          style={styles.filterButton}
        >
          Filter
        </Button>
      </View>
    );
  };

  // Update the conversation list component
  const renderConversationList = () => (
    <View style={styles.conversationListContainer}>
      {conversations.map((conv) => {
        const otherParticipantName = conv.participant1_id === CURRENT_USER_ID ? 
          conv.participant2_name : conv.participant1_name;
        
        if (is_DEBUG) {
          console.log('MBABOSSY Rendering conversation:', {
            id: conv.conversation_id,
            type: typeof conv.conversation_id
          });
        }
        
        return (
          <TouchableOpacity
            key={conv.conversation_id}
            style={[
              styles.conversationItem,
              selectedConversation === conv.conversation_id && styles.selectedConversation
            ]}
            onPress={() => {
              if (is_DEBUG) {
                console.log('MBABOSSY Setting selected conversation:', {
                  id: conv.conversation_id,
                  type: typeof conv.conversation_id
                });
              }
              setSelectedConversation(conv.conversation_id);
            }}
          >
            <View style={styles.conversationContent}>
              <View style={styles.conversationHeader}>
                <Text style={styles.conversationName}>
                  {otherParticipantName || conv.name || conv.other_user_name || 'Unknown'}
                </Text>
                <Text style={styles.conversationTime}>
                  {new Date(conv.last_message_time).toLocaleTimeString()}
                </Text>
              </View>
              <Text 
                style={[
                  styles.conversationLastMessage,
                  selectedConversation === conv.conversation_id && styles.activeConversationText,
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

  // Update the message section to handle empty states and fix positioning
  const renderMessageSection = () => {
    if (!selectedConversation) {
      return null;
    }

    return (
      <View style={styles.messageSection}>
        {screenWidth > 1000 && selectedConversationData && (
          <View style={styles.messageHeader}>
            <Text style={styles.messageHeaderName}>
              {selectedConversationData.name || selectedConversationData.other_user_name}
            </Text>
          </View>
        )}
        <View style={styles.messagesContainer}>
          {messages.length === 0 ? (
            <Text style={{ padding: 16, color: theme.colors.placeholder }}>
              No messages yet. Start the conversation!
            </Text>
          ) : (
            <FlatList
              data={messages}
              renderItem={renderMessage}
              keyExtractor={item => (item.message_id || Date.now().toString())}
              style={styles.messageList}
              onEndReached={loadMoreMessages}
              onEndReachedThreshold={0.5}
              inverted={true}
              contentContainerStyle={{
                flexGrow: 1,
                justifyContent: 'flex-end',
                paddingBottom: 16
              }}
              maintainVisibleContentPosition={{
                minIndexForVisible: 0,
                autoscrollToTopThreshold: 10
              }}
            />
          )}
        </View>
        <View style={styles.inputWrapper}>
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
          <View style={styles.inputContainer}>
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

  // Move BookingRequestMessage inside the component
  const BookingRequestMessage = ({ data, onAccept, isFromMe, timestamp }) => {
    const navigation = useNavigation();
    
    const handleViewBooking = () => {
      navigateToFrom(navigation, 'BookingDetails', 'MessageHistory', {
        bookingId: data.bookingId,
        readOnly: !isFromMe
      });
    };

    // Handle both old and new message formats
    const renderDates = () => {
      if (data.dates) {
        // New format
        return data.dates.map((date, index) => (
          <Text key={index} style={styles.detailText}>
            {format(new Date(date.startDate), 'MMM d, yyyy')} {date.startTime} - {date.endTime}
          </Text>
        ));
      } else if (data.occurrences) {
        // Old format
        return data.occurrences.map((occ, index) => (
          <Text key={index} style={styles.detailText}>
            {format(new Date(occ.startDate), 'MMM d, yyyy')} {occ.startTime} - {occ.endTime}
          </Text>
        ));
      }
      return null;
    };

    return (
      <View style={[
        styles.bookingRequestCard,
        isFromMe ? styles.sentBookingRequest : styles.receivedBookingRequest
      ]}>
        <View style={styles.bookingRequestHeader}>
          <MaterialCommunityIcons name="calendar-clock" size={24} color={theme.colors.primary} />
          <Text style={styles.bookingRequestTitle}>
            {data.messageType === 'professional_changes' ? 'Booking Update' : 
             data.messageType === 'client_approval' ? 'Booking Approval' : 
             'Booking Request'}
          </Text>
        </View>
        
        {data.status && (
          <View style={styles.statusContainer}>
            <Text style={styles.statusText}>
              Status: {data.status}
            </Text>
          </View>
        )}
        
        <View style={styles.bookingRequestDetails}>
          <Text style={styles.detailLabel}>Service:</Text>
          <Text style={styles.detailText}>{data.serviceType}</Text>
          
          {data.pets && (
            <>
              <Text style={styles.detailLabel}>Pets:</Text>
              <Text style={styles.detailText}>
                {data.pets.map(pet => pet.name).join(', ')}
              </Text>
            </>
          )}
          
          <Text style={styles.detailLabel}>Dates:</Text>
          {renderDates()}
          
          {data.totalCost !== undefined && (
            <>
              <Text style={styles.detailLabel}>Total Cost:</Text>
              <Text style={styles.detailText}>
                ${data.totalCost.toFixed(2)}
              </Text>
            </>
          )}
        </View>

        <TouchableOpacity 
          style={styles.viewBookingButton}
          onPress={handleViewBooking}
        >
          <Text style={styles.viewBookingText}>View Booking Details</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // Add new component for empty state
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
        {is_prototype ? 
          'Create services to start getting bookings and messages from clients' :
          'Search professionals to find services and start messaging'}
      </Text>
      <Button
        mode="contained"
        onPress={() => navigateToFrom(navigation, is_prototype ? 'Services' : 'SearchProfessionalListing', 'MessageHistory')}
        style={{ borderRadius: 8 }}
      >
        {is_prototype ? 'Create Services' : 'Find Professionals'}
      </Button>
    </View>
  );

  return (
    <SafeAreaView style={[
      styles.container,
      screenWidth <= 1000 && selectedConversation && styles.mobileContainer
    ]}>
      {isLoadingConversations ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={{ marginTop: 16, color: theme.colors.placeholder }}>Loading conversations...</Text>
        </View>
      ) : conversations.length > 0 ? (
        <>
          {renderHeader()}
          <View style={[
            styles.contentContainer,
            screenWidth <= 1000 && selectedConversation && styles.mobileContent
          ]}>
            {screenWidth <= 1000 ? (
              selectedConversation ? (
                <View style={styles.mobileMessageView}>
                  {renderMobileHeader()}
                  <View style={styles.mobileContent}>
                    {isLoadingMessages ? (
                      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                        <ActivityIndicator size="large" color={theme.colors.primary} />
                        <Text style={{ marginTop: 16, color: theme.colors.placeholder }}>Loading messages...</Text>
                      </View>
                    ) : (
                      renderMessageSection()
                    )}
                  </View>
                </View>
              ) : (
                renderConversationList()
              )
            ) : (
              <>
                {renderConversationList()}
                {isLoadingMessages ? (
                  <View style={[styles.messageSection, { justifyContent: 'center', alignItems: 'center' }]}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                    <Text style={{ marginTop: 16, color: theme.colors.placeholder }}>Loading messages...</Text>
                  </View>
                ) : (
                  renderMessageSection()
                )}
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
    </SafeAreaView>
  );
};

export default MessageHistory;

