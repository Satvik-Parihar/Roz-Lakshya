import { Routes, Route, Navigate } from 'react-router-dom';
import TaskBoard from './pages/TaskBoard';
import ComplaintEngine from './pages/ComplaintEngine';
import Dashboard from './pages/Dashboard';
import ExecutionSequence from './pages/ExecutionSequence';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import Navbar from './components/Navbar';

function ProtectedRoute({ children }) {
  const token = localStorage.getItem('access_token');
  if (!token) return <Navigate to="/login" replace />;
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <div className="flex-1">{children}</div>
    </div>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/tasks" element={<ProtectedRoute><TaskBoard /></ProtectedRoute>} />
      <Route path="/plan" element={<ProtectedRoute><ExecutionSequence /></ProtectedRoute>} />
      <Route path="/complaints" element={<ProtectedRoute><ComplaintEngine /></ProtectedRoute>} />
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default App;
