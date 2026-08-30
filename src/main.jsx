// tuf-search: #main #entry — Vite entry
import '@/assets/important/dark/background-blurred.jpg';
import ReactDOM from 'react-dom/client';
import { Sentry } from '@/hooks/useSentry';
import App from '@/App';
import ErrorPage from '@/pages/misc/ErrorPage/ErrorPage';
import '@/index.css';

import { BrowserRouter } from 'react-router-dom';
import { LevelContextProvider } from '@/contexts/LevelContext';
import { I18nextProvider } from "react-i18next";
import { AuthProvider } from '@/contexts/AuthContext';
import { ClientPreferencesProvider } from '@/contexts/ClientPreferencesContext';
import { ElevationProvider } from '@/contexts/ElevationContext';
import { ZenModeProvider } from '@/contexts/ZenModeContext';
import { PlayerContextProvider } from '@/contexts/PlayerContext';
import { PassContextProvider } from '@/contexts/PassContext';  
import { DifficultyContextProvider } from '@/contexts/DifficultyContext';
import { PackContextProvider } from '@/contexts/PackContext';
import { HelmetProvider } from 'react-helmet-async';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { InboxNotificationProvider } from '@/contexts/InboxNotificationContext';
import WebPushLifecycle from '@/components/push/WebPushLifecycle';
import { ArtistContextProvider } from '@/contexts/ArtistContext';
import { SongContextProvider } from '@/contexts/SongContext';
import { CreatorListContextProvider } from '@/contexts/CreatorListContext';
import { CreatorProfileContextProvider } from '@/contexts/CreatorProfileContext';
import i18next from '@/translations/config';
import { RatingFilterProvider } from '@/contexts/RatingFilterContext';
import { ProfileContextProvider } from '@/contexts/ProfileContext';
import { LinkConfirmProvider } from '@/components/common/LinkConfirm';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

if ('scrollRestoration' in history) {
  history.scrollRestoration = 'manual';
}

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        const status = error?.response?.status;
        // 4xx is an explicit answer for that resource; 401 is handled by the auth interceptor.
        if (typeof status === 'number' && status >= 400 && status < 500) return false;
        return failureCount < 4;
      },
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
            <AuthProvider>
              <ClientPreferencesProvider>
              <ElevationProvider>
              <ZenModeProvider>
              <DifficultyContextProvider>
                <LevelContextProvider>
                  <NotificationProvider>
                    <I18nextProvider i18n={i18next}>
                      <InboxNotificationProvider>
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
                                        <WebPushLifecycle />
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
                      </InboxNotificationProvider>
                    </I18nextProvider>
                  </NotificationProvider>
                </LevelContextProvider>
              </DifficultyContextProvider>
              </ZenModeProvider>
              </ElevationProvider>
              </ClientPreferencesProvider>
            </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </HelmetProvider>
  </Sentry.ErrorBoundary>
);
