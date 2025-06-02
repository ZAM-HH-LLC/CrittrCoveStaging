import { useState, useCallback, useRef } from 'react';
import { debugLog } from '../../context/AuthContext';
import { getConversationMessages } from '../../api/API';

export const useMessageLogic = () => {
  const [messages, setMessages] = useState([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  
  const isLoadingMoreRef = useRef(false);
  const processedPagesRef = useRef(new Set());
  const messageIdsRef = useRef(new Set());

  const fetchMessages = useCallback(async (conversationId, page = 1) => {
    try {
      debugLog(`MBA2349f87g9qbh2nfv9cg: fetchMessages called`, {
        conversationId,
        page,
        currentPage,
        messagesLength: messages.length
      });
      
      const pageKey = `${conversationId}-${page}`;
      if (processedPagesRef.current.has(pageKey) && page > 1) {
        debugLog(`MBA2349f87g9qbh2nfv9cg: Skipping duplicate fetch for page ${page}`);
        return;
      }
      
      if (page === 1) {
        setIsLoadingMessages(true);
        setMessages([]);
        processedPagesRef.current.clear();
        messageIdsRef.current.clear();
      } else {
        if (isLoadingMoreRef.current) {
          debugLog(`MBA2349f87g9qbh2nfv9cg: Already loading more messages`);
          return;
        }
        isLoadingMoreRef.current = true;
        setIsLoadingMore(true);
      }
      
      processedPagesRef.current.add(pageKey);
      
      const response = await getConversationMessages(conversationId, page);
      const newMessages = response.messages || [];
      
      const uniqueMessages = newMessages.filter(msg => {
        if (msg.message_id && messageIdsRef.current.has(msg.message_id)) {
          return false;
        }
        
        if (msg.message_id) {
          messageIdsRef.current.add(msg.message_id);
        }
        
        return true;
      });
      
      debugLog(`MBA2349f87g9qbh2nfv9cg: Processed ${newMessages.length} messages, ${uniqueMessages.length} unique`);
      
      if (page === 1) {
        setMessages(uniqueMessages);
        setIsLoadingMessages(false);
      } else {
        setMessages(prev => [...prev, ...uniqueMessages]);
        setIsLoadingMore(false);
        isLoadingMoreRef.current = false;
      }
      
      setHasMore(response.has_more || false);
      setCurrentPage(page);
      
      return {
        messages: uniqueMessages,
        has_draft: response.has_draft,
        draft_data: response.draft_data
      };
      
    } catch (error) {
      debugLog(`MBA2349f87g9qbh2nfv9cg: Error in fetchMessages:`, error);
      setIsLoadingMessages(false);
      if (page > 1) {
        setIsLoadingMore(false);
        isLoadingMoreRef.current = false;
      }
      throw error;
    }
  }, [currentPage, messages.length]);

  const loadMoreMessages = useCallback((conversationId) => {
    debugLog('MBA2349f87g9qbh2nfv9cg: loadMoreMessages called', {
      hasMore,
      isLoadingMore,
      currentPage,
      conversationId
    });
    
    if (hasMore && !isLoadingMore && conversationId) {
      fetchMessages(conversationId, currentPage + 1);
    }
  }, [hasMore, isLoadingMore, currentPage, fetchMessages]);

  const addMessage = useCallback((newMessage) => {
    setMessages(prev => [newMessage, ...prev]);
  }, []);

  const resetMessages = useCallback(() => {
    setMessages([]);
    processedPagesRef.current.clear();
    messageIdsRef.current.clear();
    setCurrentPage(1);
    setHasMore(true);
    setIsLoadingMessages(false);
    setIsLoadingMore(false);
    isLoadingMoreRef.current = false;
  }, []);

  return {
    messages,
    isLoadingMessages,
    isLoadingMore,
    hasMore,
    currentPage,
    fetchMessages,
    loadMoreMessages,
    addMessage,
    resetMessages
  };
}; 