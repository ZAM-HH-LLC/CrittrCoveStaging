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
    // Ensure we don't exceed max time or go below min time
    if (hours > MAX_HOURS || (hours === MAX_HOURS && minutes > MAX_MINUTES)) {
      return MAX_TIME_POSITION_RATIO * trackWidth;
    }
    if (hours < MIN_HOURS || (hours === MIN_HOURS && minutes < MIN_MINUTES)) {
      return MIN_TIME_POSITION_RATIO * trackWidth;
    }
    return ((hours + minutes / 60) / 24) * trackWidth;
  };

  // Convert position to time
  const positionToTime = (position) => {
    // Ensure position doesn't exceed max allowed or go below min allowed
    const adjustedPosition = Math.min(
      Math.max(position, MIN_TIME_POSITION_RATIO * trackWidth),
      MAX_TIME_POSITION_RATIO * trackWidth
    );
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
    
    return { hours, minutes };
  };

  // Update thumb positions when times change
  useEffect(() => {
    if (!trackWidth || isDragging.current) return;

    const startPos = timeToPosition(startTime.hours, startTime.minutes);
    const endPos = timeToPosition(endTime.hours, endTime.minutes);

    if (!isNaN(startPos)) {
      startThumbX.setValue(startPos);
      if (is_DEBUG) console.log('MBA54321 Setting start thumb to:', startPos);
    }
    if (!isNaN(endPos)) {
      endThumbX.setValue(endPos);
      if (is_DEBUG) console.log('MBA54321 Setting end thumb to:', endPos);
    }
  }, [trackWidth, startTime, endTime]);

  const createPanResponder = (isStart) => {
    let lastValidPosition = 0;

    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (evt) => {
        isDragging.current = true;
        const thumbX = isStart ? startThumbX : endThumbX;
        lastValidPosition = thumbX._value;
        thumbX.setOffset(lastValidPosition);
        thumbX.setValue(0);
        if (is_DEBUG) console.log('MBA54321 Started dragging:', isStart ? 'start' : 'end', 'at:', lastValidPosition);
      },
      onPanResponderMove: Animated.event(
        [null, { dx: isStart ? startThumbX : endThumbX }],
        { 
          useNativeDriver: false,
          listener: (_, gesture) => {
            if (!trackWidth) return;

            const thumbX = isStart ? startThumbX : endThumbX;
            const otherThumbValue = isStart ? endThumbX._value + endThumbX._offset : startThumbX._value + startThumbX._offset;
            
            // Calculate new position
            let newX = thumbX._offset + gesture.dx;
            // Limit to min/max allowed position
            newX = Math.max(MIN_TIME_POSITION_RATIO * trackWidth, 
                   Math.min(newX, MAX_TIME_POSITION_RATIO * trackWidth));

            // Check constraints between thumbs
            if ((isStart && newX >= otherThumbValue) || (!isStart && newX <= otherThumbValue)) {
              return;
            }

            // Update thumb position
            lastValidPosition = newX;

            // Calculate and update time
            const { hours, minutes } = positionToTime(newX);
            if (!isNaN(hours) && !isNaN(minutes)) {
              onTimeChange(isStart, hours, minutes);
              if (is_DEBUG) console.log('MBA54321 Dragging:', isStart ? 'start' : 'end', { newX, hours, minutes });
            }
          }
        }
      ),
      onPanResponderRelease: () => {
        isDragging.current = false;
        const thumbX = isStart ? startThumbX : endThumbX;
        
        // Ensure we keep the last valid position
        thumbX.flattenOffset();

        // Ensure final position doesn't exceed max allowed
        const finalPosition = Math.min(thumbX._value, MAX_TIME_POSITION_RATIO * trackWidth);
        thumbX.setValue(finalPosition);

        const { hours, minutes } = positionToTime(finalPosition);
        if (!isNaN(hours) && !isNaN(minutes)) {
          onTimeChange(isStart, hours, minutes, true);
          if (is_DEBUG) console.log('MBA54321 Released:', isStart ? 'start' : 'end', { position: finalPosition, hours, minutes });
        }
      },
      onPanResponderTerminate: () => {
        isDragging.current = false;
        const thumbX = isStart ? startThumbX : endThumbX;
        thumbX.flattenOffset();
      },
    });
  };

  const startPanResponder = useRef(createPanResponder(true)).current;
  const endPanResponder = useRef(createPanResponder(false)).current;

  return (
    <View style={styles.container}>
      <View style={styles.timelineLabels} ref={timelineRef} onLayout={() => {
        timelineRef.current?.measure((x, y, width) => {
          const newWidth = Math.max(width - THUMB_SIZE, 0);
          setTrackWidth(newWidth);
        });
      }}>
        <Text style={styles.timelineLabel}>12 AM</Text>
        <Text style={[styles.timelineLabel, { marginRight: 15 }]}>6 AM</Text>
        <Text style={styles.timelineLabel}>12 PM</Text>
        <Text style={[styles.timelineLabel, { marginLeft: 15 }]}>6 PM</Text>
        <Text style={styles.timelineLabel}>12 AM</Text>
      </View>

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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  timelineLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingHorizontal: THUMB_SIZE / 2,
  },
  timelineLabel: {
    fontSize: theme.fontSizes.small,
    color: theme.colors.text,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  sliderTrack: {
    height: TRACK_HEIGHT,
    backgroundColor: theme.colors.modernBorder,
    borderRadius: TRACK_HEIGHT / 2,
    marginVertical: THUMB_SIZE / 2,
    marginHorizontal: THUMB_SIZE / 2,
  },
  selectedTrack: {
    position: 'absolute',
    height: TRACK_HEIGHT,
    backgroundColor: theme.colors.mainColors.main,
    borderRadius: TRACK_HEIGHT / 2,
  },
  thumbTouchArea: {
    position: 'absolute',
    width: TOUCH_SIZE,
    height: TOUCH_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: -TOUCH_SIZE / 2,
    top: -TOUCH_SIZE / 2 + TRACK_HEIGHT / 2,
    zIndex: 2,
  },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: theme.colors.mainColors.main,
  },
  touchableThumb: {
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
});

export default TimeSlider; 