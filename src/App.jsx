import { Route, Routes } from "react-router-dom";
import "./App.css";
import { Suspense, lazy } from "react";
import LevelSubmissionPage from "./pages/SubmissionPage/LevelSubmissionPage/LevelSubmissionPage.jsx";
import PassSubmissionPage from "./pages/SubmissionPage/PassSubmissionPage/PassSubmissionPage.jsx";
import CallbackPage from "./components/Callback/Callback.jsx";
import LeaderboardPage from "./pages/LeaderboardPage/LeaderboardPage.jsx";
import ProfilePage from "./pages/ProfilePage/ProfilePage.jsx";
import RatingPage from "./pages/AdminPage/RatingPage.jsx";
import SubmissionManagementPage from "./pages/AdminPage/SubmissionManagementPage.jsx";
import AdminPage from "./pages/AdminPage/AdminPage.jsx";
import PassPage from "./pages/PassPage/PassPage.jsx";
import PassDetailPage from "./pages/PassDetailPage/PassDetailPage.jsx";
import AnnouncementPage from "./pages/AdminPage/AnnouncementPage.jsx";
import BackupPage from "./pages/AdminPage/BackupPage.jsx";
import AboutUsPage from "./pages/AboutUsPage/AboutUsPage.jsx";
import DifficultyPage from "./pages/AdminPage/DifficultyPage.jsx";
import { CompleteNav } from "./components/index.js";
import { AuthProvider } from './contexts/AuthContext';
import LoginPage from './pages/LoginPage/LoginPage';
import RegisterPage from './pages/RegisterPage/RegisterPage';
import VerifyEmailPage from './pages/VerifyEmailPage/VerifyEmailPage';
import OAuthCallbackPage from './pages/OAuthCallbackPage/OAuthCallbackPage';
import EditProfilePage from './pages/EditProfilePage/EditProfilePage';
import PrivateRoute from './components/PrivateRoute/PrivateRoute';
import CreatorManagementPage from './pages/CreatorManagementPage/CreatorManagementPage';

const HomePage = lazy(() => import("./pages/HomePage/HomePage.jsx"));
const LevelDetailPage = lazy(() => import("./pages/LevelDetailPage/LevelDetailPage.jsx"));
const SubmissionPage = lazy(() => import("./pages/SubmissionPage/SubmissionPage.jsx"));
const LevelPage = lazy(() => import("./pages/LevelPage/LevelPage.jsx"));

function App() {
  return (
    <AuthProvider>
      <Suspense
        fallback={
          <div
            style={{
              height: "100vh",
              width: "100vw",
              backgroundColor: "#090909",
            }}
          >
            <CompleteNav />
            <div className="background-level"></div>
            <div className="loader loader-level-detail"></div>
          </div>
        }
      >
        <Routes>
          {/* Auth Routes */}
          <Route path="/login" element={<LoginPage />} />
          {/*
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          */}
          <Route path="/auth/callback" element={<OAuthCallbackPage />} />
          <Route path="/profile/edit" element={<PrivateRoute><EditProfilePage /></PrivateRoute>} />

          {/* Existing Routes */}
          <Route index path="/" element={<HomePage />} />
          <Route path="levels" element={<LevelPage />} />
          <Route path="levels/:id" element={<LevelDetailPage />} />
          <Route path="passes/:id" element={<PassDetailPage />} />

          <Route path="submission" element={<PrivateRoute><SubmissionPage /></PrivateRoute>} />
          <Route path="submission/level" element={<PrivateRoute><LevelSubmissionPage /></PrivateRoute>} />
          <Route path="submission/pass" element={<PrivateRoute><PassSubmissionPage /></PrivateRoute>} />
          <Route path="callback" element={<CallbackPage />} />
          <Route path="profile/:playerId" element={<ProfilePage />} />
          <Route path="profile" element={<ProfilePage />} />

          <Route path='leaderboard' element={<LeaderboardPage />} />
          <Route path='passes' element={<PassPage />} />

          {/* Admin Routes - Protected */}
          <Route path='admin/submissions' element={<PrivateRoute><SubmissionManagementPage /></PrivateRoute>} />
          <Route path='admin/rating' element={<PrivateRoute><RatingPage /></PrivateRoute>} />
          <Route path='admin/announcements' element={<PrivateRoute><AnnouncementPage /></PrivateRoute>} />
          <Route path='admin/backups' element={<PrivateRoute><BackupPage /></PrivateRoute>} />
          <Route path='admin/difficulties' element={<PrivateRoute><DifficultyPage /></PrivateRoute>} />
          <Route
            path="/admin/creators"
            element={
              <PrivateRoute>
                <CreatorManagementPage />
              </PrivateRoute>
            }
          />
          
          <Route path='about' element={<AboutUsPage />} />
          
          {/* Fallback Route */}
        </Routes>
      </Suspense>
    </AuthProvider>
  );
}

export default App;
