// tuf-search: #SearchHelpPopup #passSearchHelpSections #passHelp
export const PASS_SEARCH_HELP_SECTIONS = [
  {
    id: 'basics',
    titleKey: 'pass.helpPopup.v2.groups.basics.title',
    introKey: 'pass.helpPopup.v2.groups.basics.intro',
    fields: [
      { token: ':', titleKey: 'pass.helpPopup.v2.fields.operatorColon.title', descKey: 'pass.helpPopup.v2.fields.operatorColon.desc' },
      { token: '=', titleKey: 'pass.helpPopup.v2.fields.operatorEquals.title', descKey: 'pass.helpPopup.v2.fields.operatorEquals.desc' },
      { token: ',', titleKey: 'pass.helpPopup.v2.fields.operatorComma.title', descKey: 'pass.helpPopup.v2.fields.operatorComma.desc' },
      { token: '|', titleKey: 'pass.helpPopup.v2.fields.operatorPipe.title', descKey: 'pass.helpPopup.v2.fields.operatorPipe.desc' },
      { token: '\\!', titleKey: 'pass.helpPopup.v2.fields.operatorNot.title', descKey: 'pass.helpPopup.v2.fields.operatorNot.desc' },
    ],
    examples: [
      'pass.helpPopup.v2.groups.basics.examples.and',
      'pass.helpPopup.v2.groups.basics.examples.or',
      'pass.helpPopup.v2.groups.basics.examples.not',
    ],
  },
  {
    id: 'playerAndMedia',
    titleKey: 'pass.helpPopup.v2.groups.playerAndMedia.title',
    introKey: 'pass.helpPopup.v2.groups.playerAndMedia.intro',
    fields: [
      { token: 'player', titleKey: 'pass.helpPopup.v2.fields.player.title', descKey: 'pass.helpPopup.v2.fields.player.desc' },
      { token: 'player.id', titleKey: 'pass.helpPopup.v2.fields.playerId.title', descKey: 'pass.helpPopup.v2.fields.playerId.desc' },
      { token: 'video', titleKey: 'pass.helpPopup.v2.fields.video.title', descKey: 'pass.helpPopup.v2.fields.video.desc' },
      { token: 'vidtitle', titleKey: 'pass.helpPopup.v2.fields.vidtitle.title', descKey: 'pass.helpPopup.v2.fields.vidtitle.desc' },
    ],
    examples: [
      'pass.helpPopup.v2.groups.playerAndMedia.examples.partialVsExact',
      'pass.helpPopup.v2.groups.playerAndMedia.examples.videoAndTitle',
      'pass.helpPopup.v2.groups.playerAndMedia.examples.mixFields',
    ],
  },
  {
    id: 'levelContext',
    titleKey: 'pass.helpPopup.v2.groups.levelContext.title',
    introKey: 'pass.helpPopup.v2.groups.levelContext.intro',
    fields: [
      { token: 'level.song', titleKey: 'pass.helpPopup.v2.fields.levelSong.title', descKey: 'pass.helpPopup.v2.fields.levelSong.desc' },
      { token: 'level.artist', titleKey: 'pass.helpPopup.v2.fields.levelArtist.title', descKey: 'pass.helpPopup.v2.fields.levelArtist.desc' },
      { token: 'level.dlLink', titleKey: 'pass.helpPopup.v2.fields.levelDlLink.title', descKey: 'pass.helpPopup.v2.fields.levelDlLink.desc' },
    ],
    examples: [
      'pass.helpPopup.v2.groups.levelContext.examples.songArtist',
      'pass.helpPopup.v2.groups.levelContext.examples.dlLink',
    ],
  },
  {
    id: 'numeric',
    titleKey: 'pass.helpPopup.v2.groups.numeric.title',
    introKey: 'pass.helpPopup.v2.groups.numeric.intro',
    fields: [
      { token: 'keycount', titleKey: 'pass.helpPopup.v2.fields.keycount.title', descKey: 'pass.helpPopup.v2.fields.keycount.desc' },
      { token: 'score', titleKey: 'pass.helpPopup.v2.fields.score.title', descKey: 'pass.helpPopup.v2.fields.score.desc' },
      { token: 'xacc', titleKey: 'pass.helpPopup.v2.fields.xacc.title', descKey: 'pass.helpPopup.v2.fields.xacc.desc' },
      { token: 'speed', titleKey: 'pass.helpPopup.v2.fields.speed.title', descKey: 'pass.helpPopup.v2.fields.speed.desc' },
    ],
    examples: [
      'pass.helpPopup.v2.groups.numeric.examples.exact',
      'pass.helpPopup.v2.groups.numeric.examples.range',
      'pass.helpPopup.v2.groups.numeric.examples.xaccNearPerfect',
      'pass.helpPopup.v2.groups.numeric.examples.combine',
    ],
  },
  {
    id: 'judgements',
    titleKey: 'pass.helpPopup.v2.groups.judgements.title',
    introKey: 'pass.helpPopup.v2.groups.judgements.intro',
    fields: [
      { token: 'eperfect', titleKey: 'pass.helpPopup.v2.fields.eperfect.title', descKey: 'pass.helpPopup.v2.fields.eperfect.desc' },
      { token: 'perfect', titleKey: 'pass.helpPopup.v2.fields.perfect.title', descKey: 'pass.helpPopup.v2.fields.perfect.desc' },
      { token: 'lperfect', titleKey: 'pass.helpPopup.v2.fields.lperfect.title', descKey: 'pass.helpPopup.v2.fields.lperfect.desc' },
      { token: 'earlysingle', titleKey: 'pass.helpPopup.v2.fields.earlysingle.title', descKey: 'pass.helpPopup.v2.fields.earlysingle.desc' },
      { token: 'earlydouble', titleKey: 'pass.helpPopup.v2.fields.earlydouble.title', descKey: 'pass.helpPopup.v2.fields.earlydouble.desc' },
      { token: 'latesingle', titleKey: 'pass.helpPopup.v2.fields.latesingle.title', descKey: 'pass.helpPopup.v2.fields.latesingle.desc' },
      { token: 'latedouble', titleKey: 'pass.helpPopup.v2.fields.latedouble.title', descKey: 'pass.helpPopup.v2.fields.latedouble.desc' },
    ],
    examples: [
      'pass.helpPopup.v2.groups.judgements.examples.exactCount',
      'pass.helpPopup.v2.groups.judgements.examples.nearPerfect',
      'pass.helpPopup.v2.groups.judgements.examples.combine',
    ],
  },
  {
    id: 'idsAndShortcuts',
    titleKey: 'pass.helpPopup.v2.groups.idsAndShortcuts.title',
    introKey: 'pass.helpPopup.v2.groups.idsAndShortcuts.intro',
    fields: [
      { token: '#', titleKey: 'pass.helpPopup.v2.fields.hashtag.title', descKey: 'pass.helpPopup.v2.fields.hashtag.desc' },
      { token: 'player.id', titleKey: 'pass.helpPopup.v2.fields.playerId.title', descKey: 'pass.helpPopup.v2.fields.playerId.desc' },
    ],
    examples: [
      'pass.helpPopup.v2.groups.idsAndShortcuts.examples.hashtag',
      'pass.helpPopup.v2.groups.idsAndShortcuts.examples.playerId',
    ],
  },
  {
    id: 'tips',
    titleKey: 'pass.helpPopup.v2.groups.tips.title',
    introKey: 'pass.helpPopup.v2.groups.tips.intro',
    bullets: [
      'pass.helpPopup.v2.groups.tips.bullets.caseInsensitive',
      'pass.helpPopup.v2.groups.tips.bullets.spacesAllowed',
      'pass.helpPopup.v2.groups.tips.bullets.orderDoesNotMatter',
      'pass.helpPopup.v2.groups.tips.bullets.groupingMentalModel',
      'pass.helpPopup.v2.groups.tips.bullets.plainSearch',
    ],
  },
];
