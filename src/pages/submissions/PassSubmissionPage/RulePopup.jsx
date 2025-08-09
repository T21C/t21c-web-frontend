import { CheckmarkIcon, CrossedPhoneIcon, CrossIcon } from "@/components/common/icons";
import { useTranslation } from "react-i18next";

import strict from "@/assets/icons/Strict.png"
import normal from "@/assets/icons/Normal.png"
import lenient from "@/assets/icons/Lenient.png"

const RulePopup = ({ setShowRulesPopup }) => {
  const { t } = useTranslation('components');
  const tRules = (key, params = {}) => t(`passSubmissionRules.${key}`, params);
return (
    <div className="rules-popup-overlay" onClick={() => setShowRulesPopup(false)}>
      <div className="rules-popup" onClick={(e) => e.stopPropagation()}>
        <div className="rules-popup-header">
          <h2>{tRules("title")}</h2>
          <button 
            className="rules-popup-close"
            onClick={() => setShowRulesPopup(false)}
          >
            {tRules("close")}
          </button>
        </div>
        <div className="rules-popup-content">
          <div className="rules-section">
            <div className="main-rule-container">
            <h2 className="main-rule-title">{tRules("strictOnly.title")}</h2>
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
            <span className="rule-important">{tRules("strictOnly.note")}</span>
            </div>
            <br/>
            <div className="main-rule-container">
              <h2 className="main-rule-title content-shadow">{tRules("noMobile.title")}</h2>
                <div className="crossed-phone-container">
                  <CrossedPhoneIcon color="#ff2424" size={80} />
                </div>
            </div>
          </div>

          <div className="rules-section info">
            <h3>{tRules("clearRules.title")}</h3>
            <p>{tRules("clearRules.intro")}</p>
          </div>

          <div className="rules-section high-importance">
            <h3>{tRules("rules.rule1.title")}</h3>
            <ul>
              <li><span className="offense-level first">{tRules("rules.rule1.offenses.first")}</span> {tRules("rules.rule1.penalties.first")}</li>
              <li><span className="offense-level second">{tRules("rules.rule1.offenses.second")}</span> {tRules("rules.rule1.penalties.second")}</li>
              <li><span className="offense-level third">{tRules("rules.rule1.offenses.third")}</span> {tRules("rules.rule1.penalties.third")}</li>
            </ul>
            <div className="explanation">
              <strong>Explanation:</strong> {tRules("rules.rule1.explanation")}
            </div>
          </div>

          <div className="rules-section high-importance">
            <h3>{tRules("rules.rule2.title")}</h3>
            <ul>
              <li><span className="offense-level first">{tRules("rules.rule2.offenses.first")}</span> {tRules("rules.rule2.penalties.first")}</li>
              <li><span className="offense-level second">{tRules("rules.rule2.offenses.second")}</span> {tRules("rules.rule2.penalties.second")}</li>
              <li><span className="offense-level third">{tRules("rules.rule2.offenses.third")}</span> {tRules("rules.rule2.penalties.third")}</li>
            </ul>
            <div className="explanation">
              <strong>Explanation:</strong> {tRules("rules.rule2.explanation")}
            </div>
          </div>

          <div className="rules-section critical">
            <h3>{tRules("rules.rule3.title")}</h3>
            <ul>
              <li><span className="offense-level first">{tRules("rules.rule3.offenses.first")}</span> {tRules("rules.rule3.penalties.first")}</li>
              <li><span className="offense-level second">{tRules("rules.rule3.offenses.second")}</span> {tRules("rules.rule3.penalties.second")}</li>
            </ul>
            <div className="explanation">
              <strong>Explanation:</strong> {tRules("rules.rule3.explanation")}
            </div>
          </div>

          <div className="rules-section critical">
            <h3>{tRules("rules.rule4.title")}</h3>
            <ul>
              <li><span className="offense-level first">{tRules("rules.rule4.offenses.first")}</span> {tRules("rules.rule4.penalties.first")}</li>
            </ul>
            <div className="explanation">
              <strong>Explanation:</strong> {tRules("rules.rule4.explanation")}
            </div>
          </div>

          <div className="rules-section critical">
            <h3>{tRules("rules.rule5.title")}</h3>
            <ul>
              <li><span className="offense-level first">{tRules("rules.rule5.offenses.first")}</span> {tRules("rules.rule5.penalties.first")}</li>
            </ul>
            <div className="explanation">
              <strong>Explanation:</strong> {tRules("rules.rule5.explanation")}
            </div>
          </div>

          <div className="rules-section medium-importance">
            <h3>{tRules("rules.rule6.title")}</h3>
            <ul>
              <li><span className="offense-level required">{tRules("rules.rule6.required.label")}</span> {tRules("rules.rule6.required.text")}</li>
            </ul>
            <div className="explanation">
              <strong>Explanation:</strong> {tRules("rules.rule6.explanation")}
            </div>
          </div>

          <div className="rules-section standard">
            <h3>{tRules("rules.rule7.title")}</h3>
            <ul>
              <li><strong>{tRules("rules.rule7.allowed")}</strong> {tRules("rules.rule7.allowedText")}</li>
              <li><strong>{tRules("rules.rule7.notAllowed")}</strong> {tRules("rules.rule7.notAllowedText")}</li>
              <li><strong>{tRules("rules.rule7.specialCase")}</strong> {tRules("rules.rule7.specialCaseText")}</li>
            </ul>
            <div className="explanation">
              <strong>Explanation:</strong> {tRules("rules.rule7.explanation")}
              <br/> <br/>
              <strong>Note:</strong> {tRules("rules.rule7.note")}
            </div>
          </div>

          <div className="rules-section standard">
            <h3>{tRules("rules.rule8.title")}</h3>
            <ul>
              <li><span className="offense-level case-by-case">{tRules("rules.rule8.caseByCase.label")}</span> {tRules("rules.rule8.caseByCase.text")}</li>
            </ul>
            <div className="explanation">
              <strong>Explanation:</strong> {tRules("rules.rule8.explanation")}
            </div>
          </div>

          <div className="rules-section info">
            <p><strong>Note:</strong> {tRules("footer.note")}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RulePopup;