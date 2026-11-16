// tuf-search: #AuthenticatorPopup #authenticatorPopup #popups #users #authenticator
import React, {useEffect, useRef, useState} from 'react';
import {toast} from 'react-hot-toast';
import {useTranslation} from 'react-i18next';
import QRCode from 'qrcode';
import {CloseButton} from '@/components/common/buttons';
import {PopupShell} from '@/components/common/PopupShell';
import CodeInput from '@/components/account/CodeInput/CodeInput';
import {useElevation} from '@/contexts/ElevationContext';
import {useAuth} from '@/contexts/AuthContext';
import './authenticatorPopup.css';

function formatSecret(secret) {
  return String(secret || '')
    .replace(/(.{4})/g, '$1 ')
    .trim();
}

const AuthenticatorPopup = ({isOpen, totpEnabled = false, onClose, onChanged}) => {
  const {t} = useTranslation(['pages', 'common']);
  const {requireElevation} = useElevation();
  const {setupTotp, confirmTotp, regenerateTotpRecovery, disableTotp} = useAuth();

  const [ready, setReady] = useState(false);
  const [step, setStep] = useState('intro');
  const [otpauthUri, setOtpauthUri] = useState('');
  const [secret, setSecret] = useState('');
  const [qrUrl, setQrUrl] = useState('');
  const [enrollCode, setEnrollCode] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState([]);
  const [savedChecked, setSavedChecked] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [busy, setBusy] = useState(false);
  const elevatingRef = useRef(false);

  useEffect(() => {
    if (!isOpen) {
      setReady(false);
      elevatingRef.current = false;
      setStep('intro');
      setOtpauthUri('');
      setSecret('');
      setQrUrl('');
      setEnrollCode('');
      setVerifyCode('');
      setRecoveryCodes([]);
      setSavedChecked(false);
      setPendingAction(null);
      setBusy(false);
      return undefined;
    }

    setStep(totpEnabled ? 'manage' : 'intro');
    setOtpauthUri('');
    setSecret('');
    setQrUrl('');
    setEnrollCode('');
    setVerifyCode('');
    setRecoveryCodes([]);
    setSavedChecked(false);
    setPendingAction(null);

    if (elevatingRef.current) return undefined;
    elevatingRef.current = true;

    let cancelled = false;
    (async () => {
      try {
        await requireElevation('security', async () => {});
        if (!cancelled) setReady(true);
      } catch (err) {
        if (err?.code === 'ELEVATION_CANCELLED') {
          onClose();
          return;
        }
        toast.error(
          err?.response?.data?.message ||
            err?.message ||
            t('settings.security.authenticator.failed'),
        );
        onClose();
      }
    })();

    return () => {
      cancelled = true;
    };
    // Intentionally only re-run when the popup opens/closes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(() => {
    if (!otpauthUri) {
      setQrUrl('');
      return undefined;
    }
    let cancelled = false;
    QRCode.toDataURL(otpauthUri, {
      margin: 1,
      width: 220,
      color: {dark: '#111111', light: '#ffffff'},
    })
      .then((url) => {
        if (!cancelled) setQrUrl(url);
      })
      .catch(() => {
        if (!cancelled) setQrUrl('');
      });
    return () => {
      cancelled = true;
    };
  }, [otpauthUri]);

  const requestClose = () => {
    if (busy) return;
    if (step === 'recovery' && !savedChecked) {
      toast.error(t('settings.security.authenticator.saveBeforeClose'));
      return;
    }
    onClose();
  };

  const showRecovery = (codes) => {
    setRecoveryCodes(Array.isArray(codes) ? codes : []);
    setSavedChecked(false);
    setStep('recovery');
  };

  const handleStartSetup = async () => {
    setBusy(true);
    try {
      const data = await requireElevation('security', () => setupTotp());
      setOtpauthUri(data?.otpauthUri || '');
      setSecret(data?.secret || '');
      setEnrollCode('');
      setStep('enroll');
    } catch (err) {
      if (err?.code === 'ELEVATION_CANCELLED') return;
      toast.error(err?.response?.data?.message || t('settings.security.authenticator.setupFailed'));
    } finally {
      setBusy(false);
    }
  };

  const handleConfirmEnroll = async (e) => {
    e.preventDefault();
    if (enrollCode.length < 6) {
      toast.error(t('settings.security.authenticator.codeRequired'));
      return;
    }
    setBusy(true);
    try {
      const data = await requireElevation('security', () => confirmTotp({code: enrollCode}));
      showRecovery(data?.recoveryCodes);
      onChanged?.();
      toast.success(t('settings.security.authenticator.enabledToast'));
    } catch (err) {
      if (err?.code === 'ELEVATION_CANCELLED') return;
      toast.error(err?.response?.data?.message || t('settings.security.authenticator.confirmFailed'));
    } finally {
      setBusy(false);
    }
  };

  const beginVerify = (action) => {
    setPendingAction(action);
    setVerifyCode('');
    setStep('verify');
  };

  const handleVerifySubmit = async (e) => {
    e.preventDefault();
    if (!verifyCode.trim()) {
      toast.error(t('settings.security.authenticator.codeRequired'));
      return;
    }
    setBusy(true);
    try {
      if (pendingAction === 'disable') {
        await requireElevation('security', () => disableTotp({code: verifyCode}));
        toast.success(t('settings.security.authenticator.disabledToast'));
        onChanged?.();
        onClose();
        return;
      }
      if (pendingAction === 'regenerate') {
        const data = await requireElevation('security', () =>
          regenerateTotpRecovery({code: verifyCode}),
        );
        toast.success(t('settings.security.authenticator.codesRegeneratedToast'));
        onChanged?.();
        showRecovery(data?.recoveryCodes);
        return;
      }
      if (pendingAction === 'replace') {
        const data = await requireElevation('security', () => setupTotp({code: verifyCode}));
        setOtpauthUri(data?.otpauthUri || '');
        setSecret(data?.secret || '');
        setEnrollCode('');
        setStep('enroll');
        return;
      }
    } catch (err) {
      if (err?.code === 'ELEVATION_CANCELLED') return;
      const fallback =
        pendingAction === 'disable'
          ? t('settings.security.authenticator.disableFailed')
          : pendingAction === 'regenerate'
            ? t('settings.security.authenticator.regenerateFailed')
            : t('settings.security.authenticator.setupFailed');
      toast.error(err?.response?.data?.message || fallback);
    } finally {
      setBusy(false);
    }
  };

  const handleCopySecret = async () => {
    try {
      await navigator.clipboard.writeText(secret);
      toast.success(t('settings.security.authenticator.copied'));
    } catch {
      toast.error(t('settings.security.authenticator.failed'));
    }
  };

  const handleCopyCodes = async () => {
    try {
      await navigator.clipboard.writeText(recoveryCodes.join('\n'));
      toast.success(t('settings.security.authenticator.copiedCodes'));
    } catch {
      toast.error(t('settings.security.authenticator.failed'));
    }
  };

  const handleDownloadCodes = () => {
    if (recoveryCodes.length === 0) return;
    const blob = new Blob([`${recoveryCodes.join('\n')}\n`], {
      type: 'text/plain;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'tuf-authenticator-recovery-codes.txt';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    toast.success(t('settings.security.authenticator.downloadedCodes'));
  };

  if (!isOpen || !ready) return null;

  const verifyTitleKey =
    pendingAction === 'disable'
      ? 'settings.security.authenticator.verifyTitleDisable'
      : pendingAction === 'regenerate'
        ? 'settings.security.authenticator.verifyTitleRegenerate'
        : 'settings.security.authenticator.verifyTitleReplace';

  return (
    <PopupShell
      onClose={requestClose}
      closeDisabled={busy}
      overlayClassName="authenticator-popup-overlay"
      panelClassName="authenticator-popup"
      ariaLabelledBy="authenticator-popup-title"
    >
      <div className="authenticator-popup-header">
        <h2 id="authenticator-popup-title">{t('settings.security.authenticator.popupTitle')}</h2>
        <CloseButton
          variant="inline"
          className="authenticator-popup-close"
          onClick={requestClose}
          disabled={busy}
          aria-label={t('buttons.close', {ns: 'common'})}
        />
      </div>

      {step === 'intro' && (
        <div className="authenticator-popup-body">
          <p>{t('settings.security.authenticator.intro')}</p>
          <div className="authenticator-popup-actions">
            <button
              type="button"
              className="authenticator-popup-btn authenticator-popup-btn-secondary"
              onClick={requestClose}
              disabled={busy}
            >
              {t('buttons.cancel', {ns: 'common'})}
            </button>
            <button
              type="button"
              className="authenticator-popup-btn authenticator-popup-btn-primary"
              onClick={handleStartSetup}
              disabled={busy}
            >
              {busy
                ? t('settings.security.authenticator.starting')
                : t('settings.security.authenticator.startSetup')}
            </button>
          </div>
        </div>
      )}

      {step === 'enroll' && (
        <form className="authenticator-popup-body" onSubmit={handleConfirmEnroll}>
          <p>{t('settings.security.authenticator.scanQr')}</p>
          {qrUrl ? (
            <img
              className="authenticator-popup-qr"
              src={qrUrl}
              alt={t('settings.security.authenticator.qrAlt')}
            />
          ) : (
            <p className="authenticator-popup-manual">{t('settings.security.authenticator.qrWait')}</p>
          )}
          <div className="authenticator-popup-secret">
            <span>{t('settings.security.authenticator.manualKey')}</span>
            <code>{formatSecret(secret)}</code>
            <button
              type="button"
              className="authenticator-popup-btn authenticator-popup-btn-secondary"
              onClick={handleCopySecret}
              disabled={busy || !secret}
            >
              {t('settings.security.authenticator.copyKey')}
            </button>
          </div>
          <CodeInput
            id="authenticator-enroll-code"
            label={t('settings.security.authenticator.codeLabel')}
            value={enrollCode}
            onChange={setEnrollCode}
            disabled={busy}
            length={6}
            numeric
          />
          <div className="authenticator-popup-actions">
            <button
              type="button"
              className="authenticator-popup-btn authenticator-popup-btn-secondary"
              onClick={() => setStep(totpEnabled ? 'manage' : 'intro')}
              disabled={busy}
            >
              {t('settings.security.authenticator.back')}
            </button>
            <button
              type="submit"
              className="authenticator-popup-btn authenticator-popup-btn-primary"
              disabled={busy || enrollCode.length < 6}
            >
              {busy
                ? t('settings.security.authenticator.enabling')
                : t('settings.security.authenticator.confirm')}
            </button>
          </div>
        </form>
      )}

      {step === 'recovery' && (
        <div className="authenticator-popup-body">
          <p>{t('settings.security.authenticator.recoveryBody')}</p>
          <ul className="authenticator-popup-codes">
            {recoveryCodes.map((code) => (
              <li key={code}>{code}</li>
            ))}
          </ul>
          <div className="authenticator-popup-code-actions">
            <button
              type="button"
              className="authenticator-popup-btn authenticator-popup-btn-secondary"
              onClick={handleCopyCodes}
              disabled={busy || recoveryCodes.length === 0}
            >
              {t('settings.security.authenticator.copyCodes')}
            </button>
            <button
              type="button"
              className="authenticator-popup-btn authenticator-popup-btn-secondary"
              onClick={handleDownloadCodes}
              disabled={busy || recoveryCodes.length === 0}
            >
              {t('settings.security.authenticator.downloadCodes')}
            </button>
          </div>
          <label className="authenticator-popup-check">
            <input
              type="checkbox"
              checked={savedChecked}
              onChange={(e) => setSavedChecked(e.target.checked)}
              disabled={busy}
            />
            <span>{t('settings.security.authenticator.savedConfirm')}</span>
          </label>
          <div className="authenticator-popup-actions">
            <button
              type="button"
              className="authenticator-popup-btn authenticator-popup-btn-primary authenticator-popup-btn-block"
              onClick={onClose}
              disabled={busy || !savedChecked}
            >
              {t('settings.security.authenticator.done')}
            </button>
          </div>
        </div>
      )}

      {step === 'manage' && (
        <div className="authenticator-popup-body">
          <p>{t('settings.security.authenticator.manageBody')}</p>
          <div className="authenticator-popup-manage">
            <button
              type="button"
              className="authenticator-popup-btn authenticator-popup-btn-secondary authenticator-popup-btn-block"
              onClick={() => beginVerify('regenerate')}
              disabled={busy}
            >
              {t('settings.security.authenticator.regenerate')}
            </button>
            <button
              type="button"
              className="authenticator-popup-btn authenticator-popup-btn-secondary authenticator-popup-btn-block"
              onClick={() => beginVerify('replace')}
              disabled={busy}
            >
              {t('settings.security.authenticator.replace')}
            </button>
            <button
              type="button"
              className="authenticator-popup-btn authenticator-popup-btn-danger authenticator-popup-btn-block"
              onClick={() => beginVerify('disable')}
              disabled={busy}
            >
              {t('settings.security.authenticator.disable')}
            </button>
          </div>
        </div>
      )}

      {step === 'verify' && (
        <form className="authenticator-popup-body" onSubmit={handleVerifySubmit}>
          <p>{t(verifyTitleKey)}</p>
          <p>{t('settings.security.authenticator.verifyBody')}</p>
          <label className="authenticator-popup-field" htmlFor="authenticator-verify-code">
            {t('settings.security.authenticator.verifyLabel')}
          </label>
          <input
            id="authenticator-verify-code"
            type="text"
            autoComplete="one-time-code"
            className="authenticator-popup-input"
            value={verifyCode}
            onChange={(e) => setVerifyCode(e.target.value)}
            disabled={busy}
            spellCheck={false}
          />
          <div className="authenticator-popup-actions">
            <button
              type="button"
              className="authenticator-popup-btn authenticator-popup-btn-secondary"
              onClick={() => setStep('manage')}
              disabled={busy}
            >
              {t('settings.security.authenticator.back')}
            </button>
            <button
              type="submit"
              className="authenticator-popup-btn authenticator-popup-btn-primary"
              disabled={busy || !verifyCode.trim()}
            >
              {busy
                ? t('settings.security.authenticator.verifying')
                : t('settings.security.authenticator.verifySubmit')}
            </button>
          </div>
        </form>
      )}
    </PopupShell>
  );
};

export default AuthenticatorPopup;
