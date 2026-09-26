import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import { DragDropContext, Draggable, Droppable } from "@hello-pangea/dnd";
import { PopupShell } from "@/components/common/PopupShell";
import { ExternalLink } from "@/components/common/LinkConfirm";
import { CloseButton } from "@/components/common/buttons";
import { DragHandleIcon, ExternalLinkIcon } from "@/components/common/icons";
import { CustomSelect } from "@/components/common/selectors";
import api from "@/utils/api";
import { routes } from "@/api/routes";
import KeyboardBoard from "@/components/account/ProfileModules/player/KeyboardBoard";
import { exportKleLayout, importKleLayout } from "@/utils/keyboards/kle";
import SwitchDiagram, {
  SWITCH_STEMS,
  defaultStemColor,
  resolveSwitchStem,
} from "@/components/account/ProfileModules/player/SwitchDiagram";
import "@/components/account/ProfileModules/player/keyboardSetup.css";

const FORM_FACTORS = ["full", "tkl", "96", "75", "65", "other"];
const SENSING = ["mechanical", "optical", "hall", "other"];

function formFactorOptions(t, formFactors) {
  if (formFactors?.length) {
    return formFactors.map((row) => ({ value: row.slug, label: row.name }));
  }
  return FORM_FACTORS.map((value) => ({
    value,
    label: t(`admin.keyboards.formFactors.${value}`),
  }));
}

function factorLabel(t, formFactors, slug) {
  const row = (formFactors || []).find((item) => item.slug === slug);
  if (row?.name) return row.name;
  const key = `admin.keyboards.formFactors.${slug}`;
  const translated = t(key);
  return translated === key ? slug : translated;
}

function sensingOptions(t) {
  return SENSING.map((value) => ({
    value,
    label: t(`profile.keyboards.sensing.${value}`),
  }));
}

function actionError(err, fallback) {
  return err?.response?.data?.error || fallback;
}

async function runCatalogAction(t, { deleting = false, run, onDone }) {
  const toastId = toast.loading(t(deleting ? "loading.deleting" : "loading.saving", { ns: "common" }));
  try {
    await run();
    toast.success(t(deleting ? "admin.keyboards.deleted" : "admin.keyboards.saved"), { id: toastId });
    onDone();
  } catch (err) {
    toast.error(
      actionError(err, t(deleting ? "admin.keyboards.deleteError" : "admin.keyboards.saveError")),
      { id: toastId },
    );
  }
}

function KeyboardThumb({ geometry, maxUnit = 16, showLabels = false }) {
  if (!geometry?.keys?.length) {
    return <div className="keyboard-catalog__thumb keyboard-catalog__thumb--empty" />;
  }
  return (
    <div className="keyboard-catalog__thumb keyboard-setup" aria-hidden="true">
      <KeyboardBoard keys={geometry.keys} maxUnit={maxUnit} showLabels={showLabels} />
    </div>
  );
}

function CatalogPopup({ title, onClose, saving, children, onSubmit, onDelete, showEditorLink = false }) {
  const { t } = useTranslation(["pages", "common"]);
  return (
    <PopupShell
      onClose={onClose}
      closeDisabled={saving}
      overlayClassName="keyboard-catalog-popup"
      panelClassName="keyboard-catalog-popup__panel"
      ariaLabelledBy="keyboard-catalog-popup-title"
    >
      <form className="keyboard-catalog keyboard-setup keyboard-catalog-popup__form" onSubmit={onSubmit}>
        <div className="keyboard-catalog-popup__header">
          <h2 id="keyboard-catalog-popup-title">{title}</h2>
          <div className="keyboard-catalog-popup__header-actions">
            {showEditorLink ? (
              <ExternalLink
                className="keyboard-catalog-popup__editor"
                href="https://editor.keyboard-tools.xyz/"
              >
                {t("admin.keyboards.openEditor")}
                <ExternalLinkIcon size={14} color="currentColor" />
              </ExternalLink>
            ) : null}
            <CloseButton onClick={onClose} aria-label={t("buttons.close", { ns: "common" })} disabled={saving} />
          </div>
        </div>
        {children}
        <div className="keyboard-catalog-popup__footer">
          {onDelete ? (
            <button type="button" className="btn-fill-secondary" onClick={onDelete} disabled={saving}>
              {t("buttons.delete", { ns: "common" })}
            </button>
          ) : (
            <span />
          )}
          <div className="keyboard-catalog-popup__footer-actions">
            <button type="button" className="btn-fill-secondary" onClick={onClose} disabled={saving}>
              {t("buttons.cancel", { ns: "common" })}
            </button>
            <button type="button" className="btn-fill-secondary" disabled={saving} onClick={onSubmit}>
              {saving ? t("loading.saving", { ns: "common" }) : t("buttons.save", { ns: "common" })}
            </button>
          </div>
        </div>
      </form>
    </PopupShell>
  );
}

