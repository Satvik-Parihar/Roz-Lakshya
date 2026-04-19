import { Routes, Route, Navigate } from 'react-router-dom';
import TaskBoard from './pages/TaskBoard';
import ComplaintEngine from './pages/ComplaintEngine';
import Dashboard from './pages/Dashboard';
import ExecutionSequence from './pages/ExecutionSequence';
import FeaturesPage from './pages/FeaturesPage';
import HowItWorksPage from './pages/HowItWorksPage';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import PrivacyPage from './pages/PrivacyPage';
import ProductPage from './pages/ProductPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import SignupPage from './pages/SignupPage';
import StatusPage from './pages/StatusPage';
import TermsPage from './pages/TermsPage';
import LogoutPage from './pages/LogoutPage';
import { getAuthSnapshot } from './utils/auth';

function ProtectedRoute({ children }) {
  const auth = getAuthSnapshot();
  if (!auth.isAuthenticated) return <Navigate to="/login" replace />;
  if (auth.mustResetPassword) return <Navigate to="/reset-password" replace />;
  return <div className="flex flex-col min-h-screen overflow-x-hidden w-full">{children}</div>;
}

function ResetPasswordRoute() {
  const auth = getAuthSnapshot();
  if (!auth.isAuthenticated) return <Navigate to="/login" replace />;
  if (!auth.mustResetPassword) return <Navigate to="/dashboard" replace />;
  return <ResetPasswordPage />;
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/features" element={<FeaturesPage />} />
      <Route path="/how-it-works" element={<HowItWorksPage />} />
      <Route path="/product" element={<ProductPage />} />
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="/terms" element={<TermsPage />} />
      <Route path="/status" element={<StatusPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/reset-password" element={<ResetPasswordRoute />} />
      <Route path="/logout" element={<LogoutPage />} />
      <Route path="/tasks" element={<ProtectedRoute><TaskBoard /></ProtectedRoute>} />
      <Route path="/plan" element={<ProtectedRoute><ExecutionSequence /></ProtectedRoute>} />
      <Route path="/complaints" element={<ProtectedRoute><ComplaintEngine /></ProtectedRoute>} />
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default App;
