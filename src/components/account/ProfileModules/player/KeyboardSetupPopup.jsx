import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import { PopupShell } from "@/components/common/PopupShell";
import { useUnsavedClose } from "@/hooks/useUnsavedClose";
import { CloseButton } from "@/components/common/buttons";
import { CopyIcon, ImportIcon, PencilIcon, TrashIcon } from "@/components/common/icons";
import { CustomSelect, StateDisplay } from "@/components/common/selectors";
import api from "@/utils/api";
import { routes } from "@/api/routes";
import KeyboardBoard from "./KeyboardBoard";
import SwitchDiagram from "./SwitchDiagram";
import {
  canonicalizeKeys,
  currentPeriod,
  findPeriodAt,
  formatKeybind,
  parseKeybindText,
  periodCoversDate,
  periodOnDate,
} from "@/utils/keyboards/keys";

function utcToday() {
  return new Date().toISOString().slice(0, 10);
}

function rtModeFromBoard(board) {
  if (!board || board.sensing !== "hall") return "off";
  if (board.rapidTriggerSplit) return "split";
  if (board.rapidTriggerActuationMm != null) return "single";
  return "off";
}

const COUNT_LAYOUT_NAME = /^[0-9]+K$/;
const MAX_LAYOUTS = 12;
const ADD_LAYOUT = "__add__";
const SNAPSHOT_KIND = "tuf.keyboard-rig";

function laneClientKey(row) {
  if (row?.id) return `id:${row.id}`;
  return `tmp:${row?.tmpId}`;
}

function nameTracksCount(name) {
  return COUNT_LAYOUT_NAME.test(String(name ?? "").trim());
}

function savedLayoutName(name, keyCount) {
  const trimmed = String(name ?? "").trim();
  if (!trimmed || COUNT_LAYOUT_NAME.test(trimmed)) return `${keyCount}K`;
  return trimmed.slice(0, 32);
}

function withCurrentLane(prev, patch) {
  const lanes = (prev.lanes || []).map((row) =>
    laneClientKey(row) === prev.laneKey ? { ...row, ...patch } : row,
  );
  return { ...prev, ...patch, lanes };
}

function rangeFrom(period) {
  const untilAuto = period?.untilAuto !== false;
  return {
    untilDate: untilAuto ? null : period?.untilDate || "",
    untilAuto,
  };
}

function keyedPeriods(periods) {
  return (periods || []).filter((period) => !period.isGap && Array.isArray(period.keys) && period.keys.length);
}

function sameRigKeyCount(lanes, count) {
  return (lanes || []).flatMap((row) =>
    keyedPeriods(row?.periods).filter((period) => period.keys.length === count),
  );
}

function periodForLane(row, lanes, sinceDate, selected) {
  const periods = keyedPeriods(row?.periods);
  if (selected && sinceDate) {
    const exact = periods.find((period) => sameDate(period.sinceDate, sinceDate));
    if (exact) return exact;
  }
  const today = utcToday();
  const covering = periods.filter((period) =>
    periodCoversDate(period, today, sameRigKeyCount(lanes, period.keys.length)),
  );
  return currentPeriod(covering) || currentPeriod(periods);
}

function visibleBrandModel(board) {
  if (board?.product?.brand || board?.product?.model) {
    return {
      brand: board.product.brand || "",
      model: board.product.model || "",
    };
  }
  return {
    brand: board?.customBrand || "",
    model: board?.customModel || "",
  };
}

function draftFromRig(rig, geometries, sinceDate, laneId) {
  const rigLanes = rig?.lanes || [];
  const boards = (rig?.boardPeriods || []).filter((period) => !period.isGap);
  const board = findPeriodAt(boards, utcToday()) || currentPeriod(boards) || periodOnDate(rig?.boardPeriods || [], sinceDate);
  const lanes = rigLanes.map((row) => {
    const selectedLane = Boolean(laneId) && row.id === laneId;
    const period = periodForLane(row, rigLanes, sinceDate, selectedLane);
    const keys = canonicalizeKeys(period?.keys || []);
    const keyCount = keys.length || row.keyCount || 0;
    const range = rangeFrom(period);
    return {
      id: row.id,
      tmpId: null,
      periodId: period?.id ?? null,
      keyCount,
      name: row.name || `${keyCount}K`,
      keys,
      sinceDate: period?.sinceDate ?? (selectedLane ? sinceDate || null : null),
      untilDate: range.untilDate,
      untilAuto: range.untilAuto,
    };
  });
  if (!lanes.length) {
    lanes.push({
      id: null,
      tmpId: "base",
      periodId: null,
      keyCount: 0,
      name: "0K",
      keys: [],
      sinceDate: sinceDate || utcToday(),
      untilDate: "",
      untilAuto: true,
    });
  }
  const selected = lanes.find((row) => laneId && row.id === laneId) || lanes[lanes.length - 1];
  const boardRange = rangeFrom(board);
  const names = visibleBrandModel(board);
  return {
    sinceDate: selected.sinceDate ?? sinceDate ?? utcToday(),
    untilDate: selected.untilDate || "",
    untilAuto: selected.untilAuto !== false,
    geometryId: board?.geometryId ? String(board.geometryId) : geometries[0] ? String(geometries[0].id) : "",
    productId: "",
    customBrand: names.brand,
    customModel: names.model,
    sensing: board?.sensing || "mechanical",
    switchId: board?.switchId ? String(board.switchId) : "",
    customSwitch: board?.customSwitch || "",
    actuationMm: board?.actuationMm ?? "",
    rtMode: rtModeFromBoard(board),
    rapidTriggerActuationMm: board?.rapidTriggerActuationMm ?? "",
    rapidTriggerPressMm: board?.rapidTriggerPressMm ?? "",
    rapidTriggerReleaseMm: board?.rapidTriggerReleaseMm ?? "",
    colorway: board?.colorway || "",
    note: board?.note || "",
    stemColor: board?.stemColor || "",
    baseColor: board?.baseColor || "",
    topColor: board?.topColor || "",
    boardPeriodId: board?.id ?? null,
    boardSinceDate: board?.sinceDate || "",
    boardUntilDate: boardRange.untilDate || "",
    boardUntilAuto: boardRange.untilAuto,
    rigName: rig?.name || "",
    laneKey: laneClientKey(selected),
    name: selected.name,
    keyCount: selected.keyCount,
    keys: selected.keys,
    lanes,
  };
}

