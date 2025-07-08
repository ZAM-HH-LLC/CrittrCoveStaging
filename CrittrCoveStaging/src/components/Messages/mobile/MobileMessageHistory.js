// Mobile Message History Controller - Signal-like messaging interface
import React, { useState, useEffect, useContext, useRef, useCallback } from 'react';
import { View, StyleSheet, Platform, StatusBar, BackHandler } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { AuthContext, debugLog } from '../../../context/AuthContext';
import MessageNotificationContext from '../../../context/MessageNotificationContext';
import { fetchConversationsWithLogic } from '../../../utils/messages';
import MobileConversationList from './MobileConversationList';
import MobileMessageList from './MobileMessageList';
import { theme } from '../../../styles/theme';

const MobileMessageHistory = ({ navigation, route }) => {
  const { isSignedIn, userRole, user } = useContext(AuthContext);
  const { updateRoute } = useContext(MessageNotificationContext);

  // State management
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Refs
  const isMountedRef = useRef(true);

  // Update notification context
  useEffect(() => {
    updateRoute('MessageHistory');
    return () => updateRoute('Dashboard');
  }, [updateRoute]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Handle hardware back button on Android
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (selectedConversation) {
          setSelectedConversation(null);
          // Clear navigation route parameters to show navigation again
          navigation.setParams({
            selectedConversation: null
          });
          return true; // Prevent default behavior
        }
        return false; // Let default behavior happen
      };

      if (Platform.OS === 'android') {
        const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
        return () => subscription.remove();
      }
    }, [selectedConversation])
  );

  // Load conversations on mount and role change
  useFocusEffect(
    useCallback(() => {
      if (isSignedIn) {
        loadConversations();
        
        // Check for route params to select specific conversation
        const conversationId = route?.params?.conversationId || route?.params?.selectedConversation;
        if (conversationId && conversations.length > 0) {
          selectConversationById(parseInt(conversationId));
        }
      }
    }, [isSignedIn, userRole, route?.params])
  );

  const loadConversations = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      debugLog('MobileMessageHistory: Loading conversations');
      
      const { conversations: data } = await fetchConversationsWithLogic(userRole);
      
      if (isMountedRef.current) {
        setConversations(data);
        debugLog('MobileMessageHistory: Conversations loaded', { count: data.length });
      }
    } catch (error) {
      debugLog('MobileMessageHistory: Error loading conversations:', error);
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  };

  const selectConversationById = (conversationId) => {
    const conversation = conversations.find(c => c.conversation_id === conversationId);
    if (conversation) {
      setSelectedConversation(conversation);
    }
  };

  const handleConversationSelect = (conversation) => {
    debugLog('MobileMessageHistory: Conversation selected', {
      conversationId: conversation.conversation_id,
      otherUser: conversation.other_user_name,
      settingParam: conversation.conversation_id
    });
    setSelectedConversation(conversation);
    
    // Update navigation route parameters to trigger navigation hiding
    try {
      navigation.setParams({
        selectedConversation: conversation.conversation_id
      });
    } catch (error) {
      debugLog('MobileMessageHistory: Error setting navigation params:', error);
    }
    
    debugLog('MobileMessageHistory: Route params set', {
      params: route?.params,
      selectedConversation: conversation.conversation_id
    });
  };

  const handleBackToList = () => {
    debugLog('MobileMessageHistory: Back to conversation list');
    setSelectedConversation(null);
    
    // Clear navigation route parameters to show navigation again
    navigation.setParams({
      selectedConversation: null
    });
  };

  const handleConversationUpdate = () => {
    // Reload conversations when a conversation is updated
    loadConversations();
  };

  // Set status bar style based on current view
  useEffect(() => {
    if (Platform.OS === 'ios') {
      StatusBar.setBarStyle(selectedConversation ? 'light-content' : 'dark-content', true);
    }
  }, [selectedConversation]);

  if (!isSignedIn) {
    return null; // Let the app handle sign-in flow
  }

  return (
    <View style={styles.container}>
      {selectedConversation ? (
        <MobileMessageList
          conversation={selectedConversation}
          userRole={userRole}
          user={user}
          onBack={handleBackToList}
          onConversationUpdate={handleConversationUpdate}
          navigation={navigation}
        />
      ) : (
        <MobileConversationList
          conversations={conversations}
          userRole={userRole}
          loading={loading}
          refreshing={refreshing}
          onRefresh={() => loadConversations(true)}
          onConversationSelect={handleConversationSelect}
          navigation={navigation}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.surfaceContrast,
  },
});

export default MobileMessageHistory;