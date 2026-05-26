import React from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, Home, Users, Clock, Mail, Building2, UserCircle, Calendar } from 'lucide-react';

export const AppLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) return null;

  // Renderiza ícones de acordo com o Role
  const renderNavLinks = (isMobile = false) => {
    const adminLinks = [
      { to: '/dashboard', icon: Home, label: 'Visão Geral' },
      { to: '/employees', icon: Users, label: 'Equipe' },
      { to: '/logs', icon: Clock, label: 'Ponto' },
      { to: '/holidays', icon: Calendar, label: 'Férias/Feriados' },
    ];
    
    const superadminLinks = [
      { to: '/solicitacoes', icon: Mail, label: 'Pedidos' },
      { to: '/empresas', icon: Building2, label: 'Empresas' },
    ];

    const links = user.role === 'admin' ? adminLinks : superadminLinks;

    return links.map((link) => {
      const Icon = link.icon;
      const isActive = location.pathname.includes(link.to);
      
      if (isMobile) {
        return (
          <NavLink key={link.to} to={link.to} className={`flex flex-col items-center justify-center w-full py-2 transition-all duration-300 ${isActive ? 'text-primary-500 scale-110' : 'text-slate-400 hover:text-slate-600'}`}>
            <div className={`relative p-1.5 rounded-full mb-1 transition-colors ${isActive ? 'bg-primary-50' : ''}`}>
               <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
            </div>
            <span className={`text-[10px] font-medium tracking-wide ${isActive ? 'text-primary-600 font-bold' : ''}`}>{link.label}</span>
          </NavLink>
        );
      }

      return (
        <li key={link.to} className="w-full">
          <NavLink to={link.to} className={({isActive}) => `flex items-center space-x-3 px-4 py-3.5 rounded-2xl transition-all duration-300 ${isActive ? 'bg-primary-50 text-primary-600 font-semibold shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}>
            <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
            <span className="tracking-wide">{link.label}</span>
          </NavLink>
        </li>
      );
    });
  };

  return (
    <div className="min-h-[100dvh] flex flex-col md:flex-row bg-slate-50 font-sans selection:bg-primary-500 selection:text-white">
      
      {/* ========================================================= */}
      {/* DESKTOP SIDEBAR (Oculto em Celulares)                       */}
      {/* ========================================================= */}
      <aside className="hidden md:flex flex-col w-72 glass border-r border-slate-200/50 shadow-xl shadow-slate-200/20 z-40 relative">
        <div className="p-8 flex items-center justify-center border-b border-slate-200/50 pb-6 mb-2">
          <img src="/logo.png" alt="N-Ponto Logo" className="h-16 w-16 rounded-2xl object-cover shadow-md shadow-slate-200" />
        </div>
        
        <div className="flex-1 px-4 overflow-y-auto no-scrollbar">
          <ul className="space-y-2">
            {renderNavLinks(false)}
          </ul>
        </div>
        
        <div className="p-4 mt-auto">
          <div className="glass bg-white/50 p-4 rounded-2xl border border-white/60 flex items-center justify-between group hover:bg-white transition-all">
            <div className="flex items-center space-x-3 overflow-hidden">
               <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
                  <UserCircle size={24} />
               </div>
               <div className="overflow-hidden">
                 <p className="text-sm font-bold text-slate-800 truncate">{user.name}</p>
                 <p className="text-xs text-slate-500 font-medium capitalize truncate">{user.role}</p>
               </div>
            </div>
            <button onClick={handleLogout} className="text-slate-400 hover:text-red-500 p-2 rounded-xl hover:bg-red-50 transition-colors" title="Sair do sistema">
              <LogOut size={18} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </aside>

      {/* ========================================================= */}
      {/* MOBILE HEADER (Visível apenas em Celulares)                 */}
      {/* ========================================================= */}
      <header className="md:hidden glass sticky top-0 z-40 px-5 py-4 flex items-center justify-between border-b border-white/50">
         <div className="flex items-center">
            <img src="/logo.png" alt="N-Ponto Logo" className="h-10 w-10 rounded-xl object-cover shadow-sm" />
         </div>
         <button onClick={handleLogout} className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:text-red-500 transition-colors">
            <LogOut size={18} />
         </button>
      </header>

      {/* ========================================================= */}
      {/* MAIN CONTENT AREA                                           */}
      {/* ========================================================= */}
      {/* No mobile: Padding-bottom extra para não sobrepor a bottom bar */}
      <main className="flex-1 w-full max-w-6xl mx-auto p-4 md:p-10 pb-28 md:pb-10 overflow-y-auto no-scrollbar animate-in fade-in duration-500">
        <Outlet />
      </main>

      {/* ========================================================= */}
      {/* MOBILE BOTTOM NAVIGATION BAR (Oculto em Desktop)            */}
      {/* ========================================================= */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 glass border-t border-white/50 shadow-[0_-10px_40px_rgb(0,0,0,0.03)] z-50 pb-safe">
         <div className="flex items-end justify-around px-2 pb-2 pt-1">
            {renderNavLinks(true)}
         </div>
      </nav>

    </div>
  );
};
