import ProfileModuleMissing from "./ProfileModuleMissing";
import { profileModuleIsEmpty, resolveLayout } from "@/utils/profileModules";
import "./profileModules.css";

export default function ProfileModulesRenderer({
  kind,
  profileModules,
  isOwner,
  emptyContext,
  renderModule,
}) {
  const layout = resolveLayout(profileModules, kind);
  return (
    <div className="profile-modules">
      {layout.map((mod) => {
        const empty = profileModuleIsEmpty(mod.type, emptyContext);
        if (empty && !isOwner) return null;
        if (empty && isOwner) {
          return <ProfileModuleMissing key={mod.id} kind={kind} type={mod.type} />;
        }
        return (
          <div key={mod.id} className="profile-modules__slot">
            {renderModule(mod)}
          </div>
        );
      })}
    </div>
  );
}
