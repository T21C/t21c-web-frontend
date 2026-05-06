// tuf-search: #pages #index
import { lazy } from 'react';

// Common pages
const HomePage = lazy(() => import('./common/HomePage/HomePage'));
//const HomePageAprils = lazy(() => import('./common/HomePageAprils/HomePage'));
const LevelDetailPage = lazy(() => import('./common/Level/LevelDetailPage/LevelDetailPage'));
const LevelPage = lazy(() => import('./common/Level/LevelPage/LevelPage'));
const SubmissionPage = lazy(() => import('./submissions/SubmissionPage'));
const PassPage = lazy(() => import('./common/Pass/PassPage/PassPage'));
const PassDetailPage = lazy(() => import('./common/Pass/PassDetailPage/PassDetailPage'));
const LeaderboardPage = lazy(() => import('./common/LeaderboardPage/LeaderboardPage'));
const LevelSubmissionPage = lazy(() => import('./submissions/LevelSubmissionPage/LevelSubmissionPage'));
const PassSubmissionPage = lazy(() => import('./submissions/PassSubmissionPage/PassSubmissionPage'));
const PackPage = lazy(() => import('./common/Pack/PackPage/PackPage'));
const PackDetailPage = lazy(() => import('./common/Pack/PackDetailPage/PackDetailPage'));
const ArtistListPage = lazy(() => import('./common/Artist/ArtistListPage/ArtistListPage'));
const ArtistDetailPage = lazy(() => import('./common/Artist/ArtistDetailPage/ArtistDetailPage'));
const SongListPage = lazy(() => import('./common/Song/SongListPage/SongListPage'));
const SongDetailPage = lazy(() => import('./common/Song/SongDetailPage/SongDetailPage'));
const CreatorsListPage = lazy(() => import('./common/CreatorsListPage/CreatorsListPage'));
const CreatorProfilePage = lazy(() => import('./account/CreatorProfilePage/CreatorProfilePage'));
// Account pages
const ProfilePage = lazy(() => import('./account/ProfilePage/ProfilePage'));
const LoginPage = lazy(() => import('./account/LoginPage/LoginPage'));
const RegisterPage = lazy(() => import('./account/RegisterPage/RegisterPage'));
const EditProfilePage = lazy(() => import('./account/settings/EditProfilePage'));
const SettingsLayout = lazy(() => import('./account/settings/SettingsLayout'));
const SettingsIndexRedirect = lazy(() => import('./account/settings/SettingsIndexRedirect'));
const SettingsAccountPage = lazy(() => import('./account/settings/SettingsAccountPage'));
const SettingsPlayerPage = lazy(() => import('./account/settings/SettingsPlayerPage'));
const SettingsCreatorPage = lazy(() => import('./account/settings/SettingsCreatorPage'));
const ProfileEditRedirect = lazy(() => import('./account/settings/ProfileEditRedirect'));
const EmailVerificationPage = lazy(() => import('./account/EmailVerificationPage/EmailVerificationPage'));
const ForgotPasswordPage = lazy(() => import('./account/ForgotPasswordPage/ForgotPasswordPage'));

const CallbackPage = lazy(() => import('./account/Callback/Callback'));

// Admin pages
const AdminPage = lazy(() => import('./admin/AdminPage/AdminPage'));
const AnnouncementPage = lazy(() => import('./admin/AnnouncementPage/AnnouncementPage'));
const BackupPage = lazy(() => import('./admin/BackupPage/BackupPage'));
const DifficultyPage = lazy(() => import('./admin/DifficultyPage/DifficultyPage'));
const CreatorManagementPage = lazy(() => import('./admin/CreatorManagementPage/CreatorManagementPage'));
const ArtistManagementPage = lazy(() => import('./admin/ArtistManagementPage/ArtistManagementPage'));
const SongManagementPage = lazy(() => import('./admin/SongManagementPage/SongManagementPage'));
const SubmissionManagementPage = lazy(() => import('./admin/SubmissionManagementPage/SubmissionManagementPage'));
const RatingPage = lazy(() => import('./admin/RatingPage/RatingPage'));
const AuditLogPage = lazy(() => import('./admin/AuditLogPage/AuditLogPage'));
const CurationPage = lazy(() => import('./admin/Curation/CurationPage/CurationPage'));
const CurationSchedulePage = lazy(() => import('./admin/Curation/CurationSchedulePage/CurationSchedulePage'));
const CurationCssPreviewPage = lazy(() => import('./admin/Curation/CurationCssPreviewPage/CurationCssPreviewPage'));

// Common pages
const CurationPreviewPage = lazy(() => import('./common/CurationPreviewPage/CurationPreviewPage'));

// Misc pages
const AboutUsPage = lazy(() => import('./misc/AboutUsPage/AboutUsPage'));
const PrivacyPolicyPage = lazy(() => import('./misc/PrivacyPolicyPage/PrivacyPolicyPage'));
const TermsOfServicePage = lazy(() => import('./misc/TermsOfServicePage/TermsOfServicePage'));
const HealthCheckPage = lazy(() => import('./misc/HealthCheckPage/HealthCheckPage'));

export {
    // Common pages
    HomePage,
    //HomePageAprils,
    LevelDetailPage,
    LevelPage,
    SubmissionPage,
    PassPage,
    PassDetailPage,
    LevelSubmissionPage,
    PassSubmissionPage,
    LeaderboardPage,
    PackPage,
    PackDetailPage,
    ArtistListPage,
    ArtistDetailPage,
    SongListPage,
    SongDetailPage,
    CreatorsListPage,
    CreatorProfilePage,
    // Account related pages
    ProfilePage,
    LoginPage,
    RegisterPage,
    EditProfilePage,
    SettingsLayout,
    SettingsIndexRedirect,
    SettingsAccountPage,
    SettingsPlayerPage,
    SettingsCreatorPage,
    ProfileEditRedirect,
    EmailVerificationPage,
    ForgotPasswordPage,
    CallbackPage,
    
    // Admin pages
    AdminPage,
    AnnouncementPage,
    BackupPage,
    DifficultyPage,
    CreatorManagementPage,
    ArtistManagementPage,
    SongManagementPage,
    SubmissionManagementPage,
    RatingPage,
    AuditLogPage,
    CurationPage,
    CurationSchedulePage,
    CurationCssPreviewPage,
    CurationPreviewPage,
    // Other pages
    AboutUsPage,
    PrivacyPolicyPage,
    TermsOfServicePage,
    HealthCheckPage
};
