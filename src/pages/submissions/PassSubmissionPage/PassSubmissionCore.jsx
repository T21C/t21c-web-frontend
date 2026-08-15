// tuf-search: #PassSubmissionCore #passSubmission #PassCoreForm
import { useEffect, useRef, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { routes } from '@/api/routes';
import api from '@/utils/api';
import placeholder from '@/assets/placeholder/3.png';
import { FetchIcon } from '@/components/common/icons';
import { PlayerInput } from '@/components/common/selectors';
import { PassCoreForm } from '@/components/common/cores/PassCoreForm/PassCoreForm';
import { formatCreatorDisplay, truncateString } from '@/utils/Utility';
import { normalizeLevelSearchQuery } from '@/utils/normalizeEntitySearchQuery';

/**
 * Shared PassCoreForm + level search for submit and calculator pages.
 */
export function PassSubmissionCore({
  mode,
  formKey = 0,
  form,
  setForm,
  isFormValidDisplay,
  isValidSpeed,
  isValidFeelingRating,
  isValidExpectedRating,
  isValidKeyCount,
  submitAttempt,
  isFormValid,
  level,
  setLevel,
  levelLoading,
  videoDetail,
  videoLinkResolving,
  accuracy,
  score,
  handleInputChange,
  difficultyDict,
  searchInput,
  setSearchInput,
  renderBelowJudgements,
  renderSubmitActions,
  renderLevelInfoActions,
  renderJudgementActions,
}) {
  const { t } = useTranslation('pages');
  const [searchResults, setSearchResults] = useState([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const searchCancelTokenRef = useRef(null);
  const dropdownRef = useRef(null);
  const searchContainerRef = useRef(null);
  const searchTimeoutRef = useRef(null);

  const getIconColor = () => {
    if (!form.levelId) return '#ffc107';
    if (levelLoading) return '#ffc107';
    if (!level) return '#dc3545';
    return '#28a745';
  };

  const searchLevels = useCallback(async (query) => {
    const normalizedQuery = normalizeLevelSearchQuery(query);
    if (!normalizedQuery) {
      setSearchResults([]);
      return;
    }

    if (searchCancelTokenRef.current) {
      searchCancelTokenRef.current.cancel('New search initiated');
    }

    searchCancelTokenRef.current = api.CancelToken.source();

    try {
      const response = await api.get(`${routes.database.levels.root()}`, {
        params: {
          query: normalizedQuery,
          limit: 50,
          offset: 0,
        },
        cancelToken: searchCancelTokenRef.current.token,
      });
      setSearchResults(response.data.results);
    } catch (error) {
      if (!api.isCancel(error)) {
        console.error('Error searching levels:', error);
        setSearchResults([]);
      }
    }
  }, []);

  const handleLevelSelect = (selectedLevel) => {
    setForm((prev) => ({
      ...prev,
      levelId: selectedLevel.id.toString(),
    }));
    setLevel(selectedLevel);
    setIsExpanded(false);
  };

  const handleLevelInputChange = (e) => {
    const normalizedValue = normalizeLevelSearchQuery(e.target.value);
    setForm((prev) => ({
      ...prev,
      levelId: normalizedValue,
    }));
    setSearchInput(normalizedValue);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      if (normalizedValue) {
        searchLevels(normalizedValue);
      } else {
        setSearchResults([]);
      }
    }, 500);
  };

  useEffect(() => {
    return () => {
      if (searchCancelTokenRef.current) {
        searchCancelTokenRef.current.cancel('Component unmounted');
      }
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    function handleClickOutside(event) {
      if (
        dropdownRef.current &&
        searchContainerRef.current &&
        !dropdownRef.current.contains(event.target) &&
        !searchContainerRef.current.contains(event.target)
      ) {
        setIsExpanded(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <PassCoreForm
      key={`${mode}-${formKey}`}
      mode={mode}
      placeholderImage={placeholder}
      form={form}
      isFormValidDisplay={isFormValidDisplay}
      isValidSpeed={isValidSpeed}
      isValidFeelingRating={isValidFeelingRating}
      isValidExpectedRating={isValidExpectedRating}
      isValidKeyCount={isValidKeyCount}
      isValidTimestamp={true}
      submitAttempt={submitAttempt}
      isFormValid={isFormValid}
      holdCheckboxVisibility={
        mode === 'calculator' || !level?.tags || level?.tags?.some((tag) => tag.name === 'Hold')
          ? 'visible'
          : 'hidden'
      }
      level={level}
      levelLoading={levelLoading}
      videoDetail={videoDetail}
      videoLinkResolving={videoLinkResolving}
      accuracy={accuracy}
      score={score}
      onInputChange={handleInputChange}
      levelIdValue={searchInput}
      onLevelIdChange={handleLevelInputChange}
      renderLevelIdInput={() => (
        <>
          <div className="search-container" ref={searchContainerRef}>
            <input
              type="text"
              autoComplete="off"
              placeholder={t('passSubmission.submInfo.levelId')}
              name="levelId"
              value={searchInput}
              onChange={handleLevelInputChange}
              style={{ borderColor: isFormValidDisplay.levelId ? '' : 'red' }}
            />
            {searchResults.length > 0 && (
              <button
                type="button"
                className={`expand-button btn-fill-primary ${isExpanded ? 'expanded' : ''}`}
                onClick={() => setIsExpanded((v) => !v)}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </button>
            )}
          </div>

          <div className={`level-dropdown ${isExpanded ? 'expanded' : ''}`} ref={dropdownRef}>
            {searchResults.map((result) => (
              <div
                key={result.id}
                className="level-option"
                onClick={() => handleLevelSelect(result)}
              >
                <img
                  src={difficultyDict[result.diffId]?.icon}
                  alt={difficultyDict[result.diffId]?.name}
                  className="difficulty-icon"
                />
                <div className="level-content">
                  <div className="level-title">
                    {result.song} (ID: {result.id})
                  </div>
                  <div className="level-details">
                    <span>{result.artist}</span>
                    <span>{formatCreatorDisplay(result)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
      renderLevelInfoLeading={() =>
        level && form.levelId ? (
          <img
            src={difficultyDict[level.diffId]?.icon}
            alt={difficultyDict[level.diffId]?.name}
            className="level-icon"
          />
        ) : null
      }
      renderVerified={() => (
        <FetchIcon
          className="fetch-icon"
          form={form}
          levelLoading={levelLoading}
          level={level}
          color={getIconColor()}
        />
      )}
      renderGotoLink={() => (
        <a
          href={level ? (level.id == form.levelId ? `/levels/${level.id}` : '#') : '#'}
          onClick={(e) => {
            if (!level || level.id != form.levelId) {
              e.preventDefault();
            }
          }}
          target="_blank"
          rel="noopener noreferrer"
          className="button-goto"
          style={{
            backgroundColor: getIconColor(),
            cursor: !form.levelId
              ? 'not-allowed'
              : levelLoading
                ? 'wait'
                : level
                  ? 'pointer'
                  : 'not-allowed',
            textShadow: '0 0 5px #0009',
          }}
        >
          {!form.levelId
            ? t('passSubmission.levelFetching.input')
            : levelLoading
              ? t('passSubmission.levelFetching.fetching')
              : level
                ? t('passSubmission.levelFetching.goto')
                : t('passSubmission.levelFetching.notfound')}
        </a>
      )}
      renderPrimarySelector={() => (
        <PlayerInput
          allowCreatePlayer={false}
          value={form.leaderboardName || ''}
          onChange={(value) => {
            setForm((prev) => ({
              ...prev,
              leaderboardName: value,
              playerId: '',
            }));
          }}
          onSelect={(player) => {
            setForm((prev) => ({
              ...prev,
              leaderboardName: player.name,
              playerId: player.id,
            }));
          }}
        />
      )}
      renderLevelInfoActions={renderLevelInfoActions}
      renderJudgementActions={renderJudgementActions}
      renderBelowJudgements={renderBelowJudgements}
      renderSubmitActions={renderSubmitActions}
      formatCreatorDisplay={formatCreatorDisplay}
      truncateString={truncateString}
    />
  );
}
