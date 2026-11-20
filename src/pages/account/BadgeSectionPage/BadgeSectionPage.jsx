import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import api from '@/utils/api';
import { routes } from '@/api/routes';
import { MetaTags } from '@/components/common/display';
import { CustomSelect } from '@/components/common/selectors';
import { buildStaticPageMeta } from '@/utils/meta';
import './badgeSectionPage.css';

const SLOT_COUNT = 5;

const OPEN_STEP = 10000;

function formatBadgeAmount(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return '';
  const rounded = Math.round(amount * 100) / 100;
  if (Math.abs(rounded) < 1e-9) return '0';
  if (Math.abs(rounded - Math.round(rounded)) < 1e-9) return String(Math.round(rounded));
  return String(rounded);
}

function openEnded(bar) {
  if (!bar) return false;
  return Math.abs(Number(bar.to) - Number(bar.from)) >= OPEN_STEP;
}

function barPercent(bar, earned) {
  if (!bar) return 0;
  const from = Number(bar.from);
  const to = Number(bar.to);
  if (openEnded(bar)) return earned ? 100 : 0;
  if (from === to) return earned ? 100 : 0;
  const ratio = (Number(bar.value) - from) / (to - from);
  return Math.max(0, Math.min(100, ratio * 100));
}

function unitWord(unit, credit, t) {
  if (!unit || unit === 'id') return '';
  const one = Math.abs(Math.abs(Number(credit)) - 1) < 1e-9;
  const key = one ? unit.replace(/s$/, '') : unit;
  const fallback = {
    day: 'day',
    days: 'days',
    key: 'key',
    keys: 'keys',
    perfect: 'perfect',
    perfects: 'perfects',
  };
  return t(`badges.units.${key}`, { defaultValue: fallback[key] || key });
}

function rarityRank(badge) {
  const label = String(badge.tierLabel || '').trim().toLowerCase();
  if (label === 'legendary') return 3;
  if (label === 'common') return 1;
  return label ? 2 : 0;
}

function compareBadges(left, right) {
  const byRarity = rarityRank(right) - rarityRank(left);
  if (byRarity) return byRarity;
  const byTier = (Number(right.tier) || 0) - (Number(left.tier) || 0);
  if (byTier) return byTier;
  const byPercent = barPercent(right.bar, right.earned) - barPercent(left.bar, left.earned);
  if (byPercent) return byPercent;
  return String(left.name || '').localeCompare(String(right.name || ''));
}

function badgeCreditText(badge, t) {
  if (badge.credit == null) return '';
  const stat = badge.stat || 'barThenNumber';
  if (stat === 'tier' || stat === 'bar') return '';
  const credit = formatBadgeAmount(badge.credit);
  if (credit === '' || credit === '0') return '';
  if (badge.unit === 'id') {
    return t('badges.creditChart', { credit, defaultValue: 'Chart {{credit}}' });
  }
  const unit = unitWord(badge.unit, badge.credit, t);
  const collapsed = badge.bar && Number(badge.bar.from) === Number(badge.bar.to);
  const showNext = badge.nextRequirement != null && !openEnded(badge.bar) && !collapsed;
  if (!showNext) {
    return unit
      ? t('badges.creditUnit', { credit, unit, defaultValue: '{{credit}} {{unit}}' })
      : credit;
  }
  const next = formatBadgeAmount(badge.nextRequirement);
  return unit
    ? t('badges.creditNextUnit', { credit, next, unit, defaultValue: '{{credit}} / {{next}} {{unit}}' })
    : t('badges.credit', { credit, next });
}

function BadgeMark({ badge }) {
  if (badge?.icon && /^https?:\/\//.test(badge.icon)) {
    return <img className="badge-section__icon" src={badge.icon} alt="" />;
  }
  return <span className="badge-section__glyph">{badge?.icon || '🏅'}</span>;
}