function laneMatchesSaved(row, rig) {
  const keys = canonicalizeKeys(row?.keys || []);
  if (!row?.id) return keys.length === 0;
  const saved = (rig?.lanes || []).find((lane) => lane.id === row.id);
  if (!saved) return false;
  const keyed = keyedPeriods(saved.periods);
  const period = row.periodId
    ? keyed.find((item) => item.id === row.periodId)
    : keyed.find((item) => sameDate(item.sinceDate, row.sinceDate));
  if (!period || !sameDate(period.sinceDate, row.sinceDate)) return false;
  const savedKeys = canonicalizeKeys(period.keys || []);
  if (savedKeys.join("\u001f") !== keys.join("\u001f")) return false;
  if (savedLayoutName(saved.name, savedKeys.length) !== savedLayoutName(row.name, keys.length)) return false;
  const savedRange = rangeFrom(period);
  const rowAuto = row.untilAuto !== false;
  if (savedRange.untilAuto !== rowAuto) return false;
  return sameDate(savedRange.untilDate || null, rowAuto ? null : row.untilDate || null);
}

function sensingOf(draft, switches) {
  const selected = (switches || []).find((row) => String(row.id) === String(draft.switchId));
  return selected?.sensing || draft.sensing || "mechanical";
}

function sameDate(left, right) {
  return (left || null) === (right || null);
}

function boardFields(period) {
  const names = visibleBrandModel(period);
  return {
    sinceDate: period?.sinceDate ?? null,
    untilDate: period?.untilAuto === false ? period?.untilDate ?? null : null,
    untilAuto: period?.untilAuto !== false,
    isGap: Boolean(period?.isGap),
    geometryId: period?.geometryId ?? null,
    productId: null,
    customBrand: names.brand || null,
    customModel: names.model || null,
    sensing: period?.sensing || null,
    switchId: period?.switchId ?? null,
    customSwitch: period?.customSwitch || null,
    actuationMm: period?.actuationMm ?? null,
    rapidTriggerSplit: Boolean(period?.rapidTriggerSplit),
    rapidTriggerActuationMm: period?.rapidTriggerActuationMm ?? null,
    rapidTriggerPressMm: period?.rapidTriggerPressMm ?? null,
    rapidTriggerReleaseMm: period?.rapidTriggerReleaseMm ?? null,
    colorway: period?.colorway || null,
    note: period?.note || null,
    stemColor: period?.stemColor || null,
    baseColor: period?.baseColor || null,
    topColor: period?.topColor || null,
    keyOverrides: (period?.keyOverrides || []).map((row) => ({
      code: row.code,
      socketEmpty: Boolean(row.socketEmpty),
      switchId: row.switchId ?? null,
      customSwitch: row.customSwitch || null,
    })),
  };
}

function draftBoardFields(draft, sensing, previous) {
  const hall = sensing === "hall";
  return {
    sinceDate: draft.boardSinceDate || null,
    untilDate: draft.boardUntilAuto !== false ? null : draft.boardUntilDate || null,
    untilAuto: draft.boardUntilAuto !== false,
    isGap: false,
    geometryId: Number(draft.geometryId) || null,
    productId: null,
    customBrand: draft.customBrand || null,
    customModel: draft.customModel || null,
    sensing,
    switchId: draft.switchId ? Number(draft.switchId) : null,
    customSwitch: draft.switchId ? null : draft.customSwitch || null,
    actuationMm: draft.actuationMm === "" ? null : Number(draft.actuationMm),
    rapidTriggerSplit: hall && draft.rtMode === "split",
    rapidTriggerActuationMm:
      hall && draft.rtMode === "single" && draft.rapidTriggerActuationMm !== ""
        ? Number(draft.rapidTriggerActuationMm)
        : null,
    rapidTriggerPressMm:
      hall && draft.rtMode === "split" && draft.rapidTriggerPressMm !== ""
        ? Number(draft.rapidTriggerPressMm)
        : null,
    rapidTriggerReleaseMm:
      hall && draft.rtMode === "split" && draft.rapidTriggerReleaseMm !== ""
        ? Number(draft.rapidTriggerReleaseMm)
        : null,
    colorway: draft.colorway || null,
    note: draft.note || null,
    stemColor: draft.stemColor || null,
    baseColor: draft.baseColor || null,
    topColor: draft.topColor || null,
    keyOverrides: previous?.keyOverrides || [],
  };
}

function persistedSnapshot(rig) {
  return {
    kind: SNAPSHOT_KIND,
    version: 1,
    name: String(rig?.name || "").trim() || null,
    boardPeriods: (rig?.boardPeriods || []).map(boardFields),
    lanes: (rig?.lanes || []).map((lane) => ({
      name: lane.name || null,
      periods: (lane.periods || []).map((period) => ({
        sinceDate: period.sinceDate ?? null,
        untilDate: period.untilAuto === false ? period.untilDate ?? null : null,
        untilAuto: period.untilAuto !== false,
        keys: period.isGap || period.keys == null ? null : canonicalizeKeys(period.keys),
      })),
    })),
  };
}

