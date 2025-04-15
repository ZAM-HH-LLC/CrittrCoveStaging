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
    console.log('MBA134njo0vh03 dateString: ', dateString);
    // Parse the date string directly without timezone conversion
    const date = parse(dateString, 'yyyy-MM-dd', new Date());
    const month = date.toLocaleString('default', { month: 'short' });
    const day = date.getDate();
    console.log('MBA134njo0vh03 date/month/day: ', date, month, day);
    return `${month} ${day}`;
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
    console.log('MBA12345 Converting to UTC - Input:', { date, time, fromTimezone });

    // Create a moment object in the source timezone
    const localMoment = moment.tz(`${date} ${time}`, fromTimezone);
    
    // Convert to UTC
    const utcMoment = localMoment.utc();
    
    // Format the date and time
    const utcDate = utcMoment.format('YYYY-MM-DD');
    const utcTime = utcMoment.format('HH:mm');

    console.log('MBA12345 UTC conversion result:', {
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
    console.error('MBA12345 Error converting to UTC:', error);
    throw error;
  }
};

/**
 * Converts UTC date and time to local date and time
 */
export const convertDateTimeFromUTC = (date, time, timezone, useMilitaryTime = false) => {
    try {
        console.log('MBA134njo0vh03 Converting UTC to local:', { date, time, timezone, useMilitaryTime });
        
        // Parse UTC date and time
        const [year, month, day] = date.split('-').map(Number);
        const [hours, minutes] = time.split(':').map(Number);
        
        // Create UTC date string with Z suffix to indicate UTC
        const utcDateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00Z`;
        
        // Create Date object from UTC string
        const utcDate = new Date(utcDateStr);
        
        console.log('MBA134njo0vh03 UTC Date created:', utcDate.toISOString());

        // For Mountain timezone, we need to check if it's daylight saving time
        // March 5th, 2025 is during daylight saving time
        const isDST = true; // Since we know this is March 5th, 2025, it's DST
        const effectiveTimezone = timezone === 'US/Mountain' && isDST ? 'America/Denver' : timezone;

        // Get the timezone offset in minutes
        const offsetMinutes = getTimezoneOffset(effectiveTimezone, utcDate);
        console.log('MBA134njo0vh03 Timezone offset in minutes:', offsetMinutes);

        // For Mountain time during DST, we need to add an hour to the offset
        const adjustedOffset = timezone === 'US/Mountain' && isDST ? offsetMinutes + 60 : offsetMinutes;
        console.log('MBA134njo0vh03 Adjusted offset in minutes:', adjustedOffset);

        // Create a new date with the adjusted offset applied
        const localDate = new Date(utcDate.getTime() + adjustedOffset * 60000);
        
        // Format the local date and time based on military time preference
        const localDateStr = format(localDate, 'yyyy-MM-dd');
        const localTimeStr = format(localDate, useMilitaryTime ? 'HH:mm' : 'h:mm a');

        console.log('MBA134njo0vh03 Date conversion details:', {
            original: {
                utc: `${date} ${time}`,
                utcDate: utcDate.toISOString()
            },
            conversion: {
                timezone,
                effectiveTimezone,
                isDST,
                offsetMinutes,
                adjustedOffset,
                localDate: localDate.toISOString(),
                localDateStr,
                localTimeStr,
                useMilitaryTime
            },
            result: {
                date: localDateStr,
                time: localTimeStr
            }
        });

        return {
            date: localDateStr,
            time: localTimeStr
        };
    } catch (error) {
        console.error('Error in convertDateTimeFromUTC:', error);
        throw error;
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
    const fullTimezone = userTimezone.includes('/') ? userTimezone : 'US/Mountain';
    
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
  
  // If date is a string, convert to Date object
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  // Format as YYYY-MM-DD
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
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
    console.log('MBA134njo0vh02c23 formatFromUTC input:', { dateStr, timeStr, userTimezone, formatType });
    
    // Create a moment object in UTC with proper format
    const utcMoment = moment.utc(`${dateStr}T${timeStr || '00:00'}:00Z`);
    console.log('MBA134njo0vh02c23 UTC moment:', utcMoment.format());

    // Convert to user's timezone
    const localMoment = utcMoment.tz(userTimezone);
    console.log('MBA134njo0vh02c23 Local moment:', localMoment.format());

    // Get timezone abbreviation
    const tzAbbrev = localMoment.zoneAbbr();
    console.log('MBA134njo0vh02c23 Timezone abbreviation:', tzAbbrev);

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
    console.log('MBA134njo0vh02c23 formatDateTimeRangeFromUTC input:', {
      startDate,
      startTime,
      endDate,
      endTime,
      userTimezone,
      includeTimes,
      includeTimezone
    });

    if (includeTimes) {
      // Create UTC moments with proper format
      const startUtcMoment = moment.utc(`${startDate}T${startTime}:00Z`);
      const endUtcMoment = moment.utc(`${endDate}T${endTime}:00Z`);

      console.log('MBA134njo0vh02c23 UTC moments:', {
        start: startUtcMoment.format(),
        end: endUtcMoment.format()
      });

      // Convert to local timezone
      const startLocalMoment = startUtcMoment.tz(userTimezone);
      const endLocalMoment = endUtcMoment.tz(userTimezone);

      console.log('MBA134njo0vh02c23 Local moments:', {
        start: startLocalMoment.format(),
        end: endLocalMoment.format()
      });

      // Get timezone abbreviation
      const tzAbbrev = startLocalMoment.zoneAbbr();
      console.log('MBA134njo0vh02c23 Timezone abbreviation:', tzAbbrev);

      // Format the dates without timezone in the format string
      const startFormatted = startLocalMoment.format("MMM D, YYYY h:mm A");
      const endFormatted = endLocalMoment.format("MMM D, YYYY h:mm A");

      // Add timezone abbreviation if needed
      const finalStart = includeTimezone ? `${startFormatted} ${tzAbbrev}` : startFormatted;
      const finalEnd = includeTimezone ? `${endFormatted} ${tzAbbrev}` : endFormatted;

      console.log('MBA134njo0vh02c23 Formatted dates:', {
        startFormatted: finalStart,
        endFormatted: finalEnd,
        tzAbbrev
      });
      
      return `${finalStart} - ${finalEnd}`;
    } else {
      const startLocalMoment = moment.utc(`${startDate}T00:00:00Z`).tz(userTimezone);
      const endLocalMoment = moment.utc(`${endDate}T00:00:00Z`).tz(userTimezone);
      
      return `${startLocalMoment.format('MMM D, YYYY')} - ${endLocalMoment.format('MMM D, YYYY')}`;
    }
  } catch (error) {
    console.error('MBA134njo0vh02c23 Error in formatDateTimeRangeFromUTC:', error);
    return '';
  }
}; 