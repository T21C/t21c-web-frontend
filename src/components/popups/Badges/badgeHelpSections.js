const field = (section, token, example = false) => ({
  token,
  titleKey: `badges.help.sections.${section}.fields.${token}.title`,
  descKey: `badges.help.sections.${section}.fields.${token}.desc`,
  ...(example ? { exampleKey: `badges.help.sections.${section}.fields.${token}.example` } : {}),
});

const fields = (section, tokens, example = false) => tokens.map((token) => field(section, token, example));

export const BADGE_CHEAP_PREFER = [
  'badges.help.agentBrief.cheap.prefer.difficulty',
  'badges.help.agentBrief.cheap.prefer.reclears',
  'badges.help.agentBrief.cheap.prefer.distinct',
  'badges.help.agentBrief.cheap.prefer.chase',
  'badges.help.agentBrief.cheap.prefer.blocks',
  'badges.help.agentBrief.cheap.prefer.world',
  'badges.help.agentBrief.cheap.prefer.sets',
];

export const BADGE_CHEAP_AVOID = [
  'badges.help.agentBrief.cheap.avoid.completeScan',
  'badges.help.agentBrief.cheap.avoid.nested',
  'badges.help.agentBrief.cheap.avoid.levels',
];

export const BADGE_CHEAP_NOTES = [
  'badges.help.agentBrief.cheap.notes.familyAt',
  'badges.help.agentBrief.cheap.notes.lower',
];

