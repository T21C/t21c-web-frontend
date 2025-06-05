import ReactDOM from 'react-dom/client';
import App from '@/App';
import '@/index.css';
import { BrowserRouter } from 'react-router-dom';
import { LevelContextProvider } from '@/contexts/LevelContext';
import { I18nextProvider } from "react-i18next";
import { UserContextProvider } from '@/contexts/UserContext';
import { GoogleOAuthProvider } from "@react-oauth/google"
import { AuthProvider } from '@/contexts/AuthContext';
import { PlayerContextProvider } from '@/contexts/PlayerContext';
import { PassContextProvider } from '@/contexts/PassContext';  
import { DifficultyContextProvider } from '@/contexts/DifficultyContext';
import { HelmetProvider } from 'react-helmet-async';
import { NotificationProvider } from '@/contexts/NotificationContext';
import i18next from '@/translations/config';
import { RatingFilterProvider } from '@/contexts/RatingFilterContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

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

ReactDOM.createRoot(document.getElementById('root')).render(
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <GoogleOAuthProvider clientId='886035995245-8735p49ljpm17btvst50pp8qbg73t7s4.apps.googleusercontent.com'>
          <AuthProvider>
          <DifficultyContextProvider>
            <LevelContextProvider>
              <NotificationProvider>
                <I18nextProvider i18n={i18next}>
                  <UserContextProvider>
                    <PlayerContextProvider>
                        <RatingFilterProvider>
                          <PassContextProvider>
                            <App />
                          </PassContextProvider>
                        </RatingFilterProvider>
                    </PlayerContextProvider>
                  </UserContextProvider>
                </I18nextProvider>
              </NotificationProvider>
            </LevelContextProvider>
          </DifficultyContextProvider>  
          </AuthProvider>
        </GoogleOAuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </HelmetProvider>
);
