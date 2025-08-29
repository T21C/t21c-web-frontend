import { permissionFlags } from "./UserPermissions";
import { ABILITIES } from "./Abilities";
// Client-side utility functions for curation type abilities
// This mirrors the server-side functionality but for use in React components

/**
 * Check if a curation type has a specific ability
 * @param {Object|bigint} curationType - Curation type object or abilities value
 * @param {bigint} ability - Ability flag to check
 * @returns {boolean}
 */
export const hasAbility = (curationType, ability) => {
  const abilities = typeof curationType === 'object' && curationType !== null 
    ? BigInt(curationType.abilities || 0)
    : BigInt(curationType || 0);
  
  return (abilities & ability) === ability;
};

/**
 * Check if a curation type has any of the specified abilities
 * @param {Object|bigint} curationType - Curation type object or abilities value
 * @param {bigint[]} abilities - Array of ability flags to check
 * @returns {boolean}
 */
export const hasAnyAbility = (curationType, abilities) => {
  const typeAbilities = typeof curationType === 'object' && curationType !== null 
    ? BigInt(curationType.abilities || 0)
    : BigInt(curationType || 0);
  
  return abilities.some(ability => (typeAbilities & ability) === ability);
};

/**
 * Check if a curation type has all of the specified abilities
 * @param {Object|bigint} curationType - Curation type object or abilities value
 * @param {bigint[]} abilities - Array of ability flags to check
 * @returns {boolean}
 */
export const hasAllAbilities = (curationType, abilities) => {
  const typeAbilities = typeof curationType === 'object' && curationType !== null 
    ? BigInt(curationType.abilities || 0)
    : BigInt(curationType || 0);
  
  return abilities.every(ability => (typeAbilities & ability) === ability);
};

/**
 * Add an ability to a curation type's abilities
 * @param {Object|bigint} curationType - Curation type object or abilities value
 * @param {bigint} ability - Ability flag to add
 * @returns {bigint}
 */
export const addAbility = (curationType, ability) => {
  const abilities = typeof curationType === 'object' && curationType !== null 
    ? BigInt(curationType.abilities || 0)
    : BigInt(curationType || 0);
  
  return abilities | ability;
};

/**
 * Remove an ability from a curation type's abilities
 * @param {Object|bigint} curationType - Curation type object or abilities value
 * @param {bigint} ability - Ability flag to remove
 * @returns {bigint}
 */
export const removeAbility = (curationType, ability) => {
  const abilities = typeof curationType === 'object' && curationType !== null 
    ? BigInt(curationType.abilities || 0)
    : BigInt(curationType || 0);
  
  return abilities & ~ability;
};

/**
 * Get the default color for a curation type based on its abilities
 * @param {bigint} abilities - Curation type abilities
 * @returns {string}
 */
export const getDefaultColor = (abilities) => {
  const abilitiesBigInt = BigInt(abilities || 0);
  
  // Check for custom color theme ability
  if (hasAbility(abilitiesBigInt, 1n << 14n)) { // CUSTOM_COLOR_THEME
    return '#e0e0e0'; // Light gray for custom theme
  }
  
  return '#ffffff'; // Default white
};

/**
 * Get hover information for a curation type
 * @param {Object} curation - Curation object with type and metadata
 * @returns {string}
 */
export const getHoverInfo = (curation) => {
  const info = [];
  
  if (curation.type && hasAbility(curation.type.abilities, 1n << 10n)) { // SHOW_ASSIGNER
    info.push(`By: ${curation.assignedBy || 'Unknown'}`);
  }
  
  return info.join(' | ');
};

/**
 * Check if a user can assign a curation type based on their permissions
 * @param {bigint} userFlags - User's permission flags
 * @param {bigint} curationAbilities - Curation type's abilities
 * @returns {boolean}
 */
export const canAssignCurationType = (userFlags, curationAbilities) => {
  const userFlagsBigInt = BigInt(userFlags || 0);
  const curationAbilitiesBigInt = BigInt(curationAbilities || 0);
  
  // Super admins and head curators can assign all curation types
  if ((userFlagsBigInt & permissionFlags.SUPER_ADMIN) !== 0n || // SUPER_ADMIN
      (userFlagsBigInt & permissionFlags.HEAD_CURATOR) !== 0n) {  // HEAD_CURATOR
    return true;
  }

  // Check assignment abilities using OR logic - if either condition matches, allow assignment
  const hasCuratorAssignable = hasAbility(curationAbilitiesBigInt, ABILITIES.CURATOR_ASSIGNABLE);
  const hasRaterAssignable = hasAbility(curationAbilitiesBigInt, ABILITIES.RATER_ASSIGNABLE);
  const isCurator = (userFlagsBigInt & permissionFlags.CURATOR) !== 0n;
  const isRater = (userFlagsBigInt & permissionFlags.RATER) !== 0n;

  // Allow if user has curator permission and curation is curator-assignable
  if (hasCuratorAssignable && isCurator) {
    return true;
  }

  // Allow if user has rater permission and curation is rater-assignable
  if (hasRaterAssignable && isRater) {
    return true;
  }
  
  // If no specific assignment flag, only super admins can assign
  return false;
};

/**
 * Get all ability names for a curation type
 * @param {Object|bigint} curationType - Curation type object or abilities value
 * @returns {string[]}
 */
export const getAbilityNames = (curationType) => {
  const abilities = typeof curationType === 'object' && curationType !== null 
    ? BigInt(curationType.abilities || 0)
    : BigInt(curationType || 0);
  
  const names = [];
  
  const abilityMap = {
    [1n << 0n]: 'CUSTOM_CSS',
    [1n << 6n]: 'CURATOR_ASSIGNABLE',
    [1n << 7n]: 'RATER_ASSIGNABLE',
    [1n << 10n]: 'SHOW_ASSIGNER',
    [1n << 11n]: 'FORCE_DESCRIPTION',
    [1n << 13n]: 'FRONT_PAGE_ELIGIBLE',
    [1n << 14n]: 'CUSTOM_COLOR_THEME',
    [1n << 15n]: 'LEVEL_LIST_BASIC_GLOW',
    [1n << 16n]: 'LEVEL_LIST_LEGENDARY_GLOW',
  };
  
  Object.entries(abilityMap).forEach(([flag, name]) => {
    if ((abilities & BigInt(flag)) === BigInt(flag)) {
      names.push(name);
    }
  });
  
  return names;
};
