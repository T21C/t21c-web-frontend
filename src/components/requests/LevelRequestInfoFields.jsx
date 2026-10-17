import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SongSelectorPopup } from '@/components/popups/Songs';
import { ArtistSelectorPopup } from '@/components/popups/Artists';
import { LevelCreditsEditPopup } from '@/components/popups/Creators';
import {
  creditRequestDiff,
  creditsFromLevel,
  teamFromLevel,
} from './levelRequestShared';

const TEXT_KINDS = new Set(['video', 'download', 'description', 'multiple']);

const creditLabel = (credit, t) => {
  const role = t(`levelRequests.creditRoles.${credit.role}`, { defaultValue: credit.role });
  return credit.isOwner
    ? `${credit.name} · ${role} · ${t('levelRequests.form.owner')}`
    : `${credit.name} · ${role}`;
};

export const LevelRequestCreditDiff = ({ level, credits, team }) => {
  const { t } = useTranslation('pages');
  const diff = creditRequestDiff(creditsFromLevel(level), credits, teamFromLevel(level), team);
  const rows = [
    { key: 'add', label: t('levelRequests.form.toAdd'), items: diff.add },
    {
      key: 'change',
      label: t('levelRequests.form.toChange'),
      items: diff.change,
      team: diff.teamChanged ? diff : null,
    },
    { key: 'remove', label: t('levelRequests.form.toRemove'), items: diff.remove },
  ];

  return (
    <div className="level-requests__tag-diff">
      {rows.map((row) => {
        const teamLabel = row.team
          ? `${t('levelRequests.detail.team')}: ${row.team.currentTeam?.name || t('levelRequests.form.tagsNone')} → ${row.team.targetTeam?.name || t('levelRequests.form.tagsNone')}`
          : '';
        const lines = [
          teamLabel,
          ...row.items.map((credit) => creditLabel(credit, t)),
        ].filter(Boolean);
        return (
          <div key={row.key} className="level-requests__tag-diff-row">
            <span className="level-requests__tag-diff-label">{row.label}</span>
            {lines.length > 0 && (
              <span className="level-requests__change-values">{lines.join(', ')}</span>
            )}
            {lines.length === 0 && (
              <span className="level-requests__hint">{t('levelRequests.form.tagsNone')}</span>
            )}
          </div>
        );
      })}
    </div>
  );
};

const LevelRequestInfoFields = ({
  kind,
  level,
  songId,
  songName,
  onSong,
  artistId,
  artistName,
  onArtist,
  value,
  onValue,
  team,
  credits,
  onCredits,
}) => {
  const { t } = useTranslation('pages');
  const [songOpen, setSongOpen] = useState(false);
  const [artistOpen, setArtistOpen] = useState(false);
  const [creditsOpen, setCreditsOpen] = useState(false);
  const creditsLevel = level
    ? {
        ...level,
        song: level.songObject?.name || level.song || '',
        team: teamFromLevel(level),
      }
    : null;

  return (
    <>
      {(kind === 'song' || kind === 'artist') && (
        <div className="level-requests__field">
          <span>{t('levelRequests.form.changeTo')}</span>
          {kind === 'song' && (
            <div className="level-requests__picker-field" onClick={() => setSongOpen(true)}>
              <input
                type="text"
                readOnly
                value={songName}
                placeholder={t('levelRequests.form.selectSong')}
              />
            </div>
          )}
          {kind === 'artist' && (
            <div className="level-requests__picker-field" onClick={() => setArtistOpen(true)}>
              <input
                type="text"
                readOnly
                value={artistName}
                placeholder={t('levelRequests.form.selectArtist')}
              />
            </div>
          )}
        </div>
      )}
      {kind === 'credits' && (
        <div className="level-requests__field">
          <button
            type="button"
            className="level-requests__button"
            onClick={() => setCreditsOpen(true)}
            disabled={!creditsLevel}
          >
            {t('levelRequests.form.manageCreators')}
          </button>
          <LevelRequestCreditDiff level={level} credits={credits} team={team} />
        </div>
      )}
      {TEXT_KINDS.has(kind) && (
        <label className="level-requests__field">
          <span>{t('levelRequests.form.changeTo')}</span>
          {kind === 'description' || kind === 'multiple' ? (
            <textarea
              value={value}
              maxLength={4000}
              onChange={(event) => onValue(event.target.value)}
            />
          ) : (
            <input
              type="text"
              value={value}
              maxLength={4000}
              onChange={(event) => onValue(event.target.value)}
            />
          )}
        </label>
      )}
      {songOpen && (
        <SongSelectorPopup
          onClose={() => setSongOpen(false)}
          onSelect={(song) => {
            if (song?.isNewRequest || !song?.songId) return;
            onSong({ songId: song.songId, songName: song.songName || '' });
          }}
          initialSong={songId ? { id: songId, name: songName } : null}
          selectedArtist={null}
          allowCreate={false}
        />
      )}
      {artistOpen && (
        <ArtistSelectorPopup
          onClose={() => setArtistOpen(false)}
          onSelect={(artist) => {
            if (artist?.isNewRequest || !artist?.artistId) return;
            onArtist({ artistId: artist.artistId, artistName: artist.artistName || '' });
          }}
          initialArtist={artistId ? { id: artistId, name: artistName } : null}
          allowCreate={false}
        />
      )}
      {creditsOpen && creditsLevel && (
        <LevelCreditsEditPopup
          level={{
            ...creditsLevel,
            levelCredits: (credits || []).map((credit) => ({
              creatorId: credit.creatorId,
              creator: { id: credit.creatorId, name: credit.name },
              name: credit.name,
              role: credit.role,
              isOwner: credit.isOwner,
              sortOrder: credit.sortOrder,
            })),
            team,
          }}
          onClose={() => setCreditsOpen(false)}
          onDraftSave={(draft) => {
            onCredits(draft);
            setCreditsOpen(false);
          }}
        />
      )}
    </>
  );
};

export default LevelRequestInfoFields;
