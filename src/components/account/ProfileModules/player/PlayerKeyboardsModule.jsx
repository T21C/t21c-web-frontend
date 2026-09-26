import { useEffect, useState } from "react";
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
import KeyboardSetupPopup from "./KeyboardSetupPopup";
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
                  {laneOptions.length ? (
                    <div className="keyboard-setup__lane-col">
                      <CustomSelect
                        options={laneOptions}
                        value={laneOptions.find((option) => option.value === String(selectedLaneId)) || null}
                        onChange={(option) => setSelectedLaneId(Number(option.value))}
                        width="10rem"
                      />
                      {lanePeriod?.sinceDate && (
                        <p className="keyboard-setup__since">
                          {rangeText(t, lanePeriod.sinceDate, effectiveUntil(lanePeriod, layoutGroup), i18n.language)}
                        </p>
                      )}
                    </div>
                  ) : null}
                </div>
                {geometry && (
                  <KeyboardBoard
                    keys={geometry.keys}
                    activeKeys={activeKeys}
                    emptySockets={emptySocketSet(board)}
                  />
                )}
                {(board?.switch?.name || board?.customSwitch || board?.actuationMm != null || board?.rapidTriggerSplit || board?.rapidTriggerActuationMm != null) && (
                  <div className="keyboard-setup__spec">
                    {(board?.switch?.name || board?.customSwitch) && (
                      <SwitchDiagram
                        className="switch-diagram--spec"
                        stem={board.switch?.stem}
                        sensing={board.switch?.sensing || board.sensing}
                        baseColor={board.baseColor || board.switch?.baseColor}
                        topColor={board.topColor || board.switch?.topColor}
                        stemColor={board.stemColor || board.switch?.stemColor}
                        baseOpacity={board.switch?.baseOpacity}
                      />
                    )}
                    <div className="keyboard-setup__spec-copy">
                      {(board?.switch?.name || board?.customSwitch) && (
                        <p className="keyboard-setup__spec-name">{board.switch?.name || board.customSwitch}</p>
                      )}
                      {board?.actuationMm != null && (
                        <p className="keyboard-setup__spec-line">
                          {t("profile.keyboards.actuation", { mm: board.actuationMm })}
                        </p>
                      )}
                      {board?.rapidTriggerSplit ? (
                        <p className="keyboard-setup__spec-line">
                          {t("profile.keyboards.rtSplit", {
                            press: board.rapidTriggerPressMm ?? "—",
                            release: board.rapidTriggerReleaseMm ?? "—",
                          })}
                        </p>
                      ) : board?.rapidTriggerActuationMm != null && (
                        <p className="keyboard-setup__spec-line">
                          {t("profile.keyboards.rtActuation", { mm: board.rapidTriggerActuationMm })}
                        </p>
                      )}
                    </div>
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
