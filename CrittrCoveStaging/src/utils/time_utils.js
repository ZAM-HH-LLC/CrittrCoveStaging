import { format, parse } from 'date-fns';
import { formatInTimeZone, toZonedTime, fromZonedTime } from 'date-fns-tz';

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
 * Converts local time to UTC
 */
export const convertToUTC = (date, time, timezone) => {
    try {
        console.log('MBA134njo0vh03 Converting to UTC - Input:', { date, time, timezone });
        
        // Check if time is already in 24-hour format and convert if necessary
        let time24 = time;
        if (!/:/.test(time)) {
            time24 = convertTo24Hour(time);
        }
        console.log('MBA134njo0vh03 24-hour time:', time24);
        
        // Parse date and time
        const [year, month, day] = date.split('-').map(Number);
        const [hours, minutes] = time24.split(':').map(Number);
        
        // Create the date string in ISO format for the local time
        const localDateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;
        
        // Use formatInTimeZone to get the UTC time
        // We use 'UTC' as the target timezone to get the UTC equivalent
        const utcDateStr = formatInTimeZone(localDateStr, timezone, "yyyy-MM-dd'T'HH:mm:ssXXX", { timeZone: 'UTC' });
        const utcDate = new Date(utcDateStr);
        
        console.log('MBA134njo0vh03 Conversion details:', {
            input: {
                date,
                time,
                timezone,
                time24,
                localDateStr
            },
            conversion: {
                utcDateStr,
                utcDate: utcDate.toISOString()
            }
        });
        
        // Format UTC time using formatInTimeZone to ensure we get UTC time, not local time
        const utcTimeStr = formatInTimeZone(utcDate, 'UTC', 'HH:mm');
        const utcDateStr2 = formatInTimeZone(utcDate, 'UTC', 'yyyy-MM-dd');
        
        console.log('MBA134njo0vh03 Final UTC output:', {
            time: utcTimeStr,
            date: utcDateStr2,
            originalUTC: utcDate.toISOString()
        });
        
        return {
            time: utcTimeStr,
            date: utcDateStr2
        };
    } catch (error) {
        console.error('MBA134njo0vh03 Error in convertToUTC:', error);
        throw error;
    }
};

/**
 * Converts UTC date and time to local date and time
 */
export const convertDateTimeFromUTC = (date, time, timezone) => {
    try {
        console.log('MBA134njo0vh03 Converting UTC to local:', { date, time, timezone });
        // Parse UTC date and time
        const [year, month, day] = date.split('-').map(Number);
        const [hours, minutes] = time.split(':').map(Number);
        
        // Create UTC date object
        const utcDate = new Date(Date.UTC(year, month - 1, day, hours, minutes));
        
        // Convert UTC to zoned time
        const zonedDate = toZonedTime(utcDate, timezone);

        // Format local date and time
        const localDateStr = formatInTimeZone(zonedDate, timezone, 'yyyy-MM-dd');
        const localTimeStr = formatInTimeZone(zonedDate, timezone, 'HH:mm');

        console.log('MBA134njo0vh03 Date conversion details:', {
            original: {
                utc: `${date} ${time}`,
                utcDate: utcDate.toISOString()
            },
            conversion: {
                timezone,
                zonedDate: zonedDate.toString(),
                localDateFormatted: localDateStr,
                localTimeFormatted: localTimeStr
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

        // Create ISO date strings for the local times
        const startDateStr = `${startYear}-${String(startMonth).padStart(2, '0')}-${String(startDay).padStart(2, '0')}T${String(startHours).padStart(2, '0')}:${String(startMinutes).padStart(2, '0')}:00`;
        const endDateStr = `${endYear}-${String(endMonth).padStart(2, '0')}-${String(endDay).padStart(2, '0')}T${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}:00`;

        console.log('MBA134njo0vh032 Created date strings:', {
            startDateStr,
            endDateStr
        });

        // Create Date objects
        const startDateTime = new Date(startDateStr);
        const endDateTime = new Date(endDateStr);

        console.log('MBA134njo0vh032 Date objects:', {
            startDateTime: startDateTime.toString(),
            endDateTime: endDateTime.toString()
        });

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

        // Format the dates directly using formatInTimeZone
        const formatted_start = formatInTimeZone(startDateTime, timezone, "MMM dd, yyyy (h:mm a)");
        const formatted_end = formatInTimeZone(endDateTime, timezone, "MMM dd, yyyy (h:mm a)");

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