import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AppLayout } from './layouts/AppLayout';
import { EmployeeLayout } from './layouts/EmployeeLayout';
import { useAuth } from './contexts/AuthContext';

import { Login } from './pages/Login';
import { RequestAccess } from './pages/RequestAccess';
import { AdminDashboard } from './pages/admin/Dashboard';
import { AccessRequests } from './pages/admin/AccessRequests';
import { Employees } from './pages/admin/Employees';
import { TimeLogs } from './pages/admin/TimeLogs';
import { ManageHolidays } from './pages/admin/ManageHolidays';
import { ManageCompanies } from './pages/admin/ManageCompanies';
import { TotemClock } from './pages/TotemClock';

// Employee Pages
import { EmployeeDashboard } from './pages/employee/EmployeeDashboard';
import { MoreOptions } from './pages/employee/MoreOptions';
import { EmployeeClock } from './pages/employee/Clock';
import { EmployeeHistory } from './pages/employee/History';
import { FaceRegistration } from './pages/employee/FaceRegistration';

const RootRoute = () => {
  const { user } = useAuth();
  if (user?.role === 'superadmin') return <Navigate to="/solicitacoes" replace />;
  if (user?.role === 'admin') return <Navigate to="/dashboard" replace />;
  if (user?.role === 'totem') return <Navigate to="/totem" replace />;
  if (user?.role === 'employee') return <Navigate to="/app" replace />;
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

        {/* ========================================= */}
        {/* APP FUNCIONÁRIO (Mobile-first Layout)     */}
        {/* ========================================= */}
        <Route path="/app" element={<ProtectedRoute requiredRole="employee"><EmployeeLayout /></ProtectedRoute>}>
          <Route index element={<EmployeeDashboard />} />
          <Route path="mais" element={<MoreOptions />} />
          <Route path="history" element={<EmployeeHistory />} />
          <Route path="settings" element={<FaceRegistration />} />
        </Route>
        
        {/* Rota para Câmera isolada do Layout (Fullscreen) */}
        <Route path="/app/clock" element={<ProtectedRoute requiredRole="employee"><EmployeeClock /></ProtectedRoute>} />

        {/* ========================================= */}
        {/* PAINEL ADMIN (Desktop-first Layout)       */}
        {/* ========================================= */}
        <Route element={<ProtectedRoute requiredRole={['admin', 'superadmin']}><AppLayout /></ProtectedRoute>}>
          {/* Admin Routes */}
          <Route path="/dashboard" element={<ProtectedRoute requiredRole="admin"><AdminDashboard /></ProtectedRoute>} />
          <Route path="/employees" element={<ProtectedRoute requiredRole="admin"><Employees /></ProtectedRoute>} />
          <Route path="/logs" element={<ProtectedRoute requiredRole="admin"><TimeLogs /></ProtectedRoute>} />
          <Route path="/holidays" element={<ProtectedRoute requiredRole="admin"><ManageHolidays /></ProtectedRoute>} />
          
          {/* Superadmin Routes */}
          <Route path="/solicitacoes" element={<ProtectedRoute requiredRole="superadmin"><AccessRequests /></ProtectedRoute>} />
          <Route path="/empresas" element={<ProtectedRoute requiredRole="superadmin"><ManageCompanies /></ProtectedRoute>} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
