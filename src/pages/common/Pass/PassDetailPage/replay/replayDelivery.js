// tuf-search: #replayDelivery #replayContract
import { z } from 'zod';

export const replaySettingsSchema = z.object({
  pitchPercent: z.number().int().min(1).max(1000),
  songVolumePercent: z.number().int().min(0).max(100),
  hitSoundVolumePercent: z.number().int().min(0).max(100),
  vfxEnabled: z.boolean(), forceDefaultTrackAppearance: z.boolean(), showAllIcons: z.boolean(),
  hitErrorMeterVisible: z.boolean(), hitErrorMeterSize: z.enum(['small', 'normal', 'large', 'extra_large']),
  hitErrorMeterShape: z.enum(['straight', 'curved']),
}).strict();

export const defaultReplaySettings = {
  pitchPercent: 100, songVolumePercent: 80, hitSoundVolumePercent: 60,
  vfxEnabled: true, forceDefaultTrackAppearance: false, showAllIcons: false,
  hitErrorMeterVisible: true, hitErrorMeterSize: 'normal', hitErrorMeterShape: 'straight',
};

const hash = z.string().regex(/^[a-f0-9]{64}$/);
export const replayManifestSchema = z.object({
  format_version: z.literal(2), run_id: z.string().uuid(), tuf_level_id: z.number().int().positive(),
  external_pass_id: z.number().int().positive(), official_file_id: z.string().min(1), chart_path: z.string().min(1),
  chart_sha256: hash, gameplay_hash_version: z.literal(1), gameplay_hash: hash,
  evidence_digest: hash, recorded_speed: z.number().positive(),
  files: z.array(z.object({ name: z.string(), kind: z.enum(['inputs', 'hits', 'metadata', 'lifecycle', 'settings', 'health']),
    media_type: z.string(), url: z.string(), sha256: hash, bytes: z.number().int().nonnegative(), records: z.number().int().nonnegative(),
  })).min(3).max(6),
});

const position = z.number().int().nonnegative();
export const playerMessageSchema = z.object({ source: z.literal('tuf-replay'), protocolVersion: z.literal(1), sessionId: z.string().uuid(),
  type: z.string(), payload: z.unknown(),
}).strict().and(z.discriminatedUnion('type', [
  z.object({ type: z.literal('player.ready'), payload: z.object({ capabilities: z.object({ pitch: z.literal(true), volumes: z.literal(true), vfx: z.literal(true), trackAppearance: z.literal(true), icons: z.literal(true), hitErrorMeter: z.literal(true) }) }) }),
  z.object({ type: z.literal('player.loaded'), payload: z.object({ durationUs: position, positionUs: position, paused: z.literal(true), appliedSettings: replaySettingsSchema }) }),
  z.object({ type: z.literal('player.state'), payload: z.object({ durationUs: position, positionUs: position, appliedCommandId: position, paused: z.boolean(), ended: z.boolean(), settings: replaySettingsSchema }) }),
  z.object({ type: z.literal('player.error'), payload: z.object({ stage: z.enum(['protocol', 'level', 'replay', 'audio', 'renderer']), code: z.string(), recoverable: z.boolean() }) }),
]));

export function replayConfiguration() {
  const api = import.meta.env.VITE_AUTO_SUBMISSION_API_URL;
  const player = import.meta.env.VITE_WEB_ADOFAI_URL;
  if (!api || !player) throw new Error('replay_not_configured');
  const apiUrl = new URL(api);
  const playerUrl = new URL(player);
  if (![apiUrl, playerUrl].every(url => ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password)) throw new Error('replay_not_configured');
  return { api: apiUrl.origin, player: playerUrl.origin };
}
