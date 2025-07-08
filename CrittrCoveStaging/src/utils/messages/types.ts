// Type definitions for messaging system

export interface Conversation {
  conversation_id: number;
  other_user_id: number;
  other_user_name: string;
  other_user_avatar?: string;
  last_message: string;
  last_message_timestamp: string;
  owner_unread_count: number;
  professional_unread_count: number;
  has_active_booking: boolean;
  has_draft: boolean;
  is_professional: boolean;
}

export interface Message {
  id: number;
  conversation_id: number;
  sender_id: number;
  message: string;
  message_type?: 'text' | 'image' | 'booking_request' | 'booking_response';
  timestamp: string;
  is_read: boolean;
  image_url?: string;
  booking_data?: BookingData;
}

export interface BookingData {
  id?: number;
  service_name?: string;
  date?: string;
  time?: string;
  status?: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  pets?: any[];
}

export interface MessageSendPayload {
  conversationId: number;
  message?: string;
  images?: File[] | string[];
  caption?: string;
}

export interface WebSocketMessage {
  type: string;
  data: any;
  conversation_id?: number;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  offset?: number;
}

export interface FetchMessagesResponse {
  messages: Message[];
  hasMore: boolean;
  nextPage?: number;
}

export interface FetchConversationsResponse {
  conversations: Conversation[];
  hasMore: boolean;
}