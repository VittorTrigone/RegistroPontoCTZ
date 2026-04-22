import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export const ProtectedRoute = ({ children, requiredRole = null }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <div className="min-h-screen flex items-center justify-center text-primary-500">Carregando...</div>;

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // If a specific role is required and user doesnt match
  if (requiredRole && user.role !== requiredRole) {
    if (user.role === 'totem') return <Navigate to="/totem" replace />;
    if (user.role === 'admin') return <Navigate to="/dashboard" replace />;
    return <Navigate to="/" replace />;
  }

  return children;
};
