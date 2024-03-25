
import { Route, Routes } from 'react-router-dom'
import './App.css'
import { HomePage, LevelDetailPage, LevelsPage } from './pages'


function App() {

  return (
    <Routes>
      <Route path = "/" element={<HomePage/>}/>
      <Route path = "/levels" element={<LevelsPage/>}/>
      <Route path='/leveldetail' element={<LevelDetailPage/>}/>
    </Routes>
  )
}

export default App
