// tuf-search: #replayDelivery #replayContract
import { z } from 'zod';

export const replayOpenSchema = z.object({ runId: z.string().uuid(), passId: z.number().int().positive(), levelId: z.number().int().positive() });

export function replayOpenPayload(pass) {
  return replayOpenSchema.parse({ runId: pass.autoSubmissionRunId, passId: Number(pass.id), levelId: Number(pass.levelId ?? pass.level?.id) });
}

// Deliberately opaque to replay formats, visual sources, settings and player errors.
export const playerMessageSchema = z.object({
  source: z.literal('tuf-replay'), protocolVersion: z.literal(3), sessionId: z.string().uuid(), type: z.string(), payload: z.unknown().optional(),
});

export function replayConfiguration(configured = import.meta.env?.VITE_WEB_ADOFAI_URL) {
  // Match the existing level viewer when no deployment-specific override is set.
  const player = new URL(configured?.trim() || 'https://web-adofai.impl1113.dev');
  if (!['http:', 'https:'].includes(player.protocol) || player.username || player.password) throw new Error('replay_not_configured');
  return { player: player.origin };
}