function ShapePopup({ geometry, formFactors, onClose, onSaved }) {
  const { t } = useTranslation(["pages", "common"]);
  const editing = Boolean(geometry?.id);
  const [tab, setTab] = useState("details");
  const [saving, setSaving] = useState(false);
  const initialKle = exportKleLayout(geometry?.keys);
  const [form, setForm] = useState({
    slug: geometry?.slug || "",
    name: geometry?.name || "",
    formFactor: geometry?.formFactor || formFactors?.[0]?.slug || "full",
    kle: initialKle,
  });
  const [previewKeys, setPreviewKeys] = useState(null);
  const [kleError, setKleError] = useState("");
  const factors = formFactorOptions(t, formFactors);
  const layoutKeys = previewKeys || geometry?.keys || [];

  function ingestKle(text) {
    setForm((prev) => ({ ...prev, kle: text }));
    if (!text.trim() || text === initialKle) {
      setPreviewKeys(null);
      setKleError("");
      return;
    }
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      setPreviewKeys(null);
      setKleError(t("admin.keyboards.kleInvalid"));
      return;
    }
    try {
      setPreviewKeys(importKleLayout(parsed));
      setKleError("");
    } catch {
      setPreviewKeys(null);
      setKleError(t("admin.keyboards.kleInvalid"));
    }
  }

  function dropKle(event) {
    event.preventDefault();
    const file = event.dataTransfer?.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => ingestKle(String(reader.result || ""));
      reader.readAsText(file);
      return;
    }
    const text = event.dataTransfer?.getData("text") || "";
    if (text) ingestKle(text);
  }

  async function save(event) {
    event.preventDefault();
    setSaving(true);
    await runCatalogAction(t, {
      onDone: onSaved,
      run: async () => {
        if (!editing) {
          const kle = JSON.parse(form.kle);
          await api.post(routes.admin.keyboardImportKle(), {
            slug: form.slug,
            name: form.name,
            formFactor: form.formFactor,
            kle,
          });
        } else if (form.kle.trim() && form.kle !== initialKle) {
          const kle = JSON.parse(form.kle);
          await api.post(routes.admin.keyboardGeometryImportKle(geometry.id), {
            name: form.name,
            formFactor: form.formFactor,
            kle,
          });
        } else {
          await api.patch(routes.admin.keyboardGeometry(geometry.id), {
            name: form.name,
            formFactor: form.formFactor,
          });
        }
      },
    });
    setSaving(false);
  }

  async function remove() {
    if (!window.confirm(t("admin.keyboards.deleteConfirm"))) return;
    setSaving(true);
    await runCatalogAction(t, {
      deleting: true,
      onDone: onSaved,
      run: () => api.delete(routes.admin.keyboardGeometry(geometry.id)),
    });
    setSaving(false);
  }

  return (
    <CatalogPopup
      title={editing ? t("admin.keyboards.editShape") : t("admin.keyboards.addShape")}
      onClose={onClose}
      saving={saving}
      showEditorLink
      onSubmit={save}
      onDelete={editing ? remove : null}
    >
      <div className="keyboard-catalog-popup__tabs" role="tablist">
        {["details", "layout"].map((id) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            className={`keyboard-catalog-popup__tab${tab === id ? " is-active" : ""}`}
            onClick={() => setTab(id)}
          >
            {t(`admin.keyboards.tabs.${id}`)}
          </button>
        ))}
      </div>
      <div className="keyboard-catalog-popup__body">
        {tab === "details" ? (
          <div className="keyboard-catalog__form">
            <label className="keyboard-setup__field">
              <span>{t("admin.keyboards.slug")}</span>
              <input
                value={form.slug}
                disabled={editing}
                onChange={(event) => setForm((prev) => ({ ...prev, slug: event.target.value }))}
              />
            </label>
            <label className="keyboard-setup__field">
              <span>{t("admin.keyboards.name")}</span>
              <input
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              />
            </label>
            <div className="keyboard-catalog__details-row">
              <KeyboardThumb geometry={{ keys: layoutKeys }} maxUnit={20} showLabels />
              <CustomSelect
                options={factors}
                value={factors.find((option) => option.value === form.formFactor)}
                onChange={(option) => setForm((prev) => ({ ...prev, formFactor: option.value }))}
                width="12rem"
                label={t("admin.keyboards.formFactor")}
              />
            </div>
          </div>
        ) : (
          <div className="keyboard-catalog__form">
            <KeyboardThumb geometry={{ keys: layoutKeys }} maxUnit={42} showLabels />
            <label
              className="keyboard-setup__field keyboard-catalog__kle"
              onDragOver={(event) => event.preventDefault()}
              onDrop={dropKle}
            >
              <span>{t("admin.keyboards.kle")}</span>
              <textarea
                value={form.kle}
                onChange={(event) => ingestKle(event.target.value)}
              />
            </label>
            {kleError ? <p className="keyboard-setup__error">{kleError}</p> : null}
          </div>
        )}
      </div>
    </CatalogPopup>
  );
}

