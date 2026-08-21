import { Virtuoso } from 'react-virtuoso';
import { useDifficultyContext } from '@/contexts/DifficultyContext';
import MarqueeText from '@/components/common/display/MarqueeText/MarqueeText';
import { DownloadIcon, RefreshIcon, WarningIcon } from '@/components/common/icons';

const formatBytes = (bytes, locale) => {
  const value = Number(bytes) || 0;
  if (value <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const unit = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: unit ? 1 : 0 }).format(value / (1024 ** unit))} ${units[unit]}`;
};

const UPDATE_LABEL_KEYS = {
  idle: 'checkForUpdate',
  checking: 'checkingForUpdate',
  up_to_date: 'upToDate',
  update_available: 'updateAvailable',
  updating: 'updatingLevel',
  failed: 'updateRetry',
};

const LoadError = ({ message, onRetry, position = 'bottom', t }) => (
  <div className={`tufhelper-download-manager__list-status is-error is-${position}`} role="alert">
    <WarningIcon size={15} color="currentColor" aria-hidden="true" />
    <span>{message}</span>
    <button type="button" onClick={onRetry}>{t('level.tufHelperLiteDownloadManager.retry')}</button>
  </div>
);

export const DownloadedLevelList = ({
  levels,
  firstItemIndex,
  loading,
  errors,
  hasNext,
  hasPrevious,
  loadNext,
  loadPrevious,
  retryInitial,
  updateStates,
  onCheckForUpdate,
  updateSupported,
  updateLocked,
  t,
  locale,
}) => {
  const { difficultyDict, loading: difficultiesLoading } = useDifficultyContext();
  const difficultiesReady = !difficultiesLoading && levels.every((level) => difficultyDict[level.diffId]?.icon);
  const renderRow = (_virtualIndex, level) => {
    const difficulty = difficultyDict[level.diffId];
    const updateStatus = updateStates[level.id] || { state: level.updateState || 'idle' };
    const updateState = updateStatus.state || 'idle';
    const labelKey = updateState === 'checking' && updateStatus.stage === 'downloading'
      ? 'downloadingToCompare'
      : UPDATE_LABEL_KEYS[updateState] || UPDATE_LABEL_KEYS.idle;
    const progress = Number(updateStatus.progress);
    const progressLabel = Number.isFinite(progress) && progress >= 0 && progress < 1
      ? ` ${Math.round(progress * 100)}%`
      : '';

    return (
      <article className="tufhelper-download-manager__level-row" role="listitem">
        <div className="tufhelper-download-manager__difficulty">
          <img
            src={difficulty.icon}
            alt={difficulty.name}
            loading="lazy"
            decoding="async"
          />
        </div>
        <div className="tufhelper-download-manager__level-info">
          <MarqueeText className="tufhelper-download-manager__level-meta" as="span">
            #{level.id} · {level.artist}
          </MarqueeText>
          <div className="tufhelper-download-manager__level-title-line">
            <MarqueeText className="tufhelper-download-manager__level-name" as="strong">
              {level.levelName}
            </MarqueeText>
          </div>
        </div>
        <div className="tufhelper-download-manager__level-creator">
          <span>{t('level.tufHelperLiteDownloadManager.creator')}</span>
          <MarqueeText as="strong">{level.creator}</MarqueeText>
        </div>
        <div className="tufhelper-download-manager__level-size">
          <span>{t('level.tufHelperLiteDownloadManager.size')}</span>
          <strong>{formatBytes(level.sizeBytes, locale)}</strong>
        </div>
        <button
          type="button"
          className={`tufhelper-download-manager__update is-${updateState}`}
          onClick={() => onCheckForUpdate(level)}
          disabled={!updateSupported || updateLocked || updateState === 'checking' || updateState === 'updating'}
          aria-live="polite"
          title={updateStatus.error || undefined}
        >
          <RefreshIcon size={15} color="currentColor" aria-hidden="true" />
          {updateSupported
            ? `${t(`level.tufHelperLiteDownloadManager.${labelKey}`)}${progressLabel}`
            : t('level.tufHelperLiteDownloadManager.updateRequiredShort')}
        </button>
      </article>
    );
  };

  return (
    <>
      {(loading.initial && levels.length === 0) || (levels.length > 0 && !difficultiesReady) ? (
        <div className="tufhelper-download-manager__empty is-loading" role="status">
          <RefreshIcon size={24} color="currentColor" aria-hidden="true" />
          <strong>{t('level.tufHelperLiteDownloadManager.loadingLevels')}</strong>
        </div>
      ) : errors.initial && levels.length === 0 ? (
        <div className="tufhelper-download-manager__empty">
          <LoadError message={t('level.tufHelperLiteDownloadManager.loadLevelsFailed')} onRetry={retryInitial} t={t} />
        </div>
      ) : levels.length === 0 ? (
        <div className="tufhelper-download-manager__empty" role="status">
          <DownloadIcon size={26} aria-hidden="true" />
          <strong>{t('level.tufHelperLiteDownloadManager.emptyTitle')}</strong>
          <p>{t('level.tufHelperLiteDownloadManager.emptyDescription')}</p>
        </div>
      ) : (
        <div className="tufhelper-download-manager__level-list">
          {errors.previous ? (
            <LoadError message={t('level.tufHelperLiteDownloadManager.loadMoreFailed')} onRetry={loadPrevious} position="top" t={t} />
          ) : null}
          <Virtuoso
            className="tufhelper-download-manager__virtuoso"
            data={levels}
            firstItemIndex={firstItemIndex}
            computeItemKey={(_index, level) => level.id}
            itemContent={renderRow}
            startReached={() => { if (hasPrevious) loadPrevious(); }}
            endReached={() => { if (hasNext) loadNext(); }}
            rangeChanged={({ startIndex, endIndex }) => {
              const localStartIndex = startIndex >= firstItemIndex ? startIndex - firstItemIndex : startIndex;
              const localEndIndex = endIndex >= firstItemIndex ? endIndex - firstItemIndex : endIndex;
              if (hasPrevious && localStartIndex <= 5) loadPrevious();
              if (hasNext && localEndIndex >= levels.length - 6) loadNext();
            }}
            increaseViewportBy={{ top: 220, bottom: 220 }}
            role="list"
          />
          {loading.next || loading.previous ? (
            <div className={`tufhelper-download-manager__list-status is-${loading.previous ? 'top' : 'bottom'}`} role="status">
              <RefreshIcon size={14} color="currentColor" aria-hidden="true" />
              <span>{t('level.tufHelperLiteDownloadManager.loadingLevels')}</span>
            </div>
          ) : null}
          {errors.next ? (
            <LoadError message={t('level.tufHelperLiteDownloadManager.loadMoreFailed')} onRetry={loadNext} position="bottom" t={t} />
          ) : null}
        </div>
      )}
    </>
  );
};

export default DownloadedLevelList;
