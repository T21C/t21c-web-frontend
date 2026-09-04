// tuf-search: #LinkedLevelsPopup #linkedLevelsPopup #popups #levels #levelLinks
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Tooltip } from 'react-tooltip';
import toast from 'react-hot-toast';
import { Portal } from '@/components/common/Portal';
import { CloseButton } from '@/components/common/buttons';
import { TrashIcon } from '@/components/common/icons';
import { CustomSelect } from '@/components/common/selectors';
import LevelSelectionPopup from '@/components/popups/Levels/LevelSelectionPopup/LevelSelectionPopup';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import { useDifficultyContext } from '@/contexts/DifficultyContext';
import { getSongDisplayName } from '@/utils/levelHelpers';
import api from '@/utils/api';
import { routes } from '@/api/routes';
import './linkedlevelspopup.css';

const CURRENT_LEVEL_TOOLTIP_ID = 'linked-levels-popup-current';

const GOLDEN_ANGLE = 137.508;

function hashHue(seed) {
  let x = Number(seed) || 0;
  x = Math.imul(x ^ (x >>> 16), 0x7feb352d);
  x = Math.imul(x ^ (x >>> 15), 0x846ca68b);
  x ^= x >>> 16;
  return Math.abs(x) % 360;
}

function subgroupPalette(groupId, count) {
  const n = Math.max(0, Number(count) || 0);
  const hue0 = hashHue(groupId);
  return Array.from({length: n}, (_, i) => {
    const h = (hue0 + i * GOLDEN_ANGLE) % 360;
    return `hsl(${h}deg 72% 58%)`;
  });
}

