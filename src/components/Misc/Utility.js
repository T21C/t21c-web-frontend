import { inputDataRaw } from "../../Repository/RemoteRepository";

// Define difficulty levels and their numeric values
const DIFFICULTY_LEVELS = {
  'P': { base: 0, max: 20 },    // P1-P20
  'G': { base: 20, max: 20 },   // G1-G10 (values 21-30)
  'U': { base: 40, max: 20 },   // U1-U10 (values 31-40)
};

export function getRatingValue(rating) {
  if (!rating || typeof rating !== 'string') return null;
  const prefix = rating.charAt(0);
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

export function calculateRatingValue(rating) {
  // If not a string, return null
  if (typeof rating !== 'string' || rating === "") return null;
  
  // Clean the input
  const cleanRating = rating.trim().toUpperCase();
  
  // Handle feeling ratings first
  if (validateFeelingRating(cleanRating, false)) {
    return cleanRating;
  }
  
  // Check if it's a range (contains hyphen)
  if (cleanRating.includes('-')) {
    const [start, end] = cleanRating.split('-');
    console.log("start, end", start, end)
    // Validate both parts exist
    if (!start || !end) return null;
    
    // Convert both ratings to numeric values
    const startValue = getRatingValue(start);
    const endValue = getRatingValue(end);
    
    // Validate conversion
    if (startValue === null || endValue === null) return null;
    if (startValue > endValue) return null;
    
    // Calculate average and convert back to rating
    const avg = Math.round((startValue + endValue) / 2);
    return getValueAsRating(avg);
  }
  console.log(rating)
  console.log(cleanRating)
  // If it's a single rating, validate it exists in inputDataRaw
  if (Object.keys(inputDataRaw).includes(cleanRating)) {
    return cleanRating;
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
  