// Message sending utilities - calls API.js functions and adds shared logic
import { sendTextMessage, sendImageMessage, uploadAndSendImageMessage } from '../../api/API';
import { debugLog } from '../../context/AuthContext';
import type { MessageSendPayload, Message } from './types';

/**
 * Sends a message with optimistic UI and error handling
 */
export const sendMessageWithLogic = async (
  conversationId: number,
  message?: string,
  images: File[] | string[] = [],
  caption: string = ''
): Promise<Message> => {
  try {
    debugLog('MessageSendUtils: Sending message', {
      conversationId,
      hasMessage: !!message,
      imageCount: images.length,
      hasCaption: !!caption
    });

    let response;

    if (images.length > 0) {
      // Send image message with optional caption
      if (message || caption) {
        response = await uploadAndSendImageMessage(conversationId, images, caption || message);
      } else {
        response = await sendImageMessage(conversationId, images);
      }
    } else if (message) {
      // Send text message only
      response = await sendTextMessage(conversationId, message);
    } else {
      throw new Error('No message content provided');
    }

    debugLog('MessageSendUtils: Message sent successfully', {
      conversationId,
      messageId: response?.id
    });

    return response;
  } catch (error) {
    debugLog('MessageSendUtils: Error sending message:', error);
    throw error;
  }
};

/**
 * Sends image message with caption
 */
export const sendImageMessageWithLogic = async (
  conversationId: number,
  images: File[] | string[],
  caption: string = ''
): Promise<Message> => {
  try {
    debugLog('MessageSendUtils: Sending image message', {
      conversationId,
      imageCount: images.length,
      hasCaption: !!caption
    });

    const response = await sendImageMessage(conversationId, images, caption);

    debugLog('MessageSendUtils: Image message sent successfully', {
      conversationId,
      messageId: response?.id
    });

    return response;
  } catch (error) {
    debugLog('MessageSendUtils: Error sending image message:', error);
    throw error;
  }
};

/**
 * Creates an optimistic message for immediate UI feedback
 */
export const createOptimisticMessage = (
  conversationId: number,
  senderId: number,
  message: string,
  images: File[] | string[] = []
): Message => {
  const tempId = Date.now(); // Temporary ID for optimistic UI
  
  return {
    id: tempId,
    conversation_id: conversationId,
    sender_id: senderId,
    message: message,
    message_type: images.length > 0 ? 'image' : 'text',
    timestamp: new Date().toISOString(),
    is_read: true, // Assume read since we're the sender
    image_url: images.length > 0 ? (typeof images[0] === 'string' ? images[0] : URL.createObjectURL(images[0] as File)) : undefined
  };
};

/**
 * Handles message send with optimistic UI
 */
export const sendMessageWithOptimisticUI = async (
  conversationId: number,
  senderId: number,
  message?: string,
  images: File[] | string[] = [],
  caption: string = '',
  onOptimisticAdd?: (message: Message) => void,
  onOptimisticRemove?: (tempId: number) => void,
  onSuccess?: (message: Message) => void,
  onError?: (error: Error) => void
): Promise<void> => {
  let optimisticMessage: Message | null = null;

  try {
    // Create and add optimistic message
    if (message || images.length > 0) {
      optimisticMessage = createOptimisticMessage(
        conversationId,
        senderId,
        message || caption,
        images
      );
      onOptimisticAdd?.(optimisticMessage);
    }

    // Send actual message
    const response = await sendMessageWithLogic(conversationId, message, images, caption);

    // Remove optimistic message and add real message
    if (optimisticMessage) {
      onOptimisticRemove?.(optimisticMessage.id);
    }
    onSuccess?.(response);

  } catch (error) {
    // Remove optimistic message on error
    if (optimisticMessage) {
      onOptimisticRemove?.(optimisticMessage.id);
    }
    onError?.(error as Error);
  }
};

/**
 * Validates message content before sending
 */
export const validateMessageContent = (
  message?: string,
  images: File[] | string[] = []
): { isValid: boolean; error?: string } => {
  // Must have either message text or images
  if (!message?.trim() && images.length === 0) {
    return { isValid: false, error: 'Message cannot be empty' };
  }

  // Check message length
  if (message && message.length > 2000) {
    return { isValid: false, error: 'Message is too long (max 2000 characters)' };
  }

  // Check image count
  if (images.length > 5) {
    return { isValid: false, error: 'Too many images (max 5)' };
  }

  return { isValid: true };
};