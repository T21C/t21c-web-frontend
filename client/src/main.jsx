import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { BrowserRouter } from 'react-router-dom';
import { LevelContextProvider } from './context/LevelContext.jsx';
import i18next from "i18next";
import globalEn from "./translations/en/global.json";
import globalId from "./translations/id/global.json"
import globalDe from "./translations/de/global.json"
import globalKr from "./translations/kr/global.json"
import globalCn from "./translations/cn/global.json"
import { I18nextProvider } from "react-i18next";
import { UserContextProvider } from './context/UserContext.jsx';
import { GoogleOAuthProvider } from "@react-oauth/google"
import { AuthProvider } from './context/AuthContext.jsx';
import { PlayerContextProvider } from './context/PlayerContext.jsx';

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
    }
  },
});


ReactDOM.createRoot(document.getElementById('root')).render(
 <BrowserRouter>
   <GoogleOAuthProvider clientId='886035995245-8735p49ljpm17btvst50pp8qbg73t7s4.apps.googleusercontent.com'>
   
   <LevelContextProvider>
    <I18nextProvider i18n={i18next}>
      <UserContextProvider>
        <PlayerContextProvider>
          <AuthProvider>
            <App />
          </AuthProvider>
        </PlayerContextProvider>
      </UserContextProvider>
    </I18nextProvider>
   </LevelContextProvider>
   </GoogleOAuthProvider>
 </BrowserRouter>
);
