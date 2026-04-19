import React, { useState, useEffect } from 'react';
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
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  if (showSplash) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[color:var(--surface-container-lowest)]">
        <img 
          src="/logo.png" 
          alt="Roz-Lakshya Logo" 
          className="h-32 w-auto animate-pulse transition-transform duration-1000 scale-110"
        />
      </div>
    );
  }

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
