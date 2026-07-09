export const TRACK_VALUES = ["player", "creator"];

export const STATUS_VALUES = ["draft", "ongoing", "completed", "cancelled"];

export const PLACEMENT_MODE_VALUES = ["profile", "level"];

export const ROW_MODE_VALUES = ["inherit", "profile", "level"];

export const TIER_KIND_VALUES = [
  "ordinal",
  "bracket",
  "round",
  "stage",
  "qualifier",
  "custom",
];

export const TEXT_FIELD_KEYS = [
  "shortName",
  "fullName",
  "aka",
  "youtubeUrl",
  "externalUrl",
  "sortYear",
  "organizers",
];

/** @deprecated Use buildTrackOptions(t) */
export const TRACK_OPTIONS = [
  { value: "player", label: "Player" },
  { value: "creator", label: "Creator" },
];

/** @deprecated Use buildStatusOptions(t) */
export const STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "ongoing", label: "Ongoing" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

export const buildTrackOptions = (t) =>
  TRACK_VALUES.map((value) => ({
    value,
    label: t(`tournamentManagement.form.tracks.${value}`),
  }));

export const buildStatusOptions = (t) =>
  STATUS_VALUES.map((value) => ({
    value,
    label: t(`tournamentManagement.form.statuses.${value}`),
  }));

export const buildAllTracksOptions = (t) => [
  { value: "", label: t("tournamentManagement.allTracks") },
  ...buildTrackOptions(t),
];

export const buildTierKindOptions = (t) =>
  TIER_KIND_VALUES.map((value) => ({
    value,
    label: t(`tournamentManagement.tiers.kindOptions.${value}`),
  }));

export const buildPlacementModeOptions = (t) =>
  PLACEMENT_MODE_VALUES.map((value) => ({
    value,
    label: t(`tournamentManagement.form.placementModes.${value}`),
  }));

export const buildRowModeOptions = (t) =>
  ROW_MODE_VALUES.map((value) => ({
    value,
    label: t(`tournamentManagement.popup.placements.rowModes.${value}`),
  }));

export const findOption = (options, value) =>
  options.find((opt) => opt.value === String(value ?? "")) ?? options[0];

export const emptyTournamentForm = () => ({
  shortName: "",
  fullName: "",
  aka: "",
  track: "player",
  seriesId: "",
  status: "draft",
  isHidden: false,
  isResultsFinal: false,
  youtubeUrl: "",
  packRef: "",
  notes: "",
  externalUrl: "",
  organizers: "",
  sortYear: "",
  placementMode: "profile",
});

export const buildTournamentPayload = (form, { forCreate = false } = {}) => {
  const payload = {
    shortName: form.shortName.trim(),
    fullName: form.fullName.trim() || null,
    aka: form.aka.trim() || null,
    track: form.track,
    seriesId: form.seriesId === "" ? null : Number(form.seriesId),
    status: form.status,
    isHidden: form.isHidden,
    isResultsFinal: form.isResultsFinal,
    youtubeUrl: form.youtubeUrl.trim() || null,
    packRef: form.packRef.trim() || null,
    notes: form.notes.trim() || null,
    externalUrl: form.externalUrl.trim() || null,
    organizers: form.organizers
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    sortYear: form.sortYear === "" ? null : Number(form.sortYear),
    placementMode: form.placementMode || "profile",
  };

  if (forCreate) {
    payload.tierTemplateId = "podium4";
  }

  return payload;
};
