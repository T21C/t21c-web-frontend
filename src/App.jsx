import { Route, Routes } from "react-router-dom";
import { Suspense } from "react";
import { CompleteNav } from "@/components/layout";
import { AuthProvider } from '@/contexts/AuthContext';
import { PrivateRoute } from "@/components/auth";
import * as Pages from '@/pages/index';
import { Toaster } from "react-hot-toast";

function App() {
  return (
    <AuthProvider>
      <Toaster
        position="bottom-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: 'var(--color-black)',
            color: 'var(--color-white)',
            border: '1px solid var(--color-white-t20)',
            borderRadius: '4px',
            padding: '0.75rem 1rem',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)'
          }
        }}
      />
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
          <Route path="login" element={<Pages.LoginPage />} />
          <Route path="register" element={<Pages.RegisterPage />} />
          <Route path="forgot-password" element={<Pages.ForgotPasswordPage />} />
          
          <Route path="profile/edit" element={<PrivateRoute><Pages.EditProfilePage /></PrivateRoute>} />
          <Route path="profile/verify-email" element={<Pages.EmailVerificationPage />} />
          
          <Route index path="/" element={
            //import.meta.env.VITE_APRIL_FOOLS === "true" ? <Pages.HomePageAprils /> : 
            <Pages.HomePage />
          } />
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
          <Route path='admin' element={<PrivateRoute><Pages.AdminPage /></PrivateRoute>} />
          <Route path='admin/submissions' element={<PrivateRoute><Pages.SubmissionManagementPage /></PrivateRoute>} />
          <Route path='admin/rating' element={<Pages.RatingPage />} />
          <Route path='admin/announcements' element={<PrivateRoute><Pages.AnnouncementPage /></PrivateRoute>} />
          <Route path='admin/backups' element={<PrivateRoute><Pages.BackupPage /></PrivateRoute>} />
          <Route path='admin/difficulties' element={<PrivateRoute><Pages.DifficultyPage /></PrivateRoute>} />
          <Route path="admin/creators" element={<PrivateRoute><Pages.CreatorManagementPage /></PrivateRoute>} />
          <Route path="admin/audit-log" element={<PrivateRoute><Pages.AuditLogPage /></PrivateRoute>} />
          <Route path="admin/backup" element={<PrivateRoute><Pages.BackupPage /></PrivateRoute>} />
          
          <Route path='about' element={<Pages.AboutUsPage />} />
          <Route path='privacy-policy' element={<Pages.PrivacyPolicyPage />} />
          <Route path='terms-of-service' element={<Pages.TermsOfServicePage />} />
          <Route path='health' element={<Pages.HealthCheckPage />} />
          <Route path='admin/curation' element={<PrivateRoute><Pages.CurationPage /></PrivateRoute>} />
          <Route path='admin/curation/preview' element={<PrivateRoute><Pages.CurationPreviewPage /></PrivateRoute>} />
          <Route path='admin/curation/schedules' element={<PrivateRoute><Pages.CurationSchedulePage /></PrivateRoute>} />
        </Routes>
      </Suspense>
    </AuthProvider>
  );
}

export default App;
