import { rtModeFromFields } from "./keyboardPaint";
import { defaultStemColor, SWITCH_STEMS } from "./SwitchDiagram";

export const ABSENT_SWITCH = "absent";

export function switchClientKey(row) {
  if (row?.id) return `id:${row.id}`;
  return `tmp:${row?.tmpId || "x"}`;
}

export function storedOpacity(value) {
  if (value == null || value === "") return "";
  const n = Number(value);
  return Number.isFinite(n) ? String(n) : "";
}

export function emptySwitchRow() {
  return {
    id: null,
    tmpId: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    absent: false,
    switchId: "",
    customSwitch: "",
    stemColor: "",
    baseColor: "",
    topColor: "",
    baseOpacity: "",
  };
}

function switchFromBoardFields(board) {
  return {
    id: null,
    tmpId: "board",
    absent: Boolean(board?.absent),
    switchId: board?.switchId ? String(board.switchId) : "",
    customSwitch: board?.customSwitch || "",
    stemColor: board?.stemColor || "",
    baseColor: board?.baseColor || "",
    topColor: board?.topColor || "",
    baseOpacity: storedOpacity(board?.baseOpacity),
  };
}

export function switchesFromBoard(board) {
  if (board?.sensing === "membrane") return [];
  if (Array.isArray(board?.switches) && board.switches.length) {
    return board.switches.map((row, index) => ({
      id: row.id ?? null,
      tmpId: row.id ? null : `loaded-${index}`,
      absent: Boolean(row.absent),
      switchId: row.absent ? "" : row.switchId ? String(row.switchId) : "",
      customSwitch: row.absent ? "" : row.customSwitch || "",
      stemColor: row.stemColor || "",
      baseColor: row.baseColor || "",
      topColor: row.topColor || "",
      baseOpacity: storedOpacity(row.baseOpacity),
    }));
  }
  return [switchFromBoardFields(board)];
}

export function keyMetaFromBoard(board, switchList) {
  const byId = new Map();
  switchList.forEach((row) => {
    if (row.id) byId.set(Number(row.id), switchClientKey(row));
  });
  const meta = {};
  for (const row of board?.keyOverrides || []) {
    const entry = {};
    if (row.socketEmpty) entry.socketEmpty = true;
    if (row.switchAbsent) entry.switchKey = ABSENT_SWITCH;
    else if (row.periodSwitchId != null && byId.has(Number(row.periodSwitchId))) {
      entry.switchKey = byId.get(Number(row.periodSwitchId));
    } else if (row.periodSwitchIndex != null && switchList[row.periodSwitchIndex]) {
      entry.switchKey = switchClientKey(switchList[row.periodSwitchIndex]);
    }
    if (row.actuationMm != null) entry.actuationMm = String(row.actuationMm);
    const hasRt =
      row.rapidTriggerSplit != null
      || row.rapidTriggerActuationMm != null
      || row.rapidTriggerPressMm != null
      || row.rapidTriggerReleaseMm != null;
    if (hasRt) {
      if (row.rapidTriggerSplit) entry.rtMode = "split";
      else if (row.rapidTriggerActuationMm != null) entry.rtMode = "single";
      else entry.rtMode = "off";
      if (row.rapidTriggerActuationMm != null) {
        entry.rapidTriggerActuationMm = String(row.rapidTriggerActuationMm);
      }
      if (row.rapidTriggerPressMm != null) {
        entry.rapidTriggerPressMm = String(row.rapidTriggerPressMm);
      }
      if (row.rapidTriggerReleaseMm != null) {
        entry.rapidTriggerReleaseMm = String(row.rapidTriggerReleaseMm);
      }
    }
    if (Object.keys(entry).length) meta[row.code] = entry;
  }
  return meta;
}

export function switchPayload(row) {
  const absent = Boolean(row.absent);
  return {
    id: row.id || null,
    absent,
    switchId: absent || !row.switchId ? null : Number(row.switchId),
    customSwitch: absent || row.switchId ? null : row.customSwitch || null,
    stemColor: absent ? null : row.stemColor || null,
    baseColor: absent ? null : row.baseColor || null,
    topColor: absent ? null : row.topColor || null,
    baseOpacity: absent || row.baseOpacity === "" || row.baseOpacity == null ? null : Number(row.baseOpacity),
  };
}

