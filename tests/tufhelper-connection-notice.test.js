import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
// Node ESM requires the exact .js extension.
// eslint-disable-next-line import/extensions
import { shouldShowConnectionNotice, updateConnectionNotice } from '../src/features/tufhelperlite/application/connectionNotice.js';

const enabled = (dismissed = false) => ({ state: 'enabled', isSessionDismissed: dismissed, errorCode: null, versionMismatch: null });
const unavailable = (code) => ({ connected: false, connectionError: { code } });

test('game shutdown, initialization and automatic reconnect stay quiet', () => {
  let state = enabled();
  for (const code of ['DISCONNECTED', 'namespace_initializing', 'TIMEOUT', 'timeout', 'CONNECTION_FAILED']) {
    state = updateConnectionNotice(state, unavailable(code));
    assert.equal(state.state, 'unavailable');
    assert.equal(state.errorCode, code);
    assert.equal(shouldShowConnectionNotice(state), false);
  }
  state = updateConnectionNotice(state, { connected: true });
  assert.equal(state.state, 'enabled');
  assert.equal(state.errorCode, null);
  assert.equal(shouldShowConnectionNotice(state), false);
});

test('slow initial discovery remains silent after its readiness deadline and restores on snapshot', () => {
  let state = { ...enabled(), state: 'connecting' };
  state = updateConnectionNotice(state, { connected: false, connectionError: null });
  assert.equal(state.state, 'connecting');
  assert.equal(shouldShowConnectionNotice(state), false);
  state = updateConnectionNotice(state, unavailable('TIMEOUT'));
  assert.equal(shouldShowConnectionNotice(state), false);
  state = updateConnectionNotice(state, { connected: true });
  assert.equal(state.state, 'enabled');
});

test('a dismissed connection notice stays dismissed across shutdown, retries, mismatch and recovery', () => {
  let state = enabled(true);
  for (const code of ['DISCONNECTED', 'namespace_initializing', 'protocol_mismatch', 'contract_mismatch']) {
    state = updateConnectionNotice(state, unavailable(code));
    assert.equal(state.isSessionDismissed, true);
    assert.equal(shouldShowConnectionNotice(state), false);
  }
  state = updateConnectionNotice(state, { connected: true });
  assert.equal(state.isSessionDismissed, true);
  assert.equal(state.state, 'enabled');
});

test('actionable API and contract failures replace transient failures with persistent guidance', () => {
  for (const code of ['INCOMPATIBLE', 'protocol_mismatch', 'feature_protocol_mismatch', 'contract_mismatch', 'namespace_status_unavailable', 'namespace_error', 'TUFHELPERLITE_OUTDATED']) {
    const starting = updateConnectionNotice(enabled(), unavailable('DISCONNECTED'));
    const failed = updateConnectionNotice(starting, { connected: false, connectionError: { code, clientVersion: '2.0.0', serverVersion: '1.0.0' } });
    assert.equal(shouldShowConnectionNotice(failed), true, code);
    assert.equal(failed.versionMismatch.serverVersion, '1.0.0');
    const recovered = updateConnectionNotice(failed, { connected: true });
    assert.equal(shouldShowConnectionNotice(recovered), false);
    assert.equal(recovered.versionMismatch, null);
  }
});

test('automatic session events cannot reopen an opt-in prompt or a hidden integration', () => {
  for (const name of ['prompt', 'hidden', 'checking-permission']) {
    const current = { ...enabled(), state: name };
    assert.equal(updateConnectionNotice(current, unavailable('contract_mismatch')), current);
    assert.equal(updateConnectionNotice(current, { connected: true }), current);
  }
  assert.equal(shouldShowConnectionNotice({ ...enabled(), state: 'prompt' }), true);
});

test('connection guidance never creates toast notifications; explicit level actions retain their error toast', () => {
  const banner = readFileSync(new URL('../src/components/common/TufHelperLiteConnectBanner/TufHelperLiteConnectBanner.jsx', import.meta.url), 'utf8');
  assert.doesNotMatch(banner, /react-hot-toast|toast\./);
  for (const path of ['../src/components/cards/LevelCard/LevelCard.jsx', '../src/pages/common/Level/LevelDetailPage/LevelDetailPage.jsx']) {
    const source = readFileSync(new URL(path, import.meta.url), 'utf8');
    assert.match(source, /await openTufHelperLiteLevelBy(?:Id|Url)/);
    assert.match(source, /catch \(error\) \{\s*toast\.error\(error\?\.message/);
  }
});
