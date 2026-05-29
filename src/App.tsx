import React, { Suspense, lazy, useEffect } from 'react';
import { Routes, Route, Navigate, Outlet, useNavigate } from 'react-router-dom';
import { Spin } from 'antd';
import ProtectedRoute from './components/routing/protectedRoute';
import MainLayout from './components/layout/mainLayout';
import Dashboard from './pages/dashboard';
import SignIn from './pages/signIn';
import { useAppDispatch, useAppSelector } from './app/hooks';
import { initializeAuth, logout } from './features/auth/authSlice';
import { AUTH_EXPIRED_EVENT } from './lib/api';

/**
 * Route-level code splitting. Each page lazy-loads its own chunk so the
 * initial bundle stays small and pages that the student rarely visits
 * (interview, certificates, settings, …) don't slow down the first
 * paint of the dashboard.
 *
 * `signIn` and `dashboard` are eagerly imported because they are the
 * landing destinations after auth resolves; everything else is split.
 */
const AssessmentsPage = lazy(() => import('./pages/assessments'));
const ProfilePage = lazy(() => import('./pages/profilePage'));
const CertificatesPage = lazy(() => import('./pages/certificates'));
const ReportPage = lazy(() => import('./pages/report'));
const TestPage = lazy(() => import('./pages/test'));
const PracticePage = lazy(() => import('./pages/practice'));
const LeaderboardPage = lazy(() => import('./pages/leaderboard'));
const AchievementsPage = lazy(() => import('./pages/achievements'));
const HelpPage = lazy(() => import('./pages/help'));
const SettingsPage = lazy(() => import('./pages/settings'));
const AIInterviewPage = lazy(() => import('./pages/aiInterview'));
const ResumeReviewPage = lazy(() => import('./pages/resumeReview'));
const SignUp = lazy(() => import('./pages/signUp'));
const SetPasswordPage = lazy(() => import('./pages/setPassword'));
const CompleteProfilePage = lazy(() => import('./pages/completeProfile'));
const JobsPage = lazy(() => import('./pages/jobs'));

const PageFallback: React.FC = () => (
  <div className="min-h-120 flex items-center justify-center">
    <Spin size="large" />
  </div>
);

/**
 * U2 gate: when the account is flagged `must_change_password` (admin
 * created / invited / reset), force the set-password screen before any
 * other protected page is reachable.
 */
const PasswordChangeGate: React.FC = () => {
  const mustChangePassword = useAppSelector((state) => state.auth.mustChangePassword);
  if (mustChangePassword) {
    return <Navigate to="/set-password" replace />;
  }
  return <Outlet />;
};

/**
 * U3 gate: a freshly self-registered user whose profile is incomplete is
 * routed into the "complete your profile" step before reaching the
 * dashboard. The flag is set at sign-up (and cleared when the step is
 * completed or skipped) so existing users are never trapped.
 */
export const PROFILE_INCOMPLETE_KEY = 'tf-profile-incomplete';

const ProfileCompletionGate: React.FC = () => {
  if (localStorage.getItem(PROFILE_INCOMPLETE_KEY) === '1') {
    return <Navigate to="/complete-profile" replace />;
  }
  return <Outlet />;
};

const App: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  useEffect(() => {
    dispatch(initializeAuth());
  }, [dispatch]);

  // U1: when a request can't be re-authenticated, clear state and route to
  // /signin immediately so the user never sees a blank/broken page.
  useEffect(() => {
    const onExpired = () => {
      dispatch(logout());
      navigate('/signin', { replace: true });
    };
    window.addEventListener(AUTH_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, onExpired);
  }, [dispatch, navigate]);

  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        {/* Public Routes */}
        <Route path="/signin" element={<SignIn />} />
        <Route path="/signup" element={<SignUp />} />

        {/* Protected Routes Wrapper */}
        <Route element={<ProtectedRoute />}>
          {/* Forced password change (U2) — reachable only while flagged. */}
          <Route path="/set-password" element={<SetPasswordPage />} />
          {/* Complete-profile step (U3). */}
          <Route path="/complete-profile" element={<CompleteProfilePage />} />

          <Route element={<PasswordChangeGate />}>
            <Route element={<ProfileCompletionGate />}>
              {/*
                The test page renders standalone (no sidebar, no header, no
                nav). Anything that distracts from the assessment is gone.
                See `pages/test.tsx` for the fullscreen layout and the
                webcam-required integrity gate.
              */}
              <Route path="/test/:practiceId" element={<TestPage />} />

              <Route element={<MainLayout />}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/jobs" element={<JobsPage />} />
                <Route path="/my-assessments" element={<AssessmentsPage />} />
                <Route path="/practice" element={<PracticePage />} />
                <Route path="/leaderboard" element={<LeaderboardPage />} />
                <Route path="/achievements" element={<AchievementsPage />} />
                <Route path="/ai-interview" element={<AIInterviewPage />} />
                <Route path="/resume-review" element={<ResumeReviewPage />} />
                <Route path="/reports/:sessionId" element={<ReportPage />} />
                <Route path="/result/:sessionId" element={<ReportPage />} />
                <Route path="/certificates" element={<CertificatesPage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/help" element={<HelpPage />} />
                <Route path="/settings" element={<SettingsPage />} />
              </Route>
            </Route>
          </Route>
        </Route>

        {/* Fallback for unknown routes */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
};

export default App;
