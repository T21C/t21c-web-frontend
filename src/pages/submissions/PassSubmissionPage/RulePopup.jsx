import { CheckmarkIcon, CrossedPhoneIcon, CrossIcon } from "@/components/common/icons";
import { useTranslation } from "react-i18next";

import strict from "@/assets/icons/Strict.png"
import normal from "@/assets/icons/Normal.png"
import lenient from "@/assets/icons/Lenient.png"

const RulePopup = ({ setShowRulesPopup }) => {
  const { t } = useTranslation('components');
return (
    <div className="rules-popup-overlay" onClick={() => setShowRulesPopup(false)}>
      <div className="rules-popup" onClick={(e) => e.stopPropagation()}>
        <div className="rules-popup-header">
          <h2>{t('passSubmissionRules.title')}</h2>
          <button 
            className="rules-popup-close"
            onClick={() => setShowRulesPopup(false)}
          >
            {t('passSubmissionRules.close')}
          </button>
        </div>
        <div className="rules-popup-content">
          <div className="rules-section">
            <div className="main-rule-container">
            <h2 className="main-rule-title">{t('passSubmissionRules.strictOnly.title')}</h2>
            <div className="judgement-rule-icons">

              <div className="other-judgements-rule-icon-container">
                <img className="other-judgements-rule-icon" src={normal} alt="normal" />
                <CrossIcon className="cross-icon" color="#ff0000bb" size={55} />
              </div>
              <div className="strict-rule-icon-container">
                <img className="strict-rule-icon" src={strict} alt="strict" />
                <CheckmarkIcon color="#44ee44" size={38} />
              </div>
              <div className="other-judgements-rule-icon-container">
                <img className="other-judgements-rule-icon" src={lenient} alt="lenient" />
                <CrossIcon className="cross-icon" color="#ff0000bb" size={55} />
              </div>
            </div>
            <span className="rule-important">{t('passSubmissionRules.strictOnly.note')}</span>
            </div>
            <br/>
            <div className="main-rule-container">
              <h2 className="main-rule-title content-shadow">{t('passSubmissionRules.noMobile.title')}</h2>
                <div className="crossed-phone-container">
                  <CrossedPhoneIcon color="#ff2424" size={80} />
                </div>
            </div>
          </div>

          <div className="rules-section info">
            <h3>{t('passSubmissionRules.clearRules.title')}</h3>
            <p>{t('passSubmissionRules.clearRules.intro')}</p>
          </div>

          <div className="rules-section high-importance">
            <h3>{t('passSubmissionRules.rules.rule1.title')}</h3>
            <ul>
              <li><span className="offense-level third">{t('passSubmissionRules.rules.rule1.offenses.first')}</span> {t('passSubmissionRules.rules.rule1.penalties.first')}</li>
              <li><span className="offense-level second">{t('passSubmissionRules.rules.rule1.offenses.second')}</span> {t('passSubmissionRules.rules.rule1.penalties.second')}</li>
              <li><span className="offense-level first">{t('passSubmissionRules.rules.rule1.offenses.third')}</span> {t('passSubmissionRules.rules.rule1.penalties.third')}</li>
            </ul>
            <div className="explanation">
              <strong>Explanation:</strong> {t('passSubmissionRules.rules.rule1.explanation')}</div>
            </div>
          </div>

          <div className="rules-section high-importance">
            <h3>{t('passSubmissionRules.rules.rule2.title')}</h3>
            <ul>
              <li><span className="offense-level third">{t('passSubmissionRules.rules.rule2.offenses.first')}</span> {t('passSubmissionRules.rules.rule2.penalties.first')}</li>
              <li><span className="offense-level second">{t('passSubmissionRules.rules.rule2.offenses.second')}</span> {t('passSubmissionRules.rules.rule2.penalties.second')}</li>
              <li><span className="offense-level first">{t('passSubmissionRules.rules.rule2.offenses.third')}</span> {t('passSubmissionRules.rules.rule2.penalties.third')}</li>
            </ul>
            <div className="explanation">
              <strong>Explanation:</strong> {t('passSubmissionRules.rules.rule2.explanation')}
            </div>
          </div>

          <div className="rules-section critical">
            <h3>{t('passSubmissionRules.rules.rule3.title')}</h3>
            <ul>
              <li><span className="offense-level second">{t('passSubmissionRules.rules.rule3.offenses.first')}</span> {t('passSubmissionRules.rules.rule3.penalties.first')}</li>
              <li><span className="offense-level first">{t('passSubmissionRules.rules.rule3.offenses.second')}</span> {t('passSubmissionRules.rules.rule3.penalties.second')}</li>
            </ul>
            <div className="explanation">
              <strong>Explanation:</strong> {t('passSubmissionRules.rules.rule3.explanation')}
            </div>
          </div>

          <div className="rules-section critical">
            <h3>{t('passSubmissionRules.rules.rule4.title')}</h3>
            <ul>
              <li><span className="offense-level first">{t('passSubmissionRules.rules.rule4.offenses.first')}</span> {t('passSubmissionRules.rules.rule4.penalties.first')}</li>
            </ul>
            <div className="explanation">
              <strong>Explanation:</strong> {t('passSubmissionRules.rules.rule4.explanation')}
            </div>
          </div>

          <div className="rules-section critical">
            <h3>{t('passSubmissionRules.rules.rule5.title')}</h3>
            <ul>
              <li><span className="offense-level first">{t('passSubmissionRules.rules.rule5.offenses.first')}</span> {t('passSubmissionRules.rules.rule5.penalties.first')}</li>
            </ul>
            <div className="explanation">
              <strong>Explanation:</strong> {t('passSubmissionRules.rules.rule5.explanation')}
            </div>
          </div>

          <div className="rules-section medium-importance">
            <h3>{t('passSubmissionRules.rules.rule6.title')}</h3>
            <ul>
              <li><span className="offense-level required">{t('passSubmissionRules.rules.rule6.required.label')}</span> {t('passSubmissionRules.rules.rule6.required.text')}</li>
            </ul>
            <div className="explanation">
              <strong>Explanation:</strong> {t('passSubmissionRules.rules.rule6.explanation')}
            </div>
          </div>

          <div className="rules-section standard">
            <h3>{t('passSubmissionRules.rules.rule7.title')}</h3>
            <ul>
              <li><strong>{t('passSubmissionRules.rules.rule7.allowed')}</strong> {t('passSubmissionRules.rules.rule7.allowedText')}</li>
              <li><strong>{t('passSubmissionRules.rules.rule7.notAllowed')}</strong> {t('passSubmissionRules.rules.rule7.notAllowedText')}</li>
              <li><strong>{t('passSubmissionRules.rules.rule7.specialCase')}</strong> {t('passSubmissionRules.rules.rule7.specialCaseText')}</li>
            </ul>
            <div className="explanation">
              <strong>Explanation:</strong> {t('passSubmissionRules.rules.rule7.explanation')}
              <br/> <br/>
              <strong>Note:</strong> {t('passSubmissionRules.rules.rule7.note')}
            </div>
          </div>

          <div className="rules-section standard">
            <h3>{t('passSubmissionRules.rules.rule8.title')}</h3>
            <ul>
              <li><span className="offense-level case-by-case">{t('passSubmissionRules.rules.rule8.caseByCase.label')}</span> {t('passSubmissionRules.rules.rule8.caseByCase.text')}</li>
            </ul>
            <div className="explanation">
              <strong>Explanation:</strong> {t('passSubmissionRules.rules.rule8.explanation')}
            </div>
          </div>

          <div className="rules-section info">
            <p><strong>Note:</strong> {t('passSubmissionRules.footer.note')}</p>
          </div>
        </div>
      </div>
  );
};

export default RulePopup;