import React, { useState, useCallback, useRef, useEffect, useContext } from 'react';
import { View, StyleSheet, FlatList, KeyboardAvoidingView, Platform, SafeAreaView, StatusBar, TextInput, Text, TouchableOpacity, Dimensions, Alert } from 'react-native';
import { Button, Card, Paragraph, useTheme, ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons'; // Import the icon library
import { theme } from '../styles/theme';
import { AuthContext } from '../context/AuthContext';
import RequestBookingModal from '../components/RequestBookingModal';
import { createBooking, BOOKING_STATES, mockConversations, mockMessages, CURRENT_USER_ID } from '../data/mockData';
import { format } from 'date-fns';
import { useNavigation } from '@react-navigation/native';

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
    paddingTop: screenWidth > 1000 ? 72 : 20,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  messageList: {
    // padding: 16,
    width: '100%',
    paddingBottom: 80,
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
    maxWidth: '80%',
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
    marginBottom: 16,
  },
  receivedMessageContainer: {
    alignItems: 'flex-start',
    marginBottom: 16,
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
  console.log("TESTING MVP PUSH TO MVP AND gh-pages-test being deployed")
  const { colors } = useTheme();
  const [screenWidth, setScreenWidth] = useState(Dimensions.get('window').width);
  const styles = createStyles(screenWidth); // Initialize styles here
  
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [selectedConversationData, setSelectedConversationData] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isSending, setIsSending] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const IS_CLIENT = false; // This should come from your auth context
  const { is_DEBUG } = useContext(AuthContext);
  // Use mockConversations instead of local state
  const [conversations, setConversations] = useState(mockConversations);

  // Add useEffect to set initial selected conversation
  useEffect(() => {
    if (conversations.length > 0 && !selectedConversation) {
      setSelectedConversation(conversations[0].id);
    }
  }, [conversations]);

  useEffect(() => {
    if (selectedConversation) {
      const conversation = conversations.find(conv => conv.id === selectedConversation);
      if (conversation) {
        // Get messages for this conversation from mockData
        const conversationMessages = mockMessages[selectedConversation] || [];
        if (is_DEBUG) {
          console.log('Selected conversation:', selectedConversation);
          console.log('Available messages:', mockMessages);
          console.log('Loading messages:', conversationMessages);
        }
        
        setMessages(conversationMessages);
        setSelectedConversationData(conversation);
      }
    }
  }, [selectedConversation, conversations]);

  useEffect(() => {
    // Check if we have a selectedConversation from navigation params
    if (route.params?.selectedConversation) {
      setSelectedConversation(route.params.selectedConversation);
      
      // If this is a new conversation with a professional, update the conversation data
      if (route.params.professionalId && route.params.professionalName) {
        const conversation = mockConversations.find(
          conv => conv.id === route.params.selectedConversation
        );
        if (conversation) {
          conversation.professionalId = route.params.professionalId;
          conversation.name = route.params.professionalName;
          conversation.isProfessional = true;
        }
      }
    }
  }, [route.params]);

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
          navigation.navigate('BookingDetails', {
            bookingId: null,
            initialData: {
              serviceType: item.data.serviceType,
              pets: item.data.pets,
              occurrences: item.data.occurrences,
              status: BOOKING_STATES.PENDING_INITIAL_PROFESSIONAL_CHANGES,
              clientName: selectedConversationData.name,
              professionalName: 'Me'
            }
          });
        }}
      />
    );
  }, [navigation, selectedConversationData, CURRENT_USER_ID]);

  const renderMessage = useCallback(({ item }) => {
    if (item.type === 'booking_request') {
      return renderBookingRequestMessage({ item });
    }

    // Existing message rendering code
    const isFromMe = item.sender === CURRENT_USER_ID;
    return (
      <View style={isFromMe ? styles.sentMessageContainer : styles.receivedMessageContainer}>
        <Text style={[
          styles.senderAbove,
          isFromMe ? styles.sentSenderName : styles.receivedSenderName
        ]}>
          {isFromMe ? 'Me' : selectedConversationData?.name}
        </Text>
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
        <Text style={[
          styles.timestampBelow,
          isFromMe ? styles.sentTimestamp : styles.receivedTimestamp
        ]}>
          {new Date(item.timestamp).toLocaleTimeString()}
        </Text>
      </View>
    );
  }, [selectedConversationData, renderBookingRequestMessage]);

  const simulateMessageSend = async (messageContent) => {
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

      console.log('Message sent:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  };

  const WebInput = () => {
    const [message, setMessage] = useState('');
    const inputRef = useRef(null);

    const handleSend = async () => {
      if (message.trim() && !isSending) {
        setIsSending(true);
        try {
          await simulateMessageSend(message.trim());
          const newMsg = {
            message_id: Date.now().toString(),
            participant1_id: selectedConversationData?.participant1_id !== CURRENT_USER_ID ? selectedConversationData?.participant1_id : CURRENT_USER_ID,
            participant2_id: selectedConversationData?.participant2_id !== CURRENT_USER_ID ? selectedConversationData?.participant2_id : CURRENT_USER_ID,
            sender: CURRENT_USER_ID,
            role_map: selectedConversationData?.role_map,
            content: message.trim(),
            timestamp: new Date().toISOString(),
            status: "sent",
            is_booking_request: false,
            metadata: {}
          };
          setMessages(prevMessages => [...prevMessages, newMsg]);
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
          await simulateMessageSend(message.trim());
          const newMsg = {
            message_id: Date.now().toString(),
            participant1_id: selectedConversationData?.participant1_id !== CURRENT_USER_ID ? selectedConversationData?.participant1_id : CURRENT_USER_ID,
            participant2_id: selectedConversationData?.participant2_id !== CURRENT_USER_ID ? selectedConversationData?.participant2_id : CURRENT_USER_ID,
            sender: CURRENT_USER_ID,
            role_map: selectedConversationData?.role_map,
            content: message.trim(),
            timestamp: new Date().toISOString(),
            status: "sent",
            is_booking_request: false,
            metadata: {}
          };
          setMessages(prevMessages => [...prevMessages, newMsg]);
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
  
  const handleRequestBooking = async () => {
    const currentConversation = conversations.find(c => c.id === selectedConversation);
    console.log('Current conversation:', currentConversation);
    console.log('CURRENT_USER_ID:', CURRENT_USER_ID);
    console.log('Selected conversation ID:', selectedConversation);
    
    if (!currentConversation) {
      console.log('No conversation found');
      return;
    }

    // Log participant and role information
    console.log('Participant1 ID:', currentConversation.participant1_id);
    console.log('Participant2 ID:', currentConversation.participant2_id);
    console.log('Role map:', currentConversation.role_map);

    // Check if current user is the professional by checking their role in the conversation
    const isProfessional = 
      (currentConversation.participant1_id === CURRENT_USER_ID && 
       currentConversation.role_map.participant1_role === "professional") ||
      (currentConversation.participant2_id === CURRENT_USER_ID && 
       currentConversation.role_map.participant2_role === "professional");
    
    console.log('Is Professional?', isProfessional);

    if (isProfessional) {
      console.log('User is professional - creating booking and navigating to details');
      try {
        // Get the client ID (the other participant)
        const clientId = currentConversation.participant1_id === CURRENT_USER_ID ? 
          currentConversation.participant2_id : currentConversation.participant1_id;
        const professionalId = CURRENT_USER_ID;
        
        console.log('Creating booking with:', {
          clientId,
          professionalId,
          clientName: currentConversation.name
        });

        const bookingId = await createBooking(
          clientId,
          professionalId,
          {
            clientName: currentConversation.name,
            professionalName: 'Me',
            status: BOOKING_STATES.PENDING_INITIAL_PROFESSIONAL_CHANGES,
          }
        );

        console.log('Created booking with ID:', bookingId);

        if (bookingId) {
          console.log('Navigating to BookingDetails with:', {
            bookingId,
            initialData: null
          });
          
          navigation.navigate('BookingDetails', {
            bookingId: bookingId,
            initialData: null
          });
        }
      } catch (error) {
        console.error('Error creating booking:', error);
        Alert.alert('Error', 'Unable to create booking. Please try again.');
      }
    } else {
      console.log('User is client - showing request modal');
      setShowRequestModal(true);
    }
    
    setShowDropdown(false);
  };

  const handleModalSubmit = async (modalData) => {
    try {
      const bookingId = await createBooking(
        'client123',
        'freelancer123',
        {
          ...modalData,
          professionalName: 'Professional Name',
          clientName: 'Me',
          status: 'Pending',
        }
      );

      console.log('Created booking with ID:', bookingId);

      setShowRequestModal(false);
      navigation.navigate('BookingDetails', {
        bookingId: bookingId,
        initialData: null
      });
    } catch (error) {
      console.error('Error creating booking:', error);
      Alert.alert(
        'Error',
        'Unable to create booking. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  // Add new function to handle booking request messages
  const handleBookingRequest = async (bookingRequestMessage) => {
    try {
      // Add the booking request message to the current conversation
      const newMessage = {
        message_id: Date.now().toString(),
        participant1_id: selectedConversationData?.participant1_id,
        participant2_id: selectedConversationData?.participant2_id,
        sender: CURRENT_USER_ID,
        role_map: selectedConversationData?.role_map,
        type: 'booking_request',
        data: bookingRequestMessage.data,
        timestamp: new Date().toISOString(),
        status: "sent",
        is_booking_request: true,
        metadata: {}
      };

      setMessages(prevMessages => [...prevMessages, newMessage]);
      setShowRequestModal(false);
    } catch (error) {
      console.error('Error sending booking request:', error);
      Alert.alert(
        'Error',
        'Unable to send booking request. Please try again.',
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
        
        return (
          <TouchableOpacity
            key={conv.id}
            style={[
              styles.conversationItem,
              selectedConversation === conv.id && styles.selectedConversation
            ]}
            onPress={() => setSelectedConversation(conv.id)}
          >
            <View style={styles.conversationContent}>
              <View style={styles.conversationHeader}>
                <Text style={styles.conversationName}>
                  {otherParticipantName || conv.name || 'Unknown'}
                </Text>
                <Text style={styles.conversationTime}>
                  {new Date(conv.timestamp).toLocaleTimeString()}
                </Text>
              </View>
              <Text 
                style={[
                  styles.conversationLastMessage,
                  selectedConversation === conv.id && styles.activeConversationText,
                  conv.unread && styles.unreadMessage
                ]} 
                numberOfLines={1}
              >
                {conv.lastMessage}
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

  // Update the message section to handle empty states
  const renderMessageSection = () => {
    if (!selectedConversation) {
      return null;
    }

    return (
      <View style={styles.messageSection}>
        {screenWidth > 1000 && selectedConversationData && (
          <View style={styles.messageHeader}>
            <Text style={styles.messageHeaderName}>
              {selectedConversationData.name}
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
                    handleRequestBooking();
                    setShowDropdown(false);
                  }}
                >
                  <MaterialCommunityIcons 
                    name="calendar-plus" 
                    size={20} 
                    color={theme.colors.primary} 
                  />
                  <Text style={styles.dropdownText}>Request Booking</Text>
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

  // Update the useEffect for window resize
  useEffect(() => {
    const handleResize = () => {
      const width = Dimensions.get('window').width;
      setScreenWidth(width);
    };

    if (Platform.OS === 'web') {
      window.addEventListener('resize', handleResize);
      handleResize(); // Call immediately to set initial width
      
      // Also listen for orientation changes
      window.addEventListener('orientationchange', handleResize);
      
      return () => {
        window.removeEventListener('resize', handleResize);
        window.removeEventListener('orientationchange', handleResize);
      };
    }
  }, []);

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
          {selectedConversationData?.name}
        </Text>
      </View>
    </View>
  );

  // Move BookingRequestMessage inside the component
  const BookingRequestMessage = ({ data, onAccept, isFromMe, timestamp }) => {
    const navigation = useNavigation();
    
    const handleViewBooking = () => {
      navigation.navigate('BookingDetails', {
        bookingId: data.bookingId,
        readOnly: !isFromMe // Make fields read-only for client
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
        Create services to start getting bookings and messages from clients
      </Text>
      <Button
        mode="contained"
        onPress={() => navigation.navigate('Services')}
        style={{ borderRadius: 8 }}
      >
        Create Services
      </Button>
    </View>
  );

  return (
    <SafeAreaView style={[
      styles.container,
      screenWidth <= 1000 && selectedConversation && styles.mobileContainer
    ]}>
      {conversations.length > 0 ? (
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
                    {renderMessageSection()}
                  </View>
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
      />
    </SafeAreaView>
  );
};

export default MessageHistory;
