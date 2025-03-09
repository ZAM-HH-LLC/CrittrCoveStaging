import { format, parse, parseISO } from 'date-fns';

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
        
        // Convert time to 24-hour format if needed
        const time24 = convertTo24Hour(time);
        console.log('MBA134njo0vh03 24-hour time:', time24);
        
        // Parse date and time
        const [year, month, day] = date.split('-').map(Number);
        const [hours, minutes] = time24.split(':').map(Number);
        
        // Create local date object
        const localDate = new Date(year, month - 1, day, hours, minutes);
        console.log('MBA134njo0vh03 Local date object:', localDate.toLocaleString());
        
        // Get UTC hours and minutes
        const utcHours = localDate.getUTCHours();
        const utcMinutes = localDate.getUTCMinutes();
        const utcDate = localDate.getUTCDate();
        const utcMonth = localDate.getUTCMonth() + 1;
        const utcYear = localDate.getUTCFullYear();
        
        // Format UTC time
        const utcTimeStr = `${utcHours.toString().padStart(2, '0')}:${utcMinutes.toString().padStart(2, '0')}`;
        const utcDateStr = `${utcYear}-${utcMonth.toString().padStart(2, '0')}-${utcDate.toString().padStart(2, '0')}`;
        
        console.log('MBA134njo0vh03 Converted to UTC:', {
            localDateTime: `${date} ${time24}`,
            utcDateTime: `${utcDateStr} ${utcTimeStr}`
        });
        
        return {
            time: utcTimeStr,
            date: utcDateStr
        };
    } catch (error) {
        console.error('MBA134njo0vh03 Error in convertToUTC:', error);
        throw error;
    }
};

/**
 * Converts UTC time to local timezone
 */
export const convertFromUTC = (date, utcTime, timezone) => {
    try {
        // Parse UTC time
        const [utcHours, utcMinutes] = utcTime.split(':').map(Number);
        const [year, month, day] = date.split('-').map(Number);
        
        // Create Date object with UTC time
        const utcDate = new Date(Date.UTC(year, month - 1, day, utcHours, utcMinutes));
        
        // Get local hours and minutes
        const localHours = utcDate.getHours();
        const localMinutes = utcDate.getMinutes();
        
        // Format local time
        return `${localHours.toString().padStart(2, '0')}:${localMinutes.toString().padStart(2, '0')}`;
    } catch (error) {
        console.error('Error in convertFromUTC:', error);
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
        
        // Get the timezone offset in hours
        const localDate = new Date(utcDate);
        const offsetHours = localDate.getTimezoneOffset() / 60;

        // Check if we need to adjust the date
        // If UTC time - offset hours is negative, we need to go back a day
        const localHours = hours - offsetHours;
        const dateAdjustment = localHours < 0 ? -1 : 0;

        // Create new date with adjustment
        const adjustedDate = new Date(Date.UTC(year, month - 1, day + dateAdjustment, hours, minutes));
        const finalLocalDate = new Date(adjustedDate);

        console.log('MBA134njo0vh03 Date conversion details:', {
            original: {
                utc: `${date} ${time}`,
                utcDate: utcDate.toISOString()
            },
            conversion: {
                offsetHours,
                localHours,
                dateAdjustment
            },
            result: {
                date: finalLocalDate.toISOString().split('T')[0],
                time: `${finalLocalDate.getHours().toString().padStart(2, '0')}:${finalLocalDate.getMinutes().toString().padStart(2, '0')}`
            }
        });

        // Format the date and time
        const localDateStr = finalLocalDate.toISOString().split('T')[0];
        const localTimeStr = `${finalLocalDate.getHours().toString().padStart(2, '0')}:${finalLocalDate.getMinutes().toString().padStart(2, '0')}`;

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
        // Parse the date and time strings
        const [startYear, startMonth, startDay] = startDate.split('-').map(Number);
        const [startHours, startMinutes] = startTime.split(':').map(Number);
        const [endYear, endMonth, endDay] = endDate.split('-').map(Number);
        const [endHours, endMinutes] = endTime.split(':').map(Number);

        // Create Date objects with the local times
        const userTz = timezone ? timezone : 'UTC';
        const tzOffset = new Date().getTimezoneOffset();

        // Create start date in user's timezone
        const startDateTime = new Date(startYear, startMonth - 1, startDay, startHours, startMinutes);
        const startOffset = startDateTime.getTimezoneOffset();
        if (startOffset !== tzOffset) {
            // Adjust for DST if needed
            startDateTime.setMinutes(startDateTime.getMinutes() + (tzOffset - startOffset));
        }

        // Create end date in user's timezone
        const endDateTime = new Date(endYear, endMonth - 1, endDay, endHours, endMinutes);
        const endOffset = endDateTime.getTimezoneOffset();
        if (endOffset !== tzOffset) {
            // Adjust for DST if needed
            endDateTime.setMinutes(endDateTime.getMinutes() + (tzOffset - endOffset));
        }

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

        // Get timezone abbreviation
        const tzAbbrev = timezone.split('/')[1] || timezone;

        // Format the dates with DST-aware time
        const formatDateTime = (date) => {
            const month = date.toLocaleString('en-US', { month: 'short' });
            const day = date.getDate().toString().padStart(2, '0');
            const year = date.getFullYear();
            const hours = date.getHours() % 12 || 12;
            const minutes = date.getMinutes().toString().padStart(2, '0');
            const period = date.getHours() >= 12 ? 'PM' : 'AM';
            return `${month} ${day}, ${year} (${hours}:${minutes} ${period})`;
        };

        return {
            formatted_start: formatDateTime(startDateTime),
            formatted_end: formatDateTime(endDateTime),
            duration: durationStr || '0 hours',
            timezone: tzAbbrev
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
        const startDateTime = new Date(startYear, startMonth - 1, startDay, startHours, startMinutes);
        
        const [endYear, endMonth, endDay] = endDate.split('-').map(Number);
        const [endHours, endMinutes] = convertTo24Hour(endTime).split(':').map(Number);
        const endDateTime = new Date(endYear, endMonth - 1, endDay, endHours, endMinutes);
        
        return startDateTime.getTimezoneOffset() !== endDateTime.getTimezoneOffset();
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
    // Convert UTC times to local
    const localStart = convertDateTimeFromUTC(
      occurrence.start_date,
      occurrence.start_time,
      userTimezone
    );

    const localEnd = convertDateTimeFromUTC(
      occurrence.end_date,
      occurrence.end_time,
      userTimezone
    );

    // Get formatted times
    const formattedTimes = getFormattedTimes(
      localStart.date,
      localStart.time,
      localEnd.date,
      localEnd.time,
      userTimezone
    );

    // Check for DST change
    const hasDSTChange = checkDSTChange(
      localStart.date,
      localStart.time,
      localEnd.date,
      localEnd.time,
      userTimezone
    );

    return {
      ...occurrence,
      formatted_start: formattedTimes.formatted_start,
      formatted_end: formattedTimes.formatted_end,
      duration: formattedTimes.duration,
      timezone: formattedTimes.timezone,
      dst_message: hasDSTChange ? 
        "Elapsed time may be different than expected due to Daylight Savings Time." : 
        ""
    };
  } catch (error) {
    console.error('Error in formatOccurrenceFromUTC:', error);
    return {
      ...occurrence,
      formatted_start: occurrence.start_date,  // Use raw dates instead of error message
      formatted_end: occurrence.end_date,      // Use raw dates instead of error message
      duration: 'Unknown',
      timezone: userTimezone,
      dst_message: ''
    };
  }
}; 