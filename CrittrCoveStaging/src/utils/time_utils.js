import { format, parse } from 'date-fns';
import { formatInTimeZone, toZonedTime, fromZonedTime, utcToZonedTime, getTimezoneOffset } from 'date-fns-tz';
import moment from 'moment-timezone';
import { debugLog } from '../context/AuthContext';
// import { format as formatDate } from 'date-fns';
import { parseISO } from 'date-fns';

/**
 * Formats a date string into "MMM d" format (e.g., "Mar 5")
 */
export const formatDate = (dateString) => {
    if (!dateString) return '';
    
    debugLog('MBA5677: Formatting date input', dateString);
    
    try {
        // First try to parse as ISO date
        const parsedDate = parseISO(dateString);
        
        // Check if the parsed date is valid
        if (!isNaN(parsedDate.getTime())) {
            const month = parsedDate.toLocaleString('default', { month: 'short' });
            const day = parsedDate.getDate();
            debugLog('MBA5677: Parsed as ISO date', { parsedDate, month, day });
            return `${month} ${day}`;
        }
        
        // Fallback to parse as YYYY-MM-DD format
        const date = parse(dateString, 'yyyy-MM-dd', new Date());
        
        // Check if the parsed date is valid
        if (!isNaN(date.getTime())) {
            const month = date.toLocaleString('default', { month: 'short' });
            const day = date.getDate();
            debugLog('MBA5677: Parsed with date-fns', { date, month, day });
            return `${month} ${day}`;
        }
        
        // If both parsing methods failed, try moment
        const momentDate = moment(dateString);
        if (momentDate.isValid()) {
            const formatted = momentDate.format('MMM D');
            debugLog('MBA5677: Parsed with moment', { momentDate, formatted });
            return formatted;
        }
        
        debugLog('MBA5677: Failed to parse date', dateString);
        return dateString; // Return original if all parsing fails
    } catch (error) {
        debugLog('MBA5677: Error formatting date', { dateString, error });
        return dateString; // Return original on error
    }
};

/**
 * Converts 12-hour time format to 24-hour format
 */
export const convertTo24Hour = (time12h) => {
    if (!time12h.includes(' ')) {
        return time12h;
    }

    const [time, modifier] = time12h.split(' ');
    let [hours, minutes] = time.split(':');
    hours = parseInt(hours, 10);
    
    if (modifier === 'PM' && hours < 12) {
        hours += 12;
    } else if (modifier === 'AM' && hours === 12) {
        hours = 0;
    }
    
    return `${hours.toString().padStart(2, '0')}:${minutes}`;
};

/**
 * Converts 24-hour time format to 12-hour format
 */
export const convertTo12Hour = (time24h) => {
    if (time24h.includes(' ')) {
        return time24h;
    }

    const [hours24, minutes] = time24h.split(':');
    const hours = parseInt(hours24, 10);
    
    let period = hours >= 12 ? 'PM' : 'AM';
    let hours12 = hours % 12;
    hours12 = hours12 === 0 ? 12 : hours12;
    
    return `${hours12}:${minutes} ${period}`;
};

/**
 * Converts a time from a specific timezone to UTC
 * @param {string} date - The date in YYYY-MM-DD format
 * @param {string} time - The time in HH:mm format (24-hour)
 * @param {string} fromTimezone - The source timezone (e.g., 'US/Mountain')
 * @returns {Object} Object containing the UTC date and time
 */
export const convertToUTC = (date, time, fromTimezone) => {
  try {
    debugLog('MBA12345: Converting to UTC - Input:', { date, time, fromTimezone });

    // Create a moment object in the source timezone
    const localMoment = moment.tz(`${date} ${time}`, fromTimezone);
    
    // Convert to UTC
    const utcMoment = localMoment.utc();
    
    // Format the date and time
    const utcDate = utcMoment.format('YYYY-MM-DD');
    const utcTime = utcMoment.format('HH:mm');

    debugLog('MBA12345: UTC conversion result:', {
      input: {
        date,
        time,
        fromTimezone
      },
      output: {
        utcDate,
        utcTime,
        originalMoment: localMoment.format(),
        utcMoment: utcMoment.format()
      }
    });
    
    return {
      date: utcDate,
      time: utcTime
    };
  } catch (error) {
    debugLog('MBA12345: Error converting to UTC:', error);
    return { date, time }; // Return original values as fallback
  }
};

