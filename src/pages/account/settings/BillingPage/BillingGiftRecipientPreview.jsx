// tuf-search: #BillingPage
import { userAvatarDisplayUrl } from "@/utils/playerAvatarDisplay";

/** Snapshot after picking a gift recipient (search row + profile link). */
export function BillingGiftRecipientPreview({ recipient }) {
  const src = userAvatarDisplayUrl(recipient);
  const primary = recipient.username || recipient.nickname || recipient.userId;
  const showSecondary = recipient.nickname && recipient.username && recipient.nickname !== recipient.username;
  return (
    <span className="billing-page__recipient-rich">
      {src ? (
        <img className="billing-page__recipient-rich-avatar" src={src} alt="" />
      ) : (
        <span className="billing-page__recipient-rich-avatar billing-page__recipient-rich-avatar--placeholder" aria-hidden />
      )}
      <span className="billing-page__recipient-rich-text">
        <span className="billing-page__recipient-rich-primary">{primary}</span>
        {showSecondary ? (
          <span className="billing-page__recipient-rich-secondary">{recipient.nickname}</span>
        ) : null}
      </span>
    </span>
  );
}
