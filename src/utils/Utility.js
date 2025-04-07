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


export const minus2Reasons = [
  ':(',
  '🗣️',
  '8k pseudos',
  'all 3ball',
  'angle perfect/diff spike',
  'anti pp gimmick',
  'bad gimmick',
  'basic',
  'beep beep',
  'blackhole? / basic charting',
  'camera',
  'charter requested to be -2',
  'cool',
  'copyright',
  'diff spike',
  'different from original',
  'remade from the ground up',
  'different from original ',
  'fast straight part was changed into a slow straight with midspins',
  'different from original ',
  'fast triangles were removed for balancing',
  'different from original ',
  'minor parts of the chart were recharted',
  'difffspiek',
  'diffspikes',
  'eepy',
  'eugh',
  'ew',
  'Free roam',
  'gimmick abuse',
  'god',
  'hand play balance',
  'hidden twirls',
  'hold offsync',
  'holds',
  'incomplete',
  'inconsistent',
  'inconsistent, offsync, certain sections are similar to other MCCXVI charts',
  'invis speedchange',
  'kamisis is pending',
  'L keylimit',
  'lmao',
  'math free roam',
  'me when i have a concussion',
  'me when the alarm is peaceful and waking',
  'mischarted',
  'mmmmm',
  'mrbeast',
  'multitap abuse',
  'need ysmod',
  'no',
  'no dl no vid',
  'no lmao',
  'NO PERMS',
  'no song',
  'no speedup on existing charts',
  'no vid',
  'no vid L',
  'no vid no DL',
  'no ysmod',
  'not complete',
  'not consistant',
  'offset',
  'offsync',
  'old version',
  'osu! original with verification error',
  'overcharted',
  'p sure camellia does not give perm for this',
  'pauses broken in download',
  'permission',
  'pi',
  'poor recording (no audio)',
  'poor recording, doubt theres permission for background, level by sprout?',
  'poor recording, doubt you have permission for the background',
  'probably copyright lmao',
  'readability',
  'recording',
  'removing MP',
  'requested by charter',
  'requested to be -2',
  'same chart',
  'sans',
  'short',
  'similar chart',
  'THIS HAd POTIENTAL DAM NIT',
  'tuyu',
  'uh',
  'unbalanced',
  'unfinished',
  'unreadable',
  'unverified',
  'upgrade your windows, also stop putting those images as background',
  'vid dead',
  'what the hell did you do to make the channel terminated',
  'will be rated after official level is out',
  'wooaa',
  'would be nice if recreated, dl wont work',
  'wrong offset',
  'yummy',
  'zzzzz',
  'zzzzzzzzzzzzzzzzzzzzzzzz',
];

export const gimmickReasons = [
  'Angle Perfect',
  'Beep Beep',
  'Camera',
  'Free Roam',
  'Hidden Twirls',
  'Hold Offsync',
  'Invis Speedchange',
  'Math Free Roam',
  'Multitap',
  'Offset',
  'Offsync',
  'Readability',
  'Unreadable',
  'YS Mod Required'
];

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
    
    const pguExtendedRegex = `([pguPGU]([1-9]|1[0-9]|20))((-|~)([1-9]|1[0-9]|20))?`;

    const rangeRegex = `${pguRegex}(~|-)${pguRegex}`;
    
    const legacyRegex = `([1-9]|1[0-7])$|^(1[8-9]\\+?)$|^(20(\\.[0-9])?\\+?)$|^(21(\\.[0-4])?\\+?)`;
    
    const legacyRange = `(([1-9]|1[0-7])|(1[8-9]\\+?)|(20(\\.[0-9])?\\+?)|(21(\\.[0-4])?\\+?))(~|-)(([1-9]|1[0-7])|(1[8-9]\\+?)|(20(\\.[0-9])?\\+?)|(21(\\.[0-4])?\\+?))$`;
    
    const qDiff = `[qQ][2-4](\\+)?`;

    const qDiffRange = `(${qDiff}(~|-)${qDiff})`;

    const extras = ['-2', '-21', 'Marathon', 'MA', 'U'];
    const extrasRegex = extras.join('$|^')

    // Create the appropriate regex based on range flag
    const regex = range 
        ? new RegExp(`^$|^${pguRegex}$|^${extrasRegex}$|^${qDiff}$|^${qDiffRange}$|^${rangeRegex}$|^${legacyRegex}$|^${legacyRange}$|^${pguExtendedRegex}$`)
        : new RegExp(`^$|^${pguRegex}$|^${extrasRegex}$|^${qDiff}$|^${legacyRegex}$`);
    
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
  
