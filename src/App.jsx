// tuf-search: #App #root — application shell
import { Navigate, Route, useLocation, useSearchParams } from "react-router-dom";
import { Suspense, useEffect } from "react";
import { Navigation } from "@/components/layout";
import { PrivateRoute } from "@/components/auth";
import { DeprecatedRedirect } from "@/components/routing/DeprecatedRedirect";
import { ScrollToTopOnNavigate } from "@/components/routing/ScrollToTopOnNavigate";
import { RouteDocumentHead } from "@/components/routing/RouteDocumentHead";
import { ChunkLoadErrorBoundary } from "@/components/routing/ChunkLoadErrorBoundary";
import { DEPRECATED_ROUTES } from "@/config/deprecatedRoutes";
import * as Pages from '@/pages/index';
import { Toaster } from "react-hot-toast";
import { TufStellarRoute } from "@/components/routing/TufStellarRoute";
import { TufHelperLiteConnectBanner } from "@/components/common/TufHelperLiteConnectBanner";
import { SentryRoutes } from "@/hooks/useSentry";

function App() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const isEmbedded = searchParams.get("embed") === "true";
  const isOauthConsent = location.pathname === "/oauth/consent";
  const hideChrome = isEmbedded || isOauthConsent;

  useEffect(() => {
    if (!hideChrome) return;

    document.documentElement.style.setProperty("--navbar-height", "0px");
  }, [hideChrome]);

  return (
    <>
      <ScrollToTopOnNavigate />
      <RouteDocumentHead />
      {!hideChrome && <Navigation />}
      <div className="app-notifications" aria-live="polite">
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
      </div>
      {!hideChrome && <TufHelperLiteConnectBanner />}
      <div className={`body${hideChrome ? " body--chrome-free" : ""}`}>
      {!hideChrome && <div className="nav-spacer" />}
      <ChunkLoadErrorBoundary>
      <Suspense
        fallback={
          <div className="loader-shell loader-shell--fill">
            <div className="loader loader-relative" />
          </div>
        }
      >
        <SentryRoutes>
          {/* Deprecated routes – redirect to current URLs */}
          {DEPRECATED_ROUTES.map(({ path, redirect }) => (
            <Route
              key={path}
              path={path}
              element={<DeprecatedRedirect redirect={redirect} />}
            />
          ))}
          {/* Auth Routes */}
          <Route path="login" element={<Pages.LoginPage />} />
          <Route path="register" element={<Pages.RegisterPage />} />
          <Route path="forgot-password" element={<Pages.ForgotPasswordPage />} />
          
          <Route path="profile/edit" element={<PrivateRoute><Pages.ProfileEditRedirect /></PrivateRoute>} />
          <Route
            path="settings"
            element={(
              <PrivateRoute>
                <Pages.SettingsLayout />
              </PrivateRoute>
            )}
          >
            <Route index element={<Pages.SettingsIndexRedirect />} />
            <Route path="account" element={<Pages.SettingsAccountPage />} />
            <Route path="security" element={<Pages.SettingsSecurityPage />} />
            <Route path="sessions" element={<Pages.SettingsSessionsPage />} />
            <Route path="player" element={<Pages.SettingsPlayerPage />} />
            <Route path="creator" element={<Pages.SettingsCreatorPage />} />
            <Route path="billing" element={<Pages.SettingsBillingPage />} />
            <Route path="preferences" element={<Pages.SettingsPreferencesPage />} />
            <Route path="notifications" element={<Pages.SettingsNotificationsPage />} />
          </Route>
          <Route
            path="tuf-stellar/checkout"
            element={(
              <PrivateRoute>
                <TufStellarRoute>
                  <Navigate to="/tuf-stellar#purchase" replace />
                </TufStellarRoute>
              </PrivateRoute>
            )}
          />
          <Route
            path="tuf-stellar"
            element={(
              <PrivateRoute>
                <TufStellarRoute>
                  <Pages.TufStellarManagePage />
                </TufStellarRoute>
              </PrivateRoute>
            )}
          />
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
          <Route path="submission/pass/calculator" element={<Pages.PassScoreCalculatorPage />} />
          <Route path="submission/pass" element={<PrivateRoute><Pages.PassSubmissionPage /></PrivateRoute>} />
          <Route path="callback" element={<Pages.CallbackPage />} />
          <Route path="oauth/consent" element={<PrivateRoute><Pages.OAuthConsentPage /></PrivateRoute>} />
          <Route
            path="developers"
            element={(
              <PrivateRoute>
                <Pages.DevelopersLayout />
              </PrivateRoute>
            )}
          >
            <Route index element={<Pages.DevelopersHubPage />} />
            <Route path="apps/new" element={<Pages.DevelopersCreatePage />} />
            <Route path="apps/:appId" element={<Pages.DevelopersAppDetailPage />} />
            <Route path="mods" element={<Pages.DevelopersModsPage />} />
            <Route path="mods/:id" element={<Pages.DevelopersModEditPage />} />
          </Route>
          <Route path="profile/:playerId" element={<Pages.ProfilePage />} />
          <Route path="profile" element={<Pages.ProfilePage />} />
          <Route path="notifications" element={<PrivateRoute><Pages.NotificationsPage /></PrivateRoute>} />
          <Route path="submissions" element={<PrivateRoute><Pages.MySubmissionsPage /></PrivateRoute>} />

          <Route path='leaderboard' element={<Pages.LeaderboardPage />} />
          <Route path='tournaments' element={<Pages.TournamentListPage />} />
          <Route path='tournaments/:id' element={<Pages.TournamentDetailPage />} />
          <Route path='passes' element={<Pages.PassPage />} />
          <Route path='packs' element={<Pages.PackPage />} />
          <Route path='packs/:id' element={<Pages.PackDetailPage />} />
          <Route path='artists' element={<Pages.ArtistListPage />} />
          <Route path='artists/:id' element={<Pages.ArtistDetailPage />} />
          <Route path='songs' element={<Pages.SongListPage />} />
          <Route path='songs/:id' element={<Pages.SongDetailPage />} />
          <Route path='creators' element={<Pages.CreatorsListPage />} />
          <Route path='creator' element={<Pages.CreatorProfilePage />} />
          <Route path='creator/:creatorId' element={<Pages.CreatorProfilePage />} />

          {/* Admin Routes - Protected */}
          <Route path='admin' element={<PrivateRoute><Pages.AdminPage /></PrivateRoute>} />
          <Route path='admin/submissions' element={<PrivateRoute><Pages.SubmissionManagementPage /></PrivateRoute>} />
          <Route path='rating/zen' element={<Pages.RatingZenPage />} />
          {/* Single route so opening /rating/:levelId does not remount and reset Virtuoso scroll */}
          <Route path='rating/:levelId?' element={<Pages.RatingPage />} />
          <Route path='admin/announcements' element={<PrivateRoute><Pages.AnnouncementPage /></PrivateRoute>} />
          <Route path='admin/backups' element={<PrivateRoute><Pages.BackupPage /></PrivateRoute>} />
          <Route path='admin/difficulties' element={<PrivateRoute><Pages.DifficultyPage /></PrivateRoute>} />
          <Route path="admin/creators" element={<PrivateRoute><Pages.CreatorManagementPage /></PrivateRoute>} />
          <Route path="admin/tournaments" element={<PrivateRoute><Pages.TournamentManagementPage /></PrivateRoute>} />

          <Route path="admin/artists" element={<PrivateRoute><Pages.ArtistManagementPage /></PrivateRoute>} />
          <Route path="admin/songs" element={<PrivateRoute><Pages.SongManagementPage /></PrivateRoute>} />
          <Route path="admin/audit-log" element={<PrivateRoute><Pages.AuditLogPage /></PrivateRoute>} />
          <Route path="admin/oauth-clients" element={<PrivateRoute><Pages.AdminOAuthClientsPage /></PrivateRoute>} />
          <Route path="admin/backup" element={<PrivateRoute><Pages.BackupPage /></PrivateRoute>} />
          
          <Route path='about' element={<Pages.AboutUsPage />} />
          <Route path='resources/edit' element={<Pages.ResourcesEditPage />} />
          <Route path='resources' element={<Pages.ResourcesPage />} />
          <Route path='mods/edit/tags' element={<Pages.ModTagsEditPage />} />
          <Route path='mods/edit' element={<Pages.ModsEditPage />} />
          <Route path='mods/:slug/:version' element={<Pages.ModDetailPage />} />
          <Route path='mods/:slug' element={<Pages.ModDetailPage />} />
          <Route path='mods' element={<Pages.ModsPage />} />
          <Route path='privacy-policy' element={<Pages.PrivacyPolicyPage />} />
          <Route path='terms-of-service' element={<Pages.TermsOfServicePage />} />
          <Route path='health' element={<Pages.HealthCheckPage />} />
          <Route path='translation' element={<Pages.TranslationsPage />} />
          <Route path='asset-list' element={<Pages.AssetsCatalogPage />} />
          <Route path='admin/curations' element={<Pages.CurationPage />} />
          <Route path='admin/curations/preview' element={<PrivateRoute><Pages.CurationPreviewPage /></PrivateRoute>} />
          <Route path='admin/curations/preview/:levelId' element={<PrivateRoute><Pages.CurationCssPreviewPage /></PrivateRoute>} />
          <Route path='admin/curations/schedules' element={<PrivateRoute><Pages.CurationSchedulePage /></PrivateRoute>} />
        </SentryRoutes>
      </Suspense>
      </ChunkLoadErrorBoundary>
      </div>
    </>
  );
}

export default App;