function copyTextFallback(text) {
  const input = document.createElement("textarea");
  input.value = text;
  input.setAttribute("readonly", "");
  input.style.position = "fixed";
  input.style.left = "-9999px";
  document.body.appendChild(input);
  input.select();
  const ok = document.execCommand("copy");
  document.body.removeChild(input);
  if (!ok) throw new Error("copy failed");
}

function buildSnapshot(rig, draft, sensing, includeDraft) {
  const snapshot = persistedSnapshot(rig);
  snapshot.name = String(draft.rigName || "").trim() || null;
  if (!includeDraft) return snapshot;
  const boards = (rig?.boardPeriods || []).filter((period) => !period.isGap);
  const board = boards.find((period) => period.id === draft.boardPeriodId)
    || currentPeriod(boards);
  const boardDateMoved = Boolean(board) && !sameDate(draft.boardSinceDate, board.sinceDate);
  const boardRangeMoved = Boolean(board) && (
    (draft.boardUntilAuto !== false) !== (board.untilAuto !== false)
    || !sameDate(draft.boardUntilAuto !== false ? null : draft.boardUntilDate, board.untilDate)
  );
  if (!board || boardSpecChanged(draft, board, sensing) || boardDateMoved || boardRangeMoved) {
    const previousSince = board?.sinceDate ?? null;
    const since = draft.boardSinceDate || null;
    const previous = board ? boardFields(board) : null;
    snapshot.boardPeriods = snapshot.boardPeriods.filter(
      (period) => !sameDate(period.sinceDate, previousSince) && !sameDate(period.sinceDate, since),
    );
    snapshot.boardPeriods.push({ ...draftBoardFields(draft, sensing, previous), sinceDate: since });
  }
  snapshot.lanes = (draft.lanes || []).flatMap((row) => {
    const keys = canonicalizeKeys(row.keys || []);
    const since = row.sinceDate || null;
    const saved = row.id ? (rig?.lanes || []).find((lane) => lane.id === row.id) : null;
    const periods = (saved?.periods || [])
      .filter((period) => period.id !== row.periodId && !sameDate(period.sinceDate, since))
      .map((period) => ({
        sinceDate: period.sinceDate ?? null,
        untilDate: period.untilAuto === false ? period.untilDate ?? null : null,
        untilAuto: period.untilAuto !== false,
        keys: period.isGap || period.keys == null ? null : canonicalizeKeys(period.keys),
      }));
    if (keys.length) {
      periods.push({
        sinceDate: since,
        untilDate: row.untilAuto !== false ? null : row.untilDate || null,
        untilAuto: row.untilAuto !== false,
        keys,
      });
    }
    if (!periods.some((period) => period.keys && period.keys.length)) return [];
    return [{ name: savedLayoutName(row.name, keys.length || saved?.keyCount || 0), periods }];
  });
  return snapshot;
}

function boardSpecChanged(draft, board, sensing) {
  if (!board || board.isGap) return true;
  const same = (left, right) => String(left ?? "") === String(right ?? "");
  const names = visibleBrandModel(board);
  return !(
    same(draft.geometryId, board.geometryId) &&
    same(draft.customBrand, names.brand) &&
    same(draft.customModel, names.model) &&
    same(sensing, board.sensing) &&
    same(draft.switchId, board.switchId) &&
    same(draft.customSwitch, board.customSwitch) &&
    same(draft.actuationMm, board.actuationMm) &&
    same(draft.rtMode, rtModeFromBoard(board)) &&
    same(draft.rapidTriggerActuationMm, board.rapidTriggerActuationMm) &&
    same(draft.rapidTriggerPressMm, board.rapidTriggerPressMm) &&
    same(draft.rapidTriggerReleaseMm, board.rapidTriggerReleaseMm) &&
    same(draft.colorway, board.colorway) &&
    same(draft.note, board.note) &&
    same(draft.stemColor, board.stemColor) &&
    same(draft.baseColor, board.baseColor) &&
    same(draft.topColor, board.topColor) &&
    same(draft.boardUntilAuto !== false, board.untilAuto !== false) &&
    same(draft.boardUntilAuto !== false ? null : draft.boardUntilDate, board.untilDate)
  );
}

function SinceRangeField({ label, from, until, untilAuto, onFrom, onUntil, fromLabel, toLabel, autoLabel }) {
  return (
    <label className="keyboard-setup__field keyboard-setup__since-field">
      <span>{label}</span>
      <div className="keyboard-setup__since-range">
        <input
          type="date"
          aria-label={fromLabel}
          value={from || ""}
          onChange={(event) => onFrom(event.target.value || null)}
        />
        <input
          type="date"
          aria-label={toLabel}
          title={untilAuto ? autoLabel : undefined}
          placeholder={autoLabel}
          value={untilAuto ? "" : until || ""}
          onChange={(event) => onUntil(event.target.value || null)}
        />
      </div>
    </label>
  );
}

