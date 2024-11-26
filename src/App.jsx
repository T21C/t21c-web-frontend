import { Route, Routes } from "react-router-dom";
import "./App.css";
import { Suspense, lazy, useEffect, useState } from "react";
import LevelSubmissionPage from "./pages/LevelSubmissionPage/LevelSubmissionPage.jsx";
import PassSubmissionPage from "./pages/PassSubmissionPage/PassSubmissionPage.jsx";
import CallbackPage from "./components/Callback/Callback.jsx";
import LeaderboardPage from "./pages/LeaderboardPage/LeaderboardPage.jsx";
import ProfilePage from "./pages/ProfilePage/ProfilePage.jsx"
import RatingPage from "./pages/AdminPage/RatingPage.jsx";
import SubmissionManagementPage from "./pages/AdminPage/SubmissionManagementPage.jsx";
import AdminPage from "./pages/AdminPage/AdminPage.jsx";
import PassPage from "./pages/PassPage/PassPage.jsx";
import PassDetailPage from "./pages/PassDetailPage/PassDetailPage.jsx";

const HomePage = lazy(() => import("./pages/HomePage/HomePage.jsx"));
const LevelDetailPage = lazy(()=> import ("./pages/LevelDetailPage/LevelDetailPage.jsx"))
const SubmissionPage = lazy(()=> import("./pages/SubmissionPage/SubmissionPage.jsx"))
const LevelPage = lazy(()=> import ("./pages/LevelPage/LevelPage.jsx"))

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
        <Route index path="/" element={<LevelPage />} />
        <Route path="levels" element={<LevelPage />} />
        <Route path="leveldetail" element={<LevelDetailPage />} />
        <Route path="passdetail" element={<PassDetailPage />} />


        <Route path="submission" element={<SubmissionPage />} />
        <Route path="submission/level" element={<LevelSubmissionPage />} />
        <Route path="submission/pass" element={<PassSubmissionPage />} />
        <Route path="callback" element={<CallbackPage />} />
        <Route path="profile/:playerName" element={<ProfilePage />} />

        <Route path='leaderboard' element={<LeaderboardPage/>}/>
        <Route path='pass' element={<PassPage/>} />

        <Route path='admin' element={<AdminPage/>} />
        <Route path='admin/submissions' element={<SubmissionManagementPage/>} />
        <Route path='admin/rating' element={<RatingPage/>} />
      </Routes>
    </Suspense>
    </>
  );
}

export default App;
