import { useEffect } from 'react';
import { Navigate } from 'react-router-dom';

import { clearAuthStorage } from '../utils/auth';

export default function LogoutPage() {
  useEffect(() => {
    clearAuthStorage();
  }, []);

  return <Navigate to="/login" replace />;
}