function FormFactorPopup({ row, onClose, onSaved }) {
  const { t } = useTranslation(["pages", "common"]);
  const editing = Boolean(row?.slug);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    slug: row?.slug || "",
    name: row?.name || "",
    note: row?.note || "",
  });

  async function save(event) {
    event.preventDefault();
    setSaving(true);
    const body = { name: form.name, note: form.note };
    await runCatalogAction(t, {
      onDone: onSaved,
      run: () =>
        editing
          ? api.patch(routes.admin.keyboardFormFactor(row.slug), body)
          : api.post(routes.admin.keyboardFormFactors(), { ...body, slug: form.slug }),
    });
    setSaving(false);
  }

  async function remove() {
    if (!window.confirm(t("admin.keyboards.deleteConfirm"))) return;
    setSaving(true);
    await runCatalogAction(t, {
      deleting: true,
      onDone: onSaved,
      run: () => api.delete(routes.admin.keyboardFormFactor(row.slug)),
    });
    setSaving(false);
  }

  return (
    <CatalogPopup
      title={editing ? t("admin.keyboards.editFormFactor") : t("admin.keyboards.addFormFactor")}
      onClose={onClose}
      saving={saving}
      onSubmit={save}
      onDelete={editing ? remove : null}
    >
      <div className="keyboard-catalog-popup__body">
        <div className="keyboard-catalog__form">
          <label className="keyboard-setup__field">
            <span>{t("admin.keyboards.slug")}</span>
            <input
              value={form.slug}
              disabled={editing}
              onChange={(event) => setForm((prev) => ({ ...prev, slug: event.target.value }))}
            />
          </label>
          <label className="keyboard-setup__field">
            <span>{t("admin.keyboards.name")}</span>
            <input
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
            />
          </label>
          <label className="keyboard-setup__field">
            <span>{t("admin.keyboards.note")}</span>
            <textarea
              value={form.note}
              onChange={(event) => setForm((prev) => ({ ...prev, note: event.target.value }))}
            />
          </label>
        </div>
      </div>
    </CatalogPopup>
  );
}

function ProductPopup({ product, geometries, onClose, onSaved }) {
  const { t } = useTranslation(["pages", "common"]);
  const editing = Boolean(product?.id);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    geometryId: product?.geometryId ? String(product.geometryId) : geometries[0] ? String(geometries[0].id) : "",
    brand: product?.brand || "",
    model: product?.model || "",
  });
  const geometryOptions = geometries.map((row) => ({ value: String(row.id), label: row.name }));
  const geometry = geometries.find((row) => String(row.id) === String(form.geometryId));

  async function save(event) {
    event.preventDefault();
    setSaving(true);
    const body = {
      geometryId: Number(form.geometryId),
      brand: form.brand,
      model: form.model,
    };
    await runCatalogAction(t, {
      onDone: onSaved,
      run: () =>
        editing
          ? api.patch(routes.admin.keyboardProduct(product.id), body)
          : api.post(routes.admin.keyboardProducts(), body),
    });
    setSaving(false);
  }

  async function remove() {
    if (!window.confirm(t("admin.keyboards.deleteConfirm"))) return;
    setSaving(true);
    await runCatalogAction(t, {
      deleting: true,
      onDone: onSaved,
      run: () => api.delete(routes.admin.keyboardProduct(product.id)),
    });
    setSaving(false);
  }

  return (
    <CatalogPopup
      title={editing ? t("admin.keyboards.editProduct") : t("admin.keyboards.addProduct")}
      onClose={onClose}
      saving={saving}
      onSubmit={save}
      onDelete={editing ? remove : null}
    >
      <div className="keyboard-catalog-popup__body">
        <div className="keyboard-catalog__form">
          <KeyboardThumb geometry={geometry} />
          <CustomSelect
            options={geometryOptions}
            value={geometryOptions.find((option) => option.value === form.geometryId) || null}
            onChange={(option) => setForm((prev) => ({ ...prev, geometryId: option.value }))}
            width="16rem"
            label={t("admin.keyboards.geometries")}
          />
          <label className="keyboard-setup__field">
            <span>{t("admin.keyboards.brand")}</span>
            <input
              value={form.brand}
              onChange={(event) => setForm((prev) => ({ ...prev, brand: event.target.value }))}
            />
          </label>
          <label className="keyboard-setup__field">
            <span>{t("admin.keyboards.model")}</span>
            <input
              value={form.model}
              onChange={(event) => setForm((prev) => ({ ...prev, model: event.target.value }))}
            />
          </label>
        </div>
      </div>
    </CatalogPopup>
  );
}

