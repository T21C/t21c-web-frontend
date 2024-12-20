import { Route, Routes } from "react-router-dom";
import "./App.css";
import { Suspense, lazy, useEffect, useState } from "react";
import LevelSubmissionPage from "./pages/LevelSubmissionPage/LevelSubmissionPage.jsx";
import PassSubmissionPage from "./pages/PassSubmissionPage/PassSubmissionPage.jsx";
import CallbackPage from "./components/Callback/Callback.jsx";
import LeaderboardPage from "./pages/LeaderboardPage/LeaderboardPage.jsx";
import ProfilePage from "./pages/ProfilePage/ProfilePage.jsx"
import AdminPage from "./pages/AdminPage/AdminPage.jsx";

const HomePage = lazy(() => import("./pages/HomePage/HomePage.jsx"));
const LevelDetailPage = lazy(()=> import ("./pages/LevelDetailPage/LevelDetailPage.jsx"))
const SubmissionPage = lazy(()=> import("./pages/SubmissionPage/SubmissionPage.jsx"))
const LevelPageRev = lazy(()=> import ("./pages/LevelPage/LevelPageRev.jsx"))

function App() {
  
  return (
    <>   
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
        <Route index path="/" element={<HomePage />} />
        <Route path="levels" element={<LevelPageRev />} />
        <Route path="leveldetail" element={<LevelDetailPage />} />

        <Route path="submission" element={<SubmissionPage />} />
        <Route path="submission/level" element={<LevelSubmissionPage />} />
        <Route path="submission/pass" element={<PassSubmissionPage />} />
        <Route path="callback" element={<CallbackPage />} />
        <Route path="profile/:playerName" element={<ProfilePage />} />

        <Route path='leaderboard' element={<LeaderboardPage/>}/>
        <Route path='admin' element={<AdminPage/>} />
      </Routes>
    </Suspense>
    </>
  );
}

export default App;
