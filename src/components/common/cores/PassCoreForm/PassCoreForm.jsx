// tuf-search: #PassCoreForm #passCoreForm #cores
import { useTranslation } from 'react-i18next';
import { Tooltip } from 'react-tooltip';
import './PassCoreForm.css';

export const PASS_CORE_COPY = {
  submit: {
    ns: 'pages',
    title: 'passSubmission.title',
    thumbnailInfo: 'passSubmission.thumbnailInfo',
    levelIdPlaceholder: 'passSubmission.submInfo.levelId',
    levelSongPlaceholder: 'passSubmission.levelInfo.song',
    levelArtistPlaceholder: 'passSubmission.levelInfo.artist',
    levelCharterPlaceholder: 'passSubmission.levelInfo.charter',
    levelFetchingInput: 'passSubmission.levelFetching.input',
    levelFetchingFetching: 'passSubmission.levelFetching.fetching',
    levelFetchingGoto: 'passSubmission.levelFetching.goto',
    levelFetchingNotFound: 'passSubmission.levelFetching.notfound',
    videoLinkPlaceholder: 'passSubmission.videoInfo.videoLink',
    videoTitleLabel: 'passSubmission.videoInfo.title',
    videoChannelLabel: 'passSubmission.videoInfo.channel',
    videoTimestampLabel: 'passSubmission.videoInfo.timestamp',
    videoNoLink: 'passSubmission.videoInfo.nolink',
    speedPlaceholder: 'passSubmission.submInfo.speed',
    keyCountPlaceholder: 'passSubmission.submInfo.keyCount',
    keyCountTooltip: 'passSubmission.keyCountTooltip',
    feelingPlaceholder: 'passSubmission.submInfo.feelDiff',
    feelingTooltip: 'passSubmission.feelingTooltip',
    expectedPlaceholder: 'passSubmission.submInfo.expectedDiff',
    expectedTooltip: 'passSubmission.expectedTooltip',
    holdLabel: 'passSubmission.submInfo.nohold',
    holdTooltip: 'passSubmission.holdTooltip',
    adofaiV2Label: 'passSubmission.submInfo.isAdofaiV2',
    adofaiV2Tooltip: 'passSubmission.adofaiV2Tooltip',
    ePerfect: 'passSubmission.judgements.ePerfect',
    perfect: 'passSubmission.judgements.perfect',
    lPerfect: 'passSubmission.judgements.lPerfect',
    tooEarly: 'passSubmission.judgements.tooearly',
    early: 'passSubmission.judgements.early',
    late: 'passSubmission.judgements.late',
    accPrefix: 'passSubmission.acc',
    scorePrefix: 'passSubmission.scoreCalc',
    scoreNeedId: 'passSubmission.score.needId',
    scoreNeedJudg: 'passSubmission.score.needJudg',
    scoreNeedInfo: 'passSubmission.score.needInfo',
    scoreNoInfo: 'passSubmission.score.noInfo',
  },
  edit: {
    ns: 'components',
    title: 'passPopups.edit.title',
    thumbnailInfo: 'passPopups.edit.thumbnailInfo',
    levelIdPlaceholder: 'passPopups.edit.form.submInfo.levelId',
    levelSongPlaceholder: 'passPopups.edit.form.levelInfo.song',
    levelArtistPlaceholder: 'passPopups.edit.form.levelInfo.artist',
    levelCharterPlaceholder: 'passPopups.edit.form.levelInfo.charter',
    levelFetchingInput: 'passPopups.edit.form.levelFetching.input',
    levelFetchingFetching: 'passPopups.edit.form.levelFetching.fetching',
    levelFetchingGoto: 'passPopups.edit.form.levelFetching.goto',
    levelFetchingNotFound: 'passPopups.edit.form.levelFetching.notfound',
    videoLinkPlaceholder: 'passPopups.edit.form.videoInfo.videoLink',
    videoTitleLabel: 'passPopups.edit.form.videoInfo.title',
    videoChannelLabel: 'passPopups.edit.form.videoInfo.channel',
    videoTimestampLabel: 'passPopups.edit.form.videoInfo.timestamp',
    videoNoLink: 'passPopups.edit.form.videoInfo.nolink',
    speedPlaceholder: 'passPopups.edit.form.submInfo.speed',
    keyCountPlaceholder: 'passPopups.edit.form.submInfo.keyCount',
    keyCountTooltip: 'passPopups.edit.keyCountTooltip',
    feelingPlaceholder: 'passPopups.edit.form.submInfo.feelDiff',
    feelingTooltip: 'passPopups.edit.feelingTooltip',
    expectedPlaceholder: 'passPopups.edit.form.submInfo.expectedDiff',
    expectedTooltip: 'passPopups.edit.expectedTooltip',
    holdLabel: 'passPopups.edit.form.submInfo.nohold',
    holdTooltip: 'passPopups.edit.holdTooltip',
    adofaiV2Label: 'passPopups.edit.form.submInfo.isAdofaiV2',
    adofaiV2Tooltip: 'passPopups.edit.adofaiV2Tooltip',
    ePerfect: 'passPopups.edit.form.judgements.ePerfect',
    perfect: 'passPopups.edit.form.judgements.perfect',
    lPerfect: 'passPopups.edit.form.judgements.lPerfect',
    tooEarly: 'passPopups.edit.form.judgements.tooearly',
    early: 'passPopups.edit.form.judgements.early',
    late: 'passPopups.edit.form.judgements.late',
    accPrefix: 'passPopups.edit.acc',
    scorePrefix: 'passPopups.edit.scoreCalc',
    scoreNeedId: 'passPopups.edit.form.score.needId',
    scoreNeedJudg: 'passPopups.edit.form.score.needJudg',
    scoreNeedInfo: 'passPopups.edit.form.score.needInfo',
    scoreNoInfo: 'passPopups.edit.form.score.noInfo',
  },
};

