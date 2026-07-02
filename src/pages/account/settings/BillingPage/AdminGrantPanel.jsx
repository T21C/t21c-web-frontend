// tuf-search: #AdminGrantPanel #billingPage #tufStellar
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "react-hot-toast";
import { routes } from "@/api/routes";
import { API_BASE } from "@/config/env";
import api from "@/utils/api";
import { CustomSelect, ProfileSelector } from "@/components/common/selectors";
import { BillingGiftRecipientPreview } from "./BillingGiftRecipientPreview";
import { formatDate } from "./billingUtils";

const ADMIN_GRANT_MONTH_PRESETS = [1, 3, 6, 12];

function displayUserLabel(username, nickname, userId) {
  if (username) return username;
  if (nickname) return nickname;
  return userId ?? "—";
}

function grantStatusKey(row) {
  if (row.status === "retracted") return "retracted";
  if (row.isExpired) return "expired";
  return "active";
}

function durationLabel(row, t) {
  if (row.durationKind === "months") {
    return t("billing.adminGrants.durationMonths", { count: row.durationValue });
  }
  return t("billing.adminGrants.durationDays", { count: row.durationValue });
}

export function AdminGrantPasswordModal({ open, onClose, onVerified }) {
  const { t } = useTranslation(["pages", "common"]);
  const [initialPassword, setInitialPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    if (!open) {
      setInitialPassword("");
      setPasswordError("");
    }
  }, [open]);

  const validatePassword = async (password) => {
    try {
      setVerifying(true);
      await api.head(`${API_BASE}${routes.admin.verifyPassword()}?origin=tufstellar-grants`, {
        headers: { "X-Super-Admin-Password": password },
      });
      return true;
    } catch {
      return false;
    } finally {
      setVerifying(false);
    }
  };

  const handlePasswordSubmit = async () => {
    const ok = await validatePassword(initialPassword);
    if (ok) {
      onVerified(initialPassword);
      setInitialPassword("");
      setPasswordError("");
    } else {
      setPasswordError(t("billing.adminGrants.passwordInvalid"));
    }
  };

  if (!open) return null;

  return (
    <div className="password-modal">
      <div className="password-modal-content">
        <h3>{t("billing.adminGrants.passwordTitle")}</h3>
        <p>{t("billing.adminGrants.passwordMessage")}</p>
        <input
          type="password"
          autoComplete="section-password-super-admin"
          value={initialPassword}
          onChange={(e) => setInitialPassword(e.target.value)}
          placeholder={t("billing.adminGrants.passwordPlaceholder")}
        />
        {passwordError ? <p className="error-message">{passwordError}</p> : null}
        <div className="password-modal-actions">
          <button
            type="button"
            className="confirm-btn btn-fill-primary"
            onClick={handlePasswordSubmit}
            disabled={!initialPassword || verifying}
          >
            {verifying ? t("billing.adminGrants.passwordVerifying") : t("buttons.confirm", { ns: "common" })}
          </button>
          <button type="button" className="cancel-btn btn-fill-neutral-dark" onClick={onClose}>
            {t("buttons.cancel", { ns: "common" })}
          </button>
        </div>
      </div>
    </div>
  );
}

