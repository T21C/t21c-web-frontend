const DIFFICULTY_LEVELS = {
  'P': { base: 0, max: 20 },    // P1-P20
  'G': { base: 20, max: 20 },   // G1-G10 (values 21-30)
  'U': { base: 40, max: 20 },   // U1-U10 (values 31-40)
};

// Special ratings that can override if they appear 4 or more times (2 for community)
const SPECIAL_RATINGS = new Set([
  'Qq', 'Q0', 'Q1', 'Q2', 'Q3', 'Q4', 
  'Bus', 'Grande', 'MA', 'MP', '-21', '-2', '0', 'Impossible', 'Censored'
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

export function validateFeelingRating(value, range = true) {
    // Base patterns
    const numbers = {
        single: '[1-9]',
        teens: '1[0-2]',
        teensJ: '1[3-9][jJ]?',
        twenty: '20[jJ]?'
    };
    
    const prefixes = '[PGUpgu]';
    
    // Build PGU patterns
    const pguPatterns = [
        `${prefixes}${numbers.single}`,
        `${prefixes}${numbers.teens}`,
        `${prefixes}${numbers.teensJ}`,
        `${prefixes}${numbers.twenty}`
    ];
    const pguRegex = `(${pguPatterns.join('|')})`;
    
    // Build extended PGU pattern
    const numberPattern = `(${numbers.single}|${numbers.teens}|${numbers.twenty})`;
    const pguExtendedRegex = `${prefixes}${numberPattern}((-|~)${numberPattern})?`;
    
    // Build range pattern
    const rangeRegex = `${pguRegex}(~|-)${pguRegex}`;
    
    // Legacy patterns
    const legacyNumbers = [
        '([1-9]|1[0-7])',
        '(1[8-9]\\+?)',
        '(20(\\.[0-9])?\\+?)',
        '(21(\\.[0-4])?\\+?)'
    ];
    const legacyRegex = `^(${legacyNumbers.join('|')})$`;
    const legacyRange = `(${legacyNumbers.join('|')})(~|-)(${legacyNumbers.join('|')})$`;
    
    // Q-diff patterns
    const qDiff = '[qQ][2-4](\\+)?';
    const qDiffRange = `(${qDiff}(~|-)${qDiff})`;
    
    // Special patterns


    const extras = ['-2', '-21', 'Marathon', 'MA', 'Impossible', 'Censored'];
    const extrasRegex = extras.join('$|^');
    
    // Combine all patterns based on range flag
    const patterns = [
        '^$',
        `^${pguRegex}$`,
        `^${legacyRegex}$`,
        `^${extrasRegex}$`,
        `^${qDiff}$`,
        range ? `^${pguExtendedRegex}$` : '',
        range ? `^${rangeRegex}$` : '',
        range ? `^${legacyRange}$` : '',
        range ? `^${qDiffRange}$` : '',
    ].filter(Boolean); // Remove empty strings
    
    const regex = new RegExp(patterns.join('|'));
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
  
export function formatCreatorDisplay (level) {
    // If team exists, it takes priority
    if (!level) return "";

    if (level.team) {
      return level.team;
    }

    // If no credits, fall back to creator field
    if (!level.levelCredits || level.levelCredits.length === 0) {
      return "No credits";
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

    return level.levelCredits[0]?.creator.name || "No credits";
  }


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

/**
 * Filters difficulties based on user's top difficulty for rating restrictions
 * @param {Array} difficulties - Array of all difficulties
 * @param {Object} user - User object with player and topDiff
 * @returns {Array} Filtered difficulties that the user can rate
 */
export const filterDifficultiesByUserTopDiff = (difficulties, user) => {
  if (!difficulties || !user?.player?.stats?.topDiffId) {
    return difficulties;
  }

  const userTopDiff = user.player.stats.topDiffId;
  
  // Find the user's top difficulty
  const topDifficulty = difficulties.find(d => d.id === userTopDiff);
  if (!topDifficulty || topDifficulty.type !== 'PGU') {
    return difficulties;
  }

  // Find P16 and G20 difficulties to compare against
  const p16Difficulty = difficulties.find(d => d.name === 'P16');
  const g20Difficulty = difficulties.find(d => d.name === 'G20');
  const u1Difficulty = difficulties.find(d => d.name === 'U1');
  
  if (!p16Difficulty || !g20Difficulty || !u1Difficulty) {
    return difficulties;
  }

  // Filter PGU difficulties based on user's top difficulty
  return difficulties.filter(diff => {
    if (diff.name.startsWith('Q')) {
      return false;
    }
    if (diff.type === 'SPECIAL') {
      return true;
    }
    
    // For PGU difficulties
    if (diff.type === 'PGU') {
      // If user's top difficulty is U1 or higher (by sortOrder)
      if (topDifficulty.sortOrder >= u1Difficulty.sortOrder) {
        // Allow all difficulties
        return true;
      }
      // If user's top difficulty is P16 or lower (by sortOrder)
      else if (topDifficulty.sortOrder <= p16Difficulty.sortOrder) {
        // Only allow difficulties up to their top difficulty
        return diff.name.startsWith('P');
      } else {
        // For users between P17 and G20, only allow P and G difficulties up to G20
        return diff.name.startsWith('P') || diff.name.startsWith('G');
      }
    }
    
    return true;
  });
};
const localeMap = {
  en: "en-GB",
  pl: "pl-PL",
  kr: "ko-KR",
  cn: "zh-CN",
  id: "id-ID",
  jp: "ja-JP",
  ru: "ru-RU",
  de: "de-DE",
  fr: "fr-FR",
  es: "es-ES"
}
export function formatDate(date, language = 'en') {
  if (!date) return '';
  return new Date(date).toLocaleString(localeMap[language] || 'en-GB', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function isCdnUrl(url) {
  return url?.startsWith(import.meta.env.VITE_CDN_URL);
}