import React from 'react';
import { usePonto } from '../../contexts/PontoContext';
import { Users, Fingerprint, Clock, Activity } from 'lucide-react';

export const AdminDashboard = () => {
  const { employees, getTodayLogs } = usePonto();
  const todayLogs = getTodayLogs();
  
  const employeesWithBiometrics = employees.filter(e => e.hasBiometrics).length;
  
  // Unique employees who clocked in today
  const uniqueClockinsArray = [...new Set(todayLogs.map(l => l.userId))];
  const presentToday = uniqueClockinsArray.length;

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Visão Geral</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-slate-500 font-medium">Total de Funcionários</h3>
            <div className="bg-primary-50 text-primary-600 p-2 rounded-lg"><Users size={20} /></div>
          </div>
          <p className="text-3xl font-bold text-slate-800">{employees.length}</p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-slate-500 font-medium">Biometrias Ativas</h3>
            <div className="bg-green-50 text-green-600 p-2 rounded-lg"><Fingerprint size={20} /></div>
          </div>
          <p className="text-3xl font-bold text-slate-800">{employeesWithBiometrics} <span className="text-sm font-normal text-slate-400">/ {employees.length}</span></p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-slate-500 font-medium">Presentes Hoje</h3>
            <div className="bg-blue-50 text-blue-600 p-2 rounded-lg"><Activity size={20} /></div>
          </div>
          <p className="text-3xl font-bold text-slate-800">{presentToday} <span className="text-sm font-normal text-slate-400">/ {employees.length}</span></p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-slate-500 font-medium">Batidas Hoje</h3>
            <div className="bg-orange-50 text-orange-600 p-2 rounded-lg"><Clock size={20} /></div>
          </div>
          <p className="text-3xl font-bold text-slate-800">{todayLogs.length}</p>
        </div>
        
      </div>
    </div>
  );
};
