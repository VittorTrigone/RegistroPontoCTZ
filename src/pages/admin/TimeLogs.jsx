import React, { useState } from 'react';
import { usePonto } from '../../contexts/PontoContext';
import { format } from 'date-fns';
import { Button } from '../../components/ui/Button';
import { Pencil, Trash2, Plus, X, Settings, Download } from 'lucide-react';
import { Input } from '../../components/ui/Input';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

export const TimeLogs = () => {
  const { logs, employees, editLogTime, deleteLog, addManualLog, companySettings, updateCompanySettings } = usePonto();
  const toleranceMs = companySettings.tolerance_enabled ? (companySettings.tolerance_minutes || 10) * 60000 : 0;
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

  const getHolidayInfo = (dateStr, emp) => {
    // Check Global
    const globalHolidays = companySettings?.global_holidays || [];
    const globalFound = globalHolidays.find(h => h.date === dateStr);
    if (globalFound) return { type: 'Feriado', name: globalFound.name };

    // Check Personal
    if (emp && emp.work_schedule && emp.work_schedule.personal_holidays) {
       const personalFound = emp.work_schedule.personal_holidays.find(h => h.date === dateStr);
       if (personalFound) return { type: 'Afastamento', name: personalFound.name };
    }
    
    return null;
  };

  const getExpectedTime = (log) => {
    const emp = getUser(log.userId);
    if (!emp || !emp.work_schedule) return '-';
    
    const d = new Date(log.timestamp);
    const dayOfWeek = d.getDay();
    const schedule = emp.work_schedule[dayOfWeek];
    
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${day}`;
    
    const holidayInfo = getHolidayInfo(dateStr, emp);
    if (holidayInfo) return `Abonado (${holidayInfo.name})`;
    
    if (!schedule || !schedule.active) return 'Folga';
    
    if (log.type === 'Entrada') return schedule.start;
    if (log.type === 'Saida') return schedule.end;
    if (log.type === 'Inicio do Almoço' || log.type === 'Fim do Almoço') return `Almoço: ${schedule.lunch} min`;
    
    return '-';
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
  
  const handleAddManual = async (e) => {
    e.preventDefault();
    if (!addForm.userId || !addForm.datetime) return;
    
    const datePart = addForm.datetime.split('T')[0];
    const existingLog = logs.find(l => 
        l.userId === addForm.userId && 
        l.type === addForm.type && 
        l.timestamp.startsWith(datePart)
    );
    
    if (existingLog) {
       alert(`Já existe um registro de ${addForm.type} para este funcionário no dia ${datePart}! Você deve editar ou excluir o registro existente.`);
       return;
    }
    
    await addManualLog(addForm.userId, addForm.type, addForm.datetime);
    
    setFilterDate(datePart);
    setFilterEmpId(addForm.userId);
    setShowAddModal(false);
  };

  let displayedLogs = logs.sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));
  if (filterEmpId !== 'ALL') {
    displayedLogs = displayedLogs.filter(log => log.userId === filterEmpId);
  }
  if (filterDate) {
    displayedLogs = displayedLogs.filter(log => {
       const logDate = new Date(log.timestamp);
       const y = logDate.getFullYear();
       const m = String(logDate.getMonth() + 1).padStart(2, '0');
       const d = String(logDate.getDate()).padStart(2, '0');
       return `${y}-${m}-${d}` === filterDate;
    });
  }

  // --- NEW: Generate Day Blocks for Rendering ---
  const generateDayBlocks = () => {
    let blocks = [];
    
    const createBlockForEmpDate = (emp, dateStr) => {
      const targetDate = new Date(dateStr + 'T12:00:00');
      const dayOfWeek = targetDate.getDay();
      const schedule = emp.work_schedule || {};
      const dayConfig = schedule[dayOfWeek] || { active: false };
      
      const holidayInfo = getHolidayInfo(dateStr, emp);
      
      const dayLogs = logs.filter(l => {
         if (l.userId !== emp.id) return false;
         const lD = new Date(l.timestamp);
         const y = lD.getFullYear();
         const m = String(lD.getMonth() + 1).padStart(2, '0');
         const d = String(lD.getDate()).padStart(2, '0');
         return `${y}-${m}-${d}` === dateStr;
      });

      const expectedText = holidayInfo 
        ? `Abonado (${holidayInfo.name})` 
        : (!dayConfig.active ? 'Folga' : null);

      const types = ['Entrada', 'Inicio do Almoço', 'Fim do Almoço', 'Saida'];
      const slots = types.map(t => {
         const foundLog = dayLogs.find(l => l.type === t);
         let exp = expectedText;
         if (!exp) {
            if (t === 'Entrada') exp = dayConfig.start;
            else if (t === 'Saida') exp = dayConfig.end;
            else exp = `Almoço: ${dayConfig.lunch}m`;
         }
         return {
           type: t,
           expected: exp,
           log: foundLog || null
         };
      });

      return {
         emp,
         dateStr,
         dayConfig,
         holidayInfo,
         slots,
         hasAnyLog: dayLogs.length > 0
      };
    };

    if (filterEmpId === 'ALL') {
      if (!filterDate) return [];
      employees.forEach(emp => {
         blocks.push(createBlockForEmpDate(emp, filterDate));
      });
    } else {
      const emp = getUser(filterEmpId);
      if (!emp) return [];
      
      if (filterDate) {
         blocks.push(createBlockForEmpDate(emp, filterDate));
      } else {
         const empLogs = logs.filter(l => l.userId === filterEmpId).sort((a,b) => new Date(a.timestamp) - new Date(b.timestamp));
         if (empLogs.length === 0) {
            blocks.push(createBlockForEmpDate(emp, new Date().toISOString().split('T')[0]));
         } else {
            const firstLogDate = new Date(empLogs[0].timestamp);
            firstLogDate.setHours(0,0,0,0);
            const today = new Date();
            today.setHours(0,0,0,0);
            
            let currentDate = new Date(today);
            while (currentDate >= firstLogDate) {
               const y = currentDate.getFullYear();
               const m = String(currentDate.getMonth() + 1).padStart(2, '0');
               const d = String(currentDate.getDate()).padStart(2, '0');
               blocks.push(createBlockForEmpDate(emp, `${y}-${m}-${d}`));
               currentDate.setDate(currentDate.getDate() - 1);
            }
         }
      }
    }
    return blocks;
  };

  const dayBlocks = generateDayBlocks();

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
      
      const holidayInfo = getHolidayInfo(filterDate, emp);
      
      isWorkingDay = dayConfig.active;
      
      const sortedDayLogs = [...displayedLogs].sort((a,b) => new Date(a.timestamp) - new Date(b.timestamp));
      const hasAtestado = sortedDayLogs.some(l => l.type === 'Atestado') || !!holidayInfo;
      
      let expectedMs = 0;
      if (isWorkingDay && !hasAtestado) {
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
      const isComplete = (entradas.length > 0 && saidas.length > 0) || hasAtestado;
      
      if (isComplete || expectedMs === 0) {
         let diffMs = actualMs - expectedMs;
         
         // Tolerância customizada: perdoa os primeiros N minutos de ATRASO apenas
         if (toleranceMs > 0 && diffMs < 0) {
            // Funcionário devendo horas - perdoa até N min
            if (Math.abs(diffMs) <= toleranceMs) {
               diffMs = 0;
            } else {
               diffMs += toleranceMs;
            }
         }
         // Se diffMs >= 0 (hora extra), mantém o valor integral
         
         dailyBalance = {
           expectedStr: hasAtestado ? (holidayInfo ? `Abonado (${holidayInfo.name})` : 'Abonado (Atestado)') : expectedMs > 0 ? (expectedMs / 3600000).toFixed(1) + 'h' : 'Folga',
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
           
           const dateStr = `${y}-${m}-${d}`;
           const holidayInfo = getHolidayInfo(dateStr, emp);
           
           if (dayConfig.active) {
              const startParts = (dayConfig.start || '09:00').split(':');
              const endParts = (dayConfig.end || '18:00').split(':');
              const lunchMin = dayConfig.lunch || 60;
              
              const dayLogs = empLogs.filter(l => {
                 const lD = new Date(l.timestamp);
                 return lD.getFullYear() === y && lD.getMonth() + 1 === parseInt(m) && lD.getDate() === parseInt(d);
              });

              const hasAtestado = dayLogs.some(l => l.type === 'Atestado') || !!holidayInfo;
              const expectedMs = hasAtestado ? 0 : ((parseInt(endParts[0])*60 + parseInt(endParts[1])) - (parseInt(startParts[0])*60 + parseInt(startParts[1])) - lunchMin) * 60000;
              
              let actualMs = 0;
              const entradas = dayLogs.filter(l => l.type === 'Entrada');
              const inicioAlmoco = dayLogs.filter(l => l.type === 'Inicio do Almoço');
              const fimAlmoco = dayLogs.filter(l => l.type === 'Fim do Almoço');
              const saidas = dayLogs.filter(l => l.type === 'Saida');

              if (entradas[0] && inicioAlmoco[0]) actualMs += new Date(inicioAlmoco[0].timestamp) - new Date(entradas[0].timestamp);
              if (fimAlmoco[0] && saidas[0]) actualMs += new Date(saidas[0].timestamp) - new Date(fimAlmoco[0].timestamp);
              else if (entradas[0] && saidas[0] && !inicioAlmoco[0] && !fimAlmoco[0]) actualMs += new Date(saidas[0].timestamp) - new Date(entradas[0].timestamp);
              
              const isToday = currentDate.getTime() === today.getTime();
              const isComplete = (entradas.length > 0 && saidas.length > 0) || hasAtestado;
              
              if (!isToday || isComplete) {
                 let dayDiffMs = actualMs - expectedMs;
                 
                 // Tolerância customizada: perdoa os primeiros N minutos de ATRASO apenas
                 if (toleranceMs > 0 && dayDiffMs < 0) {
                    // Funcionário devendo horas - perdoa até N min
                    if (Math.abs(dayDiffMs) <= toleranceMs) {
                       dayDiffMs = 0;
                    } else {
                       dayDiffMs += toleranceMs;
                    }
                 }
                 
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

  const exportToExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    
    // Planilha 1: Logs Detalhados
    const sheet = workbook.addWorksheet('Registros de Ponto');

    sheet.columns = [
      { header: 'Data', key: 'date', width: 15 },
      { header: 'Horário', key: 'time', width: 15 },
      { header: 'Horário Esperado', key: 'expected', width: 18 },
      { header: 'Funcionário', key: 'name', width: 30 },
      { header: 'Cargo', key: 'role', width: 25 },
      { header: 'Tipo de Batida', key: 'type', width: 25 },
      { header: 'Lançamento Manual?', key: 'manual', width: 20 },
    ];

    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEF4444' } };
    sheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

    // Exportar os logs atuais (com base no filtro de funcionário, mas ignorando o filtro de dia para exportar o histórico dele)
    let logsToExport = logs;
    if (filterEmpId !== 'ALL') {
      logsToExport = logs.filter(l => l.userId === filterEmpId);
    }
    
    logsToExport.sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp)).forEach(log => {
      const emp = getUser(log.userId);
      const d = new Date(log.timestamp);
      
      sheet.addRow({
        date: format(d, 'dd/MM/yyyy'),
        time: format(d, 'HH:mm:ss'),
        expected: getExpectedTime(log),
        name: emp ? emp.name : 'Desconhecido',
        role: emp ? emp.role_title : '-',
        type: log.type,
        manual: log.manual ? 'Sim' : 'Não'
      });
    });

    // Adicionar auto-filtro na primeira linha
    sheet.autoFilter = 'A1:G1';

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `Relatorio_Ponto_${format(new Date(), 'dd-MM-yyyy')}.xlsx`);
  };

  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 space-y-4 md:space-y-0">
        <h1 className="text-2xl font-bold text-slate-800">Espelho de Ponto</h1>
        
        <div className="flex flex-col md:flex-row md:flex-wrap items-stretch md:items-center gap-3 w-full md:w-auto">
          <div className="flex items-center space-x-2 bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-sm flex-1">
             <label className="text-sm font-medium text-slate-500 whitespace-nowrap">Data:</label>
             <input 
               type="date"
               className="bg-transparent outline-none text-slate-800 font-medium cursor-pointer w-full"
               value={filterDate}
               onChange={(e) => setFilterDate(e.target.value)}
             />
          </div>

          <div className="flex items-center space-x-2 bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-sm flex-1">
             <label className="text-sm font-medium text-slate-500 whitespace-nowrap">Funcionário:</label>
             <select 
               className="bg-transparent outline-none text-slate-800 font-medium cursor-pointer w-full truncate"
               value={filterEmpId}
               onChange={(e) => setFilterEmpId(e.target.value)}
             >
               <option value="ALL">Todos os Funcionários</option>
               {employees.map(emp => (
                 <option key={emp.id} value={emp.id}>{emp.name}</option>
               ))}
             </select>
          </div>
          
          <Button onClick={exportToExcel} variant="secondary" className="w-full md:w-auto justify-center bg-green-50 text-green-700 hover:bg-green-100 border-green-200">
            <Download size={18} className="mr-2" /> Exportar
          </Button>

          <Button onClick={() => setShowAddModal(true)} className="w-full md:w-auto justify-center">
            <Plus size={18} className="mr-2" /> Lançar Ponto
          </Button>
        </div>
      </div>

      {/* Tolerance Settings Card */}
      <div className="mb-6 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Settings size={20} className="text-slate-400" />
            <div>
              <h3 className="text-sm font-bold text-slate-700">Tolerância de Atraso</h3>
              <p className="text-xs text-slate-400">Perdoa atrasos pequenos no cálculo do banco de horas</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-slate-500">Minutos:</label>
              <input 
                type="number" 
                min="1" 
                max="60"
                className="w-16 text-sm p-1.5 border border-slate-200 rounded-lg outline-none text-center bg-slate-50 disabled:opacity-40"
                value={companySettings.tolerance_minutes}
                disabled={!companySettings.tolerance_enabled}
                onChange={(e) => updateCompanySettings({ tolerance_minutes: parseInt(e.target.value) || 10 })}
              />
            </div>
            
            <button
              onClick={() => updateCompanySettings({ tolerance_enabled: !companySettings.tolerance_enabled })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                companySettings.tolerance_enabled ? 'bg-primary-500' : 'bg-slate-300'
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                companySettings.tolerance_enabled ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
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

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden mb-8">
        
        {/* Mobile View: Cards */}
        <div className="md:hidden divide-y divide-slate-100">
          {dayBlocks.length === 0 && (
            <div className="p-8 text-center text-slate-500 font-medium">Selecione uma data para ver os registros.</div>
          )}
          {dayBlocks.map(block => (
            <div key={`${block.emp.id}-${block.dateStr}`} className="p-5">
              <div className="mb-4 pb-4 border-b border-slate-100">
                <h3 className="font-black text-slate-800 text-xl">{block.emp.name}</h3>
                <p className="text-sm text-slate-500 font-medium">{format(new Date(block.dateStr + 'T12:00:00'), "dd/MM/yyyy")}</p>
              </div>
              
              <div className="space-y-4">
                {block.slots.map(slot => (
                   <div key={slot.type} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 relative">
                      <div className="flex justify-between items-center mb-2">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          slot.type.includes('Almoço') ? 'bg-orange-100 text-orange-800' : 'bg-green-100 text-green-800'
                        }`}>
                          {slot.type}
                        </span>
                        <span className="text-xs font-bold text-slate-400">Esperado: <span className="text-slate-600">{slot.expected}</span></span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                         <div className="text-slate-800 font-black text-xl flex items-center">
                           {slot.log ? (
                             editingId === slot.log.id ? (
                               <input 
                                 type="time"
                                 step="1" 
                                 className="border rounded px-2 py-1 outline-none text-sm w-32" 
                                 value={editVal}
                                 onChange={(e) => setEditVal(e.target.value)}
                               />
                             ) : (
                               <>
                                 {format(new Date(slot.log.timestamp), 'HH:mm:ss')} 
                                 {slot.log.manual && <span className="ml-2 text-[8px] bg-primary-100 text-primary-700 px-1.5 py-0.5 rounded uppercase font-black tracking-widest">Editado</span>}
                               </>
                             )
                           ) : (
                             <span className="text-slate-300 italic text-base">Sem registro</span>
                           )}
                         </div>
                         
                         <div className="flex items-center space-x-2">
                           {slot.log && (
                             editingId === slot.log.id ? (
                               <>
                                 <Button size="sm" variant="ghost" className="h-8" onClick={() => setEditingId(null)}>Cancelar</Button>
                                 <Button size="sm" className="h-8" onClick={() => handleSave(slot.log)}>Salvar</Button>
                               </>
                             ) : (
                               <>
                                 <button onClick={() => handleEditClick(slot.log)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-primary-600 shadow-sm">
                                   <Pencil size={14} />
                                 </button>
                                 <button onClick={() => handleDelete(slot.log.id)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-red-500 shadow-sm">
                                   <Trash2 size={14} />
                                 </button>
                               </>
                             )
                           )}
                         </div>
                      </div>
                   </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Desktop View: Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-sm text-slate-500 uppercase tracking-wider">
                <th className="p-5 font-bold">Data</th>
                <th className="p-5 font-bold">Funcionário</th>
                <th className="p-5 font-bold">Tipo</th>
                <th className="p-5 font-bold">Horário Esperado</th>
                <th className="p-5 font-bold">Horário Registrado</th>
                <th className="p-5 font-bold text-right">Ações do RH</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {dayBlocks.length === 0 && (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-slate-500 font-medium">Selecione uma data para ver os registros.</td>
                </tr>
              )}
              {dayBlocks.map(block => (
                <React.Fragment key={`${block.emp.id}-${block.dateStr}`}>
                  {block.slots.map((slot, idx) => (
                    <tr key={slot.type} className="hover:bg-slate-50 transition-colors group border-b border-slate-100/50">
                      {idx === 0 && (
                        <>
                          <td rowSpan={4} className="p-5 align-top font-medium text-slate-600 bg-white border-r border-slate-50">
                            {format(new Date(block.dateStr + 'T12:00:00'), "dd/MM/yyyy")}
                          </td>
                          <td rowSpan={4} className="p-5 align-top font-bold text-slate-800 bg-white border-r border-slate-50">
                            {block.emp.name}
                          </td>
                        </>
                      )}
                      <td className="p-4 pl-5">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wider ${
                          slot.type.includes('Almoço') ? 'bg-orange-100 text-orange-800' : 'bg-green-100 text-green-800'
                        }`}>
                          {slot.type}
                        </span>
                      </td>
                      <td className="p-4 font-bold text-slate-500">
                        {slot.expected}
                      </td>
                      <td className="p-4 text-slate-800 font-black flex items-center">
                        {slot.log ? (
                          editingId === slot.log.id ? (
                            <input 
                              type="time"
                              step="1" 
                              className="border border-slate-300 rounded-lg px-3 py-1.5 outline-none text-sm w-[130px] shadow-sm focus:border-primary-500" 
                              value={editVal}
                              onChange={(e) => setEditVal(e.target.value)}
                            />
                          ) : (
                            <>
                              <span className="text-lg">{format(new Date(slot.log.timestamp), 'HH:mm:ss')}</span>
                              {slot.log.manual && <span className="ml-3 text-[9px] bg-primary-100 text-primary-700 px-2 py-0.5 rounded uppercase font-black tracking-widest">Editado</span>}
                            </>
                          )
                        ) : (
                          <span className="text-slate-300 italic font-medium">Sem registro</span>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        {slot.log && (
                          editingId === slot.log.id ? (
                            <div className="flex justify-end space-x-2">
                              <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Cancelar</Button>
                              <Button size="sm" onClick={() => handleSave(slot.log)}>Salvar</Button>
                            </div>
                          ) : (
                            <div className="flex justify-end space-x-2 opacity-100 lg:opacity-60 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => handleEditClick(slot.log)} title="Editar" className="w-8 h-8 flex items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-primary-600 shadow-sm transition-colors">
                                <Pencil size={14} />
                              </button>
                              <button onClick={() => handleDelete(slot.log.id)} title="Excluir" className="w-8 h-8 flex items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-red-500 shadow-sm transition-colors">
                                <Trash2 size={14} />
                              </button>
                            </div>
                          )
                        )}
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Manual Log */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4 sm:p-6">
          <div className="bg-white rounded-3xl w-full max-w-md p-5 sm:p-6 shadow-xl max-h-[90dvh] overflow-y-auto no-scrollbar">
            <div className="flex justify-between items-center mb-5">
               <h2 className="text-xl font-bold">Lançar Ponto Manual</h2>
               <button onClick={() => setShowAddModal(false)} className="p-2 -mr-2 text-slate-400 hover:text-slate-600"><X size={20}/></button>
            </div>
            
            <form onSubmit={handleAddManual} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-700">Funcionário</label>
                <select 
                   required
                   className="w-full max-w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 outline-none text-sm appearance-none"
                   value={addForm.userId}
                   onChange={e => setAddForm({...addForm, userId: e.target.value})}
                >
                   <option value="" disabled>Selecione...</option>
                   {employees.map(emp => (
                     <option key={emp.id} value={emp.id}>{emp.name}</option>
                   ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-700">Tipo de Registro</label>
                <select 
                   className="w-full max-w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 outline-none text-sm appearance-none"
                   value={addForm.type}
                   onChange={e => setAddForm({...addForm, type: e.target.value})}
                >
                   <option value="Entrada">Entrada</option>
                   <option value="Inicio do Almoço">Início do Almoço</option>
                   <option value="Fim do Almoço">Fim do Almoço</option>
                   <option value="Saida">Saída</option>
                </select>
              </div>
              
              <div className="space-y-1.5 w-full overflow-hidden">
                <label className="block text-sm font-medium text-slate-700">Data e Hora Específica</label>
                <input 
                  type="datetime-local"
                  required
                  className="w-full max-w-full box-border bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 outline-none text-sm appearance-none"
                  value={addForm.datetime}
                  onChange={e => setAddForm({...addForm, datetime: e.target.value})}
                />
              </div>

              <div className="flex justify-end space-x-3 pt-5 mt-2 border-t border-slate-100">
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
