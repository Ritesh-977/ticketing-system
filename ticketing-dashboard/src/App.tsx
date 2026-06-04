import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { DashboardProvider } from './context/DashboardContext.js';
import { DashboardLayout } from './components/layout/DashboardLayout.js';
import { ToastContainer } from './components/ui/Toast.js';
import { AuthProvider } from './context/AuthContext.js';
import { Login } from './pages/Login.js';
import { Register } from './pages/Register.js';
import { ProtectedRoute } from './components/ProtectedRoute.js';
import { PublicRoute } from './components/PublicRoute.js';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
          
          <Route path="/*" element={
            <ProtectedRoute>
              <DashboardProvider>
                <DashboardLayout />
                <ToastContainer />
              </DashboardProvider>
            </ProtectedRoute>
          } />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}