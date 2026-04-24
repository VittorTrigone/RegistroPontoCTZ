import React, { useState } from 'react';
import { usePonto } from '../../contexts/PontoContext';
import { format } from 'date-fns';
import { Button } from '../../components/ui/Button';
import { Pencil, Trash2, Plus, X } from 'lucide-react';
import { Input } from '../../components/ui/Input';

export const TimeLogs = () => {
  const { logs, employees, editLogTime, deleteLog, addManualLog } = usePonto();
  const [editingId, setEditingId] = useState(null);
  const [editVal, setEditVal] = useState('');
  const [filterEmpId, setFilterEmpId] = useState('ALL');
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ userId: '', type: 'Entrada', datetime: '' });

  const getUser = (id) => employees.find(e => e.id === id);
  const getUserName = (id) => {
    const emp = getUser(id);
    return emp ? emp.name : 'Desconhecido';
  };

  const handleEditClick = (log) => {
    setEditingId(log.id);
    const d = new Date(log.timestamp);
    const h = d.getHours().toString().padStart(2, '0');
    const m = d.getMinutes().toString().padStart(2, '0');
    const s = d.getSeconds().toString().padStart(2, '0');
    setEditVal(`${h}:${m}:${s}`);
  };

  const handleSave = (log) => {
    const [h, m, s] = editVal.split(':');
    const d = new Date(log.timestamp);
    d.setHours(parseInt(h || 0, 10));
    d.setMinutes(parseInt(m || 0, 10));
    d.setSeconds(parseInt(s || 0, 10));
    
    editLogTime(log.id, d.toISOString());
    setEditingId(null);
  };

  const handleDelete = (logId) => {
    if (confirm("Tem certeza que deseja excluir este registro de ponto? Essa ação não pode ser desfeita.")) {
      deleteLog(logId);
    }
  };
  
  const handleAddManual = (e) => {
    e.preventDefault();
    if (!addForm.userId || !addForm.datetime) return;
    
    addManualLog(addForm.userId, addForm.type, addForm.datetime);
    setShowAddModal(false);
  };

  let displayedLogs = logs.sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));
  if (filterEmpId !== 'ALL') {
    displayedLogs = displayedLogs.filter(log => log.userId === filterEmpId);
  }
  if (filterDate) {
    // timestamp is ISO string e.g. "2023-10-25T..."
    displayedLogs = displayedLogs.filter(log => {
       // get local date string YYYY-MM-DD
       const logDate = new Date(log.timestamp);
       const y = logDate.getFullYear();
       const m = String(logDate.getMonth() + 1).padStart(2, '0');
       const d = String(logDate.getDate()).padStart(2, '0');
       return `${y}-${m}-${d}` === filterDate;
    });
  }

  // Calculate Balance if specific Employee and Date are selected
  let dailyBalance = null;
  let isWorkingDay = true;
  if (filterEmpId !== 'ALL' && filterDate) {
    const emp = getUser(filterEmpId);
    if (emp) {
      // 1. Calculate Expected Hours
      const targetDate = new Date(filterDate + 'T12:00:00'); // noon local
      const dayOfWeek = targetDate.getDay(); // 0 = Sun
      
      const schedule = emp.work_schedule || {};
      const dayConfig = schedule[dayOfWeek] || { active: false };
      
      isWorkingDay = dayConfig.active;
      
      let expectedMs = 0;
      if (isWorkingDay) {
         const startStr = dayConfig.start || '09:00';
         const endStr = dayConfig.end || '18:00';
         const lunchMin = dayConfig.lunch || 60;
         
         const startParts = startStr.split(':');
         const endParts = endStr.split(':');
         const startMs = (parseInt(startParts[0])*60 + parseInt(startParts[1])) * 60000;
         const endMs = (parseInt(endParts[0])*60 + parseInt(endParts[1])) * 60000;
         
         expectedMs = (endMs - startMs) - (lunchMin * 60000);
      }

      // 2. Calculate Actual Hours
      // Only for displayedLogs
      let actualMs = 0;
      const sortedDayLogs = [...displayedLogs].sort((a,b) => new Date(a.timestamp) - new Date(b.timestamp));
      
      const entradas = sortedDayLogs.filter(l => l.type === 'Entrada');
      const inicioAlmoco = sortedDayLogs.filter(l => l.type === 'Inicio do Almoço');
      const fimAlmoco = sortedDayLogs.filter(l => l.type === 'Fim do Almoço');
      const saidas = sortedDayLogs.filter(l => l.type === 'Saida');

      // First shift: Entrada -> Inicio do Almoço
      if (entradas[0] && inicioAlmoco[0]) {
         actualMs += new Date(inicioAlmoco[0].timestamp) - new Date(entradas[0].timestamp);
      }
      
      // Second shift: Fim do Almoço -> Saida
      if (fimAlmoco[0] && saidas[0]) {
         actualMs += new Date(saidas[0].timestamp) - new Date(fimAlmoco[0].timestamp);
      } else if (entradas[0] && saidas[0] && !inicioAlmoco[0] && !fimAlmoco[0]) {
         // Direct shift without lunch logged
         actualMs += new Date(saidas[0].timestamp) - new Date(entradas[0].timestamp);
      }
      
      // If shift is complete
      const isComplete = (entradas.length > 0 && saidas.length > 0);
      
      if (isComplete || expectedMs === 0) {
         let diffMs = actualMs - expectedMs;
         
         // Tolerância customizada: perdoa os primeiros 10 minutos de ATRASO apenas
         if (diffMs < 0) {
            // Funcionário devendo horas - perdoa até 10 min
            if (Math.abs(diffMs) <= 10 * 60000) {
               diffMs = 0;
            } else {
               diffMs += 10 * 60000;
            }
         }
         // Se diffMs >= 0 (hora extra), mantém o valor integral
         
         dailyBalance = {
           expectedStr: expectedMs > 0 ? (expectedMs / 3600000).toFixed(1) + 'h' : 'Folga',
           actualStr: (actualMs / 3600000).toFixed(1) + 'h',
           diffMs: diffMs,
           isComplete
         };
      } else {
         dailyBalance = { incomplete: true };
      }
    }
  }

  // 3. Calculate Lifetime Balance
  let lifetimeBalanceMs = 0;
  if (filterEmpId !== 'ALL') {
     const empLogs = logs.filter(l => l.userId === filterEmpId).sort((a,b) => new Date(a.timestamp) - new Date(b.timestamp));
     if (empLogs.length > 0) {
        const emp = getUser(filterEmpId);
        const schedule = emp?.work_schedule || {};
        
        const firstLogDate = new Date(empLogs[0].timestamp);
        firstLogDate.setHours(0,0,0,0);
        
        const today = new Date();
        today.setHours(0,0,0,0);
        
        let currentDate = new Date(firstLogDate);
        
        while (currentDate <= today) {
           const y = currentDate.getFullYear();
           const m = String(currentDate.getMonth() + 1).padStart(2, '0');
           const d = String(currentDate.getDate()).padStart(2, '0');
           
           const dayOfWeek = currentDate.getDay();
           const dayConfig = schedule[dayOfWeek] || { active: false };
           
           if (dayConfig.active) {
              const startParts = (dayConfig.start || '09:00').split(':');
              const endParts = (dayConfig.end || '18:00').split(':');
              const lunchMin = dayConfig.lunch || 60;
              const expectedMs = ((parseInt(endParts[0])*60 + parseInt(endParts[1])) - (parseInt(startParts[0])*60 + parseInt(startParts[1])) - lunchMin) * 60000;
              
              const dayLogs = empLogs.filter(l => {
                 const lD = new Date(l.timestamp);
                 return lD.getFullYear() === y && lD.getMonth() + 1 === parseInt(m) && lD.getDate() === parseInt(d);
              });
              
              let actualMs = 0;
              const entradas = dayLogs.filter(l => l.type === 'Entrada');
              const inicioAlmoco = dayLogs.filter(l => l.type === 'Inicio do Almoço');
              const fimAlmoco = dayLogs.filter(l => l.type === 'Fim do Almoço');
              const saidas = dayLogs.filter(l => l.type === 'Saida');

              if (entradas[0] && inicioAlmoco[0]) actualMs += new Date(inicioAlmoco[0].timestamp) - new Date(entradas[0].timestamp);
              if (fimAlmoco[0] && saidas[0]) actualMs += new Date(saidas[0].timestamp) - new Date(fimAlmoco[0].timestamp);
              else if (entradas[0] && saidas[0] && !inicioAlmoco[0] && !fimAlmoco[0]) actualMs += new Date(saidas[0].timestamp) - new Date(entradas[0].timestamp);
              
              const isToday = currentDate.getTime() === today.getTime();
              const isComplete = (entradas.length > 0 && saidas.length > 0);
              
              if (!isToday || isComplete) {
                 let dayDiffMs = actualMs - expectedMs;
                 
                 // Tolerância customizada: perdoa os primeiros 10 minutos de ATRASO apenas
                 if (dayDiffMs < 0) {
                    // Funcionário devendo horas - perdoa até 10 min
                    if (Math.abs(dayDiffMs) <= 10 * 60000) {
                       dayDiffMs = 0;
                    } else {
                       dayDiffMs += 10 * 60000;
                    }
                 }
                 // Se dayDiffMs >= 0 (hora extra), mantém o valor integral
                 
                 lifetimeBalanceMs += dayDiffMs;
              }
           }
           
           currentDate.setDate(currentDate.getDate() + 1);
        }
     }
  }

  const formatMsToHHMM = (ms) => {
    if (!ms) return "00:00h";
    const isNegative = ms < 0;
    const absMs = Math.abs(ms);
    // Arredonda para o minuto mais próximo para evitar erro de floating point
    const totalMinutes = Math.round(absMs / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    
    if (hours === 0 && mins === 0) return "00:00h";
    
    return `${isNegative ? '-' : '+'}${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}h`;
  };

  return (
    <div>
      <div className="mb-6 space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-slate-800">Espelho de Ponto</h1>
          <Button onClick={() => setShowAddModal(true)} className="!px-3 md:!px-4">
            <Plus size={18} className="mr-1 md:mr-2" /><span className="hidden sm:inline">Lançar </span>Ponto
          </Button>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <div className="flex items-center space-x-2 bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-sm flex-1 min-w-0">
             <label className="text-sm font-medium text-slate-500 shrink-0">Data:</label>
             <input 
               type="date"
               className="bg-transparent outline-none text-slate-800 font-medium cursor-pointer w-full min-w-0"
               value={filterDate}
               onChange={(e) => setFilterDate(e.target.value)}
             />
          </div>

          <div className="flex items-center space-x-2 bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-sm flex-1 min-w-0">
             <label className="text-sm font-medium text-slate-500 shrink-0">Func:</label>
             <select 
               className="bg-transparent outline-none text-slate-800 font-medium cursor-pointer w-full min-w-0"
               value={filterEmpId}
               onChange={(e) => setFilterEmpId(e.target.value)}
             >
               <option value="ALL">Todos</option>
               {employees.map(emp => (
                 <option key={emp.id} value={emp.id}>{emp.name}</option>
               ))}
             </select>
          </div>
        </div>
      </div>

      {filterEmpId !== 'ALL' && (
        <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Daily Balance Card */}
          {filterDate && dailyBalance && (
            <div className={`p-5 rounded-2xl border ${dailyBalance.incomplete ? 'bg-slate-50 border-slate-200' : dailyBalance.diffMs >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
               <div className="flex justify-between items-center h-full">
                 <div>
                   <h3 className="text-lg font-bold text-slate-800">Resumo do Dia</h3>
                   <p className="text-sm text-slate-500">
                     {dailyBalance.incomplete ? 'Turno em andamento' : 
                       !isWorkingDay ? 'Dia de Folga' : 
                       `Esperado: ${dailyBalance.expectedStr}`
                     }
                   </p>
                 </div>
                 
                 {!dailyBalance.incomplete && (
                   <div className="text-right">
                     <p className="text-sm font-medium text-slate-500">Saldo Diário</p>
                     <div className={`text-2xl font-black ${dailyBalance.diffMs >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                       {formatMsToHHMM(dailyBalance.diffMs)}
                     </div>
                   </div>
                 )}
               </div>
            </div>
          )}

          {/* Lifetime Balance Card */}
          <div className={`p-5 rounded-2xl border ${lifetimeBalanceMs >= 0 ? 'bg-blue-50 border-blue-200' : 'bg-orange-50 border-orange-200'}`}>
             <div className="flex justify-between items-center h-full">
               <div>
                 <h3 className="text-lg font-bold text-slate-800">Banco de Horas Geral</h3>
                 <p className="text-sm text-slate-500">Desde o primeiro registro</p>
               </div>
               
               <div className="text-right">
                 <p className="text-sm font-medium text-slate-500">Saldo Acumulado</p>
                 <div className={`text-2xl font-black ${lifetimeBalanceMs >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                   {formatMsToHHMM(lifetimeBalanceMs)}
                 </div>
               </div>
             </div>
          </div>

        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-xs sm:text-sm text-slate-500">
                <th className="p-2 sm:p-4 font-medium">Data</th>
                <th className="p-2 sm:p-4 font-medium">Func.</th>
                <th className="p-2 sm:p-4 font-medium">Tipo</th>
                <th className="p-2 sm:p-4 font-medium">Horário</th>
                <th className="p-2 sm:p-4 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayedLogs.length === 0 && (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-slate-500">Nenhum registro encontrado.</td>
                </tr>
              )}
              {displayedLogs.map(log => (
                <tr key={log.id} className="hover:bg-slate-50 transition-colors text-xs sm:text-sm">
                  <td className="p-2 sm:p-4 text-slate-800 whitespace-nowrap">
                    {format(new Date(log.timestamp), "dd/MM/yy")}
                  </td>
                  <td className="p-2 sm:p-4 font-medium text-slate-800 max-w-[80px] sm:max-w-none truncate">{getUserName(log.userId)}</td>
                  <td className="p-2 sm:p-4">
                    <span className={`inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded text-[10px] sm:text-xs font-medium ${
                      log.type === 'Entrada' || log.type === 'Saida' ? 'bg-green-100 text-green-800' :
                      'bg-orange-100 text-orange-800'
                    }`}>
                      {log.type}
                    </span>
                  </td>
                  <td className="p-2 sm:p-4 text-slate-800 font-bold">
                    <div className="flex items-center">
                    {editingId === log.id ? (
                      <input 
                        type="time"
                        step="1" 
                        className="border rounded px-2 py-1 outline-none text-sm w-[100px]" 
                        value={editVal}
                        onChange={(e) => setEditVal(e.target.value)}
                      />
                    ) : (
                      <>
                        <span className="whitespace-nowrap">{format(new Date(log.timestamp), 'HH:mm:ss')}</span>
                        {log.manual && <span className="ml-1 text-[9px] sm:text-[10px] bg-primary-100 text-primary-700 px-1 rounded uppercase font-bold">Ed</span>}
                      </>
                    )}
                    </div>
                  </td>
                  <td className="p-2 sm:p-4 text-right">
                    {editingId === log.id ? (
                      <div className="flex justify-end space-x-1">
                        <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>✕</Button>
                        <Button size="sm" onClick={() => handleSave(log)}>✓</Button>
                      </div>
                    ) : (
                      <div className="flex justify-end space-x-0">
                        <button onClick={() => handleEditClick(log)} title="Editar" className="text-slate-400 hover:text-primary-600 transition-colors p-1 sm:p-2">
                          <Pencil size={16} />
                        </button>
                        <button onClick={() => handleDelete(log.id)} title="Excluir" className="text-slate-400 hover:text-red-500 transition-colors p-1 sm:p-2">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Manual Log */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-4 sm:p-6 shadow-xl overflow-hidden">
            <div className="flex justify-between items-center mb-4">
               <h2 className="text-xl font-bold">Lançar Ponto Manual</h2>
               <button onClick={() => setShowAddModal(false)}><X size={20} className="text-slate-500"/></button>
            </div>
            
            <form onSubmit={handleAddManual} className="space-y-4">
              <div className="space-y-1">
                <label className="block text-sm font-medium text-slate-700">Funcionário</label>
                <select 
                   required
                   className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none"
                   value={addForm.userId}
                   onChange={e => setAddForm({...addForm, userId: e.target.value})}
                >
                   <option value="" disabled>Selecione...</option>
                   {employees.map(emp => (
                     <option key={emp.id} value={emp.id}>{emp.name}</option>
                   ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-sm font-medium text-slate-700">Tipo de Registro</label>
                <select 
                   className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none"
                   value={addForm.type}
                   onChange={e => setAddForm({...addForm, type: e.target.value})}
                >
                   <option value="Entrada">Entrada</option>
                   <option value="Inicio do Almoço">Início do Almoço</option>
                   <option value="Fim do Almoço">Fim do Almoço</option>
                   <option value="Saida">Saída</option>
                </select>
              </div>
              
              <div className="space-y-1">
                <label className="block text-sm font-medium text-slate-700">Data e Hora</label>
                <input 
                  type="datetime-local"
                  required
                  className="w-full max-w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 outline-none text-sm box-border"
                  style={{ boxSizing: 'border-box' }}
                  value={addForm.datetime}
                  onChange={e => setAddForm({...addForm, datetime: e.target.value})}
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <Button type="button" variant="ghost" onClick={() => setShowAddModal(false)}>Cancelar</Button>
                <Button type="submit">Gravar Ponto</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
