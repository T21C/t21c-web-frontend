import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import { Collapsible, CollapsibleContent } from "@/components/common/Collapsible";
import { ChevronIcon } from "@/components/common/icons";
import { CustomSelect } from "@/components/common/selectors";
import api from "@/utils/api";
import { routes } from "@/api/routes";
import { formatDateShort } from "@/utils/Utility";
import KeyboardBoard from "./KeyboardBoard";
import SwitchDiagram from "./SwitchDiagram";
import SwitchTopPlaceholder from "./SwitchTopPlaceholder";
import KeyboardSetupPopup from "./KeyboardSetupPopup";
import {depthPaints} from "./keyboardPaint";
import {layoutSource, switchTopPaint} from "./keyboardSetupDraft";
import {
  boardProductLabel,
  currentPeriod,
  effectiveUntil,
  findPeriodAt,
  periodCoversDate,
} from "@/utils/keyboards/keys";
import "./keyboardSetup.css";

function utcToday() {
  return new Date().toISOString().slice(0, 10);
}

function keyedLanePeriods(row) {
  return (row?.periods || []).filter((period) => !period.isGap && period.keys?.length);
}

function sameRigKeyCount(lanes, count) {
  return (lanes || []).flatMap((row) => keyedLanePeriods(row).filter((period) => period.keys.length === count));
}

function coveringKeyedPeriod(lane, lanes, isoDate) {
  const keyed = keyedLanePeriods(lane);
  const covering = keyed.filter((period) => periodCoversDate(period, isoDate, sameRigKeyCount(lanes, period.keys.length)));
  return currentPeriod(covering) || currentPeriod(keyed);
}

function rangeText(t, from, to, language) {
  if (!from) return null;
  const fromLabel = formatDateShort(from, language);
  if (!to) return t("profile.keyboards.fromDate", { date: fromLabel });
  return t("profile.keyboards.fromTo", { from: fromLabel, to: formatDateShort(to, language) });
}

function laneLabel(row) {
  const name = typeof row?.name === "string" ? row.name.trim() : "";
  return name || `${row?.keyCount || 0}K`;
}

function emptySocketSet(board) {
  return new Set(
    (board?.keyOverrides || []).filter((row) => row.socketEmpty).map((row) => row.code),
  );
}

function presentLayout(board, setup, catalogSwitches) {
  const source = layoutSource(board, setup);
  if (!source) return null;
  if (!setup || source.sensing === "membrane") return source;
  const named = (row) => (
    (catalogSwitches || []).find((item) => String(item.id) === String(row?.switchId)) || null
  );
  const switches = (source.switches || []).map((row) => ({
    ...row,
    switch: named(row),
  }));
  return { ...source, switches, switch: named(source) };
}

function switchFills(codes, source, catalogSwitches) {
  const paint = {};
  if (!source || source.sensing === "membrane") return paint;
  const list = source.switches || [];
  const byCode = new Map((source.keyOverrides || []).map((row) => [row.code, row]));
  const fallback = {
    switchId: source.switchId,
    stemColor: source.stemColor,
    baseColor: source.baseColor,
    topColor: source.topColor,
    baseOpacity: source.baseOpacity,
    stem: source.switch?.stem,
    switch: source.switch,
  };
  for (const code of codes) {
    const override = byCode.get(code);
    if (override?.switchAbsent) {
      paint[code] = { switchTop: { absent: true } };
      continue;
    }
    const indexed = override?.periodSwitchIndex != null ? list[override.periodSwitchIndex] : null;
    paint[code] = { switchTop: switchTopPaint(indexed || fallback, catalogSwitches) };
  }
  return paint;
}

function switchLegend(row, board) {
  if (row?.absent) return { absent: true, name: "" };
  const catalog = row?.switch || null;
  return {
    name: String(catalog?.name || row?.customSwitch || "").trim(),
    stem: catalog?.stem || null,
    sensing: catalog?.sensing || board?.sensing || null,
    baseColor: row?.baseColor || catalog?.baseColor || null,
    topColor: row?.topColor || catalog?.topColor || null,
    stemColor: row?.stemColor || catalog?.stemColor || null,
    baseOpacity: row?.baseOpacity == null ? (catalog?.baseOpacity ?? null) : row.baseOpacity,
  };
}