export function getPassCoreCopy(mode) {
  return PASS_CORE_COPY[mode];
}

export function PassCoreForm({
  mode,
  placeholderImage,
  form,
  isFormValidDisplay,
  isValidSpeed,
  isValidFeelingRating,
  isValidExpectedRating,
  isValidKeyCount,
  isValidTimestamp,
  submitAttempt,
  isFormValid,
  holdCheckboxVisibility,
  level,
  levelLoading,
  videoDetail,
  accuracy,
  score,
  onInputChange,
  onLevelIdChange,
  levelIdValue,
  renderLevelIdInput,
  renderLevelInfoLeading,
  renderVerified,
  renderGotoLink,
  renderPrimarySelector,
  renderExtraCheckboxes,
  renderBelowJudgements,
  renderSubmitActions,
  formatCreatorDisplay,
  truncateString,
}) {
  const copy = getPassCoreCopy(mode);
  const { t } = useTranslation([copy.ns, 'common']);
  const holdVisibility = holdCheckboxVisibility ?? 'visible';

  const renderRatingField = ({
    name,
    placeholderKey,
    tooltipKey,
    tooltipId,
    isValid,
    autocomplete,
    useDarkInvalidHighlight = false,
  }) => {
    const showInvalid = !isFormValidDisplay[name];
    return (
    <div className="info-input-field rating-field">
      <input
        type="text"
        autoComplete={autocomplete}
        placeholder={t(placeholderKey, { ns: copy.ns })}
        name={name}
        value={form[name] ?? ''}
        onChange={onInputChange}
        className={showInvalid && useDarkInvalidHighlight ? 'field-invalid-dark' : undefined}
        style={
          showInvalid && !useDarkInvalidHighlight
            ? {
                borderColor: 'red',
                backgroundColor: !isValid ? '#ffff0044' : '',
              }
            : undefined
        }
      />
      <div
        className="fr-tooltip-icon"
        data-tooltip-id={!isValid ? tooltipId : ''}
        data-tooltip-content={t(tooltipKey, { ns: copy.ns })}
      >
        <span
          className={
            !isValid && useDarkInvalidHighlight && mode === 'submit'
              ? 'field-invalid-dark-hint'
              : undefined
          }
          style={{
            visibility: !isValid ? 'visible' : 'hidden',
            ...(mode === 'submit' && !useDarkInvalidHighlight
              ? {
                  color: 'red',
                  padding: '0.2rem 0.4rem',
                  borderRadius: '5px',
                }
              : {}),
          }}
        >
          ?
        </span>
        <Tooltip
          className="tooltip"
          id={tooltipId}
          place="bottom-end"
          effect="solid"
          style={{
            maxWidth: '300px',
            zIndex: 100,
            background: 'var(--color-black)',
          }}
        />
      </div>
    </div>
    );
  };

  return (
    <form
      className={`form-container pass-core-form ${videoDetail ? 'shadow' : ''}`}
      style={{
        backgroundImage: `url(${videoDetail ? videoDetail.image : placeholderImage})`,
      }}
    >
      <div
        className="thumbnail-container"
        style={{
          filter: videoDetail ? `drop-shadow(0 0 1rem black)` : '',
        }}
      >
        {videoDetail ? (
          <iframe
            src={videoDetail.embed}
            title="Video player"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          ></iframe>
        ) : (
          <div className="thumbnail-text">
            <h2>{t(copy.thumbnailInfo, { ns: copy.ns })}</h2>
          </div>
        )}
      </div>

      <div className="info">
        <h1>{t(copy.title, { ns: copy.ns })}</h1>

        <div className="id-input">
          {renderLevelIdInput ? (
            renderLevelIdInput()
          ) : (
            <input
              type="text"
              autoComplete="off"
              placeholder={t(copy.levelIdPlaceholder, { ns: copy.ns })}
              name="levelId"
              value={levelIdValue ?? form.levelId}
              onChange={onLevelIdChange ?? onInputChange}
              style={{ borderColor: isFormValidDisplay.levelId ? '' : 'red' }}
            />
          )}

          <div className="information">
            {level && form.levelId ? (
              <>
                {renderLevelInfoLeading ? renderLevelInfoLeading() : null}
                <div className="level-info">
                  <h2 className="level-info-sub">{truncateString(level.song, 30)}</h2>
                  <div className="level-info-sub">
                    <span>{truncateString(level.artist, 15)}</span>
                    <span>{formatCreatorDisplay(level)}</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="level-info">
                <h2 className="level-info-sub" style={{ color: '#aaa' }}>
                  {t(copy.levelSongPlaceholder, { ns: copy.ns })}
                </h2>
                <div className="level-info-sub">
                  <span style={{ color: '#aaa' }}>{t(copy.levelArtistPlaceholder, { ns: copy.ns })}</span>
                  <span style={{ color: '#aaa' }}>{t(copy.levelCharterPlaceholder, { ns: copy.ns })}</span>
                </div>
              </div>
            )}

            <div className="verified">
              {renderVerified ? renderVerified() : null}
            </div>

            {renderGotoLink ? renderGotoLink() : null}
          </div>
        </div>

        <div className="youtube-input">
          <input
            type="text"
            autoComplete="pass-video-link"
            placeholder={t(copy.videoLinkPlaceholder, { ns: copy.ns })}
            name="videoLink"
            value={form.videoLink}
            onChange={onInputChange}
            style={{ borderColor: isFormValidDisplay.videoLink ? '' : 'red' }}
          />
          {videoDetail ? (
            <div className="youtube-info">
              <div className="yt-info">
                <h4>{t(copy.videoTitleLabel, { ns: copy.ns })}</h4>
                <p style={{ maxWidth: '%' }}>{videoDetail.title}</p>
              </div>
              <div className="yt-info">
                <h4>{t(copy.videoChannelLabel, { ns: copy.ns })}</h4>
                <p>{videoDetail.channelName}</p>
              </div>
              <div className="yt-info">
                <h4>{t(copy.videoTimestampLabel, { ns: copy.ns })}</h4>
                {mode === 'edit' ? (
                  <input
                    type="text"
                    autoComplete="off"
                    placeholder="YYYY-MM-DDTHH:MM:SS"
                    name="vidUploadTime"
                    value={form.vidUploadTime}
                    onChange={onInputChange}
                    style={{ borderColor: isFormValidDisplay.vidUploadTime ? '' : 'red' }}
                  />
                ) : (
                  <p>{videoDetail.timestamp?.replace?.('T', ' ')?.replace?.('Z', '')}</p>
                )}
              </div>
            </div>
          ) : mode === 'edit' ? (
            <div className="youtube-info">
              <div className="yt-info">
                <p style={{ color: '#aaa' }}>{t(copy.videoNoLink, { ns: copy.ns })}</p>
              </div>
              <div className="yt-info">
                <h4>{t(copy.videoTimestampLabel, { ns: copy.ns })}</h4>
                <input
                  type="text"
                  autoComplete="off"
                  placeholder="YYYY-MM-DDTHH:MM:SS"
                  name="vidUploadTime"
                  value={form.vidUploadTime}
                  onChange={onInputChange}
                />
              </div>
            </div>
          ) : (
            <div className="yt-info">
              <p style={{ color: '#aaa' }}>{t(copy.videoNoLink, { ns: copy.ns })}</p>
              <br />
            </div>
          )}
        </div>

        {renderPrimarySelector ? <div className="info-input">{renderPrimarySelector()}</div> : null}

        <div className="info-input info-input-grid">
          <input
            type="text"
            autoComplete="off"
            placeholder={t(copy.speedPlaceholder, { ns: copy.ns })}
            name="speed"
            value={form.speed}
            onChange={onInputChange}
            style={{
              borderColor: isFormValidDisplay.speed ? '' : 'red',
              backgroundColor: isValidSpeed ? 'transparent' : '#faa',
            }}
          />

          <div className="info-input-field keycount-field">
            <input
              type="number"
              min={1}
              step={1}
              autoComplete="off"
              placeholder={t(copy.keyCountPlaceholder, { ns: copy.ns })}
              name="keyCount"
              value={form.keyCount ?? ''}
              onChange={onInputChange}
              className={!isFormValidDisplay.keyCount ? 'field-invalid-dark' : undefined}
            />
            <div
              className="fr-tooltip-icon"
              data-tooltip-id="keycount-tooltip"
              data-tooltip-content={t(copy.keyCountTooltip, { ns: copy.ns })}
            >
              <span>?</span>
              <Tooltip
                className="tooltip"
                id="keycount-tooltip"
                place="bottom-end"
                effect="solid"
                style={{
                  maxWidth: '300px',
                  zIndex: 100,
                  background: 'var(--color-black)',
                }}
              />
            </div>
          </div>

          {renderRatingField({
            name: 'feelingRating',
            placeholderKey: copy.feelingPlaceholder,
            tooltipKey: copy.feelingTooltip,
            tooltipId: 'feeling-rating-tooltip',
            isValid: isValidFeelingRating,
            autocomplete: mode === 'submit' ? 'pass-feeling-rating' : 'off',
            useDarkInvalidHighlight: true,
          })}

          {renderRatingField({
            name: 'expectedRating',
            placeholderKey: copy.expectedPlaceholder,
            tooltipKey: copy.expectedTooltip,
            tooltipId: 'expected-rating-tooltip',
            isValid: isValidExpectedRating,
            autocomplete: 'off',
          })}
        </div>

        <div className="checkbox-row">
          {renderExtraCheckboxes ? renderExtraCheckboxes() : null}

          <div className="gameplay-checkboxes">
            <div
              className="hold-checkbox"
              data-tooltip-id="holdTooltip"
              data-tooltip-content={t(copy.holdTooltip, { ns: copy.ns })}
              style={{ visibility: holdVisibility }}
            >
              <Tooltip id="holdTooltip" place="top-end" effect="solid" />
              <input
                type="checkbox"
                value={form.isNoHold}
                onChange={onInputChange}
                name="isNoHold"
                checked={form.isNoHold}
              />
              <span>{t(copy.holdLabel, { ns: copy.ns })}</span>
            </div>

            <div className="keycount-checkbox" data-tooltip-id="adofaiV2Tooltip" data-tooltip-content={t(copy.adofaiV2Tooltip, { ns: copy.ns })}>
              <input
                type="checkbox"
                value={form.isAdofaiV2}
                onChange={onInputChange}
                name="isAdofaiV2"
                checked={!!form.isAdofaiV2}
              />
              <span>{t(copy.adofaiV2Label, { ns: copy.ns })}</span>
              <Tooltip className="tooltip" id="adofaiV2Tooltip" place="bottom-end" effect="solid" />
            </div>
          </div>
        </div>

        <div className="accuracy">
          <div className="top">
            <div className="each-accuracy">
              <p>{t(copy.ePerfect, { ns: copy.ns })}</p>
              <input
                type="text"
                autoComplete="off"
                placeholder="#"
                name="ePerfect"
                value={form.ePerfect}
                onChange={onInputChange}
                style={{ borderColor: isFormValidDisplay.ePerfect ? '' : 'red', color: '#FCFF4D' }}
              />
            </div>
            <div className="each-accuracy">
              <p>{t(copy.perfect, { ns: copy.ns })}</p>
              <input
                type="text"
                autoComplete="off"
                placeholder="#"
                name="perfect"
                value={form.perfect}
                onChange={onInputChange}
                style={{ borderColor: isFormValidDisplay.perfect ? '' : 'red', color: '#5FFF4E' }}
              />
            </div>
            <div className="each-accuracy">
              <p>{t(copy.lPerfect, { ns: copy.ns })}</p>
              <input
                type="text"
                name="lPerfect"
                autoComplete="off"
                placeholder="#"
                value={form.lPerfect}
                onChange={onInputChange}
                style={{ borderColor: isFormValidDisplay.lPerfect ? '' : 'red', color: '#FCFF4D' }}
              />
            </div>
          </div>

          <div className="bottom">
            <div className="each-accuracy">
              <p>{t(copy.tooEarly, { ns: copy.ns })}</p>
              <input
                type="text"
                autoComplete="off"
                placeholder="#"
                name="tooEarly"
                value={form.tooEarly}
                onChange={onInputChange}
                style={{ borderColor: isFormValidDisplay.tooEarly ? '' : 'red', color: '#FF0000' }}
              />
            </div>
            <div className="each-accuracy">
              <p>{t(copy.early, { ns: copy.ns })}</p>
              <input
                type="text"
                autoComplete="off"
                placeholder="#"
                name="early"
                value={form.early}
                onChange={onInputChange}
                style={{ borderColor: isFormValidDisplay.early ? '' : 'red', color: '#FF6F4D' }}
              />
            </div>
            <div className="each-accuracy">
              <p>{t(copy.late, { ns: copy.ns })}</p>
              <input
                type="text"
                autoComplete="off"
                placeholder="#"
                name="late"
                value={form.late}
                onChange={onInputChange}
                style={{ borderColor: isFormValidDisplay.late ? '' : 'red', color: '#FF6F4D' }}
              />
            </div>
          </div>

          <div className="acc-score">
            <p>
              {t(copy.accPrefix, { ns: copy.ns })}
              {accuracy !== null ? accuracy : 'N/A'}
            </p>
            <p>
              {t(copy.scorePrefix, { ns: copy.ns })}
              {score}
            </p>
          </div>
        </div>

        {renderBelowJudgements ? renderBelowJudgements() : null}

        {renderSubmitActions ? renderSubmitActions() : null}
      </div>
    </form>
  );
}

