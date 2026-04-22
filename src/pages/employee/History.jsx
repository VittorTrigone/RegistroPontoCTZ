import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { usePonto } from '../../contexts/PontoContext';
import { format } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';

export const EmployeeHistory = () => {
  const { user } = useAuth();
  const { getUserLogs } = usePonto();
  
  const myLogs = getUserLogs(user.id);

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Meu Histórico</h1>
      
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {myLogs.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            Você ainda não possui registros de ponto.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {myLogs.map((log) => (
              <div key={log.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                <div>
                  <p className="font-semibold text-slate-800">
                    {format(new Date(log.timestamp), "dd 'de' MMMM, yyyy", { locale: ptBR })}
                  </p>
                  <p className="text-sm text-slate-500">
                    Localização: {log.coords ? `${log.coords.lat.toFixed(4)}, ${log.coords.lng.toFixed(4)}` : 'Não registrada'}
                    {log.manual && <span className="ml-2 text-primary-500 text-xs font-medium bg-primary-50 px-2 py-0.5 rounded-md">Editado pelo RH</span>}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-slate-900">
                    {format(new Date(log.timestamp), 'HH:mm')}
                  </p>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    log.type === 'Entrada' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
                  }`}>
                    {log.type}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