function SwitchPopup({ row, onClose, onSaved }) {
  const { t } = useTranslation(["pages", "common"]);
  const editing = Boolean(row?.id);
  const initialStem = resolveSwitchStem(row?.stem, row?.sensing);
  const unsetMechanical = !row?.stem && initialStem === "linear";
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: row?.name || "",
    sensing: row?.sensing || "mechanical",
    stem: initialStem,
    baseColor: row?.baseColor || "#1a1a1a",
    stemColor: row?.stemColor || (unsetMechanical ? "#b0b4ba" : defaultStemColor(initialStem)),
    baseOpacity: row?.baseOpacity == null ? "1" : String(row.baseOpacity),
  });
  const options = sensingOptions(t);
  const stemChoices = SWITCH_STEMS.map((value) => ({
    value,
    label: t(`profile.keyboards.stems.${value}`),
  }));

  async function save(event) {
    event.preventDefault();
    setSaving(true);
    await runCatalogAction(t, {
      onDone: onSaved,
      run: () =>
        editing
          ? api.patch(routes.admin.keyboardSwitch(row.id), {
              ...form,
              baseOpacity: Number(form.baseOpacity),
            })
          : api.post(routes.admin.keyboardSwitches(), {
              ...form,
              baseOpacity: Number(form.baseOpacity),
            }),
    });
    setSaving(false);
  }

  async function remove() {
    if (!window.confirm(t("admin.keyboards.deleteConfirm"))) return;
    setSaving(true);
    await runCatalogAction(t, {
      deleting: true,
      onDone: onSaved,
      run: () => api.delete(routes.admin.keyboardSwitch(row.id)),
    });
    setSaving(false);
  }

  return (
    <CatalogPopup
      title={editing ? t("admin.keyboards.editSwitch") : t("admin.keyboards.addSwitch")}
      onClose={onClose}
      saving={saving}
      onSubmit={save}
      onDelete={editing ? remove : null}
    >
      <div className="keyboard-catalog-popup__body">
        <div className="keyboard-catalog__form">
          <SwitchDiagram
            stem={form.stem}
            sensing={form.sensing}
            baseColor={form.baseColor}
            stemColor={form.stemColor}
            baseOpacity={Number(form.baseOpacity)}
          />
          <label className="keyboard-setup__field">
            <span>{t("admin.keyboards.name")}</span>
            <input
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
            />
          </label>
          <CustomSelect
            options={stemChoices}
            value={stemChoices.find((option) => option.value === form.stem)}
            onChange={(option) =>
              setForm((prev) => ({
                ...prev,
                stem: option.value,
                stemColor:
                  prev.stemColor === defaultStemColor(prev.stem) || prev.stemColor === "#b0b4ba"
                    ? defaultStemColor(option.value)
                    : prev.stemColor,
              }))
            }
            width="12rem"
            label={t("admin.keyboards.stem")}
          />
          <CustomSelect
            options={options}
            value={options.find((option) => option.value === form.sensing)}
            onChange={(option) => setForm((prev) => ({ ...prev, sensing: option.value }))}
            width="12rem"
            label={t("profile.keyboards.sensingLabel")}
          />
          <label className="keyboard-setup__field">
            <span>{t("admin.keyboards.baseColor")}</span>
            <input
              type="color"
              value={form.baseColor}
              onChange={(event) => setForm((prev) => ({ ...prev, baseColor: event.target.value }))}
            />
          </label>
          <label className="keyboard-setup__field keyboard-catalog__opacity">
            <span>{t("admin.keyboards.baseOpacity", { percent: Math.round(Number(form.baseOpacity) * 100) })}</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={form.baseOpacity}
              onChange={(event) => setForm((prev) => ({ ...prev, baseOpacity: event.target.value }))}
            />
          </label>
          <label className="keyboard-setup__field">
            <span>{t("admin.keyboards.stemColor")}</span>
            <input
              type="color"
              value={form.stemColor}
              onChange={(event) => setForm((prev) => ({ ...prev, stemColor: event.target.value }))}
            />
          </label>
        </div>
      </div>
    </CatalogPopup>
  );
}

