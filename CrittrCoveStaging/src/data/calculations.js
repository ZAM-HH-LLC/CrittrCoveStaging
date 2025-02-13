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

// TODO: import this on booking details page
export const calculateTimeUnits = (startDate, endDate, startTime, endTime, timeUnit) => {
    const start = new Date(`${startDate}T${startTime}`);
    const end = new Date(`${endDate}T${endTime}`);
    const diffMs = end - start;
    
    switch(timeUnit) {
      case '15 min':
        return Math.ceil(diffMs / (15 * 60 * 1000));
      case '30 min':
        return Math.ceil(diffMs / (30 * 60 * 1000));
      case '45 min':
        return Math.ceil(diffMs / (45 * 60 * 1000));
      case '1 hr':
        return Math.ceil(diffMs / (60 * 60 * 1000));
      case '2 hr':
        return Math.ceil(diffMs / (2 * 60 * 60 * 1000));
      case '4 hr':
        return Math.ceil(diffMs / (4 * 60 * 60 * 1000));
      case '8 hr':
        return Math.ceil(diffMs / (8 * 60 * 60 * 1000));
      case '24 hr':
      case 'per day':
        return Math.ceil(diffMs / (24 * 60 * 60 * 1000));
      case 'overnight':
        return 1; // Overnight is typically counted as one unit
      case 'per visit':
        return 1; // Per visit is counted as one unit
      default:
        return 1;
    }
  };
  
// TODO: implement this on booking details page
export const calculateOccurrenceCost = (occurrence) => {
    // If occurrence doesn't have rates, return 0
    if (!occurrence.rates) {
      return 0;
    }
    
    const timeUnits = calculateTimeUnits(
      occurrence.startDate,
      occurrence.endDate,
      occurrence.startTime,
      occurrence.endTime,
      occurrence.rates.timeUnit
    );
    
    const baseTotal = occurrence.rates.baseRate * timeUnits;
    const additionalRatesTotal = (occurrence.rates.additionalRates || [])
      .reduce((sum, rate) => sum + parseFloat(rate.amount || 0), 0);
      
    return baseTotal + additionalRatesTotal;
  };