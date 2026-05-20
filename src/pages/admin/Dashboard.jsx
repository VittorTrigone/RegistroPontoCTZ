import React from 'react';
import { usePonto } from '../../contexts/PontoContext';
import { Users, Fingerprint, Clock, Activity, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const AdminDashboard = () => {
  const { employees, getTodayLogs } = usePonto();
  const navigate = useNavigate();
  const todayLogs = getTodayLogs();
  
  const employeesWithBiometrics = employees.filter(e => e.hasBiometrics).length;
  
  // Unique employees who clocked in today
  const uniqueClockinsArray = [...new Set(todayLogs.map(l => l.userId))];
  const presentToday = uniqueClockinsArray.length;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
           <h1 className="text-3xl font-black text-slate-800 tracking-tight">Visão Geral</h1>
           <p className="text-slate-500 font-medium mt-1">Bem-vindo ao N-Ponto RH</p>
        </div>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        
        {/* Card 1 */}
        <div className="glass p-5 rounded-3xl shadow-lg shadow-slate-200/40 relative overflow-hidden group hover:scale-[1.02] transition-transform">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Users size={64} />
          </div>
          <div className="flex flex-col h-full">
            <div className="bg-primary-50 text-primary-600 p-2.5 rounded-2xl w-fit mb-4">
              <Users size={24} />
            </div>
            <h3 className="text-slate-500 font-medium text-sm mb-1">Funcionários</h3>
            <p className="text-4xl font-black text-slate-800 tracking-tight">{employees.length}</p>
          </div>
        </div>

        {/* Card 2 */}
        <div className="glass p-5 rounded-3xl shadow-lg shadow-slate-200/40 relative overflow-hidden group hover:scale-[1.02] transition-transform">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity text-green-600">
            <Fingerprint size={64} />
          </div>
          <div className="flex flex-col h-full">
            <div className="bg-green-50 text-green-600 p-2.5 rounded-2xl w-fit mb-4">
              <Fingerprint size={24} />
            </div>
            <h3 className="text-slate-500 font-medium text-sm mb-1">Biometrias</h3>
            <div className="flex items-baseline space-x-1">
               <p className="text-4xl font-black text-slate-800 tracking-tight">{employeesWithBiometrics}</p>
               <span className="text-sm font-bold text-slate-400">/ {employees.length}</span>
            </div>
          </div>
        </div>

        {/* Card 3 */}
        <div className="glass p-5 rounded-3xl shadow-lg shadow-slate-200/40 relative overflow-hidden group hover:scale-[1.02] transition-transform">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity text-blue-600">
            <Activity size={64} />
          </div>
          <div className="flex flex-col h-full">
            <div className="bg-blue-50 text-blue-600 p-2.5 rounded-2xl w-fit mb-4">
              <Activity size={24} />
            </div>
            <h3 className="text-slate-500 font-medium text-sm mb-1">Presentes Hoje</h3>
            <div className="flex items-baseline space-x-1">
               <p className="text-4xl font-black text-slate-800 tracking-tight">{presentToday}</p>
               <span className="text-sm font-bold text-slate-400">/ {employees.length}</span>
            </div>
          </div>
        </div>

        {/* Card 4 */}
        <div className="glass p-5 rounded-3xl shadow-lg shadow-slate-200/40 relative overflow-hidden group hover:scale-[1.02] transition-transform">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity text-orange-600">
            <Clock size={64} />
          </div>
          <div className="flex flex-col h-full">
            <div className="bg-orange-50 text-orange-600 p-2.5 rounded-2xl w-fit mb-4">
              <Clock size={24} />
            </div>
            <h3 className="text-slate-500 font-medium text-sm mb-1">Batidas Hoje</h3>
            <p className="text-4xl font-black text-slate-800 tracking-tight">{todayLogs.length}</p>
          </div>
        </div>
        
      </div>
      
      {/* Quick Actions Mobile */}
      <div className="mt-8 pt-6 border-t border-slate-200">
         <h2 className="text-lg font-bold text-slate-800 mb-4">Acesso Rápido</h2>
         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button onClick={() => navigate('/employees')} className="glass flex items-center justify-between p-4 rounded-2xl hover:bg-slate-50 active:scale-95 transition-all text-left">
               <div className="flex items-center space-x-4">
                  <div className="bg-slate-100 p-3 rounded-xl text-slate-600">
                     <Users size={20} />
                  </div>
                  <div>
                     <p className="font-bold text-slate-800">Gerenciar Equipe</p>
                     <p className="text-xs text-slate-500 font-medium">Cadastrar biometrias</p>
                  </div>
               </div>
               <ArrowRight size={20} className="text-slate-400" />
            </button>
            <button onClick={() => navigate('/logs')} className="glass flex items-center justify-between p-4 rounded-2xl hover:bg-slate-50 active:scale-95 transition-all text-left">
               <div className="flex items-center space-x-4">
                  <div className="bg-slate-100 p-3 rounded-xl text-slate-600">
                     <Clock size={20} />
                  </div>
                  <div>
                     <p className="font-bold text-slate-800">Espelho de Ponto</p>
                     <p className="text-xs text-slate-500 font-medium">Ver horários e faltas</p>
                  </div>
               </div>
               <ArrowRight size={20} className="text-slate-400" />
            </button>
         </div>
      </div>
    </div>
  );
};
