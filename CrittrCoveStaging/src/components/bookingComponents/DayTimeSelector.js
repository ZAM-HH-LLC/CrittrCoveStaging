import React, { useState, useEffect, useContext } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../../styles/theme';
import { AuthContext, debugLog } from '../../context/AuthContext';
import NewTimeRangeSelector from './NewTimeRangeSelector';

const DayTimeSelector = ({
  date,
  initialTimes = {},
  onTimeChange,
  is_overnight = false
}) => {
  const { is_DEBUG } = useContext(AuthContext);
  
  // Format the date for display
  const formatDate = (date) => {
    if (!date) return '';
    
    // Create a copy to prevent timezone issues
    const dateObj = new Date(date);
    const options = { weekday: 'short', month: 'short', day: 'numeric' };
    return dateObj.toLocaleDateString('en-US', options);
  };
  
  // Generate a unique ID for this date's time selector
  const generateUniqueId = () => {
    if (!date) return 'day-unknown';
    
    try {
      // If date is a Date object, convert to ISO string and extract date part
      if (date instanceof Date) {
        return `day-${date.toISOString().split('T')[0]}`;
      }
      
      // If date is already in YYYY-MM-DD format
      if (typeof date === 'string' && date.match(/^\d{4}-\d{2}-\d{2}$/)) {
        return `day-${date}`;
      }
      
      // If date is in another format, try to convert it
      const parsedDate = new Date(date);
      if (!isNaN(parsedDate.getTime())) {
        return `day-${parsedDate.toISOString().split('T')[0]}`;
      }
      
      // Fallback
      return `day-unknown-${Date.now()}`;
    } catch (error) {
      debugLog('MBAoi9uv43d: Error generating unique ID for date:', error);
      return `day-unknown-${Date.now()}`;
    }
  };
  
  // Generate a stable date key for API
  const generateDateKey = () => {
    if (!date) return null;
    
    try {
      // If date is a Date object, convert to YYYY-MM-DD
      if (date instanceof Date) {
        return date.toISOString().split('T')[0];
      }
      
      // If date is already in YYYY-MM-DD format
      if (typeof date === 'string' && date.match(/^\d{4}-\d{2}-\d{2}$/)) {
        return date;
      }
      
      // If date is in another format, try to convert it
      const parsedDate = new Date(date);
      if (!isNaN(parsedDate.getTime())) {
        return parsedDate.toISOString().split('T')[0];
      }
      
      // Couldn't parse date
      debugLog('MBAoi9uv43d: Could not parse date:', date);
      return null;
    } catch (error) {
      debugLog('MBAoi9uv43d: Error generating date key:', error);
      return null;
    }
  };
  
  // Generate stable IDs
  const uniqueId = generateUniqueId();
  const dateKey = generateDateKey();
  
  // Handle time selection from the time range selector
  const handleTimeSelect = (timesData) => {
    if (!dateKey) {
      debugLog('MBAoi9uv43d: Cannot handle time selection - invalid date key');
      return;
    }
    
    // Create a completely new times object to avoid reference issues
    const newTimes = JSON.parse(JSON.stringify(timesData));
    
    debugLog(`MBAoi9uv43d: DayTimeSelector (${uniqueId}) time changed:`, {
      dateKey,
      timesData: newTimes
    });
    
    // Pass the time data up to the parent component
    onTimeChange(newTimes, dateKey);
  };
  
  return (
    <View style={styles.container}>
      <Text style={styles.dateLabel}>{formatDate(date)}</Text>
      
      <NewTimeRangeSelector
        onTimeSelect={handleTimeSelect}
        initialTimes={initialTimes}
        is_overnight={is_overnight}
        uniqueId={uniqueId}
        selectedDates={[date]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.modernBorder,
    borderRadius: 8,
    backgroundColor: theme.colors.surface,
    overflow: 'visible',
  },
  dateLabel: {
    fontSize: theme.fontSizes.medium,
    fontFamily: theme.fonts.medium.fontFamily,
    color: theme.colors.text,
    backgroundColor: theme.colors.bgColorModern,
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.modernBorder,
  }
});

export default DayTimeSelector; 