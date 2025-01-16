import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { BrowserRouter } from 'react-router-dom';
import { LevelContextProvider } from './contexts/LevelContext.jsx';
import { I18nextProvider } from "react-i18next";
import { UserContextProvider } from './contexts/UserContext.jsx';
import { GoogleOAuthProvider } from "@react-oauth/google"
import { AuthProvider } from './contexts/AuthContext.jsx';
import { PlayerContextProvider } from './contexts/PlayerContext.jsx';
import { PassContextProvider } from './contexts/PassContext.jsx';  
import { DifficultyContextProvider } from './contexts/DifficultyContext.jsx';
import { HelmetProvider } from 'react-helmet-async';
import { NotificationProvider } from './contexts/NotificationContext.jsx';
import i18next from './translations/config';
import { RatingFilterProvider } from './contexts/RatingFilterContext.jsx';

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