/**
 * Converts UTC date and time to local date and time
 */
export const convertDateTimeFromUTC = (date, time, timezone, useMilitaryTime = false) => {
    try {
        debugLog('MBA5677: Converting UTC to local:', { date, time, timezone, useMilitaryTime });
        
        // Ensure we have valid inputs
        if (!date || !time) {
            debugLog('MBA5677: Invalid input for conversion', { date, time });
            return { date, time };
        }
        
        // Multiple parsing strategies for more robust date handling
        let utcDate = null;
        
        // Strategy 1: Try standard ISO format parsing
        try {
            // Handle different time formats
            let formattedTime = time;
            if (time.includes('.')) {
                formattedTime = time.split('.')[0]; // Remove milliseconds if present
            }
            
            // Create a proper ISO string
            const isoString = `${date}T${formattedTime}${formattedTime.includes('Z') ? '' : 'Z'}`;
            debugLog('MBA5677: Trying ISO string format', isoString);
            
            // Create Date object
            utcDate = new Date(isoString);
            
            // Check if valid
            if (isNaN(utcDate.getTime())) {
                debugLog('MBA5677: ISO format parsing failed');
                utcDate = null;
            } else {
                debugLog('MBA5677: ISO format parsing succeeded');
            }
        } catch (parseError) {
            debugLog('MBA5677: Error in ISO format parsing', parseError);
        }
        
        // Strategy 2: Try direct date-fns parsing
        if (!utcDate) {
            try {
                debugLog('MBA5677: Trying date-fns parsing');
                const dateStr = `${date} ${time}`;
                utcDate = moment.utc(dateStr).toDate();
                
                // Check if valid
                if (isNaN(utcDate.getTime())) {
                    debugLog('MBA5677: date-fns parsing failed');
                    utcDate = null;
                } else {
                    debugLog('MBA5677: date-fns parsing succeeded');
                }
            } catch (parseError) {
                debugLog('MBA5677: Error in date-fns parsing', parseError);
            }
        }
        
        // Strategy 3: Try manual parsing
        if (!utcDate) {
            try {
                debugLog('MBA5677: Trying manual parsing');
                // Split the date and time parts
                const [year, month, day] = date.split('-').map(Number);
                let hours = 0, minutes = 0;
                
                // Parse time
                if (time.includes(':')) {
                    const timeParts = time.split(':');
                    hours = parseInt(timeParts[0], 10);
                    minutes = parseInt(timeParts[1], 10);
                }
                
                // Create UTC date
                utcDate = new Date(Date.UTC(year, month - 1, day, hours, minutes));
                
                // Check if valid
                if (isNaN(utcDate.getTime())) {
                    debugLog('MBA5677: Manual parsing failed');
                    utcDate = null;
                } else {
                    debugLog('MBA5677: Manual parsing succeeded');
                }
            } catch (parseError) {
                debugLog('MBA5677: Error in manual parsing', parseError);
            }
        }
        
        // If all parsing strategies failed, return original values
        if (!utcDate) {
            debugLog('MBA5677: All parsing strategies failed, returning original');
            return { date, time };
        }
        
        debugLog('MBA5677: Valid UTC Date created:', utcDate.toISOString());
        
        // Convert to user's timezone using moment for reliability
        const utcMoment = moment.utc(utcDate);
        const localMoment = utcMoment.tz(timezone || 'UTC');
        
        // Format the local date and time
        const localDateStr = localMoment.format('YYYY-MM-DD');
        const localTimeStr = localMoment.format(useMilitaryTime ? 'HH:mm' : 'h:mm A');
        
        debugLog('MBA5677: Date conversion result:', {
            input: { date, time, timezone },
            utc: utcDate.toISOString(),
            utcMoment: utcMoment.format(),
            localMoment: localMoment.format(),
            output: { date: localDateStr, time: localTimeStr }
        });
        
        return {
            date: localDateStr,
            time: localTimeStr
        };
    } catch (error) {
        debugLog('MBA5677: Error in convertDateTimeFromUTC:', error, { date, time, timezone });
        return { date, time }; // Return original on error
    }
};

