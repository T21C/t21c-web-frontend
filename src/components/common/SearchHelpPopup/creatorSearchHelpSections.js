// tuf-search: #SearchHelpPopup #creatorSearchHelpSections #creatorHelp
export const CREATOR_SEARCH_HELP_SECTIONS = [
  {
    id: 'basics',
    titleKey: 'creator.helpPopup.v2.groups.basics.title',
    introKey: 'creator.helpPopup.v2.groups.basics.intro',
    fields: [
      { token: ',', titleKey: 'creator.helpPopup.v2.fields.operatorComma.title', descKey: 'creator.helpPopup.v2.fields.operatorComma.desc' },
      { token: '|', titleKey: 'creator.helpPopup.v2.fields.operatorPipe.title', descKey: 'creator.helpPopup.v2.fields.operatorPipe.desc' },
      { token: '@', titleKey: 'creator.helpPopup.v2.fields.atUsername.title', descKey: 'creator.helpPopup.v2.fields.atUsername.desc' },
    ],
    examples: [
      'creator.helpPopup.v2.groups.basics.examples.plainName',
      'creator.helpPopup.v2.groups.basics.examples.username',
      'creator.helpPopup.v2.groups.basics.examples.combine',
    ],
  },
  {
    id: 'curationCounts',
    titleKey: 'creator.helpPopup.v2.groups.curationCounts.title',
    introKey: 'creator.helpPopup.v2.groups.curationCounts.intro',
    fields: [
      { token: '>', titleKey: 'creator.helpPopup.v2.fields.opGt.title', descKey: 'creator.helpPopup.v2.fields.opGt.desc' },
      { token: '>=', titleKey: 'creator.helpPopup.v2.fields.opGte.title', descKey: 'creator.helpPopup.v2.fields.opGte.desc' },
      { token: '<', titleKey: 'creator.helpPopup.v2.fields.opLt.title', descKey: 'creator.helpPopup.v2.fields.opLt.desc' },
      { token: '<=', titleKey: 'creator.helpPopup.v2.fields.opLte.title', descKey: 'creator.helpPopup.v2.fields.opLte.desc' },
      { token: '=', titleKey: 'creator.helpPopup.v2.fields.opEq.title', descKey: 'creator.helpPopup.v2.fields.opEq.desc' },
    ],
    examples: [
      'creator.helpPopup.v2.groups.curationCounts.examples.single',
      'creator.helpPopup.v2.groups.curationCounts.examples.and',
      'creator.helpPopup.v2.groups.curationCounts.examples.or',
      'creator.helpPopup.v2.groups.curationCounts.examples.withName',
    ],
  },
  {
    id: 'facetFilter',
    titleKey: 'creator.helpPopup.v2.groups.facetFilter.title',
    introKey: 'creator.helpPopup.v2.groups.facetFilter.intro',
    examples: [
      'creator.helpPopup.v2.groups.facetFilter.examples.simple',
      'creator.helpPopup.v2.groups.facetFilter.examples.advanced',
    ],
  },
  {
    id: 'tips',
    titleKey: 'creator.helpPopup.v2.groups.tips.title',
    introKey: 'creator.helpPopup.v2.groups.tips.intro',
    bullets: [
      'creator.helpPopup.v2.groups.tips.bullets.typeNameExact',
      'creator.helpPopup.v2.groups.tips.bullets.unknownType',
      'creator.helpPopup.v2.groups.tips.bullets.facetAndQuery',
    ],
  },
];
