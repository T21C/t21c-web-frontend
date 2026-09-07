// tuf-search: #ProfileHeaderYoutubeLink
import { useEffect, useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { YoutubeIcon, ChevronIcon } from "@/components/common/icons";
import { sortYoutubeChannels, youtubeChannelUrl } from "@/utils/youtubeChannel";

function channelLabel(channel) {
  if (channel?.handle) return `@${String(channel.handle).replace(/^@/, "")}`;
  if (channel?.title) return channel.title;
  return channel?.channelId || "YouTube";
}

export default function ProfileHeaderYoutubeLink({ youtubeChannels = [] }) {
  const { t } = useTranslation("pages");
  const menuId = useId().replace(/:/g, "");
  const wrapRef = useRef(null);
  const [open, setOpen] = useState(false);
  const channels = sortYoutubeChannels(youtubeChannels);
  const primary = channels.find((c) => c.isPrimary) || channels[0];
  const extras = channels.filter((c) => c.channelId !== primary?.channelId);

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  if (!primary) return null;

  const primaryHref = primary.url || youtubeChannelUrl(primary);
  const primaryName = channelLabel(primary);

  return (
    <div className="profile-header__youtube" ref={wrapRef}>
      <a
        className="profile-header__youtube-button"
        href={primaryHref}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={t("profile.header.youtubeChannel", { name: primaryName })}
        title={primaryName}
      >
        <YoutubeIcon size={18} />
      </a>
      {extras.length > 0 ? (
        <>
          <button
            type="button"
            className="profile-header__youtube-more"
            aria-expanded={open}
            aria-haspopup="menu"
            aria-controls={menuId}
            aria-label={t("profile.header.youtubeMore")}
            onClick={() => setOpen((value) => !value)}
          >
            <ChevronIcon direction={open ? "up" : "down"} color="var(--color-white)" size={12} />
          </button>
          {open ? (
            <ul className="profile-header__youtube-menu" id={menuId} role="menu">
              {extras.map((channel) => {
                const href = channel.url || youtubeChannelUrl(channel);
                const name = channelLabel(channel);
                return (
                  <li key={channel.channelId} role="none">
                    <a
                      className="profile-header__youtube-menu-link"
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      role="menuitem"
                      onClick={() => setOpen(false)}
                    >
                      {name}
                    </a>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