/**
 * Gets formatted times matching backend format
 */
export const getFormattedTimes = (startDate, startTime, endDate, endTime, timezone) => {
    try {
        console.log('MBA134njo0vh032 getFormattedTimes input:', {
            startDate,
            startTime,
            endDate,
            endTime,
            timezone
        });

        // Parse the date and time strings
        const [startYear, startMonth, startDay] = startDate.split('-').map(Number);
        const [startHours, startMinutes] = startTime.split(':').map(Number);
        const [endYear, endMonth, endDay] = endDate.split('-').map(Number);
        const [endHours, endMinutes] = endTime.split(':').map(Number);

        console.log('MBA134njo0vh032 Parsed components:', {
            start: {
                year: startYear,
                month: startMonth,
                day: startDay,
                hours: startHours,
                minutes: startMinutes
            },
            end: {
                year: endYear,
                month: endMonth,
                day: endDay,
                hours: endHours,
                minutes: endMinutes
            }
        });

        // Create ISO date strings for the local times in the specified timezone
        const startDateStr = `${startYear}-${String(startMonth).padStart(2, '0')}-${String(startDay).padStart(2, '0')}T${String(startHours).padStart(2, '0')}:${String(startMinutes).padStart(2, '0')}:00`;
        const endDateStr = `${endYear}-${String(endMonth).padStart(2, '0')}-${String(endDay).padStart(2, '0')}T${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}:00`;

        console.log('MBA134njo0vh032 Created date strings:', {
            startDateStr,
            endDateStr,
            timezone
        });

        // Format the dates directly using formatInTimeZone with the input timezone
        const formatted_start = formatInTimeZone(startDateStr, timezone, "MMM dd, yyyy (h:mm a)");
        const formatted_end = formatInTimeZone(endDateStr, timezone, "MMM dd, yyyy (h:mm a)");

        console.log('MBA134njo0vh032 Formatted dates:', {
            formatted_start,
            formatted_end
        });

        // Create Date objects for duration calculation
        const startDateTime = new Date(startDateStr);
        const endDateTime = new Date(endDateStr);

        // Calculate duration in milliseconds
        const durationMs = endDateTime - startDateTime;
        
        // Calculate days and remaining hours
        const days = Math.floor(durationMs / (24 * 60 * 60 * 1000));
        const remainingMs = durationMs % (24 * 60 * 60 * 1000);
        const hours = Math.floor(remainingMs / (60 * 60 * 1000));

        // Format duration string
        let durationStr = '';
        if (days > 0) {
            durationStr += `${days} day${days > 1 ? 's' : ''}`;
            if (hours > 0) {
                durationStr += `, ${hours} hour${hours > 1 ? 's' : ''}`;
            }
        } else if (hours > 0) {
            durationStr += `${hours} hour${hours > 1 ? 's' : ''}`;
        }

        console.log('MBA134njo0vh032 Final formatted output:', {
            formatted_start,
            formatted_end,
            duration: durationStr,
            timezone: timezone.split('/')[1] || timezone
        });

        return {
            formatted_start,
            formatted_end,
            duration: durationStr || '0 hours',
            timezone: timezone.split('/')[1] || timezone
        };
    } catch (error) {
        console.error('Error in getFormattedTimes:', error);
        throw error;
    }
};

/**
 * Check if times cross DST boundary
 */
export const checkDSTChange = (startDate, startTime, endDate, endTime, timezone) => {
    try {
        // Parse dates and times
        const [startYear, startMonth, startDay] = startDate.split('-').map(Number);
        const [startHours, startMinutes] = convertTo24Hour(startTime).split(':').map(Number);
        const [endYear, endMonth, endDay] = endDate.split('-').map(Number);
        const [endHours, endMinutes] = convertTo24Hour(endTime).split(':').map(Number);

        // Create local dates and convert to zoned time
        const startLocalDate = new Date(startYear, startMonth - 1, startDay, startHours, startMinutes);
        const endLocalDate = new Date(endYear, endMonth - 1, endDay, endHours, endMinutes);
        
        const startZonedDate = fromZonedTime(toZonedTime(startLocalDate, timezone));
        const endZonedDate = fromZonedTime(toZonedTime(endLocalDate, timezone));

        // Convert back to local and check if offsets are different
        const startLocal = toZonedTime(startZonedDate, timezone);
        const endLocal = toZonedTime(endZonedDate, timezone);
        
        return startLocal.getTimezoneOffset() !== endLocal.getTimezoneOffset();
    } catch (error) {
        console.error('Error in checkDSTChange:', error);
        throw error;
    }
};

