const ACTIONABLE_CONNECTION_ERRORS = new Set([
  'INCOMPATIBLE',
  'protocol_mismatch',
  'feature_protocol_mismatch',
  'contract_mismatch',
  'namespace_status_unavailable',
  'namespace_error',
  'TUFHELPERLITE_OUTDATED',
  'origin_not_allowed',
  'origin_denied',
]);

export const getConnectionErrorCode = (error) => error?.code || 'CONNECTION_FAILED';

export const isActionableConnectionError = (code) => ACTIONABLE_CONNECTION_ERRORS.has(code);

export const getVersionMismatch = (error) => error ? {
  direction: error.direction || null,
  clientVersion: error.clientVersion,
  serverVersion: error.serverVersion,
  protocolVersion: error.protocolVersion,
} : null;

// Connection discovery, game shutdown and reconnection never reset a user's dismissal.
export function updateConnectionNotice(current, session) {
  if (!['connecting', 'enabled', 'unavailable'].includes(current.state)) return current;
  if (session.connected) {
    return { ...current, state: 'enabled', errorCode: null, versionMismatch: null };
  }
  if (!session.connectionError && current.state === 'connecting') return current;
  return {
    ...current,
    state: 'unavailable',
    errorCode: session.connectionError?.code || 'DISCONNECTED',
    versionMismatch: getVersionMismatch(session.connectionError),
  };
}

export function shouldShowConnectionNotice(integration) {
  if (integration.isSessionDismissed) return false;
  return integration.state === 'prompt' ||
    (integration.state === 'unavailable' && isActionableConnectionError(integration.errorCode));
}
