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
    [1n << 12n]: 'ALLOW_DESCRIPTION',
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

/**
 * Prefer DifficultyContext curationTypesDict[type.id] so abilities/icons/names stay current vs embedded API rows.
 * Catalog icons are already `/small` from context; embedded rows without a dict entry get a one-time URL normalize.
 */
export const resolveCurationTypeFromDict = (typeRef, curationTypesDict) => {
  if (!typeRef || typeRef.id == null) return typeRef;
  const dict = curationTypesDict || {};
  const fromDict = dict[typeRef.id];
  if (fromDict) return fromDict;
  const rawIcon = typeRef.icon ?? null;
  if (!rawIcon) return typeRef;
  const icon = selectIconSize(rawIcon, "small") || rawIcon;
  if (icon === typeRef.icon) return typeRef;
  return { ...typeRef, icon };
};

/** Sort linked types (tags) for badges/icons; returns catalog-resolved types. */
export const sortCurationTypesForDisplay = (types, curationTypesDict) => {
  if (!types?.length) return [];
  const dict = curationTypesDict || {};
  const sorted = [...types].sort((typeA, typeB) => {
    const resolvedTypeA = resolveCurationTypeFromDict(typeA, dict);
    const resolvedTypeB = resolveCurationTypeFromDict(typeB, dict);
    const groupOrderDiff = (resolvedTypeA?.groupSortOrder ?? 0) - (resolvedTypeB?.groupSortOrder ?? 0);
    if (groupOrderDiff !== 0) return groupOrderDiff;
    const sortOrderDiff = (resolvedTypeA?.sortOrder ?? 0) - (resolvedTypeB?.sortOrder ?? 0);
    if (sortOrderDiff !== 0) return sortOrderDiff;
    return (resolvedTypeA?.id ?? 0) - (resolvedTypeB?.id ?? 0);
  });
  return sorted.map((t) => resolveCurationTypeFromDict(t, dict));
};

/**
 * Curation types with positive level counts, catalog-resolved and sorted for header panel / selector lists.
 * @param {Record<string, number> | null | undefined} curationTypeCounts
 * @param {Record<number, object> | null | undefined} curationTypesDict
 * @returns {{ id: number; name: string; icon?: string | null; count: number; group?: string; groupSortOrder?: number; sortOrder?: number }[]}
 */
export function getCreatorCurationTypesForHeaderPanel(curationTypeCounts, curationTypesDict) {
  const dict = curationTypesDict && typeof curationTypesDict === "object" ? curationTypesDict : {};
  const counts = curationTypeCounts && typeof curationTypeCounts === "object" ? curationTypeCounts : {};
  const entries = Object.entries(counts).filter(([, cnt]) => Number(cnt) > 0);
  const refs = entries.map(([typeId]) => {
    const id = Number(typeId);
    return resolveCurationTypeFromDict({ id }, dict) || { id, name: `#${id}` };
  });
  const sorted = sortCurationTypesForDisplay(refs, dict);
  return sorted.map((ct) => {
    const id = Number(ct.id);
    const count = Number(counts[String(id)] ?? counts[id] ?? 0) || 0;
    return {
      id,
      name: ct.name ?? `#${id}`,
      icon: ct.icon ?? null,
      count,
      group: ct.group,
      groupSortOrder: ct.groupSortOrder,
      sortOrder: ct.sortOrder,
    };
  });
}

/**
 * Group catalog items (e.g. curation types) by `group` for compact panel layout.
 * @param {Array<{ group?: string; groupSortOrder?: number }>} items
 * @param {string} fallbackGroupLabel
 * @returns {[string, { items: typeof items; groupSortOrder: number }][]}
 */
export function groupCurationTypesForPanel(items, fallbackGroupLabel) {
  const list = Array.isArray(items) ? items : [];
  const groups = list.reduce((acc, item) => {
    const group =
      item?.group && String(item.group).trim() !== ""
        ? String(item.group)
        : fallbackGroupLabel;
    if (!acc[group]) acc[group] = { items: [], groupSortOrder: item?.groupSortOrder ?? 999999 };
    acc[group].items.push(item);
    if (item?.groupSortOrder != null && item.groupSortOrder < acc[group].groupSortOrder) {
      acc[group].groupSortOrder = item.groupSortOrder;
    }
    return acc;
  }, {});
  return Object.entries(groups).sort((a, b) => a[1].groupSortOrder - b[1].groupSortOrder);
}