/**
 * Formats an occurrence from UTC times to local times with proper formatting
 */
export const formatOccurrenceFromUTC = (occurrence, userTimezone) => {
  try {
    // Always use full timezone name for conversions
    // If userTimezone doesn't include '/', assume it's an abbreviation and default to US/Mountain
    // In practice, userTimezone should come from timeSettings.timezone which is a full timezone identifier
    const fullTimezone = userTimezone && userTimezone.includes('/') ? userTimezone : 'US/Mountain';
    
    console.log('MBA134njo0vh03 Formatting occurrence from UTC:', {
      occurrence,
      userTimezone,
      fullTimezone
    });

    // Convert UTC times to local
    const localStart = convertDateTimeFromUTC(
      occurrence.start_date,
      occurrence.start_time,
      fullTimezone
    );

    const localEnd = convertDateTimeFromUTC(
      occurrence.end_date,
      occurrence.end_time,
      fullTimezone
    );

    console.log('MBA134njo0vh03 Local start:', localStart);
    console.log('MBA134njo0vh03 Local end:', localEnd);
    console.log('MBA134njo0vh03 Full timezone:', fullTimezone);

    // Get formatted times
    const formattedTimes = getFormattedTimes(
      localStart.date,
      localStart.time,
      localEnd.date,
      localEnd.time,
      fullTimezone
    );

    console.log('MBA134njo0vh03 Formatted times from getFormattedTimes:', formattedTimes);

    // Check for DST change
    const hasDSTChange = checkDSTChange(
      localStart.date,
      localStart.time,
      localEnd.date,
      localEnd.time,
      fullTimezone
    );

    // Use the provided timezone abbreviation directly
    const tzAbbrev = userTimezone.includes('/') ? userTimezone.split('/')[1] : userTimezone;

    return {
      ...occurrence,
      formatted_start: formattedTimes.formatted_start,
      formatted_end: formattedTimes.formatted_end,
      duration: formattedTimes.duration,
      timezone: tzAbbrev,
      dst_message: hasDSTChange ? 
        "Elapsed time may be different than expected due to Daylight Savings Time." : 
        ""
    };
  } catch (error) {
    console.error('Error in formatOccurrenceFromUTC:', error);
    return {
      ...occurrence,
      formatted_start: occurrence.start_date,
      formatted_end: occurrence.end_date,
      duration: 'Unknown',
      timezone: userTimezone.includes('/') ? userTimezone.split('/')[1] : userTimezone,
      dst_message: ''
    };
  }
};

/**
 * Formats a date for API calls (YYYY-MM-DD)
 * @param {Date|string} date - The date to format
 * @returns {string} Formatted date string
 */
export const formatDateForAPI = (date) => {
  if (!date) return null;
  
  debugLog('MBA12345 formatDateForAPI input:', date, typeof date);
  
  let dateObj;
  
  try {
    // If date is already a string in YYYY-MM-DD format, return as is
    if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      debugLog('MBA12345 formatDateForAPI: already in YYYY-MM-DD format:', date);
      return date;
    }
    
    // If date is an object with date, startTime, and endTime properties, it's a date item
    if (typeof date === 'object' && date.date && date.startTime && date.endTime) {
      debugLog('MBA12345 formatDateForAPI: extracting date from date item:', date.date);
      return date.date;
    }
    
    // If date is a Date object
    if (date instanceof Date) {
      dateObj = date;
      debugLog('MBA12345 formatDateForAPI: using Date object');
    } else {
      // Otherwise, try to create a Date from whatever was passed in
      dateObj = new Date(date);
      debugLog('MBA12345 formatDateForAPI: created Date from input:', dateObj);
    }
    
    // Check if the date is valid
    if (isNaN(dateObj.getTime())) {
      debugLog('MBA12345 formatDateForAPI: invalid date:', date);
      throw new Error('Invalid date format');
    }
    
    // Format as YYYY-MM-DD
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    
    const formattedDate = `${year}-${month}-${day}`;
    debugLog('MBA12345 formatDateForAPI result:', formattedDate);
    return formattedDate;
  } catch (error) {
    debugLog('MBA12345 formatDateForAPI error:', error, 'for input:', date);
    throw error;
  }
};

