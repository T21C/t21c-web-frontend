import { useExternalLink } from "@/components/common/LinkConfirm";
import {
  clampSocialGap,
  clampSocialIconSize,
  DEFAULT_SOCIAL_GAP,
  DEFAULT_SOCIAL_ICON_SIZE,
} from "@/utils/bioCanvas";
import { SOCIAL_ICON_MAP } from "./socialIcons.js";

const ALIGN_TO_JUSTIFY = {
  left: "flex-start",
  center: "center",
  right: "flex-end",
};

export default function SocialBlockRenderer({ block }) {
  const openExternal = useExternalLink();
  const data = block.data ?? {};
  const links = Array.isArray(data.links) ? data.links : [];

  if (!links.length) return null;

  const iconSize = clampSocialIconSize(data.iconSize ?? DEFAULT_SOCIAL_ICON_SIZE);
  const gap = clampSocialGap(data.gap ?? DEFAULT_SOCIAL_GAP);
  const shape = data.shape ?? "circle";
  const align = data.align ?? "center";
  const showLabels = Boolean(data.showLabels);

  return (
    <div className="bio-canvas-block bio-canvas-block--social">
      <div
        className={`bio-canvas-block__social-row bio-canvas-block__social-row--${align}`}
        style={{ gap: `${gap}px`, justifyContent: ALIGN_TO_JUSTIFY[align] ?? "center" }}
      >
        {links.map((link, index) => {
          const Icon = SOCIAL_ICON_MAP[link.platform] ?? SOCIAL_ICON_MAP.other;
          const label = link.label?.trim() || link.platform;
          return (
            <button
              key={`${link.platform}-${index}`}
              type="button"
              className={`bio-canvas-block__social-btn bio-canvas-block__social-btn--${shape}${
                showLabels ? " bio-canvas-block__social-btn--labeled" : ""
              }`}
              title={label}
              aria-label={label}
              onClick={() => openExternal(link.url)}
              style={{
                width: showLabels ? undefined : `${iconSize}px`,
                height: `${iconSize}px`,
                fontSize: `${Math.round(iconSize * 0.5)}px`,
              }}
            >
              <Icon aria-hidden="true" />
              {showLabels ? <span className="bio-canvas-block__social-label">{label}</span> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
