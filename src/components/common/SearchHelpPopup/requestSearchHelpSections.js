// tuf-search: #SearchHelpPopup #requestSearchHelpSections #requestHelp
export const REQUEST_SEARCH_HELP_SECTIONS = [
  {
    id: 'basics',
    titleKey: 'levelRequests.helpPopup.v2.groups.basics.title',
    introKey: 'levelRequests.helpPopup.v2.groups.basics.intro',
    fields: [
      { token: ':', titleKey: 'levelRequests.helpPopup.v2.fields.operatorColon.title', descKey: 'levelRequests.helpPopup.v2.fields.operatorColon.desc' },
      { token: '=', titleKey: 'levelRequests.helpPopup.v2.fields.operatorEquals.title', descKey: 'levelRequests.helpPopup.v2.fields.operatorEquals.desc' },
      { token: ',', titleKey: 'levelRequests.helpPopup.v2.fields.operatorComma.title', descKey: 'levelRequests.helpPopup.v2.fields.operatorComma.desc' },
      { token: '|', titleKey: 'levelRequests.helpPopup.v2.fields.operatorPipe.title', descKey: 'levelRequests.helpPopup.v2.fields.operatorPipe.desc' },
      { token: '\\!', titleKey: 'levelRequests.helpPopup.v2.fields.operatorNot.title', descKey: 'levelRequests.helpPopup.v2.fields.operatorNot.desc' },
    ],
    examples: [
      'levelRequests.helpPopup.v2.groups.basics.examples.and',
      'levelRequests.helpPopup.v2.groups.basics.examples.or',
      'levelRequests.helpPopup.v2.groups.basics.examples.not',
    ],
  },
  {
    id: 'fields',
    titleKey: 'levelRequests.helpPopup.v2.groups.fields.title',
    introKey: 'levelRequests.helpPopup.v2.groups.fields.intro',
    fields: [
      { token: 'id', titleKey: 'levelRequests.helpPopup.v2.fields.id.title', descKey: 'levelRequests.helpPopup.v2.fields.id.desc' },
      { token: '#', titleKey: 'levelRequests.helpPopup.v2.fields.hashtag.title', descKey: 'levelRequests.helpPopup.v2.fields.hashtag.desc' },
      { token: 'level', titleKey: 'levelRequests.helpPopup.v2.fields.level.title', descKey: 'levelRequests.helpPopup.v2.fields.level.desc' },
      { token: 'song', titleKey: 'levelRequests.helpPopup.v2.fields.song.title', descKey: 'levelRequests.helpPopup.v2.fields.song.desc' },
      { token: 'artist', titleKey: 'levelRequests.helpPopup.v2.fields.artist.title', descKey: 'levelRequests.helpPopup.v2.fields.artist.desc' },
      { token: 'requester', titleKey: 'levelRequests.helpPopup.v2.fields.requester.title', descKey: 'levelRequests.helpPopup.v2.fields.requester.desc' },
      { token: 'status', titleKey: 'levelRequests.helpPopup.v2.fields.status.title', descKey: 'levelRequests.helpPopup.v2.fields.status.desc' },
      { token: 'type', titleKey: 'levelRequests.helpPopup.v2.fields.type.title', descKey: 'levelRequests.helpPopup.v2.fields.type.desc' },
      { token: 'reason', titleKey: 'levelRequests.helpPopup.v2.fields.reason.title', descKey: 'levelRequests.helpPopup.v2.fields.reason.desc' },
    ],
    examples: [
      'levelRequests.helpPopup.v2.groups.fields.examples.level',
      'levelRequests.helpPopup.v2.groups.fields.examples.requesterStatus',
      'levelRequests.helpPopup.v2.groups.fields.examples.typeReason',
    ],
  },
  {
    id: 'tips',
    titleKey: 'levelRequests.helpPopup.v2.groups.tips.title',
    introKey: 'levelRequests.helpPopup.v2.groups.tips.intro',
    bullets: [
      'levelRequests.helpPopup.v2.groups.tips.bullets.plainText',
      'levelRequests.helpPopup.v2.groups.tips.bullets.statusToggle',
      'levelRequests.helpPopup.v2.groups.tips.bullets.caseInsensitive',
      'levelRequests.helpPopup.v2.groups.tips.bullets.spacesAllowed',
      'levelRequests.helpPopup.v2.groups.tips.bullets.groupingMentalModel',
    ],
  },
];
