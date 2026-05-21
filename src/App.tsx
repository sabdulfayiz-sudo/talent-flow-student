import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/routing/protectedRoute';
import MainLayout from './components/layout/mainLayout';
import Dashboard from './pages/dashboard';
import { useAppDispatch } from './app/hooks';
import { initializeAuth } from './features/auth/authSlice';
import SignIn from './pages/signIn';
import AssessmentsPage from './pages/assessments';
import ProfilePage from './pages/profilePage';
import CertificatesPage from './pages/certificates';
import ReportPage from './pages/report';
import TestPage from './pages/test';
import PracticePage from './pages/practice';
import LeaderboardPage from './pages/leaderboard';
import AchievementsPage from './pages/achievements';
import HelpPage from './pages/help';
import SettingsPage from './pages/settings';

const App: React.FC = () => {
  const dispatch = useAppDispatch();

  useEffect(() => {
    dispatch(initializeAuth());
  }, [dispatch]);

  return (
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
  );
};

export default App;
