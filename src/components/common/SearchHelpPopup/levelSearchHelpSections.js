// tuf-search: #SearchHelpPopup #levelSearchHelpSections #levelHelp
export const LEVEL_SEARCH_HELP_SECTIONS = [
  {
    id: 'basics',
    titleKey: 'level.helpPopup.v2.groups.basics.title',
    introKey: 'level.helpPopup.v2.groups.basics.intro',
    fields: [
      { token: ':', titleKey: 'level.helpPopup.v2.fields.operatorColon.title', descKey: 'level.helpPopup.v2.fields.operatorColon.desc' },
      { token: '=', titleKey: 'level.helpPopup.v2.fields.operatorEquals.title', descKey: 'level.helpPopup.v2.fields.operatorEquals.desc' },
      { token: ',', titleKey: 'level.helpPopup.v2.fields.operatorComma.title', descKey: 'level.helpPopup.v2.fields.operatorComma.desc' },
      { token: '|', titleKey: 'level.helpPopup.v2.fields.operatorPipe.title', descKey: 'level.helpPopup.v2.fields.operatorPipe.desc' },
      { token: '\\!', titleKey: 'level.helpPopup.v2.fields.operatorNot.title', descKey: 'level.helpPopup.v2.fields.operatorNot.desc' },
    ],
    examples: [
      'level.helpPopup.v2.groups.basics.examples.and',
      'level.helpPopup.v2.groups.basics.examples.or',
      'level.helpPopup.v2.groups.basics.examples.not',
    ],
  },
  {
    id: 'text',
    titleKey: 'level.helpPopup.v2.groups.text.title',
    introKey: 'level.helpPopup.v2.groups.text.intro',
    fields: [
      { token: 'song', titleKey: 'level.helpPopup.v2.fields.song.title', descKey: 'level.helpPopup.v2.fields.song.desc' },
      { token: 'artist', titleKey: 'level.helpPopup.v2.fields.artist.title', descKey: 'level.helpPopup.v2.fields.artist.desc' },
      { token: 'creator', titleKey: 'level.helpPopup.v2.fields.creator.title', descKey: 'level.helpPopup.v2.fields.creator.desc' },
      { token: 'charter', titleKey: 'level.helpPopup.v2.fields.charter.title', descKey: 'level.helpPopup.v2.fields.charter.desc' },
      { token: 'vfxer', titleKey: 'level.helpPopup.v2.fields.vfxer.title', descKey: 'level.helpPopup.v2.fields.vfxer.desc' },
      { token: 'team', titleKey: 'level.helpPopup.v2.fields.team.title', descKey: 'level.helpPopup.v2.fields.team.desc' },
      { token: 'comment', titleKey: 'level.helpPopup.v2.fields.comment.title', descKey: 'level.helpPopup.v2.fields.comment.desc' },
    ],
    examples: [
      'level.helpPopup.v2.groups.text.examples.partialVsExact',
      'level.helpPopup.v2.groups.text.examples.multiWord',
      'level.helpPopup.v2.groups.text.examples.mixTextAndNumeric',
    ],
  },
  {
    id: 'numeric',
    titleKey: 'level.helpPopup.v2.groups.numeric.title',
    introKey: 'level.helpPopup.v2.groups.numeric.intro',
    fields: [
      { token: 'bpm', titleKey: 'level.helpPopup.v2.fields.bpm.title', descKey: 'level.helpPopup.v2.fields.bpm.desc' },
      { token: 'tilecount', titleKey: 'level.helpPopup.v2.fields.tilecount.title', descKey: 'level.helpPopup.v2.fields.tilecount.desc' },
      { token: 'time', titleKey: 'level.helpPopup.v2.fields.time.title', descKey: 'level.helpPopup.v2.fields.time.desc' },
      { token: 'likes', titleKey: 'level.helpPopup.v2.fields.likes.title', descKey: 'level.helpPopup.v2.fields.likes.desc' },
    ],
    examples: [
      'level.helpPopup.v2.groups.numeric.examples.bpmRange',
      'level.helpPopup.v2.groups.numeric.examples.tilesMin',
      'level.helpPopup.v2.groups.numeric.examples.timeUnits',
      'level.helpPopup.v2.groups.numeric.examples.timeMsPlain',
      'level.helpPopup.v2.groups.numeric.examples.likesRange',
    ],
  },
  {
    id: 'idsAndLinks',
    titleKey: 'level.helpPopup.v2.groups.idsAndLinks.title',
    introKey: 'level.helpPopup.v2.groups.idsAndLinks.intro',
    fields: [
      { token: 'id', titleKey: 'level.helpPopup.v2.fields.id.title', descKey: 'level.helpPopup.v2.fields.id.desc' },
      { token: '#', titleKey: 'level.helpPopup.v2.fields.hashtag.title', descKey: 'level.helpPopup.v2.fields.hashtag.desc' },
      { token: 'dlLink', titleKey: 'level.helpPopup.v2.fields.dlLink.title', descKey: 'level.helpPopup.v2.fields.dlLink.desc' },
      { token: 'workshopLink', titleKey: 'level.helpPopup.v2.fields.workshopLink.title', descKey: 'level.helpPopup.v2.fields.workshopLink.desc' },
      { token: 'legacyDllink', titleKey: 'level.helpPopup.v2.fields.legacyDllink.title', descKey: 'level.helpPopup.v2.fields.legacyDllink.desc' },
      { token: 'videolink', titleKey: 'level.helpPopup.v2.fields.videolink.title', descKey: 'level.helpPopup.v2.fields.videolink.desc' },
    ],
    examples: [
      'level.helpPopup.v2.groups.idsAndLinks.examples.idExact',
      'level.helpPopup.v2.groups.idsAndLinks.examples.idRange',
      'level.helpPopup.v2.groups.idsAndLinks.examples.linkMatch',
    ],
  },
  {
    id: 'tips',
    titleKey: 'level.helpPopup.v2.groups.tips.title',
    introKey: 'level.helpPopup.v2.groups.tips.intro',
    bullets: [
      'level.helpPopup.v2.groups.tips.bullets.caseInsensitive',
      'level.helpPopup.v2.groups.tips.bullets.spacesAllowed',
      'level.helpPopup.v2.groups.tips.bullets.orderDoesNotMatter',
      'level.helpPopup.v2.groups.tips.bullets.aliasesMayMatch',
      'level.helpPopup.v2.groups.tips.bullets.groupingMentalModel',
    ],
  },
];