export const BADGE_HELP_SECTIONS = [
  {
    id: 'cheap',
    titleKey: 'badges.help.agentBrief.cheapTitle',
    introKey: 'badges.help.agentBrief.cheapIntro',
    examples: BADGE_CHEAP_PREFER,
    bullets: [...BADGE_CHEAP_AVOID, ...BADGE_CHEAP_NOTES],
  },
  {
    id: 'lists',
    titleKey: 'badges.help.sections.lists.title',
    introKey: 'badges.help.sections.lists.intro',
    fields: fields('lists', ['clears', 'levels', 'mine', 'ratings']),
  },
  {
    id: 'clearFields',
    titleKey: 'badges.help.sections.clearFields.title',
    introKey: 'badges.help.sections.clearFields.intro',
    fields: fields('clearFields', [
      'passId', 'levelId', 'identity', 'speed', 'keyCount', 'difficulty', 'difficultyAt',
      'family', 'familyAt', 'song', 'songId', 'durationMs', 'accuracy', 'accuracyText',
      'score', 'scoreText', 'worldsFirst', 'isWorldsFirst', 'worldsFirstPP', 'ancient',
      'xPerfect', 'reference', 'curation', 'charterCount', 'vfxerCount', 'ownerIsCharter',
      'ownerIsVfxer', 'noPriorClear', 'month', 'day', 'uploadMs',
    ]),
    examples: [
      'badges.help.sections.clearFields.examples.worldsFirst',
      'badges.help.sections.clearFields.examples.accuracyText',
    ],
  },
  {
    id: 'judgements',
    titleKey: 'badges.help.sections.judgements.title',
    introKey: 'badges.help.sections.judgements.intro',
    fields: fields('judgements', [
      'misses', 'earlies', 'lates', 'ePerfect', 'lPerfect', 'perfect', 'perfects',
      'perfectMinus', 'perfectPlus', 'purePerfect', 'ppMinusOne', 'noMisses',
      'symmetry', 'technicallyPure', 'noPerfects', 'asymmetry',
    ]),
    examples: [
      'badges.help.sections.judgements.examples.symmetry',
      'badges.help.sections.judgements.examples.ppMinusOne',
    ],
  },
  {
    id: 'levelFields',
    titleKey: 'badges.help.sections.levelFields.title',
    introKey: 'badges.help.sections.levelFields.intro',
    fields: fields('levelFields', [
      'levelId', 'identity', 'difficulty', 'family', 'song', 'songId', 'durationMs',
      'clears', 'reference', 'curation', 'charterCount', 'vfxerCount', 'ownerIsCharter',
      'ownerIsVfxer', 'artistIds', 'rivals',
    ]),
  },
  {
    id: 'structures',
    titleKey: 'badges.help.sections.structures.title',
    introKey: 'badges.help.sections.structures.intro',
    fields: [
      { token: '==', titleKey: 'badges.help.sections.structures.fields.eq.title', descKey: 'badges.help.sections.structures.fields.eq.desc' },
      { token: '>', titleKey: 'badges.help.sections.structures.fields.compare.title', descKey: 'badges.help.sections.structures.fields.compare.desc' },
      { token: '&&', titleKey: 'badges.help.sections.structures.fields.and.title', descKey: 'badges.help.sections.structures.fields.and.desc' },
      { token: '!', titleKey: 'badges.help.sections.structures.fields.not.title', descKey: 'badges.help.sections.structures.fields.not.desc' },
      { token: '?:', titleKey: 'badges.help.sections.structures.fields.ternary.title', descKey: 'badges.help.sections.structures.fields.ternary.desc' },
      { token: '=>', titleKey: 'badges.help.sections.structures.fields.arrow.title', descKey: 'badges.help.sections.structures.fields.arrow.desc' },
      { token: '[]', titleKey: 'badges.help.sections.structures.fields.array.title', descKey: 'badges.help.sections.structures.fields.array.desc' },
      { token: '.filter', titleKey: 'badges.help.sections.structures.fields.filter.title', descKey: 'badges.help.sections.structures.fields.filter.desc', exampleKey: 'badges.help.sections.structures.fields.filter.example' },
      { token: '.map', titleKey: 'badges.help.sections.structures.fields.map.title', descKey: 'badges.help.sections.structures.fields.map.desc', exampleKey: 'badges.help.sections.structures.fields.map.example' },
      { token: '.some', titleKey: 'badges.help.sections.structures.fields.some.title', descKey: 'badges.help.sections.structures.fields.some.desc', exampleKey: 'badges.help.sections.structures.fields.some.example' },
      { token: '.every', titleKey: 'badges.help.sections.structures.fields.every.title', descKey: 'badges.help.sections.structures.fields.every.desc', exampleKey: 'badges.help.sections.structures.fields.every.example' },
      { token: '.find', titleKey: 'badges.help.sections.structures.fields.find.title', descKey: 'badges.help.sections.structures.fields.find.desc', exampleKey: 'badges.help.sections.structures.fields.find.example' },
      { token: '.includes', titleKey: 'badges.help.sections.structures.fields.includes.title', descKey: 'badges.help.sections.structures.fields.includes.desc', exampleKey: 'badges.help.sections.structures.fields.includes.example' },
      { token: '.length', titleKey: 'badges.help.sections.structures.fields.length.title', descKey: 'badges.help.sections.structures.fields.length.desc', exampleKey: 'badges.help.sections.structures.fields.length.example' },
      { token: 'text', titleKey: 'badges.help.sections.structures.fields.text.title', descKey: 'badges.help.sections.structures.fields.text.desc', exampleKey: 'badges.help.sections.structures.fields.text.example' },
      { token: '?.', titleKey: 'badges.help.sections.structures.fields.optional.title', descKey: 'badges.help.sections.structures.fields.optional.desc' },
    ],
  },
  {
    id: 'numbers',
    titleKey: 'badges.help.sections.numbers.title',
    introKey: 'badges.help.sections.numbers.intro',
    fields: fields('numbers', ['count', 'distinct', 'sum', 'min', 'max', 'maxCount', 'abs', 'floor', 'round', 'ceil', 'threshold'], true),
  },
  {
    id: 'curves',
    titleKey: 'badges.help.sections.curves.title',
    introKey: 'badges.help.sections.curves.intro',
    fields: fields('curves', ['curve', 'curveDown', 'result', 'number'], true),
  },
  {
    id: 'functions',
    titleKey: 'badges.help.sections.functions.title',
    introKey: 'badges.help.sections.functions.intro',
    fields: fields('functions', [
      'difficulty', 'sequence', 'consecutive', 'blocks', 'prefix', 'gap', 'pack',
      'complete', 'nth', 'lead', 'first', 'shared', 'inSet', 'maxGroup', 'chase',
    ], true),
  },
  {
    id: 'clears',
    titleKey: 'badges.help.sections.clears.title',
    introKey: 'badges.help.sections.clears.intro',
    bullets: [
      'badges.help.sections.clears.bullets.visible',
      'badges.help.sections.clears.bullets.buckets',
      'badges.help.sections.clears.bullets.worldsFirst',
      'badges.help.sections.clears.bullets.placeholder',
      'badges.help.sections.clears.bullets.unknownTime',
    ],
  },
  {
    id: 'identity',
    titleKey: 'badges.help.sections.identity.title',
    introKey: 'badges.help.sections.identity.intro',
    fields: fields('identity', ['level', 'chartSubgroup', 'vfxSubgroup', 'group']),
    bullets: [
      'badges.help.sections.identity.bullets.ownChart',
      'badges.help.sections.identity.bullets.reclear',
    ],
  },
  {
    id: 'history',
    titleKey: 'badges.help.sections.history.title',
    introKey: 'badges.help.sections.history.intro',
    bullets: [
      'badges.help.sections.history.bullets.walk',
      'badges.help.sections.history.bullets.fallback',
      'badges.help.sections.history.bullets.snapshot',
      'badges.help.sections.history.bullets.older',
    ],
  },
  {
    id: 'grants',
    titleKey: 'badges.help.sections.grants.title',
    introKey: 'badges.help.sections.grants.intro',
    fields: fields('grants', ['live', 'persistTier', 'persistSnapshot', 'resetOnGrowth', 'manualLock', 'chase']),
    bullets: ['badges.help.sections.grants.bullets.replace'],
  },
  {
    id: 'backfill',
    titleKey: 'badges.help.sections.backfill.title',
    introKey: 'badges.help.sections.backfill.intro',
    fields: fields('backfill', ['now', 'forward', 'queue']),
    bullets: [
      'badges.help.sections.backfill.bullets.skips',
      'badges.help.sections.backfill.bullets.unreconstructed',
    ],
  },
  {
    id: 'reviews',
    titleKey: 'badges.help.sections.reviews.title',
    introKey: 'badges.help.sections.reviews.intro',
    bullets: [
      'badges.help.sections.reviews.bullets.video',
      'badges.help.sections.reviews.bullets.secret',
      'badges.help.sections.reviews.bullets.locked',
      'badges.help.sections.reviews.bullets.earned',
      'badges.help.sections.reviews.bullets.confirm',
    ],
  },
];
