import { useTranslation } from 'react-i18next';
import { Tooltip } from 'react-tooltip';

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
    feelingPlaceholder: 'passSubmission.submInfo.feelDiff',
    feelingTooltip: 'passSubmission.tooltip',
    holdLabel: 'passSubmission.submInfo.nohold',
    holdTooltip: 'passSubmission.holdTooltip',
    is12kLabel: 'passSubmission.submInfo.is12K',
    is12kTooltip: 'passSubmission.12kTooltip',
    is16kLabel: 'passSubmission.submInfo.is16K',
    is16kTooltip: 'passSubmission.16kTooltip',
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
    feelingPlaceholder: 'passPopups.edit.form.submInfo.feelDiff',
    feelingTooltip: 'passPopups.edit.tooltip',
    holdLabel: 'passPopups.edit.form.submInfo.nohold',
    holdTooltip: 'passPopups.edit.holdTooltip',
    is12kLabel: 'passPopups.edit.form.submInfo.is12K',
    is12kTooltip: 'passPopups.edit.12kTooltip',
    is16kLabel: 'passPopups.edit.form.submInfo.is16K',
    is16kTooltip: 'passPopups.edit.16kTooltip',
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
  isValidTimestamp,
  submitAttempt,
  isFormValid,
  holdCheckboxVisibility,
  keyModeError,
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
  const showKeyModeError = Boolean(keyModeError);

  return (
    <form
      className={`form-container ${videoDetail ? 'shadow' : ''}`}
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
          ) : (
            <div className="yt-info">
              <p style={{ color: '#aaa' }}>{t(copy.videoNoLink, { ns: copy.ns })}</p>
              <br />
            </div>
          )}
        </div>

        {renderPrimarySelector ? <div className="info-input">{renderPrimarySelector()}</div> : null}

        <div className="info-input">
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

          <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
            <input
              type="text"
              autoComplete={mode === 'submit' ? 'pass-feeling-rating' : 'off'}
              placeholder={t(copy.feelingPlaceholder, { ns: copy.ns })}
              name="feelingRating"
              value={form.feelingRating}
              onChange={onInputChange}
              style={{
                borderColor: isFormValidDisplay.feelingRating ? '' : 'red',
                backgroundColor: !isValidFeelingRating ? '#ffff0044' : '',
              }}
            />

            {mode === 'edit' ? (
              <div
                className="fr-tooltip-icon"
                data-tooltip-id={!isValidFeelingRating ? 'fr-tooltip' : ''}
                data-tooltip-content={t(copy.feelingTooltip, { ns: copy.ns })}
              >
                <span style={{ visibility: `${!isValidFeelingRating ? '' : 'hidden'}` }}>?</span>
                <Tooltip className="tooltip" id="fr-tooltip" place="bottom-end" effect="solid" />
              </div>
            ) : (
              <div className="tooltip-container">
                <span style={{ color: 'red', visibility: `${!isValidFeelingRating ? '' : 'hidden'}` }}>?</span>
                <span
                  className="tooltip"
                  style={{
                    visibility: `${!isValidFeelingRating ? '' : 'hidden'}`,
                    bottom: '115%',
                    right: '-15%',
                  }}
                >
                  {t(copy.feelingTooltip, { ns: copy.ns })}
                </span>
              </div>
            )}
          </div>
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

            <div className="keycount-checkbox" data-tooltip-id="12kTooltip" data-tooltip-content={t(copy.is12kTooltip, { ns: copy.ns })}>
              <input
                type="checkbox"
                value={form.is12K}
                onChange={onInputChange}
                name="is12K"
                checked={form.is12K}
                style={{ outline: showKeyModeError ? '2px solid red' : 'none' }}
              />
              <span>{t(copy.is12kLabel, { ns: copy.ns })}</span>
              <Tooltip className="tooltip" id="12kTooltip" place="bottom-end" effect="solid" />
            </div>

            <div className="keycount-checkbox" data-tooltip-id="16kTooltip" data-tooltip-content={t(copy.is16kTooltip, { ns: copy.ns })}>
              <input
                type="checkbox"
                value={form.is16K}
                onChange={onInputChange}
                name="is16K"
                checked={form.is16K}
                style={{ outline: showKeyModeError ? '2px solid red' : 'none' }}
              />
              <span>{t(copy.is16kLabel, { ns: copy.ns })}</span>
              <Tooltip className="tooltip" id="16kTooltip" place="bottom-end" effect="solid" />
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

