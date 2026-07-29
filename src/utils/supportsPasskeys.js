// tuf-search: #supportsPasskeys #webauthn #passkey
/**
 * True when the browser exposes the WebAuthn public-key credential API.
 * Does not guarantee a platform authenticator is available.
 */
export function supportsPasskeys() {
  return typeof window !== 'undefined' && typeof window.PublicKeyCredential !== 'undefined';
}
