// tuf-search: #SearchHelpPopup #packSearchHelpSections #packHelp
export const PACK_SEARCH_HELP_SECTIONS = [
  {
    id: 'basics',
    titleKey: 'packHelpPopup.v2.groups.basics.title',
    introKey: 'packHelpPopup.v2.groups.basics.intro',
    fields: [
      { token: ':', titleKey: 'packHelpPopup.v2.fields.operatorColon.title', descKey: 'packHelpPopup.v2.fields.operatorColon.desc' },
      { token: '=', titleKey: 'packHelpPopup.v2.fields.operatorEquals.title', descKey: 'packHelpPopup.v2.fields.operatorEquals.desc' },
      { token: ',', titleKey: 'packHelpPopup.v2.fields.operatorComma.title', descKey: 'packHelpPopup.v2.fields.operatorComma.desc' },
      { token: '|', titleKey: 'packHelpPopup.v2.fields.operatorPipe.title', descKey: 'packHelpPopup.v2.fields.operatorPipe.desc' },
      { token: '\\!', titleKey: 'packHelpPopup.v2.fields.operatorNot.title', descKey: 'packHelpPopup.v2.fields.operatorNot.desc' },
    ],
    examples: [
      'packHelpPopup.v2.groups.basics.examples.and',
      'packHelpPopup.v2.groups.basics.examples.or',
      'packHelpPopup.v2.groups.basics.examples.not',
    ],
  },
  {
    id: 'fields',
    titleKey: 'packHelpPopup.v2.groups.fields.title',
    introKey: 'packHelpPopup.v2.groups.fields.intro',
    fields: [
      { token: 'id', titleKey: 'packHelpPopup.v2.fields.id.title', descKey: 'packHelpPopup.v2.fields.id.desc' },
      { token: '#', titleKey: 'packHelpPopup.v2.fields.hashtag.title', descKey: 'packHelpPopup.v2.fields.hashtag.desc' },
      { token: 'name', titleKey: 'packHelpPopup.v2.fields.name.title', descKey: 'packHelpPopup.v2.fields.name.desc' },
      { token: 'owner', titleKey: 'packHelpPopup.v2.fields.owner.title', descKey: 'packHelpPopup.v2.fields.owner.desc' },
      { token: 'levelId', titleKey: 'packHelpPopup.v2.fields.levelId.title', descKey: 'packHelpPopup.v2.fields.levelId.desc' },
      { token: 'viewMode', titleKey: 'packHelpPopup.v2.fields.viewMode.title', descKey: 'packHelpPopup.v2.fields.viewMode.desc' },
      { token: 'pinned', titleKey: 'packHelpPopup.v2.fields.pinned.title', descKey: 'packHelpPopup.v2.fields.pinned.desc' },
    ],
    examples: [
      'packHelpPopup.v2.groups.fields.examples.nameOwner',
      'packHelpPopup.v2.groups.fields.examples.levelId',
      'packHelpPopup.v2.groups.fields.examples.pinned',
    ],
  },
  {
    id: 'viewModes',
    titleKey: 'packHelpPopup.v2.groups.viewModes.title',
    introKey: 'packHelpPopup.v2.groups.viewModes.intro',
    examples: [
      'packHelpPopup.v2.groups.viewModes.examples.public',
      'packHelpPopup.v2.groups.viewModes.examples.linkOnly',
      'packHelpPopup.v2.groups.viewModes.examples.private',
      'packHelpPopup.v2.groups.viewModes.examples.forcedPrivate',
    ],
  },
  {
    id: 'tips',
    titleKey: 'packHelpPopup.v2.groups.tips.title',
    introKey: 'packHelpPopup.v2.groups.tips.intro',
    bullets: [
      'packHelpPopup.v2.groups.tips.bullets.caseInsensitive',
      'packHelpPopup.v2.groups.tips.bullets.partial',
      'packHelpPopup.v2.groups.tips.bullets.spacesAllowed',
      'packHelpPopup.v2.groups.tips.bullets.orderDoesNotMatter',
      'packHelpPopup.v2.groups.tips.bullets.boolean',
      'packHelpPopup.v2.groups.tips.bullets.groupingMentalModel',
    ],
  },
];