/**
 * Formats a time for API calls (HH:mm)
 * @param {Object|string} time - The time to format (object with hours/minutes or string)
 * @returns {string} Formatted time string in 24-hour format
 */
export const formatTimeForAPI = (time) => {
  if (!time) {
    debugLog('MBA12345 formatTimeForAPI received null/undefined time:', time);
    return null;
  }
  
  debugLog('MBA12345 formatTimeForAPI input:', time);
  
  let hours, minutes;
  
  if (typeof time === 'object' && time.hours !== undefined) {
    // Handle time object format
    hours = time.hours;
    minutes = time.minutes;
    debugLog('MBA12345 formatTimeForAPI processing time object:', { hours, minutes });
  } else if (typeof time === 'string') {
    // Handle string format (assuming HH:mm format)
    [hours, minutes] = time.split(':').map(Number);
    debugLog('MBA12345 formatTimeForAPI processing time string:', { hours, minutes });
  } else {
    debugLog('MBA12345 formatTimeForAPI invalid time format:', typeof time);
    throw new Error('Invalid time format');
  }
  
  // Ensure hours and minutes are valid
  hours = parseInt(hours);
  minutes = parseInt(minutes);
  
  if (isNaN(hours) || isNaN(minutes)) {
    debugLog('MBA12345 formatTimeForAPI invalid time values:', { hours, minutes });
    throw new Error('Invalid time values');
  }
  
  // Format as HH:mm
  const result = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  debugLog('MBA12345 formatTimeForAPI result:', result);
  return result;
};

// Format types for consistent date/time formatting across the app
export const FORMAT_TYPES = {
  SHORT_DATE: 'SHORT_DATE',           // Mar 4
  MEDIUM_DATE: 'MEDIUM_DATE',         // Mar 4, 2025
  LONG_DATE: 'LONG_DATE',            // March 4, 2025
  TIME_ONLY: 'TIME_ONLY',            // 4:42 PM
  TIME_ONLY_24H: 'TIME_ONLY_24H',    // 16:42
  DATE_TIME: 'DATE_TIME',            // Mar 4, 2025 at 4:42 PM
  DATE_TIME_WITH_TZ: 'DATE_TIME_WITH_TZ', // Mar 4, 2025 at 4:42 PM MDT
  DATE_RANGE: 'DATE_RANGE',          // Mar 4 - Mar 5
  DATE_TIME_RANGE: 'DATE_TIME_RANGE' // Mar 4, 2025 at 4:42 PM - Mar 5, 2025 at 5:00 PM MDT
};

/**
 * Converts UTC date and time strings to user's timezone and formats according to specified type
 * @param {string} dateStr - Date in YYYY-MM-DD format
 * @param {string} timeStr - Time in HH:mm format (24-hour)
 * @param {string} userTimezone - User's timezone (e.g., 'America/Denver')
 * @param {string} formatType - One of FORMAT_TYPES
 * @returns {string} Formatted date/time string
 */
