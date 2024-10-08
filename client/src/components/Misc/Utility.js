export const validateFeelingRating = (value) => {
    const exprPattern1 = "[PGUpgu][1-9]";     // Handles single letters followed by 1-9
    const exprPattern2 = "[PGUpgu]1[0-9]";    // Handles single letters followed by 10-19
    const exprPattern3 = "[PGUpgu]20";        // Handles single letters followed by 20
    
    // Combine single expression patterns
    const pguRegex = `(${exprPattern1}|${exprPattern2}|${exprPattern3})`;
    
    // Combine patterns to match "EXPR~EXPR"
    const rangeRegex = `^${pguRegex}(~|-)${pguRegex}$`;
    
    // Legacy ratings like 1-17, 18+, 20.0+ to 21.4+
    const legacyRegex = `^([1-9]|1[0-7])$|^(1[8-9]\\+?)$|^(20(\\.[0-9])?\\+?)$|^(21(\\.[0-4])?\\+?)$`;
    
    // Legacy range expressions, e.g., "1-9~20"
    const legacyRange = `^(([1-9]|1[0-7])|(1[8-9]\\+?)|(20(\\.[0-9])?\\+?)|(21(\\.[0-4])?\\+?))(~|-)(([1-9]|1[0-7])|(1[8-9]\\+?)|(20(\\.[0-9])?\\+?)|(21(\\.[0-4])?\\+?))$`;
    
    // Final regex combining all the patterns
    const regex = new RegExp(`^$|^${pguRegex}$|^-2$|^${rangeRegex}$|^${legacyRegex}$|^${legacyRange}$`);
    
    console.log(regex);
    
    // Test input value against the regex pattern
    return regex.test(value);
};
