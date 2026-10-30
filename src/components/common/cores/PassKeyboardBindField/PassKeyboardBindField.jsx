// tuf-search: #PassKeyboardBindField #passKeyboardBindField #cores #keyboard
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '@/utils/api';
import { routes } from '@/api/routes';
import { CustomSelect } from '@/components/common/selectors';
import { formatPassDate } from '@/utils/Utility';
import { formatKeybind, periodCoversDate } from '@/utils/keyboards/keys';
import './passkeyboardbindfield.css';

const PASS_UPLOAD_SENTINELS = new Set([
  '2023-07-27T07:27:27.000Z',
  '2023-01-01T07:27:27.000Z',
]);

function uploadDay(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const iso = date.toISOString();
  if (PASS_UPLOAD_SENTINELS.has(iso)) return null;
  return iso.slice(0, 10);
}

function formatBindDate(isoDate, language) {
  if (!isoDate) return '';
  return formatPassDate(`${String(isoDate).slice(0, 10)}T12:00:00.000Z`, language);
}

function layoutTitle(layout) {
  const count = `${layout.keyCount}K`;
  const lane = layout.laneName && layout.laneName !== count ? layout.laneName : '';
  return [count, lane, layout.rigName].filter(Boolean).join(' · ');
}

function collectLayouts(rigs) {
  const layouts = [];
  for (const rig of rigs || []) {
    const rigName = typeof rig.name === 'string' ? rig.name.trim() : '';
    for (const lane of rig.lanes || []) {
      const laneName = typeof lane.name === 'string' ? lane.name.trim() : '';
      for (const period of lane.periods || []) {
        if (period.isGap || !Array.isArray(period.keys) || !period.keys.length) continue;
        layouts.push({
          id: String(period.id),
          rigId: rig.id,
          keyCount: period.keys.length,
          laneName,
          rigName,
          sinceDate: period.sinceDate || null,
          untilDate: period.untilDate || null,
          untilAuto: period.untilAuto !== false,
          keys: period.keys,
          period,
        });
      }
    }
  }
  return layouts;
}

function matchingLayouts(layouts, keyCount, isoDate) {
  if (!keyCount || !isoDate) return [];
  const byRig = new Map();
  for (const layout of layouts) {
    if (layout.keyCount !== keyCount) continue;
    const group = byRig.get(layout.rigId);
    if (group) group.push(layout);
    else byRig.set(layout.rigId, [layout]);
  }
  const matches = [];
  for (const group of byRig.values()) {
    const periods = group.map((layout) => layout.period);
    for (const layout of group) {
      if (periodCoversDate(layout.period, isoDate, periods)) matches.push(layout);
    }
  }
  return matches;
}

function layoutMeta(layout, t, language) {
  const from = formatBindDate(layout.sinceDate, language);
  const until = layout.untilAuto ? '' : formatBindDate(layout.untilDate, language);
  if (from && until) return t('passPopups.edit.keyboard.range', { from, to: until });
  if (from) return t('passPopups.edit.keyboard.since', { date: from });
  return '';
}

function keyTokens(keys) {
  return formatKeybind(keys).split(' ').filter(Boolean);
}

function BindKeyChips({ tokens }) {
  if (!tokens?.length) return null;
  return (
    <span className="pass-keyboard-bind-keys">
      {tokens.map((token) => (
        <span key={token} className="pass-keyboard-bind-keys__key">{token}</span>
      ))}
    </span>
  );
}

function BindOptionLabel(option, { context }) {
  if (context === 'value') {
    return <span>{option.title}</span>;
  }
  return (
    <span className="pass-keyboard-bind-option">
      <span className="pass-keyboard-bind-option__head">
        <span className="pass-keyboard-bind-option__title">{option.title}</span>
        {option.matchesPass && (
          <span className="pass-keyboard-bind-option__match">{option.matchLabel}</span>
        )}
      </span>
      {option.note && <span className="pass-keyboard-bind-option__note">{option.note}</span>}
      {option.meta && <span className="pass-keyboard-bind-option__meta">{option.meta}</span>}
      <BindKeyChips tokens={option.keyTokens} />
    </span>
  );
}

export function initialPassLanePeriodId(pass) {
  return pass?.keyboardSetup?.source === 'override' && pass.keyboardSetup?.lanePeriodId
    ? String(pass.keyboardSetup.lanePeriodId)
    : '';
}

