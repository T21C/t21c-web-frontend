
import { Route, Routes } from 'react-router-dom'
import './App.css'
import { HomePage, LevelsPage } from './pages'


function App() {

  return (
    <Routes>
      <Route path = "/" element={<HomePage/>}/>
      <Route path = "/levels" element={<LevelsPage/>}/>
    </Routes>
  )
}

export default App
