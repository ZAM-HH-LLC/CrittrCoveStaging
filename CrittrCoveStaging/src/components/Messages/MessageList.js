import React, { useRef, useCallback, forwardRef, useState, useMemo } from 'react';
import { FlatList, ActivityIndicator, Platform, View } from 'react-native';
import { debugLog } from '../../context/AuthContext';
import MessageDateSeparator from './MessageDateSeparator';
import { formatMessageDate, groupMessagesByDate } from './messageTimeUtils';
import moment from 'moment-timezone';

const MessageList = forwardRef(({ 
  messages, 
  renderMessage, 
  hasMore, 
  isLoadingMore,
  onLoadMore,
  styles,
  theme,
  className,
  userTimezone
}, ref) => {
  const flatListRef = useRef(null);
  const isUserScrollingRef = useRef(false);
  const isLoadingMoreRef = useRef(false);
  const previousMessageCount = useRef(messages.length);
  const initialRenderRef = useRef(true);
  const preventInitialPaginationRef = useRef(true);
  const scrollPositionRef = useRef(0);
  const lastPaginationTimeRef = useRef(0);
  const PAGINATION_COOLDOWN = 1000; // Reduced from 2000 to 1000 for more responsive pagination
  
  // Group messages by date
  const messagesByDate = useMemo(() => {
    return groupMessagesByDate(messages, userTimezone);
  }, [messages, userTimezone]);
  
  // Track which indices we've already triggered pagination for
  const paginatedIndicesRef = useRef(new Set());
  
  // Add a visibility flag to track if we're near pagination boundaries
  const isNearPaginationBoundaryRef = useRef(false);
  
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
  const triggerPagination = useCallback((triggerIndex, forceTrigger = false) => {
    const now = Date.now();
    const timeSinceLastPagination = now - lastPaginationTimeRef.current;
    
    // Skip if we don't meet base conditions
    if (!hasMore || isLoadingMore || isLoadingMoreRef.current || 
        (!isUserScrollingRef.current && !forceTrigger) || initialRenderRef.current) {
      debugLog('MBA9876: Skipping pagination - basic conditions not met', {
        hasMore,
        isLoadingMore,
        isLoadingMoreRef: isLoadingMoreRef.current,
        isUserScrolling: isUserScrollingRef.current,
        forceTrigger,
        initialRender: initialRenderRef.current
      });
      return false;
    }
    
    // Skip if on cooldown, unless we're forcing the trigger
    if (timeSinceLastPagination < PAGINATION_COOLDOWN && !forceTrigger) {
      debugLog('MBA9876: Pagination on cooldown', {
        timeSinceLastPagination,
        cooldown: PAGINATION_COOLDOWN
      });
      return false;
    }
    
    // Skip if we've already paginated at this index, unless we're forcing the trigger
    if (paginatedIndicesRef.current.has(triggerIndex) && !forceTrigger) {
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
      isLoadingMore,
      forceTrigger
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
  const onViewableItemsChangedRef = useRef(({ viewableItems, changed }) => {
    if (!viewableItems || viewableItems.length === 0) {
      return;
    }
    
    // Now we also handle cases when user isn't scrolling but needs to load more
    if (initialRenderRef.current) {
      return;
    }
    
    // Check the first batch of 20 messages
    const FIRST_BATCH_SIZE = 20;
    if (messages.length <= FIRST_BATCH_SIZE) {
      return; // Not enough messages for pagination yet
    }
    
    // Check if we can see the very last message in the list (oldest message)
    // This is the most reliable trigger for pagination
    const isLastMessageVisible = viewableItems.some(item => item.index === messages.length - 1);
    
    // Force pagination if we can see the last message and haven't paginated yet
    if (isLastMessageVisible && hasMore && !isLoadingMore && !isLoadingMoreRef.current && 
        !paginatedIndicesRef.current.has(messages.length - 1)) {
      debugLog('MBA9876: Last message (oldest) is visible - forcing pagination', {
        lastMessageIndex: messages.length - 1,
        viewableItemsCount: viewableItems.length
      });
      
      // Trigger pagination immediately at the end of the list
      triggerPagination(messages.length - 1, true);
      return;
    }
    
    // Track the oldest index we can see
    let oldestVisibleIndex = -1;
    viewableItems.forEach(item => {
      if (item.index > oldestVisibleIndex) {
        oldestVisibleIndex = item.index;
      }
    });
    
    // Also look for newly visible items that might be close to batch boundaries
    let newestChangedItem = -1;
    if (changed && changed.length > 0) {
      changed.forEach(change => {
        if (change.isViewable && change.index > newestChangedItem) {
          newestChangedItem = change.index;
        }
      });
    }
    
    // Use the changed item index if it's newer than our current oldest
    if (newestChangedItem > oldestVisibleIndex) {
      oldestVisibleIndex = newestChangedItem;
    }
    
    debugLog('MBA9876: Viewing oldest index', {
      oldestVisibleIndex,
      messagesLength: messages.length,
      viewableItemsCount: viewableItems.length,
      newestChangedItem
    });
    
    // More aggressive pagination boundary detection
    // If we're seeing messages close to a batch boundary, set the flag
    const BATCH_SIZE = 20;
    const batchNumber = Math.floor(oldestVisibleIndex / BATCH_SIZE) + 1;
    const batchEndIndex = (batchNumber * BATCH_SIZE) - 1;
    const distanceToBatchBoundary = batchEndIndex - oldestVisibleIndex;
    
    // Check if we're near a pagination boundary (within 5 items)
    isNearPaginationBoundaryRef.current = (distanceToBatchBoundary >= 0 && distanceToBatchBoundary <= 5);
    
    // Also check if we're within 3 items of the end of the list - another pagination trigger
    const isNearEndOfList = (messages.length - oldestVisibleIndex) <= 3;
    if (isNearEndOfList) {
      isNearPaginationBoundaryRef.current = true;
    }
    
    debugLog('MBA9876: Pagination boundary check', {
      oldestVisibleIndex,
      batchNumber,
      batchEndIndex,
      distanceToBatchBoundary,
      isNearBoundary: isNearPaginationBoundaryRef.current,
      isNearEndOfList
    });
    
    // If we're within a few items of the end, force pagination
    if (isNearEndOfList && hasMore && !isLoadingMore && !isLoadingMoreRef.current && 
        !paginatedIndicesRef.current.has(messages.length - 1)) {
      debugLog('MBA9876: Very close to end of list - forcing pagination', {
        distanceFromEnd: messages.length - oldestVisibleIndex
      });
      
      triggerPagination(messages.length - 1, true);
      return;
    }
    
    // Calculate specific trigger points based on the batches (aggressively)
    // Each batch is 20 messages from the backend
    const triggerPoints = [];
    
    // Start from the first batch boundary (19) and add each subsequent batch boundary
    for (let i = 1; i < 10; i++) {  // Support up to 10 pages
      const batchEndIndex = (i * 20) - 1;  // End of each batch (19, 39, 59, etc)
      
      // Add more trigger points for more reliable detection
      triggerPoints.push(batchEndIndex - 6);  // Further away from boundary
      triggerPoints.push(batchEndIndex - 4);  // Trigger a bit before the boundary
      triggerPoints.push(batchEndIndex - 2);  // Another trigger point
      triggerPoints.push(batchEndIndex - 1);  // Just before boundary
      triggerPoints.push(batchEndIndex);      // The exact boundary
      triggerPoints.push(batchEndIndex + 1);  // Just after boundary for safety
      triggerPoints.push(batchEndIndex + 2);  // Another safety point
    }
    
    // Check if we're at or past any trigger point - use a wider range
    const matchingTriggerPoints = triggerPoints.filter(point => 
      oldestVisibleIndex >= point && 
      oldestVisibleIndex <= point + 4 && // Increased range for better detection
      point < messages.length - 3 // Make sure we're not too close to the end
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
        // If we're scrolling or very close to boundary, force the trigger
        const forceTrigger = isUserScrollingRef.current || 
                            (Math.abs(oldestVisibleIndex - triggerPoint) <= 1);
        triggerPagination(triggerPoint, forceTrigger);
      }
    }
  });
  
  // Enhanced end reached handler for more reliable pagination at list boundaries
  const handleEndReached = useCallback(() => {
    // Always allow pagination when we reach the end of the list, even if initial load
    // but still respect loading states
    if (!hasMore || isLoadingMore || isLoadingMoreRef.current) {
      debugLog('MBA9876: End reached but skipping pagination - conditions not met', {
        hasMore,
        isLoadingMore,
        isLoadingMoreRef: isLoadingMoreRef.current,
        messagesLength: messages.length
      });
      return;
    }
    
    // For web, try to get the FlatList scroll metrics directly
    // This provides a much more reliable way to detect if we're at the end
    if (Platform.OS === 'web' && flatListRef.current) {
      try {
        // Access the scroll node directly to get precise measurements
        const node = flatListRef.current;
        if (node && typeof node.getScrollableNode === 'function') {
          const scrollNode = node.getScrollableNode();
          if (scrollNode) {
            const { scrollHeight, clientHeight, scrollTop } = scrollNode;
            const distanceFromBottom = scrollHeight - (clientHeight + scrollTop);
            
            debugLog('MBA9876: End reached - DOM scroll metrics', {
              scrollHeight,
              clientHeight,
              scrollTop,
              distanceFromBottom,
              messagesLength: messages.length
            });
            
            // If we're very close to the bottom (oldest messages in inverted list)
            // Force pagination regardless of other conditions
            if (distanceFromBottom < 200) {
              const endIndex = messages.length - 1;
              
              debugLog('MBA9876: End reached - close to oldest messages, forcing pagination', {
                distanceFromBottom,
                endIndex
              });
              
              // Force trigger pagination at the end of the list
              setTimeout(() => {
                triggerPagination(endIndex, true);
              }, 50);
              return;
            }
          }
        }
      } catch (error) {
        // Fallback to regular pagination if DOM access fails
        debugLog('MBA9876: Error accessing DOM node in handleEndReached', {
          error: error.message
        });
      }
    }
    
    debugLog('MBA9876: End reached', {
      messagesLength: messages.length,
      scrollPosition: scrollPositionRef.current,
      preventInitialPagination: preventInitialPaginationRef.current
    });
    
    // For inverted lists, this actually means we're at the oldest messages
    // Allow pagination even on initial load if we're truly at the end
    if (messages.length > 0) {
      const endIndex = messages.length - 1;
      
      // Check if we have already paginated at several endpoints
      const hasPaginatedAtEnd = paginatedIndicesRef.current.has(endIndex);
      const hasPaginatedNearEnd = Array.from(paginatedIndicesRef.current).some(
        index => index > endIndex - 5 && index <= endIndex
      );
      
      // Force pagination at the end of the list, overriding most restrictions
      if (!hasPaginatedAtEnd) {
        debugLog('MBA9876: Forcing pagination at the very end of the list');
        triggerPagination(endIndex, true);
      } else if (!hasPaginatedNearEnd) {
        // Try the next best index if we've already paginated at the end
        const nextBestIndex = messages.length - 5;
        if (nextBestIndex > 0 && !paginatedIndicesRef.current.has(nextBestIndex)) {
          debugLog('MBA9876: Trying alternative pagination index near end', {
            nextBestIndex
          });
          triggerPagination(nextBestIndex, true);
        }
      } else {
        // We've already tried endpoints, try batch boundaries
        const BATCH_SIZE = 20;
        const batchEndIndex = Math.floor(messages.length / BATCH_SIZE) * BATCH_SIZE - 1;
        
        if (batchEndIndex > 0 && !paginatedIndicesRef.current.has(batchEndIndex)) {
          debugLog('MBA9876: Trying batch boundary after exhausting end indices', {
            batchEndIndex
          });
          triggerPagination(batchEndIndex, true);
        }
      }
    }
  }, [hasMore, isLoadingMore, triggerPagination, messages.length]);
  
  // Enhanced scroll handler that better detects when we're at pagination boundaries
  const handleScroll = useCallback((event) => {
    // Store current scroll position
    scrollPositionRef.current = event.nativeEvent.contentOffset.y;
    
    // Get the full scroll metrics for better pagination detection
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    
    // For inverted lists, being near the content bottom means we're seeing oldest messages
    // This calculation tells us how close we are to the oldest messages
    const distanceFromOldestMessages = 
      contentSize.height - (layoutMeasurement.height + contentOffset.y);
    
    // Check if we're very close to the oldest messages (near bottom of inverted list)
    // This is a critical check for pagination that works independent of other checks
    if (hasMore && !isLoadingMore && !isLoadingMoreRef.current && distanceFromOldestMessages < 150) {
      debugLog('MBA9876: Very close to oldest messages - checking for pagination', {
        distanceFromOldestMessages,
        contentHeight: contentSize.height,
        visibleHeight: layoutMeasurement.height,
        scrollY: contentOffset.y
      });
      
      // Find the most appropriate batch boundary to paginate
      const BATCH_SIZE = 20;
      const currentBatchNumber = Math.floor(messages.length / BATCH_SIZE);
      
      // Try to find an unpaginated batch boundary, starting from the oldest
      let targetIndex = -1;
      
      // First try the exact batch boundary
      const exactBatchIndex = (currentBatchNumber * BATCH_SIZE) - 1;
      if (exactBatchIndex > 0 && exactBatchIndex < messages.length && 
          !paginatedIndicesRef.current.has(exactBatchIndex)) {
        targetIndex = exactBatchIndex;
      }
      
      // If no exact batch boundary, try the end of the list
      if (targetIndex === -1 && !paginatedIndicesRef.current.has(messages.length - 1)) {
        targetIndex = messages.length - 1;
      }
      
      // If we found a valid index, trigger pagination
      if (targetIndex !== -1) {
        debugLog('MBA9876: Triggering pagination at oldest message boundary', {
          targetIndex,
          messagesLength: messages.length,
          currentBatch: currentBatchNumber
        });
        triggerPagination(targetIndex, true); // Force trigger
        
        // Early return to avoid duplicating pagination requests
        return;
      }
    }
    
    // Consider user as scrolling when they've scrolled a bit from the top
    if (event.nativeEvent.contentOffset.y > 20) { // Reduced from 30 to be more sensitive
      if (!isUserScrollingRef.current) {
        debugLog('MBA9876: User started scrolling', {
          scrollY: event.nativeEvent.contentOffset.y
        });
        isUserScrollingRef.current = true;
        preventInitialPaginationRef.current = false;
      }
      
      // Check if we're very close to the end of the scroll content
      // This helps catch cases where the user scrolls very fast
      if (hasMore && !isLoadingMore && !isLoadingMoreRef.current) {
        // If we're close to the end and near a pagination boundary, trigger pagination
        if (distanceFromOldestMessages < 100 && isNearPaginationBoundaryRef.current) {
          debugLog('MBA9876: Close to end of content during scroll', {
            distanceFromOldestMessages,
            isNearPaginationBoundary: isNearPaginationBoundaryRef.current
          });
          
          // For fast scrolls, we may need to trigger pagination on multiple batch boundaries
          // Try to find a batch boundary we haven't paginated for yet
          const BATCH_SIZE = 20;
          let foundUnpaginatedBoundary = false;
          
          // Look through the last few batch boundaries
          for (let i = 1; i <= 3; i++) {
            if (messages.length > i * BATCH_SIZE) {
              const batchEndIndex = messages.length - (i * BATCH_SIZE) + (i-1);
              if (!paginatedIndicesRef.current.has(batchEndIndex)) {
                debugLog('MBA9876: Found unpaginated batch boundary during fast scroll', {
                  batchEndIndex
                });
                triggerPagination(batchEndIndex, true);
                foundUnpaginatedBoundary = true;
                break;
              }
            }
          }
          
          // If no unpaginated batch boundary was found, try the end of the list
          if (!foundUnpaginatedBoundary) {
            const endIndex = messages.length - 1;
            if (!paginatedIndicesRef.current.has(endIndex)) {
              triggerPagination(endIndex, true);
            }
          }
        }
      }
    }
  }, [hasMore, isLoadingMore, triggerPagination, messages.length]);
  
  // Config for viewability - more sensitive to detect items earlier
  const viewabilityConfigRef = useRef({
    itemVisiblePercentThreshold: 5,  // Reduced from 10 to be more sensitive
    minimumViewTime: 20             // Reduced from 50 to be more sensitive
  });
  
  // Stable handlers as refs
  const onScrollBeginDragRef = useRef(() => {
    isUserScrollingRef.current = true;
    preventInitialPaginationRef.current = false;
    debugLog('MBA9876: Scroll drag began');
  });
  
  // Enhanced momentum scroll end handler for more reliable pagination
  const onMomentumScrollEndRef = useRef(() => {
    // If no messages or can't load more, don't proceed
    if (messages.length === 0 || !hasMore || isLoadingMore || isLoadingMoreRef.current) {
      return;
    }
    
    debugLog('MBA9876: Momentum scroll ended', {
      scrollPosition: scrollPositionRef.current,
      messagesLength: messages.length
    });
    
    // Get current DOM metrics to check if we're near the oldest messages
    // This is for web only since we can directly access the DOM
    if (Platform.OS === 'web' && flatListRef.current) {
      try {
        // Try to get the underlying DOM node for direct measurement
        // This is a more reliable way to detect scroll position
        const node = flatListRef.current;
        if (node && typeof node.getScrollableNode === 'function') {
          const scrollNode = node.getScrollableNode();
          if (scrollNode) {
            const { scrollHeight, clientHeight, scrollTop } = scrollNode;
            const distanceFromBottom = scrollHeight - (clientHeight + scrollTop);
            
            // If we're very close to the bottom (oldest messages), force pagination
            if (distanceFromBottom < 200 && !initialRenderRef.current) {
              debugLog('MBA9876: Momentum ended very close to oldest messages - forcing pagination', {
                distanceFromBottom,
                scrollHeight,
                clientHeight,
                scrollTop
              });
              
              // Find oldest message batch boundary not yet paginated
              const BATCH_SIZE = 20;
              const currentBatchNumber = Math.floor(messages.length / BATCH_SIZE);
              const exactBatchIndex = (currentBatchNumber * BATCH_SIZE) - 1;
              
              if (exactBatchIndex > 0 && 
                  exactBatchIndex < messages.length && 
                  !paginatedIndicesRef.current.has(exactBatchIndex)) {
                setTimeout(() => {
                  triggerPagination(exactBatchIndex, true);
                }, 50);
                return;
              } else {
                // If we couldn't find a specific batch boundary, try the end of the list
                const endIndex = messages.length - 1;
                if (!paginatedIndicesRef.current.has(endIndex)) {
                  setTimeout(() => {
                    triggerPagination(endIndex, true);
                  }, 50);
                  return;
                }
              }
            }
          }
        }
      } catch (error) {
        // Fallback to standard logic if DOM access fails
        debugLog('MBA9876: Error accessing DOM node, falling back to standard logic', {
          error: error.message
        });
      }
    }
    
    // Special handling: when scroll momentum ends, check if we're near a batch boundary
    // This helps catch cases where scrolling is too fast and the viewability events miss
    const BATCH_SIZE = 20;
    
    // For fast scrolls, we need more aggressive pagination checks
    // Check multiple batch boundaries when momentum ends
    let shouldTriggerPagination = false;
    let triggerIndex = -1;
    
    // Calculate batch boundaries - check more boundaries for fast scrolls
    for (let i = 1; i < Math.min(10, Math.ceil(messages.length / BATCH_SIZE)); i++) {
      const batchEndIndex = (i * BATCH_SIZE) - 1;  // End of each batch (19, 39, 59, etc)
      
      // Try to detect if we should trigger pagination at this boundary
      // For momentum end, we're less restrictive to ensure we catch fast scrolls
      if (batchEndIndex < messages.length - 3) {
        // If we haven't paginated at this index yet, consider triggering
        if (!paginatedIndicesRef.current.has(batchEndIndex)) {
          shouldTriggerPagination = true;
          triggerIndex = batchEndIndex;
          
          debugLog('MBA9876: Identified potential pagination point at momentum end', {
            batchEndIndex,
            scrollPosition: scrollPositionRef.current
          });
          
          // Prefer earlier batch boundaries (older messages) for pagination
          break;
        }
      }
    }
    
    // If we should trigger pagination and we're likely scrolled up enough
    if (shouldTriggerPagination && scrollPositionRef.current > 50 && triggerIndex > 0) {
      debugLog('MBA9876: Momentum ended, triggering backup pagination at batch boundary', {
        triggerIndex,
        scrollPosition: scrollPositionRef.current
      });
      
      // Use timeout to let the scroll settle, then force the trigger
      setTimeout(() => {
        if (triggerPagination) {
          triggerPagination(triggerIndex, true);
        }
      }, 50);
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
    (Platform.isPad || (Platform.OS === 'web' && /iPad|iPhone|iPod/.test(navigator.userAgent))) ? 5 : 5 
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
  
  // Create message groups by date
  const messageGroups = useMemo(() => {
    const groups = groupMessagesByDate(messages, userTimezone);
    debugLog('MBA2349fh04h: Message groups created', { 
      dateCount: Object.keys(groups).length,
      dates: Object.keys(groups),
      timezone: userTimezone
    });
    return groups;
  }, [messages, userTimezone]);

  // Function to get the date key from a timestamp
  const getDateKey = useCallback((timestamp) => {
    if (!timestamp) return null;
    try {
      return moment(timestamp).tz(userTimezone).format('YYYY-MM-DD');
    } catch (error) {
      debugLog('MBA2349fh04h: Error getting date key', { error: error.message, timestamp });
      return null;
    }
  }, [userTimezone]);

  // Function to determine if a message should show a date separator
  const shouldShowDateSeparator = useCallback((item, index) => {
    if (!item || !item.timestamp) {
      return false;
    }
    
    // Get the date key for current message
    const currentDateKey = getDateKey(item.timestamp);
    if (!currentDateKey) return false;
    
    // For the oldest message (last in array, top of visual list), always show date
    // but we'll render it ABOVE the message, not below
    if (index === messages.length - 1) {
      return true;
    }
    
    // For other messages, we check if the next message (older visually above)
    // has a different date
    if (index < messages.length - 1) {
      const nextMessage = messages[index + 1];
      if (!nextMessage || !nextMessage.timestamp) return false;
      
      const nextDateKey = getDateKey(nextMessage.timestamp);
      if (!nextDateKey) return false;
      
      // Only show date separator when the date actually changes
      return currentDateKey !== nextDateKey;
    }
    
    return false;
  }, [messages, getDateKey]);

  // Enhanced renderItem function that adds date separators
  const renderItemWithDateSeparator = useCallback(({ item, index }) => {
    const isOldestMessage = index === messages.length - 1;
    
    // Check if this message needs a date separator
    const needsDateSeparator = shouldShowDateSeparator(item, index);
    let formattedDate = null;
    
    if (needsDateSeparator && item.timestamp) {
      formattedDate = formatMessageDate(item.timestamp, userTimezone);
      
      // Fix for the "Today" label issue
      if (formattedDate === 'Today') {
        const now = moment().tz(userTimezone);
        const todayKey = now.format('YYYY-MM-DD');
        const messageKey = getDateKey(item.timestamp);
        
        // If the message is not actually from today, use the full date format
        if (messageKey !== todayKey) {
          const messageDate = moment(item.timestamp).tz(userTimezone);
          formattedDate = messageDate.format('MMMM D, YYYY');
        }
      }
    }
    
    // Render the message content
    const renderedMessage = renderMessage({ item, index });
    
    // For hidden messages that don't render content
    if (!renderedMessage) {
      return needsDateSeparator && formattedDate ? (
        <View>
          <MessageDateSeparator date={formattedDate} />
        </View>
      ) : null;
    }
    
    // Special handling for oldest message - put date ABOVE
    if (isOldestMessage) {
      return (
        <View>
          {formattedDate && <MessageDateSeparator date={formattedDate} />}
          {renderedMessage}
        </View>
      );
    }
    
    // For regular messages - date goes BELOW (which appears above in inverted list)
    return (
      <View>
        {renderedMessage}
        {needsDateSeparator && formattedDate && !isOldestMessage && (
          <MessageDateSeparator date={formattedDate} />
        )}
      </View>
    );
  }, [renderMessage, shouldShowDateSeparator, userTimezone, getDateKey, messages.length]);

  return (
    <FlatList
      ref={flatListRef}
      data={messages}
      renderItem={renderItemWithDateSeparator}
      keyExtractor={keyExtractor}
      style={[styles.messageList, { minHeight: '100%' }]}
      onEndReached={handleEndReached}
      onEndReachedThreshold={0.5} // Increased to 0.5 to trigger pagination earlier
      scrollEventThrottle={8} // More frequent scroll events for better detection
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