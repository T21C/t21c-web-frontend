// tuf-search: #AssetsPage #assetsPage #misc
import { Component, useMemo, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import { MetaTags } from "@/components/common/display";
import { buildStaticPageMeta } from '@/utils/meta';
import { useLocation } from 'react-router-dom';
import { Footer } from "@/components/layout";
import { useDifficultyContext } from "@/contexts/DifficultyContext";
import {
  getIconGalleryDemoProps,
  getIconGalleryModuleEntries,
  resolveIconGalleryComponent,
} from "@/components/common/icons/iconGalleryModules";
import { getStaticAssetGalleryEntries } from "@/utils/staticAssetGalleryModules";
import { selectIconSize } from "@/utils/Utility";
import { StateDisplay } from "@/components/common/selectors";
import { CopyIcon, DownloadIcon, ExternalLinkIcon } from "@/components/common/icons";
import "./assetsPage.css";
import { Tooltip } from "react-tooltip";

const ASSET_ACTION_ICON_SIZE = 18;
const DIFF_COLOR_COPY_ICON_SIZE = 14;
const DOWNLOAD_ALL_ICON_SIZE = 16;
const STATIC_FONT_EXT_RE = /\.(woff2?|ttf)$/i;

function extensionFromUrl(url) {
  try {
    const baseHref = typeof window !== "undefined" ? window.location.href : "http://localhost";
    const u = new URL(url, baseHref);
    const last = u.pathname.split("/").filter(Boolean).pop() || "";
    const dot = last.lastIndexOf(".");
    if (dot > 0 && dot < last.length - 1) return last.slice(dot);
  } catch {
    /* ignore */
  }
  return "";
}

function extensionFromMime(mime) {
  if (!mime || typeof mime !== "string") return "";
  const type = mime.split(";")[0].trim().toLowerCase();
  const map = {
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/webp": ".webp",
    "image/gif": ".gif",
    "image/svg+xml": ".svg",
    "image/x-icon": ".ico",
    "image/vnd.microsoft.icon": ".ico",
  };
  return map[type] || "";
}

function suggestFilenameFromUrl(url, fallbackStem) {
  try {
    const baseHref = typeof window !== "undefined" ? window.location.href : "http://localhost";
    const u = new URL(url, baseHref);
    const last = u.pathname.split("/").filter(Boolean).pop();
    if (last && last.includes(".")) return last;
  } catch {
    /* ignore */
  }
  return fallbackStem;
}

function uniqueZipFilename(stem, url, blob, usedNames) {
  const baseStem = String(stem || "file").replace(/[\\/:*?"<>|]/g, "-").trim() || "file";
  const ext = extensionFromUrl(url) || extensionFromMime(blob?.type) || "";
  let candidate = `${baseStem}${ext}`;
  if (!usedNames.has(candidate)) {
    usedNames.add(candidate);
    return candidate;
  }
  let n = 2;
  while (usedNames.has(`${baseStem}-${n}${ext}`)) n += 1;
  candidate = `${baseStem}-${n}${ext}`;
  usedNames.add(candidate);
  return candidate;
}

function triggerBlobDownload(blob, filename) {
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
}

async function downloadAssetFromUrl(url, filename) {
  const safe = filename && String(filename).trim() ? String(filename).trim() : "download";
  try {
    const res = await fetch(url, { mode: "cors" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    triggerBlobDownload(blob, safe);
  } catch {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}

/**
 * @param {{ url: string, stem: string }[]} entries
 * @param {string} zipFilename
 * @returns {Promise<{ ok: number, failed: number }>}
 */
async function downloadAssetsAsZip(entries, zipFilename) {
  const list = Array.isArray(entries) ? entries.filter((e) => e?.url) : [];
  if (list.length === 0) return { ok: 0, failed: 0 };

  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();
  const usedNames = new Set();
  let ok = 0;
  let failed = 0;

  await Promise.all(
    list.map(async ({ url, stem }) => {
      try {
        const res = await fetch(url, { mode: "cors", origin: "same-origin" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const blob = await res.blob();
        const name = uniqueZipFilename(stem, url, blob, usedNames);
        zip.file(name, blob);
        ok += 1;
      } catch {
        failed += 1;
      }
    }),
  );

  if (ok === 0) return { ok, failed };

  const zipBlob = await zip.generateAsync({ type: "blob" });
  const safeZip =
    zipFilename && String(zipFilename).trim() ? String(zipFilename).trim() : "assets.zip";
  triggerBlobDownload(zipBlob, safeZip);
  return { ok, failed };
}

function AssetUrlActions({ url, downloadStem }) {
  const { t } = useTranslation("pages");
  if (!url) return null;
  const filename = suggestFilenameFromUrl(url, downloadStem);
  return (
    <div className="assets-page__asset-actions" role="group" aria-label={t("assets.actions.groupAria")}>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="assets-page__asset-action btn-fill-neutral"
        aria-label={t("assets.actions.open")}
      >
        <ExternalLinkIcon size={ASSET_ACTION_ICON_SIZE} color="currentColor" aria-hidden />
      </a>
      <button
        type="button"
        className="assets-page__asset-action btn-fill-neutral"
        aria-label={t("assets.actions.download")}
        onClick={() => void downloadAssetFromUrl(url, filename)}
      >
        <DownloadIcon size={`${ASSET_ACTION_ICON_SIZE}px`} color="currentColor" aria-hidden />
      </button>
    </div>
  );
}

function SectionDownloadAll({ entries, zipFilename }) {
  const { t } = useTranslation("pages");
  const [busy, setBusy] = useState(false);
  const count = Array.isArray(entries) ? entries.length : 0;
  const disabled = busy || count === 0;

  const handleClick = () => {
    if (disabled) return;
    if (count === 0) {
      toast.error(t("assets.actions.downloadAllEmpty"));
      return;
    }
    setBusy(true);
    void (async () => {
      try {
        const { ok, failed } = await downloadAssetsAsZip(entries, zipFilename);
        if (ok === 0) {
          toast.error(t("assets.actions.downloadAllFailed"));
        } else if (failed > 0) {
          toast.success(t("assets.actions.downloadAllPartial", { ok, failed }));
        } else {
          toast.success(t("assets.actions.downloadAllSuccess", { count: ok }));
        }
      } catch {
        toast.error(t("assets.actions.downloadAllFailed"));
      } finally {
        setBusy(false);
      }
    })();
  };

  return (
    <button
      type="button"
      className="assets-page__download-all btn-fill-neutral"
      disabled={disabled}
      aria-busy={busy || undefined}
      onClick={handleClick}
    >
      <DownloadIcon size={`${DOWNLOAD_ALL_ICON_SIZE}px`} color="currentColor" aria-hidden />
      <span>{busy ? t("assets.actions.downloadAllBusy") : t("assets.actions.downloadAll")}</span>
    </button>
  );
}

class IconCellErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return <span className="assets-page__icon-fallback">{this.props.fallbackLabel}</span>;
    }
    return this.props.children;
  }
}

function JsxIconCell({ id, Comp, demoProps }) {
  return (
    <div className="assets-page__jsx-icon-cell">
      <div className="assets-page__jsx-icon-preview">
        <IconCellErrorBoundary fallbackLabel={id}>
          <Comp {...demoProps} />
        </IconCellErrorBoundary>
      </div>
      <code className="assets-page__mono-label" title={id}>
        {id}
      </code>
    </div>
  );
}

function groupTagsByGroup(tags) {
  const map = new Map();
  for (const tag of tags) {
    const g = tag.group || "";
    if (!map.has(g)) map.set(g, []);
    map.get(g).push(tag);
  }
  for (const list of map.values()) {
    list.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  }
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
}

export default function AssetsPage() {
  const { t } = useTranslation("pages");
  const {
    difficulties,
    loading: diffsLoading,
    error: diffsError,
    tags,
    tagsLoading,
    tagsError,
    curationTypes,
    curationTypesLoading,
    curationTypesError,
  } = useDifficultyContext();

  const [assetQuery, setAssetQuery] = useState("");
  const [jsxQuery, setJsxQuery] = useState("");
  const [tagQuery, setTagQuery] = useState("");
  const [difficultyNameQuery, setDifficultyNameQuery] = useState("");
  /** `show` = include `LEGACY` difficulties; `hide` = omit them. */
  const [legacyDifficultiesState, setLegacyDifficultiesState] = useState("show");

  const location = useLocation();
  const pageMeta = useMemo(
    () =>
      buildStaticPageMeta({
        title: t('assets.meta.title'),
        description: t('assets.meta.description'),
        pathname: location.pathname,
        image: '/og-image.jpg',
        type: 'website',
      }),
    [t, location.pathname],
  );

  const jsxEntries = useMemo(() => {
    const all = getIconGalleryModuleEntries();
    const q = jsxQuery.trim().toLowerCase();
    if (!q) return all;
    return all.filter((e) => e.id.toLowerCase().includes(q));
  }, [jsxQuery]);

  const staticAssetEntries = useMemo(() => {
    const all = getStaticAssetGalleryEntries();
    const q = assetQuery.trim().toLowerCase();
    if (!q) return all;
    return all.filter((e) => e.id.toLowerCase().includes(q));
  }, [assetQuery]);

  const tagGroups = useMemo(() => groupTagsByGroup(Array.isArray(tags) ? tags : []), [tags]);

  const tagGroupsFiltered = useMemo(() => {
    const q = tagQuery.trim().toLowerCase();
    if (!q) return tagGroups;
    return tagGroups
      .map(([groupName, groupTags]) => {
        const groupLower = String(groupName || "").toLowerCase();
        const groupMatches = groupLower.includes(q);
        const filteredTags = groupMatches
          ? groupTags
          : groupTags.filter((tag) => String(tag.name || "").toLowerCase().includes(q));
        return [groupName, filteredTags];
      })
      .filter(([, groupTags]) => groupTags.length > 0);
  }, [tagGroups, tagQuery]);

  const difficultiesSorted = useMemo(() => {
    const sorted = [...(difficulties || [])].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    if (legacyDifficultiesState === "hide") {
      return sorted.filter((d) => d.type !== "LEGACY");
    }
    return sorted;
  }, [difficulties, legacyDifficultiesState]);

  const difficultiesFiltered = useMemo(() => {
    const q = difficultyNameQuery.trim().toLowerCase();
    if (!q) return difficultiesSorted;
    return difficultiesSorted.filter((d) => String(d.name || "").toLowerCase().includes(q));
  }, [difficultiesSorted, difficultyNameQuery]);

  const curationSorted = useMemo(() => {
    return [...(curationTypes || [])].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  }, [curationTypes]);

  const tagDownloadEntries = useMemo(() => {
    const entries = [];
    for (const [, groupTags] of tagGroupsFiltered) {
      for (const tag of groupTags) {
        if (!tag.icon) continue;
        entries.push({
          url: selectIconSize(tag.icon, "original"),
          stem: `tag-${tag.id}`,
        });
      }
    }
    return entries;
  }, [tagGroupsFiltered]);

  const difficultyDownloadEntries = useMemo(() => {
    return difficultiesFiltered
      .filter((d) => d.icon)
      .map((d) => ({
        url: selectIconSize(d.icon, "original"),
        stem: `difficulty-${d.id}`,
      }));
  }, [difficultiesFiltered]);

  const curationDownloadEntries = useMemo(() => {
    return curationSorted
      .filter((ct) => ct.icon)
      .map((ct) => ({
        url: selectIconSize(ct.icon, "original"),
        stem: `curation-type-${ct.id}`,
      }));
  }, [curationSorted]);

  const staticImageDownloadEntries = useMemo(() => {
    return staticAssetEntries
      .filter((entry) => !STATIC_FONT_EXT_RE.test(entry.id))
      .map((entry) => ({
        url: entry.url,
        stem: entry.id.replace(/\//g, "-"),
      }));
  }, [staticAssetEntries]);

  return (
    <>
      <MetaTags {...pageMeta} />
      <div className="assets-page">
        <div className="assets-page__container page-content-70rem">
          <header className="assets-page__header">
            <h1>{t("assets.header.title")}</h1>
            <p className="assets-page__lede">
              <Trans
                ns="pages"
                i18nKey="assets.header.lede"
                components={{
                  code: <code className="assets-page__inline-code" />,
                }}
              />
            </p>
          </header>

          <section className="assets-page__section" aria-labelledby="assets-tags-heading">
            <div className="assets-page__section-header">
              <h2 id="assets-tags-heading">{t("assets.sections.tags.title")}</h2>
              <SectionDownloadAll entries={tagDownloadEntries} zipFilename="tuf-level-tags.zip" />
            </div>
            <div className="assets-page__filter-row">
              <input
                id="assets-tags-filter"
                type="search"
                className="assets-page__filter-input"
                value={tagQuery}
                onChange={(e) => setTagQuery(e.target.value)}
                placeholder={t("assets.filter.placeholderTags")}
                autoComplete="off"
              />
            </div>
            {tagsError ? (
              <p className="assets-page__status assets-page__status--error" role="alert">
                {tagsError}
              </p>
            ) : null}
            {!tagsLoading && !tagsError && tagGroups.length === 0 ? (
              <p className="assets-page__status">{t("assets.status.empty")}</p>
            ) : null}
            {!tagsLoading && !tagsError && tagGroups.length > 0 && tagGroupsFiltered.length === 0 ? (
              <p className="assets-page__status">{t("assets.filter.noMatches")}</p>
            ) : null}
            <div className="assets-page__tag-groups">
              {tagGroupsFiltered.map(([groupName, groupTags]) => (
                <div key={groupName || "ungrouped"} className="assets-page__tag-group">
                  {groupName ? <h3 className="assets-page__tag-group-title">{groupName}</h3> : null}
                  <div className="assets-page__tag-grid">
                    {groupTags.map((tag) => {
                      const tagIconUrl = tag.icon ? selectIconSize(tag.icon, "original") : null;
                      return (
                      <div key={tag.id} className="assets-page__tag-card">
                        <div className="assets-page__tag-card-top">
                        <div
                          className="assets-page__tag-swatch"
                        >
                          {tagIconUrl ? (
                            <img src={tagIconUrl} alt="" className="assets-page__tag-img" decoding="async" />
                          ) : (
                            <span className="assets-page__tag-letter" style={{ color: tag.color }}>
                              {(tag.name || "?").charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div className="assets-page__tag-meta">
                          <span className="assets-page__tag-name">{tag.name}</span>
                          <code className="assets-page__mono-muted">id {tag.id}</code>
                        </div>
                        </div>
                        {tagIconUrl ? (
                          <AssetUrlActions url={tagIconUrl} downloadStem={`tag-${tag.id}`} />
                        ) : null}
                      </div>
                    );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="assets-page__section" aria-labelledby="assets-diffs-heading">
            <div className="assets-page__section-header">
              <h2 id="assets-diffs-heading">{t("assets.sections.difficulties.title")}</h2>
              <SectionDownloadAll
                entries={difficultyDownloadEntries}
                zipFilename="tuf-difficulty-icons.zip"
              />
            </div>
            <div className="assets-page__diff-controls">
              <StateDisplay
                className="assets-page__diff-legacy-state"
                currentState={legacyDifficultiesState}
                states={["hide", "show"]}
                onChange={setLegacyDifficultiesState}
                label={t("assets.difficultiesFilter.legacyToggleLabel")}
              />
            </div>
            <div className="assets-page__filter-row">
              <input
                id="assets-diff-name-filter"
                type="search"
                className="assets-page__filter-input"
                value={difficultyNameQuery}
                onChange={(e) => setDifficultyNameQuery(e.target.value)}
                placeholder={t("assets.filter.placeholderDifficultyName")}
                autoComplete="off"
              />
            </div>
            {diffsLoading ? <p className="assets-page__status">{t("assets.status.loading")}</p> : null}
            {diffsError ? (
              <p className="assets-page__status assets-page__status--error" role="alert">
                {diffsError}
              </p>
            ) : null}
            {!diffsLoading && !diffsError && difficultiesSorted.length > 0 && difficultiesFiltered.length === 0 ? (
              <p className="assets-page__status">{t("assets.filter.noMatches")}</p>
            ) : null}
            <div className="assets-page__diff-grid">
              {difficultiesFiltered.map((d) => {
                const diffIconUrl = d.icon ? selectIconSize(d.icon, "original") : null;
                return (
                <div key={d.id} className="assets-page__diff-card">
                  <div
                    className="assets-page__diff-icon-wrap"
                  >
                    {diffIconUrl ? (
                      <img src={diffIconUrl} alt="" className="assets-page__diff-img" decoding="async" />
                    ) : (
                      <span className="assets-page__diff-fallback">{d.name?.slice(0, 2) ?? d.id}</span>
                    )}
                  </div>
                  <div className="assets-page__diff-meta">
                    <div className="assets-page__diff-title-row">
                      <span className="assets-page__diff-name">{d.name}</span>
                    </div>
                    <span className="assets-page__diff-type">{d.type}</span>
                    {d.color ? (
                      <div className="assets-page__diff-color-row">
                        <span className="assets-page__color-chip" style={{ background: d.color }} title={d.color} />
                        <button
                          type="button"
                          className="assets-page__color-copy"
                          aria-label={t("assets.actions.copyColorHex", { color: d.color })}
                          onClick={() => {
                            void (async () => {
                              try {
                                await navigator.clipboard.writeText(d.color);
                                toast.success(t("assets.actions.colorCopied", { color: d.color }));
                              } catch {
                                toast.error(t("assets.actions.colorCopyFailed"));
                              }
                            })();
                          }}
                        >
                          <CopyIcon data-tooltip-id={`diff-color-copy-tooltip-${d.id}`} size={DIFF_COLOR_COPY_ICON_SIZE} color="currentColor" aria-hidden />
                        </button>
                        <Tooltip id={`diff-color-copy-tooltip-${d.id}`} place="bottom" style={{ zIndex: 10 }}>
                          <span>{t("assets.actions.copyColorHex", { color: d.color })}</span>
                        </Tooltip>
                      </div>
                    ) : null}
                  </div>
                  {diffIconUrl ? <AssetUrlActions url={diffIconUrl} downloadStem={`difficulty-${d.id}`} /> : null}
                </div>
              );
              })}
            </div>
          </section>

          <section className="assets-page__section" aria-labelledby="assets-curation-heading">
            <div className="assets-page__section-header">
              <h2 id="assets-curation-heading">{t("assets.sections.curationTypes.title")}</h2>
              <SectionDownloadAll
                entries={curationDownloadEntries}
                zipFilename="tuf-curation-types.zip"
              />
            </div>
            <p className="assets-page__section-hint">{t("assets.sections.curationTypes.hint")}</p>
            {curationTypesLoading ? <p className="assets-page__status">{t("assets.status.loading")}</p> : null}
            {curationTypesError ? (
              <p className="assets-page__status assets-page__status--error" role="alert">
                {curationTypesError}
              </p>
            ) : null}
            <div className="assets-page__curation-grid">
              {curationSorted.map((ct) => {
                const curationIconUrl = ct.icon ? selectIconSize(ct.icon, "original") : null;
                return (
                <div key={ct.id} className="assets-page__curation-card">
                  <div className="assets-page__curation-icon-wrap">
                    {curationIconUrl ? (
                      <img src={curationIconUrl} alt="" className="assets-page__curation-img" decoding="async" />
                    ) : (
                      <span className="assets-page__curation-fallback">{ct.name?.slice(0, 1) ?? "?"}</span>
                    )}
                  </div>
                  <div className="assets-page__curation-meta">
                    <span className="assets-page__curation-name">{ct.name}</span>
                    <p className="assets-page__curation-id-row">
                      <span className="assets-page__meta-id-label">id</span>
                      <span className="assets-page__meta-id-value">{ct.id}</span>
                    </p>
                  </div>
                  {curationIconUrl ? (
                    <AssetUrlActions url={curationIconUrl} downloadStem={`curation-type-${ct.id}`} />
                  ) : null}
                </div>
              );
              })}
            </div>
          </section>

          <section className="assets-page__section" aria-labelledby="assets-jsx-heading">
            <h2 id="assets-jsx-heading">{t("assets.sections.jsxIcons.title")}</h2>
            <p className="assets-page__section-hint">
              <Trans
                ns="pages"
                i18nKey="assets.sections.jsxIcons.hint"
                components={{
                  code: <code className="assets-page__inline-code" />,
                }}
              />
            </p>
            <div className="assets-page__filter-row">
              <input
                id="assets-jsx-filter"
                type="search"
                className="assets-page__filter-input"
                value={jsxQuery}
                onChange={(e) => setJsxQuery(e.target.value)}
                placeholder={t("assets.filter.placeholderJsx")}
                autoComplete="off"
              />
            </div>
            <div className="assets-page__jsx-grid">
              {jsxEntries.map(({ id, mod }) => {
                const Comp = resolveIconGalleryComponent(mod);
                if (!Comp) {
                  return (
                    <div key={id} className="assets-page__jsx-icon-cell">
                      <code className="assets-page__mono-label">{id}</code>
                      <span className="assets-page__mono-muted">{t("assets.jsx.noComponent")}</span>
                    </div>
                  );
                }
                return <JsxIconCell key={id} id={id} Comp={Comp} demoProps={getIconGalleryDemoProps(id)} />;
              })}
            </div>
          </section>

          <section className="assets-page__section" aria-labelledby="assets-static-heading">
            <div className="assets-page__section-header">
              <h2 id="assets-static-heading">{t("assets.sections.staticAssets.title")}</h2>
              <SectionDownloadAll
                entries={staticImageDownloadEntries}
                zipFilename="tuf-static-assets.zip"
              />
            </div>
            <p className="assets-page__section-hint">{t("assets.sections.staticAssets.hint")}</p>
            <div className="assets-page__filter-row">
              <input
                id="assets-static-filter"
                type="search"
                className="assets-page__filter-input"
                value={assetQuery}
                onChange={(e) => setAssetQuery(e.target.value)}
                placeholder={t("assets.filter.placeholderStatic")}
                autoComplete="off"
              />
            </div>
            <div className="assets-page__static-grid">
              {staticAssetEntries.map((entry) => (
                <div key={entry.id} className="assets-page__static-cell">
                  <div className="assets-page__static-preview">
                    {STATIC_FONT_EXT_RE.test(entry.id) ? (
                      <span className="assets-page__static-font-badge">font</span>
                    ) : (
                      <img src={entry.url} alt="" className="assets-page__static-img" loading="lazy" decoding="async" />
                    )}
                  </div>
                  <code className="assets-page__mono-label" title={entry.id}>
                    {entry.id}
                  </code>
                  <AssetUrlActions
                    url={entry.url}
                    downloadStem={entry.id.replace(/\//g, "-")}
                  />
                </div>
              ))}
            </div>
          </section>
        </div>
        <Footer />
      </div>
    </>
  );
}