const THEME_ABILITY_BITS = [ABILITIES.CUSTOM_CSS, ABILITIES.CUSTOM_COLOR_THEME];

function pickThemeTypeFromResolvedList(types) {
  if (!types?.length) return null;
  for (const t of types) {
    if (THEME_ABILITY_BITS.some((ab) => hasAbility(t, ab))) return t;
  }
  return types[0];
}

/**
 * Resolved + sorted curation types for a row (M2M types, optional typeIds, or legacy `type`).
 */
export const getCurationTypesResolved = (curation, curationTypesDict) => {
  if (!curation) return [];
  const dict = curationTypesDict || {};
  if (Array.isArray(curation.types) && curation.types.length > 0) {
    const merged = curation.types.map((t) => resolveCurationTypeFromDict(t, dict));
    return sortCurationTypesForDisplay(merged, dict);
  }
  if (Array.isArray(curation.typeIds) && curation.typeIds.length > 0) {
    return sortCurationTypesForDisplay(
      curation.typeIds.map((id) => resolveCurationTypeFromDict({ id }, dict)).filter((t) => t && t.id != null),
      dict,
    );
  }
  if (curation.type?.id != null) {
    const t = resolveCurationTypeFromDict(curation.type, dict);
    return sortCurationTypesForDisplay([t], dict);
  }
  return [];
};

export const resolveCurationThemeType = (curation, curationTypesDict) => {
  if (!curation) return null;
  const dict = curationTypesDict || {};
  if (curation.type?.id != null) {
    const fromAlias = resolveCurationTypeFromDict(curation.type, dict);
    if (fromAlias) return fromAlias;
  }
  if (curation.themeTypeId != null && dict[curation.themeTypeId]) {
    return resolveCurationTypeFromDict({ id: curation.themeTypeId }, dict);
  }
  return pickThemeTypeFromResolvedList(getCurationTypesResolved(curation, dict));
};

/** Attach catalog-resolved `types` and theme `type` onto a curation object (non-mutating). */
export const hydrateCurationWithCatalog = (curation, curationTypesDict) => {
  if (!curation) return curation;
  const types = getCurationTypesResolved(curation, curationTypesDict);
  const type = resolveCurationThemeType(curation, curationTypesDict);
  return {...curation, types, type};
};

/**
 * @param {Object} curation - Curation row
 * @param {Record<number, object>|undefined} curationTypesDict - optional; when set, abilities come from catalog
 */
export const getHoverInfo = (curation, curationTypesDict) => {
  const info = [];

  const types = curationTypesDict
    ? getCurationTypesResolved(curation, curationTypesDict)
    : curation.types || (curation.type ? [curation.type] : []);
  if (types.some((t) => hasAbility(t, ABILITIES.SHOW_ASSIGNER))) {
    info.push(`By: ${curation.assignedBy || 'Unknown'}`);
  }

  return info.join(' | ');
};

export const sortCurationsForDisplay = (curations, curationTypesDict) => {
  if (!curations?.length) return [];
  const dict = curationTypesDict || {};
  return [...curations].sort((curationA, curationB) => {
    const getPrimaryType = (curation) => getCurationTypesResolved(curation, dict)[0] || null;
    const primaryTypeA = getPrimaryType(curationA);
    const primaryTypeB = getPrimaryType(curationB);
    const groupOrderDiff = (primaryTypeA?.groupSortOrder ?? 0) - (primaryTypeB?.groupSortOrder ?? 0);
    if (groupOrderDiff !== 0) return groupOrderDiff;
    const sortOrderDiff = (primaryTypeA?.sortOrder ?? 0) - (primaryTypeB?.sortOrder ?? 0);
    if (sortOrderDiff !== 0) return sortOrderDiff;
    const typeIdDiff = (primaryTypeA?.id ?? 0) - (primaryTypeB?.id ?? 0);
    if (typeIdDiff !== 0) return typeIdDiff;
    return (curationA.id ?? 0) - (curationB.id ?? 0);
  });
};