export default function KeyboardCatalogPage() {
  const { t } = useTranslation(["pages", "common"]);
  const [catalog, setCatalog] = useState({ geometries: [], products: [], switches: [], formFactors: [] });
  const [tab, setTab] = useState("shapes");
  const [editor, setEditor] = useState(null);

  const load = useCallback(async () => {
    const { data } = await api.get(routes.admin.keyboards());
    setCatalog({
      geometries: data.geometries || [],
      products: data.products || [],
      switches: data.switches || [],
      formFactors: data.formFactors || [],
    });
  }, []);

  useEffect(() => {
    load().catch((err) => toast.error(actionError(err, t("admin.keyboards.loadError"))));
  }, [load, t]);

  function geometryById(id) {
    return catalog.geometries.find((row) => row.id === id) || null;
  }

  async function reorderFactors(result) {
    const destination = result.destination;
    if (!destination || destination.index === result.source.index) return;
    const previous = catalog.formFactors;
    const next = [...previous];
    const [moved] = next.splice(result.source.index, 1);
    next.splice(destination.index, 0, moved);
    setCatalog((current) => ({
      ...current,
      formFactors: next.map((row, index) => ({ ...row, sortOrder: index })),
    }));
    const toastId = toast.loading(t("loading.saving", { ns: "common" }));
    try {
      await api.post(routes.admin.keyboardFormFactorOrder(), { slugs: next.map((row) => row.slug) });
      toast.success(t("admin.keyboards.reordered"), { id: toastId });
    } catch (err) {
      setCatalog((current) => ({ ...current, formFactors: previous }));
      toast.error(actionError(err, t("admin.keyboards.reorderError")), { id: toastId });
    }
  }

  const addLabel =
    tab === "shapes"
      ? t("admin.keyboards.addShape")
      : tab === "products"
        ? t("admin.keyboards.addProduct")
        : tab === "switches"
          ? t("admin.keyboards.addSwitch")
          : t("admin.keyboards.addFormFactor");

  return (
    <div className="keyboard-catalog">
      <div className="keyboard-catalog__head">
        <h1>{t("admin.keyboards.title")}</h1>
        <button type="button" className="btn-fill-secondary" onClick={() => setEditor({ kind: tab, row: null })}>
          {addLabel}
        </button>
      </div>
      <div className="keyboard-catalog__tabs" role="tablist">
        {[
          ["shapes", "admin.keyboards.geometries"],
          ["products", "admin.keyboards.products"],
          ["switches", "admin.keyboards.switches"],
          ["factors", "admin.keyboards.formFactorsTab"],
        ].map(([id, key]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            className={`keyboard-catalog__tab${tab === id ? " is-active" : ""}`}
            onClick={() => setTab(id)}
          >
            {t(key)}
          </button>
        ))}
      </div>

      {tab === "shapes" ? (
        <div className="keyboard-catalog__grid">
          {catalog.geometries.map((row) => (
            <button
              key={row.id}
              type="button"
              className="keyboard-catalog__card"
              onClick={() => setEditor({ kind: "shapes", row })}
            >
              <KeyboardThumb geometry={row} />
              <span className="keyboard-catalog__card-title">{row.name}</span>
              <span className="keyboard-catalog__card-meta">
                {factorLabel(t, catalog.formFactors, row.formFactor)} · {row.keys?.length || 0}
              </span>
            </button>
          ))}
        </div>
      ) : null}

      {tab === "products" ? (
        <div className="keyboard-catalog__grid">
          {catalog.products.map((row) => (
            <button
              key={row.id}
              type="button"
              className="keyboard-catalog__card"
              onClick={() => setEditor({ kind: "products", row })}
            >
              <KeyboardThumb geometry={geometryById(row.geometryId)} />
              <span className="keyboard-catalog__card-title">
                {row.brand} {row.model}
              </span>
              <span className="keyboard-catalog__card-meta">{geometryById(row.geometryId)?.name}</span>
            </button>
          ))}
        </div>
      ) : null}

      {tab === "switches" ? (
        <div className="keyboard-catalog__grid keyboard-catalog__grid--compact">
          {catalog.switches.map((row) => (
            <button
              key={row.id}
              type="button"
              className="keyboard-catalog__card keyboard-catalog__card--switch"
              onClick={() => setEditor({ kind: "switches", row })}
            >
              <SwitchDiagram
                stem={row.stem}
                sensing={row.sensing}
                baseColor={row.baseColor}
                stemColor={row.stemColor}
                baseOpacity={row.baseOpacity}
              />
              <span className="keyboard-catalog__card-title">{row.name}</span>
              <span className="keyboard-catalog__card-meta">
                {t(`profile.keyboards.stems.${resolveSwitchStem(row.stem, row.sensing)}`)}
                {row.sensing ? ` · ${t(`profile.keyboards.sensing.${row.sensing}`)}` : ""}
              </span>
            </button>
          ))}
        </div>
      ) : null}

      {tab === "factors" ? (
        <DragDropContext onDragEnd={reorderFactors}>
          <Droppable droppableId="keyboard-form-factors">
            {(provided) => (
              <div className="keyboard-catalog__factors" ref={provided.innerRef} {...provided.droppableProps}>
                {catalog.formFactors.map((factor, index) => {
                  const boards = catalog.geometries.filter((row) => row.formFactor === factor.slug);
                  return (
                    <Draggable key={factor.slug} draggableId={factor.slug} index={index}>
                      {(drag, snapshot) => (
                        <section
                          className={`keyboard-catalog__factor${snapshot.isDragging ? " is-dragging" : ""}`}
                          ref={drag.innerRef}
                          {...drag.draggableProps}
                          style={drag.draggableProps.style}
                        >
                          <div className="keyboard-catalog__factor-head">
                            <button
                              type="button"
                              className="keyboard-catalog__factor-drag"
                              aria-label={t("admin.keyboards.dragFormFactor")}
                              {...drag.dragHandleProps}
                            >
                              <DragHandleIcon size="16px" color="currentColor" />
                            </button>
                            <button
                              type="button"
                              className="keyboard-catalog__factor-title"
                              onClick={() => setEditor({ kind: "factors", row: factor })}
                            >
                              {factor.name}
                            </button>
                          </div>
                          {boards.length ? (
                            <div className="keyboard-catalog__factor-boards">
                              {boards.map((row) => (
                                <button
                                  key={row.id}
                                  type="button"
                                  className="keyboard-catalog__factor-board"
                                  onClick={() => setEditor({ kind: "shapes", row })}
                                >
                                  <KeyboardThumb geometry={row} />
                                  <span className="keyboard-catalog__card-title">{row.name}</span>
                                </button>
                              ))}
                            </div>
                          ) : null}
                          {factor.note ? <p className="keyboard-catalog__factor-note">{factor.note}</p> : null}
                        </section>
                      )}
                    </Draggable>
                  );
                })}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      ) : null}

      {editor?.kind === "shapes" ? (
        <ShapePopup
          geometry={editor.row}
          formFactors={catalog.formFactors}
          onClose={() => setEditor(null)}
          onSaved={() => {
            setEditor(null);
            load().catch((err) => toast.error(actionError(err, t("admin.keyboards.loadError"))));
          }}
        />
      ) : null}
      {editor?.kind === "factors" ? (
        <FormFactorPopup
          row={editor.row}
          onClose={() => setEditor(null)}
          onSaved={() => {
            setEditor(null);
            load().catch((err) => toast.error(actionError(err, t("admin.keyboards.loadError"))));
          }}
        />
      ) : null}
      {editor?.kind === "products" ? (
        <ProductPopup
          product={editor.row}
          geometries={catalog.geometries}
          onClose={() => setEditor(null)}
          onSaved={() => {
            setEditor(null);
            load().catch((err) => toast.error(actionError(err, t("admin.keyboards.loadError"))));
          }}
        />
      ) : null}
      {editor?.kind === "switches" ? (
        <SwitchPopup
          row={editor.row}
          onClose={() => setEditor(null)}
          onSaved={() => {
            setEditor(null);
            load().catch((err) => toast.error(actionError(err, t("admin.keyboards.loadError"))));
          }}
        />
      ) : null}
    </div>
  );
}
