import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Calendar, Settings, History, ScanFace } from 'lucide-react';
import { format } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';
import { Button } from '../../components/ui/Button';

export const EmployeeDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex flex-col min-h-[100dvh] relative bg-[#F5F5F7]">
      {/* Dark Header Background */}
      <div className="absolute top-0 left-0 right-0 h-[45%] bg-[#1c1c1e] z-0 rounded-b-[40px]"></div>

      <div className="relative z-10 flex-1 flex flex-col pt-10 px-5">
        {/* Logo and Date */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center justify-center mb-6">
            <img src="/logo.png" alt="N-Ponto Logo" className="h-16 w-auto object-contain rounded-xl" />
          </div>
          
          <div className="flex items-center text-slate-300 text-sm font-medium w-full mb-4">
            <Calendar size={16} className="mr-2" />
            <span className="capitalize">{format(currentTime, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}</span>
          </div>

          <div className="w-full text-left">
            <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Bem-vindo(a)!</h1>
            <p className="text-slate-400 text-base">Seu sistema de ponto digital.</p>
          </div>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-t-[32px] rounded-b-[32px] p-6 shadow-xl shadow-black/5 mb-8 w-full">
          <div className="text-center mb-6">
            <p className="text-slate-500 font-medium text-sm mb-1">Hora atual</p>
            <div className="text-[2.75rem] font-black text-slate-800 tracking-tighter tabular-nums leading-none">
              {format(currentTime, "HH:mm:ss")}
            </div>
          </div>
          
          <Button 
            className="w-full h-16 rounded-[20px] text-lg font-bold shadow-lg shadow-primary-500/30"
            onClick={() => navigate('/app/clock')}
          >
            <ScanFace size={24} className="mr-3" />
            Bater ponto
          </Button>
        </div>

        {/* Shortcuts */}
        <div className="w-full px-2">
          <h2 className="text-slate-800 font-bold text-lg mb-4">Seus atalhos</h2>
          
          <div className="grid grid-cols-1 gap-4">
            <button 
              onClick={() => navigate('/app/history')}
              className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 flex flex-col items-start text-left hover:shadow-md transition-shadow w-full"
            >
              <div className="text-primary-500 mb-4">
                <History size={24} strokeWidth={1.5} />
              </div>
              <h3 className="font-bold text-slate-800 mb-1">Histórico</h3>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">Seus pontos registrados</p>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