export const formatFromUTC = (dateStr, timeStr = null, userTimezone, formatType = FORMAT_TYPES.MEDIUM_DATE) => {
  try {
    
    // Validate inputs
    if (!dateStr) {
      console.error('MBA134njo0vh02c23 Error in formatFromUTC: dateStr is required');
      return '';
    }
    
    // Use default timezone if userTimezone is null/undefined
    const targetTimezone = userTimezone || 'US/Mountain';
    
    // Create a moment object in UTC with proper format
    const utcMoment = moment.utc(`${dateStr}T${timeStr || '00:00'}:00Z`);
    
    // Validate the UTC moment
    if (!utcMoment.isValid()) {
      console.error('MBA134njo0vh02c23 Error in formatFromUTC: Invalid UTC moment created');
      return '';
    }

    // Convert to user's timezone
    const localMoment = utcMoment.tz(targetTimezone);
    
    // Validate the local moment
    if (!localMoment.isValid()) {
      console.error('MBA134njo0vh02c23 Error in formatFromUTC: Invalid local moment created');
      return '';
    }

    // Get timezone abbreviation
    const tzAbbrev = localMoment.zoneAbbr();

    // Format based on type
    switch (formatType) {
      case FORMAT_TYPES.SHORT_DATE:
        return localMoment.format('MMM D');
      case FORMAT_TYPES.MEDIUM_DATE:
        return localMoment.format('MMM D, YYYY');
      case FORMAT_TYPES.LONG_DATE:
        return localMoment.format('MMMM D, YYYY');
      case FORMAT_TYPES.TIME_ONLY:
        return localMoment.format('h:mm A');
      case FORMAT_TYPES.TIME_ONLY_24H:
        return localMoment.format('HH:mm');
      case FORMAT_TYPES.DATE_TIME:
        return localMoment.format("MMM D, YYYY 'at' h:mm A");
      case FORMAT_TYPES.DATE_TIME_WITH_TZ:
        return `${localMoment.format("MMM D, YYYY 'at' h:mm A")} ${tzAbbrev}`;
      default:
        return localMoment.format('MMM D, YYYY');
    }
  } catch (error) {
    console.error('MBA134njo0vh02c23 Error in formatFromUTC:', error);
    return '';
  }
};

/**
 * Formats a date/time range from UTC to user's timezone
 * @param {Object} params - Range parameters
 * @param {string} params.startDate - Start date in YYYY-MM-DD format
 * @param {string} params.startTime - Start time in HH:mm format
 * @param {string} params.endDate - End date in YYYY-MM-DD format
 * @param {string} params.endTime - End time in HH:mm format
 * @param {string} params.userTimezone - User's timezone
 * @param {boolean} params.includeTimes - Whether to include times in the output
 * @param {boolean} params.includeTimezone - Whether to include timezone in the output
 * @returns {string} Formatted date/time range
 */
export const formatDateTimeRangeFromUTC = ({
  startDate,
  startTime,
  endDate,
  endTime,
  userTimezone,
  includeTimes = true,
  includeTimezone = true
}) => {
  try {

    if (includeTimes) {
      // Create UTC moments with proper format
      const startUtcMoment = moment.utc(`${startDate}T${startTime}:00Z`);
      const endUtcMoment = moment.utc(`${endDate}T${endTime}:00Z`);

      // Convert to local timezone
      const startLocalMoment = startUtcMoment.tz(userTimezone);
      const endLocalMoment = endUtcMoment.tz(userTimezone);

      // Get timezone abbreviation
      const tzAbbrev = startLocalMoment.zoneAbbr();

      // Format the dates without timezone in the format string
      const startFormatted = startLocalMoment.format("MMM D, YYYY h:mm A");
      const endFormatted = endLocalMoment.format("MMM D, YYYY h:mm A");

      // Add timezone abbreviation if needed
      const finalStart = includeTimezone ? `${startFormatted} ${tzAbbrev}` : startFormatted;
      const finalEnd = includeTimezone ? `${endFormatted} ${tzAbbrev}` : endFormatted;
      
      return `${finalStart} - ${finalEnd}`;
    } else {
      const startLocalMoment = moment.utc(`${startDate}T00:00:00Z`).tz(userTimezone);
      const endLocalMoment = moment.utc(`${endDate}T00:00:00Z`).tz(userTimezone);
      
      return `${startLocalMoment.format('MMM D, YYYY')} - ${endLocalMoment.format('MMM D, YYYY')}`;
    }
  } catch (error) {
    debugLog('MBA134njo: Error in formatDateTimeRangeFromUTC:', error);
    return '';
  }
};

/**
 * Converts a time string from UTC to local timezone, handling date boundary changes
 * @param {string} dateStr - Date in "YYYY-MM-DD" format 
 * @param {string} timeStr - Time in "HH:MM" format (24-hour)
 * @param {string} timezone - User's timezone
 * @returns {Object} Object with time (hours/minutes) and adjusted date if it changed
 */
