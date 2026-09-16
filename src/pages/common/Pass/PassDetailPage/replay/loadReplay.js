// tuf-search: #loadReplay #replayIntegrity
import JSZip from 'jszip';
import api from '@/utils/api';
import { replayManifestSchema } from './replayDelivery';
import { selectReplayChart } from './selectReplayChart';

async function hash(data) {
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', data)), byte => byte.toString(16).padStart(2, '0')).join('');
}

async function download(url, signal) {
  const response = await fetch(url, { signal, credentials: 'omit' });
  if (!response.ok) throw new Error('replay_download_failed');
  return response;
}

export async function loadReplay(pass, config, signal) {
  const runId = pass.autoSubmissionRunId;
  const levelId = pass.levelId ?? pass.level?.id;
  const [manifestResponse, levelResponse] = await Promise.all([
    download(`${config.api}/api/v1/replays/${encodeURIComponent(runId)}?format=2`, signal),
    api.get(`/v2/database/levels/${encodeURIComponent(levelId)}`, { signal }),
  ]);
  const manifest = replayManifestSchema.parse(await manifestResponse.json());
  if (manifest.run_id !== runId || manifest.external_pass_id !== Number(pass.id) || manifest.tuf_level_id !== Number(levelId)) throw new Error('replay_identity_mismatch');
  const level = levelResponse.data.level;
  if (!level || Number(level.id) !== Number(levelId)) throw new Error('level_revision_unavailable');
  const archiveUrl = new URL(level.dlLink);
  if (!['http:', 'https:'].includes(archiveUrl.protocol)) throw new Error('level_archive_invalid');
  const archive = await (await download(archiveUrl.href, signal)).arrayBuffer();
  const zip = await JSZip.loadAsync(archive);
  const { path: chartPath, chart } = await selectReplayChart(zip, manifest.chart_path);
  const chartSha256 = await hash(await chart.async('arraybuffer'));
  const names = { inputs: 'inputs.csv', hits: 'hits.csv', metadata: 'metadata.json', lifecycle: 'lifecycle.jsonl', settings: 'settings.jsonl', health: 'health.jsonl' };
  if (new Set(manifest.files.map(file => file.kind)).size !== manifest.files.length || !['inputs', 'hits', 'metadata'].every(kind => manifest.files.some(file => file.kind === kind))) throw new Error('replay_file_missing');
  const files = await Promise.all(manifest.files.map(async file => {
    const expected = `/api/v1/replays/${runId}/files/${names[file.kind]}`;
    if (file.name !== names[file.kind] || file.url !== expected) throw new Error('replay_file_missing');
    const data = await (await download(new URL(expected, config.api).href, signal)).arrayBuffer();
    if (data.byteLength !== file.bytes || await hash(data) !== file.sha256) throw new Error('replay_hash_mismatch');
    return { kind: file.kind, name: file.name, sha256: file.sha256, data };
  }));
  signal.throwIfAborted();
  return { level: { levelId: manifest.tuf_level_id, fileId: level.fileId, chartPath, chartSha256, archive }, replay: { manifest, files } };
}
