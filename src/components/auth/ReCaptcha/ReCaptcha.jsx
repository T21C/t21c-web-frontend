// tuf-search: #ReCaptcha #reCaptcha #auth
import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';

const RECAPTCHA_SCRIPT_SRC = 'https://www.google.com/recaptcha/api.js?render=explicit';

/** @type {Promise<void> | null} */
let scriptLoadPromise = null;

function ensureRecaptchaScript() {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('reCAPTCHA requires a browser'));
  }
  if (window.grecaptcha?.render) {
    return Promise.resolve();
  }
  if (scriptLoadPromise) {
    return scriptLoadPromise;
  }

  scriptLoadPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${RECAPTCHA_SCRIPT_SRC}"]`)
      || document.querySelector('script[src^="https://www.google.com/recaptcha/api.js"]');

    const finish = () => {
      if (window.grecaptcha?.ready) {
        window.grecaptcha.ready(() => resolve());
      } else if (window.grecaptcha?.render) {
        resolve();
      } else {
        reject(new Error('reCAPTCHA failed to load'));
      }
    };

    if (existing) {
      if (window.grecaptcha?.render) {
        finish();
        return;
      }
      existing.addEventListener('load', finish, { once: true });
      existing.addEventListener('error', () => reject(new Error('reCAPTCHA script error')), {
        once: true,
      });
      return;
    }

    const script = document.createElement('script');
    script.src = RECAPTCHA_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = finish;
    script.onerror = () => {
      scriptLoadPromise = null;
      reject(new Error('reCAPTCHA script error'));
    };
    document.head.appendChild(script);
  });

  return scriptLoadPromise;
}

/**
 * Self-managing reCAPTCHA v2 checkbox.
 * Owns token state + reset; embed and call ref.reset() after failed submits.
 *
 * @param {{ onChange?: (token: string | null) => void, className?: string }} props
 */
const ReCAPTCHA = forwardRef(function ReCAPTCHA({ onChange, className = '' }, ref) {
  const containerRef = useRef(null);
  const widgetIdRef = useRef(null);
  const onChangeRef = useRef(onChange);
  const [token, setToken] = useState(null);
  const [remountKey, setRemountKey] = useState(0);
  const [scriptReady, setScriptReady] = useState(
    () => Boolean(typeof window !== 'undefined' && window.grecaptcha?.render),
  );

  onChangeRef.current = onChange;

  const emitChange = useCallback((next) => {
    setToken(next);
    onChangeRef.current?.(next);
  }, []);

  const reset = useCallback(() => {
    emitChange(null);
    if (widgetIdRef.current !== null && window.grecaptcha?.reset) {
      try {
        window.grecaptcha.reset(widgetIdRef.current);
        return;
      } catch (error) {
        console.error('Error resetting reCAPTCHA:', error);
      }
    }
    widgetIdRef.current = null;
    setRemountKey((prev) => prev + 1);
  }, [emitChange]);

  useImperativeHandle(
    ref,
    () => ({
      reset,
      getToken: () => token,
    }),
    [reset, token],
  );

  useEffect(() => {
    let cancelled = false;
    ensureRecaptchaScript()
      .then(() => {
        if (!cancelled) setScriptReady(true);
      })
      .catch((error) => {
        console.error(error);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!scriptReady || !containerRef.current || !window.grecaptcha?.render) {
      return undefined;
    }

    if (widgetIdRef.current !== null) {
      return undefined;
    }

    try {
      widgetIdRef.current = window.grecaptcha.render(containerRef.current, {
        sitekey: import.meta.env.VITE_RECAPTCHA_SITE_KEY,
        callback: (response) => {
          emitChange(response);
        },
        'expired-callback': () => {
          emitChange(null);
        },
        'error-callback': () => {
          emitChange(null);
        },
      });
    } catch (error) {
      console.error('Error rendering reCAPTCHA:', error);
      widgetIdRef.current = null;
    }

    return () => {
      widgetIdRef.current = null;
    };
  }, [scriptReady, remountKey, emitChange]);

  return (
    <div className={['recaptcha', className].filter(Boolean).join(' ')} data-remount={remountKey}>
      <div key={remountKey} ref={containerRef} />
    </div>
  );
});

export default ReCAPTCHA;