function parseSubgroup(value) {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function SubgroupSwatch({color, label}) {
  return (
    <span
      className={`linked-levels-popup__swatch${color ? '' : ' linked-levels-popup__swatch--empty'}`}
      style={color ? {background: color} : undefined}
      aria-hidden="true"
      title={label}
    />
  );
}

function subgroupColor(palette, n) {
  if (!palette.length) return null;
  return palette[(Number(n) - 1) % palette.length];
}

function formatSubgroupOption(option) {
  return (
    <span className="linked-levels-popup__option">
      <SubgroupSwatch color={option.color} label={String(option.value)} />
      <span>{option.label}</span>
    </span>
  );
}

function SubgroupPicker({
  label,
  value,
  options,
  canEdit,
  disabled,
  onChange,
}) {
  const selected = options.find((opt) => Number(opt.value) === Number(value)) ?? options[0];

  if (!canEdit) {
    return (
      <div className="linked-levels-popup__picker linked-levels-popup__picker--readonly">
        <span className="linked-levels-popup__picker-label">{label}</span>
        {selected ? formatSubgroupOption(selected) : null}
      </div>
    );
  }

  return (
    <div className="linked-levels-popup__picker">
      <span className="linked-levels-popup__picker-label">{label}</span>
      <CustomSelect
        options={options}
        value={selected ?? null}
        onChange={(opt) => {
          if (opt == null) return;
          onChange(Number(opt.value));
        }}
        isDisabled={disabled}
        isSearchable={false}
        isClearable={false}
        formatOptionLabel={formatSubgroupOption}
        width="7rem"
        aria-label={label}
      />
    </div>
  );
}

export default function LinkedLevelsPopup({
  currentLevelId,
  groupId,
  levels,
  canEdit,
  onClose,
  onChange,
}) {
  const { t } = useTranslation(['components', 'common']);
  const { difficultyDict } = useDifficultyContext();
  const [showPicker, setShowPicker] = useState(false);
  const [isMutating, setIsMutating] = useState(false);

  useBodyScrollLock(true);

  const memberCount = levels.length;
  const palette = useMemo(
    () => subgroupPalette(groupId, memberCount),
    [groupId, memberCount],
  );

  const selectOptions = useMemo(() => {
    const nums = Array.from({length: memberCount}, (_, i) => i + 1);
    return nums.map((n) => ({
      value: n,
      label: String(n),
      color: subgroupColor(palette, n),
    }));
  }, [memberCount, palette]);

  useEffect(() => {
    if (showPicker) {
      return undefined;
    }
    const handleEscape = (event) => {
      if (event.key !== 'Escape' || isMutating) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      onClose();
    };
    document.addEventListener('keydown', handleEscape, true);
    return () => {
      document.removeEventListener('keydown', handleEscape, true);
    };
  }, [showPicker, isMutating, onClose]);

  const handleOverlayClick = (e) => {
    e.stopPropagation();
    if (e.target === e.currentTarget && !isMutating && !showPicker) {
      onClose();
    }
  };

  const applyResult = (data) => {
    if (onChange) {
      onChange(data);
    }
  };

  const handleLevelSelect = async ({ levelId, level }) => {
    if (Number(levelId) === Number(currentLevelId)) {
      toast.error(t('levelPopups.linkedLevels.errors.sameLevel'));
      return;
    }
    if (levels.some((item) => Number(item.id) === Number(levelId))) {
      toast.error(t('levelPopups.linkedLevels.errors.alreadyLinked'));
      setShowPicker(false);
      return;
    }
    setIsMutating(true);
    try {
      const response = await api.post(routes.database.levels.links(currentLevelId), {
        levelId,
      });
      applyResult(response.data);
      toast.success(t('levelPopups.linkedLevels.toastAdded', {
        name: getSongDisplayName(level) || `#${levelId}`,
      }));
      setShowPicker(false);
    } catch (err) {
      toast.error(err.response?.data?.error || t('levelPopups.linkedLevels.errors.add'));
    } finally {
      setIsMutating(false);
    }
  };

  const handleRemove = async (memberLevelId) => {
    if (isMutating) return;
    setIsMutating(true);
    try {
      const response = await api.delete(
        routes.database.levels.linkMember(currentLevelId, memberLevelId),
      );
      applyResult(response.data);
      toast.success(t('levelPopups.linkedLevels.toastRemoved'));
    } catch (err) {
      toast.error(err.response?.data?.error || t('levelPopups.linkedLevels.errors.remove'));
    } finally {
      setIsMutating(false);
    }
  };

  const handleSubgroupChange = async (memberLevelId, field, nextValue) => {
    if (!canEdit || !groupId || isMutating) return;
    setIsMutating(true);
    try {
      const response = await api.patch(
        routes.database.levels.linkMember(currentLevelId, memberLevelId),
        {[field]: nextValue},
      );
      applyResult(response.data);
    } catch (err) {
      toast.error(err.response?.data?.error || t('levelPopups.linkedLevels.errors.saveShare'));
    } finally {
      setIsMutating(false);
    }
  };

  const optionsForValue = (value) => {
    if (value == null || value <= memberCount) return selectOptions;
    return [
      ...selectOptions,
      {
        value,
        label: String(value),
        color: subgroupColor(palette, value),
      },
    ];
  };

  return (
    <Portal>
      <div className="linked-levels-popup" onClick={handleOverlayClick}>
        <div
          className="linked-levels-popup__dialog"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="linked-levels-popup__header">
            <h2>{t('levelPopups.linkedLevels.title')}</h2>
            <CloseButton
              variant="floating"
              onClick={onClose}
              disabled={isMutating}
              aria-label={t('buttons.close', { ns: 'common' })}
            />
          </div>

          <div className="linked-levels-popup__list">
            {levels.length === 0 ? (
              <p className="linked-levels-popup__empty">
                {t('levelPopups.linkedLevels.empty')}
              </p>
            ) : (
              levels.map((level, index) => {
                const isCurrent = Number(level.id) === Number(currentLevelId);
                const icon =
                  level.difficulty?.icon ||
                  difficultyDict[level.diffId]?.icon ||
                  '/default-difficulty-icon.png';
                const listPosition = index + 1;
                const chartSubgroup = parseSubgroup(level.chartSubgroup) ?? listPosition;
                const vfxSubgroup = parseSubgroup(level.vfxSubgroup) ?? listPosition;
                const rowInner = (
                  <>
                    <img
                      src={icon}
                      alt=""
                      className="linked-levels-popup__diff-icon"
                    />
                    <div className="linked-levels-popup__meta">
                      <span className="linked-levels-popup__song">
                        {getSongDisplayName(level) || t('levelPopups.linkedLevels.unknownSong')}
                      </span>
                      <span className="linked-levels-popup__sub">
                        #{level.id}
                        {level.artist ? ` — ${level.artist}` : ''}
                      </span>
                    </div>
                  </>
                );

                return (
                  <div
                    key={level.id}
                    className={`linked-levels-popup__row${isCurrent ? ' linked-levels-popup__row--current' : ''}`}
                    {...(isCurrent
                      ? {
                          'data-tooltip-id': CURRENT_LEVEL_TOOLTIP_ID,
                          'aria-current': 'page',
                        }
                      : {})}
                  >
                    {isCurrent ? (
                      <div className="linked-levels-popup__row-main linked-levels-popup__row-main--current">
                        {rowInner}
                      </div>
                    ) : (
                      <Link
                        to={`/levels/${level.id}`}
                        className="linked-levels-popup__row-main"
                        onClick={onClose}
                      >
                        {rowInner}
                      </Link>
                    )}
                    {Boolean(groupId) && (
                      <div className="linked-levels-popup__subgroups">
                        <SubgroupPicker
                          label={t('levelPopups.linkedLevels.shareChart')}
                          value={chartSubgroup}
                          options={optionsForValue(chartSubgroup)}
                          canEdit={canEdit}
                          disabled={isMutating}
                          onChange={(next) =>
                            handleSubgroupChange(level.id, 'chartSubgroup', next)
                          }
                        />
                        <SubgroupPicker
                          label={t('levelPopups.linkedLevels.shareVfx')}
                          value={vfxSubgroup}
                          options={optionsForValue(vfxSubgroup)}
                          canEdit={canEdit}
                          disabled={isMutating}
                          onChange={(next) =>
                            handleSubgroupChange(level.id, 'vfxSubgroup', next)
                          }
                        />
                      </div>
                    )}
                    {canEdit && (
                      <button
                        type="button"
                        className="linked-levels-popup__remove btn-fill-danger"
                        onClick={() => handleRemove(level.id)}
                        disabled={isMutating}
                        title={t('buttons.remove', { ns: 'common' })}
                        aria-label={t('buttons.remove', { ns: 'common' })}
                      >
                        <TrashIcon size={16} color="currentColor" />
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {canEdit && (
            <div className="linked-levels-popup__actions">
              <button
                type="button"
                className="btn-fill-primary"
                onClick={() => setShowPicker(true)}
                disabled={isMutating}
              >
                {t('buttons.add', { ns: 'common' })}
              </button>
            </div>
          )}
        </div>
      </div>

      {levels.some((level) => Number(level.id) === Number(currentLevelId)) && (
        <Tooltip
          id={CURRENT_LEVEL_TOOLTIP_ID}
          place="left"
          hidden={showPicker}
          positionStrategy="fixed"
          className="linked-levels-popup__here-tooltip"
          opacity={1}
        >
          {t('levelPopups.linkedLevels.youAreHere')}
        </Tooltip>
      )}

      <LevelSelectionPopup
        isOpen={showPicker}
        onClose={() => setShowPicker(false)}
        onLevelSelect={handleLevelSelect}
        variant="pick"
      />
    </Portal>
  );
}
