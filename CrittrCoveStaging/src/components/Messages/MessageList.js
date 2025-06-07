import React, { useRef, useCallback, forwardRef, useState } from 'react';
import { FlatList, ActivityIndicator, Platform } from 'react-native';
import { debugLog } from '../../context/AuthContext';

const MessageList = forwardRef(({ 
  messages, 
  renderMessage, 
  hasMore, 
  isLoadingMore,
  onLoadMore,
  styles,
  theme,
  className
}, ref) => {
  const flatListRef = useRef(null);
  const isUserScrollingRef = useRef(false);
  const isLoadingMoreRef = useRef(false);
  const previousMessageCount = useRef(messages.length);
  const initialRenderRef = useRef(true);
  const preventInitialPaginationRef = useRef(true);
  const scrollPositionRef = useRef(0);
  const lastPaginationTimeRef = useRef(0);
  const PAGINATION_COOLDOWN = 2000; // ms to wait before allowing another pagination trigger
  
  // Track which indices we've already triggered pagination for
  const paginatedIndicesRef = useRef(new Set());
  
  // Reset pagination indices when the message array changes significantly
  React.useEffect(() => {
    if (messages.length > previousMessageCount.current + 10) {
      debugLog('MBA9876: Message array significantly changed, resetting pagination indices', {
        prevCount: previousMessageCount.current,
        newCount: messages.length,
        difference: messages.length - previousMessageCount.current
      });
      paginatedIndicesRef.current = new Set();
    }
    
    previousMessageCount.current = messages.length;
  }, [messages.length]);
  
  // Actually trigger the pagination
  const triggerPagination = useCallback((triggerIndex) => {
    const now = Date.now();
    const timeSinceLastPagination = now - lastPaginationTimeRef.current;
    
    // Skip if we don't meet base conditions
    if (!hasMore || isLoadingMore || isLoadingMoreRef.current || 
        !isUserScrollingRef.current || initialRenderRef.current) {
      return false;
    }
    
    // Skip if on cooldown
    if (timeSinceLastPagination < PAGINATION_COOLDOWN) {
      debugLog('MBA9876: Pagination on cooldown', {
        timeSinceLastPagination,
        cooldown: PAGINATION_COOLDOWN
      });
      return false;
    }
    
    // Skip if we've already paginated at this index
    if (paginatedIndicesRef.current.has(triggerIndex)) {
      debugLog('MBA9876: Already paginated at index', {
        triggerIndex,
        paginatedIndices: Array.from(paginatedIndicesRef.current)
      });
      return false;
    }
    
    debugLog('MBA9876: Triggering pagination', {
      triggerIndex,
      messageCount: messages.length,
      timeSinceLastPagination,
      hasMore,
      isLoadingMore
    });
    
    // Mark this index as paginated
    paginatedIndicesRef.current.add(triggerIndex);
    
    // Set states
    isLoadingMoreRef.current = true;
    lastPaginationTimeRef.current = now;
    
    // Trigger the actual pagination
    onLoadMore();
    
    // Reset loading state after delay
    setTimeout(() => {
      isLoadingMoreRef.current = false;
    }, PAGINATION_COOLDOWN);
    
    return true;
  }, [hasMore, isLoadingMore, onLoadMore, messages.length]);
  
  // Very aggressively check for top messages becoming visible
  const onViewableItemsChangedRef = useRef(({ viewableItems }) => {
    if (!viewableItems || viewableItems.length === 0 || 
        !isUserScrollingRef.current || initialRenderRef.current) {
      return;
    }
    
    // Check the first batch of 20 messages
    const FIRST_BATCH_SIZE = 20;
    if (messages.length <= FIRST_BATCH_SIZE) {
      return; // Not enough messages for pagination yet
    }
    
    // Track the oldest index we can see
    let oldestVisibleIndex = -1;
    viewableItems.forEach(item => {
      if (item.index > oldestVisibleIndex) {
        oldestVisibleIndex = item.index;
      }
    });
    
    debugLog('MBA9876: Viewing oldest index', {
      oldestVisibleIndex,
      messagesLength: messages.length,
      viewableItemsCount: viewableItems.length
    });
    
    // Calculate specific trigger points based on the batches (aggressively)
    // Each batch is 20 messages from the backend
    const triggerPoints = [];
    
    // Start from the first batch boundary (19) and add each subsequent batch boundary
    for (let i = 1; i < 10; i++) {  // Support up to 10 pages
      const batchEndIndex = (i * 20) - 1;  // End of each batch (19, 39, 59, etc)
      
      // Add several trigger points near the batch boundary for redundancy
      triggerPoints.push(batchEndIndex - 4);  // Trigger a bit before the boundary
      triggerPoints.push(batchEndIndex - 2);  // Another trigger point
      triggerPoints.push(batchEndIndex);      // The exact boundary
      triggerPoints.push(batchEndIndex + 1);  // Just after boundary for safety
    }
    
    // Check if we're at or past any trigger point
    const matchingTriggerPoints = triggerPoints.filter(point => 
      oldestVisibleIndex >= point && 
      oldestVisibleIndex <= point + 2 && // Allow a small range
      point < messages.length - 5 // Make sure we're not too close to the end
    );
    
    if (matchingTriggerPoints.length > 0) {
      const triggerPoint = matchingTriggerPoints[0];
      debugLog('MBA9876: Found matching trigger point', {
        triggerPoint,
        oldestVisibleIndex,
        alreadyPaginated: paginatedIndicesRef.current.has(triggerPoint)
      });
      
      // Only trigger if we haven't paginated at this point already
      if (!paginatedIndicesRef.current.has(triggerPoint)) {
        triggerPagination(triggerPoint);
      }
    }
  });
  
  // Specifically check for the very end of the list
  const handleEndReached = useCallback(() => {
    if (!hasMore || initialRenderRef.current || preventInitialPaginationRef.current || 
        isLoadingMore || isLoadingMoreRef.current) {
      return;
    }
    
    debugLog('MBA9876: End reached', {
      messagesLength: messages.length,
      scrollPosition: scrollPositionRef.current
    });
    
    // Specifically check for the last few items
    const endIndex = messages.length - 1;
    
    // Try to trigger pagination at the very end if we haven't already
    if (!paginatedIndicesRef.current.has(endIndex)) {
      debugLog('MBA9876: Trying to paginate at the very end');
      triggerPagination(endIndex);
    }
  }, [hasMore, isLoadingMore, triggerPagination, messages.length]);
  
  // Handle scroll to track position and user scrolling state
  const handleScroll = useCallback((event) => {
    // Store current scroll position
    scrollPositionRef.current = event.nativeEvent.contentOffset.y;
    
    // Consider user as scrolling when they've scrolled a bit from the top
    if (event.nativeEvent.contentOffset.y > 30) {
      if (!isUserScrollingRef.current) {
        debugLog('MBA9876: User started scrolling', {
          scrollY: event.nativeEvent.contentOffset.y
        });
        isUserScrollingRef.current = true;
        preventInitialPaginationRef.current = false;
      }
    }
  }, []);
  
  // Config for viewability
  const viewabilityConfigRef = useRef({
    itemVisiblePercentThreshold: 10,  // Need less of the item to be visible
    minimumViewTime: 50              // Need less time to be considered visible
  });
  
  // Stable handlers as refs
  const onScrollBeginDragRef = useRef(() => {
    isUserScrollingRef.current = true;
    preventInitialPaginationRef.current = false;
    debugLog('MBA9876: Scroll drag began');
  });
  
  const onMomentumScrollEndRef = useRef(() => {
    debugLog('MBA9876: Momentum scroll ended', {
      scrollPosition: scrollPositionRef.current,
      messagesLength: messages.length
    });
    
    // Special handling: when scroll momentum ends, check if we're near a batch boundary
    // This helps catch cases where scrolling is too fast and the viewability events miss
    const BATCH_SIZE = 20;
    
    // Calculate batch boundaries
    for (let i = 1; i < 10; i++) {  // Support up to 10 pages
      const batchEndIndex = (i * BATCH_SIZE) - 1;  // End of each batch (19, 39, 59, etc)
      
      // Adjust this based on testing - see if we can identify when momentum scroll
      // ends near a batch boundary based on the scroll position
      if (scrollPositionRef.current > 100 && batchEndIndex < messages.length - 5) {
        const triggerIndex = batchEndIndex;
        
        if (!paginatedIndicesRef.current.has(triggerIndex)) {
          debugLog('MBA9876: Momentum ended, trying backup pagination at batch boundary', {
            batchEndIndex,
            scrollPosition: scrollPositionRef.current
          });
          
          // Use timeout to let the scroll settle
          setTimeout(() => {
            triggerPagination(triggerIndex);
          }, 100);
          
          // Only try one batch boundary
          break;
        }
      }
    }
  });
  
  const keyExtractor = useCallback((item, index) => {
    if (item.message_id) {
      return `message-${item.message_id}`;
    }
    
    const timestamp = item.timestamp || item.created_at || Date.now();
    const senderHash = item.sent_by_other_user ? 'other' : 'self';
    const contentHash = item.content ? item.content.substring(0, 10) : 'empty';
    return `message-${timestamp}-${senderHash}-${contentHash}-${index}`;
  }, []);
  
  // Calculate extra padding for mobile - much more for web to ensure message visibility
  // Reduce padding on iOS to avoid grey space issues
  const extraPadding = Platform.OS === 'web' ? 
    (Platform.isPad || (Platform.OS === 'web' && /iPad|iPhone|iPod/.test(navigator.userAgent))) ? 0 : 0 
    : 50;
  
  // Scroll to the top of the inverted list when messages change
  React.useEffect(() => {
    // Reset initial render flag after first render
    if (initialRenderRef.current) {
      initialRenderRef.current = false;
      // Always scroll to latest on initial render
      if (flatListRef.current && Platform.OS === 'web') {
        setTimeout(() => {
          try {
            flatListRef.current.scrollToOffset({ offset: 0, animated: false });
            debugLog('MBA9876: Initial render - scrolled to latest message');
          } catch (error) {
            debugLog('MBA9876: Error during initial scroll', error);
          }
        }, 100);
      }
      return;
    }
    
    // Skip auto-scrolling if this is a pagination load
    const isPaginationLoad = messages.length > previousMessageCount.current && 
                             messages.length !== previousMessageCount.current + 1;
    
    debugLog('MBA9876: Messages changed, checking scroll conditions', {
      isUserScrolling: isUserScrollingRef.current,
      isLoadingMore: isLoadingMoreRef.current,
      isPaginationLoad,
      previousCount: previousMessageCount.current,
      newCount: messages.length
    });
    
    // Only auto-scroll if:
    // 1. User is not manually scrolling
    // 2. We're not loading more messages through pagination
    // 3. This appears to be a new message (length increased by exactly 1)
    if (flatListRef.current && Platform.OS === 'web' && 
        !isUserScrollingRef.current && 
        !isLoadingMoreRef.current && 
        !isPaginationLoad && 
        messages.length === previousMessageCount.current + 1) {
      
      setTimeout(() => {
        try {
          // For inverted list, scrollToOffset with 0 shows the most recent message
          flatListRef.current.scrollToOffset({ offset: 0, animated: false });
          debugLog('MBA9876: New message detected - scrolled to latest message');
        } catch (error) {
          debugLog('MBA9876: Error scrolling FlatList', error);
        }
      }, 100);
    } else {
      debugLog('MBA9876: Skipping auto-scroll', {
        reason: isUserScrollingRef.current ? 'user scrolling' : 
                isLoadingMoreRef.current ? 'loading more messages' : 
                isPaginationLoad ? 'pagination in progress' : 
                'not a new message'
      });
    }
  }, [messages]);
  
  // Reset the scrolling flag when appropriate
  React.useEffect(() => {
    // If a single new message was added (not pagination), reset the user scrolling flag
    // This allows auto-scroll to work for new messages after the user has been idle
    if (messages.length === previousMessageCount.current + 1 && 
        !isLoadingMoreRef.current) {
      
      debugLog('MBA9876: Single new message detected, resetting scroll flags');
      isUserScrollingRef.current = false;
    }
  }, [messages.length]);
  
  // iOS keyboard-specific fix for gray space
  React.useEffect(() => {
    if (Platform.OS === 'web') {
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
      
      if (isIOS) {
        debugLog('MBA9876: Setting up iOS-specific keyboard fixes');
        
        // Create iOS-specific styles
        const styleTag = document.createElement('style');
        styleTag.id = 'ios-keyboard-fixes';
        styleTag.innerHTML = `
          /* iOS keyboard fixes */
          body.ios-keyboard-open {
            position: fixed;
            width: 100%;
            height: 100%;
            overflow: hidden;
          }
          
          .message-input-container.ios-keyboard-open {
            position: absolute !important;
            bottom: 0 !important;
            left: 0 !important;
            right: 0 !important;
            background-color: white !important;
            z-index: 100 !important;
          }
          
          .message-container.ios-keyboard-open {
            height: calc(100% - 60px) !important;
            margin-bottom: 60px !important;
            overflow-y: auto !important;
          }
          
          .messagesContainer {
            -webkit-overflow-scrolling: touch !important;
          }
        `;
        document.head.appendChild(styleTag);
        
        // Function to handle keyboard showing
        const handleFocusIn = (e) => {
          if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) {
            debugLog('MBA9876: iOS input focused');
            
            // Add classes for keyboard open state
            document.body.classList.add('ios-keyboard-open');
            
            const inputContainer = document.querySelector('.message-input-container');
            if (inputContainer) {
              inputContainer.classList.add('ios-keyboard-open');
            }
            
            const messageContainer = document.querySelector('.message-container');
            if (messageContainer) {
              messageContainer.classList.add('ios-keyboard-open');
            }
            
            // Scroll the input into view
            setTimeout(() => {
              if (e.target) {
                e.target.scrollIntoView(false);
              }
            }, 300);
          }
        };
        
        // Function to handle keyboard hiding
        const handleFocusOut = (e) => {
          // Only handle if we're not focusing on another input element
          if (!e.relatedTarget || (e.relatedTarget.tagName !== 'INPUT' && e.relatedTarget.tagName !== 'TEXTAREA')) {
            debugLog('MBA9876: iOS input blurred');
            
            // Remove classes for keyboard open state
            document.body.classList.remove('ios-keyboard-open');
            
            const inputContainer = document.querySelector('.message-input-container');
            if (inputContainer) {
              inputContainer.classList.remove('ios-keyboard-open');
            }
            
            const messageContainer = document.querySelector('.message-container');
            if (messageContainer) {
              messageContainer.classList.remove('ios-keyboard-open');
            }
            
            // Fix scroll position
            window.scrollTo(0, 0);
          }
        };
        
        // Add event listeners
        document.addEventListener('focusin', handleFocusIn);
        document.addEventListener('focusout', handleFocusOut);
        
        // Handle page visibility changes (helps with background/foreground transitions)
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') {
            // When page becomes visible again, reset any keyboard-related classes
            document.body.classList.remove('ios-keyboard-open');
            
            const inputContainer = document.querySelector('.message-input-container');
            if (inputContainer) {
              inputContainer.classList.remove('ios-keyboard-open');
            }
            
            const messageContainer = document.querySelector('.message-container');
            if (messageContainer) {
              messageContainer.classList.remove('ios-keyboard-open');
            }
            
            // Force scroll to top
            window.scrollTo(0, 0);
          }
        });
        
        return () => {
          // Clean up
          document.removeEventListener('focusin', handleFocusIn);
          document.removeEventListener('focusout', handleFocusOut);
          
          const styleElement = document.getElementById('ios-keyboard-fixes');
          if (styleElement) {
            styleElement.remove();
          }
        };
      }
    }
  }, []);
  
  // Expose the scrollToTop method to parent components if needed
  React.useImperativeHandle(ref, () => ({
    scrollToTop: () => {
      if (flatListRef.current) {
        flatListRef.current.scrollToOffset({ offset: 0, animated: true });
      }
    }
  }), []);
  
  return (
    <FlatList
      ref={flatListRef}
      data={messages}
      renderItem={renderMessage}
      keyExtractor={keyExtractor}
      style={[styles.messageList, { minHeight: '100%' }]}
      onEndReached={handleEndReached}
      onEndReachedThreshold={0.1}
      scrollEventThrottle={16}
      onScroll={handleScroll}
      onViewableItemsChanged={onViewableItemsChangedRef.current}
      viewabilityConfig={viewabilityConfigRef.current}
      onScrollBeginDrag={onScrollBeginDragRef.current}
      onMomentumScrollEnd={onMomentumScrollEndRef.current}
      inverted={true}
      maintainVisibleContentPosition={{
        minIndexForVisible: 0,
        autoscrollToTopThreshold: 10
      }}
      contentContainerStyle={{
        flexGrow: 1,
        justifyContent: 'flex-end',
        paddingTop: extraPadding, // Much larger padding for web
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
      className={className || "message-list-component"}
    />
  );
});

export default MessageList; 