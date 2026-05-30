// tuf-search: #apiRoutes
/** Path-only API routes. Request host comes from `VITE_API_URL` (`api.js` baseURL). */

const enc = (id: string | number) => encodeURIComponent(String(id));

export const routes = {
  auth: {
    login: () => '/v2/auth/login',
    register: () => '/v2/auth/register',
    logout: () => '/v2/auth/logout',
    refresh: () => '/v2/auth/refresh',
    loginDiscord: () => '/v2/auth/login/discord',
    oauthLink: (provider: string) => `/v2/auth/oauth/link/${enc(provider)}`,
    oauthCallback: (provider: string) => `/v2/auth/oauth/callback/${enc(provider)}`,
    oauthUnlink: (provider: string) => `/v2/auth/oauth/unlink/${enc(provider)}`,
    profilePassword: () => '/v2/auth/profile/password',
    verify: {
      email: () => '/v2/auth/verify/email',
      resend: () => '/v2/auth/verify/resend',
      changeEmail: () => '/v2/auth/verify/change-email',
    },
    forgotPassword: {
      request: () => '/v2/auth/forgot-password/request',
      reset: () => '/v2/auth/forgot-password/reset',
    },
    profile: {
      root: () => '/v2/auth/profile',
      me: () => '/v2/auth/profile/me',
      syncRoles: () => '/v2/auth/profile/sync-roles',
      avatar: () => '/v2/auth/profile/avatar',
      delete: () => '/v2/auth/profile/me/delete',
      deleteCancel: () => '/v2/auth/profile/me/delete/cancel',
      player: {
        bannerPreset: () => '/v2/auth/profile/player/banner-preset',
        bannerCustom: () => '/v2/auth/profile/player/banner-custom',
        headerSurfaceStyle: () => '/v2/auth/profile/player/header-surface-style',
        headerSurfaceImage: () => '/v2/auth/profile/player/header-surface-image',
      },
    },
  },

  admin: {
    statistics: () => '/v2/admin/statistics',
    statisticsRatingsPerUser: () => '/v2/admin/statistics/ratings-per-user',
    rating: () => '/v2/admin/rating',
    creators: {
      byId: (id: string | number) => `/v2/admin/creators/${enc(id)}`,
    },
    backup: {
      root: () => '/v2/admin/backup',
      list: () => '/v2/admin/backup/list',
      upload: () => '/v2/admin/backup/upload',
      create: () => '/v2/admin/backup/create',
      rename: (filename: string) => `/v2/admin/backup/rename/${enc(filename)}`,
      download: (filename: string) => `/v2/admin/backup/download/${enc(filename)}`,
      delete: (filename: string) => `/v2/admin/backup/delete/${enc(filename)}`,
      restore: (filename: string) => `/v2/admin/backup/restore/${enc(filename)}`,
    },
    verifyPassword: () => '/v2/admin/verify-password',
    raters: () => '/v2/admin/users/raters',
    auditLog: () => '/v2/admin/audit-log',
    users: {
      root: () => '/v2/admin/users',
      curators: () => '/v2/admin/users/curators',
      grantRole: () => '/v2/admin/users/grant-role',
      revokeRole: () => '/v2/admin/users/revoke-role',
      discord: (discordId: string) => `/v2/admin/users/discord/${enc(discordId)}`,
      ratingBan: (userId: string | number) => `/v2/admin/users/${enc(userId)}/rating-ban`,
      scheduleAccountDeletion: (userId: string | number) =>
        `/v2/admin/users/${enc(userId)}/schedule-account-deletion`,
    },
    submissions: {
      root: () => '/v2/admin/submissions',
      levelsPending: () => '/v2/admin/submissions/levels/pending',
      passesPending: () => '/v2/admin/submissions/passes/pending',
      autoApprovePasses: () => '/v2/admin/submissions/auto-approve/passes',
      level: (submissionId: string | number) => `/v2/admin/submissions/levels/${enc(submissionId)}`,
      levelAction: (submissionId: string | number, action: string) =>
        `/v2/admin/submissions/levels/${enc(submissionId)}/${action}`,
      levelProfiles: (submissionId: string | number) =>
        `/v2/admin/submissions/levels/${enc(submissionId)}/profiles`,
      levelCreatorRequests: (submissionId: string | number) =>
        `/v2/admin/submissions/levels/${enc(submissionId)}/creator-requests`,
      levelCreatorRequest: (submissionId: string | number, requestId: string | number) =>
        `/v2/admin/submissions/levels/${enc(submissionId)}/creator-requests/${enc(requestId)}`,
      levelSong: (submissionId: string | number) =>
        `/v2/admin/submissions/levels/${enc(submissionId)}/song`,
      levelSongRequests: (submissionId: string | number) =>
        `/v2/admin/submissions/levels/${enc(submissionId)}/song-requests`,
      levelArtist: (submissionId: string | number) =>
        `/v2/admin/submissions/levels/${enc(submissionId)}/artist`,
      levelArtistRequests: (submissionId: string | number) =>
        `/v2/admin/submissions/levels/${enc(submissionId)}/artist-requests`,
      levelSuffix: (submissionId: string | number) =>
        `/v2/admin/submissions/levels/${enc(submissionId)}/suffix`,
      levelCreators: (submissionId: string | number) =>
        `/v2/admin/submissions/levels/${enc(submissionId)}/creators`,
      pass: (submissionId: string | number) => `/v2/admin/submissions/passes/${enc(submissionId)}`,
      passAction: (submissionId: string | number, action: string) =>
        `/v2/admin/submissions/passes/${enc(submissionId)}/${action}`,
      passAssignPlayer: (submissionId: string | number) =>
        `/v2/admin/submissions/passes/${enc(submissionId)}/assign-player`,
    },
    curations: {
      root: () => '/v2/admin/curations',
      schedules: () => '/v2/admin/curations/schedules',
      types: () => '/v2/admin/curations/types',
      typesSortOrders: () => '/v2/admin/curations/types/sort-orders',
      typesGroupSortOrders: () => '/v2/admin/curations/types/group-sort-orders',
      byId: (id: string | number) => `/v2/admin/curations/${enc(id)}`,
      thumbnail: (id: string | number) => `/v2/admin/curations/${enc(id)}/thumbnail`,
      level: (levelId: string | number) => `/v2/admin/curations/level/${enc(levelId)}`,
      type: (id: string | number) => `/v2/admin/curations/types/${enc(id)}`,
      typeIcon: (id: string | number) => `/v2/admin/curations/types/${enc(id)}/icon`,
    },
    discord: {
      guilds: () => '/v2/admin/discord/guilds',
      guild: (guildId: string | number) => `/v2/admin/discord/guilds/${enc(guildId)}`,
      guildRoles: (guildId: string | number) => `/v2/admin/discord/guilds/${enc(guildId)}/roles`,
      guildRole: (guildId: string | number, roleId: string | number) =>
        `/v2/admin/discord/guilds/${enc(guildId)}/roles/${enc(roleId)}`,
      guildRolesReorder: (guildId: string | number) =>
        `/v2/admin/discord/guilds/${enc(guildId)}/roles/reorder`,
      syncUser: (userId: string | number) => `/v2/admin/discord/sync/user/${enc(userId)}`,
    },
  },

  database: {
    statistics: () => '/v2/database/statistics',
    references: () => '/v2/database/references',
    referencesBulk: (diffId: string | number) => `/v2/database/references/bulk/${enc(diffId)}`,
    allLevels: () => '/v2/database/levels/all-levels',
    songs: {
      root: () => '/v2/database/songs',
      byId: (id: string | number) => `/v2/database/songs/${enc(id)}`,
      merge: (id: string | number) => `/v2/database/songs/${enc(id)}/merge`,
      split: (id: string | number) => `/v2/database/songs/${enc(id)}/split`,
      credits: (id: string | number) => `/v2/database/songs/${enc(id)}/credits`,
      credit: (id: string | number, creditId: string | number) =>
        `/v2/database/songs/${enc(id)}/credits/${enc(creditId)}`,
      evidences: (id: string | number) => `/v2/database/songs/${enc(id)}/evidences`,
      evidence: (id: string | number, evidenceId: string | number) =>
        `/v2/database/songs/${enc(id)}/evidences/${enc(evidenceId)}`,
      evidencesUpload: (id: string | number) => `/v2/database/songs/${enc(id)}/evidences/upload`,
      levelsInfo: (id: string | number) => `/v2/database/songs/${enc(id)}/levels/info`,
      levelsSuffix: (id: string | number) => `/v2/database/songs/${enc(id)}/levels/suffix`,
    },
    artists: {
      root: () => '/v2/database/artists',
      byId: (id: string | number) => `/v2/database/artists/${enc(id)}`,
      merge: (id: string | number) => `/v2/database/artists/${enc(id)}/merge`,
      split: (id: string | number) => `/v2/database/artists/${enc(id)}/split`,
      relations: (id: string | number) => `/v2/database/artists/${enc(id)}/relations`,
      relation: (id: string | number, relatedArtistId: string | number) =>
        `/v2/database/artists/${enc(id)}/relations/${enc(relatedArtistId)}`,
      avatar: (id: string | number) => `/v2/database/artists/${enc(id)}/avatar`,
      evidences: (id: string | number) => `/v2/database/artists/${enc(id)}/evidences`,
      evidence: (id: string | number, evidenceId: string | number) =>
        `/v2/database/artists/${enc(id)}/evidences/${enc(evidenceId)}`,
      evidencesUpload: (id: string | number) => `/v2/database/artists/${enc(id)}/evidences/upload`,
    },
    levels: {
      root: () => '/v2/database/levels',
      byId: (id: string | number) => `/v2/database/levels/${enc(id)}`,
      byIdQuery: (id: string | number) => `/v2/database/levels/byId/${enc(id)}`,
      own: (id: string | number) => `/v2/database/levels/own/${enc(id)}`,
      packs: {
        root: () => '/v2/database/levels/packs',
        favorites: () => '/v2/database/levels/packs/favorites',
        folders: {
          root: () => '/v2/database/levels/packs/folders',
          reorder: () => '/v2/database/levels/packs/folders/reorder',
          byId: (folderId: string | number) => `/v2/database/levels/packs/folders/${enc(folderId)}`,
        },
        byId: (packId: string | number) => `/v2/database/levels/packs/${enc(packId)}`,
        cdnData: (packId: string | number) => `/v2/database/levels/packs/${enc(packId)}/cdnData`,
        tree: (packId: string | number) => `/v2/database/levels/packs/${enc(packId)}/tree`,
        items: (packId: string | number) => `/v2/database/levels/packs/${enc(packId)}/items`,
        item: (packId: string | number, itemId: string | number) =>
          `/v2/database/levels/packs/${enc(packId)}/items/${enc(itemId)}`,
        downloadLink: (packId: string | number) =>
          `/v2/database/levels/packs/${enc(packId)}/download-link`,
        levels: (packId: string | number) => `/v2/database/levels/packs/${enc(packId)}/levels`,
        level: (packId: string | number, levelId: string | number) =>
          `/v2/database/levels/packs/${enc(packId)}/levels/${enc(levelId)}`,
        levelsReorder: (packId: string | number) =>
          `/v2/database/levels/packs/${enc(packId)}/levels/reorder`,
        favorite: (packId: string | number) => `/v2/database/levels/packs/${enc(packId)}/favorite`,
        icon: (packId: string | number) => `/v2/database/levels/packs/${enc(packId)}/icon`,
        transferOwnership: (packId: string | number) =>
          `/v2/database/levels/packs/${enc(packId)}/transfer-ownership`,
        usersSearch: (query: string) =>
          `/v2/database/levels/packs/users/search/${enc(query)}`,
      },
      unannouncedNew: () => '/v2/database/levels/unannounced/new',
      unannouncedRerates: () => '/v2/database/levels/unannounced/rerates',
      aliases: (levelId: string | number) => `/v2/database/levels/${enc(levelId)}/aliases`,
      alias: (levelId: string | number, aliasId: string | number) =>
        `/v2/database/levels/${enc(levelId)}/aliases/${enc(aliasId)}`,
      aliasPropagationCount: (levelId: string | number) =>
        `/v2/database/levels/alias-propagation-count/${enc(levelId)}`,
      isLiked: (id: string | number) => `/v2/database/levels/${enc(id)}/isLiked`,
      cdnData: (id: string | number) => `/v2/database/levels/${enc(id)}/cdnData`,
      ratings: (id: string | number) => `/v2/database/levels/${enc(id)}/ratings`,
      timeout: (id: string | number) => `/v2/database/levels/${enc(id)}/timeout`,
      like: (id: string | number) => `/v2/database/levels/${enc(id)}/like`,
      difficulty: (id: string | number) => `/v2/database/levels/${enc(id)}/difficulty`,
      toggleHidden: (id: string | number) => `/v2/database/levels/${enc(id)}/toggle-hidden`,
      restore: (id: string | number) => `/v2/database/levels/${enc(id)}/restore`,
      permanent: (id: string | number) => `/v2/database/levels/${enc(id)}/permanent`,
      refreshTags: (id: string | number) => `/v2/database/levels/${enc(id)}/refresh-tags`,
      chartStats: (id: string | number) => `/v2/database/levels/${enc(id)}/chart-stats`,
      xaccCurve: (id: string | number) => `/v2/database/levels/${enc(id)}/xacc-curve`,
      cdnZipMetadata: (fileId: string) => `/v2/database/levels/cdn-zip-metadata/${enc(fileId)}`,
    },
    passes: {
      root: () => '/v2/database/passes',
      byId: (id: string | number) => `/v2/database/passes/byId/${enc(id)}`,
      byIdPath: (id: string | number) => `/v2/database/passes/${enc(id)}`,
      level: (levelId: string | number) => `/v2/database/passes/level/${enc(levelId)}`,
      unannouncedNew: () => '/v2/database/passes/unannounced/new',
      feelingRating: (id: string | number) => `/v2/database/passes/${enc(id)}/feeling-rating`,
      toggleHidden: (id: string | number) => `/v2/database/passes/${enc(id)}/toggle-hidden`,
      restore: (id: string | number) => `/v2/database/passes/${enc(id)}/restore`,
    },
    players: {
      root: () => '/v2/database/players',
      create: () => '/v2/database/players/create',
      byId: (id: string | number) => `/v2/database/players/${enc(id)}`,
      modifiers: (playerId: string | number) => `/v2/database/players/${enc(playerId)}/modifiers`,
      modifiersGenerate: () => '/v2/database/players/modifiers/generate',
      merge: (playerId: string | number) => `/v2/database/players/${enc(playerId)}/merge`,
      name: (playerId: string | number) => `/v2/database/players/${enc(playerId)}/name`,
      country: (playerId: string | number) => `/v2/database/players/${enc(playerId)}/country`,
      aliases: (playerId: string | number) => `/v2/database/players/${enc(playerId)}/aliases`,
      ban: (playerId: string | number) => `/v2/database/players/${enc(playerId)}/ban`,
      pauseSubmissions: (playerId: string | number) =>
        `/v2/database/players/${enc(playerId)}/pause-submissions`,
    },
    creators: {
      root: () => '/v2/database/creators',
      search: (query: string) => `/v2/database/creators/search/${enc(query)}`,
      byId: (id: string | number) => `/v2/database/creators/byId/${enc(id)}`,
      pathById: (id: string | number) => `/v2/database/creators/${enc(id)}`,
      merge: () => '/v2/database/creators/merge',
      split: () => '/v2/database/creators/split',
      levelsAudit: () => '/v2/database/creators/levels-audit',
      assignCreatorToUser: (userOrPlayerId: string | number, creatorId: string | number) =>
        `/v2/database/creators/assign-creator-to-user/${enc(userOrPlayerId)}/${enc(creatorId)}`,
      removeCreatorFromUser: (userId: string | number) =>
        `/v2/database/creators/remove-creator-from-user/${enc(userId)}`,
      discord: (creatorId: string | number, discordId: string | number) =>
        `/v2/database/creators/${enc(creatorId)}/discord/${enc(discordId)}`,
      level: (levelId: string | number) => `/v2/database/creators/level/${enc(levelId)}`,
      levelTeam: (levelId: string | number) => `/v2/database/creators/level/${enc(levelId)}/team`,
      teams: {
        root: () => '/v2/database/creators/teams',
        search: (query: string) => `/v2/database/creators/teams/search/${enc(query)}`,
        byId: (id: string | number) => `/v2/database/creators/teams/byId/${enc(id)}`,
        pathById: (id: string | number) => `/v2/database/creators/teams/${enc(id)}`,
      },
    },
    difficulties: {
      root: () => '/v2/database/difficulties',
      hash: () => '/v2/database/difficulties/hash',
      tags: () => '/v2/database/difficulties/tags',
      tag: (tagId: string | number) => `/v2/database/difficulties/tags/${enc(tagId)}`,
      sortOrders: () => '/v2/database/difficulties/sort-orders',
      tagsSortOrders: () => '/v2/database/difficulties/tags/sort-orders',
      tagsGroupSortOrders: () => '/v2/database/difficulties/tags/group-sort-orders',
      roles: () => '/v2/database/difficulties/roles',
      role: (roleId: string | number) => `/v2/database/difficulties/roles/${enc(roleId)}`,
      channels: () => '/v2/database/difficulties/channels',
      channel: (channelId: string | number) => `/v2/database/difficulties/channels/${enc(channelId)}`,
      byId: (id: string | number) => `/v2/database/difficulties/${enc(id)}`,
      directives: (id: string | number) => `/v2/database/difficulties/${enc(id)}/directives`,
      levelTags: (levelId: string | number) => `/v2/database/difficulties/levels/${enc(levelId)}/tags`,
    },
  },

  playersV3: {
    root: () => '/v3/players',
    search: () => '/v3/players/search',
    profile: (playerId: string | number) => `/v3/players/${enc(playerId)}/profile`,
    passes: (playerId: string | number) => `/v3/players/${enc(playerId)}/passes`,
    rankHistory: (playerId: string | number) => `/v3/players/${enc(playerId)}/rank-history`,
    leaderboard: () => '/v3/players/leaderboard',
    meBio: () => '/v3/players/me/bio',
    meBioCanvas: () => '/v3/players/me/bio-canvas',
    meBioCanvasImage: () => '/v3/players/me/bio-canvas/image',
    meTufStellarIconVariant: () => '/v3/players/me/tuf-stellar-icon-variant',
  },

  levelsV3: {
    upload: (levelId: string | number) => `/v3/levels/${enc(levelId)}/upload`,
    uploadFromUrl: (levelId: string | number) => `/v3/levels/${enc(levelId)}/upload-from-url`,
    selectLevel: (levelId: string | number) => `/v3/levels/${enc(levelId)}/select-level`,
  },

  billingV3: {
    me: () => '/v3/billing/me',
    meEvents: () => '/v3/billing/me/events',
    recipientSearch: () => '/v3/billing/recipient-search',
    stripe: {
      checkout: () => '/v3/billing/stripe/checkout',
      checkoutStatus: () => '/v3/billing/stripe/checkout-status',
      refundPreview: () => '/v3/billing/stripe/refund-preview',
      refund: () => '/v3/billing/stripe/refund',
    },
  },

  creatorsV3: {
    root: () => '/v3/creators',
    profile: (creatorId: string | number) => `/v3/creators/${enc(creatorId)}/profile`,
    leaderboard: () => '/v3/creators/leaderboard',
    managedUpdate: (creatorId: string | number) => `/v3/creators/${enc(creatorId)}/managed-update`,
    displayCurationTypes: (creatorId: string | number) =>
      `/v3/creators/${enc(creatorId)}/display-curation-types`,
    meName: () => '/v3/creators/me/name',
    meAliases: () => '/v3/creators/me/aliases',
    meBio: () => '/v3/creators/me/bio',
    meUploadConditions: () => '/v3/creators/me/upload-conditions',
    meVerificationStatus: () => '/v3/creators/me/verification-status',
    tufStellarIconVariant: (creatorId: string | number) =>
      `/v3/creators/${enc(creatorId)}/tuf-stellar-icon-variant`,
    bannerPreset: (creatorId: string | number) => `/v3/creators/${enc(creatorId)}/banner-preset`,
    bannerCustom: (creatorId: string | number) => `/v3/creators/${enc(creatorId)}/banner-custom`,
    headerSurfaceStyle: (creatorId: string | number) =>
      `/v3/creators/${enc(creatorId)}/header-surface-style`,
    headerSurfaceImage: (creatorId: string | number) =>
      `/v3/creators/${enc(creatorId)}/header-surface-image`,
  },

  media: {
    videoDetails: (url: string) => `/v2/media/video-details/${enc(url)}`,
    wheelImage: (seed: string | number) => `/v2/media/wheel-image/${seed}`,
  },

  webhook: {
    root: () => '/v2/webhook',
    levels: () => '/v2/webhook/levels',
    rerates: () => '/v2/webhook/rerates',
    passes: () => '/v2/webhook/passes',
    silentRemoveLevels: () => '/v2/webhook/silent-remove/levels',
    silentRemoveRerates: () => '/v2/webhook/silent-remove/rerates',
    silentRemovePasses: () => '/v2/webhook/silent-remove/passes',
  },

  events: () => '/v2/events',
  health: {
    latency: () => '/v2/health/latency',
  },
  upload: {
    root: () => '/v2/upload',
    init: () => '/v2/upload/init',
    session: (sessionId: string) => `/v2/upload/sessions/${enc(sessionId)}`,
    sessionComplete: (sessionId: string) => `/v2/upload/sessions/${enc(sessionId)}/complete`,
    sessionChunk: (sessionId: string, index: number) =>
      `/v2/upload/sessions/${enc(sessionId)}/chunks/${index}`,
  },
  jobs: {
    byId: (jobId: string) => `/v2/jobs/${enc(jobId)}`,
    stream: (jobId: string) => `/v2/jobs/${enc(jobId)}/stream`,
  },
  external: {
    autorate: (ratingId: string | number) => `/v2/external/autorate/${enc(ratingId)}`,
  },
  utils: {
    languages: () => '/v2/utils/languages',
  },
  form: {
    pass: {
      root: () => '/v2/form/pass',
      submit: () => '/v2/form/pass/submit',
    },
    level: {
      root: () => '/v2/form/level',
      validate: () => '/v2/form/level/validate',
      submit: () => '/v2/form/level/submit',
      selectLevel: () => '/v2/form/level/select-level',
    },
  },
};
