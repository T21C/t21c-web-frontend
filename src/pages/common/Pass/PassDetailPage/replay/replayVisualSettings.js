// tuf-search: #replayVisualSettings #replayContract
import { z } from 'zod';

export const visualSettingsSchema = z.object({
  defaults: z.object({ keyviewer_id: z.string().uuid().nullable(), overlay_id: z.string().uuid().nullable() }),
  presets: z.array(z.object({ id: z.string().uuid(), name: z.string(), kind: z.enum(['keyviewer', 'overlay']), source: z.string(), is_hidden: z.boolean() })),
});

export function availableDefaults(defaults, presets) {
  const result = { ...defaults };
  for (const kind of ['keyviewer', 'overlay']) {
    if (!presets.some(preset => preset.id === result[`${kind}_id`] && preset.kind === kind && !preset.is_hidden)) result[`${kind}_id`] = null;
  }
  return result;
}
