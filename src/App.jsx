import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AppLayout } from './layouts/AppLayout';
import { useAuth } from './contexts/AuthContext';

import { Login } from './pages/Login';
import { RequestAccess } from './pages/RequestAccess';
import { AdminDashboard } from './pages/admin/Dashboard';
import { AccessRequests } from './pages/admin/AccessRequests';
import { Employees } from './pages/admin/Employees';
import { TimeLogs } from './pages/admin/TimeLogs';
import { TotemClock } from './pages/TotemClock';

const RootRoute = () => {
  const { user } = useAuth();
  if (user?.role === 'admin') return <Navigate to="/dashboard" replace />;
  if (user?.role === 'totem') return <Navigate to="/totem" replace />;
  return <Navigate to="/login" replace />;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/solicitar-acesso" element={<RequestAccess />} />
        
        {/* Totem Route without the global navbar wrapper */}
        <Route path="/totem" element={
          <ProtectedRoute requiredRole="totem">
            <TotemClock />
          </ProtectedRoute>
        } />

        {/* Root Route to dictate base dashboard */}
        <Route path="/" element={<ProtectedRoute><RootRoute /></ProtectedRoute>} />

        {/* Global Layout only for Admin now */}
        <Route element={<ProtectedRoute requiredRole="admin"><AppLayout /></ProtectedRoute>}>
          <Route path="/dashboard" element={<AdminDashboard />} />
          <Route path="/solicitacoes" element={<AccessRequests />} />
          <Route path="/employees" element={<Employees />} />
          <Route path="/logs" element={<TimeLogs />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
