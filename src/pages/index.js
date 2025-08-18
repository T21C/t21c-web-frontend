import { lazy } from 'react';

// Common pages
const HomePage = lazy(() => import('./common/HomePage/HomePage'));
//const HomePageAprils = lazy(() => import('./common/HomePageAprils/HomePage'));
const LevelDetailPage = lazy(() => import('./common/LevelDetailPage/LevelDetailPage'));
const LevelPage = lazy(() => import('./common/LevelPage/LevelPage'));
const SubmissionPage = lazy(() => import('./submissions/SubmissionPage'));
const PassPage = lazy(() => import('./common/PassPage/PassPage'));
const PassDetailPage = lazy(() => import('./common/PassDetailPage/PassDetailPage'));
const LeaderboardPage = lazy(() => import('./common/LeaderboardPage/LeaderboardPage'));
const LevelSubmissionPage = lazy(() => import('./submissions/LevelSubmissionPage/LevelSubmissionPage'));
const PassSubmissionPage = lazy(() => import('./submissions/PassSubmissionPage/PassSubmissionPage'));

// Account pages
const ProfilePage = lazy(() => import('./account/ProfilePage/ProfilePage'));
const LoginPage = lazy(() => import('./account/LoginPage/LoginPage'));
const RegisterPage = lazy(() => import('./account/RegisterPage/RegisterPage'));
const EditProfilePage = lazy(() => import('./account/EditProfilePage/EditProfilePage'));
const EmailVerificationPage = lazy(() => import('./account/EmailVerificationPage/EmailVerificationPage'));
const ForgotPasswordPage = lazy(() => import('./account/ForgotPasswordPage/ForgotPasswordPage'));

const CallbackPage = lazy(() => import('./account/Callback/Callback'));

// Admin pages
const AdminPage = lazy(() => import('./admin/AdminPage/AdminPage'));
const AnnouncementPage = lazy(() => import('./admin/AnnouncementPage/AnnouncementPage'));
const BackupPage = lazy(() => import('./admin/BackupPage/BackupPage'));
const DifficultyPage = lazy(() => import('./admin/DifficultyPage/DifficultyPage'));
const CreatorManagementPage = lazy(() => import('./admin/CreatorManagementPage/CreatorManagementPage'));
const SubmissionManagementPage = lazy(() => import('./admin/SubmissionManagementPage/SubmissionManagementPage'));
const RatingPage = lazy(() => import('./admin/RatingPage/RatingPage'));
const AuditLogPage = lazy(() => import('./admin/AuditLogPage/AuditLogPage'));
const CurationPage = lazy(() => import('./admin/CurationPage/CurationPage'));
const CurationSchedulePage = lazy(() => import('./admin/CurationSchedulePage/CurationSchedulePage'));

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
    
    // Account related pages
    ProfilePage,
    LoginPage,
    RegisterPage,
    EditProfilePage,
    EmailVerificationPage,
    ForgotPasswordPage,
    CallbackPage,
    
    // Admin pages
    AdminPage,
    AnnouncementPage,
    BackupPage,
    DifficultyPage,
    CreatorManagementPage,
    SubmissionManagementPage,
    RatingPage,
    AuditLogPage,
    CurationPage,
    CurationSchedulePage,
    CurationPreviewPage,
    // Other pages
    AboutUsPage,
    PrivacyPolicyPage,
    TermsOfServicePage,
    HealthCheckPage
};
