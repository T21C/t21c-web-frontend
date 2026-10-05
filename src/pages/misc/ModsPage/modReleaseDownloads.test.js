import assert from 'node:assert/strict';
import test from 'node:test';
// Node's native ESM test runner requires explicit file extensions.
// eslint-disable-next-line import/extensions
import {buildModReleaseBody, detectClientModPlatform, isZipUrl, releaseDownloadFields} from './modReleaseDownloads.js';

test('common ZIP bodies clear platform overrides and preserve GitHub provenance', () => {
  const fields = releaseDownloadFields({downloadMode: 'common', downloadUrl: ' https://example.com/mod.zip ',
    githubUrl: 'https://github.com/org/mod/releases/tag/v2', platformDownloadUrls: {windows: 'https://example.com/old.zip'}});
  assert.deepEqual(buildModReleaseBody({version: '2', notes: '', ...fields}), {
    version: '2', notes: null, githubUrl: 'https://github.com/org/mod/releases/tag/v2',
    downloadUrl: 'https://example.com/mod.zip', platformDownloadUrls: null,
  });
});

test('platform-only releases omit blank platforms and explicitly clear the old common URL', () => {
  const fields = releaseDownloadFields({downloadMode: 'platforms', downloadUrl: '', githubUrl: '',
    platformDownloadUrls: {windows: ' https://example.com/win.zip ', macos: 'https://example.com/mac.zip', linux: ''}});
  const body = buildModReleaseBody({version: '1', ...fields});
  assert.equal(body.downloadUrl, '');
  assert.equal(body.githubUrl, null);
  assert.deepEqual(body.platformDownloadUrls, {windows: 'https://example.com/win.zip', macos: 'https://example.com/mac.zip'});
});

test('GitHub-only legacy bodies resolve on the server and hosted metadata edits do not change source', () => {
  const fields = releaseDownloadFields({downloadMode: 'common', downloadUrl: '', githubUrl: 'https://github.com/org/mod/releases/tag/v1', platformDownloadUrls: {}});
  assert.deepEqual(buildModReleaseBody({version: '1', ...fields}), {version: '1', githubUrl: 'https://github.com/org/mod/releases/tag/v1'});
  assert.deepEqual(buildModReleaseBody({version: '1', notes: ''}), {version: '1', notes: null});
});

test('client platform detection and ZIP validation reject wrong or unsafe values', () => {
  assert.equal(detectClientModPlatform('Win32'), 'windows');
  assert.equal(detectClientModPlatform('Mozilla/5.0 (Macintosh; Intel Mac OS X)'), 'macos');
  assert.equal(detectClientModPlatform('Linux x86_64'), 'linux');
  assert.equal(detectClientModPlatform('Linux; Android'), undefined);
  assert.equal(detectClientModPlatform('iPhone; CPU iPhone OS like Mac OS X'), undefined);
  assert.equal(isZipUrl('https://example.com/mod.ZIP?token=123'), true);
  for (const url of ['http://example.com/a.zip', 'https://example.com/releases', 'https://u:p@example.com/a.zip']) assert.equal(isZipUrl(url), false);
});
