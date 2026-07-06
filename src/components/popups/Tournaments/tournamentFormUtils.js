export const TRACK_OPTIONS = [
  { value: "player", label: "Player" },
  { value: "creator", label: "Creator" },
];

export const STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "ongoing", label: "Ongoing" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

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
  tierTemplateId: "podium4",
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
  };

  if (forCreate) {
    payload.tierTemplateId = form.tierTemplateId || "podium4";
  } else if (form.tierTemplateId) {
    payload.tierTemplateId = form.tierTemplateId;
  }

  return payload;
};

export const TEXT_FIELDS = [
  ["shortName", "Short name"],
  ["fullName", "Full name"],
  ["aka", "AKA"],
  ["youtubeUrl", "YouTube"],
  ["packRef", "Pack ref"],
  ["externalUrl", "External URL"],
  ["sortYear", "Sort year"],
  ["organizers", "Organizers (comma-separated)"],
];
