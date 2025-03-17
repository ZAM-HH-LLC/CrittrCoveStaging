import React, { useState, useContext, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Modal,
} from 'react-native';
import { theme } from '../../styles/theme';
import { AuthContext } from '../../context/AuthContext';

const DateSelectionCard = ({ 
  selectedDates = [], 
  onDateSelect,
  bookingType = 'one-time', // 'one-time' or 'recurring'
  dateRangeType = 'date-range', // 'date-range' or 'multiple-days'
  initialDateRange = null,
}) => {
  const { is_DEBUG, screenWidth } = useContext(AuthContext);
  const isDesktop = screenWidth > 768;
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDatesList, setSelectedDatesList] = useState(selectedDates);
  const [selectedBookingType, setSelectedBookingType] = useState(bookingType);
  const [selectedDateRangeType, setSelectedDateRangeType] = useState(dateRangeType);
  const [rangeStartDate, setRangeStartDate] = useState(initialDateRange ? initialDateRange.startDate : null);
  const [selectedDaysOfWeek, setSelectedDaysOfWeek] = useState([1, 3]); // Default to M,W
  const [selectedFrequency, setSelectedFrequency] = useState('weekly'); // 'weekly', 'bi-weekly', 'monthly'
  const [dateRangeEnd, setDateRangeEnd] = useState(initialDateRange ? initialDateRange.endDate : null);
  const [showRecurringCalendar, setShowRecurringCalendar] = useState(false);
  const [recurringStartDate, setRecurringStartDate] = useState(new Date());
  const [recurringEndDate, setRecurringEndDate] = useState(() => {
    const date = new Date();
    date.setMonth(date.getMonth() + 1);
    return date;
  });
  const [isSelectingStartDate, setIsSelectingStartDate] = useState(true);
  const [showRecurringPreview, setShowRecurringPreview] = useState(false);
  const [showRecurringDropdownCalendar, setShowRecurringDropdownCalendar] = useState(false);
  const [tempRangeStart, setTempRangeStart] = useState(null);
  const [tempRangeEnd, setTempRangeEnd] = useState(null);
  const [datesFromRange, setDatesFromRange] = useState(false);
  const [lastRangeSelection, setLastRangeSelection] = useState(null);

  useEffect(() => {
    if (is_DEBUG) {
      console.log('MBA54321 DateSelectionCard initialized with dates:', selectedDates);
      console.log('MBA54321 Current booking type:', selectedBookingType);
      console.log('MBA54321 Current date range type:', selectedDateRangeType);
    }
  }, []);

  // Initialize date range if provided
  useEffect(() => {
    if (initialDateRange && initialDateRange.startDate && initialDateRange.endDate && !datesFromRange) {
      const dateRange = [];
      const currentDate = new Date(initialDateRange.startDate);
      const endDate = new Date(initialDateRange.endDate);
      
      while (currentDate <= endDate) {
        dateRange.push(new Date(currentDate));
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      setSelectedDatesList(dateRange);
      setRangeStartDate(initialDateRange.startDate);
      setDateRangeEnd(initialDateRange.endDate);
      setDatesFromRange(true);

      if (onDateSelect) {
        onDateSelect({
          type: 'one-time',
          dates: dateRange,
          rangeType: 'date-range',
          startDate: initialDateRange.startDate,
          endDate: initialDateRange.endDate,
          isValid: true
        });
      }
    }
  }, [initialDateRange, datesFromRange]);

  const handleBookingTypeSelect = (type) => {
    if (is_DEBUG) {
      console.log('MBA54321 Booking type selected:', type);
    }
    setSelectedBookingType(type);
    // Clear selected dates when changing booking type
    setSelectedDatesList([]);
    setRangeStartDate(null);
    setDateRangeEnd(null);
    setDatesFromRange(false);
  };

  const handleDateRangeTypeSelect = (type) => {
    if (is_DEBUG) {
      console.log('MBA54321 Date range type selected:', type);
      console.log('MBA54321 Current range data:', {
        rangeStartDate,
        dateRangeEnd,
        selectedDatesList: selectedDatesList.length
      });
    }
    
    setSelectedDateRangeType(type);
    
    if (type === 'date-range' && lastRangeSelection) {
      // Restore the last range selection when switching back to date-range
      setRangeStartDate(lastRangeSelection.startDate);
      setDateRangeEnd(lastRangeSelection.endDate);
      setSelectedDatesList(lastRangeSelection.dates);
      setDatesFromRange(true);
      
      if (onDateSelect) {
        onDateSelect({
          type: 'one-time',
          dates: lastRangeSelection.dates,
          rangeType: 'date-range',
          startDate: lastRangeSelection.startDate,
          endDate: lastRangeSelection.endDate,
          isValid: true
        });
      }
    } else if (type === 'multiple-days') {
      // Store the current range selection before switching to multiple-days
      if (rangeStartDate && dateRangeEnd) {
        setLastRangeSelection({
          startDate: rangeStartDate,
          endDate: dateRangeEnd,
          dates: selectedDatesList
        });
      }
      
      // Keep the selected dates when switching to multiple-days
      if (onDateSelect) {
        onDateSelect({
          type: 'one-time',
          dates: selectedDatesList,
          rangeType: 'multiple-days',
          isValid: selectedDatesList.length > 0
        });
      }
    }
  };

  const handleDayOfWeekSelect = (dayIndex) => {
    if (is_DEBUG) {
      console.log('MBA54321 Day of week toggled:', dayIndex);
    }
    
    setSelectedDaysOfWeek(prev => {
      if (prev.includes(dayIndex)) {
        return prev.filter(day => day !== dayIndex);
      } else {
        return [...prev, dayIndex];
      }
    });
  };

  const handleFrequencySelect = (frequency) => {
    if (is_DEBUG) {
      console.log('MBA54321 Frequency selected:', frequency);
    }
    setSelectedFrequency(frequency);
  };

  const goToPreviousMonth = () => {
    const prevMonth = new Date(currentMonth);
    prevMonth.setMonth(prevMonth.getMonth() - 1);
    setCurrentMonth(prevMonth);
  };

  const goToNextMonth = () => {
    const nextMonth = new Date(currentMonth);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    setCurrentMonth(nextMonth);
  };

  const isDateSelected = (date) => {
    return selectedDatesList.some(selectedDate => 
      selectedDate.getDate() === date.getDate() && 
      selectedDate.getMonth() === date.getMonth() && 
      selectedDate.getFullYear() === date.getFullYear()
    );
  };

  const isDateInRange = (date) => {
    if (!rangeStartDate || !dateRangeEnd) return false;
    
    return date >= rangeStartDate && date <= dateRangeEnd;
  };

  const handleDateSelection = (date) => {
    if (is_DEBUG) {
      console.log('MBA54321 Date selected:', date);
    }

    if (selectedDateRangeType === 'date-range') {
      handleDateRangeSelection(date);
    } else {
      // Multiple days selection
      toggleDateSelection(date);
    }
  };

  const handleDateRangeSelection = (date) => {
    if (is_DEBUG) {
      console.log('MBA19ynkiy34b handleDateRangeSelection - date:', date);
      console.log('MBA19ynkiy34b handleDateRangeSelection - current state:', {
        rangeStartDate,
        dateRangeEnd,
        selectedDatesList: selectedDatesList.length
      });
    }

    if (!rangeStartDate) {
      setRangeStartDate(date);
      setSelectedDatesList([date]);
      setDateRangeEnd(null);
      setLastRangeSelection(null); // Clear last range when starting new selection
      if (is_DEBUG) console.log('MBA19ynkiy34b handleDateRangeSelection - first date selected');
      if (onDateSelect) {
        onDateSelect({
          type: 'one-time',
          dates: [date],
          rangeType: 'date-range',
          startDate: date,
          isValid: false
        });
      }
    } else if (!dateRangeEnd) {
      let startDate = new Date(rangeStartDate);
      let endDate = new Date(date);
      
      if (date < rangeStartDate) {
        startDate = new Date(date);
        endDate = new Date(rangeStartDate);
      }
      
      setDateRangeEnd(endDate);
      
      const dateRange = [];
      const currentDate = new Date(startDate);
      
      while (currentDate <= endDate) {
        dateRange.push(new Date(currentDate));
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      setSelectedDatesList(dateRange);
      // Store the new range selection
      setLastRangeSelection({
        startDate: startDate,
        endDate: endDate,
        dates: dateRange
      });

      if (onDateSelect) {
        const data = {
          type: 'one-time',
          dates: dateRange,
          rangeType: 'date-range',
          startDate: startDate,
          endDate: endDate,
          isValid: true
        };
        if (is_DEBUG) console.log('MBA19ynkiy34b handleDateRangeSelection - complete range selected, sending data:', data);
        onDateSelect(data);
      }
    } else {
      setRangeStartDate(date);
      setSelectedDatesList([date]);
      setDateRangeEnd(null);
      setLastRangeSelection(null); // Clear last range when starting new selection
      if (is_DEBUG) console.log('MBA19ynkiy34b handleDateRangeSelection - resetting selection');
      if (onDateSelect) {
        onDateSelect({
          type: 'one-time',
          dates: [date],
          rangeType: 'date-range',
          startDate: date,
          isValid: false
        });
      }
    }
  };

  const toggleDateSelection = (date) => {
    if (is_DEBUG) {
      console.log('MBA19ynkiy34b toggleDateSelection - date:', date);
      console.log('MBA19ynkiy34b toggleDateSelection - current selected dates:', selectedDatesList.length);
    }

    const isAlreadySelected = isDateSelected(date);
    let newSelectedDates;
    
    if (isAlreadySelected) {
      newSelectedDates = selectedDatesList.filter(selectedDate => 
        !(selectedDate.getDate() === date.getDate() && 
          selectedDate.getMonth() === date.getMonth() && 
          selectedDate.getFullYear() === date.getFullYear())
      );
    } else {
      newSelectedDates = [...selectedDatesList, date].sort((a, b) => a - b);
    }
    
    setSelectedDatesList(newSelectedDates);

    if (onDateSelect) {
      const data = {
        type: 'one-time',
        dates: newSelectedDates,
        rangeType: 'multiple-days',
        isValid: newSelectedDates.length > 0
      };
      if (is_DEBUG) {
        console.log('MBA19ynkiy34b toggleDateSelection - sending data:', data);
        console.log('MBA19ynkiy34b toggleDateSelection - newSelectedDates length:', newSelectedDates.length);
      }
      onDateSelect(data);
    }
  };

  const handleRecurringDateSelect = (date) => {
    if (is_DEBUG) {
      console.log('MBA19ynkiy34b handleRecurringDateSelect - date:', date);
      console.log('MBA19ynkiy34b handleRecurringDateSelect - current state:', {
        tempRangeStart,
        selectedDaysOfWeek: selectedDaysOfWeek.length,
        frequency: selectedFrequency
      });
    }
    
    if (!tempRangeStart) {
      setTempRangeStart(date);
      setRecurringStartDate(date);
      if (is_DEBUG) console.log('MBA19ynkiy34b handleRecurringDateSelect - first date selected');
      if (onDateSelect) {
        onDateSelect({
          type: 'recurring',
          startDate: date,
          daysOfWeek: selectedDaysOfWeek,
          frequency: selectedFrequency,
          isValid: false
        });
      }
    } else {
      let startDate = tempRangeStart;
      let endDate = date;
      
      if (date < tempRangeStart) {
        startDate = date;
        endDate = tempRangeStart;
      }
      
      setRecurringStartDate(startDate);
      setRecurringEndDate(endDate);
      setTempRangeStart(null);
      setTempRangeEnd(null);
      setShowRecurringDropdownCalendar(false);

      if (onDateSelect) {
        const data = {
          type: 'recurring',
          daysOfWeek: selectedDaysOfWeek,
          frequency: selectedFrequency,
          startDate: startDate,
          endDate: endDate,
          isValid: selectedDaysOfWeek.length > 0
        };
        if (is_DEBUG) {
          console.log('MBA19ynkiy34b handleRecurringDateSelect - complete selection, sending data:', data);
          console.log('MBA19ynkiy34b handleRecurringDateSelect - selectedDaysOfWeek:', selectedDaysOfWeek);
        }
        onDateSelect(data);
      }
    }
  };

  const isDateInTempRange = (date) => {
    if (!tempRangeStart || !date) return false;
    // Only highlight the tempRangeStart date if no end date is selected yet
    if (!tempRangeEnd) {
      return date.getTime() === tempRangeStart.getTime();
    }
    // Otherwise highlight the range between start and end
    return date >= tempRangeStart && date <= tempRangeEnd;
  };

  const openRecurringCalendar = (isStart) => {
    setIsSelectingStartDate(isStart);
    setShowRecurringCalendar(true);
  };

  const isDateSelectable = (date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Allow selection of dates from previous month that are visible
    if (date.getMonth() < currentMonth.getMonth()) {
      return date.getMonth() === ((currentMonth.getMonth() - 1 + 12) % 12) &&
             date >= today;
    }
    
    // Allow selection of dates from next month that are visible
    if (date.getMonth() > currentMonth.getMonth()) {
      return date.getMonth() === ((currentMonth.getMonth() + 1) % 12) &&
             date >= today;
    }
    
    return date >= today;
  };

  const getSelectedDaysText = () => {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const selectedDays = selectedDaysOfWeek.map(dayIndex => dayNames[dayIndex]);
    
    if (selectedDays.length === 0) return 'No days selected';
    
    let daysText = '';
    if (selectedDays.length === 1) {
      daysText = selectedDays[0];
    } else if (selectedDays.length === 2) {
      daysText = `${selectedDays[0]} and ${selectedDays[1]}`;
    } else {
      const lastDay = selectedDays.pop();
      daysText = `${selectedDays.join(', ')}, and ${lastDay}`;
    }

    switch (selectedFrequency) {
      case 'bi-weekly':
        return `every other ${daysText}`;
      case 'monthly':
        const weekNum = getWeekOfMonth(recurringStartDate);
        return `the ${weekNum} ${daysText} of each month`;
      default:
        return `every ${daysText}`;
    }
  };

  const getWeekOfMonth = (date) => {
    const week = Math.ceil((date.getDate() + (date.getDay() === 0 ? 6 : date.getDay() - 1)) / 7);
    const suffixes = ['first', 'second', 'third', 'fourth', 'last'];
    return suffixes[Math.min(week - 1, 4)];
  };

  const renderCalendar = () => {
    const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
    const startDate = new Date(monthStart);
    const endDate = new Date(monthEnd);
    
    startDate.setDate(startDate.getDate() - startDate.getDay());
    endDate.setDate(endDate.getDate() + (6 - endDate.getDay()));
    
    const weeks = [];
    let days = [];
    let day = new Date(startDate);
    
    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        days.push(new Date(day));
        day.setDate(day.getDate() + 1);
      }
      weeks.push(days);
      days = [];
    }

    const monthName = currentMonth.toLocaleString('default', { month: 'long' });
    const year = currentMonth.getFullYear();

    return (
      <View style={styles.calendarContainer}>
        <View style={styles.calendarHeader}>
          <TouchableOpacity onPress={goToPreviousMonth} style={styles.calendarNavButton}>
            <Text style={styles.calendarNavButtonText}>{'<'}</Text>
          </TouchableOpacity>
          <Text style={styles.calendarTitle}>{`${monthName} ${year}`}</Text>
          <TouchableOpacity onPress={goToNextMonth} style={styles.calendarNavButton}>
            <Text style={styles.calendarNavButtonText}>{'>'}</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.weekdaysContainer}>
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
            <Text key={`weekday-${index}`} style={styles.weekdayText}>{day}</Text>
          ))}
        </View>
        
        {weeks.map((week, weekIndex) => (
          <View key={`week-${weekIndex}`} style={styles.weekRow}>
            {week.map((date, dateIndex) => {
              const isSelectable = isDateSelectable(date);
              const isSelected = isDateSelected(date);
              const isInRange = selectedDateRangeType === 'date-range' && isDateInRange(date);
              const isInTempRange = showRecurringDropdownCalendar && isDateInTempRange(date);
              
              return (
                <TouchableOpacity
                  key={`date-${weekIndex}-${dateIndex}`}
                  style={[
                    styles.dateCell,
                    !isSelectable && styles.otherMonthDate,
                    isSelected && styles.selectedDate,
                    isInRange && styles.dateInRange,
                    isInTempRange && styles.dateInRange,
                  ]}
                  onPress={() => isSelectable && (showRecurringDropdownCalendar ? handleRecurringDateSelect(date) : handleDateSelection(date))}
                  disabled={!isSelectable}
                >
                  <Text style={[
                    styles.dateText,
                    !isSelectable && styles.otherMonthDateText,
                    (isSelected || isInRange || isInTempRange) && styles.selectedDateText,
                  ]}>
                    {date.getDate()}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>
    );
  };

  const formatSelectedDate = (date) => {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = monthNames[date.getMonth()];
    const day = date.getDate();
    const year = date.getFullYear();
    return `${month} ${day}, ${year}`;
  };

  const clearDateRange = () => {
    if (is_DEBUG) {
      console.log('MBA54321 Clearing date range');
    }
    
    setSelectedDatesList([]);
    setRangeStartDate(null);
    setDateRangeEnd(null);
    setDatesFromRange(false);
    setLastRangeSelection(null);

    if (onDateSelect) {
      onDateSelect({
        type: 'one-time',
        dates: [],
        rangeType: selectedDateRangeType,
        startDate: null,
        endDate: null,
        isValid: false
      });
    }
  };

  const renderSelectedDates = () => {
    if (selectedDatesList.length === 0) {
      return null;
    }

    // If we have a date range and we're in date-range mode
    if (selectedDateRangeType === 'date-range' && (dateRangeEnd || (datesFromRange && initialDateRange))) {
      const startDate = rangeStartDate || initialDateRange?.startDate || selectedDatesList[0];
      const endDate = dateRangeEnd || initialDateRange?.endDate || selectedDatesList[selectedDatesList.length - 1];
      
      return (
        <View style={styles.selectedDatesContainer}>
          <Text style={styles.selectedDatesTitle}>Selected Range:</Text>
          <View style={styles.dateRangeChip}>
            <Text style={styles.dateRangeText}>
              From {formatSelectedDate(startDate)} to {formatSelectedDate(endDate)}
            </Text>
            <TouchableOpacity 
              onPress={clearDateRange}
              style={styles.removeRangeButton}
            >
              <Text style={styles.removeButtonText}>×</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    // For multiple days selection or when in multiple-days mode
    return (
      <View style={styles.selectedDatesContainer}>
        <Text style={styles.selectedDatesTitle}>Selected Dates:</Text>
        <View style={styles.selectedDatesList}>
          {selectedDatesList.map((date, index) => (
            <View key={`selected-date-${index}`} style={styles.selectedDateChip}>
              <Text style={styles.selectedDateChipText}>{formatSelectedDate(date)}</Text>
              <TouchableOpacity 
                onPress={() => toggleDateSelection(date)}
                style={styles.removeButton}
              >
                <Text style={styles.removeButtonText}>×</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderRecurringDropdownCalendar = () => {
    if (!showRecurringDropdownCalendar) return null;

    return (
      <View style={styles.dropdownCalendar}>
        <View style={styles.dropdownCalendarContent}>
          {renderCalendar()}
          <TouchableOpacity
            style={styles.dropdownCloseButton}
            onPress={() => {
              setShowRecurringDropdownCalendar(false);
              setTempRangeStart(null);
              setTempRangeEnd(null);
            }}
          >
            <Text style={styles.dropdownCloseButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderDateRangeSection = () => {
    return (
      <View style={styles.dateRangeSection}>
        <View style={styles.dateRangeRow}>
          <TouchableOpacity 
            style={styles.dateRangeColumn}
            onPress={() => setShowRecurringDropdownCalendar(true)}
          >
            <Text style={styles.dateRangeLabel}>From</Text>
            <Text style={styles.dateRangeValue}>
              {formatSelectedDate(recurringStartDate)}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.dateRangeColumn}
            onPress={() => setShowRecurringDropdownCalendar(true)}
          >
            <Text style={styles.dateRangeLabel}>To</Text>
            <Text style={styles.dateRangeValue}>
              {formatSelectedDate(recurringEndDate)}
            </Text>
          </TouchableOpacity>
        </View>
        {renderRecurringDropdownCalendar()}
      </View>
    );
  };

  const renderRecurringOptions = () => {
    if (selectedBookingType !== 'recurring') return null;

    return (
      <View style={styles.recurringOptionsContainer}>
        <Text style={styles.sectionTitle}>Repeat on</Text>
        <View style={styles.daysOfWeekContainer}>
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, index) => {
            // Adjust index to match JavaScript day of week (0=Sun, 1=Mon, etc.)
            const dayIndex = index === 6 ? 0 : index + 1;
            const isSelected = selectedDaysOfWeek.includes(dayIndex);
            
            return (
              <TouchableOpacity
                key={`day-${index}`}
                style={[
                  styles.dayOfWeekButton,
                  isSelected && styles.selectedDayOfWeekButton
                ]}
                onPress={() => handleDayOfWeekSelect(dayIndex)}
              >
                <Text style={[
                  styles.dayOfWeekText,
                  isSelected && styles.selectedDayOfWeekText
                ]}>{day}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {renderDateRangeSection()}

        <Text style={styles.sectionTitle}>Frequency</Text>
        <View style={styles.frequencyContainer}>
          <TouchableOpacity
            style={[
              styles.frequencyButton,
              selectedFrequency === 'weekly' && styles.selectedFrequencyButton
            ]}
            onPress={() => handleFrequencySelect('weekly')}
          >
            <Text style={[
              styles.frequencyText,
              selectedFrequency === 'weekly' && styles.selectedFrequencyText
            ]}>Weekly</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.frequencyButton,
              selectedFrequency === 'bi-weekly' && styles.selectedFrequencyButton
            ]}
            onPress={() => handleFrequencySelect('bi-weekly')}
          >
            <Text style={[
              styles.frequencyText,
              selectedFrequency === 'bi-weekly' && styles.selectedFrequencyText
            ]}>Bi-weekly</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.frequencyButton,
              selectedFrequency === 'monthly' && styles.selectedFrequencyButton
            ]}
            onPress={() => handleFrequencySelect('monthly')}
          >
            <Text style={[
              styles.frequencyText,
              selectedFrequency === 'monthly' && styles.selectedFrequencyText
            ]}>Monthly</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.recurrencePatternContainer}>
          <Text style={styles.recurrencePatternTitle}>Recurrence Pattern:</Text>
          <Text style={styles.recurrencePatternText}>
            {getSelectedDaysText()}
          </Text>
          <Text style={styles.recurrencePatternText}>
            From {formatSelectedDate(recurringStartDate)} to {formatSelectedDate(recurringEndDate)}
          </Text>
          <TouchableOpacity
            style={styles.previewButton}
            onPress={() => setShowRecurringPreview(true)}
          >
            <Text style={styles.previewButtonText}>View on Calendar</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderOneTimeOptions = () => {
    if (selectedBookingType !== 'one-time') return null;

    return (
      <>
        <View style={styles.dateRangeTypeContainer}>
          <TouchableOpacity
            style={[
              styles.dateRangeTypeButton,
              selectedDateRangeType === 'date-range' && styles.selectedDateRangeTypeButton
            ]}
            onPress={() => handleDateRangeTypeSelect('date-range')}
          >
            <Text style={[
              styles.dateRangeTypeText,
              selectedDateRangeType === 'date-range' && styles.selectedDateRangeTypeText
            ]}>Date Range</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.dateRangeTypeButton,
              selectedDateRangeType === 'multiple-days' && styles.selectedDateRangeTypeButton
            ]}
            onPress={() => handleDateRangeTypeSelect('multiple-days')}
          >
            <Text style={[
              styles.dateRangeTypeText,
              selectedDateRangeType === 'multiple-days' && styles.selectedDateRangeTypeText
            ]}>Multiple Days</Text>
          </TouchableOpacity>
        </View>

        {renderCalendar()}
      </>
    );
  };

  const RecurringCalendarPreview = () => {
    const [previewMonth, setPreviewMonth] = useState(new Date(recurringStartDate));
    
    const getRecurringDates = () => {
      if (!recurringStartDate || !recurringEndDate || selectedDaysOfWeek.length === 0) {
        return new Set();
      }

      const dates = new Set();
      const current = new Date(recurringStartDate);
      const end = new Date(recurringEndDate);
      
      while (current <= end) {
        if (selectedDaysOfWeek.includes(current.getDay())) {
          if (selectedFrequency === 'weekly') {
            dates.add(new Date(current).getTime());
          } else if (selectedFrequency === 'bi-weekly') {
            const weeks = Math.floor((current - recurringStartDate) / (7 * 24 * 60 * 60 * 1000));
            if (weeks % 2 === 0) {
              dates.add(new Date(current).getTime());
            }
          } else if (selectedFrequency === 'monthly') {
            const startWeek = getWeekOfMonth(recurringStartDate);
            const currentWeek = getWeekOfMonth(current);
            if (startWeek === currentWeek) {
              dates.add(new Date(current).getTime());
            }
          }
        }
        current.setDate(current.getDate() + 1);
      }
      return dates;
    };

    const goToPreviousMonth = () => {
      const prevMonth = new Date(previewMonth);
      prevMonth.setMonth(prevMonth.getMonth() - 1);
      setPreviewMonth(prevMonth);
    };

    const goToNextMonth = () => {
      const nextMonth = new Date(previewMonth);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      setPreviewMonth(nextMonth);
    };

    const renderPreviewCalendar = () => {
      const monthStart = new Date(previewMonth.getFullYear(), previewMonth.getMonth(), 1);
      const monthEnd = new Date(previewMonth.getFullYear(), previewMonth.getMonth() + 1, 0);
      const startDate = new Date(monthStart);
      const endDate = new Date(monthEnd);
      
      startDate.setDate(startDate.getDate() - startDate.getDay());
      endDate.setDate(endDate.getDate() + (6 - endDate.getDay()));
      
      const weeks = [];
      let days = [];
      let day = new Date(startDate);
      const recurringDates = getRecurringDates();
      
      while (day <= endDate) {
        for (let i = 0; i < 7; i++) {
          days.push(new Date(day));
          day.setDate(day.getDate() + 1);
        }
        weeks.push(days);
        days = [];
      }

      const monthName = previewMonth.toLocaleString('default', { month: 'long' });
      const year = previewMonth.getFullYear();

      return (
        <View style={styles.previewCalendarContainer}>
          <View style={styles.calendarHeader}>
            <TouchableOpacity onPress={goToPreviousMonth} style={styles.calendarNavButton}>
              <Text style={styles.calendarNavButtonText}>{'<'}</Text>
            </TouchableOpacity>
            <Text style={styles.calendarTitle}>{`${monthName} ${year}`}</Text>
            <TouchableOpacity onPress={goToNextMonth} style={styles.calendarNavButton}>
              <Text style={styles.calendarNavButtonText}>{'>'}</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.weekdaysContainer}>
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
              <Text key={`weekday-${index}`} style={styles.weekdayText}>{day}</Text>
            ))}
          </View>
          
          {weeks.map((week, weekIndex) => (
            <View key={`week-${weekIndex}`} style={styles.weekRow}>
              {week.map((date, dateIndex) => {
                const isCurrentMonth = date.getMonth() === previewMonth.getMonth();
                const isRecurring = recurringDates.has(date.getTime());
                
                return (
                  <View
                    key={`date-${weekIndex}-${dateIndex}`}
                    style={[
                      styles.previewDateCell,
                      !isCurrentMonth && styles.otherMonthDate,
                      isRecurring && styles.recurringDate,
                    ]}
                  >
                    <Text style={[
                      styles.dateText,
                      !isCurrentMonth && styles.otherMonthDateText,
                      isRecurring && styles.recurringDateText,
                    ]}>
                      {date.getDate()}
                    </Text>
                  </View>
                );
              })}
            </View>
          ))}
        </View>
      );
    };

    return (
      <Modal
        visible={showRecurringPreview}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowRecurringPreview(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.previewModalContent]}>
            <Text style={styles.modalTitle}>Recurring Dates Preview</Text>
            {renderPreviewCalendar()}
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowRecurringPreview(false)}
            >
              <Text style={styles.modalCloseButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  // Remove the useEffect for date validation since we're handling it directly in the handlers
  useEffect(() => {
    if (is_DEBUG) {
      console.log('MBA19ynkiy34b Component mounted with:', {
        selectedDates,
        bookingType,
        dateRangeType
      });
    }
  }, []);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.bookingTypeContainer}>
        <TouchableOpacity
          style={[
            styles.bookingTypeButton,
            selectedBookingType === 'one-time' && styles.selectedBookingTypeButton
          ]}
          onPress={() => handleBookingTypeSelect('one-time')}
        >
          <Text style={[
            styles.bookingTypeText,
            selectedBookingType === 'one-time' && styles.selectedBookingTypeText
          ]}>One-time</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.bookingTypeButton,
            selectedBookingType === 'recurring' && styles.selectedBookingTypeButton
          ]}
          onPress={() => handleBookingTypeSelect('recurring')}
        >
          <Text style={[
            styles.bookingTypeText,
            selectedBookingType === 'recurring' && styles.selectedBookingTypeText
          ]}>Recurring</Text>
        </TouchableOpacity>
      </View>

      {renderOneTimeOptions()}
      {renderRecurringOptions()}
      {selectedBookingType === 'one-time' && renderSelectedDates()}
      <RecurringCalendarPreview />
    </ScrollView>
  );
};

const { width, height } = Dimensions.get('window');
const maxCalendarHeight = height * 0.4;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: 12,
  },
  bookingTypeContainer: {
    flexDirection: 'row',
    marginBottom: 12,
    borderRadius: 8,
    overflow: 'hidden',
  },
  bookingTypeButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e8e8e8', // Light gray for inactive buttons
  },
  selectedBookingTypeButton: {
    backgroundColor: theme.colors.mainColors.main,
  },
  bookingTypeText: {
    fontSize: 16,
    fontFamily: theme.fonts.regular.fontFamily,
    color: theme.colors.text,
  },
  selectedBookingTypeText: {
    color: theme.colors.surface,
    fontWeight: '600',
  },
  dateRangeTypeContainer: {
    flexDirection: 'row',
    marginBottom: 12,
    borderRadius: 8,
    overflow: 'hidden',
  },
  dateRangeTypeButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e8e8e8', // Light gray for inactive buttons
  },
  selectedDateRangeTypeButton: {
    backgroundColor: theme.colors.mainColors.main,
  },
  dateRangeTypeText: {
    fontSize: 16,
    fontFamily: theme.fonts.regular.fontFamily,
    color: theme.colors.text,
  },
  selectedDateRangeTypeText: {
    color: theme.colors.surface,
    fontWeight: '600',
  },
  calendarContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    // borderWidth: 1,
    // borderColor: theme.colors.modernBorder,
    maxHeight: maxCalendarHeight,
    overflow: 'hidden',
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  calendarTitle: {
    fontSize: 16,
    fontFamily: theme.fonts.regular.fontFamily,
    fontWeight: '600',
    color: theme.colors.text,
  },
  calendarNavButton: {
    padding: 6,
  },
  calendarNavButtonText: {
    fontSize: 18,
    color: theme.colors.text,
  },
  weekdaysContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 4,
  },
  weekdayText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    color: theme.colors.text,
    opacity: 0.7,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 4,
  },
  dateCell: {
    flex: 1,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 4,
    padding: 2,
  },
  dateText: {
    fontSize: 14,
    color: theme.colors.text,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  otherMonthDate: {
    opacity: 0.3,
  },
  otherMonthDateText: {
    color: theme.colors.placeHolderText,
  },
  selectedDate: {
    backgroundColor: theme.colors.mainColors.main,
  },
  dateInRange: {
    backgroundColor: `${theme.colors.mainColors.main}80`, // 50% opacity
  },
  selectedDateText: {
    color: theme.colors.surface,
    fontWeight: '600',
  },
  selectedDatesContainer: {
    marginTop: 12,
  },
  selectedDatesTitle: {
    fontSize: 14,
    fontFamily: theme.fonts.regular.fontFamily,
    fontWeight: '600',
    marginBottom: 6,
    color: theme.colors.text,
  },
  selectedDatesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  selectedDateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.backgroundContrast,
    borderRadius: 16,
    paddingVertical: 6,
    paddingLeft: 10,
    paddingRight: 6,
    marginRight: 6,
    marginBottom: 6,
  },
  selectedDateChipText: {
    color: theme.colors.mainColors.main,
    fontFamily: theme.fonts.regular.fontFamily,
    fontSize: 12,
    marginRight: 2,
  },
  removeButton: {
    marginLeft: 4,
    padding: 2,
  },
  removeButtonText: {
    fontSize: 16,
    color: theme.colors.mainColors.main,
    fontWeight: 'bold',
  },
  dateRangeText: {
    fontSize: 14,
    color: theme.colors.text,
    fontFamily: theme.fonts.regular.fontFamily,
    marginBottom: 8,
  },
  recurringOptionsContainer: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: theme.fonts.regular.fontFamily,
    fontWeight: '600',
    marginBottom: 8,
    color: theme.colors.text,
  },
  daysOfWeekContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  dayOfWeekButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e8e8e8', // Light gray for inactive buttons
  },
  selectedDayOfWeekButton: {
    backgroundColor: theme.colors.mainColors.main,
  },
  dayOfWeekText: {
    fontSize: 14,
    color: theme.colors.text,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  selectedDayOfWeekText: {
    color: theme.colors.surface,
    fontWeight: '600',
  },
  dateRangeSection: {
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.modernBorder,
  },
  dateRangeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dateRangeColumn: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    padding: 8,
    borderRadius: 8,
    // borderWidth: 1,
    // borderColor: theme.colors.modernBorder,
  },
  dateRangeLabel: {
    fontSize: 14,
    color: theme.colors.text,
    opacity: 0.7,
    marginBottom: 4,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  dateRangeValue: {
    fontSize: 16,
    color: theme.colors.text,
    fontFamily: theme.fonts.regular.fontFamily,
    fontWeight: '600',
  },
  frequencyContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  frequencyButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e8e8e8', // Light gray for inactive buttons
    borderRadius: 8,
    marginRight: 8,
  },
  selectedFrequencyButton: {
    backgroundColor: theme.colors.mainColors.main,
  },
  frequencyText: {
    fontSize: 14,
    color: theme.colors.text,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  selectedFrequencyText: {
    color: theme.colors.surface,
    fontWeight: '600',
  },
  recurrencePatternContainer: {
    backgroundColor: theme.colors.backgroundContrast,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  recurrencePatternTitle: {
    fontSize: 14,
    fontFamily: theme.fonts.regular.fontFamily,
    fontWeight: '600',
    marginBottom: 4,
    color: theme.colors.text,
  },
  recurrencePatternText: {
    fontSize: 14,
    color: theme.colors.text,
    fontFamily: theme.fonts.regular.fontFamily,
    marginBottom: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 16,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: theme.fonts.regular.fontFamily,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
    color: theme.colors.text,
  },
  modalCloseButton: {
    marginTop: 16,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: theme.colors.backgroundContrast,
    borderRadius: 8,
  },
  modalCloseButtonText: {
    fontSize: 16,
    color: theme.colors.text,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  previewButton: {
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: theme.colors.mainColors.main,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  previewButtonText: {
    color: theme.colors.surface,
    fontSize: 14,
    fontFamily: theme.fonts.regular.fontFamily,
  },
  previewModalContent: {
    maxHeight: '80%',
  },
  previewCalendarContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
    padding: 12,
    marginVertical: 16,
  },
  recurringDate: {
    backgroundColor: theme.colors.mainColors.main,
  },
  recurringDateText: {
    color: theme.colors.surface,
    fontWeight: '600',
  },
  previewDateCell: {
    flex: 1,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 4,
    padding: 2,
  },
  dateRangeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.backgroundContrast,
    borderRadius: 16,
    paddingVertical: 8,
    paddingLeft: 12,
    paddingRight: 8,
  },
  removeRangeButton: {
    marginLeft: 8,
    padding: 4,
  },
  selectedDateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.backgroundContrast,
    borderRadius: 16,
    paddingVertical: 6,
    paddingLeft: 10,
    paddingRight: 6,
    marginRight: 6,
    marginBottom: 6,
  },
  removeButton: {
    marginLeft: 4,
    padding: 2,
  },
  removeButtonText: {
    fontSize: 16,
    color: theme.colors.mainColors.main,
    fontWeight: 'bold',
  },
});

export default DateSelectionCard; 