function optionalNumber(value) {
  if (value === "" || value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function keyOverridesFromDraft(draft, membrane) {
  if (membrane) return [];
  const indexByKey = new Map((draft.switches || []).map((row, index) => [switchClientKey(row), index]));
  const rows = [];
  for (const [code, meta] of Object.entries(draft.keyMeta || {})) {
    if (!meta) continue;
    const switchAbsent = meta.switchKey === ABSENT_SWITCH;
    const periodSwitchIndex = !switchAbsent && meta.switchKey
      ? indexByKey.get(meta.switchKey) ?? null
      : null;
    const actuationMm = optionalNumber(meta.actuationMm);
    let rapidTriggerSplit = null;
    let rapidTriggerActuationMm = null;
    let rapidTriggerPressMm = null;
    let rapidTriggerReleaseMm = null;
    if (meta.rtMode === "off") {
      rapidTriggerSplit = false;
    } else if (meta.rtMode === "single") {
      rapidTriggerSplit = false;
      rapidTriggerActuationMm = optionalNumber(meta.rapidTriggerActuationMm);
    } else if (meta.rtMode === "split") {
      rapidTriggerSplit = true;
      rapidTriggerPressMm = optionalNumber(meta.rapidTriggerPressMm);
      rapidTriggerReleaseMm = optionalNumber(meta.rapidTriggerReleaseMm);
    }
    const has =
      Boolean(meta.socketEmpty)
      || switchAbsent
      || periodSwitchIndex != null
      || actuationMm != null
      || rapidTriggerSplit != null;
    if (!has) continue;
    rows.push({
      code,
      socketEmpty: Boolean(meta.socketEmpty),
      switchAbsent,
      periodSwitchIndex,
      actuationMm,
      rapidTriggerSplit,
      rapidTriggerActuationMm,
      rapidTriggerPressMm,
      rapidTriggerReleaseMm,
    });
  }
  return rows;
}

function sameValue(left, right) {
  return String(left ?? "") === String(right ?? "");
}

export function sameSwitchLists(draftSwitches, board) {
  const seeded = switchesFromBoard(board).map(switchPayload);
  const current = (draftSwitches || []).map(switchPayload);
  if (seeded.length !== current.length) return false;
  return seeded.every((row, index) => (
    sameValue(row.absent, current[index].absent)
    && sameValue(row.switchId, current[index].switchId)
    && sameValue(row.customSwitch, current[index].customSwitch)
    && sameValue(row.stemColor, current[index].stemColor)
    && sameValue(row.baseColor, current[index].baseColor)
    && sameValue(row.topColor, current[index].topColor)
    && sameValue(row.baseOpacity, current[index].baseOpacity)
  ));
}

export function sameKeyOverrides(draft, board, membrane) {
  const current = keyOverridesFromDraft(draft, membrane);
  const previous = membrane ? [] : (board?.keyOverrides || []).map((row) => ({
    code: row.code,
    socketEmpty: Boolean(row.socketEmpty),
    switchAbsent: Boolean(row.switchAbsent),
    periodSwitchIndex: row.switchAbsent ? null : row.periodSwitchIndex ?? null,
    actuationMm: row.actuationMm ?? null,
    rapidTriggerSplit: row.rapidTriggerSplit ?? null,
    rapidTriggerActuationMm: row.rapidTriggerActuationMm ?? null,
    rapidTriggerPressMm: row.rapidTriggerPressMm ?? null,
    rapidTriggerReleaseMm: row.rapidTriggerReleaseMm ?? null,
  }));
  if (current.length !== previous.length) return false;
  const byCode = new Map(previous.map((row) => [row.code, row]));
  return current.every((row) => {
    const match = byCode.get(row.code);
    if (!match) return false;
    return (
      row.socketEmpty === match.socketEmpty
      && row.switchAbsent === match.switchAbsent
      && sameValue(row.periodSwitchIndex, match.periodSwitchIndex)
      && sameValue(row.actuationMm, match.actuationMm)
      && sameValue(row.rapidTriggerSplit, match.rapidTriggerSplit)
      && sameValue(row.rapidTriggerActuationMm, match.rapidTriggerActuationMm)
      && sameValue(row.rapidTriggerPressMm, match.rapidTriggerPressMm)
      && sameValue(row.rapidTriggerReleaseMm, match.rapidTriggerReleaseMm)
    );
  });
}

export function resolvedStemColor(switchRow, catalogSwitches, fallback) {
  if (switchRow?.stemColor) return switchRow.stemColor;
  const cat = (catalogSwitches || []).find((row) => String(row.id) === String(switchRow?.switchId));
  return cat?.stemColor || fallback || "";
}

export function switchPaintColor(switchRow, catalogSwitches) {
  const explicit = resolvedStemColor(switchRow, catalogSwitches, "");
  if (explicit) return explicit;
  const cat = (catalogSwitches || []).find((row) => String(row.id) === String(switchRow?.switchId));
  const stem = switchRow?.stem || switchRow?.switch?.stem || cat?.stem;
  if (SWITCH_STEMS.includes(stem)) return defaultStemColor(stem);
  return "#b0b4ba";
}

const SWITCH_TOP_BASE = "#1a1a1a";

function paintHex(value) {
  return typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value) ? value : "";
}

export function switchTopPaint(switchRow, catalogSwitches) {
  if (switchRow?.absent) return { absent: true };
  const cat = switchRow?.switch?.id != null
    ? switchRow.switch
    : (catalogSwitches || []).find((row) => String(row.id) === String(switchRow?.switchId));
  const base = paintHex(switchRow?.baseColor) || paintHex(cat?.baseColor) || SWITCH_TOP_BASE;
  const top = paintHex(switchRow?.topColor) || paintHex(cat?.topColor) || base;
  const rawOpacity = switchRow?.baseOpacity === "" || switchRow?.baseOpacity == null
    ? cat?.baseOpacity
    : switchRow.baseOpacity;
  const opacity = Number.isFinite(Number(rawOpacity)) ? Math.min(1, Math.max(0, Number(rawOpacity))) : 1;
  return {
    base,
    top,
    stem: switchPaintColor(switchRow, catalogSwitches),
    opacity,
  };
}

export function layoutSource(board, setup) {
  if (!board) return board;
  if (!setup || board.sensing === "membrane") return board;
  return {
    ...board,
    sensing: board.sensing,
    switchId: setup.switchId ?? null,
    customSwitch: setup.customSwitch ?? null,
    actuationMm: setup.actuationMm ?? null,
    rapidTriggerSplit: Boolean(setup.rapidTriggerSplit),
    rapidTriggerActuationMm: setup.rapidTriggerActuationMm ?? null,
    rapidTriggerPressMm: setup.rapidTriggerPressMm ?? null,
    rapidTriggerReleaseMm: setup.rapidTriggerReleaseMm ?? null,
    stemColor: setup.stemColor ?? null,
    baseColor: setup.baseColor ?? null,
    topColor: setup.topColor ?? null,
    baseOpacity: setup.baseOpacity ?? null,
    switches: Array.isArray(setup.switches) ? setup.switches : [],
    keyOverrides: Array.isArray(setup.keyOverrides) ? setup.keyOverrides : [],
  };
}

export function draftSliceFromSource(source) {
  const membrane = source?.sensing === "membrane";
  const switchList = switchesFromBoard(source);
  return {
    switches: switchList,
    keyMeta: keyMetaFromBoard(source, switchList),
    switchId: membrane ? "" : source?.switchId ? String(source.switchId) : "",
    customSwitch: membrane ? "" : source?.customSwitch || "",
    actuationMm: membrane ? "" : source?.actuationMm ?? "",
    rtMode: rtModeFromFields(null, source),
    rapidTriggerActuationMm: source?.rapidTriggerActuationMm ?? "",
    rapidTriggerPressMm: source?.rapidTriggerPressMm ?? "",
    rapidTriggerReleaseMm: source?.rapidTriggerReleaseMm ?? "",
    stemColor: membrane ? "" : source?.stemColor || "",
    baseColor: membrane ? "" : source?.baseColor || "",
    topColor: membrane ? "" : source?.topColor || "",
    baseOpacity: membrane ? "" : storedOpacity(source?.baseOpacity),
  };
}

export function layoutSetupFromDraft(draft) {
  const membrane = draft?.sensing === "membrane";
  const hall = draft?.sensing === "hall";
  return {
    switches: membrane ? [] : (draft.switches || []).map((row) => {
      const payload = switchPayload(row);
      return { ...payload, id: null };
    }),
    keyOverrides: keyOverridesFromDraft(draft, membrane),
    switchId: membrane || !draft.switchId ? null : Number(draft.switchId),
    customSwitch: membrane || draft.switchId ? null : draft.customSwitch || null,
    actuationMm: membrane ? null : optionalNumber(draft.actuationMm),
    rapidTriggerSplit: !membrane && hall && draft.rtMode === "split",
    rapidTriggerActuationMm:
      !membrane && hall && draft.rtMode === "single" ? optionalNumber(draft.rapidTriggerActuationMm) : null,
    rapidTriggerPressMm:
      !membrane && hall && draft.rtMode === "split" ? optionalNumber(draft.rapidTriggerPressMm) : null,
    rapidTriggerReleaseMm:
      !membrane && hall && draft.rtMode === "split" ? optionalNumber(draft.rapidTriggerReleaseMm) : null,
    stemColor: membrane ? null : draft.stemColor || null,
    baseColor: membrane ? null : draft.baseColor || null,
    topColor: membrane ? null : draft.topColor || null,
    baseOpacity: membrane ? null : optionalNumber(draft.baseOpacity),
  };
}

export function layoutSetupFromBoard(board) {
  return layoutSetupFromDraft({
    ...draftSliceFromSource(board),
    sensing: board?.sensing || "mechanical",
  });
}

export function sameLayoutSetup(setup, source, sensing) {
  const host = { ...(source || {}), sensing: sensing || source?.sensing || "mechanical" };
  const left = draftSliceFromSource(setup ? layoutSource(host, setup) : host);
  const right = draftSliceFromSource(source ? { ...source, sensing: host.sensing } : host);
  const membrane = host.sensing === "membrane";
  if (!sameSwitchLists(left.switches, source ? { ...source, sensing: host.sensing } : host)) return false;
  if (!sameKeyOverrides({ ...left, sensing: host.sensing }, source ? { ...source, sensing: host.sensing } : host, membrane)) {
    return false;
  }
  const fields = [
    "switchId",
    "customSwitch",
    "actuationMm",
    "rtMode",
    "rapidTriggerActuationMm",
    "rapidTriggerPressMm",
    "rapidTriggerReleaseMm",
    "stemColor",
    "baseColor",
    "topColor",
    "baseOpacity",
  ];
  return fields.every((key) => String(left[key] ?? "") === String(right[key] ?? ""));
}
