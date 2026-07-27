// tuf-search: #main #entry — Vite entry
import '@/assets/important/dark/background-blurred.jpg';
import ReactDOM from 'react-dom/client';
import * as Sentry from '@sentry/react';
import App from '@/App';
import ErrorPage from '@/pages/misc/ErrorPage/ErrorPage';
import '@/index.css';

import { BrowserRouter } from 'react-router-dom';
import { LevelContextProvider } from '@/contexts/LevelContext';
import { I18nextProvider } from "react-i18next";
import { GoogleOAuthProvider } from "@react-oauth/google"
import { AuthProvider } from '@/contexts/AuthContext';
import { PlayerContextProvider } from '@/contexts/PlayerContext';
import { PassContextProvider } from '@/contexts/PassContext';  
import { DifficultyContextProvider } from '@/contexts/DifficultyContext';
import { PackContextProvider } from '@/contexts/PackContext';
import { HelmetProvider } from 'react-helmet-async';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { ArtistContextProvider } from '@/contexts/ArtistContext';
import { SongContextProvider } from '@/contexts/SongContext';
import { CreatorListContextProvider } from '@/contexts/CreatorListContext';
import { CreatorProfileContextProvider } from '@/contexts/CreatorProfileContext';
import i18next from '@/translations/config';
import { RatingFilterProvider } from '@/contexts/RatingFilterContext';
import { ProfileContextProvider } from '@/contexts/ProfileContext';
import { LinkConfirmProvider } from '@/components/common/LinkConfirm';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const isBrowserExtensionUrl = (url) =>
  typeof url === 'string' &&
  /^(chrome|moz|safari|safari-web|ms-browser)-extension:\/\//i.test(url);

const isExtensionOriginatedEvent = (event) => {
  const frames = event.exception?.values?.flatMap(
    (value) => value.stacktrace?.frames ?? [],
  ) ?? [];

  if (frames.length === 0) return false;

  // Drop only when every frame is extension-hosted (no first-party app frames).
  return frames.every((frame) => isBrowserExtensionUrl(frame.filename));
};

const isExternalDomMutationNoise = (event) => {
  const values = event.exception?.values ?? [];
  return values.some((value) => {
    const type = value.type || '';
    const message = value.value || '';
    return (
      (type === 'NotFoundError' || type === 'DOMException') &&
      /Failed to execute 'removeChild' on 'Node'/i.test(message)
    );
  });
};

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  enabled: Boolean(import.meta.env.VITE_SENTRY_DSN) && !import.meta.env.DEV,
  sendDefaultPii: true,
  // Browser extensions / page translators mutate React-owned DOM; React then
  // throws NotFoundError on removeChild during commit. Unfixable from app code.
  ignoreErrors: [
    /Failed to execute 'removeChild' on 'Node': The node to be removed is not a child of this node/i,
  ],
  denyUrls: [
    /^chrome-extension:\/\//i,
    /^moz-extension:\/\//i,
    /^safari-extension:\/\//i,
    /^safari-web-extension:\/\//i,
    /^ms-browser-extension:\/\//i,
  ],
  beforeSend(event) {
    if (isExtensionOriginatedEvent(event) || isExternalDomMutationNoise(event)) {
      return null;
    }
    return event;
  },
});

if ('scrollRestoration' in history) {
  history.scrollRestoration = 'manual';
}

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

// i love my little chud pyramid of doom
ReactDOM.createRoot(document.getElementById('root')).render(
  <Sentry.ErrorBoundary fallback={(errorData) => <ErrorPage {...errorData} />}>
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <GoogleOAuthProvider clientId='886035995245-8735p49ljpm17btvst50pp8qbg73t7s4.apps.googleusercontent.com'>
            <AuthProvider>
              <DifficultyContextProvider>
                <LevelContextProvider>
                  <NotificationProvider>
                    <I18nextProvider i18n={i18next}>
                      <PlayerContextProvider>
                        <ProfileContextProvider>
                          <LinkConfirmProvider>
                          <RatingFilterProvider>
                            <PassContextProvider>
                              <PackContextProvider>
                                <ArtistContextProvider>
                                  <SongContextProvider>
                                    <CreatorListContextProvider>
                                      <CreatorProfileContextProvider>
                                        <App />
                                      </CreatorProfileContextProvider>
                                    </CreatorListContextProvider>
                                  </SongContextProvider>
                                </ArtistContextProvider>
                              </PackContextProvider>
                            </PassContextProvider>
                          </RatingFilterProvider>
                          </LinkConfirmProvider>
                        </ProfileContextProvider>
                      </PlayerContextProvider>
                    </I18nextProvider>
                  </NotificationProvider>
                </LevelContextProvider>
              </DifficultyContextProvider>  
            </AuthProvider>
          </GoogleOAuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </HelmetProvider>
  </Sentry.ErrorBoundary>
);
