import { useEffect, useMemo, useState } from "react";
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
import SwitchTopPlaceholder from "./SwitchTopPlaceholder";
import { ActuationSlider } from "./ActuationSlider";
import { depthPaints } from "./keyboardPaint";
import {
  ABSENT_SWITCH,
  draftSliceFromSource,
  emptySwitchRow,
  keyOverridesFromDraft,
  layoutSetupFromBoard,
  layoutSetupFromDraft,
  layoutSource,
  resolvedStemColor,
  switchTopPaint,
  sameLayoutSetup,
  storedOpacity,
  switchClientKey,
  switchPayload,
} from "./keyboardSetupDraft";
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

function isMembraneSensing(sensing) {
  return sensing === "membrane";
}

function membraneClearedDraft() {
  return {
    switchId: "",
    customSwitch: "",
    actuationMm: "",
    stemColor: "",
    baseColor: "",
    topColor: "",
    baseOpacity: "",
    rtMode: "off",
    rapidTriggerActuationMm: "",
    rapidTriggerPressMm: "",
    rapidTriggerReleaseMm: "",
    switches: [],
    keyMeta: {},
  };
}

const COUNT_LAYOUT_NAME = /^[0-9]+K$/;
const MAX_LAYOUTS = 12;
const MAX_BOARD_SWITCHES = 64;
const EDITOR_MODES = ["layout", "switches", "actuation", "rapidTrigger"];
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

function commitCurrentSetup(prev) {
  const setup = layoutSetupFromDraft(prev);
  return {
    ...prev,
    lanes: (prev.lanes || []).map((row) =>
      laneClientKey(row) === prev.laneKey ? { ...row, setup } : row,
    ),
  };
}

function laneView(prev, row) {
  const keys = canonicalizeKeys(row.keys || []);
  return {
    laneKey: laneClientKey(row),
    name: row.name,
    keyCount: row.keyCount,
    keys,
    periodId: row.periodId ?? null,
    sinceDate: row.sinceDate || null,
    untilDate: row.untilDate || "",
    untilAuto: row.untilAuto !== false,
    ...draftSliceFromSource(layoutSource({ sensing: prev.sensing }, row.setup || null)),
  };
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

function clampTopOpacity(draft, selectedSwitch) {
  const n = Number(draft.baseOpacity === "" ? selectedSwitch?.baseOpacity ?? 1 : draft.baseOpacity);
  if (!Number.isFinite(n)) return 1;
  return Math.min(1, Math.max(0, n));
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
      setup: period?.setup || layoutSetupFromBoard(board),
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
      setup: layoutSetupFromBoard(board),
    });
  }
  const selected = lanes.find((row) => laneId && row.id === laneId) || lanes[lanes.length - 1];
  const boardRange = rangeFrom(board);
  const names = visibleBrandModel(board);
  const sensing = board?.sensing || "mechanical";
  return {
    sinceDate: selected.sinceDate ?? sinceDate ?? utcToday(),
    untilDate: selected.untilDate || "",
    untilAuto: selected.untilAuto !== false,
    geometryId: board?.geometryId ? String(board.geometryId) : geometries[0] ? String(geometries[0].id) : "",
    productId: "",
    customBrand: names.brand,
    customModel: names.model,
    sensing,
    ...draftSliceFromSource(layoutSource(board ? { ...board, sensing } : { sensing }, selected.setup)),
    colorway: board?.colorway || "",
    note: board?.note || "",
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

function laneMatchesSaved(row, rig, board) {
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
  if (!sameDate(savedRange.untilDate || null, rowAuto ? null : row.untilDate || null)) return false;
  if (!board) return true;
  const savedSource = period.setup ? layoutSource(board, period.setup) : board;
  return sameLayoutSetup(row.setup, savedSource, board.sensing);
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
    baseOpacity: period?.baseOpacity == null ? null : Number(period.baseOpacity),
    switches: (period?.switches || []).map((row) => ({
      id: row.id ?? null,
      switchId: row.switchId ?? null,
      customSwitch: row.customSwitch || null,
      stemColor: row.stemColor || null,
      baseColor: row.baseColor || null,
      topColor: row.topColor || null,
      baseOpacity: row.baseOpacity == null ? null : Number(row.baseOpacity),
    })),
    keyOverrides: (period?.keyOverrides || []).map((row) => ({
      code: row.code,
      socketEmpty: Boolean(row.socketEmpty),
      switchId: row.switchId ?? null,
      customSwitch: row.customSwitch || null,
      periodSwitchId: row.periodSwitchId ?? null,
      periodSwitchIndex: row.periodSwitchIndex ?? null,
      actuationMm: row.actuationMm ?? null,
      rapidTriggerSplit: row.rapidTriggerSplit ?? null,
      rapidTriggerActuationMm: row.rapidTriggerActuationMm ?? null,
      rapidTriggerPressMm: row.rapidTriggerPressMm ?? null,
      rapidTriggerReleaseMm: row.rapidTriggerReleaseMm ?? null,
    })),
  };
}

