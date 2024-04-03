import { Route, Routes } from "react-router-dom";
import "./App.css";
import { Suspense, lazy } from "react";
const HomePage = lazy(() => import("./pages/HomePage.jsx"));
const LevelDetailPage = lazy(()=> import ("./pages/LevelDetailPage.jsx"))
const LevelPageRev = lazy(()=>import ("./pages/LevelPageRev.jsx"))

function App() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            height: "100vh",
            width: "100vw",
            backgroundColor: "#090909",
          }}
        >
          <div className="background-level"></div>
          <div className="loader loader-level-detail"></div>
        </div>
      }
    >
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/levels" element={<LevelPageRev />} />
        <Route path="/leveldetail" element={<LevelDetailPage />} />
        {/* <Route path='/leaderboard' element={<LeaderboardPage/>}/> */}
      </Routes>
    </Suspense>
  );
}

export default App;