export function usePassKeyboardBind({ pass, playerId, keyCount, vidUploadTime }) {
  const { t, i18n } = useTranslation(['components']);
  const initialBindId = initialPassLanePeriodId(pass);
  const [lanePeriodId, setLanePeriodId] = useState(initialBindId);
  const [bindRigs, setBindRigs] = useState(null);
  const originalPlayerId = Number(pass?.playerId || pass?.player?.id || 0);

  useEffect(() => {
    if (playerId && originalPlayerId && Number(playerId) !== originalPlayerId) {
      setLanePeriodId('');
    }
  }, [playerId, originalPlayerId]);

  useEffect(() => {
    if (!playerId) {
      setBindRigs([]);
      return undefined;
    }
    let cancelled = false;
    setBindRigs(null);
    api.get(routes.playersV3.keyboardSetups(playerId))
      .then(({ data }) => {
        if (!cancelled) setBindRigs(data?.rigs || []);
      })
      .catch(() => {
        if (!cancelled) setBindRigs([]);
      });
    return () => {
      cancelled = true;
    };
  }, [playerId]);

  const bindModel = useMemo(() => {
    const ready = Array.isArray(bindRigs);
    const layouts = collectLayouts(ready ? bindRigs : []);
    const parsedKeyCount = Number(keyCount);
    const resolvedKeyCount = Number.isInteger(parsedKeyCount) && parsedKeyCount > 0 ? parsedKeyCount : null;
    const isoDate = uploadDay(vidUploadTime);
    const matches = matchingLayouts(layouts, resolvedKeyCount, isoDate);
    const matchIds = new Set(matches.map((layout) => layout.id));
    const matchLabel = t('passPopups.edit.keyboard.matches');
    const autoTitle = matches.length === 1
      ? t('passPopups.edit.keyboard.autoValue', { layout: layoutTitle(matches[0]) })
      : t('passPopups.edit.keyboard.auto');
    let autoNote = '';
    if (ready && !layouts.length) autoNote = t('passPopups.edit.keyboard.noLayouts');
    else if (ready && !resolvedKeyCount) autoNote = t('passPopups.edit.keyboard.autoNoKeyCount');
    else if (ready && !isoDate) autoNote = t('passPopups.edit.keyboard.autoNoDate');
    else if (ready && matches.length === 1) {
      autoNote = t('passPopups.edit.keyboard.autoUses', { layout: layoutTitle(matches[0]) });
    } else if (ready && matches.length === 0) autoNote = t('passPopups.edit.keyboard.autoNone');
    else if (ready) autoNote = t('passPopups.edit.keyboard.autoMany');

    const layoutOptions = layouts
      .map((layout) => {
        const title = layoutTitle(layout);
        const tokens = keyTokens(layout.keys);
        return {
          value: layout.id,
          label: [title, tokens.join(' ')].filter(Boolean).join(' '),
          title,
          meta: layoutMeta(layout, t, i18n.language),
          keyTokens: tokens,
          keyCount: layout.keyCount,
          matchesPass: matchIds.has(layout.id),
          matchLabel,
          sinceDate: layout.sinceDate || '',
        };
      })
      .sort((left, right) => {
        const matchOrder = Number(right.matchesPass) - Number(left.matchesPass);
        if (matchOrder) return matchOrder;
        const leftSame = resolvedKeyCount && left.keyCount === resolvedKeyCount ? 0 : 1;
        const rightSame = resolvedKeyCount && right.keyCount === resolvedKeyCount ? 0 : 1;
        if (leftSame !== rightSame) return leftSame - rightSame;
        if (left.keyCount !== right.keyCount) return left.keyCount - right.keyCount;
        return right.sinceDate.localeCompare(left.sinceDate);
      });

    const autoMatch = matches.length === 1 ? matches[0] : null;
    return {
      ready,
      keyCount: resolvedKeyCount,
      options: [
        {
          value: '',
          label: autoTitle,
          title: autoTitle,
          note: autoNote,
          meta: '',
          keyTokens: [],
          detailMeta: autoMatch ? layoutMeta(autoMatch, t, i18n.language) : '',
          detailTokens: autoMatch ? keyTokens(autoMatch.keys) : [],
          keyCount: autoMatch?.keyCount ?? null,
          matchesPass: false,
        },
        ...layoutOptions,
      ],
    };
  }, [bindRigs, keyCount, vidUploadTime, i18n.language, t]);

  const selectedBind = bindModel.options.find((option) => option.value === lanePeriodId) || bindModel.options[0];
  const selectedMismatch = selectedBind?.value
    && bindModel.keyCount
    && selectedBind.keyCount
    && selectedBind.keyCount !== bindModel.keyCount
    ? t('passPopups.edit.keyboard.mismatch', {
      layoutCount: selectedBind.keyCount,
      passCount: bindModel.keyCount,
    })
    : '';

  return {
    lanePeriodId,
    initialBindId,
    setLanePeriodId,
    bindModel,
    selectedBind,
    selectedMismatch,
  };
}

export function PassKeyboardBindField({ bind, onChange }) {
  const { t } = useTranslation('components');
  const { bindModel, selectedBind, selectedMismatch } = bind;

  return (
    <div className="pass-keyboard-bind">
      <CustomSelect
        options={bindModel.options}
        value={selectedBind}
        onChange={(option) => onChange(option?.value || '')}
        width="100%"
        maxHeight="320px"
        direction="auto"
        wrapOptions
        isSearchable={bindModel.options.length > 8}
        formatOptionLabel={BindOptionLabel}
        label={t('passPopups.edit.keyboard.label')}
      />
      {bindModel.ready && (selectedBind?.note || selectedBind?.meta || selectedBind?.detailMeta || selectedBind?.keyTokens?.length || selectedBind?.detailTokens?.length || selectedMismatch) && (
        <div className="pass-keyboard-bind__detail">
          {selectedBind.note && (
            <p className="pass-keyboard-bind__hint">{selectedBind.note}</p>
          )}
          {(selectedBind.detailMeta || selectedBind.meta) && (
            <p className="pass-keyboard-bind__meta">{selectedBind.detailMeta || selectedBind.meta}</p>
          )}
          {selectedMismatch && (
            <p className="pass-keyboard-bind__warn">{selectedMismatch}</p>
          )}
          <BindKeyChips tokens={selectedBind.detailTokens?.length ? selectedBind.detailTokens : selectedBind.keyTokens} />
        </div>
      )}
    </div>
  );
}
