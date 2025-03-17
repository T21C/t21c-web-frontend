import HomePage from "./common/HomePage/HomePage";
import LevelDetailPage from "./common/LevelDetailPage/LevelDetailPage";
import LevelPage from "./common/LevelPage/LevelPage";
import SubmissionPage from "./common/submissions/SubmissionPage";
import PassPage from "./common/PassPage/PassPage";
import PassDetailPage from "./common/PassDetailPage/PassDetailPage";
import LeaderboardPage from "./common/LeaderboardPage/LeaderboardPage";
import CreatorManagementPage from "./admin/CreatorManagementPage/CreatorManagementPage";
import SubmissionManagementPage from "./admin/SubmissionManagementPage/SubmissionManagementPage";
import RatingPage from "./admin/RatingPage/RatingPage";
import DifficultyPage from "./admin/DifficultyPage/DifficultyPage";
import LevelSubmissionPage from "./common/submissions/LevelSubmissionPage/LevelSubmissionPage";
import PassSubmissionPage from "./common/submissions/PassSubmissionPage/PassSubmissionPage";
import CallbackPage from "@/components/auth/Callback/Callback";
// Account pages
import ProfilePage from "./account/ProfilePage/ProfilePage";
import LoginPage from "./account/LoginPage/LoginPage";
import RegisterPage from "./account/RegisterPage/RegisterPage";
import EditProfilePage from "./account/EditProfilePage/EditProfilePage";
import EmailVerificationPage from "./account/EmailVerificationPage/EmailVerificationPage";
import OAuthCallbackPage from "./account/OAuthCallbackPage/OAuthCallbackPage";
import VerifyEmailPage from "./account/VerifyEmailPage/VerifyEmailPage";

// Admin pages
import AdminPage from "./admin/AdminPage/AdminPage";
import AnnouncementPage from "./admin/AnnouncementPage/AnnouncementPage";
import BackupPage from "./admin/BackupPage/BackupPage";

// About page
import AboutUsPage from "./misc/AboutUsPage";

export {
    // Common pages
    HomePage,
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
    OAuthCallbackPage,
    VerifyEmailPage,
    
    // Admin pages
    AdminPage,
    AnnouncementPage,
    BackupPage,
    DifficultyPage,
    CreatorManagementPage,
    SubmissionManagementPage,
    RatingPage,
    
    // Other pages
    AboutUsPage,
    CallbackPage
};
