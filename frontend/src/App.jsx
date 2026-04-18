import { Routes, Route, Navigate } from 'react-router-dom';
import TaskBoard from './pages/TaskBoard';
import ComplaintEngine from './pages/ComplaintEngine';
import Dashboard from './pages/Dashboard';
import TodaysPlan from './pages/TodaysPlan';
// Add /plan to Navbar manually.

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/tasks" replace />} />
      <Route path="/tasks" element={<TaskBoard />} />
      <Route path="/complaints" element={<ComplaintEngine />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/plan" element={<TodaysPlan />} />
    </Routes>
  );
}

export default App;
