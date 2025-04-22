import React, { useState, useEffect, useRef } from 'react';

const ReCAPTCHA = ({ onVerify }) => {
  const [recaptchaLoaded, setRecaptchaLoaded] = useState(false);
  const recaptchaRef = useRef(null);
  const widgetIdRef = useRef(null);

  useEffect(() => {
    // Check if the script is already loaded
    if (window.grecaptcha && window.grecaptcha.render) {
      setRecaptchaLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://www.google.com/recaptcha/api.js';
    script.async = true;
    script.defer = true;
    script.onload = () => setRecaptchaLoaded(true);
    document.head.appendChild(script);

    return () => {
      // Cleanup script on unmount
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
  }, []);

  useEffect(() => {
    if (recaptchaLoaded && recaptchaRef.current && window.grecaptcha && window.grecaptcha.render) {
      try {
        // Only render if we don't already have a widget ID
        if (widgetIdRef.current === null) {
          // Render the reCAPTCHA widget when the script is loaded
          widgetIdRef.current = window.grecaptcha.render(recaptchaRef.current, {
            sitekey: import.meta.env.VITE_RECAPTCHA_SITE_KEY,
            callback: (response) => {
              onVerify(response);
            },
          });
        }
      } catch (error) {
        console.error('Error rendering reCAPTCHA:', error);
        // Reset widget ID to allow retry
        widgetIdRef.current = null;
      }
    }
  }, [recaptchaLoaded, onVerify]);

  // Reset widget ID when component is unmounted or key changes
  useEffect(() => {
    return () => {
      widgetIdRef.current = null;
    };
  }, []);

  return <div ref={recaptchaRef} />;
};

export default ReCAPTCHA;


