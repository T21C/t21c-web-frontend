const KEY_ORDER = [
  "Escape", "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12",
  "PrintScreen", "ScrollLock", "Pause",
  "AudioVolumeMute", "AudioVolumeDown", "AudioVolumeUp", "Calculator",
  "Backquote", "Digit1", "Digit2", "Digit3", "Digit4", "Digit5", "Digit6", "Digit7", "Digit8", "Digit9", "Digit0",
  "Minus", "Equal", "Backspace", "Insert", "Home", "PageUp",
  "NumLock", "NumpadDivide", "NumpadMultiply", "NumpadSubtract",
  "Tab", "KeyQ", "KeyW", "KeyE", "KeyR", "KeyT", "KeyY", "KeyU", "KeyI", "KeyO", "KeyP",
  "BracketLeft", "BracketRight", "Backslash", "Delete", "End", "PageDown",
  "Numpad7", "Numpad8", "Numpad9", "NumpadAdd",
  "CapsLock", "KeyA", "KeyS", "KeyD", "KeyF", "KeyG", "KeyH", "KeyJ", "KeyK", "KeyL",
  "Semicolon", "Quote", "Enter", "Numpad4", "Numpad5", "Numpad6",
  "ShiftLeft", "KeyZ", "KeyX", "KeyC", "KeyV", "KeyB", "KeyN", "KeyM",
  "Comma", "Period", "Slash", "ShiftRight", "ArrowUp",
  "Numpad1", "Numpad2", "Numpad3", "NumpadEnter",
  "ControlLeft", "MetaLeft", "AltLeft", "Space", "AltRight", "MetaRight", "ContextMenu", "Fn", "ControlRight",
  "ArrowLeft", "ArrowDown", "ArrowRight",
  "Numpad0", "NumpadDecimal",
  "IntlBackslash", "Lang1", "Lang2",
];

const keyboardOrder = new Map(KEY_ORDER.map((code, index) => [code, index]));

const preferredTokens = {
  Escape: "Esc",
  PrintScreen: "PrintScreen",
  ScrollLock: "ScrollLock",
  AudioVolumeMute: "Mute",
  AudioVolumeDown: "Vol-",
  AudioVolumeUp: "Vol+",
  Calculator: "Calc",
  Backquote: "`",
  Minus: "-",
  Equal: "=",
  BracketLeft: "[",
  BracketRight: "]",
  Backslash: "\\",
  Semicolon: ";",
  Quote: "'",
  Comma: ",",
  Period: ".",
  Slash: "/",
  ShiftLeft: "LShift",
  ShiftRight: "RShift",
  ControlLeft: "LCtrl",
  ControlRight: "RCtrl",
  MetaLeft: "LWin",
  MetaRight: "RWin",
  AltLeft: "LAlt",
  AltRight: "RAlt",
  ContextMenu: "Menu",
  ArrowLeft: "Left",
  ArrowDown: "Down",
  ArrowUp: "Up",
  ArrowRight: "Right",
  NumpadDivide: "Num/",
  NumpadMultiply: "Num*",
  NumpadSubtract: "Num-",
  NumpadAdd: "Num+",
  NumpadEnter: "NumEnter",
  NumpadDecimal: "Num.",
};

export function tokenForKey(code) {
  if (preferredTokens[code]) return preferredTokens[code];
  if (code.startsWith("Key")) return code.slice(3);
  if (code.startsWith("Digit")) return code.slice(5);
  if (code.startsWith("Numpad")) return `Num${code.slice(6)}`;
  return code;
}

const aliases = new Map();
const normalize = (token) => token.trim().toLocaleLowerCase();
function addAliases(code, values) {
  for (const value of values) aliases.set(normalize(value), code);
}

for (const code of KEY_ORDER) {
  addAliases(code, [code, tokenForKey(code)]);
}
addAliases("Escape", ["escape"]);
addAliases("Backquote", ["backquote", "backtick", "grave", "tilde"]);
addAliases("Backslash", ["backslash", "won", "₩"]);
addAliases("CapsLock", ["caps", "capslock"]);
addAliases("Enter", ["return", "return(=enter)"]);
addAliases("Space", ["spacebar"]);
addAliases("PrintScreen", ["prtsc", "prtscr", "print", "printscreen"]);
addAliases("ScrollLock", ["scrlock", "scrlk", "scroll", "scrolllock"]);
addAliases("Pause", ["break", "pausebreak"]);
addAliases("Insert", ["ins"]);
addAliases("Delete", ["del"]);
addAliases("PageUp", ["pageup", "pgup"]);
addAliases("PageDown", ["pagedown", "pgdn", "pgdown"]);
addAliases("NumLock", ["numlk", "numlck", "nmlk"]);
addAliases("ControlLeft", ["leftctrl", "leftcontrol", "ctrlleft", "lcontrol"]);
addAliases("ControlRight", ["rightctrl", "rightcontrol", "ctrlright", "rcontrol"]);
addAliases("ShiftLeft", ["leftshift", "shiftleft"]);
addAliases("ShiftRight", ["rightshift", "shiftright"]);
addAliases("AltLeft", ["leftalt", "altleft"]);
addAliases("AltRight", ["rightalt", "altright", "altgr"]);
addAliases("MetaLeft", ["leftwin", "winleft", "metaleft"]);
addAliases("MetaRight", ["rightwin", "winright", "metaright"]);
addAliases("ContextMenu", ["contextmenu", "apps", "app"]);
addAliases("ArrowLeft", ["arrowleft", "leftarrow", "←"]);
addAliases("ArrowDown", ["arrowdown", "downarrow", "↓"]);
addAliases("ArrowUp", ["arrowup", "uparrow", "↑"]);
addAliases("ArrowRight", ["arrowright", "rightarrow", "→"]);
addAliases("IntlBackslash", ["intlbackslash", "nubs", "iso\\"]);
addAliases("Fn", ["fn"]);

