import React, { useState, useEffect, useRef } from 'react';
import { usePonto } from '../../contexts/PontoContext';
import { format, eachDayOfInterval, parseISO } from 'date-fns';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Calendar, Trash2, Plus, Users, User, Paperclip, X } from 'lucide-react';

const groupHolidays = (holidays) => {
  if (!holidays || holidays.length === 0) return [];
  
  const sorted = [...holidays].sort((a,b) => a.date.localeCompare(b.date));
  const grouped = [];
  
  let currentGroup = {
    name: sorted[0].name,
    description: sorted[0].description || '',
    attachment: sorted[0].attachment || null,
    startDate: sorted[0].date,
    endDate: sorted[0].date,
    dates: [sorted[0].date]
  };
  
  for (let i = 1; i < sorted.length; i++) {
    const curr = sorted[i];
    const prevDate = parseISO(currentGroup.endDate);
    const currDate = parseISO(curr.date);
    
    const diffTime = currDate - prevDate;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (curr.name === currentGroup.name && diffDays === 1) {
      currentGroup.endDate = curr.date;
      currentGroup.dates.push(curr.date);
    } else {
      grouped.push(currentGroup);
      currentGroup = {
        name: curr.name,
        description: curr.description || '',
        attachment: curr.attachment || null,
        startDate: curr.date,
        endDate: curr.date,
        dates: [curr.date]
      };
    }
  }
  grouped.push(currentGroup);
  
  return grouped;
};

