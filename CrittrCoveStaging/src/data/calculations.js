// This is a calculation for the addpet.js file
export const calculateAge = (birthday) => {
    const today = new Date();
    const birthDate = new Date(birthday);
    let ageYears = today.getFullYear() - birthDate.getFullYear();
    let ageMonths = today.getMonth() - birthDate.getMonth();

    if (ageMonths < 0) {
      ageYears--;
      ageMonths += 12;
    }

    setAgeYears(ageYears.toString());
    setAgeMonths(ageMonths.toString());
  };

export const calculateProratedMultiplier = (startDate, endDate, startTime, endTime, timeUnit) => {
    // Parse the dates and times separately
    const [startYear, startMonth, startDay] = startDate.split('-').map(Number);
    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endYear, endMonth, endDay] = endDate.split('-').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);

    console.log('MBA12348785 ========= Starting calculateProratedMultiplier =========');
    console.log('MBA12348785 Input parameters:', {
        startDate,
        endDate,
        startTime,
        endTime,
        timeUnit
    });

    console.log('MBA12348785 Parsed components:', {
        start: {
            year: startYear,
            month: startMonth,
            day: startDay,
            hour: startHour,
            minute: startMinute
        },
        end: {
            year: endYear,
            month: endMonth,
            day: endDay,
            hour: endHour,
            minute: endMinute
        }
    });

    // Calculate days difference directly
    const startDateOnly = new Date(Date.UTC(startYear, startMonth - 1, startDay));
    const endDateOnly = new Date(Date.UTC(endYear, endMonth - 1, endDay));
    const daysDiff = Math.floor((endDateOnly - startDateOnly) / (1000 * 60 * 60 * 24));
    const daysDiffHours = daysDiff * 24;
    
    console.log('MBA12348785 Date difference calculation:', {
        startDateOnly: startDateOnly.toISOString(),
        endDateOnly: endDateOnly.toISOString(),
        daysDiff,
        daysDiffHours
    });
    
    // Calculate time difference
    const startTimeMinutes = startHour * 60 + startMinute;
    const endTimeMinutes = endHour * 60 + endMinute;
    const timeDiffHours = (endTimeMinutes - startTimeMinutes) / 60;
    
    console.log('MBA12348785 Time difference calculation:', {
        startTimeMinutes,
        endTimeMinutes,
        timeDiffHours
    });
    
    // Total hours is days difference plus time difference
    const totalHours = daysDiffHours + timeDiffHours;
    
    console.log('MBA12348785 Total duration:', {
        daysDiffHours,
        timeDiffHours,
        totalHours
    });

    let result;
    switch(timeUnit) {
        case '15 Min':
            result = totalHours / .25;
            break;
        case '30 Min':
            result = totalHours / .5;
            break;
        case '45 Min':
            result = totalHours / .75;
            break;
        case '1 Hour':
            result = totalHours / 1;
            break;
        case '2 Hour':
            result = totalHours / 2;
            break;
        case '3 Hour':
            result = totalHours / 3;
            break;
        case '4 Hour':
            result = totalHours / 4;
            break;
        case '5 Hour':
            result = totalHours / 5;
            break;
        case '6 Hour':
            result = totalHours / 6;
            break;
        case '7 Hour':
            result = totalHours / 7;
            break;
        case '8 Hour':
            result = totalHours / 8;
            break;
        case '24 Hour':
        case 'Per Day':
            result = totalHours / 24;
            break;
        case 'Week':
            result = totalHours / 168;
            break;
        case 'Per Visit':
            result = 1;
            break;
        default:
            result = 1;
    }

    console.log('MBA12348785 Final calculation:', {
        timeUnit,
        totalHours,
        divisor: timeUnit === 'Per Visit' ? 1 : timeUnit === 'Week' ? 168 : parseInt(timeUnit) || 24,
        result
    });
    console.log('MBA12348785 ========= End calculateProratedMultiplier =========');

    return result;
};
  
// Implementation of the backend's calculate_cost function in JavaScript
export const calculateOccurrenceCost = (occurrenceData, numPets = 0) => {
    console.log('MBA93652 Starting cost calculation with data:', {
        occurrenceData,
        numPets
    });

    // Extract values from occurrence data
    const {
        start_date,
        end_date,
        start_time,
        end_time,
        rates: {
            base_rate,
            additional_animal_rate,
            applies_after,
            holiday_rate,
            unit_of_time,
            additional_rates = []
        }
    } = occurrenceData;

    // Calculate number of units needed (this already handles the unit_of_time appropriately)
    const numberOfUnits = calculateProratedMultiplier(
        start_date,
        end_date,
        start_time,
        end_time,
        unit_of_time
    );

    console.log('MBA93652 calculateProratedMultiplier returned:', {
        numberOfUnits,
        unit_of_time,
        start: `${start_date} ${start_time}`,
        end: `${end_date} ${end_time}`
    });
    
    // Calculate base cost - simply multiply base rate by number of units
    const baseTotal = parseFloat(base_rate) * numberOfUnits;

    console.log('MBA93652 Base cost calculation:', {
        numberOfUnits,
        baseTotal,
        base_rate
    });

    // Calculate additional animal cost
    let additionalAnimalRateTotal = 0;
    if (numPets > parseInt(applies_after)) {
        const additionalPets = numPets - parseInt(applies_after);
        additionalAnimalRateTotal = parseFloat(additional_animal_rate) * additionalPets * numberOfUnits;
    }

    console.log('MBA93652 Additional animal cost:', {
        additionalAnimalRateTotal,
        numPets,
        applies_after,
        additional_animal_rate
    });

    // Add holiday rate if applicable (currently not implemented)
    const holidayRateTotal = 0;

    // Calculate additional rates total
    const additionalRatesTotal = additional_rates.reduce((sum, rate) => 
        sum + parseFloat(rate.amount || 0), 0);

    console.log('MBA93652 Additional rates:', {
        additionalRatesTotal,
        additional_rates
    });

    // Calculate total
    const totalCost = baseTotal + additionalAnimalRateTotal + holidayRateTotal + additionalRatesTotal;

    console.log('MBA93652 Final calculation:', {
        baseTotal,
        additionalAnimalRateTotal,
        holidayRateTotal,
        additionalRatesTotal,
        totalCost
    });

    return {
        base_total: baseTotal,
        multiplier: numberOfUnits,
        additional_animal_rate_total: additionalAnimalRateTotal,
        holiday_rate_total: holidayRateTotal,
        additional_rates_total: additionalRatesTotal,
        total_cost: totalCost
    };
};