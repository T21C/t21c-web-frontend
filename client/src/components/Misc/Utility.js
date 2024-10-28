export function validateFeelingRating (value) {
    const exprPattern1 = "[PGUpgu][1-9]";     // Handles single letters followed by 1-9
    const exprPattern2 = "[PGUpgu]1[0-9]";    // Handles single letters followed by 10-19
    const exprPattern3 = "[PGUpgu]20";        // Handles single letters followed by 20
    
    const pguRegex = `(${exprPattern1}|${exprPattern2}|${exprPattern3})`;
    
    const rangeRegex = `^${pguRegex}(~|-)${pguRegex}$`;
    
    const legacyRegex = `^([1-9]|1[0-7])$|^(1[8-9]\\+?)$|^(20(\\.[0-9])?\\+?)$|^(21(\\.[0-4])?\\+?)$`;
    
    const legacyRange = `^(([1-9]|1[0-7])|(1[8-9]\\+?)|(20(\\.[0-9])?\\+?)|(21(\\.[0-4])?\\+?))(~|-)(([1-9]|1[0-7])|(1[8-9]\\+?)|(20(\\.[0-9])?\\+?)|(21(\\.[0-4])?\\+?))$`;
    
    const regex = new RegExp(`^$|^${pguRegex}$|^-2$|^${rangeRegex}$|^${legacyRegex}$|^${legacyRange}$`);
    
    return regex.test(value);
};


export function validateSpeed (value) {
    const regex = new RegExp("^$|^1(\.[0-9]+)?$")
    return regex.test(value)
}

export function validateNumber ( value){
    const regex = new RegExp("^\\d+$")
    return regex.test(value)
}
export function formatSpeed (speed) {
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
  