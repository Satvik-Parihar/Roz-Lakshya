import { Routes, Route, Navigate } from 'react-router-dom';
import TaskBoard from './pages/TaskBoard';
import ComplaintEngine from './pages/ComplaintEngine';
import Dashboard from './pages/Dashboard';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/tasks" replace />} />
      <Route path="/tasks" element={<TaskBoard />} />
      <Route path="/complaints" element={<ComplaintEngine />} />
      <Route path="/dashboard" element={<Dashboard />} />
    </Routes>
  );
}

export default App;
