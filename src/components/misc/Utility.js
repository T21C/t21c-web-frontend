// Define difficulty levels and their numeric values
const DIFFICULTY_LEVELS = {
  'P': { base: 0, max: 20 },    // P1-P20
  'G': { base: 20, max: 20 },   // G1-G10 (values 21-30)
  'U': { base: 40, max: 20 },   // U1-U10 (values 31-40)
};

// Special ratings that can override if they appear 4 or more times (2 for community)
const SPECIAL_RATINGS = new Set([
  'Qq', 'Q1+', 'Q2', 'Q2+', 'Q3', 'Q3+', 'Q4', 
  'Bus', 'Grande', 'MA', 'MP', '-21', '-2', '0'
]);

export function trimString(str, maxLength = 40) {
  if (!str) return '';
  return str.length > maxLength ? str.substring(0, maxLength - 3) + '...' : str;
}

export function getRatingValue(rating) {
  if (!rating || typeof rating !== 'string') return null;
  
  // Check for special ratings first
  if (SPECIAL_RATINGS.has(rating)) {
    return rating;
  }

  const prefix = rating.charAt(0).toUpperCase();
  const number = parseInt(rating.slice(1));
  
  if (!DIFFICULTY_LEVELS[prefix] || isNaN(number)) return null;
  return DIFFICULTY_LEVELS[prefix].base + number;
}

export function getValueAsRating(value) {
  if (value === null || isNaN(value)) return null;
  
  // Find the appropriate difficulty level
  for (const [prefix, level] of Object.entries(DIFFICULTY_LEVELS)) {
    if (value > level.base && value <= level.base + level.max) {
      return `${prefix}${value - level.base}`;
    }
  }
  return null;
}

export function calculateRatingValue(rating, isCommunity = false) {
  // If not a string, return null
  if (typeof rating !== 'string' || rating === "") return null;
  
  // Clean the input
  const cleanRating = rating.trim().toUpperCase().replace(/ /g, '');
  
  // Handle special ratings first
  if (SPECIAL_RATINGS.has(cleanRating)) {
    return cleanRating;
  }
  
  // Check if it's a range (contains hyphen)
  if (cleanRating.includes('-') || cleanRating.includes('~')) {
    const [start, end] = cleanRating.split(/[-~]/);
    // Validate both parts exist
    if (!start || !end) return null;
    
    const startPrefix = start.charAt(0);
    // Convert both ratings to numeric values
    if (/[PGUpgu]/.test(startPrefix) && /^\d+/.test(end)) {
      const startValue = getRatingValue(start);
      const endValue = getRatingValue(startPrefix + end);
      if (startValue === null || endValue === null) return null;
      if (startValue > endValue) return null;
      const avg = Math.round((startValue + endValue) / 2);
      return getValueAsRating(avg);
    };

    const startValue = getRatingValue(start);
    const endValue = getRatingValue(end);
    
    // Validate conversion
    if (startValue === null || endValue === null) return null;
    if (startValue > endValue) return null;
    
    // Calculate average and convert back to rating
    const avg = Math.round((startValue + endValue) / 2);
    return getValueAsRating(avg);
  }
  
  // If not a range, normalize and return the rating
  const prefix = cleanRating.charAt(0);
  const number = parseInt(cleanRating.slice(1));
  
  if (!DIFFICULTY_LEVELS[prefix] || isNaN(number)) {
    return null;
  }
  
  return cleanRating;
}

export function calculateAverageRating(ratings, isCommunity = false) {
  if (!ratings || !Array.isArray(ratings) || ratings.length === 0) return null;

  // Count special ratings
  const specialCounts = {};
  const numericRatings = [];

  for (const rating of ratings) {
    const value = calculateRatingValue(rating);
    
    if (typeof value === 'string' && SPECIAL_RATINGS.has(value)) {
      specialCounts[value] = (specialCounts[value] || 0) + 1;
    } else if (typeof value === 'number') {
      numericRatings.push(value);
    }
  }

  // Check for special ratings with enough votes
  const requiredVotes = isCommunity ? 2 : 4;
  for (const [rating, count] of Object.entries(specialCounts)) {
    if (count >= requiredVotes) {
      return rating;
    }
  }

  // Calculate average of numeric ratings
  if (numericRatings.length > 0) {
    const avg = Math.round(numericRatings.reduce((a, b) => a + b, 0) / numericRatings.length);
    return getValueAsRating(avg);
  }

  return null;
}

export function validateFeelingRating(value, range = true) {
    // Define regex patterns
    const exprPattern1 = "[PGUpgu][1-9]";     // Handles single letters followed by 1-9
    const exprPattern2 = "[PGUpgu]1[0-9]";    // Handles single letters followed by 10-19
    const exprPattern3 = "[PGUpgu]20";        // Handles single letters followed by 20
    
    const pguRegex = `(${exprPattern1}|${exprPattern2}|${exprPattern3})`;
    
    const rangeRegex = `^${pguRegex}(~|-)${pguRegex}$`;
    
    const legacyRegex = `^([1-9]|1[0-7])$|^(1[8-9]\\+?)$|^(20(\\.[0-9])?\\+?)$|^(21(\\.[0-4])?\\+?)$`;
    
    const legacyRange = `^(([1-9]|1[0-7])|(1[8-9]\\+?)|(20(\\.[0-9])?\\+?)|(21(\\.[0-4])?\\+?))(~|-)(([1-9]|1[0-7])|(1[8-9]\\+?)|(20(\\.[0-9])?\\+?)|(21(\\.[0-4])?\\+?))$`;
    
    // Create the appropriate regex based on range flag
    const regex = range 
        ? new RegExp(`^$|^${pguRegex}$|^-2$|^-21$|^${rangeRegex}$|^${legacyRegex}$|^${legacyRange}$`)
        : new RegExp(`^$|^${pguRegex}$|^-2$|^-21$|^${legacyRegex}$`);
    
    return regex.test(value);
}

export function validateSpeed(value) {
    // Matches empty string or numbers >= 1.0
    const regex = /^$|^[1-9]\d*(\.\d+)?$|^1\.0+$/;
    return regex.test(value);
}

export function validateNumber ( value){
    const regex = new RegExp("^\\d+$")
    return regex.test(value)
}
export function formatSpeed (speed) {
    if (speed === null) return "1.0";
    const speedTwoDecimals = speed.toFixed(2);
    if (speedTwoDecimals[speedTwoDecimals.length - 1] !== '0') {
      return speedTwoDecimals;
    }
    const speedOneDecimal = speed.toFixed(1);
    if (speedOneDecimal[speedOneDecimal.length - 1] !== '0') {
      return speedOneDecimal;
    }
    return Math.round(speed);
  };

export  function formatScore(score) {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(score);
  }
  