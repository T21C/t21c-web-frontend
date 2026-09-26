import { resolveKeyAlias, tokenForKey } from "./keys";

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function applyConfig(state, config) {
  if (typeof config.x === "number") state.x += config.x;
  if (typeof config.y === "number") state.y += config.y;
  if (typeof config.w === "number") state.w = config.w;
  if (typeof config.h === "number") state.h = config.h;
  if (typeof config.x2 === "number") state.x2 = config.x2;
  if (typeof config.y2 === "number") state.y2 = config.y2;
  if (typeof config.w2 === "number") state.w2 = config.w2;
  if (typeof config.h2 === "number") state.h2 = config.h2;
}

function legendParts(raw) {
  return raw
    .split("\n")
    .map((part) => part.trim())
    .filter(Boolean);
}

function compactToken(token) {
  return token.trim().toLocaleLowerCase().replace(/\s+/g, "");
}

function resolveLegendToken(token) {
  return resolveKeyAlias(token) ?? resolveKeyAlias(compactToken(token));
}

const NUMPAD_LEGENDS = [
  { base: "7", marks: ["home"], code: "Numpad7" },
  { base: "8", marks: ["up", "↑"], code: "Numpad8" },
  { base: "9", marks: ["pgup", "pageup"], code: "Numpad9" },
  { base: "4", marks: ["left", "←"], code: "Numpad4" },
  { base: "6", marks: ["right", "→"], code: "Numpad6" },
  { base: "1", marks: ["end"], code: "Numpad1" },
  { base: "2", marks: ["down", "↓"], code: "Numpad2" },
  { base: "3", marks: ["pgdn", "pgdown", "pagedown"], code: "Numpad3" },
  { base: "0", marks: ["ins", "insert"], code: "Numpad0" },
  { base: ".", marks: ["del", "delete"], code: "NumpadDecimal" },
];

const SIDE_CODES = {
  shift: ["ShiftLeft", "ShiftRight"],
  ctrl: ["ControlLeft", "ControlRight"],
  control: ["ControlLeft", "ControlRight"],
  win: ["MetaLeft", "MetaRight"],
  windows: ["MetaLeft", "MetaRight"],
  alt: ["AltLeft", "AltRight"],
  "*": ["NumpadMultiply"],
  "+": ["NumpadAdd"],
};

const TWIN_CODE = {};
function pairCodes(left, right) {
  TWIN_CODE[left] = right;
  TWIN_CODE[right] = left;
}
pairCodes("ShiftLeft", "ShiftRight");
pairCodes("ControlLeft", "ControlRight");
pairCodes("AltLeft", "AltRight");
pairCodes("MetaLeft", "MetaRight");
pairCodes("Enter", "NumpadEnter");
pairCodes("Minus", "NumpadSubtract");
pairCodes("Slash", "NumpadDivide");
pairCodes("Period", "NumpadDecimal");
for (let digit = 0; digit <= 9; digit += 1) pairCodes(`Digit${digit}`, `Numpad${digit}`);

function numpadComposite(legends) {
  if (legends.length < 2) return null;
  const parts = new Set(legends.map(compactToken));
  for (const row of NUMPAD_LEGENDS) {
    if (!parts.has(row.base)) continue;
    if (row.marks.some((mark) => parts.has(mark))) return row.code;
  }
  return null;
}

function candidatesForLine(line) {
  const codes = [];
  const aliased = resolveLegendToken(line);
  if (aliased) codes.push(aliased);
  for (const code of SIDE_CODES[compactToken(line)] || []) {
    if (!codes.includes(code)) codes.push(code);
  }
  return codes;
}

function unusedCandidate(legends, used) {
  const matches = [];
  for (let index = legends.length - 1; index >= 0; index -= 1) {
    for (const code of candidatesForLine(legends[index])) {
      if (!matches.includes(code)) matches.push(code);
      if (!used.has(code)) return code;
      const twin = TWIN_CODE[code];
      if (twin && !used.has(twin)) return twin;
    }
  }
  return matches[0] ?? null;
}

function displayLabel(legends) {
  if (!legends.length) return " ";
  return legends.join("\n");
}

function assignKleCodes(items) {
  const used = new Set();
  const claim = (item, code, bindable) => {
    item.code = code;
    item.bindable = bindable;
    item.assigned = true;
    if (bindable) used.add(code);
  };

  for (const item of items) {
    if (item.assigned || item.legends.length < 2) continue;
    const composite = numpadComposite(item.legends);
    if (composite && !used.has(composite)) claim(item, composite, true);
  }

  let custom = 0;
  const claimResolved = (item) => {
    const code = unusedCandidate(item.legends, used);
    if (code) {
      claim(item, code, true);
      return;
    }
    custom += 1;
    claim(item, `Custom${custom}`, false);
  };

  for (const item of items) {
    if (item.assigned || item.legends.length < 2) continue;
    claimResolved(item);
  }
  for (const item of items) {
    if (item.assigned) continue;
    if (!item.legends.length) {
      claim(item, "Space", true);
      continue;
    }
    claimResolved(item);
  }
}

