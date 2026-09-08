import { useTranslation } from "react-i18next";
import "./profileModules.css";

export default function ProfileModuleMissing({ type }) {
  const { t } = useTranslation("pages");
  return (
    <section className="profile-modules__missing">
      <div className="account-profile-page__section-title-row">
        <h2 className="account-profile-page__section-title">
          {t(`profile.modules.types.${type}`, { defaultValue: type })}
        </h2>
      </div>
      <p className="profile-modules__missing-copy">
        {t("profile.modules.missing", {
          defaultValue: "This module has nothing to show yet.",
        })}
      </p>
    </section>
  );
}
