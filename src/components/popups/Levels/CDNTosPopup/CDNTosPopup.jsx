import { useTranslation } from 'react-i18next';
import './cdntospopup.css';
import { useState } from 'react';

const CDN_TOS_AGREED_KEY = 'cdn_tos_agreed';

const CDNTosPopup = ({ onAgree, onDecline }) => {
    const { t } = useTranslation('pages');
    const [dontShowAgain, setDontShowAgain] = useState(false);

    const handleAgree = () => {
        if (dontShowAgain) {
            localStorage.setItem(CDN_TOS_AGREED_KEY, 'true');
        }
        onAgree();
    };

    const handleTosClick = (e) => {
        e.preventDefault();
        window.open('/terms-of-service', '_blank');
    };

    return (
        <div className="cdn-tos-popup">
            <div className="cdn-tos-content">
                <h3>{t('levelSubmission.cdnTos.title')}</h3>
                <div className="cdn-tos-text">
                    <p>
                        {t('levelSubmission.cdnTos.content')}{' '}
                        <a href="/terms-of-service" onClick={handleTosClick} className="tos-link">
                            {t('levelSubmission.cdnTos.tosLink')}
                        </a>
                    </p>
                    <p className="confirmation-text">{t('levelSubmission.cdnTos.confirmation')}</p>
                    <ul>
                        <li>{t('levelSubmission.cdnTos.terms.1')}</li>
                        <li>{t('levelSubmission.cdnTos.terms.2')}</li>
                    </ul>
                </div>
                <div className="cdn-tos-actions">
                    <div className="cdn-tos-buttons">
                        <label className="dont-show-again">
                        <input 
                            type="checkbox" 
                            onChange={(e) => setDontShowAgain(e.target.checked)}
                        />
                        {t('levelSubmission.cdnTos.dontShowAgain')}
                        </label>
                        <button onClick={onDecline} className="decline-btn">
                            {t('levelSubmission.cdnTos.decline')}
                        </button>
                        <button onClick={handleAgree} className="agree-btn">
                            {t('levelSubmission.cdnTos.agree')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CDNTosPopup;