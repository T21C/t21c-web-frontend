export function deepCloneStyle(style) {
  if (style === undefined) return undefined;
  if (style === null) return null;
  return JSON.parse(JSON.stringify(style));
}

export function stylesEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

/** Build `{ value, label }[]` for CustomSelect from string enum values. */
export function valuesToSelectOptions(values, getLabel = (v) => v) {
  return values.map((value) => ({ value, label: getLabel(value) }));
}