function draftBoardFields(draft, sensing, previous) {
  const hall = sensing === "hall";
  const membrane = isMembraneSensing(sensing);
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
    switchId: membrane ? null : draft.switchId ? Number(draft.switchId) : null,
    customSwitch: membrane || draft.switchId ? null : draft.customSwitch || null,
    actuationMm: membrane || draft.actuationMm === "" ? null : Number(draft.actuationMm),
    rapidTriggerSplit: !membrane && hall && draft.rtMode === "split",
    rapidTriggerActuationMm:
      !membrane && hall && draft.rtMode === "single" && draft.rapidTriggerActuationMm !== ""
        ? Number(draft.rapidTriggerActuationMm)
        : null,
    rapidTriggerPressMm:
      !membrane && hall && draft.rtMode === "split" && draft.rapidTriggerPressMm !== ""
        ? Number(draft.rapidTriggerPressMm)
        : null,
    rapidTriggerReleaseMm:
      !membrane && hall && draft.rtMode === "split" && draft.rapidTriggerReleaseMm !== ""
        ? Number(draft.rapidTriggerReleaseMm)
        : null,
    colorway: draft.colorway || null,
    note: draft.note || null,
    stemColor: membrane ? null : draft.stemColor || null,
    baseColor: membrane ? null : draft.baseColor || null,
    topColor: membrane ? null : draft.topColor || null,
    baseOpacity: membrane || draft.baseOpacity === "" ? null : Number(draft.baseOpacity),
    switches: membrane ? [] : (draft.switches || []).map(switchPayload),
    keyOverrides: keyOverridesFromDraft(draft, membrane),
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
        setup: period.isGap || period.keys == null ? null : (period.setup ?? null),
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
  const committed = commitCurrentSetup(draft);
  snapshot.lanes = (committed.lanes || []).flatMap((row) => {
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
        setup: period.isGap || period.keys == null ? null : (period.setup ?? null),
      }));
    if (keys.length) {
      periods.push({
        sinceDate: since,
        untilDate: row.untilAuto !== false ? null : row.untilDate || null,
        untilAuto: row.untilAuto !== false,
        keys,
        setup: row.setup ?? null,
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
    same(draft.colorway, board.colorway) &&
    same(draft.note, board.note) &&
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
  const [editorMode, setEditorMode] = useState("layout");
  const [paintSelection, setPaintSelection] = useState(() => new Set());
  const [openSwitchKey, setOpenSwitchKey] = useState(null);
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
    { value: "none", label: t("profile.keyboards.noSwitch") },
    { value: "", label: t("profile.keyboards.customSwitch") },
    ...switches.map((row) => ({ value: String(row.id), label: row.name })),
  ];
  const sensingOptions = [
    { value: "mechanical", label: t("profile.keyboards.sensing.mechanical") },
    { value: "optical", label: t("profile.keyboards.sensing.optical") },
    { value: "hall", label: t("profile.keyboards.sensing.hall") },
    { value: "membrane", label: t("profile.keyboards.sensing.membrane") },
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
  const effectiveSensing = draft.sensing || "mechanical";
  const isMembrane = isMembraneSensing(effectiveSensing);
  const showRapid = effectiveSensing === "hall";
  const bindableKeys = useMemo(
    () => (draftGeometry?.keys || []).filter((key) => key.bindable !== false),
    [draftGeometry],
  );
  const selectedCodeSet = editorMode === "layout" ? new Set(draft.keys) : paintSelection;
  const anyKeysSelected = bindableKeys.some((key) => selectedCodeSet.has(key.code));
  const allKeysSelected = bindableKeys.length > 0 && bindableKeys.every((key) => selectedCodeSet.has(key.code));
  const maxSwitches = Math.min(MAX_BOARD_SWITCHES, Math.max(bindableKeys.length, 1));
  const openSwitch = (draft.switches || []).find((row) => switchClientKey(row) === openSwitchKey) || null;
  const openCatalogSwitch = switches.find((row) => String(row.id) === String(openSwitch?.switchId)) || null;
  const openTopOpacity = clampTopOpacity(openSwitch || {}, openCatalogSwitch);
  const savedBoard = (rig?.boardPeriods || []).find((period) => period.id === draft.boardPeriodId && !period.isGap)
    || currentPeriod((rig?.boardPeriods || []).filter((period) => !period.isGap));
  const nameDirty = String(draft.rigName || "").trim() !== String(rig?.name || "").trim();
  const bodyDirty = useMemo(() => {
    if (!sameDate(draft.boardSinceDate, savedBoard?.sinceDate ?? null)) return true;
    if (savedBoard && boardSpecChanged(draft, savedBoard, effectiveSensing)) return true;
    if ((draft.lanes || []).some((row) => {
      const live = laneClientKey(row) === draft.laneKey;
      const probe = live ? { ...row, setup: layoutSetupFromDraft(draft) } : row;
      return !laneMatchesSaved(probe, rig, savedBoard);
    })) return true;
    if (paste !== formatKeybind(draft.keys)) return true;
    if (!renaming) return false;
    const keyCount = canonicalizeKeys(draft.keys).length;
    return savedLayoutName(nameDraft, keyCount) !== savedLayoutName(draft.name, keyCount);
  }, [draft, savedBoard, rig, paste, renaming, nameDraft, effectiveSensing]);
  const isDirty = bodyDirty || nameDirty;
  const busy = saving || deletingRig || importing || deletingLayout;
  const { requestClose } = useUnsavedClose({ isDirty, onClose });

  useEffect(() => {
    if (isMembrane && editorMode !== "layout") setEditorMode("layout");
    else if (!showRapid && editorMode === "rapidTrigger") setEditorMode("layout");
  }, [isMembrane, showRapid, editorMode]);

  function selectLane(nextKey) {
    if (nextKey === ADD_LAYOUT) {
      addLayout();
      return;
    }
    if (nextKey === draft.laneKey) return;
    const row = (draft.lanes || []).find((item) => laneClientKey(item) === nextKey);
    if (!row) return;
    const keys = canonicalizeKeys(row.keys || []);
    setPaintSelection(new Set());
    setDraft((prev) => {
      const committed = commitCurrentSetup(prev);
      const next = (committed.lanes || []).find((item) => laneClientKey(item) === nextKey);
      if (!next) return committed;
      return { ...committed, ...laneView(committed, next) };
    });
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
    setRenaming(false);
    setPaintSelection(new Set());
    setDraft((prev) => {
      const committed = commitCurrentSetup(prev);
      const row = {
        id: null,
        tmpId,
        periodId: null,
        keyCount: 0,
        name: "0K",
        keys: [],
        sinceDate: utcToday(),
        untilDate: "",
        untilAuto: true,
        setup: layoutSetupFromDraft(prev),
      };
      const lanes = [...(committed.lanes || []), row];
      const next = { ...committed, lanes };
      return { ...next, ...laneView(next, row) };
    });
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
    setPaintSelection(new Set());
    setDraft((prev) => {
      const nextLanes = (prev.lanes || []).filter((row) => laneClientKey(row) !== laneKey);
      const nextFallback = nextLanes[nextLanes.length - 1] || null;
      if (!nextFallback) {
        return {
          ...prev,
          lanes: nextLanes,
          laneKey: null,
          name: "",
          keyCount: 0,
          keys: [],
          periodId: null,
          sinceDate: null,
          untilDate: "",
          untilAuto: true,
          ...draftSliceFromSource({ sensing: prev.sensing }),
        };
      }
      const next = { ...prev, lanes: nextLanes };
      return { ...next, ...laneView(next, nextFallback) };
    });
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

  function handleBoardPaint(codes, turnedOn, kind) {
    const applyCode = (next, code) => {
      if (kind === "toggle") {
        if (next.has(code)) next.delete(code);
        else next.add(code);
        return;
      }
      if (turnedOn) next.add(code);
      else next.delete(code);
    };
    if (editorMode === "layout") {
      const next = new Set(draft.keys);
      for (const code of codes) applyCode(next, code);
      applyKeySelection([...next]);
      return;
    }
    setPaintSelection((prev) => {
      const next = new Set(prev);
      for (const code of codes) applyCode(next, code);
      return next;
    });
  }

  function selectAllKeys() {
    const codes = bindableKeys.map((key) => key.code);
    if (editorMode === "layout") {
      applyKeySelection(codes);
      return;
    }
    setPaintSelection(new Set(codes));
  }

  function deselectAllKeys() {
    if (editorMode === "layout") {
      applyKeySelection([]);
      return;
    }
    setPaintSelection(new Set());
  }

  function assignSwitchToSelection(switchKey) {
    if (!paintSelection.size) return;
    setDraft((prev) => {
      const keyMeta = {...(prev.keyMeta || {})};
      for (const code of paintSelection) {
        keyMeta[code] = {...keyMeta[code], switchKey};
      }
      return {...prev, keyMeta};
    });
  }

  function patchOpenSwitch(patch) {
    if (!openSwitchKey) return;
    setDraft((prev) => ({
      ...prev,
      switches: (prev.switches || []).map((row) =>
        switchClientKey(row) === openSwitchKey ? {...row, ...patch} : row,
      ),
    }));
  }

  function addSwitch() {
    if ((draft.switches || []).length >= maxSwitches) return;
    const row = emptySwitchRow();
    const key = switchClientKey(row);
    setDraft((prev) => ({...prev, switches: [...(prev.switches || []), row]}));
    setOpenSwitchKey(key);
  }

  function applyGeometryId(geometryId) {
    const nextGeo = geometries.find((row) => String(row.id) === String(geometryId));
    const allowed = new Set(
      (nextGeo?.keys || []).filter((key) => key.bindable !== false).map((key) => key.code),
    );
    const cap = Math.min(MAX_BOARD_SWITCHES, Math.max(allowed.size, 1));
    setDraft((prev) => {
      let switches = prev.switches || [];
      const dropped = new Set();
      if (switches.length > cap) {
        switches.slice(cap).forEach((row) => dropped.add(switchClientKey(row)));
        switches = switches.slice(0, cap);
      }
      const fallback = switches[0] ? switchClientKey(switches[0]) : null;
      const keyMeta = {};
      for (const [code, meta] of Object.entries(prev.keyMeta || {})) {
        if (!allowed.has(code)) continue;
        if (meta?.switchKey && dropped.has(meta.switchKey)) {
          keyMeta[code] = {...meta, switchKey: fallback};
        } else {
          keyMeta[code] = meta;
        }
      }
      return {...prev, geometryId, switches, keyMeta};
    });
    setPaintSelection((prev) => new Set([...prev].filter((code) => allowed.has(code))));
    setOpenSwitchKey((current) => {
      if (!current) return current;
      const nextList = (draft.switches || []).slice(0, cap);
      if (nextList.some((row) => switchClientKey(row) === current)) return current;
      return nextList[0] ? switchClientKey(nextList[0]) : null;
    });
  }

  function removeSwitch(switchKey) {
    if ((draft.switches || []).length <= 1) return;
    const remaining = (draft.switches || []).filter((row) => switchClientKey(row) !== switchKey);
    const fallback = switchClientKey(remaining[0]);
    setDraft((prev) => {
      const keyMeta = {...(prev.keyMeta || {})};
      for (const code of Object.keys(keyMeta)) {
        if (keyMeta[code]?.switchKey === switchKey) {
          keyMeta[code] = {...keyMeta[code], switchKey: fallback};
        }
      }
      return {...prev, switches: remaining, keyMeta};
    });
    setOpenSwitchKey((current) => (current === switchKey ? fallback : current));
  }

  function writeSelectionMeta(patch, clearKeys = []) {
    if (!paintSelection.size) return;
    setDraft((prev) => {
      const keyMeta = {...(prev.keyMeta || {})};
      for (const code of paintSelection) {
        const next = {...keyMeta[code], ...patch};
        for (const key of clearKeys) delete next[key];
        keyMeta[code] = next;
      }
      return {...prev, keyMeta};
    });
  }

  const selectionCodes = [...paintSelection];
  const selectionEnabled = selectionCodes.length > 0 && editorMode !== "layout";
  const selectionAbsent = selectionCodes.length > 0 && selectionCodes.every(
    (code) => draft.keyMeta?.[code]?.switchKey === ABSENT_SWITCH,
  );

  function selectionMetaValues(field, fallback = "") {
    if (!selectionCodes.length) return {value: "", mixed: false};
    const values = selectionCodes.map((code) => {
      const raw = draft.keyMeta?.[code]?.[field];
      if (raw === "" || raw == null) return fallback;
      return String(raw);
    });
    const first = values[0];
    const mixed = values.some((value) => value !== first);
    return {value: mixed ? "" : first, mixed};
  }

  const selectionActuation = selectionMetaValues(
    "actuationMm",
    draft.actuationMm === "" || draft.actuationMm == null ? "" : String(draft.actuationMm),
  );
  const selectionRtMode = (() => {
    if (!selectionCodes.length) return {value: "off", mixed: false};
    const values = selectionCodes.map((code) => draft.keyMeta?.[code]?.rtMode || "default");
    const first = values[0];
    const mixed = values.some((value) => value !== first);
    if (mixed) return {value: "off", mixed: true};
    return {value: first === "default" ? (draft.rtMode || "off") : first, mixed: false};
  })();
  const selectionRtActuation = selectionMetaValues(
    "rapidTriggerActuationMm",
    draft.rtMode === "single" && draft.rapidTriggerActuationMm !== ""
      ? String(draft.rapidTriggerActuationMm)
      : "",
  );
  const selectionRtPress = selectionMetaValues(
    "rapidTriggerPressMm",
    draft.rtMode === "split" && draft.rapidTriggerPressMm !== ""
      ? String(draft.rapidTriggerPressMm)
      : "",
  );
  const selectionRtRelease = selectionMetaValues(
    "rapidTriggerReleaseMm",
    draft.rtMode === "split" && draft.rapidTriggerReleaseMm !== ""
      ? String(draft.rapidTriggerReleaseMm)
      : "",
  );

  const paintByCode = useMemo(() => {
    if (editorMode === "layout" || isMembrane) return undefined;
    const keyByCode = new Map(
      Object.entries(draft.keyMeta || {}).map(([code, meta]) => [
        code,
        {
          switchKey: meta.switchKey,
          actuationMm: meta.actuationMm === "" ? null : meta.actuationMm,
          rapidTriggerSplit: meta.rtMode === "split" ? true : meta.rtMode === "off" || meta.rtMode === "single" ? false : null,
          rapidTriggerActuationMm: meta.rtMode === "single" ? meta.rapidTriggerActuationMm : null,
          rapidTriggerPressMm: meta.rtMode === "split" ? meta.rapidTriggerPressMm : null,
          rapidTriggerReleaseMm: meta.rtMode === "split" ? meta.rapidTriggerReleaseMm : null,
        },
      ]),
    );
    const board = {
      sensing: effectiveSensing,
      actuationMm: draft.actuationMm,
      rapidTriggerSplit: draft.rtMode === "split",
      rapidTriggerActuationMm: draft.rtMode === "single" ? draft.rapidTriggerActuationMm : null,
      rapidTriggerPressMm: draft.rtMode === "split" ? draft.rapidTriggerPressMm : null,
      rapidTriggerReleaseMm: draft.rtMode === "split" ? draft.rapidTriggerReleaseMm : null,
      stemColor: draft.stemColor,
      switchId: draft.switchId,
    };
    if (editorMode === "actuation" || editorMode === "rapidTrigger") {
      return depthPaints(editorMode, bindableKeys.map((key) => key.code), {board, keyByCode});
    }
    const paint = {};
    for (const key of bindableKeys) {
      const row = keyByCode.get(key.code);
      if (row?.switchKey === ABSENT_SWITCH) {
        paint[key.code] = {switchTop: {absent: true}};
        continue;
      }
      const sw = row?.switchKey
        ? (draft.switches || []).find((item) => switchClientKey(item) === row.switchKey)
        : {
          stemColor: draft.stemColor,
          baseColor: draft.baseColor,
          topColor: draft.topColor,
          baseOpacity: draft.baseOpacity,
          switchId: draft.switchId,
        };
      paint[key.code] = {switchTop: switchTopPaint(sw, switches)};
    }
    return paint;
  }, [bindableKeys, draft, editorMode, effectiveSensing, isMembrane, switches]);

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
      const probe = { ...current, setup: layoutSetupFromDraft(draft) };
      if (!laneMatchesSaved(probe, rig, savedBoard)) {
        if (!window.confirm(t("confirmations.unsavedChanges", { ns: "common" }))) return;
      }
      const keyCount = keys.length;
      const name = nameTracksCount(current.name) ? `${keyCount}K` : current.name;
      const range = rangeFrom(exact);
      const host = savedBoard ? { ...savedBoard, sensing: draft.sensing } : { sensing: draft.sensing };
      setDraft((prev) => {
        const slice = draftSliceFromSource(layoutSource(host, exact.setup || null));
        const setup = layoutSetupFromDraft({ ...slice, sensing: prev.sensing });
        const patch = {
          periodId: exact.id,
          sinceDate: nextDate,
          untilDate: range.untilDate,
          untilAuto: range.untilAuto,
          keys,
          keyCount,
          name,
          setup,
        };
        const lanes = (prev.lanes || []).map((row) =>
          laneClientKey(row) === prev.laneKey ? { ...row, ...patch } : row,
        );
        return { ...prev, ...patch, ...slice, lanes };
      });
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
      const membrane = isMembrane;
      const committed = commitCurrentSetup(draft);
      const lanePayload = (committed.lanes || []).flatMap((row) => {
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
          setup: row.setup,
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
        switchId: membrane ? null : draft.switchId ? Number(draft.switchId) : null,
        customSwitch: membrane || draft.switchId ? null : draft.customSwitch || null,
        switches: membrane ? [] : (draft.switches || []).map(switchPayload),
        keyOverrides: keyOverridesFromDraft(draft, membrane),
        actuationMm: membrane || draft.actuationMm === "" ? null : Number(draft.actuationMm),
        rapidTriggerSplit: !membrane && hall && draft.rtMode === "split",
        rapidTriggerActuationMm:
          !membrane && hall && draft.rtMode === "single" && draft.rapidTriggerActuationMm !== ""
            ? Number(draft.rapidTriggerActuationMm)
            : null,
        rapidTriggerPressMm:
          !membrane && hall && draft.rtMode === "split" && draft.rapidTriggerPressMm !== ""
            ? Number(draft.rapidTriggerPressMm)
            : null,
        rapidTriggerReleaseMm:
          !membrane && hall && draft.rtMode === "split" && draft.rapidTriggerReleaseMm !== ""
            ? Number(draft.rapidTriggerReleaseMm)
            : null,
        colorway: draft.colorway || null,
        note: draft.note || null,
        stemColor: membrane ? null : draft.stemColor || null,
        baseColor: membrane ? null : draft.baseColor || null,
        topColor: membrane ? null : draft.topColor || null,
        baseOpacity: membrane || draft.baseOpacity === "" ? null : Number(draft.baseOpacity),
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
                  activeKeys={editorMode === "layout" ? new Set(draft.keys) : undefined}
                  selectedKeys={editorMode === "layout" ? undefined : paintSelection}
                  selectMode={editorMode !== "layout"}
                  paintByCode={paintByCode}
                  keepFillOnHover={editorMode !== "layout"}
                  onPaintKeys={handleBoardPaint}
                  showLabels
                  maxUnit={34}
                />
              ) : (
                <p className="keyboard-setup__intro">{t("profile.keyboards.noLayouts")}</p>
              )}
              <div className="keyboard-setup__select-actions">
                <button
                  type="button"
                  className="btn-fill-secondary btn-sm"
                  onClick={selectAllKeys}
                  disabled={!draftGeometry || allKeysSelected}
                >
                  {t("profile.keyboards.selectAll")}
                </button>
                <button
                  type="button"
                  className="btn-fill-secondary btn-sm"
                  onClick={deselectAllKeys}
                  disabled={!anyKeysSelected}
                >
                  {t("profile.keyboards.deselectAll")}
                </button>
              </div>
              <p className="keyboard-setup__intro">
                {editorMode === "layout" ? t("profile.keyboards.clickLayout") : t("profile.keyboards.clickSelect")}
              </p>
              <div className="keyboard-setup__board-grid">
                <CustomSelect
                  options={geometryOptions}
                  value={geometryOptions.find((option) => option.value === String(draft.geometryId)) || null}
                  onChange={(option) => applyGeometryId(option.value)}
                  width="100%"
                  label={t("profile.keyboards.geometry")}
                />
                <CustomSelect
                  options={sensingOptions}
                  value={sensingOptions.find((option) => option.value === draft.sensing) || sensingOptions[0]}
                  onChange={(option) => {
                    const nextSensing = option.value;
                    if (isMembraneSensing(nextSensing)) {
                      setOpenSwitchKey(null);
                      setPaintSelection(new Set());
                      setEditorMode("layout");
                    }
                    setDraft((prev) => {
                      const next = {
                        ...prev,
                        sensing: nextSensing,
                        rtMode: nextSensing === "hall" ? prev.rtMode : "off",
                      };
                      if (isMembraneSensing(nextSensing)) {
                        const cleared = { ...next, ...membraneClearedDraft() };
                        const setup = layoutSetupFromDraft(cleared);
                        return {
                          ...cleared,
                          lanes: (cleared.lanes || []).map((row) => ({ ...row, setup })),
                        };
                      }
                      if (!(next.switches || []).length) {
                        return {...next, switches: [emptySwitchRow()]};
                      }
                      return next;
                    });
                  }}
                  width="100%"
                  label={t("profile.keyboards.sensingLabel")}
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
              <label className="keyboard-setup__field">
                <span>{t("profile.keyboards.note")}</span>
                <textarea
                  className="keyboard-setup__note-input"
                  value={draft.note}
                  maxLength={500}
                  onChange={(event) => setDraft((prev) => ({ ...prev, note: event.target.value }))}
                />
              </label>
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
              <div className="keyboard-setup__modes" role="tablist" aria-label={t("profile.keyboards.modes.label")}>
                {EDITOR_MODES.filter((mode) => {
                  if (mode === "layout") return true;
                  if (isMembrane) return false;
                  if (mode === "rapidTrigger") return showRapid;
                  return true;
                }).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    role="tab"
                    aria-selected={editorMode === mode}
                    className={`keyboard-setup__mode${editorMode === mode ? " is-active" : ""}`}
                    onClick={() => {
                      setEditorMode(mode);
                      if (mode === "switches" && !openSwitchKey && draft.switches?.[0]) {
                        setOpenSwitchKey(switchClientKey(draft.switches[0]));
                      }
                    }}
                  >
                    {t(`profile.keyboards.modes.${mode}`)}
                  </button>
                ))}
              </div>

              {editorMode === "layout" && (
                <p className="keyboard-setup__intro">{t("profile.keyboards.layoutHint")}</p>
              )}

              {editorMode === "switches" && !isMembrane ? (
                <div className="keyboard-setup__switch-list">
                  <div className={`keyboard-setup__switch-row${selectionAbsent ? " is-open" : ""}`}>
                    <div className="keyboard-setup__switch-row-head">
                      <button
                        type="button"
                        className="keyboard-setup__switch-row-open"
                        onClick={() => {
                          setOpenSwitchKey(null);
                          assignSwitchToSelection(ABSENT_SWITCH);
                        }}
                      >
                        <SwitchTopPlaceholder absent size="0.85rem" />
                        <span>{t("profile.keyboards.noSwitch")}</span>
                      </button>
                    </div>
                  </div>
                  {(draft.switches || []).map((row, index) => {
                    const key = switchClientKey(row);
                    const catalogSwitch = switches.find((item) => String(item.id) === String(row.switchId));
                    const open = key === openSwitchKey;
                    return (
                      <div key={key} className={`keyboard-setup__switch-row${open ? " is-open" : ""}`}>
                        <div className="keyboard-setup__switch-row-head">
                          <button
                            type="button"
                            className="keyboard-setup__switch-row-open"
                            onClick={() => {
                              setOpenSwitchKey(key);
                              assignSwitchToSelection(key);
                            }}
                          >
                            {row.absent ? (
                              <SwitchTopPlaceholder absent size="0.85rem" />
                            ) : (
                              <span
                                className="keyboard-setup__switch-swatch"
                                style={{background: resolvedStemColor(row, switches) || "var(--color-white-t20)"}}
                              />
                            )}
                            <span>
                              {row.absent
                                ? t("profile.keyboards.noSwitch")
                                : catalogSwitch?.name || row.customSwitch || t("profile.keyboards.switchN", {n: index + 1})}
                            </span>
                          </button>
                          <button
                            type="button"
                            className="keyboard-setup__switch-row-remove"
                            onClick={() => removeSwitch(key)}
                            disabled={(draft.switches || []).length <= 1}
                            aria-label={t("profile.keyboards.removeSwitch")}
                          >
                            <TrashIcon size={14} color="currentColor" />
                          </button>
                        </div>
                        {open ? (
                          <div className="keyboard-setup__switch-row-body">
                            <div className="keyboard-setup__switch-edit">
                              {!row.absent && (
                                <SwitchDiagram
                                  className="switch-diagram--editor"
                                  stem={catalogSwitch?.stem}
                                  sensing={catalogSwitch?.sensing || draft.sensing}
                                  baseColor={row.baseColor || catalogSwitch?.baseColor}
                                  topColor={row.topColor || catalogSwitch?.topColor}
                                  stemColor={row.stemColor || catalogSwitch?.stemColor}
                                  baseOpacity={openTopOpacity}
                                  title={catalogSwitch?.name || row.customSwitch || t("profile.keyboards.customSwitch")}
                                  colorable
                                  stemLabel={t("admin.keyboards.stemColor")}
                                  topLabel={t("admin.keyboards.topColor")}
                                  baseLabel={t("admin.keyboards.baseColor")}
                                  opacityLabel={t("admin.keyboards.baseOpacity", {percent: Math.round(openTopOpacity * 100)})}
                                  onStemColor={(stemColor) => patchOpenSwitch({stemColor})}
                                  onTopColor={(topColor) => patchOpenSwitch({topColor})}
                                  onBaseColor={(baseColor) => patchOpenSwitch({baseColor})}
                                  onBaseOpacity={(baseOpacity) => patchOpenSwitch({baseOpacity: String(baseOpacity)})}
                                />
                              )}
                              <div className="keyboard-setup__switch-fields">
                                <CustomSelect
                                  options={switchOptions}
                                  value={
                                    row.absent
                                      ? switchOptions.find((option) => option.value === "none")
                                      : switchOptions.find((option) => option.value === String(row.switchId || ""))
                                        || switchOptions.find((option) => option.value === "")
                                  }
                                  onChange={(option) => {
                                    if (!option) return;
                                    if (option.value === "none") {
                                      patchOpenSwitch({
                                        absent: true,
                                        switchId: "",
                                        customSwitch: "",
                                        stemColor: "",
                                        baseColor: "",
                                        topColor: "",
                                        baseOpacity: "",
                                      });
                                      return;
                                    }
                                    patchOpenSwitch({
                                      absent: false,
                                      switchId: option.value,
                                      stemColor: "",
                                      baseColor: "",
                                      topColor: "",
                                      baseOpacity: "",
                                    });
                                  }}
                                  width="100%"
                                  label={t("profile.keyboards.switch")}
                                />
                                {!row.absent && !row.switchId && (
                                  <label className="keyboard-setup__field">
                                    <span>{t("profile.keyboards.customSwitch")}</span>
                                    <input
                                      value={row.customSwitch}
                                      onChange={(event) => patchOpenSwitch({customSwitch: event.target.value})}
                                    />
                                  </label>
                                )}
                              </div>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                  <button
                    type="button"
                    className="btn-fill-secondary"
                    onClick={addSwitch}
                    disabled={(draft.switches || []).length >= maxSwitches}
                  >
                    {t("profile.keyboards.addSwitch")}
                  </button>
                  {!selectionEnabled && (
                    <p className="keyboard-setup__intro">{t("profile.keyboards.selectKeys")}</p>
                  )}
                </div>
              ) : null}

              {editorMode === "actuation" && !isMembrane && (
                <>
                  <ActuationSlider
                    label={t("profile.keyboards.actuationLabel")}
                    value={selectionActuation.value}
                    mixed={selectionActuation.mixed}
                    disabled={!selectionEnabled}
                    onChange={(actuationMm) => writeSelectionMeta({actuationMm})}
                  />
                  {!selectionEnabled && (
                    <p className="keyboard-setup__intro">{t("profile.keyboards.selectKeys")}</p>
                  )}
                </>
              )}

              {editorMode === "rapidTrigger" && showRapid ? (
                <div className={`keyboard-setup__rt${selectionRtMode.mixed ? " is-mixed" : ""}${selectionEnabled ? "" : " is-disabled"}`}>
                  <StateDisplay
                    className="keyboard-setup__rt-toggle"
                    currentState={selectionRtMode.value}
                    states={["off", "single", "split"]}
                    activeStates={["single", "split"]}
                    onChange={(rtMode) => {
                      if (selectionEnabled) writeSelectionMeta({rtMode});
                    }}
                    label={t("profile.keyboards.rapidTrigger")}
                    width={48}
                  />
                  {selectionRtMode.value === "single" && !selectionRtMode.mixed && (
                    <ActuationSlider
                      label={t("profile.keyboards.actuationLabel")}
                      value={selectionRtActuation.value}
                      mixed={selectionRtActuation.mixed}
                      disabled={!selectionEnabled}
                      onChange={(rapidTriggerActuationMm) => writeSelectionMeta({
                        rtMode: "single",
                        rapidTriggerActuationMm,
                      })}
                    />
                  )}
                  {selectionRtMode.value === "split" && !selectionRtMode.mixed && (
                    <div className="keyboard-setup__rt-points">
                      <ActuationSlider
                        label={t("profile.keyboards.rtPressLabel")}
                        value={selectionRtPress.value}
                        mixed={selectionRtPress.mixed}
                        disabled={!selectionEnabled}
                        onChange={(rapidTriggerPressMm) => writeSelectionMeta({
                          rtMode: "split",
                          rapidTriggerPressMm,
                        })}
                      />
                      <ActuationSlider
                        label={t("profile.keyboards.rtReleaseLabel")}
                        value={selectionRtRelease.value}
                        mixed={selectionRtRelease.mixed}
                        disabled={!selectionEnabled}
                        onChange={(rapidTriggerReleaseMm) => writeSelectionMeta({
                          rtMode: "split",
                          rapidTriggerReleaseMm,
                        })}
                      />
                    </div>
                  )}
                  {!selectionEnabled && (
                    <p className="keyboard-setup__intro">{t("profile.keyboards.selectKeys")}</p>
                  )}
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
