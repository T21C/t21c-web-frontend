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
import { GoogleOAuthProvider } from "@react-oauth/google"
import { AuthProvider } from '@/contexts/AuthContext';
import { ElevationProvider } from '@/contexts/ElevationContext';
import { ZenModeProvider } from '@/contexts/ZenModeContext';
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
              <ElevationProvider>
              <ZenModeProvider>
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
              </ZenModeProvider>
              </ElevationProvider>
            </AuthProvider>
          </GoogleOAuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </HelmetProvider>
  </Sentry.ErrorBoundary>
);
