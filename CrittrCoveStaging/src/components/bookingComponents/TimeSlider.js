import React, { useRef, useEffect, useContext, useState } from 'react';
import { View, Text, StyleSheet, Animated, PanResponder } from 'react-native';
import { theme } from '../../styles/theme';
import { AuthContext } from '../../context/AuthContext';

const THUMB_SIZE = 20;
const TOUCH_SIZE = 40; // Larger touch target
const TRACK_HEIGHT = 4;
const MINUTES_STEP = 15;
const MIN_HOURS = 0;
const MIN_MINUTES = 0;
const MAX_HOURS = 23;
const MAX_MINUTES = 45;
const MAX_TIME_POSITION_RATIO = (MAX_HOURS + MAX_MINUTES / 60) / 24; // This will be 0.9895833...
const MIN_TIME_POSITION_RATIO = (MIN_HOURS + MIN_MINUTES / 60) / 24; // This will be 0
const TOUCH_HITSLOP = { top: 20, bottom: 20, left: 20, right: 20 };

const TimeSlider = ({ 
  sliderWidth,
  startTime,
  endTime,
  onTimeChange,
  is_DEBUG = false
}) => {
  const startThumbX = useRef(new Animated.Value(0)).current;
  const endThumbX = useRef(new Animated.Value(0)).current;
  const isDragging = useRef(false);
  const timelineRef = useRef(null);
  const [trackWidth, setTrackWidth] = useState(sliderWidth);
  const initialTimes = useRef({ startTime, endTime });

  // Measure timeline width to match slider track
  useEffect(() => {
    if (timelineRef.current) {
      timelineRef.current.measure((x, y, width) => {
        const newWidth = Math.max(width - THUMB_SIZE, 0);
        setTrackWidth(newWidth);
        if (is_DEBUG) console.log('MBA54321 Timeline width:', width, 'Track width:', newWidth);
      });
    }
  }, [sliderWidth]);

  // Convert time to position
  const timeToPosition = (hours, minutes) => {
    // Special case: midnight as end time
    if (hours === 0 && minutes === 0 && 
        endTime && endTime.hours === 0 && endTime.minutes === 0) {
      return MAX_TIME_POSITION_RATIO * trackWidth;
    }
    
    // Ensure we don't exceed max time or go below min time
    if (hours > MAX_HOURS || (hours === MAX_HOURS && minutes > MAX_MINUTES)) {
      return MAX_TIME_POSITION_RATIO * trackWidth;
    }
    if (hours < MIN_HOURS || (hours === MIN_HOURS && minutes < MIN_MINUTES)) {
      return MIN_TIME_POSITION_RATIO * trackWidth;
    }
    
    // Fix for issue #3: 9:00 AM being skipped
    // Special handling for certain times that might get skipped
    if (hours === 9 && minutes === 0) {
      // Calculate position for 9:00 AM exactly
      return (9 / 24) * trackWidth;
    }
    
    return ((hours + minutes / 60) / 24) * trackWidth;
  };

  // Convert position to time
  const positionToTime = (position) => {
    // Ensure position doesn't exceed max allowed
    const adjustedPosition = Math.min(
      Math.max(position, MIN_TIME_POSITION_RATIO * trackWidth),
      MAX_TIME_POSITION_RATIO * trackWidth
    );
    
    // Calculate time from position
    const timeInHours = (adjustedPosition / trackWidth) * 24;
    let hours = Math.floor(timeInHours);
    let minutes = Math.round((timeInHours - hours) * 60 / MINUTES_STEP) * MINUTES_STEP;
    
    // Handle minute rollover
    if (minutes === 60) {
      hours = (hours + 1) % 24;
      minutes = 0;
    }

    // Ensure we don't exceed max time or go below min time
    if (hours > MAX_HOURS || (hours === MAX_HOURS && minutes > MAX_MINUTES)) {
      return { hours: MAX_HOURS, minutes: MAX_MINUTES };
    }
    if (hours < MIN_HOURS || (hours === MIN_HOURS && minutes < MIN_MINUTES)) {
      return { hours: MIN_HOURS, minutes: MIN_MINUTES };
    }
    
    // Fix for issue #3: Ensure 9:00 AM isn't skipped
    // Check if we're very close to 9:00 AM
    const position9AM = (9 / 24) * trackWidth;
    if (Math.abs(adjustedPosition - position9AM) < 5) {
      return { hours: 9, minutes: 0 };
    }
    
    // Special case: Very close to end of day = midnight
    if (Math.abs(adjustedPosition - MAX_TIME_POSITION_RATIO * trackWidth) < 5) {
      return { hours: 0, minutes: 0 };
    }
    
    return { hours, minutes };
  };

  // Update thumb positions when times change
  useEffect(() => {
    if (isDragging.current) return;
    
    const startPosition = timeToPosition(startTime.hours, startTime.minutes);
    const endPosition = timeToPosition(endTime.hours, endTime.minutes);
    
    startThumbX.setValue(startPosition);
    endThumbX.setValue(endPosition);
  }, [startTime, endTime, trackWidth]);

  // Start thumb pan responder
  const startPanResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: () => {
      isDragging.current = true;
    },
    onPanResponderMove: (evt, gesture) => {
      // Get current position of both thumbs
      const currentStartPos = startThumbX.__getValue();
      const currentEndPos = endThumbX.__getValue();
      
      // Calculate new position with constraints
      let newPos = currentStartPos + gesture.dx;
      
      // Min/max boundaries
      newPos = Math.max(0, Math.min(newPos, trackWidth));
      
      // Don't allow start thumb to go beyond end thumb
      if (newPos >= currentEndPos - 1) {
        return;
      }
      
      // Update position
      startThumbX.setValue(newPos);
      
      // Update time
      const { hours, minutes } = positionToTime(newPos);
      onTimeChange(true, hours, minutes);
    },
    onPanResponderRelease: () => {
      // Get final position
      const finalPos = startThumbX.__getValue();
      
      // Validate final position is valid
      const { hours, minutes } = positionToTime(finalPos);
      onTimeChange(true, hours, minutes, true);
      
      // Reset dragging state
      isDragging.current = false;
    },
    onPanResponderTerminate: () => {
      isDragging.current = false;
    },
  });

  // End thumb pan responder
  const endPanResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: () => {
      isDragging.current = true;
    },
    onPanResponderMove: (evt, gesture) => {
      // Get current position of both thumbs
      const currentStartPos = startThumbX.__getValue();
      const currentEndPos = endThumbX.__getValue();
      
      // Calculate new position with constraints
      let newPos = currentEndPos + gesture.dx;
      
      // Min/max boundaries
      newPos = Math.max(0, Math.min(newPos, trackWidth));
      
      // Don't allow end thumb to go before start thumb plus minimum 2-hour difference
      // Fix for issue #2: Add a minimum 2-hour gap between thumbs
      const minGapInPosition = (2 / 24) * trackWidth; // 2 hours gap
      
      if (newPos <= currentStartPos + minGapInPosition) {
        // If user tries to drag end time too close to start time,
        // fix the position at minimum 2 hours after start time
        const { hours: startHours, minutes: startMinutes } = positionToTime(currentStartPos);
        
        // Calculate end time to be 2 hours after start time
        let newEndHours = startHours + 2;
        let newEndMinutes = startMinutes;
        
        // Handle overflow past midnight
        if (newEndHours >= 24) {
          newEndHours = 0; // midnight
          newEndMinutes = 0;
        }
        
        // Calculate position for this new time and set the thumb there
        const snapPosition = timeToPosition(newEndHours, newEndMinutes);
        endThumbX.setValue(snapPosition);
        
        // Update the time
        onTimeChange(false, newEndHours, newEndMinutes);
        return;
      }
      
      // Normal dragging logic
      endThumbX.setValue(newPos);
      
      // Update time
      const { hours, minutes } = positionToTime(newPos);
      onTimeChange(false, hours, minutes);
    },
    onPanResponderRelease: () => {
      // Get final position
      const finalPos = endThumbX.__getValue();
      
      // Validate final position is valid
      const { hours, minutes } = positionToTime(finalPos);
      onTimeChange(false, hours, minutes, true);
      
      // Reset dragging state
      isDragging.current = false;
    },
    onPanResponderTerminate: () => {
      isDragging.current = false;
    },
  });

  return (
    <View style={styles.container}>
      <View style={[styles.sliderTrack, { width: trackWidth }]}>
        <Animated.View
          style={[
            styles.selectedTrack,
            {
              left: startThumbX,
              right: Animated.subtract(trackWidth, endThumbX),
            },
          ]}
        />
        <Animated.View
          {...startPanResponder.panHandlers}
          style={[
            styles.thumbTouchArea,
            {
              transform: [{ translateX: startThumbX }],
            },
          ]}
        >
          <View style={[styles.thumb, styles.touchableThumb]} />
        </Animated.View>
        <Animated.View
          {...endPanResponder.panHandlers}
          style={[
            styles.thumbTouchArea,
            {
              transform: [{ translateX: endThumbX }],
            },
          ]}
        >
          <View style={[styles.thumb, styles.touchableThumb]} />
        </Animated.View>
      </View>
      <View 
        style={styles.timelineLabels} 
        ref={timelineRef} 
        onLayout={() => {
          timelineRef.current?.measure((x, y, width) => {
            const newWidth = Math.max(width - THUMB_SIZE, 0);
            setTrackWidth(newWidth);
          });
        }}
      >
        {/* Fix for issue #1: Add pointerEvents="none" to prevent text selection/highlighting */}
        <Text style={styles.timelineLabel} pointerEvents="none">12 AM</Text>
        <Text style={styles.timelineLabel} pointerEvents="none">6 AM</Text>
        <Text style={styles.timelineLabel} pointerEvents="none">12 PM</Text>
        <Text style={styles.timelineLabel} pointerEvents="none">6 PM</Text>
        <Text style={styles.timelineLabel} pointerEvents="none">12 AM</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 40,
    paddingHorizontal: 10,
  },
  sliderTrack: {
    height: TRACK_HEIGHT,
    backgroundColor: theme.colors.modernBorder,
    borderRadius: TRACK_HEIGHT / 2,
    position: 'relative',
  },
  selectedTrack: {
    position: 'absolute',
    height: TRACK_HEIGHT,
    backgroundColor: theme.colors.mainColors.main,
    borderRadius: TRACK_HEIGHT / 2,
  },
  thumbTouchArea: {
    width: TOUCH_SIZE,
    height: TOUCH_SIZE,
    position: 'absolute',
    top: -TOUCH_SIZE / 2 + TRACK_HEIGHT / 2,
    marginLeft: -TOUCH_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
    // Fix for issue #1: Prevent text highlighting affecting the slider
    userSelect: 'none',
  },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: theme.colors.mainColors.main,
    position: 'absolute',
    borderWidth: 1,
    borderColor: 'white',
    // Fix for issue #1: Prevent text highlighting affecting the slider
    userSelect: 'none',
  },
  touchableThumb: {
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  timelineLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingHorizontal: 0,
    // Fix for issue #1: Prevent text highlighting affecting the slider
    userSelect: 'none',
  },
  timelineLabel: {
    fontSize: 12,
    color: theme.colors.text,
    fontFamily: theme.fonts.regular.fontFamily,
    // Fix for issue #1: Prevent text highlighting affecting the slider
    userSelect: 'none',
  },
});

export default TimeSlider; 