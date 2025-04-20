import React, { useState, useEffect, useRef } from 'react';

const ReCAPTCHA = ({ onVerify }) => {
  const [recaptchaLoaded, setRecaptchaLoaded] = useState(false);
  const recaptchaRef = useRef(null);

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://www.google.com/recaptcha/api.js';
    script.async = true;
    script.defer = true;
    script.onload = () => setRecaptchaLoaded(true);
    document.head.appendChild(script);

    return () => {
      // Cleanup script on unmount
      document.head.removeChild(script);
    };
  }, []);

  useEffect(() => {
    if (recaptchaLoaded) {
      // Render the reCAPTCHA widget when the script is loaded
      console.log(import.meta.env.VITE_RECAPTCHA_SITE_KEY);
      
      window.grecaptcha.render(recaptchaRef.current, {
        sitekey: import.meta.env.VITE_RECAPTCHA_SITE_KEY, // Replace with your site key
        callback: (response) => {
          onVerify(response); // Call the onVerify function with the response
        },
      });
    }
  }, [recaptchaLoaded, onVerify]);

  return <div ref={recaptchaRef} />;
};

export default ReCAPTCHA;