function convertTimeFromUTC(dateStr, timeStr, timezone = 'US/Mountain') {
  try {
    // Use provided timezone or default to US/Mountain
    // In practice, timezone should come from timeSettings.timezone from AuthContext
    const targetTimezone = timezone || 'US/Mountain';
    
    // Create a full UTC datetime string
    const utcDate = `${dateStr}T${timeStr}:00Z`;
    
    // Convert to local timezone using moment-timezone
    const utcMoment = moment.utc(utcDate);
    const localMoment = utcMoment.tz(targetTimezone);
    
    // Extract hours and minutes with safety checks
    const hours = localMoment.hours();
    const minutes = localMoment.minutes();
    
    // Ensure we have valid numbers
    if (isNaN(hours) || isNaN(minutes)) {
      debugLog('MBA2j3kbr9hve4: Invalid hours or minutes from moment conversion:', { hours, minutes });
      throw new Error('Invalid time values from moment conversion');
    }
    
    // Check if the date changed during conversion
    const localDateStr = localMoment.format('YYYY-MM-DD');
    const dateChanged = localDateStr !== dateStr;
    
    debugLog('MBA2j3kbr9hve4: Time conversion details:', {
      utc: {
        date: dateStr,
        time: timeStr,
        fullDateTime: utcDate
      },
      local: {
        date: localDateStr,
        time: `${hours}:${minutes}`,
        fullDateTime: localMoment.format(),
        dateChanged
      },
      timezone: targetTimezone
    });
    
    return {
      hours,
      minutes,
      adjustedDate: dateChanged ? localDateStr : null
    };
  } catch (error) {
    debugLog('MBA2j3kbr9hve4: Error converting time from UTC:', error);
    
    // Return the UTC time parsed directly as fallback
    try {
      const [hours, minutes] = timeStr.split(':').map(Number);
      return {
        hours: isNaN(hours) ? 0 : hours,
        minutes: isNaN(minutes) ? 0 : minutes,
        adjustedDate: null
      };
    } catch (parseError) {
      debugLog('MBA2j3kbr9hve4: Error parsing fallback time:', parseError);
      // Final fallback - return default times
      return {
        hours: 9,
        minutes: 0,
        adjustedDate: null
      };
    }
  }
}

/**
 * Parses occurrences from the backend API into the format expected by DateSelectionCard and TimeSelectionCard
 * @param {Array} occurrences - Array of occurrence objects from the API
 * @param {string} userTimezone - User's timezone (from timeSettings.timezone), defaults to US/Mountain
 * @returns {Object} Object containing formatted dates and times
 */
