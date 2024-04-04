import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { BrowserRouter } from 'react-router-dom'
import { LevelContextProvider } from './context/LevelContext.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
 <BrowserRouter>
   <LevelContextProvider>
      <App />
   </LevelContextProvider>   
 </BrowserRouter>
)