export const formatCreatorDisplay = (level) => {
    // If team exists, it takes priority
    if (!level) return "";

    if (level.team) {
      return level.team;
    }

    // If no credits, fall back to creator field
    if (!level.levelCredits || level.levelCredits.length === 0) {
      return level.creator;
    }

    // Group credits by role
    const creditsByRole = level.levelCredits.reduce((acc, credit) => {
      const role = credit.role.toLowerCase();
      if (!acc[role]) {
        acc[role] = [];
      }
      const creatorName = credit.creator.aliases?.length > 0 
        ? credit.creator.aliases[0]
        : credit.creator.name;
      acc[role].push(creatorName);
      return acc;
    }, {});

    const charters = creditsByRole['charter'] || [];
    const vfxers = creditsByRole['vfxer'] || [];

    // Handle different cases based on number of credits
    if (level.levelCredits.length >= 3) {
      const parts = [];
      if (charters.length > 0) {
        parts.push(charters.length === 1 
          ? charters[0] 
          : `${charters[0]} & ${charters.length - 1} more`);
      }
      if (vfxers.length > 0) {
        parts.push(vfxers.length === 1
          ? vfxers[0]
          : `${vfxers[0]} & ${vfxers.length - 1} more`);
      }
      return parts.join(' | ');
    } else if (level.levelCredits.length === 2) {
      if (charters.length === 2) {
        return `${charters[0]} & ${charters[1]}`;
      }
      if (charters.length === 1 && vfxers.length === 1) {
        return `${charters[0]} | ${vfxers[0]}`;
      }
    }

    return level.levelCredits[0]?.creator.name || level.creator;
  };


  export function gaussianRandom(mean=0, stdev=1) {
    const u = 1 - Math.random(); // Converting [0,1) to (0,1]
    const v = Math.random();
    const z = Math.sqrt( -2.0 * Math.log( u ) ) * Math.cos( 2.0 * Math.PI * v );
    // Transform to the desired mean and standard deviation:
    return z * stdev + mean;
}

/**
 * Creates a probability-based event system
 * @param {Object} events - Object containing event names and their probabilities (0-100)
 * @returns {string|null} - Returns the triggered event name or null if no event triggered
 * @example
 * const events = {
 *   'eventA': 5,  // 5% chance
 *   'eventB': 10, // 10% chance
 *   'eventC': 15  // 15% chance
 * };
 * const result = triggerEvent(events);
 */
export function triggerEvent(events) {
  // Generate random number between 0 and 100
  const roll = Math.random() * 100;
  let cumulativeProbability = 0;

  // Check each event in order
  for (const [eventName, probability] of Object.entries(events)) {
    cumulativeProbability += probability;
    if (roll < cumulativeProbability) {
      return eventName;
    }
  }

  // No event triggered
  return null;
}

/**
 * Creates a reusable event system with predefined events
 * @param {Object} events - Object containing event names and their probabilities
 * @returns {Function} - Function that can be called to trigger events
 * @example
 * const eventSystem = createEventSystem({
 *   'eventA': 5,
 *   'eventB': 10
 * });
 * const result = eventSystem(); // Returns triggered event or null
 */
export function createEventSystem(events) {
  // Validate probabilities sum to 100 or less
  const totalProbability = Object.values(events).reduce((sum, prob) => sum + prob, 0);
  if (totalProbability > 100) {
    throw new Error('Total probability cannot exceed 100%');
  }

  return () => triggerEvent(events);
}