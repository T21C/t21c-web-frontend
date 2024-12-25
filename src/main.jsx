import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { BrowserRouter } from 'react-router-dom';
import { LevelContextProvider } from './contexts/LevelContext.jsx';
import i18next from "i18next";
import globalEn from "./translations/en/global.json";
import globalId from "./translations/id/global.json"
import globalDe from "./translations/de/global.json"
import globalKr from "./translations/kr/global.json"
import globalCn from "./translations/cn/global.json"
import globalRu from "./translations/ru/global.json"
import { I18nextProvider } from "react-i18next";
import { UserContextProvider } from './contexts/UserContext.jsx';
import { GoogleOAuthProvider } from "@react-oauth/google"
import { AuthProvider } from './contexts/AuthContext.jsx';
import { PlayerContextProvider } from './contexts/PlayerContext.jsx';
import { PassContextProvider } from './contexts/PassContext.jsx';  
import { DifficultyContextProvider } from './contexts/DifficultyContext.jsx';
import { HelmetProvider } from 'react-helmet-async';
import { NotificationProvider } from './contexts/NotificationContext.jsx';

i18next.init({
  interpolation: { escapeValue: false },
  lng: localStorage.getItem('appLanguage') || 'us',
  resources: {
    us: {
      translation: globalEn,
    },
    id: {
      translation: globalId, 
    },
    de : {
      translation : globalDe
    },
    kr : {
      translation : globalKr
    },
    cn : {
      translation : globalCn
    },
    ru : {
      translation : globalRu
    },
  },
});

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
                    <PassContextProvider>
                      <App />
                    </PassContextProvider>
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
