// Message fetching utilities - calls API.js functions and adds shared logic
import { getConversations, getConversationMessages } from '../../api/API';
import { debugLog } from '../../context/AuthContext';
import { MEDIA_URL } from '../../config/config';
import { formatMessageTime, shouldShowTimestamp } from '../../components/Messages/messageTimeUtils';
import type { 
  Conversation, 
  Message, 
  PaginationParams, 
  FetchMessagesResponse, 
  FetchConversationsResponse 
} from './types';

/**
 * Fetches conversations with shared logic (sorting, filtering, etc.)
 */
export const fetchConversationsWithLogic = async (userRole?: string): Promise<FetchConversationsResponse> => {
  try {
    debugLog('MessageFetchUtils: Fetching conversations');
    
    const data = await getConversations();
    
    if (!Array.isArray(data)) {
      throw new Error('Invalid conversations data format');
    }
    
    // Filter conversations based on user role
    let filteredConversations = data;
    
    if (userRole) {
      filteredConversations = data.filter((conversation: any) => {
        // Show conversations where:
        // - If user is professional: show conversations with clients (is_professional: false)
        // - If user is petOwner: show conversations with professionals (is_professional: true)
        if (userRole === 'professional') {
          return conversation.is_professional === true;
        } else if (userRole === 'petOwner') {
          return conversation.is_professional === false;
        }
        return true; // Show all if role is unclear
      });
    }
    
    // Apply shared logic - sort by last message timestamp
    const sortedConversations: Conversation[] = filteredConversations.sort((a, b) => {
      const timestampA = new Date(a.last_message_timestamp || 0).getTime();
      const timestampB = new Date(b.last_message_timestamp || 0).getTime();
      return timestampB - timestampA; // Most recent first
    });
    
    debugLog('MessageFetchUtils: Conversations fetched and sorted', {
      count: sortedConversations.length,
      userRole,
      totalBeforeFilter: data.length,
      totalAfterFilter: filteredConversations.length
    });
    
    return {
      conversations: sortedConversations,
      hasMore: false // API doesn't support pagination yet
    };
  } catch (error) {
    debugLog('MessageFetchUtils: Error fetching conversations:', error);
    throw error;
  }
};

/**
 * Fetches messages with shared logic (transformation, filtering, pagination)
 */
export const fetchMessagesWithLogic = async (
  conversationId: number,
  params: PaginationParams = {}
): Promise<FetchMessagesResponse> => {
  try {
    debugLog('MessageFetchUtils: Fetching messages', {
      conversationId,
      params
    });
    
    const { page = 1, limit = 50 } = params;
    
    // Call API.js function
    const response = await getConversationMessages(conversationId, page);
    
    // Handle the response structure - API returns an object with messages array
    let messagesArray: any[];
    if (response && response.messages && Array.isArray(response.messages)) {
      messagesArray = response.messages;
    } else if (Array.isArray(response)) {
      messagesArray = response;
    } else {
      debugLog('MessageFetchUtils: Unexpected response format:', response);
      throw new Error('Invalid messages data format');
    }
    
    // Apply shared logic - ensure messages are properly typed and sorted
    const rawMessages = messagesArray.map((msg: any) => {
      // Handle image URLs with proper media URL
      let imageUrl = msg.image_url;
      let imageUrls = msg.image_urls;
      
      // Process image URLs from metadata if available
      if (msg.metadata?.image_urls && Array.isArray(msg.metadata.image_urls)) {
        imageUrls = msg.metadata.image_urls.map((url: string) => 
          url.startsWith('/') ? `${MEDIA_URL}${url}` : url
        );
      }
      
      // Process single image URL
      if (imageUrl && imageUrl.startsWith('/')) {
        imageUrl = `${MEDIA_URL}${imageUrl}`;
      }
      
      // Process image_urls array
      if (imageUrls && Array.isArray(imageUrls)) {
        imageUrls = imageUrls.map((url: string) => 
          url.startsWith('/') ? `${MEDIA_URL}${url}` : url
        );
      }
      
      return {
        id: msg.message_id || msg.id,
        conversation_id: conversationId,
        sender_id: msg.sent_by_other_user ? null : msg.sender_id, // Need to determine actual sender
        message: msg.content || msg.message || '',
        message_type: msg.type_of_message === 'image_message' ? 'image' : 
                     msg.type_of_message === 'booking_confirmed' ? 'booking_response' :
                     msg.type_of_message === 'send_approved_message' ? 'booking_request' :
                     msg.type_of_message === 'request_changes' ? 'booking_request' :
                     'text',
        timestamp: msg.timestamp,
        is_read: msg.status === 'read',
        image_url: imageUrl,
        image_urls: imageUrls,
        booking_data: msg.booking_id ? { booking_id: msg.booking_id } : undefined,
        is_clickable: msg.is_clickable,
        sent_by_other_user: msg.sent_by_other_user
      };
    }); // Removed sort - keep backend ordering (newest first)
    
    // Use existing timestamp functions from MessageHistory
    const processedMessages: Message[] = rawMessages.map((msg: any, index: number) => {
      const prevMessage = index > 0 ? rawMessages[index - 1] : null;
      
      return {
        ...msg,
        showTimestamp: shouldShowTimestamp(msg, prevMessage, index === 0),
        showDateSeparator: false, // Disable for now to avoid Text errors
        formattedTime: formatMessageTime(msg.timestamp, 'US/Mountain'),
        formattedDate: null
      };
    });
    
    debugLog('MessageFetchUtils: Messages fetched and processed', {
      conversationId,
      count: processedMessages.length,
      page
    });
    
    // Check if there are more messages based on API response
    const hasMore = response && response.has_more !== undefined ? response.has_more : messagesArray.length === limit;
    
    return {
      messages: processedMessages,
      hasMore,
      nextPage: hasMore ? page + 1 : undefined
    };
  } catch (error) {
    debugLog('MessageFetchUtils: Error fetching messages:', error);
    throw error;
  }
};

/**
 * Filters conversations based on search query
 */
export const filterConversations = (
  conversations: Conversation[],
  searchQuery: string
): Conversation[] => {
  if (!searchQuery.trim()) {
    return conversations;
  }
  
  const query = searchQuery.toLowerCase().trim();
  
  return conversations.filter(conv => 
    conv.other_user_name?.toLowerCase().includes(query) ||
    conv.last_message?.toLowerCase().includes(query)
  );
};

/**
 * Gets unread count for current user role
 */
export const getUnreadCountForRole = (
  conversation: Conversation,
  userRole: 'professional' | 'petOwner' | 'owner'
): number => {
  if (userRole === 'professional') {
    return conversation.professional_unread_count || 0;
  } else {
    return conversation.owner_unread_count || 0;
  }
};

/**
 * Checks if conversation has unread messages for current user role
 */
export const hasUnreadForRole = (
  conversation: Conversation,
  userRole: 'professional' | 'petOwner' | 'owner'
): boolean => {
  return getUnreadCountForRole(conversation, userRole) > 0;
};