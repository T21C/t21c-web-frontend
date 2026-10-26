// tuf-search: #YoutubeVideoPicker #youtubeVideoPicker
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import i18next from 'i18next';
import toast from 'react-hot-toast';
import { routes } from '@/api/routes';
import api from '@/utils/api';
import { useAuth } from '@/contexts/AuthContext';
import { CustomSelect } from '@/components/common/selectors';
import { LinkIcon } from '@/components/common/icons/LinkIcon';
import { ChevronIcon } from '@/components/common/icons';
import { Tooltip } from '@/components/common/display/Tooltip';
import {
  isYoutubeChannelLinkingEnabledForUser,
  sortYoutubeChannels,
} from '@/utils/youtubeChannel';
import { formatDateShort } from '@/utils/Utility';
import MarqueeText from '@/components/common/display/MarqueeText/MarqueeText';
import './YoutubeVideoPicker.css';

function titleMatches(title, query) {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return String(title || '').toLowerCase().includes(needle);
}

function YoutubeVideoPickerPanel({ channels, onSelectUrl, children }) {
  const { t } = useTranslation('common');
  const primary = channels.find((channel) => channel.isPrimary) || channels[0];
  const [channelId, setChannelId] = useState(primary.channelId);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [videos, setVideos] = useState([]);
  const [nextPageToken, setNextPageToken] = useState(null);
  const [canReadUnlisted, setCanReadUnlisted] = useState(Boolean(primary.canReadUnlisted));
  const [loading, setLoading] = useState(false);
  const requestSeq = useRef(0);
  const autoQuery = useRef('');
  const channelIdRef = useRef(channelId);
  const channelsRef = useRef(channels);
  const stateRef = useRef({});
  channelIdRef.current = channelId;
  channelsRef.current = channels;
  stateRef.current = { videos, nextPageToken, loading, channelId };

  const loadRef = useRef(async () => {});
  loadRef.current = async ({ pageToken, query: searchQuery, replace }) => {
    const requestedChannel = channelIdRef.current;
    const seq = ++requestSeq.current;
    setLoading(true);
    try {
      const response = await api.get(routes.auth.youtubeChannels.videos(requestedChannel, {
        q: searchQuery || undefined,
        pageToken: pageToken || undefined,
      }));
      if (seq !== requestSeq.current || requestedChannel !== channelIdRef.current) return;
      const body = response.data ?? {};
      const nextVideos = Array.isArray(body.videos) ? body.videos : [];
      setVideos((prev) => {
        if (replace) return nextVideos;
        const seen = new Set(prev.map((video) => video.videoId));
        return [...prev, ...nextVideos.filter((video) => video.videoId && !seen.has(video.videoId))];
      });
      setNextPageToken(body.nextPageToken || null);
      setCanReadUnlisted(Boolean(body.canReadUnlisted));
    } catch {
      if (seq !== requestSeq.current) return;
      toast.error(t('youtubePicker.loadFailed'));
    } finally {
      if (seq === requestSeq.current) setLoading(false);
    }
  };

  useEffect(() => {
    setVideos([]);
    setNextPageToken(null);
    setQuery('');
    autoQuery.current = '';
    const channel = channelsRef.current.find((item) => item.channelId === channelId);
    setCanReadUnlisted(Boolean(channel?.canReadUnlisted));
  }, [channelId]);

  useEffect(() => {
    if (!open) return undefined;
    void loadRef.current({ pageToken: null, query: '', replace: true });
    return undefined;
  }, [open, channelId]);

  useEffect(() => {
    if (!open) return undefined;
    const searchQuery = query.trim();
    if (!searchQuery) return undefined;
    const handle = window.setTimeout(() => {
      const state = stateRef.current;
      if (state.loading || !state.nextPageToken) return;
      if (state.videos.some((video) => titleMatches(video.title, searchQuery))) return;
      const mark = `${state.channelId}:${searchQuery}`;
      if (autoQuery.current === mark) return;
      autoQuery.current = mark;
      void loadRef.current({
        pageToken: state.nextPageToken,
        query: searchQuery,
        replace: false,
      });
    }, 300);
    return () => window.clearTimeout(handle);
  }, [query, open, channelId, loading, videos, nextPageToken]);

  const visible = useMemo(
    () => videos.filter((video) => titleMatches(video.title, query)),
    [videos, query],
  );

  const channelOptions = channels.map((channel) => ({
    value: channel.channelId,
    label: channel.handle
      ? `@${channel.handle.replace(/^@/, '')}`
      : (channel.title || channel.channelId),
  }));
  const selectedOption = channelOptions.find((option) => option.value === channelId) || channelOptions[0];

  const openPanel = () => {
    setQuery('');
    autoQuery.current = '';
    setOpen(true);
  };

  return (
    <div className="youtube-video-picker">
      <div className="youtube-video-picker__bar">
        <div className="youtube-video-picker__status">{children}</div>
        <button
          type="button"
          className="btn-fill-ghost btn-sm youtube-video-picker__toggle"
          onClick={() => (open ? setOpen(false) : openPanel())}
        >
          {open ? t('youtubePicker.hideVideos') : t('youtubePicker.yourVideos')}
          <ChevronIcon direction={open ? 'up' : 'down'} size={14} color="currentColor" />
        </button>
      </div>
      {open && (
        <div className="youtube-video-picker__panel">
          {channels.length > 1 && (
            <CustomSelect
              label={t('youtubePicker.yourVideos')}
              options={channelOptions}
              value={selectedOption}
              onChange={(option) => {
                if (option?.value && option.value !== channelId) setChannelId(option.value);
              }}
              width="100%"
            />
          )}
          <input
            type="search"
            className="youtube-video-picker__search"
            placeholder={t('youtubePicker.searchPlaceholder')}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') event.preventDefault();
            }}
            autoComplete="off"
          />
          {loading && visible.length === 0 && (
            <p className="youtube-video-picker__loading">{t('loading.searching')}</p>
          )}
          {!loading && visible.length === 0 && (
            <p className="youtube-video-picker__empty">{t('youtubePicker.empty')}</p>
          )}
          {visible.length > 0 && (
            <ul className="youtube-video-picker__results">
              {visible.map((video) => (
                <li key={video.videoId}>
                  <button
                    type="button"
                    className="youtube-video-picker__result"
                    onClick={() => {
                      onSelectUrl(video.url);
                      setOpen(false);
                    }}
                  >
                    {video.thumbnailUrl && (
                      <img
                        className="youtube-video-picker__thumb"
                        src={video.thumbnailUrl}
                        alt=""
                      />
                    )}
                    <span className="youtube-video-picker__meta">
                      <MarqueeText className="youtube-video-picker__title">{video.title}</MarqueeText>
                      {(video.publishedAt || video.privacyStatus === 'unlisted') && (
                        <span className="youtube-video-picker__sub">
                          {video.publishedAt && (
                            <span>{formatDateShort(video.publishedAt, i18next.language)}</span>
                          )}
                          {video.privacyStatus === 'unlisted' && (
                            <span
                              className="youtube-video-picker__unlisted"
                              data-tooltip-id="youtube-picker-unlisted"
                              data-tooltip-content={t('youtubePicker.unlisted')}
                              aria-label={t('youtubePicker.unlisted')}
                            >
                              <LinkIcon size={14} color="currentColor" />
                            </span>
                          )}
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <Tooltip id="youtube-picker-unlisted" place="top" />
          {nextPageToken && (
            <button
              type="button"
              className="btn-fill-ghost btn-sm youtube-video-picker__older"
              disabled={loading}
              onClick={() => {
                void loadRef.current({
                  pageToken: nextPageToken,
                  query: query.trim(),
                  replace: false,
                });
              }}
            >
              {t('youtubePicker.loadOlder')}
            </button>
          )}
          {!canReadUnlisted && (
            <p className="youtube-video-picker__note">
              {t('youtubePicker.unlistedNote')}{' '}
              <Link className="youtube-video-picker__settings-link" to="/settings/security">
                {t('youtubePicker.allowAccess')}
              </Link>
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export function YoutubeVideoPicker({ onSelectUrl, children }) {
  const { user } = useAuth();
  const { t } = useTranslation('common');
  if (!isYoutubeChannelLinkingEnabledForUser(user)) return children;

  const channels = sortYoutubeChannels(user?.youtubeChannels);
  if (channels.length === 0) {
    return (
      <div className="youtube-video-picker">
        <div className="youtube-video-picker__bar">
          <div className="youtube-video-picker__status">{children}</div>
          <Link className="youtube-video-picker__settings-link" to="/settings/security">
            {t('youtubePicker.linkChannel')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <YoutubeVideoPickerPanel channels={channels} onSelectUrl={onSelectUrl}>
      {children}
    </YoutubeVideoPickerPanel>
  );
}