export const parseOccurrencesForBookingSteps = (occurrences, userTimezone = 'US/Mountain') => {
  debugLog('MBA2j3kbr9hve4: Parsing occurrences for booking steps:', occurrences);
  
  if (!occurrences || !Array.isArray(occurrences) || occurrences.length === 0) {
    debugLog('MBA2j3kbr9hve4: No occurrences to parse');
    return {
      dates: [],
      dateRange: null,
      individualTimes: {},
      defaultTimes: { startTime: { hours: 9, minutes: 0 }, endTime: { hours: 17, minutes: 0 } }
    };
  }
  
  // 1. Extract all unique dates and create Date objects
  const uniqueDates = new Set();
  const individualTimes = {};
  
  // Sort occurrences by date to ensure we get the correct start/end for date range
  const sortedOccurrences = [...occurrences].sort((a, b) => {
    return new Date(a.start_date) - new Date(b.start_date);
  });
  
  debugLog('MBA2j3kbr9hve4: Sorted occurrences:', sortedOccurrences);
  
  // Use provided timezone or default to US/Mountain
  // In practice, userTimezone should come from timeSettings.timezone from AuthContext
  const targetTimezone = userTimezone || 'US/Mountain';
  
  // Process each occurrence
  sortedOccurrences.forEach(occurrence => {
    const { start_date, end_date, start_time, end_time } = occurrence;
    
    if (!start_date || !start_time || !end_time) {
      debugLog('MBA2j3kbr9hve4: Invalid occurrence data, missing required fields:', occurrence);
      return;
    }
    
    // Convert UTC times to local timezone, accounting for date boundary changes
    const localStartTime = convertTimeFromUTC(start_date, start_time, targetTimezone);
    const localEndTime = convertTimeFromUTC(end_date || start_date, end_time, targetTimezone);
    
    // Determine the actual local date to use, accounting for timezone adjustments
    const actualStartDate = localStartTime.adjustedDate || start_date;
    const actualEndDate = localEndTime.adjustedDate || (end_date || start_date);
    
    debugLog('MBA2j3kbr9hve4: Converted times with date adjustments:', {
      utc: { 
        startDate: start_date, 
        startTime: start_time,
        endDate: end_date || start_date,
        endTime: end_time
      },
      local: { 
        startDate: actualStartDate,
        startTime: localStartTime,
        endDate: actualEndDate,
        endTime: localEndTime
      }
    });
    
    // Add the adjusted dates to uniqueDates set
    uniqueDates.add(actualStartDate);
    
    // If end date is different and not the same as start date, add it too
    if (actualEndDate !== actualStartDate) {
      uniqueDates.add(actualEndDate);
    }
    
    // Validate converted times before creating time objects
    if (localStartTime.hours === undefined || localStartTime.minutes === undefined ||
        localEndTime.hours === undefined || localEndTime.minutes === undefined) {
      debugLog('MBA2j3kbr9hve4: Invalid time conversion result, skipping occurrence:', {
        localStartTime,
        localEndTime,
        occurrence
      });
      return; // Skip this occurrence
    }
    
    // Create time objects for the TimeSelectionCard using the actual local date as key
    individualTimes[actualStartDate] = {
      startTime: {
        hours: localStartTime.hours,
        minutes: localStartTime.minutes
      },
      endTime: {
        hours: localEndTime.hours,
        minutes: localEndTime.minutes
      },
      isOvernightForced: actualStartDate !== actualEndDate
    };
  });
  
  // 2. Create the dates array from the set of unique dates
  const dates = Array.from(uniqueDates).map(dateStr => {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  });
  
  // Log the parsed dates to ensure they're correct
  debugLog('MBA2j3kbr9hve4: Parsed dates after timezone adjustment:', dates.map(d => d.toISOString().split('T')[0]));
  
  // 3. Create the date range
  let dateRange = null;
  if (dates.length > 0) {
    // Sort dates to ensure correct order
    const sortedDates = [...dates].sort((a, b) => a - b);
    
    // Create a proper date range with JavaScript Date objects
    dateRange = {
      startDate: sortedDates[0],
      endDate: sortedDates[sortedDates.length - 1]
    };
    
    debugLog('MBA2j3kbr9hve4: Created date range after timezone adjustment:', {
      startDate: dateRange.startDate.toISOString().split('T')[0],
      endDate: dateRange.endDate.toISOString().split('T')[0]
    });
  }
  
  // 4. Get default times from the first occurrence if available
  let defaultTimes = {
    startTime: { hours: 9, minutes: 0 }, // Default fallback
    endTime: { hours: 17, minutes: 0 }    // Default fallback
  };
  
  if (Object.keys(individualTimes).length > 0) {
    // Use the first converted time as the default
    const firstDateKey = Object.keys(individualTimes)[0];
    const firstTime = individualTimes[firstDateKey];
    
    // Validate the first time object before using it as default
    if (firstTime && firstTime.startTime && firstTime.endTime &&
        typeof firstTime.startTime.hours === 'number' && typeof firstTime.startTime.minutes === 'number' &&
        typeof firstTime.endTime.hours === 'number' && typeof firstTime.endTime.minutes === 'number') {
      defaultTimes = {
        startTime: firstTime.startTime,
        endTime: firstTime.endTime
      };
    } else {
      debugLog('MBA2j3kbr9hve4: Invalid first time object, using fallback defaults:', firstTime);
    }
  }
  
  const result = {
    dates,
    dateRange,
    individualTimes,
    defaultTimes,
    allTimesAreTheSame: Object.keys(individualTimes).length <= 1 || 
      Object.values(individualTimes).every(timeObj => 
        timeObj.startTime.hours === defaultTimes.startTime.hours &&
        timeObj.startTime.minutes === defaultTimes.startTime.minutes &&
        timeObj.endTime.hours === defaultTimes.endTime.hours &&
        timeObj.endTime.minutes === defaultTimes.endTime.minutes
      )
  };
  
  debugLog('MBA2j3kbr9hve4: Parsed result with timezone adjustments:', result);
  return result;
}; 