function boardLegend(board) {
  return {
    name: String(board?.switch?.name || board?.customSwitch || "").trim(),
    stem: board?.switch?.stem || null,
    sensing: board?.switch?.sensing || board?.sensing || null,
    baseColor: board?.baseColor || board?.switch?.baseColor || null,
    topColor: board?.topColor || board?.switch?.topColor || null,
    stemColor: board?.stemColor || board?.switch?.stemColor || null,
    baseOpacity: board?.baseOpacity == null ? (board?.switch?.baseOpacity ?? null) : board.baseOpacity,
  };
}

function usedSwitchLegends(board, codes) {
  const list = board?.switches || [];
  const byCode = new Map((board?.keyOverrides || []).map((row) => [row.code, row]));
  const used = new Set();
  let bareDefault = !codes.length && !list.length;
  if (!codes.length) {
    list.forEach((row, index) => {
      if (!row.absent) used.add(index);
    });
  } else {
    for (const code of codes) {
      const override = byCode.get(code);
      if (override?.switchAbsent) continue;
      const idx = override?.periodSwitchIndex;
      if (idx != null && list[idx] && !list[idx].absent) used.add(idx);
      else if (idx == null || !list[idx]) bareDefault = true;
    }
  }
  if (bareDefault && board?.switchId != null) {
    const match = list.findIndex((row) => String(row.switchId) === String(board.switchId));
    if (match >= 0) {
      used.add(match);
      bareDefault = false;
    }
  }
  const legends = [];
  const seen = new Set();
  const push = (legend, key) => {
    if (!legend.name || legend.absent || seen.has(key)) return;
    seen.add(key);
    legends.push({ ...legend, key });
  };
  if (bareDefault) {
    const legend = boardLegend(board);
    push(legend, board?.switchId ? `board:${board.switchId}` : `board:${legend.name}`);
  }
  [...used].sort((left, right) => left - right).forEach((index) => {
    const row = list[index];
    if (row.absent) return;
    const key = row.switchId != null ? `id:${row.switchId}` : `idx:${index}:${row.customSwitch || ""}`;
    push(switchLegend(row, board), key);
  });
  return legends;
}

function boardCardSpec(board, geometry) {
  if (!board) return { membrane: false, switches: [] };
  if (board.sensing === "membrane") return { membrane: true, switches: [] };
  const empty = emptySocketSet(board);
  const codes = (geometry?.keys || [])
    .filter((key) => key.bindable !== false && !empty.has(key.code))
    .map((key) => key.code);
  return {
    membrane: false,
    switches: usedSwitchLegends(board, codes),
  };
}

function mergeRig(rigs, next) {
  const list = Array.isArray(rigs) ? [...rigs] : [];
  const index = list.findIndex((row) => row.id === next.id);
  if (index === -1) return [...list, next];
  list[index] = next;
  return list;
}