for (let digit = 0; digit <= 9; digit += 1) {
  addAliases(`Numpad${digit}`, [`numpad${digit}`, `num${digit}`, `kp${digit}`]);
}
addAliases("NumpadDivide", ["numpad/", "numpaddivide", "numdivide", "kp/"]);
addAliases("NumpadMultiply", ["numpad*", "numpadmultiply", "nummultiply", "kp*"]);
addAliases("NumpadSubtract", ["numpad-", "numpadsubtract", "numsubtract", "kp-"]);
addAliases("NumpadAdd", ["numpad+", "numpadadd", "numadd", "kp+"]);
addAliases("NumpadEnter", ["numpadenter", "kpenter"]);
addAliases("NumpadDecimal", ["numpad.", "numpaddecimal", "numdecimal", "kp."]);

export function resolveKeyAlias(token) {
  return aliases.get(normalize(token)) ?? null;
}

export function canonicalizeKeys(keys) {
  return [...new Set(keys)].sort(
    (left, right) =>
      (keyboardOrder.get(left) ?? Number.MAX_SAFE_INTEGER) -
      (keyboardOrder.get(right) ?? Number.MAX_SAFE_INTEGER),
  );
}

export function parseKeybindText(value) {
  const tokens = String(value).split(/[\s,]+/).filter(Boolean);
  const keys = [];
  const unknownTokens = [];
  const duplicateTokens = [];
  const seen = new Set();
  for (const token of tokens) {
    const code = aliases.get(normalize(token));
    if (!code) {
      unknownTokens.push(token);
      continue;
    }
    if (seen.has(code)) {
      duplicateTokens.push(token);
      continue;
    }
    seen.add(code);
    keys.push(code);
  }
  return { keys: canonicalizeKeys(keys), unknownTokens, duplicateTokens };
}

export function formatKeybind(keys) {
  return canonicalizeKeys(keys).map(tokenForKey).join(" ");
}

export function currentPeriod(periods) {
  if (!Array.isArray(periods) || !periods.length) return null;
  const sorted = sortPeriods(periods);
  return sorted[sorted.length - 1];
}

function samePeriod(left, right) {
  if (left === right) return true;
  if (left?.id && right?.id && left.id === right.id) return true;
  return false;
}

export function isUntilAuto(period) {
  return period?.untilAuto !== false;
}

export function nextFittingStart(period, group) {
  const from = period?.sinceDate ?? null;
  const list = Array.isArray(group) ? group : [];
  let best = null;
  for (const other of list) {
    if (samePeriod(period, other)) continue;
    const start = other?.sinceDate ?? null;
    if (start == null) continue;
    if (from != null && start <= from) continue;
    if (best == null || start < best) best = start;
  }
  return best;
}

export function effectiveUntil(period, group) {
  if (isUntilAuto(period)) return nextFittingStart(period, Array.isArray(group) ? group : [period]);
  return period?.untilDate || null;
}

export function periodCoversDate(period, isoDate, group) {
  const from = period?.sinceDate ?? null;
  if (from != null && from > isoDate) return false;
  const until = effectiveUntil(period, group);
  if (until != null && isoDate >= until) return false;
  return true;
}

export function findPeriodAt(periods, isoDate, group) {
  const sorted = sortPeriods(periods);
  if (!sorted.length) return null;
  if (isoDate == null) return sorted[0];
  const covering = sorted.filter((period) => periodCoversDate(period, isoDate, group || sorted));
  return covering.length ? covering[covering.length - 1] : null;
}

function sortPeriods(periods) {
  if (!Array.isArray(periods)) return [];
  return [...periods].sort((left, right) => {
    if (left.sinceDate === right.sinceDate) return (left.id || 0) - (right.id || 0);
    if (left.sinceDate == null) return -1;
    if (right.sinceDate == null) return 1;
    return left.sinceDate < right.sinceDate ? -1 : 1;
  });
}

export function periodOnDate(periods, sinceDate) {
  const list = Array.isArray(periods) ? periods : [];
  return list.find((period) => period.sinceDate === sinceDate) || findPeriodAt(list, sinceDate);
}

export function boardProductLabel(board) {
  if (!board) return "";
  if (board.product) return `${board.product.brand} ${board.product.model}`;
  const custom = [board.customBrand, board.customModel].filter(Boolean).join(" ");
  return custom || board.geometry?.name || "";
}

export function isKeyboardsSetupEmpty(setup) {
  if (!setup || setup.visible === false) return true;
  for (const rig of setup.rigs || []) {
    const board = currentPeriod(rig.boardPeriods);
    if (!board || board.isGap) continue;
    for (const lane of rig.lanes || []) {
      const period = currentPeriod(lane.periods);
      if (period && Array.isArray(period.keys) && period.keys.length) return false;
    }
  }
  return true;
}
