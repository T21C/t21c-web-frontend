export const ABILITIES = {
    CUSTOM_CSS: 0,
    CUSTOM_COLOR: 1
  };

export function hasBit(input, bit) {
    return (input & bit) === bit;
}
  
export function setBit(input, bit) {
  return input | bit;
}