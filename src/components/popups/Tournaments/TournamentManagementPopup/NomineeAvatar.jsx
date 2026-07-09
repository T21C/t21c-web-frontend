import { UserAvatar } from "@/components/layout";
import { userAvatarUrls } from "@/utils/playerAvatarDisplay";

const NomineeAvatar = ({ candidate, className = "" }) => {
  const { primaryUrl, fallbackUrl } = userAvatarUrls(candidate);

  return (
    <UserAvatar
      primaryUrl={primaryUrl}
      fallbackUrl={fallbackUrl}
      className={className}
    />
  );
};

export default NomineeAvatar;
