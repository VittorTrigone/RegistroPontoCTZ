import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, Home, Users, Clock, Mail, Building2, Menu, X } from 'lucide-react';

export const AppLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) return null;

  const navItems = user.role === 'admin' ? [
    { to: '/dashboard', label: 'Visão Geral', icon: Home },
    { to: '/employees', label: 'Equipe', icon: Users },
    { to: '/logs', label: 'Relatórios', icon: Clock },
  ] : [
    { to: '/solicitacoes', label: 'Solicitações', icon: Mail },
    { to: '/empresas', label: 'Empresas', icon: Building2 },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Mobile Header */}
      <header className="md:hidden bg-white border-b border-slate-200 px-4 py-3 flex justify-between items-center sticky top-0 z-40">
        <div className="flex items-center space-x-2 text-primary-600 font-bold text-lg">
          <Clock size={24} />
          <span>FacePoint</span>
        </div>
        <button 
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="p-2 text-slate-600 hover:bg-slate-50 rounded-lg"
        >
          {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </header>

      {/* Sidebar - Desktop and Mobile Overlay */}
      <nav className={`
        fixed inset-0 z-30 transform md:relative md:translate-x-0 transition-transform duration-300 ease-in-out
        ${isMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        bg-white border-r border-slate-200 w-full md:w-64 flex flex-col justify-between
      `}>
        <div className="p-4">
          <div className="hidden md:flex items-center space-x-2 text-primary-600 font-bold text-xl mb-8">
            <Clock size={28} />
            <span>FacePoint RH</span>
          </div>
          
          <ul className="space-y-1 mt-12 md:mt-0">
            {navItems.map((item) => (
              <li key={item.to}>
                <NavLink 
                  to={item.to} 
                  onClick={() => setIsMenuOpen(false)}
                  className={({isActive}) => `
                    flex items-center space-x-3 p-3 rounded-xl transition-all
                    ${isActive ? 'bg-primary-50 text-primary-600 font-semibold shadow-sm' : 'text-slate-600 hover:bg-slate-50'}
                  `}
                >
                  <item.icon size={20} />
                  <span>{item.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
        
        <div className="p-4 border-t border-slate-100">
          <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl">
            <div className="overflow-hidden">
              <p className="text-sm font-semibold text-slate-800 truncate">{user.name}</p>
              <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">{user.role}</p>
            </div>
            <button 
              onClick={handleLogout} 
              className="text-slate-400 hover:text-red-500 p-2 rounded-lg transition-colors bg-white shadow-sm border border-slate-100"
              title="Sair"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </nav>

      {/* Overlay for mobile sidebar */}
      {isMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-20 md:hidden"
          onClick={() => setIsMenuOpen(false)}
        />
      )}

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-6xl mx-auto p-4 md:p-8">
        <Outlet />
      </main>
    </div>
  );
};