const BadgeSectionPage = ({ audience }) => {
  const { t } = useTranslation('pages');
  const location = useLocation();
  const params = useParams();
  const ownerId = audience === 'creator' ? params.creatorId : params.playerId;
  const [payload, setPayload] = useState(null);
  const [slots, setSlots] = useState([]);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [tone, setTone] = useState('all');

  const pageMeta = useMemo(
    () => buildStaticPageMeta({
      title: t('badges.meta.title'),
      description: t('badges.meta.description'),
      pathname: location.pathname,
      noindex: true,
    }),
    [t, location.pathname],
  );

  const load = useCallback(async () => {
    if (!ownerId) return;
    try {
      const route = audience === 'creator'
        ? routes.badgesV3.creator(ownerId)
        : routes.badgesV3.player(ownerId);
      const res = await api.get(route);
      setPayload(res.data);
      setSlots(res.data?.equippedIds ?? []);
    } catch {
      toast.error(t('badges.loadFailed'));
    }
  }, [audience, ownerId, t]);

  useEffect(() => {
    load();
  }, [load]);

  const badges = payload?.badges ?? [];
  const byId = useMemo(() => new Map(badges.map((badge) => [badge.id, badge])), [badges]);
  const statusOptions = useMemo(() => [
    { value: 'all', label: t('badges.statusAll') },
    { value: 'earned', label: t('badges.statusEarned') },
    { value: 'locked', label: t('badges.statusLocked') },
    { value: 'equipped', label: t('badges.statusEquipped') },
  ], [t]);
  const toneOptions = useMemo(() => [
    { value: 'all', label: t('badges.toneAll') },
    { value: 'purple', label: t('badges.tonePurple') },
    { value: 'plain', label: t('badges.tonePlain') },
  ], [t]);
  const visibleBadges = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return badges.filter((badge) => {
      if (needle && !String(badge.name || '').toLowerCase().includes(needle)) return false;
      if (status === 'earned' && !badge.earned) return false;
      if (status === 'locked' && badge.earned) return false;
      if (status === 'equipped' && !slots.includes(badge.id)) return false;
      if (tone === 'purple' && !badge.purple) return false;
      if (tone === 'plain' && badge.purple) return false;
      return true;
    }).sort(compareBadges);
  }, [badges, query, status, tone, slots]);

  const toggle = (badge) => {
    if (!payload?.canEquip || !badge.earned) return;
    setSlots((current) => {
      if (current.includes(badge.id)) return current.filter((id) => id !== badge.id);
      if (current.length >= SLOT_COUNT) return current;
      return [...current, badge.id];
    });
  };

  const move = (index, delta) => {
    setSlots((current) => {
      const next = [...current];
      const target = index + delta;
      if (target < 0 || target >= next.length) return current;
      const [item] = next.splice(index, 1);
      next.splice(target, 0, item);
      return next;
    });
  };

  const save = async () => {
    try {
      const route = audience === 'creator'
        ? routes.badgesV3.equipCreator(ownerId)
        : routes.badgesV3.equipPlayer(ownerId);
      const res = await api.put(route, { badgeIds: slots });
      setPayload(res.data);
      setSlots(res.data?.equippedIds ?? []);
      toast.success(t('badges.saved'));
    } catch {
      toast.error(t('badges.saveFailed'));
    }
  };

  return (
    <main className="badge-section">
      <MetaTags {...pageMeta} />
      <h1>{t('badges.title')}</h1>
      <div className="badge-section__slots">
        {Array.from({ length: SLOT_COUNT }, (_, index) => {
          const badge = byId.get(slots[index]);
          return (
            <div key={index} className={`badge-section__slot${badge?.purple ? ' badge-section__slot--purple' : ''}`}>
              {badge ? (
                <>
                  <BadgeMark badge={badge} />
                  <span>{badge.name}</span>
                  {badge.tierLabel && <span className="badge-section__label">{badge.tierLabel}</span>}
                  {payload?.canEquip && (
                    <span className="badge-section__slot-actions">
                      <button type="button" onClick={() => move(index, -1)} aria-label="Move left">←</button>
                      <button type="button" onClick={() => move(index, 1)} aria-label="Move right">→</button>
                      <button type="button" onClick={() => toggle(badge)} aria-label="Remove">×</button>
                    </span>
                  )}
                </>
              ) : (
                <span className="badge-section__empty">—</span>
              )}
            </div>
          );
        })}
      </div>
      {payload?.canEquip && (
        <button type="button" className="badge-section__save" onClick={save}>{t('badges.saveEquip')}</button>
      )}
      {badges.length > 0 && (
        <div className="badge-section__filters">
          <label className="badge-section__search">
            <span>{t('badges.search')}</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t('badges.searchPlaceholder')}
              aria-label={t('badges.search')}
            />
          </label>
          <CustomSelect
            label={t('badges.status')}
            options={statusOptions}
            value={statusOptions.find((option) => option.value === status) ?? statusOptions[0]}
            onChange={(option) => setStatus(option?.value || 'all')}
            width="12rem"
            isSearchable={false}
          />
          <CustomSelect
            label={t('badges.tone')}
            options={toneOptions}
            value={toneOptions.find((option) => option.value === tone) ?? toneOptions[0]}
            onChange={(option) => setTone(option?.value || 'all')}
            width="12rem"
            isSearchable={false}
          />
          <p className="badge-section__count">{t('badges.showing', { count: visibleBadges.length, total: badges.length })}</p>
        </div>
      )}
      <div className="badge-section__grid">
        {badges.length === 0 && <p>{t('badges.empty')}</p>}
        {badges.length > 0 && visibleBadges.length === 0 && <p>{t('badges.noMatches')}</p>}
        {visibleBadges.map((badge) => {
          const creditText = badgeCreditText(badge, t);
          const stat = badge.stat || 'barThenNumber';
          const showBar = badge.bar && stat !== 'tier' && (barPercent(badge.bar, badge.earned) > 0 || creditText);
          const confirms = (badge.confirm || []).filter((row) => row.accuracyText || row.judgementText);
          return (
          <article
            key={badge.id}
            className={[
              'badge-section__card',
              badge.earned && 'badge-section__card--earned',
              badge.purple && 'badge-section__card--purple',
              slots.includes(badge.id) && 'badge-section__card--slotted',
            ].filter(Boolean).join(' ')}
          >
            <button
              type="button"
              className="badge-section__card-main"
              onClick={() => toggle(badge)}
              disabled={!payload?.canEquip || !badge.earned}
            >
              <BadgeMark badge={badge} />
              <span className="badge-section__name">{badge.name}</span>
              {badge.earned && badge.tier > 0 && <span>{t('badges.tier', { tier: badge.tier })}</span>}
              {badge.tierLabel && <span className="badge-section__label">{badge.tierLabel}</span>}
              {!badge.earned && <span>{t('badges.locked')}</span>}
            </button>
            {showBar && (
              <div className="badge-section__bar" aria-hidden="true">
                <span style={{ width: `${barPercent(badge.bar, badge.earned)}%` }} />
              </div>
            )}
            {creditText && (
              <p className="badge-section__credit">{creditText}</p>
            )}
            {confirms.length > 0 && (
              <div className="badge-section__confirms">
                {confirms.map((row) => (
                  <p key={row.passId} className="badge-section__confirm">
                    {row.accuracyText && t('badges.confirmAccuracy', { value: row.accuracyText })}
                    {row.judgementText && ` ${t('badges.confirmJudgements', { value: row.judgementText })}`}
                  </p>
                ))}
              </div>
            )}
          </article>
          );
        })}
      </div>
    </main>
  );
};

export default BadgeSectionPage;
