import React from 'react';
import { Outlet, NavLink, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Home, Menu } from 'lucide-react';

export const EmployeeLayout = () => {
  const { user } = useAuth();
  const location = useLocation();

  if (!user || user.role !== 'employee') {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-[100dvh] flex flex-col bg-slate-100 font-sans selection:bg-primary-500 selection:text-white">
      {/* ========================================================= */}
      {/* MAIN CONTENT AREA                                           */}
      {/* ========================================================= */}
      {/* Padding-bottom extra para não sobrepor a bottom bar */}
      <main className="flex-1 w-full max-w-lg mx-auto pb-[90px] overflow-y-auto no-scrollbar relative animate-in fade-in duration-500">
        <Outlet />
      </main>

      {/* ========================================================= */}
      {/* MOBILE BOTTOM NAVIGATION BAR                                */}
      {/* ========================================================= */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-white/90 backdrop-blur-xl border-t border-slate-200/50 shadow-[0_-10px_40px_rgb(0,0,0,0.03)] z-50 rounded-t-3xl pb-safe">
         <div className="flex items-center justify-center space-x-12 px-6 py-3">
            
            <NavLink 
              to="/app" 
              end
              className={({ isActive }) => `flex flex-col items-center justify-center py-1 transition-all duration-300 w-20 ${isActive ? 'text-primary-600' : 'text-slate-400 hover:text-slate-500'}`}
            >
              {({ isActive }) => (
                <>
                  <div className={`relative p-1.5 rounded-full mb-1 transition-colors ${isActive ? 'bg-primary-50' : ''}`}>
                    <Home size={26} strokeWidth={isActive ? 2.5 : 2} />
                  </div>
                  <span className={`text-xs tracking-wide ${isActive ? 'font-bold' : 'font-medium'}`}>Início</span>
                </>
              )}
            </NavLink>

            <NavLink 
              to="/app/mais" 
              className={({ isActive }) => `flex flex-col items-center justify-center py-1 transition-all duration-300 w-20 ${isActive ? 'text-primary-600' : 'text-slate-400 hover:text-slate-500'}`}
            >
              {({ isActive }) => (
                <>
                  <div className={`relative p-1.5 rounded-full mb-1 transition-colors ${isActive ? 'bg-primary-50' : ''}`}>
                    <Menu size={26} strokeWidth={isActive ? 2.5 : 2} />
                  </div>
                  <span className={`text-xs tracking-wide ${isActive ? 'font-bold' : 'font-medium'}`}>Mais</span>
                </>
              )}
            </NavLink>

         </div>
      </nav>
    </div>
  );
};