export default function PlayerKeyboardsModule({
  isOwner,
  setup,
  catalog,
  collapsed,
  onCollapsedChange,
  onSetupChange,
}) {
  const { t, i18n } = useTranslation(["pages", "common"]);
  const expanded = !collapsed;
  const [saving, setSaving] = useState(false);
  const [selectedRigId, setSelectedRigId] = useState(null);
  const [selectedLaneId, setSelectedLaneId] = useState(null);
  const [viewMode, setViewMode] = useState("layout");
  const [editorOpen, setEditorOpen] = useState(false);

  const rigs = setup?.rigs || [];
  const geometries = catalog?.geometries || [];

  useEffect(() => {
    if (!rigs.length) {
      setSelectedRigId(null);
      return;
    }
    if (!rigs.some((rig) => rig.id === selectedRigId)) {
      setSelectedRigId(rigs[0].id);
    }
  }, [rigs, selectedRigId]);

  const rig = rigs.find((row) => row.id === selectedRigId) || rigs[0] || null;
  const lanes = rig?.lanes || [];

  useEffect(() => {
    if (!lanes.length) {
      setSelectedLaneId(null);
      return;
    }
    if (!lanes.some((lane) => lane.id === selectedLaneId)) {
      setSelectedLaneId(lanes[lanes.length - 1].id);
    }
  }, [lanes, selectedLaneId]);

  useEffect(() => {
    setViewMode("layout");
  }, [selectedRigId]);

  const lane = lanes.find((row) => row.id === selectedLaneId) || lanes[0] || null;
  const today = utcToday();
  const boards = (rig?.boardPeriods || []).filter((period) => !period.isGap);
  const board = findPeriodAt(boards, today) || currentPeriod(boards);
  const lanePeriod = coveringKeyedPeriod(lane, lanes, today);
  const layoutCount = lanePeriod?.keys?.length || lane?.keyCount;
  const layoutGroup = sameRigKeyCount(lanes, layoutCount);
  const geometry = board?.geometry || geometries.find((row) => row.id === board?.geometryId);
  const activeKeys = new Set(lanePeriod?.keys || []);
  const laneOptions = lanes.map((row) => ({
    value: String(row.id),
    label: laneLabel(row),
  }));
  const formFactors = catalog?.formFactors || [];
  const factorName =
    formFactors.find((row) => row.slug === geometry?.formFactor)?.name || null;
  const viewBoard = presentLayout(board, lanePeriod?.setup, catalog?.switches) || board;
  const viewOptions = useMemo(() => {
    const options = [{ value: "layout", label: t("profile.keyboards.layout") }];
    if (viewBoard?.sensing && viewBoard.sensing !== "membrane") {
      options.push(
        { value: "switches", label: t("profile.keyboards.modes.switches") },
        { value: "actuation", label: t("profile.keyboards.modes.actuation") },
      );
      if (viewBoard.sensing === "hall") {
        options.push({ value: "rapidTrigger", label: t("profile.keyboards.modes.rapidTrigger") });
      }
    }
    return options;
  }, [t, viewBoard?.sensing]);
  useEffect(() => {
    if (!viewOptions.some((option) => option.value === viewMode)) setViewMode("layout");
  }, [viewMode, viewOptions]);
  const paintCodes = (geometry?.keys || [])
    .filter((key) => key.bindable !== false && !emptySocketSet(viewBoard).has(key.code))
    .map((key) => key.code);
  const paintByCode = viewMode === "layout" || viewBoard?.sensing === "membrane"
    ? undefined
    : viewMode === "switches"
      ? switchFills(paintCodes, viewBoard, catalog?.switches)
      : depthPaints(viewMode, paintCodes, {
        board: viewBoard,
        keyByCode: new Map((viewBoard?.keyOverrides || []).map((row) => [row.code, row])),
      });
  const boardNote = String(board?.note || "").trim();
  const spec = boardCardSpec(viewBoard, geometry);
  const hasSwitchSpec = Boolean(spec.membrane || spec.switches.length);

  async function createRig() {
    setSaving(true);
    const toastId = toast.loading(t("loading.creating", { ns: "common" }));
    try {
      const { data } = await api.post(routes.playersV3.meKeyboardRigs(), {});
      onSetupChange?.({
        ...(setup || {}),
        visible: true,
        rigs: [...(setup?.rigs || []), data],
      });
      setSelectedRigId(data.id);
      setEditorOpen(true);
      toast.success(t("profile.keyboards.created"), { id: toastId });
    } catch (err) {
      toast.error(err.response?.data?.error || t("profile.keyboards.saveError"), { id: toastId });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="player-page__section keyboard-setup">
      <div className="account-profile-page__section-title-row">
        <h2 className="account-profile-page__section-title">{t("profile.keyboards.header")}</h2>
        <button
          type="button"
          className="account-profile-page__chevron-btn"
          aria-expanded={expanded}
          onClick={() => onCollapsedChange(!collapsed)}
        >
          <ChevronIcon direction={expanded ? "down" : "right"} />
        </button>
      </div>
      <Collapsible open={!collapsed} onOpenChange={(open) => onCollapsedChange(!open)} duration="0.3s">
        <CollapsibleContent>
          <div className="account-profile-page__collapsible keyboard-setup">
            {!rigs.length ? <p className="keyboard-setup__intro">{t("profile.keyboards.empty")}</p> : null}
            {isOwner && (
              <div className="keyboard-setup__actions">
                <button type="button" className="btn-fill-secondary" onClick={createRig} disabled={saving}>
                  {t("profile.keyboards.addRig")}
                </button>
                {rig && (
                  <button type="button" className="btn-fill-secondary" onClick={() => setEditorOpen(true)}>
                    {t("profile.keyboards.edit")}
                  </button>
                )}
              </div>
            )}

            {rigs.length > 1 && (
              <CustomSelect
                options={rigs.map((row) => ({
                  value: String(row.id),
                  label: row.name || t("profile.keyboards.unnamed"),
                }))}
                value={
                  rigs
                    .map((row) => ({
                      value: String(row.id),
                      label: row.name || t("profile.keyboards.unnamed"),
                    }))
                    .find((option) => option.value === String(selectedRigId)) || null
                }
                onChange={(option) => setSelectedRigId(Number(option.value))}
                width="16rem"
              />
            )}

            {rig && (
              <div className="keyboard-setup__card">
                <div className="keyboard-setup__card-head">
                  <div className="keyboard-setup__identity">
                    <h3 className="keyboard-setup__title">
                      {boardProductLabel(board) || rig.name || t("profile.keyboards.unnamed")}
                    </h3>
                    {factorName ? <p className="keyboard-setup__factor">{factorName}</p> : null}
                    {board?.sinceDate && (
                      <p className="keyboard-setup__since">
                        {rangeText(t, board.sinceDate, effectiveUntil(board, boards), i18n.language)}
                      </p>
                    )}
                  </div>
                  {(board || laneOptions.length > 0) && (
                    <div className="keyboard-setup__lane-col">
                      <div className="keyboard-setup__lane-tools">
                        {board && (
                          <CustomSelect
                            options={viewOptions}
                            value={viewOptions.find((option) => option.value === viewMode) || viewOptions[0]}
                            onChange={(option) => option && setViewMode(option.value)}
                            width="12rem"
                          />
                        )}
                        {laneOptions.length > 0 && (
                          <CustomSelect
                            options={laneOptions}
                            value={laneOptions.find((option) => option.value === String(selectedLaneId)) || null}
                            onChange={(option) => setSelectedLaneId(Number(option.value))}
                            width="10rem"
                          />
                        )}
                      </div>
                      {lanePeriod?.sinceDate && (
                        <p className="keyboard-setup__since">
                          {rangeText(t, lanePeriod.sinceDate, effectiveUntil(lanePeriod, layoutGroup), i18n.language)}
                        </p>
                      )}
                    </div>
                  )}
                </div>
                {geometry && (
                  <KeyboardBoard
                    keys={geometry.keys}
                    activeKeys={viewMode === "layout" ? activeKeys : undefined}
                    emptySockets={emptySocketSet(viewBoard)}
                    paintByCode={paintByCode}
                    keepFillOnHover
                  />
                )}
                {(hasSwitchSpec || boardNote) && (
                  <div className="keyboard-setup__spec">
                    {hasSwitchSpec && (
                      <div className="keyboard-setup__spec-main">
                        {spec.membrane ? (
                          <div className="keyboard-setup__spec-switches">
                            <div className="keyboard-setup__spec-switch">
                              <SwitchDiagram className="switch-diagram--spec" sensing="membrane" />
                              <p className="keyboard-setup__spec-name">{t("profile.keyboards.sensing.membrane")}</p>
                            </div>
                          </div>
                        ) : spec.switches.length > 0 && (
                          <div className="keyboard-setup__spec-switches">
                            {spec.switches.map((sw) => (
                              <div key={sw.key} className="keyboard-setup__spec-switch">
                                {sw.absent ? (
                                  <SwitchTopPlaceholder absent size="3.5rem" />
                                ) : (
                                  <SwitchDiagram
                                    className="switch-diagram--spec"
                                    stem={sw.stem}
                                    sensing={sw.sensing}
                                    baseColor={sw.baseColor}
                                    topColor={sw.topColor}
                                    stemColor={sw.stemColor}
                                    baseOpacity={sw.baseOpacity}
                                  />
                                )}
                                <p className="keyboard-setup__spec-name">
                                  {sw.absent ? t("profile.keyboards.noSwitch") : sw.name}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                    {boardNote && (
                      <p className="keyboard-setup__note">{board.note}</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
      {editorOpen && rig ? (
        <KeyboardSetupPopup
          rig={rig}
          catalog={catalog}
          initialSince={lanePeriod?.sinceDate || null}
          initialLaneId={selectedLaneId}
          onClose={() => setEditorOpen(false)}
          onSaved={(next) => {
            onSetupChange?.({ ...(setup || {}), visible: true, rigs: mergeRig(setup?.rigs, next) });
            setEditorOpen(false);
          }}
          onRigChange={(next) => {
            onSetupChange?.({ ...(setup || {}), visible: true, rigs: mergeRig(setup?.rigs, next) });
          }}
          onDuplicated={(next) => {
            onSetupChange?.({ ...(setup || {}), visible: true, rigs: mergeRig(setup?.rigs, next) });
          }}
          onDeleted={() => {
            const nextRigs = (setup?.rigs || []).filter((row) => row.id !== rig.id);
            onSetupChange?.({ ...(setup || {}), visible: true, rigs: nextRigs });
            setSelectedRigId(nextRigs[0]?.id ?? null);
            setEditorOpen(false);
          }}
        />
      ) : null}
    </section>
  );
}
