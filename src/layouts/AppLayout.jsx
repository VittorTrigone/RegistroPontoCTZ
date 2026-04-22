import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, Home, Users, Clock, Mail, Building2 } from 'lucide-react';

export const AppLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) return null;

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50">
      <nav className="bg-white border-r border-slate-200 flex flex-col justify-between w-full md:w-64 border-b md:border-b-0">
        <div className="p-4">
          <div className="hidden md:flex items-center space-x-2 text-primary-600 font-bold text-xl mb-8">
            <Clock size={28} />
            <span>FacePoint RH</span>
          </div>
          
          <ul className="flex flex-row md:flex-col overflow-x-auto gap-2">
            {user.role === 'admin' && (
              <>
                <li>
                  <NavLink to="/dashboard" className={({isActive}) => `flex items-center space-x-3 p-3 rounded-xl transition-colors whitespace-nowrap ${isActive ? 'bg-primary-50 text-primary-600 font-medium' : 'text-slate-600 hover:bg-slate-50'}`}>
                    <Home size={20} /> <span className="hidden md:inline">Visão Geral</span>
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/employees" className={({isActive}) => `flex items-center space-x-3 p-3 rounded-xl transition-colors whitespace-nowrap ${isActive ? 'bg-primary-50 text-primary-600 font-medium' : 'text-slate-600 hover:bg-slate-50'}`}>
                    <Users size={20} /> <span className="hidden md:inline">Funcionários</span>
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/logs" className={({isActive}) => `flex items-center space-x-3 p-3 rounded-xl transition-colors whitespace-nowrap ${isActive ? 'bg-primary-50 text-primary-600 font-medium' : 'text-slate-600 hover:bg-slate-50'}`}>
                    <Clock size={20} /> <span className="hidden md:inline">Espelho de Ponto</span>
                  </NavLink>
                </li>
              </>
            )}

            {user.role === 'superadmin' && (
              <>
                <li>
                  <NavLink to="/solicitacoes" className={({isActive}) => `flex items-center space-x-3 p-3 rounded-xl transition-colors whitespace-nowrap ${isActive ? 'bg-primary-50 text-primary-600 font-medium' : 'text-slate-600 hover:bg-slate-50'}`}>
                    <Mail size={20} /> <span className="hidden md:inline">Solicitações B2B</span>
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/empresas" className={({isActive}) => `flex items-center space-x-3 p-3 rounded-xl transition-colors whitespace-nowrap ${isActive ? 'bg-primary-50 text-primary-600 font-medium' : 'text-slate-600 hover:bg-slate-50'}`}>
                    <Building2 size={20} /> <span className="hidden md:inline">Empresas Clientes</span>
                  </NavLink>
                </li>
              </>
            )}
          </ul>
        </div>
        
        <div className="p-4 hidden md:block">
          <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-100">
            <div className="overflow-hidden">
              <p className="text-sm font-medium text-slate-800 truncate">{user.name}</p>
              <p className="text-xs text-slate-500 truncate">{user.role}</p>
            </div>
            <button onClick={handleLogout} className="text-slate-400 hover:text-red-500 p-2 rounded-lg transition-colors">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-5xl mx-auto p-4 md:p-8 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
};
