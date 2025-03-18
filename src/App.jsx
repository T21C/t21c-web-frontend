import { Route, Routes } from "react-router-dom";
import { Suspense } from "react";
import { CompleteNav } from "@/components/layout";
import { AuthProvider } from '@/contexts/AuthContext';
import { PrivateRoute } from "@/components/auth";
import * as Pages from '@/pages/index';

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
          <Route path="/login" element={<Pages.LoginPage />} />
          {/*
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          */}
          <Route path="/auth/callback" element={<Pages.OAuthCallbackPage />} />
          
          <Route path="/profile/edit" element={<PrivateRoute><Pages.EditProfilePage /></PrivateRoute>} />
          
          {/* Existing Routes */}
          <Route index path="/" element={<Pages.HomePage />} />
          <Route path="levels" element={<Pages.LevelPage />} />
          <Route path="levels/:id" element={<Pages.LevelDetailPage />} />
          <Route path="passes/:id" element={<Pages.PassDetailPage />} />

          <Route path="submission" element={<PrivateRoute><Pages.SubmissionPage /></PrivateRoute>} />
          <Route path="submission/level" element={<PrivateRoute><Pages.LevelSubmissionPage /></PrivateRoute>} />
          <Route path="submission/pass" element={<PrivateRoute><Pages.PassSubmissionPage /></PrivateRoute>} />
          <Route path="callback" element={<Pages.CallbackPage />} />
          <Route path="profile/:playerId" element={<Pages.ProfilePage />} />
          <Route path="profile" element={<Pages.ProfilePage />} />

          <Route path='leaderboard' element={<Pages.LeaderboardPage />} />
          <Route path='passes' element={<Pages.PassPage />} />

          {/* Admin Routes - Protected */}
          <Route path='admin/submissions' element={<PrivateRoute><Pages.SubmissionManagementPage /></PrivateRoute>} />
          <Route path='admin/rating' element={<Pages.RatingPage />} />
          <Route path='admin/announcements' element={<PrivateRoute><Pages.AnnouncementPage /></PrivateRoute>} />
          <Route path='admin/backups' element={<PrivateRoute><Pages.BackupPage /></PrivateRoute>} />
          <Route path='admin/difficulties' element={<PrivateRoute><Pages.DifficultyPage /></PrivateRoute>} />
          <Route
            path="/admin/creators"
            element={
              <PrivateRoute>
                <Pages.CreatorManagementPage />
              </PrivateRoute>
            }
          />
          
          <Route path='about' element={<Pages.AboutUsPage />} />
          
          {/* Fallback Route */}
        </Routes>
      </Suspense>
    </AuthProvider>
  );
}

export default App;