export function AdminGrantPanel({ storedPassword, onGrantChange }) {
  const { t, i18n } = useTranslation("pages");
  const locale = i18n.language || undefined;

  const [grants, setGrants] = useState([]);
  const [total, setTotal] = useState(0);
  const [loadingLog, setLoadingLog] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [expiredFilter, setExpiredFilter] = useState("all");
  const [beneficiary, setBeneficiary] = useState(null);
  const [durationKind, setDurationKind] = useState("months");
  const [monthsPreset, setMonthsPreset] = useState(3);
  const [customDays, setCustomDays] = useState(30);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [retractingId, setRetractingId] = useState(null);

  const passwordHeaders = useMemo(
    () => ({ "X-Super-Admin-Password": storedPassword }),
    [storedPassword],
  );

  const monthOptions = useMemo(
    () =>
      ADMIN_GRANT_MONTH_PRESETS.map((months) => ({
        value: months,
        label: t("billing.adminGrants.monthOption", { count: months }),
      })),
    [t],
  );

  const selectedMonthOption = useMemo(
    () => monthOptions.find((opt) => opt.value === monthsPreset) ?? monthOptions[0] ?? null,
    [monthOptions, monthsPreset],
  );

  const expiredFilterOptions = useMemo(
    () => [
      { value: "all", label: t("billing.adminGrants.filterAll") },
      { value: "active", label: t("billing.adminGrants.filterNotExpired") },
      { value: "expired", label: t("billing.adminGrants.filterExpiredOnly") },
    ],
    [t],
  );

  const selectedExpiredFilterOption = useMemo(
    () => expiredFilterOptions.find((opt) => opt.value === expiredFilter) ?? expiredFilterOptions[0],
    [expiredFilterOptions, expiredFilter],
  );

  const loadGrants = useCallback(async () => {
    setLoadingLog(true);
    try {
      const params = { limit: 50 };
      if (searchQuery.trim()) params.q = searchQuery.trim();
      if (expiredFilter === "expired") params.expired = "true";
      if (expiredFilter === "active") params.expired = "false";

      const { data } = await api.get(routes.billingV3.adminGrants.root(), { params });
      setGrants(Array.isArray(data?.grants) ? data.grants : []);
      setTotal(Number(data?.total) || 0);
    } catch (e) {
      console.error(e);
      toast.error(t("billing.adminGrants.loadError"));
    } finally {
      setLoadingLog(false);
    }
  }, [searchQuery, expiredFilter, t]);

  useEffect(() => {
    loadGrants();
  }, [loadGrants]);

  useEffect(() => {
    const timer = setTimeout(() => setSearchQuery(searchInput), 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const handleRecipientProfileChange = useCallback((profile) => {
    if (profile?.id == null || profile?.isNewRequest === true || String(profile.id).length === 0) return;
    const pid = profile.playerId;
    setBeneficiary({
      userId: String(profile.id),
      playerId: pid != null && Number.isFinite(Number(pid)) ? Number(pid) : null,
      username: profile.username ?? null,
      nickname: profile.nickname ?? null,
      avatarUrl: profile.avatarUrl ?? null,
    });
  }, []);

  const clearBeneficiary = useCallback(() => {
    setBeneficiary(null);
  }, []);

  const handleGrant = async () => {
    if (!beneficiary?.userId) {
      toast.error(t("billing.adminGrants.beneficiaryRequired"));
      return;
    }
    const durationValue = durationKind === "months" ? monthsPreset : Number(customDays);
    if (!Number.isFinite(durationValue) || durationValue <= 0) {
      toast.error(t("billing.adminGrants.invalidDuration"));
      return;
    }

    setSubmitting(true);
    try {
      await api.post(
        routes.billingV3.adminGrants.root(),
        {
          beneficiaryUserId: beneficiary.userId,
          durationKind,
          durationValue,
          note: note.trim() || undefined,
        },
        { headers: passwordHeaders },
      );
      toast.success(t("billing.adminGrants.grantSuccess"));
      setBeneficiary(null);
      setNote("");
      await loadGrants();
      if (typeof onGrantChange === "function") onGrantChange();
    } catch (e) {
      const msg =
        e?.response?.status === 403
          ? t("billing.adminGrants.passwordInvalid")
          : e?.response?.data?.error?.message || t("billing.adminGrants.grantError");
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRetract = async (row) => {
    const beneficiaryName = displayUserLabel(
      row.beneficiaryUsername,
      row.beneficiaryNickname,
      row.beneficiaryUserId,
    );
    if (!window.confirm(t("billing.adminGrants.retractConfirm", { name: beneficiaryName }))) return;

    setRetractingId(row.id);
    try {
      await api.post(routes.billingV3.adminGrants.retract(row.id), {}, { headers: passwordHeaders });
      toast.success(t("billing.adminGrants.retractSuccess"));
      await loadGrants();
      if (typeof onGrantChange === "function") onGrantChange();
    } catch (e) {
      const msg =
        e?.response?.status === 403
          ? t("billing.adminGrants.passwordInvalid")
          : e?.response?.data?.error?.message || t("billing.adminGrants.retractError");
      toast.error(msg);
    } finally {
      setRetractingId(null);
    }
  };

  return (
    <section className="billing-page__card billing-page__admin-grant-panel" aria-labelledby="admin-grant-heading">
      <h3 id="admin-grant-heading" className="billing-page__card-title">
        {t("billing.adminGrants.title")}
      </h3>

      <div className="billing-page__admin-grant-form">
        <div className="billing-page__admin-grant-field">
          <span className="billing-page__admin-grant-label">{t("billing.adminGrants.beneficiaryLabel")}</span>
          {beneficiary?.userId ? (
            <div className="billing-page__recipient-selected">
              {beneficiary.playerId != null ? (
                <Link
                  to={`/profile/${beneficiary.playerId}`}
                  className="billing-page__recipient-profile-link"
                  aria-label={t("billing.checkout.openRecipientProfileAria", {
                    name: beneficiary.username || beneficiary.nickname || beneficiary.userId,
                  })}
                >
                  <BillingGiftRecipientPreview recipient={beneficiary} />
                </Link>
              ) : (
                <div className="billing-page__recipient-profile-static">
                  <BillingGiftRecipientPreview recipient={beneficiary} />
                </div>
              )}
              <button
                type="button"
                className="billing-page__btn billing-page__btn--ghost billing-page__recipient-change"
                onClick={clearBeneficiary}
                disabled={submitting}
              >
                {t("billing.checkout.changeRecipient")}
              </button>
            </div>
          ) : (
            <ProfileSelector
              type="user"
              className="billing-page__profile-selector"
              placeholder={t("billing.checkout.searchUsersPlaceholder")}
              value={null}
              onChange={handleRecipientProfileChange}
              disabled={submitting}
              userSearchIncludeSelf
            />
          )}
        </div>

        <div className="billing-page__admin-grant-duration">
          <span className="billing-page__admin-grant-label">{t("billing.adminGrants.durationLabel")}</span>
          <div className="billing-page__admin-grant-duration-toggle" role="group" aria-label={t("billing.adminGrants.durationLabel")}>
            <button
              type="button"
              className={`billing-page__btn billing-page__btn--ghost${durationKind === "months" ? " billing-page__admin-grant-toggle--active" : ""}`}
              onClick={() => setDurationKind("months")}
              disabled={submitting}
            >
              {t("billing.adminGrants.durationKindMonths")}
            </button>
            <button
              type="button"
              className={`billing-page__btn billing-page__btn--ghost${durationKind === "days" ? " billing-page__admin-grant-toggle--active" : ""}`}
              onClick={() => setDurationKind("days")}
              disabled={submitting}
            >
              {t("billing.adminGrants.durationKindDays")}
            </button>
          </div>
          {durationKind === "months" ? (
            <CustomSelect
              className="billing-page__admin-grant-select"
              options={monthOptions}
              value={selectedMonthOption}
              onChange={(opt) => setMonthsPreset(Number(opt?.value ?? 3))}
              width="100%"
              isDisabled={submitting}
              aria-label={t("billing.adminGrants.durationLabel")}
            />
          ) : (
            <input
              type="number"
              min={1}
              max={365}
              className="billing-page__recipient-input billing-page__admin-grant-days-input"
              value={customDays}
              onChange={(e) => setCustomDays(e.target.value)}
              disabled={submitting}
              aria-label={t("billing.adminGrants.customDaysLabel")}
            />
          )}
        </div>

        <label className="billing-page__admin-grant-field">
          <span className="billing-page__admin-grant-label">{t("billing.adminGrants.noteLabel")}</span>
          <input
            type="text"
            className="billing-page__recipient-input"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={255}
            placeholder={t("billing.adminGrants.notePlaceholder")}
            disabled={submitting}
          />
        </label>

        <button
          type="button"
          className="billing-page__btn billing-page__btn--primary billing-page__admin-grant-submit"
          onClick={handleGrant}
          disabled={submitting}
        >
          {submitting ? t("billing.adminGrants.granting") : t("billing.adminGrants.grantAction")}
        </button>
      </div>

      <div className="billing-page__admin-grant-log">
        <div className="billing-page__admin-grant-log-toolbar">
          <input
            type="search"
            className="billing-page__recipient-input billing-page__admin-grant-log-search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={t("billing.adminGrants.searchPlaceholder")}
            aria-label={t("billing.adminGrants.searchPlaceholder")}
          />
          <CustomSelect
            className="billing-page__admin-grant-select billing-page__admin-grant-filter-select"
            options={expiredFilterOptions}
            value={selectedExpiredFilterOption}
            onChange={(opt) => setExpiredFilter(opt?.value ?? "all")}
            width="12rem"
            isDisabled={loadingLog}
            aria-label={t("billing.adminGrants.expiredFilterLabel")}
          />
          <button type="button" className="billing-page__btn billing-page__btn--ghost" onClick={loadGrants} disabled={loadingLog}>
            {t("billing.adminGrants.refreshLog")}
          </button>
        </div>

        <p className="billing-page__admin-grant-log-count">
          {t("billing.adminGrants.logCount", { count: total })}
        </p>

        <div className="billing-page__history-table-wrap billing-page__admin-grant-table-wrap" role="region" aria-label={t("billing.adminGrants.logTitle")}>
          {loadingLog ? (
            <div className="loader-shell loader-shell--compact">
              <div className="loader loader-relative" />
            </div>
          ) : grants.length === 0 ? (
            <p className="billing-page__admin-grant-empty">{t("billing.adminGrants.logEmpty")}</p>
          ) : (
            <table className="billing-page__history-table billing-page__admin-grant-table">
              <thead>
                <tr>
                  <th scope="col">{t("billing.adminGrants.cols.grantedBy")}</th>
                  <th scope="col">{t("billing.adminGrants.cols.beneficiary")}</th>
                  <th scope="col">{t("billing.adminGrants.cols.when")}</th>
                  <th scope="col">{t("billing.adminGrants.cols.duration")}</th>
                  <th scope="col">{t("billing.adminGrants.cols.expires")}</th>
                  <th scope="col">{t("billing.adminGrants.cols.status")}</th>
                  <th scope="col">{t("billing.adminGrants.cols.retracted")}</th>
                  <th scope="col" className="billing-page__col--actions">{t("billing.adminGrants.cols.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {grants.map((row) => {
                  const statusKey = grantStatusKey(row);
                  const canRetract = row.status === "active";
                  return (
                    <tr key={row.id}>
                      <td>{displayUserLabel(row.grantedByUsername, row.grantedByNickname, row.grantedByUserId)}</td>
                      <td>{displayUserLabel(row.beneficiaryUsername, row.beneficiaryNickname, row.beneficiaryUserId)}</td>
                      <td>{formatDate(row.createdAt, locale)}</td>
                      <td>{durationLabel(row, t)}</td>
                      <td>{formatDate(row.endsAt, locale)}</td>
                      <td>
                        <span className={`billing-page__admin-grant-status billing-page__admin-grant-status--${statusKey}`}>
                          {t(`billing.adminGrants.status.${statusKey}`)}
                        </span>
                      </td>
                      <td>
                        {row.retractedAt
                          ? `${displayUserLabel(row.retractedByUsername, row.retractedByNickname, row.retractedByUserId)} · ${formatDate(row.retractedAt, locale)}`
                          : "—"}
                      </td>
                      <td className="billing-page__col--actions">
                        {canRetract ? (
                          <button
                            type="button"
                            className="billing-page__btn billing-page__btn--ghost billing-page__admin-grant-retract-btn"
                            onClick={() => handleRetract(row)}
                            disabled={retractingId === row.id}
                          >
                            {retractingId === row.id ? t("billing.adminGrants.retracting") : t("billing.adminGrants.retractAction")}
                          </button>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </section>
  );
}
