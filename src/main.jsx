import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { BrowserRouter } from 'react-router-dom';
import { LevelContextProvider } from './contexts/LevelContext';
import { I18nextProvider } from "react-i18next";
import { UserContextProvider } from './contexts/UserContext';
import { GoogleOAuthProvider } from "@react-oauth/google"
import { AuthProvider } from './contexts/AuthContext';
import { PlayerContextProvider } from './contexts/PlayerContext';
import { PassContextProvider } from './contexts/PassContext';  
import { DifficultyContextProvider } from './contexts/DifficultyContext';
import { HelmetProvider } from 'react-helmet-async';
import { NotificationProvider } from './contexts/NotificationContext';
import i18next from './translations/config';
import { RatingFilterProvider } from './contexts/RatingFilterContext';

ReactDOM.createRoot(document.getElementById('root')).render(
  <HelmetProvider>
    <BrowserRouter>
      <GoogleOAuthProvider clientId='886035995245-8735p49ljpm17btvst50pp8qbg73t7s4.apps.googleusercontent.com'>
      <AuthProvider>
        <LevelContextProvider>
          <NotificationProvider>
            <I18nextProvider i18n={i18next}>
              <UserContextProvider>
                <PlayerContextProvider>
                <DifficultyContextProvider>
                  <RatingFilterProvider>
                    <PassContextProvider>
                      <App />
                    </PassContextProvider>
                  </RatingFilterProvider>
                </DifficultyContextProvider>  
              </PlayerContextProvider>
            </UserContextProvider>
          </I18nextProvider>
          </NotificationProvider>
        </LevelContextProvider>
        </AuthProvider>
      </GoogleOAuthProvider>
    </BrowserRouter>
  </HelmetProvider>
);
