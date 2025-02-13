/**
 * Validates that the end date/time is not before the start date/time
 * @param {string} startDate - Start date in ISO format
 * @param {string} endDate - End date in ISO format (optional)
 * @param {string} startTime - Start time in HH:mm format
 * @param {string} endTime - End time in HH:mm format
 * @returns {Object} - { isValid: boolean, error: string | null }
 */
export const validateDateTimeRange = (startDate, endDate, startTime, endTime) => {
  // Convert dates and times to comparable format
  const [startHour, startMinute] = startTime.split(':').map(Number);
  const [endHour, endMinute] = endTime.split(':').map(Number);
  
  const startDateTime = new Date(startDate);
  startDateTime.setHours(startHour, startMinute, 0);
  
  let endDateTime;
  if (endDate) {
    endDateTime = new Date(endDate);
    endDateTime.setHours(endHour, endMinute, 0);
  } else {
    // If no end date, use start date
    endDateTime = new Date(startDate);
    endDateTime.setHours(endHour, endMinute, 0);
  }

  if (endDateTime < startDateTime) {
    return {
      isValid: false,
      error: 'End date/time cannot be before start date/time'
    };
  }

  return {
    isValid: true,
    error: null
  };
}; 