export function importKleLayout(raw) {
  if (!Array.isArray(raw)) {
    throw new Error("KLE data must be an array");
  }
  const state = { x: 0, y: 0, w: 1, h: 1, x2: 0, y2: 0, w2: 0, h2: 0 };
  const drafts = [];

  for (const row of raw) {
    if (isRecord(row)) continue;
    if (!Array.isArray(row)) {
      throw new Error("Each KLE row must be an array");
    }
    state.x = 0;
    state.w = 1;
    state.h = 1;
    state.x2 = 0;
    state.y2 = 0;
    state.w2 = 0;
    state.h2 = 0;

    for (const item of row) {
      if (isRecord(item)) {
        applyConfig(state, item);
        continue;
      }
      if (typeof item !== "string") {
        throw new Error("KLE keys must be strings or config objects");
      }
      drafts.push({
        legends: legendParts(item),
        code: "",
        bindable: false,
        assigned: false,
        x: state.x,
        y: state.y,
        w: state.w,
        h: state.h,
        x2: state.x2,
        y2: state.y2,
        w2: state.w2,
        h2: state.h2,
      });
      state.x += state.w;
      state.w = 1;
      state.h = 1;
      state.x2 = 0;
      state.y2 = 0;
      state.w2 = 0;
      state.h2 = 0;
    }
    state.y += 1;
  }

  if (!drafts.length) {
    throw new Error("KLE data produced no keys");
  }
  assignKleCodes(drafts);
  return drafts.map((draft) => {
    const stored = {
      code: draft.code,
      label: displayLabel(draft.legends),
      x: draft.x,
      y: draft.y,
      w: draft.w,
      h: draft.h,
      bindable: draft.bindable,
    };
    if (draft.w2 || draft.h2) {
      stored.x2 = draft.x2;
      stored.y2 = draft.y2;
      if (draft.w2) stored.w2 = draft.w2;
      if (draft.h2) stored.h2 = draft.h2;
    }
    return stored;
  });
}

function kleNumber(value) {
  return Math.round(value * 1e6) / 1e6;
}

function nearly(left, right) {
  return Math.abs(left - right) < 1e-4;
}

function legendFor(key) {
  const label = String(key.label || "").trim();
  if (key.code === "Space" && !label) return "";
  if (label.includes("\n")) return label;
  const sides = SIDE_CODES[compactToken(label)];
  if (label && sides?.includes(key.code)) return label;
  const token = tokenForKey(key.code);
  if (label && resolveKeyAlias(label) === key.code) return label;
  if (resolveKeyAlias(token) === key.code) {
    if (!label || label === token) return token;
    return `${label}\n${token}`;
  }
  if (resolveKeyAlias(key.code) === key.code) {
    if (!label || label === key.code) return key.code;
    return `${label}\n${key.code}`;
  }
  return label || key.code;
}

export function exportKleLayout(keys) {
  if (!Array.isArray(keys) || !keys.length) return "";
  const sorted = [...keys].sort(
    (left, right) =>
      left.y - right.y ||
      left.x + (left.offsetX || 0) - (right.x + (right.offsetX || 0)),
  );
  const rows = [];
  for (const key of sorted) {
    const current = rows[rows.length - 1];
    if (!current || !nearly(current.y, key.y)) rows.push({ y: key.y, keys: [key] });
    else current.keys.push(key);
  }

  let cursorY = 0;
  const kle = rows.map((row) => {
    const items = [];
    let cursor = 0;
    const yShift = row.y - cursorY;
    row.keys.forEach((key, index) => {
      const x = key.x + (key.offsetX || 0);
      const config = {};
      if (index === 0 && !nearly(yShift, 0)) config.y = kleNumber(yShift);
      if (!nearly(x, cursor)) config.x = kleNumber(x - cursor);
      const w = key.w ?? 1;
      const h = key.h ?? 1;
      if (!nearly(w, 1)) config.w = kleNumber(w);
      if (!nearly(h, 1)) config.h = kleNumber(h);
      if (key.x2) config.x2 = kleNumber(key.x2);
      if (key.y2) config.y2 = kleNumber(key.y2);
      if (key.w2) config.w2 = kleNumber(key.w2);
      if (key.h2) config.h2 = kleNumber(key.h2);
      if (Object.keys(config).length) items.push(config);
      items.push(legendFor(key));
      cursor = x + w;
    });
    cursorY = row.y + 1;
    return items;
  });

  return JSON.stringify(kle, null, 2);
}
