import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { History, Settings, LogOut, ChevronRight } from 'lucide-react';

export const MoreOptions = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex flex-col min-h-[100dvh] bg-[#1c1c1e] text-white">
      <div className="flex-1 flex flex-col pt-10 px-5 max-w-lg mx-auto w-full">
        
        {/* Logo */}
        <div className="flex items-center justify-center space-x-2 text-white mb-10">
          <div className="flex flex-col space-y-1">
            <div className="w-5 h-1 bg-primary-500 rounded-full"></div>
            <div className="w-5 h-1 bg-primary-500 rounded-full"></div>
            <div className="w-5 h-1 bg-primary-500 rounded-full"></div>
          </div>
          <span className="text-xl font-black tracking-widest uppercase">N-Ponto</span>
        </div>

        <h1 className="text-2xl font-bold mb-6 tracking-tight">Mais opções</h1>

        <div className="space-y-3">
          <button 
            onClick={() => navigate('/app/history')}
            className="w-full bg-[#2c2c2e]/60 hover:bg-[#3a3a3c]/80 backdrop-blur-md rounded-2xl p-5 flex items-center justify-between transition-colors border border-white/5"
          >
            <div className="flex items-center space-x-4">
              <div className="text-primary-500">
                <History size={24} strokeWidth={1.5} />
              </div>
              <span className="font-bold text-lg">Histórico</span>
            </div>
            <ChevronRight size={20} className="text-slate-500" />
          </button>

          <button 
            onClick={() => navigate('/app/settings')}
            className="w-full bg-[#2c2c2e]/60 hover:bg-[#3a3a3c]/80 backdrop-blur-md rounded-2xl p-5 flex items-center justify-between transition-colors border border-white/5"
          >
            <div className="flex items-center space-x-4">
              <div className="text-primary-500">
                <Settings size={24} strokeWidth={1.5} />
              </div>
              <span className="font-bold text-lg">Configurações</span>
            </div>
            <ChevronRight size={20} className="text-slate-500" />
          </button>

          <button 
            onClick={handleLogout}
            className="w-full bg-[#2c2c2e]/60 hover:bg-[#3a3a3c]/80 backdrop-blur-md rounded-2xl p-5 flex items-center justify-between transition-colors border border-white/5 mt-6"
          >
            <div className="flex items-center space-x-4">
              <div className="text-red-500">
                <LogOut size={24} strokeWidth={1.5} />
              </div>
              <span className="font-bold text-lg text-white">Sair</span>
            </div>
            <ChevronRight size={20} className="text-slate-500" />
          </button>
        </div>

      </div>
    </div>
  );
};