export default function KeyboardSetupPopup({
  rig,
  catalog,
  initialSince,
  initialLaneId,
  onClose,
  onSaved,
  onRigChange,
  onDeleted,
  onDuplicated,
}) {
  const { t } = useTranslation(["pages", "common"]);
  const geometries = catalog?.geometries || [];
  const switches = catalog?.switches || [];
  const formFactors = catalog?.formFactors || [];
  const [saving, setSaving] = useState(false);
  const [deletingRig, setDeletingRig] = useState(false);
  const [importing, setImporting] = useState(false);
  const [pendingImport, setPendingImport] = useState(null);
  const [renaming, setRenaming] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [deletingLayout, setDeletingLayout] = useState(false);
  const [draft, setDraft] = useState(() =>
    draftFromRig(rig, geometries, initialSince ?? null, initialLaneId),
  );
  const [paste, setPaste] = useState(() =>
    formatKeybind(draftFromRig(rig, geometries, initialSince ?? null, initialLaneId).keys),
  );

  const geometryOptions = geometries.map((row) => ({
    value: String(row.id),
    label: `${row.name} (${formFactors.find((factor) => factor.slug === row.formFactor)?.name || row.formFactor})`,
  }));
  const switchOptions = [
    { value: "", label: t("profile.keyboards.customSwitch") },
    ...switches.map((row) => ({ value: String(row.id), label: row.name })),
  ];
  const selectedSwitch = switches.find((row) => String(row.id) === String(draft.switchId)) || null;
  const sensingOptions = [
    { value: "mechanical", label: t("profile.keyboards.sensing.mechanical") },
    { value: "optical", label: t("profile.keyboards.sensing.optical") },
    { value: "hall", label: t("profile.keyboards.sensing.hall") },
    { value: "other", label: t("profile.keyboards.sensing.other") },
  ];
  const laneOptions = [
    ...(draft.lanes || []).map((row) => ({
      value: laneClientKey(row),
      label: String(row.name || "").trim() || `${row.keyCount}K`,
    })),
    {
      value: ADD_LAYOUT,
      label: t("profile.keyboards.addNew"),
      isDisabled: (draft.lanes || []).length >= MAX_LAYOUTS,
    },
  ];
  const draftGeometry = geometries.find((row) => String(row.id) === String(draft.geometryId));
  const effectiveSensing = selectedSwitch?.sensing || draft.sensing || "mechanical";
  const showRapid = effectiveSensing === "hall";
  const savedBoard = (rig?.boardPeriods || []).find((period) => period.id === draft.boardPeriodId && !period.isGap)
    || currentPeriod((rig?.boardPeriods || []).filter((period) => !period.isGap));
  const nameDirty = String(draft.rigName || "").trim() !== String(rig?.name || "").trim();
  const bodyDirty = useMemo(() => {
    if (!sameDate(draft.boardSinceDate, savedBoard?.sinceDate ?? null)) return true;
    if (savedBoard && boardSpecChanged(draft, savedBoard, sensingOf(draft, switches))) return true;
    if ((draft.lanes || []).some((row) => !laneMatchesSaved(row, rig))) return true;
    if (paste !== formatKeybind(draft.keys)) return true;
    if (!renaming) return false;
    const keyCount = canonicalizeKeys(draft.keys).length;
    return savedLayoutName(nameDraft, keyCount) !== savedLayoutName(draft.name, keyCount);
  }, [draft, savedBoard, rig, switches, paste, renaming, nameDraft]);
  const isDirty = bodyDirty || nameDirty;
  const busy = saving || deletingRig || importing || deletingLayout;
  const { requestClose } = useUnsavedClose({ isDirty, onClose });

  function selectLane(nextKey) {
    if (nextKey === ADD_LAYOUT) {
      addLayout();
      return;
    }
    if (nextKey === draft.laneKey) return;
    const row = (draft.lanes || []).find((item) => laneClientKey(item) === nextKey);
    if (!row) return;
    const keys = canonicalizeKeys(row.keys || []);
    setDraft((prev) => ({
      ...prev,
      laneKey: nextKey,
      name: row.name,
      keyCount: row.keyCount,
      keys,
      periodId: row.periodId ?? null,
      sinceDate: row.sinceDate || null,
      untilDate: row.untilDate || "",
      untilAuto: row.untilAuto !== false,
    }));
    setPaste(formatKeybind(keys));
  }

  function applyKeySelection(keys) {
    const nextKeys = canonicalizeKeys(keys);
    const keyCount = nextKeys.length;
    setDraft((prev) => {
      const name = nameTracksCount(prev.name) ? `${keyCount}K` : prev.name;
      return withCurrentLane(prev, { keys: nextKeys, keyCount, name });
    });
    setPaste(formatKeybind(nextKeys));
  }

  function addLayout() {
    if ((draft.lanes || []).length >= MAX_LAYOUTS) return;
    const tmpId = `new-${Date.now()}`;
    const row = { id: null, tmpId, periodId: null, keyCount: 0, name: "0K", keys: [], sinceDate: utcToday(), untilDate: "", untilAuto: true };
    const laneKey = laneClientKey(row);
    setRenaming(false);
    setDraft((prev) => ({
      ...prev,
      lanes: [...(prev.lanes || []), row],
      laneKey,
      name: row.name,
      keyCount: 0,
      keys: [],
      sinceDate: row.sinceDate,
      untilDate: "",
      untilAuto: true,
    }));
    setPaste("");
  }

  function startRename() {
    if (!draft.laneKey) return;
    setNameDraft(draft.name || "");
    setRenaming(true);
  }

  function saveLayoutName() {
    const keyCount = canonicalizeKeys(draft.keys).length;
    const name = savedLayoutName(nameDraft, keyCount);
    setDraft((prev) => withCurrentLane(prev, { name }));
    setRenaming(false);
  }

  function dropLayout(laneKey) {
    const lanes = (draft.lanes || []).filter((row) => laneClientKey(row) !== laneKey);
    const fallback = lanes[lanes.length - 1] || null;
    const keys = canonicalizeKeys(fallback?.keys || []);
    setDraft((prev) => ({
      ...prev,
      lanes: (prev.lanes || []).filter((row) => laneClientKey(row) !== laneKey),
      laneKey: fallback ? laneClientKey(fallback) : null,
      name: fallback?.name || "",
      keyCount: fallback?.keyCount || 0,
      keys,
      periodId: fallback?.periodId ?? null,
      sinceDate: fallback?.sinceDate || null,
      untilDate: fallback?.untilDate || "",
      untilAuto: fallback?.untilAuto !== false,
    }));
    setPaste(formatKeybind(keys));
    setRenaming(false);
  }

  async function deleteLayout() {
    const current = (draft.lanes || []).find((row) => laneClientKey(row) === draft.laneKey);
    if (!current || deletingLayout) return;
    if (!window.confirm(t("profile.keyboards.deleteLayout"))) return;
    const laneKey = laneClientKey(current);
    if (!current.id) {
      dropLayout(laneKey);
      return;
    }
    setDeletingLayout(true);
    const toastId = toast.loading(t("buttons.deleting", { ns: "common" }));
    try {
      const { data } = await api.delete(routes.playersV3.meKeyboardLane(current.id));
      dropLayout(laneKey);
      onRigChange?.(data);
      toast.success(t("profile.keyboards.layoutDeleted"), { id: toastId });
    } catch (err) {
      toast.error(err.response?.data?.error || t("profile.keyboards.saveError"), { id: toastId });
    } finally {
      setDeletingLayout(false);
    }
  }

  function toggleDraftKey(code) {
    const has = draft.keys.includes(code);
    const keys = has ? draft.keys.filter((item) => item !== code) : [...draft.keys, code];
    applyKeySelection(keys);
  }

  function applyPaste() {
    const parsed = parseKeybindText(paste);
    applyKeySelection(parsed.keys);
    if (parsed.unknownTokens.length) {
      toast.error(t("profile.keyboards.unknownKeys", { keys: parsed.unknownTokens.join(", ") }));
    }
  }

  function setLayoutSince(sinceDate) {
    const nextDate = sinceDate || null;
    if (sameDate(nextDate, draft.sinceDate)) return;
    const current = (draft.lanes || []).find((row) => laneClientKey(row) === draft.laneKey);
    if (!current) {
      setDraft((prev) => ({ ...prev, sinceDate: nextDate }));
      return;
    }
    const saved = current.id ? (rig?.lanes || []).find((lane) => lane.id === current.id) : null;
    const exact = keyedPeriods(saved?.periods).find((period) => sameDate(period.sinceDate, nextDate));
    if (exact) {
      const keys = canonicalizeKeys(exact.keys || []);
      const currentKeys = canonicalizeKeys(current.keys || []);
      if (keys.join("\u001f") !== currentKeys.join("\u001f") && !laneMatchesSaved(current, rig)) {
        if (!window.confirm(t("confirmations.unsavedChanges", { ns: "common" }))) return;
      }
      const keyCount = keys.length;
      const name = nameTracksCount(current.name) ? `${keyCount}K` : current.name;
      const range = rangeFrom(exact);
      setDraft((prev) => withCurrentLane(prev, {
        periodId: exact.id,
        sinceDate: nextDate,
        untilDate: range.untilDate,
        untilAuto: range.untilAuto,
        keys,
        keyCount,
        name,
      }));
      setPaste(formatKeybind(keys));
      return;
    }
    setDraft((prev) => withCurrentLane(prev, { sinceDate: nextDate, untilDate: "", untilAuto: true }));
  }

  function setLayoutUntil(untilDate) {
    if (!untilDate) {
      setDraft((prev) => withCurrentLane(prev, { untilDate: "", untilAuto: true }));
      return;
    }
    setDraft((prev) => withCurrentLane(prev, { untilDate, untilAuto: false }));
  }

  async function saveRevision() {
    setSaving(true);
    const toastId = toast.loading(t("loading.saving", { ns: "common" }));
    try {
      const currentBoard = (rig?.boardPeriods || []).find((period) => period.id === draft.boardPeriodId && !period.isGap)
        || currentPeriod((rig?.boardPeriods || []).filter((period) => !period.isGap));
      const boardDateMoved = !sameDate(draft.boardSinceDate, currentBoard?.sinceDate ?? null);
      const skipBoard = Boolean(currentBoard) && !boardSpecChanged(draft, currentBoard, effectiveSensing) && !boardDateMoved;
      const hall = effectiveSensing === "hall";
      const lanePayload = (draft.lanes || []).flatMap((row) => {
        const keys = canonicalizeKeys(row.keys || []);
        if (!keys.length) return [];
        const untilAuto = row.untilAuto !== false;
        return [{
          id: row.id || null,
          periodId: row.periodId || null,
          name: savedLayoutName(row.name, keys.length),
          keyCount: keys.length,
          keys,
          sinceDate: row.sinceDate || null,
          untilDate: untilAuto ? null : row.untilDate || null,
          untilAuto,
        }];
      });
      const boardUntilAuto = draft.boardUntilAuto !== false;
      const { data } = await api.post(routes.playersV3.meKeyboardRevision(rig.id), {
        name: String(draft.rigName || "").trim() || null,
        sinceDate: draft.boardSinceDate || null,
        untilDate: boardUntilAuto ? null : draft.boardUntilDate || null,
        untilAuto: boardUntilAuto,
        boardPeriodId: draft.boardPeriodId ?? currentBoard?.id ?? null,
        skipBoard,
        geometryId: Number(draft.geometryId),
        productId: null,
        customBrand: draft.customBrand || null,
        customModel: draft.customModel || null,
        sensing: effectiveSensing,
        switchId: draft.switchId ? Number(draft.switchId) : null,
        customSwitch: draft.switchId ? null : draft.customSwitch || null,
        actuationMm: draft.actuationMm === "" ? null : Number(draft.actuationMm),
        rapidTriggerSplit: hall && draft.rtMode === "split",
        rapidTriggerActuationMm:
          hall && draft.rtMode === "single" && draft.rapidTriggerActuationMm !== ""
            ? Number(draft.rapidTriggerActuationMm)
            : null,
        rapidTriggerPressMm:
          hall && draft.rtMode === "split" && draft.rapidTriggerPressMm !== ""
            ? Number(draft.rapidTriggerPressMm)
            : null,
        rapidTriggerReleaseMm:
          hall && draft.rtMode === "split" && draft.rapidTriggerReleaseMm !== ""
            ? Number(draft.rapidTriggerReleaseMm)
            : null,
        colorway: draft.colorway || null,
        note: draft.note || null,
        stemColor: draft.stemColor || null,
        baseColor: draft.baseColor || null,
        topColor: draft.topColor || null,
        lanes: lanePayload.filter((row) => row.keyCount > 0),
      });
      toast.success(t("profile.keyboards.saved"), { id: toastId });
      onSaved?.(data);
    } catch (err) {
      toast.error(err.response?.data?.error || t("profile.keyboards.saveError"), { id: toastId });
    } finally {
      setSaving(false);
    }
  }

  async function copySnapshot() {
    const text = JSON.stringify(buildSnapshot(rig, draft, effectiveSensing, bodyDirty));
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        copyTextFallback(text);
      }
      toast.success(t("profile.keyboards.exported"));
    } catch {
      try {
        copyTextFallback(text);
        toast.success(t("profile.keyboards.exported"));
      } catch {
        toast.error(t("profile.keyboards.saveError"));
      }
    }
  }

  function promptImport() {
    const text = window.prompt(t("profile.keyboards.importPrompt"));
    if (text == null) return;
    const trimmed = text.trim();
    if (!trimmed) return;
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed?.kind !== SNAPSHOT_KIND || parsed?.version !== 1) {
        toast.error(t("profile.keyboards.importInvalid"));
        return;
      }
      setPendingImport(parsed);
    } catch {
      toast.error(t("profile.keyboards.importInvalid"));
    }
  }

  async function applyImport(mode) {
    if (!pendingImport || importing) return;
    if (mode === "replace" && !window.confirm(t("profile.keyboards.importReplaceConfirm"))) return;
    setImporting(true);
    const toastId = toast.loading(t("loading.saving", { ns: "common" }));
    try {
      const { data } = await api.post(routes.playersV3.meKeyboardImport(), {
        mode,
        rigId: rig.id,
        snapshot: pendingImport,
      });
      setPendingImport(null);
      if (mode === "replace") {
        const since = draft.sinceDate || data.boardPeriods?.[data.boardPeriods.length - 1]?.sinceDate || null;
        const next = draftFromRig(data, geometries, since, null);
        setDraft(next);
        setPaste(formatKeybind(next.keys));
        setRenaming(false);
        onRigChange?.(data);
        toast.success(t("profile.keyboards.importedReplace"), { id: toastId });
      } else {
        onDuplicated?.(data);
        toast.success(t("profile.keyboards.importedCopy"), { id: toastId });
      }
    } catch (err) {
      toast.error(err.response?.data?.error || t("profile.keyboards.saveError"), { id: toastId });
    } finally {
      setImporting(false);
    }
  }

  async function removeRig() {
    if (deletingRig) return;
    if (!window.confirm(t("profile.keyboards.deleteRig"))) return;
    setDeletingRig(true);
    const toastId = toast.loading(t("loading.deleting", { ns: "common" }));
    try {
      await api.delete(routes.playersV3.meKeyboardRig(rig.id));
      toast.success(t("profile.keyboards.deleted"), { id: toastId });
      onDeleted?.();
    } catch (err) {
      toast.error(err.response?.data?.error || t("profile.keyboards.saveError"), { id: toastId });
      setDeletingRig(false);
    }
  }

  return (
    <PopupShell
      onClose={requestClose}
      closeDisabled={busy}
      overlayClassName="keyboard-setup-popup"
      panelClassName="keyboard-setup-popup__panel"
      ariaLabelledBy="keyboard-setup-popup-title"
    >
      <div className="keyboard-setup-popup__header">
        <div className="keyboard-setup-popup__heading">
          <h2 id="keyboard-setup-popup-title">{t("profile.keyboards.editTitle")}</h2>
          <span className={`keyboard-setup-popup__status${isDirty ? " is-dirty" : " is-clean"}`}>
            {isDirty ? t("profile.keyboards.unsaved") : t("profile.keyboards.savedState")}
          </span>
        </div>
        <div className="keyboard-setup-popup__header-actions">
          <button type="button" className="keyboard-setup-popup__tool" onClick={promptImport} disabled={busy}>
            <ImportIcon size={16} color="currentColor" />
            {t("profile.keyboards.import")}
          </button>
          <button type="button" className="keyboard-setup-popup__tool" onClick={copySnapshot} disabled={busy}>
            <CopyIcon size={16} color="currentColor" aria-hidden />
            {t("profile.keyboards.export")}
          </button>
          <CloseButton onClick={requestClose} aria-label={t("buttons.close", { ns: "common" })} disabled={busy} />
        </div>
      </div>
      <div className="keyboard-setup-popup__body keyboard-setup">
        <div className="keyboard-setup__editor">
          {pendingImport && (
            <div className="keyboard-setup__import">
              <p>
                {t("profile.keyboards.importReady", {
                  name: String(pendingImport.name || "").trim() || t("profile.keyboards.unnamed"),
                })}
              </p>
              <div className="keyboard-setup__import-actions">
                <button type="button" className="btn-fill-success btn-sm" onClick={() => applyImport("duplicate")} disabled={busy}>
                  {t("profile.keyboards.importCopy")}
                </button>
                <button type="button" className="btn-fill-danger btn-sm" onClick={() => applyImport("replace")} disabled={busy}>
                  {t("profile.keyboards.importReplace")}
                </button>
                <button type="button" className="btn-fill-secondary btn-sm" onClick={() => setPendingImport(null)} disabled={busy}>
                  {t("buttons.cancel", { ns: "common" })}
                </button>
              </div>
            </div>
          )}
          <div className="keyboard-setup__period">
            <label className="keyboard-setup__field keyboard-setup__name-field">
              <span>{t("profile.keyboards.rigName")}</span>
              <input
                value={draft.rigName}
                maxLength={80}
                placeholder={t("profile.keyboards.rigNamePlaceholder")}
                onChange={(event) => setDraft((prev) => ({ ...prev, rigName: event.target.value }))}
              />
            </label>
            <div className="keyboard-setup__layout">
              <div className="keyboard-setup__layout-head">
                <span>{t("profile.keyboards.layout")}</span>
                {draft.laneKey && !renaming && (
                  <button
                    type="button"
                    className="keyboard-setup__layout-edit"
                    onClick={startRename}
                    disabled={saving}
                    aria-label={t("profile.keyboards.renameLayout")}
                  >
                    <PencilIcon size={14} color="currentColor" />
                  </button>
                )}
              </div>
              {renaming ? (
                <div className="keyboard-setup__layout-edit-row">
                  <input
                    className="keyboard-setup__layout-name"
                    value={nameDraft}
                    maxLength={32}
                    autoFocus
                    aria-label={t("profile.keyboards.layoutName")}
                    onChange={(event) => setNameDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") saveLayoutName();
                    }}
                  />
                  <button
                    type="button"
                    className="btn-fill-secondary btn-sm"
                    onClick={() => setRenaming(false)}
                    disabled={saving || deletingLayout}
                  >
                    {t("buttons.cancel", { ns: "common" })}
                  </button>
                  <button
                    type="button"
                    className="btn-fill-success btn-sm"
                    onClick={saveLayoutName}
                    disabled={saving || deletingLayout}
                  >
                    {t("buttons.save", { ns: "common" })}
                  </button>
                  <button
                    type="button"
                    className="btn-fill-danger btn-icon btn-sm"
                    onClick={deleteLayout}
                    disabled={saving || deletingLayout}
                    aria-label={t("buttons.delete", { ns: "common" })}
                  >
                    <TrashIcon size={16} color="currentColor" />
                  </button>
                </div>
              ) : (
                <CustomSelect
                  options={laneOptions}
                  value={laneOptions.find((option) => option.value === draft.laneKey) || null}
                  onChange={(option) => option && selectLane(option.value)}
                  width="100%"
                />
              )}
            </div>
            <SinceRangeField
              label={t("profile.keyboards.usingLayoutSince")}
              from={draft.sinceDate}
              until={draft.untilDate}
              untilAuto={draft.untilAuto !== false}
              onFrom={setLayoutSince}
              onUntil={setLayoutUntil}
              fromLabel={t("profile.keyboards.rangeFrom")}
              toLabel={t("profile.keyboards.rangeTo")}
              autoLabel={t("profile.keyboards.rangeAuto")}
            />
          </div>

          <div className="keyboard-setup__editor-columns">
            <section className="keyboard-setup__editor-board">
              <h3 className="keyboard-setup__section-title">{t("profile.keyboards.bindField")}</h3>
              {draftGeometry ? (
                <KeyboardBoard
                  keys={draftGeometry.keys}
                  activeKeys={new Set(draft.keys)}
                  onKeyToggle={toggleDraftKey}
                  showLabels
                  maxUnit={34}
                />
              ) : (
                <p className="keyboard-setup__intro">{t("profile.keyboards.noLayouts")}</p>
              )}
              <p className="keyboard-setup__intro">{t("profile.keyboards.clickLayout")}</p>
              <div className="keyboard-setup__board-grid">
                <CustomSelect
                  options={geometryOptions}
                  value={geometryOptions.find((option) => option.value === String(draft.geometryId)) || null}
                  onChange={(option) => setDraft((prev) => ({ ...prev, geometryId: option.value }))}
                  width="100%"
                  label={t("profile.keyboards.geometry")}
                />
                <SinceRangeField
                  label={t("profile.keyboards.usingKeyboardSince")}
                  from={draft.boardSinceDate}
                  until={draft.boardUntilDate}
                  untilAuto={draft.boardUntilAuto !== false}
                  onFrom={(value) => setDraft((prev) => ({ ...prev, boardSinceDate: value || "" }))}
                  onUntil={(value) => setDraft((prev) => ({
                    ...prev,
                    boardUntilDate: value || "",
                    boardUntilAuto: !value,
                  }))}
                  fromLabel={t("profile.keyboards.rangeFrom")}
                  toLabel={t("profile.keyboards.rangeTo")}
                  autoLabel={t("profile.keyboards.rangeAuto")}
                />
                <label className="keyboard-setup__field">
                  <span>{t("profile.keyboards.brand")}</span>
                  <input
                    value={draft.customBrand}
                    onChange={(event) => setDraft((prev) => ({ ...prev, customBrand: event.target.value }))}
                  />
                </label>
                <label className="keyboard-setup__field">
                  <span>{t("profile.keyboards.model")}</span>
                  <input
                    value={draft.customModel}
                    onChange={(event) => setDraft((prev) => ({ ...prev, customModel: event.target.value }))}
                  />
                </label>
              </div>
              <div className="keyboard-setup__paste-row">
                <label className="keyboard-setup__field">
                  <span>{t("profile.keyboards.paste")}</span>
                  <textarea
                    className="keyboard-setup__paste"
                    value={paste}
                    onChange={(event) => setPaste(event.target.value)}
                  />
                </label>
                <button type="button" className="btn-fill-secondary" onClick={applyPaste}>
                  {t("profile.keyboards.applyPaste")}
                </button>
              </div>
            </section>

            <section className="keyboard-setup__editor-switch">
              <h3 className="keyboard-setup__section-title">{t("profile.keyboards.switch")}</h3>
              <div className="keyboard-setup__switch-edit">
                <SwitchDiagram
                  className="switch-diagram--editor"
                  stem={selectedSwitch?.stem}
                  sensing={selectedSwitch?.sensing || draft.sensing}
                  baseColor={draft.baseColor || selectedSwitch?.baseColor}
                  topColor={draft.topColor || selectedSwitch?.topColor}
                  stemColor={draft.stemColor || selectedSwitch?.stemColor}
                  baseOpacity={selectedSwitch?.baseOpacity}
                  title={selectedSwitch?.name || draft.customSwitch || t("profile.keyboards.customSwitch")}
                  colorable
                  stemLabel={t("admin.keyboards.stemColor")}
                  topLabel={t("admin.keyboards.topColor")}
                  baseLabel={t("admin.keyboards.baseColor")}
                  onStemColor={(stemColor) => setDraft((prev) => ({ ...prev, stemColor }))}
                  onTopColor={(topColor) => setDraft((prev) => ({ ...prev, topColor }))}
                  onBaseColor={(baseColor) => setDraft((prev) => ({ ...prev, baseColor }))}
                />
                <div className="keyboard-setup__switch-fields">
                  <CustomSelect
                    options={switchOptions}
                    value={switchOptions.find((option) => option.value === String(draft.switchId || "")) || switchOptions[0]}
                    onChange={(option) =>
                      setDraft((prev) => ({
                        ...prev,
                        switchId: option.value,
                        stemColor: "",
                        baseColor: "",
                        topColor: "",
                      }))
                    }
                    width="100%"
                    label={t("profile.keyboards.switch")}
                  />
                  {!draft.switchId ? (
                    <CustomSelect
                      options={sensingOptions}
                      value={sensingOptions.find((option) => option.value === draft.sensing) || sensingOptions[0]}
                      onChange={(option) =>
                        setDraft((prev) => ({
                          ...prev,
                          sensing: option.value,
                          rtMode: option.value === "hall" ? prev.rtMode : "off",
                        }))
                      }
                      width="100%"
                      label={t("profile.keyboards.sensingLabel")}
                    />
                  ) : null}
                  {!draft.switchId ? (
                    <label className="keyboard-setup__field">
                      <span>{t("profile.keyboards.customSwitch")}</span>
                      <input
                        value={draft.customSwitch}
                        onChange={(event) => setDraft((prev) => ({ ...prev, customSwitch: event.target.value }))}
                      />
                    </label>
                  ) : null}
                  <label className="keyboard-setup__field">
                    <span>{t("profile.keyboards.actuationLabel")}</span>
                    <input
                      type="number"
                      min="0"
                      max="8"
                      step="0.01"
                      value={draft.actuationMm}
                      onChange={(event) => setDraft((prev) => ({ ...prev, actuationMm: event.target.value }))}
                    />
                  </label>
                </div>
              </div>
              {showRapid ? (
                <div className="keyboard-setup__rt">
                  <StateDisplay
                    className="keyboard-setup__rt-toggle"
                    currentState={draft.rtMode}
                    states={["off", "single", "split"]}
                    activeStates={["single", "split"]}
                    onChange={(rtMode) => setDraft((prev) => ({ ...prev, rtMode }))}
                    label={t("profile.keyboards.rapidTrigger")}
                    width={48}
                  />
                  {draft.rtMode === "single" ? (
                    <label className="keyboard-setup__field">
                      <span>{t("profile.keyboards.actuationLabel")}</span>
                      <input
                        type="number"
                        min="0"
                        max="8"
                        step="0.01"
                        value={draft.rapidTriggerActuationMm}
                        onChange={(event) =>
                          setDraft((prev) => ({ ...prev, rapidTriggerActuationMm: event.target.value }))
                        }
                      />
                    </label>
                  ) : null}
                  {draft.rtMode === "split" ? (
                    <div className="keyboard-setup__rt-points">
                      <label className="keyboard-setup__field">
                        <span>{t("profile.keyboards.rtPressLabel")}</span>
                        <input
                          type="number"
                          min="0"
                          max="8"
                          step="0.01"
                          value={draft.rapidTriggerPressMm}
                          onChange={(event) =>
                            setDraft((prev) => ({ ...prev, rapidTriggerPressMm: event.target.value }))
                          }
                        />
                      </label>
                      <label className="keyboard-setup__field">
                        <span>{t("profile.keyboards.rtReleaseLabel")}</span>
                        <input
                          type="number"
                          min="0"
                          max="8"
                          step="0.01"
                          value={draft.rapidTriggerReleaseMm}
                          onChange={(event) =>
                            setDraft((prev) => ({ ...prev, rapidTriggerReleaseMm: event.target.value }))
                          }
                        />
                      </label>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </section>
          </div>
        </div>
      </div>
      <div className="keyboard-setup-popup__footer">
        <button type="button" className="btn-fill-danger" onClick={removeRig} disabled={busy}>
          {t("buttons.delete", { ns: "common" })}
        </button>
        <div className="keyboard-setup-popup__footer-actions">
          <button type="button" className="btn-fill-neutral" onClick={requestClose} disabled={busy}>
            {t("buttons.cancel", { ns: "common" })}
          </button>
          <button type="button" className="btn-fill-success" onClick={saveRevision} disabled={busy || !isDirty}>
            {saving ? t("loading.saving", { ns: "common" }) : t("buttons.save", { ns: "common" })}
          </button>
        </div>
      </div>
    </PopupShell>
  );
}
