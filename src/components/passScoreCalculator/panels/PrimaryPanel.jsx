// tuf-search: #PrimaryPanel #passScoreCalculator
import { useState } from 'react';
import { ScoreV2Graph } from '@/components/common/display/ScoreV2Graph/ScoreV2Graph';
import { useTranslation } from 'react-i18next';

export function PrimaryPanel({ result, difficultyDict }) {
  const { t } = useTranslation('pages');
  const [disablePP, setDisablePP] = useState(false);
  if (!result?.primary) return null;
  const p = result.primary;

  return (
    <div className="psc-panel psc-panel--primary">
      <h3>{t('passSubmission.calculator.panels.primary')}</h3>
      <div className="psc-primary-grid">
        <div className="psc-stat">
          <span className="psc-stat__label">{t('passSubmission.calculator.labels.score')}</span>
          <span className="psc-stat__value">{p.scoreV2.toFixed(2)}</span>
        </div>
        <div className="psc-stat">
          <span className="psc-stat__label">{t('passSubmission.calculator.labels.accuracy')}</span>
          <span className="psc-stat__value">{(p.accuracy * 100).toFixed(4)}%</span>
        </div>
        <div className="psc-stat">
          <span className="psc-stat__label">{t('passSubmission.calculator.labels.base')}</span>
          <span className="psc-stat__value">{p.base.toFixed(2)}</span>
        </div>
        <div className="psc-stat">
          <span className="psc-stat__label">{t('passSubmission.calculator.labels.xaccMtp')}</span>
          <span className="psc-stat__value">{p.xaccMtp.toFixed(4)}</span>
        </div>
        <div className="psc-stat">
          <span className="psc-stat__label">{t('passSubmission.calculator.labels.speedMtp')}</span>
          <span className="psc-stat__value">{p.speedMtp.toFixed(4)}</span>
        </div>
        <div className="psc-stat">
          <span className="psc-stat__label">{t('passSubmission.calculator.labels.missMtp')}</span>
          <span className="psc-stat__value">{p.missMtp.toFixed(4)}</span>
        </div>
        <div className="psc-stat">
          <span className="psc-stat__label">{t('passSubmission.calculator.labels.noHold')}</span>
          <span className="psc-stat__value">×{p.noHoldFactor.toFixed(2)}</span>
        </div>
      </div>
      {result.levelCtx && (
        <div className="psc-graph-wrap">
          <div className="psc-graph-toolbar">
            <label className="psc-pp-toggle">
              <input
                type="checkbox"
                checked={disablePP}
                onChange={(e) => setDisablePP(e.target.checked)}
              />
              <span>
                {t('levelDetail.scoreGraph.disablePP', {
                  defaultValue: 'Disable PP',
                })}
              </span>
            </label>
          </div>
          <ScoreV2Graph
            tilecount={p.hitTiles}
            levelData={result.levelCtx}
            difficultyDict={difficultyDict}
            speed={p.speed}
            isNoHoldTap={p.isNoHoldTap}
            disablePP={disablePP}
          />
        </div>
      )}
    </div>
  );
}
