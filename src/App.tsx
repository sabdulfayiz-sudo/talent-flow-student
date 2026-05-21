import React, { Suspense, lazy, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Spin } from 'antd';
import ProtectedRoute from './components/routing/protectedRoute';
import MainLayout from './components/layout/mainLayout';
import Dashboard from './pages/dashboard';
import SignIn from './pages/signIn';
import { useAppDispatch } from './app/hooks';
import { initializeAuth } from './features/auth/authSlice';

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

const PageFallback: React.FC = () => (
  <div className="min-h-120 flex items-center justify-center">
    <Spin size="large" />
  </div>
);

const App: React.FC = () => {
  const dispatch = useAppDispatch();

  useEffect(() => {
    dispatch(initializeAuth());
  }, [dispatch]);

  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        {/* Public Routes */}
        <Route path="/signin" element={<SignIn />} />

        {/* Protected Routes Wrapper */}
        <Route element={<ProtectedRoute />}>
          <Route element={<MainLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/my-assessments" element={<AssessmentsPage />} />
            <Route path="/practice" element={<PracticePage />} />
            <Route path="/leaderboard" element={<LeaderboardPage />} />
            <Route path="/achievements" element={<AchievementsPage />} />
            <Route path="/ai-interview" element={<AIInterviewPage />} />
            <Route path="/resume-review" element={<ResumeReviewPage />} />
            <Route path="/test/:practiceId" element={<TestPage />} />
            <Route path="/reports/:sessionId" element={<ReportPage />} />
            <Route path="/result/:sessionId" element={<ReportPage />} />
            <Route path="/certificates" element={<CertificatesPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/help" element={<HelpPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
        </Route>

        {/* Fallback for unknown routes */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
};

export default App;
