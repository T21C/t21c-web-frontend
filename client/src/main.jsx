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
import { I18nextProvider } from "react-i18next";
import { UserContextProvider } from './context/UserContext.jsx';

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
    }
  },
});


ReactDOM.createRoot(document.getElementById('root')).render(
 <BrowserRouter>
   <LevelContextProvider>
    <I18nextProvider i18n={i18next}>
      <UserContextProvider>
        <App />
      </UserContextProvider>
    </I18nextProvider>
   </LevelContextProvider>
 </BrowserRouter>
);