export const ManageHolidays = () => {
  const { companySettings, updateCompanySettings, employees, editEmployee } = usePonto();
  
  const [activeTab, setActiveTab] = useState('gerais');
  
  const [globalStartDate, setGlobalStartDate] = useState('');
  const [globalEndDate, setGlobalEndDate] = useState('');
  const [globalDesc, setGlobalDesc] = useState('');
  
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [personalStartDate, setPersonalStartDate] = useState('');
  const [personalEndDate, setPersonalEndDate] = useState('');
  const [personalName, setPersonalName] = useState('');
  const [personalDesc, setPersonalDesc] = useState('');
  const [personalAttachment, setPersonalAttachment] = useState(null);
  
  const [previewImage, setPreviewImage] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!selectedEmpId && employees && employees.length > 0) {
      setSelectedEmpId(employees[0].id);
    }
  }, [employees, selectedEmpId]);

  const globalHolidays = companySettings?.global_holidays || [];

  const handleAddGlobal = async (e) => {
    e.preventDefault();
    if (!globalStartDate || !globalEndDate || !globalDesc) return;
    
    try {
      const dates = eachDayOfInterval({ start: parseISO(globalStartDate), end: parseISO(globalEndDate) })
        .map(d => format(d, 'yyyy-MM-dd'));
        
      let updated = [...globalHolidays];
      dates.forEach(date => {
        // Remover registro anterior da mesma data, se houver
        updated = updated.filter(h => h.date !== date);
        updated.push({ date, name: globalDesc });
      });
      
      updated.sort((a,b) => a.date.localeCompare(b.date));
      
      await updateCompanySettings({ global_holidays: updated });
      setGlobalStartDate('');
      setGlobalEndDate('');
      setGlobalDesc('');
    } catch (err) {
      alert("Erro ao selecionar as datas. Verifique se a data final é maior ou igual a data inicial.");
    }
  };

  const handleDeleteGlobalGroup = async (datesToRemove) => {
    const updated = globalHolidays.filter(h => !datesToRemove.includes(h.date));
    await updateCompanySettings({ global_holidays: updated });
  };

  const handleAddPersonal = async (e) => {
    e.preventDefault();
    if (!selectedEmpId || !personalStartDate || !personalEndDate || !personalName) return;
    
    const emp = employees.find(e => e.id === selectedEmpId);
    if (!emp) return;
    
    try {
      const schedule = emp.work_schedule || {};
      let personal = schedule.personal_holidays || [];
      
      const dates = eachDayOfInterval({ start: parseISO(personalStartDate), end: parseISO(personalEndDate) })
        .map(d => format(d, 'yyyy-MM-dd'));
        
      let updatedPersonal = [...personal];
      dates.forEach((date, index) => {
        updatedPersonal = updatedPersonal.filter(h => h.date !== date);
        const obj = { date, name: personalName, description: personalDesc };
        if (index === 0 && personalAttachment) {
           obj.attachment = personalAttachment;
        }
        updatedPersonal.push(obj);
      });
      
      updatedPersonal.sort((a,b) => a.date.localeCompare(b.date));
      
      await editEmployee(selectedEmpId, {
         work_schedule: { ...schedule, personal_holidays: updatedPersonal }
      });
      
      setPersonalStartDate('');
      setPersonalEndDate('');
      setPersonalName('');
      setPersonalDesc('');
      setPersonalAttachment(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (err) {
      alert("Erro ao selecionar as datas. Verifique se a data final é maior ou igual a data inicial.");
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) {
      setPersonalAttachment(null);
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
        setPersonalAttachment(dataUrl);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleDeletePersonalGroup = async (empId, datesToRemove) => {
    const emp = employees.find(e => e.id === empId);
    if (!emp) return;
    
    const schedule = emp.work_schedule || {};
    const personal = schedule.personal_holidays || [];
    const updatedPersonal = personal.filter(h => !datesToRemove.includes(h.date));
    
    await editEmployee(empId, {
       work_schedule: { ...schedule, personal_holidays: updatedPersonal }
    });
  };

  const selectedEmp = employees.find(e => e.id === selectedEmpId);
  const selectedEmpHolidays = selectedEmp?.work_schedule?.personal_holidays || [];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-black text-slate-800 tracking-tight">Férias, Feriados e Atestados</h1>
        <p className="text-slate-500 font-medium mt-1">Configure os dias de folga e afastamentos para isentar o banco de horas.</p>
      </div>

      <div className="flex flex-col sm:flex-row bg-slate-100 p-1 rounded-2xl w-full sm:w-fit space-y-1 sm:space-y-0 sm:space-x-1">
        <button 
          onClick={() => setActiveTab('gerais')}
          className={`flex-1 sm:flex-none justify-center px-6 py-3 sm:py-2.5 rounded-xl text-sm font-bold flex items-center transition-all ${activeTab === 'gerais' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <Users size={16} className="mr-2" />
          Feriados da Empresa
        </button>
        <button 
          onClick={() => setActiveTab('pessoais')}
          className={`flex-1 sm:flex-none justify-center px-6 py-3 sm:py-2.5 rounded-xl text-sm font-bold flex items-center transition-all ${activeTab === 'pessoais' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <User size={16} className="mr-2" />
          Afastamentos do Funcionário
        </button>
      </div>

      {activeTab === 'gerais' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
             <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
               <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center">
                 <Plus size={20} className="mr-2 text-primary-500" />
                 Novo Feriado
               </h2>
               <form onSubmit={handleAddGlobal} className="space-y-4">
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                   <div>
                     <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Data Início</label>
                     <Input type="date" required value={globalStartDate} onChange={e => setGlobalStartDate(e.target.value)} />
                   </div>
                   <div>
                     <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Data Fim</label>
                     <Input type="date" required value={globalEndDate} onChange={e => setGlobalEndDate(e.target.value)} min={globalStartDate} />
                   </div>
                 </div>
                 <div>
                   <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Descrição</label>
                   <Input placeholder="Ex: Carnaval, Feriado Nacional..." required value={globalDesc} onChange={e => setGlobalDesc(e.target.value)} />
                 </div>
                 <Button type="submit" className="w-full">Adicionar Feriado</Button>
               </form>
             </div>
          </div>

          <div className="lg:col-span-2">
             <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-50 flex justify-between items-center">
                   <h2 className="text-lg font-bold text-slate-800 flex items-center">
                     <Calendar size={20} className="mr-2 text-slate-400" />
                     Feriados Cadastrados
                   </h2>
                   <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-bold">{globalHolidays.length} Feriados</span>
                </div>
                
                {globalHolidays.length === 0 ? (
                  <div className="p-12 text-center text-slate-400 font-medium">
                    Nenhum feriado cadastrado.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-50 max-h-[500px] overflow-y-auto">
                    {groupHolidays(globalHolidays).map((g, idx) => (
                      <div key={idx} className="p-4 px-6 flex justify-between items-center hover:bg-slate-50 transition-colors group">
                         <div className="flex items-center space-x-4">
                           <div className="bg-primary-50 text-primary-600 p-3 rounded-xl font-black text-lg text-center shrink-0 min-w-[80px]">
                              {g.startDate === g.endDate 
                                ? format(parseISO(g.startDate), 'dd/MM')
                                : `${format(parseISO(g.startDate), 'dd/MM')} a ${format(parseISO(g.endDate), 'dd/MM')}`}
                           </div>
                           <div>
                             <p className="font-bold text-slate-800 text-lg">{g.name}</p>
                             <p className="text-sm text-slate-500 font-medium">
                               {g.dates.length} {g.dates.length === 1 ? 'dia' : 'dias'} • Feriado para todos
                             </p>
                           </div>
                         </div>
                         <button onClick={() => handleDeleteGlobalGroup(g.dates)} title="Remover feriado" className="p-2 text-slate-300 hover:text-red-500 transition-colors opacity-100 lg:opacity-0 group-hover:opacity-100">
                           <Trash2 size={20} />
                         </button>
                      </div>
                    ))}
                  </div>
                )}
             </div>
          </div>
        </div>
      )}

      {activeTab === 'pessoais' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
             <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm mb-4">
               <h2 className="text-lg font-bold text-slate-800 mb-4">Selecionar Funcionário</h2>
               <select 
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 font-medium outline-none focus:border-primary-500"
                  value={selectedEmpId}
                  onChange={(e) => setSelectedEmpId(e.target.value)}
               >
                 <option value="" disabled>-- Escolha um funcionário --</option>
                 {employees.map(e => (
                   <option key={e.id} value={e.id}>{e.name}</option>
                 ))}
               </select>
             </div>

             {selectedEmpId && (
               <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm animate-in fade-in slide-in-from-top-2">
                 <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center">
                   <Plus size={20} className="mr-2 text-primary-500" />
                   Novo Afastamento
                 </h2>
                 <form onSubmit={handleAddPersonal} className="space-y-4">
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                     <div>
                       <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Data Início</label>
                       <Input type="date" required value={personalStartDate} onChange={e => setPersonalStartDate(e.target.value)} />
                     </div>
                     <div>
                       <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Data Fim</label>
                       <Input type="date" required value={personalEndDate} onChange={e => setPersonalEndDate(e.target.value)} min={personalStartDate} />
                     </div>
                   </div>
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                     <div>
                       <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Nome Curto</label>
                       <Input placeholder="Ex: Férias, Atestado" required value={personalName} onChange={e => setPersonalName(e.target.value)} />
                     </div>
                     <div>
                       <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Anexo (Imagem)</label>
                       <input 
                         type="file" 
                         accept="image/*" 
                         ref={fileInputRef}
                         onChange={handleFileChange}
                         className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
                       />
                     </div>
                   </div>
                   <div>
                     <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Descrição / Motivo</label>
                     <Input placeholder="Detalhes opcionais..." value={personalDesc} onChange={e => setPersonalDesc(e.target.value)} />
                   </div>
                   <Button type="submit" className="w-full">Adicionar Folga</Button>
                 </form>
               </div>
             )}
          </div>

          <div className="lg:col-span-2">
             <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-50 flex justify-between items-center">
                   <h2 className="text-lg font-bold text-slate-800 flex items-center">
                     <Calendar size={20} className="mr-2 text-slate-400" />
                     {selectedEmp ? `Afastamentos de ${selectedEmp.name.split(' ')[0]}` : 'Afastamentos'}
                   </h2>
                   {selectedEmp && <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-bold">{selectedEmpHolidays.length} Dias</span>}
                </div>
                
                {!selectedEmp ? (
                  <div className="p-12 text-center text-slate-400 font-medium">
                    Selecione um funcionário ao lado.
                  </div>
                ) : selectedEmpHolidays.length === 0 ? (
                  <div className="p-12 text-center text-slate-400 font-medium">
                    Nenhuma folga cadastrada para este funcionário.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-50 max-h-[500px] overflow-y-auto">
                    {groupHolidays(selectedEmpHolidays).map((g, idx) => (
                      <div key={idx} className="p-4 px-6 flex justify-between items-center hover:bg-slate-50 transition-colors group">
                         <div className="flex items-center space-x-4">
                           <div className="bg-blue-50 text-blue-600 p-3 rounded-xl font-black text-lg text-center shrink-0 min-w-[80px]">
                              {g.startDate === g.endDate 
                                ? format(parseISO(g.startDate), 'dd/MM')
                                : `${format(parseISO(g.startDate), 'dd/MM')} a ${format(parseISO(g.endDate), 'dd/MM')}`}
                           </div>
                           <div>
                             <p className="font-bold text-slate-800 text-lg flex items-center">
                               {g.name}
                               {g.attachment && (
                                 <button onClick={() => setPreviewImage(g.attachment)} className="ml-3 text-primary-500 hover:text-primary-700 transition-colors" title="Ver anexo">
                                   <Paperclip size={18} />
                                 </button>
                               )}
                             </p>
                             <p className="text-sm text-slate-500 font-medium">
                               {g.dates.length} {g.dates.length === 1 ? 'dia' : 'dias'} • Folga Exclusiva
                             </p>
                             {g.description && <p className="text-xs text-slate-400 mt-1">{g.description}</p>}
                           </div>
                         </div>
                         <button onClick={() => handleDeletePersonalGroup(selectedEmp.id, g.dates)} title="Remover folga" className="p-2 text-slate-300 hover:text-red-500 transition-colors opacity-100 lg:opacity-0 group-hover:opacity-100">
                           <Trash2 size={20} />
                         </button>
                      </div>
                    ))}
                  </div>
                )}
             </div>
          </div>
        </div>
      )}

      {previewImage && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 sm:p-6" onClick={() => setPreviewImage(null)}>
           <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl relative" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center p-5 border-b border-slate-100">
                 <h3 className="font-bold text-slate-800 text-lg">Anexo do Afastamento</h3>
                 <button onClick={() => setPreviewImage(null)} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-600 transition-colors">
                   <X size={20} />
                 </button>
              </div>
              <div className="flex-1 overflow-auto p-4 bg-slate-50 flex items-center justify-center rounded-b-3xl">
                 <img src={previewImage} alt="Anexo" className="max-w-full max-h-full object-contain rounded-xl" />
              </div>
           </div>
        </div>
      )}
    </div>
  );
};
