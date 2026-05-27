import React, { useState, useRef, useEffect } from 'react';
import { human, initHuman } from '../../utils/humanConfig';
import { usePonto } from '../../contexts/PontoContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Plus, Check, Camera, AlertCircle, Trash2, Clock } from 'lucide-react';

export const Employees = () => {
  const { employees, addEmployee, editEmployee, deleteEmployee } = usePonto();
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({ name: '', role_title: '' });
  
  const [showFaceModal, setShowFaceModal] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState(null);
  const videoRef = useRef(null);
  
  const [loadingCamera, setLoadingCamera] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [scanning, setScanning] = useState(false);
  
  // Workload Configuration
  const [showWorkloadModal, setShowWorkloadModal] = useState(false);
  const [workSchedule, setWorkSchedule] = useState({});
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [isMassEdit, setIsMassEdit] = useState(false);

  // NEW: Multi-stage Capture
  const [scanProgress, setScanProgress] = useState(0); 
  const [instruction, setInstruction] = useState("Siga as instruções");
  const [faceDataArrays, setFaceDataArrays] = useState([]);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  
  const scanLoopRef = useRef(null);
  const phaseRef = useRef(0);
  const sideSignRef = useRef(0);
  const phaseCountRef = useRef(0);

  const loadModels = async () => {
    try {
      await initHuman();
      setModelsLoaded(true);
    } catch (err) {
      console.error("Erro ao carregar IA no Equipe:", err);
    }
  };

  // STAGES array removed as it's no longer a manual 3-step process

  const handleSubmit = (e) => {
    e.preventDefault();
    addEmployee(formData);
    setShowAddModal(false);
    setFormData({ name: '', role_title: '' });
  };

  const openFaceRegistration = async (emp) => {
    setSelectedEmp(emp);
    setShowFaceModal(true);
    setLoadingCamera(true);
    setCameraError('');
    setScanProgress(0);
    setInstruction("Olhe diretamente para a câmera");
    setFaceDataArrays([]);
    phaseRef.current = 0;
    sideSignRef.current = 0;
    phaseCountRef.current = 0;
    if (scanLoopRef.current) cancelAnimationFrame(scanLoopRef.current);
    
    try {
      if (!modelsLoaded) {
        setCameraError('Baixando Redes Neurais da IA... Aguarde.');
        await loadModels();
        setCameraError('');
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            facingMode: 'user',
            width: { ideal: 640, max: 640 },
            height: { ideal: 480, max: 480 }
          } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setLoadingCamera(false);
    } catch (err) {
      console.error(err);
      setCameraError('Permita o acesso à câmera para registrar o rosto.');
      setLoadingCamera(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop());
    }
  };

  const closeFaceModal = () => {
    stopCamera();
    if (scanLoopRef.current) cancelAnimationFrame(scanLoopRef.current);
    setShowFaceModal(false);
    setSelectedEmp(null);
  };

  const captureFacePoint = async () => {
    if (!videoRef.current) return;
    setScanning(true);
    setScanProgress(0);
    setInstruction("Olhe diretamente para a câmera");
    setCameraError('');
    setFaceDataArrays([]);
    phaseRef.current = 0;
    sideSignRef.current = 0;
    phaseCountRef.current = 0;

    const TOTAL_SAMPLES = 10;
    const collected = [];

    const scanFrame = async () => {
      if (!videoRef.current) return;
      
      try {
        const result = await human.detect(videoRef.current);
        const face = result.face[0];

        if (face && face.embedding && face.faceScore > 0.6) {
          // Checagem de Distância e Centralização (O molde oval)
          const box = face.boxRaw;
          if (box) {
             const cx = box[0] + (box[2] / 2);
             const cy = box[1] + (box[3] / 2);
             const isCentered = cx > 0.25 && cx < 0.75 && cy > 0.25 && cy < 0.75;
             const isCloseEnough = box[3] > 0.55; // ALTO RIGOR: Rosto deve ocupar pelo menos 55% da altura

             if (!isCentered || !isCloseEnough) {
                 setInstruction("Aproxime e centralize o rosto no molde");
                 scanLoopRef.current = requestAnimationFrame(scanFrame);
                 return;
             }
          }

          const yaw = face.rotation?.angle?.yaw || 0;
          let validFrame = false;

          if (phaseRef.current === 0) {
             if (Math.abs(yaw) < 0.15) {
                validFrame = true;
             } else {
                setInstruction("Mantenha o rosto reto para a câmera");
             }
          } else if (phaseRef.current === 1) {
             if (Math.abs(yaw) > 0.20) {
                validFrame = true;
                if (sideSignRef.current === 0) sideSignRef.current = Math.sign(yaw);
             } else {
                setInstruction("Vire o rosto lentamente para um dos lados");
             }
          } else if (phaseRef.current === 2) {
             if (Math.abs(yaw) > 0.20 && Math.sign(yaw) !== sideSignRef.current) {
                validFrame = true;
             } else {
                setInstruction("Agora vire o rosto para o OUTRO lado");
             }
          }

          if (validFrame) {
             collected.push(Array.from(face.embedding));
             phaseCountRef.current += 1;
             setScanProgress(Math.round((collected.length / TOTAL_SAMPLES) * 100));

             if (phaseRef.current === 0 && phaseCountRef.current >= 4) {
                phaseRef.current = 1;
                phaseCountRef.current = 0;
                setInstruction("Ótimo! Agora vire o rosto para a Direita ou Esquerda");
             } else if (phaseRef.current === 1 && phaseCountRef.current >= 3) {
                phaseRef.current = 2;
                phaseCountRef.current = 0;
                setInstruction("Perfeito! Agora vire para o OUTRO lado");
             }
          }
        } else if (!face) {
           setInstruction("Centralize seu rosto na câmera...");
        }
      } catch (err) {
        console.error("Erro no frame:", err);
      }

      if (collected.length < TOTAL_SAMPLES) {
        scanLoopRef.current = requestAnimationFrame(scanFrame);
      } else {
        setFaceDataArrays(collected);
        setScanning(false);
      }
    };
    
    scanFrame();
  };

  const saveFace = async () => {
    if (faceDataArrays.length === 10 && selectedEmp) {
      await editEmployee(selectedEmp.id, { 
        hasBiometrics: true, 
        biometricDescriptors: faceDataArrays // Saving all 10 descriptors
      });
      closeFaceModal();
    }
  };

  const handleDeleteEmployee = (emp) => {
    if (confirm(`Deseja demitir/excluir o cadastro de ${emp.name}?`)) {
      deleteEmployee(emp.id);
      setSelectedEmployees(prev => prev.filter(id => id !== emp.id));
    }
  };

  const openWorkloadModal = (emp = null, massEdit = false) => {
    setIsMassEdit(massEdit);
    
    if (massEdit) {
      setSelectedEmp(null);
      // Initialize generic default format
      const defaultSchedule = {};
      for (let i = 0; i < 7; i++) {
         defaultSchedule[i] = {
            active: (i >= 1 && i <= 5),
            start: '09:00',
            end: '18:00',
            lunch: 60
         };
      }
      setWorkSchedule(defaultSchedule);
    } else {
      setSelectedEmp(emp);
      // Convert old format or initialize new format
      const defaultSchedule = {};
      for (let i = 0; i < 7; i++) {
         const isActive = emp.work_schedule ? !!emp.work_schedule[i]?.active : (i >= 1 && i <= 5); // Default Mon-Fri
         defaultSchedule[i] = {
            active: isActive,
            start: emp.work_schedule?.[i]?.start || '09:00',
            end: emp.work_schedule?.[i]?.end || '18:00',
            lunch: emp.work_schedule?.[i]?.lunch || 60
         };
      }
      setWorkSchedule(defaultSchedule);
    }
    
    setShowWorkloadModal(true);
  };

  const handleSaveWorkload = async (e) => {
    e.preventDefault();
    if (isMassEdit && selectedEmployees.length > 0) {
       await Promise.all(selectedEmployees.map(empId => editEmployee(empId, { work_schedule: workSchedule })));
       setShowWorkloadModal(false);
       setSelectedEmployees([]);
       setIsMassEdit(false);
    } else if (selectedEmp) {
       await editEmployee(selectedEmp.id, { work_schedule: workSchedule });
       setShowWorkloadModal(false);
       setSelectedEmp(null);
    }
  };

  const handleScheduleChange = (dayIndex, field, value) => {
    setWorkSchedule(prev => ({
      ...prev,
      [dayIndex]: {
         ...prev[dayIndex],
         [field]: value
      }
    }));
  };

  const toggleEmployeeSelection = (empId) => {
    setSelectedEmployees(prev => 
      prev.includes(empId) ? prev.filter(id => id !== empId) : [...prev, empId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedEmployees.length === employees.length) {
      setSelectedEmployees([]);
    } else {
      setSelectedEmployees(employees.map(e => e.id));
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Equipe</h1>
        <Button onClick={() => setShowAddModal(true)}>
          <Plus size={18} className="mr-2" /> Novo Colaborador
        </Button>
      </div>

      {selectedEmployees.length > 0 && (
        <div className="bg-primary-50 border border-primary-200 rounded-3xl p-4 mb-6 flex flex-col sm:flex-row items-center justify-between shadow-sm animate-in fade-in zoom-in-95 duration-200">
          <div className="text-primary-800 font-bold mb-3 sm:mb-0">
            {selectedEmployees.length} funcionário(s) selecionado(s)
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" className="bg-white" onClick={() => setSelectedEmployees([])}>
              Cancelar
            </Button>
            <Button onClick={() => openWorkloadModal(null, true)}>
              <Clock size={16} className="mr-2" /> Editar Carga em Massa
            </Button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden mb-8">
        
        {/* Mobile View: Cards */}
        <div className="md:hidden divide-y divide-slate-100">
          {employees.length > 0 && (
            <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center">
              <input 
                type="checkbox" 
                checked={selectedEmployees.length === employees.length && employees.length > 0}
                onChange={toggleSelectAll}
                className="w-5 h-5 rounded border-slate-300 text-primary-600 focus:ring-primary-500 mr-3"
              />
              <span className="text-sm font-bold text-slate-600">Selecionar Todos</span>
            </div>
          )}
          {employees.length === 0 && (
            <div className="p-8 text-center text-slate-500 font-medium">Nenhum funcionário cadastrado.</div>
          )}
          {employees.map(emp => (
            <div key={emp.id} className={`p-5 transition-colors ${selectedEmployees.includes(emp.id) ? 'bg-primary-50/50' : 'hover:bg-slate-50'}`}>
              <div className="flex items-start">
                <input 
                  type="checkbox" 
                  checked={selectedEmployees.includes(emp.id)}
                  onChange={() => toggleEmployeeSelection(emp.id)}
                  className="w-5 h-5 rounded border-slate-300 text-primary-600 focus:ring-primary-500 mt-1 mr-4"
                />
                <div className="flex-1">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-bold text-slate-800 text-lg">{emp.name}</h3>
                      <p className="text-sm text-slate-500">{emp.role_title || 'Não definido'}</p>
                    </div>
                    {emp.hasBiometrics ? (
                      <span className="inline-flex items-center text-green-600 bg-green-50 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
                        <Check size={12} className="mr-1" /> OK ({emp.biometricDescriptors?.length || 1})
                      </span>
                    ) : (
                      <span className="inline-flex items-center text-orange-600 bg-orange-50 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
                        <AlertCircle size={12} className="mr-1" /> Pendente
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 mt-4">
                    <Button className="flex-1 text-xs h-10" variant={emp.hasBiometrics ? 'secondary' : 'primary'} onClick={() => openFaceRegistration(emp)}>
                      <Camera size={16} className="mr-2" />
                      {emp.hasBiometrics ? 'Refazer Biometria' : 'Capturar Biometria'}
                    </Button>
                    <Button className="w-10 h-10 !px-0 flex-shrink-0" variant="secondary" onClick={() => openWorkloadModal(emp)}>
                      <Clock size={16} />
                    </Button>
                    <Button className="w-10 h-10 !px-0 flex-shrink-0" variant="danger" onClick={() => handleDeleteEmployee(emp)}>
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop View: Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-sm text-slate-500 uppercase tracking-wider">
                <th className="p-5 w-10">
                  <input 
                    type="checkbox" 
                    checked={selectedEmployees.length === employees.length && employees.length > 0}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                  />
                </th>
                <th className="p-5 font-bold">Nome</th>
                <th className="p-5 font-bold">Cargo</th>
                <th className="p-5 font-bold">Situação Biometria</th>
                <th className="p-5 font-bold text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {employees.length === 0 && (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-slate-500 font-medium">Nenhum funcionário cadastrado.</td>
                </tr>
              )}
              {employees.map(emp => (
                <tr key={emp.id} className={`transition-colors group ${selectedEmployees.includes(emp.id) ? 'bg-primary-50/30' : 'hover:bg-slate-50'}`}>
                  <td className="p-5">
                    <input 
                      type="checkbox" 
                      checked={selectedEmployees.includes(emp.id)}
                      onChange={() => toggleEmployeeSelection(emp.id)}
                      className="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
                    />
                  </td>
                  <td className="p-5 font-bold text-slate-800">{emp.name}</td>
                  <td className="p-5 text-slate-500 font-medium">{emp.role_title || 'Não definido'}</td>
                  <td className="p-5">
                    {emp.hasBiometrics ? (
                      <span className="inline-flex items-center text-green-600 bg-green-50 px-3 py-1.5 rounded-full text-xs font-bold">
                        <Check size={14} className="mr-1.5" strokeWidth={3} /> Configurada ({emp.biometricDescriptors?.length || 1})
                      </span>
                    ) : (
                      <span className="inline-flex items-center text-orange-600 bg-orange-50 px-3 py-1.5 rounded-full text-xs font-bold">
                        <AlertCircle size={14} className="mr-1.5" strokeWidth={3} /> Pendente
                      </span>
                    )}
                  </td>
                  <td className="p-5 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-100 lg:opacity-60 group-hover:opacity-100 transition-opacity">
                      <Button size="sm" variant={emp.hasBiometrics ? 'secondary' : 'primary'} onClick={() => openFaceRegistration(emp)} className="font-bold">
                        <Camera size={16} className={emp.hasBiometrics ? "mr-0 md:mr-2" : "mr-2"} />
                        <span className={emp.hasBiometrics ? "hidden md:inline" : "inline"}>{emp.hasBiometrics ? 'Refazer' : 'Capturar Rosto'}</span>
                      </Button>
                      <Button size="sm" variant="secondary" className="!px-3" onClick={() => openWorkloadModal(emp)} title="Carga Horária">
                        <Clock size={16} />
                      </Button>
                      <Button size="sm" variant="danger" className="!px-3" onClick={() => handleDeleteEmployee(emp)} title="Demitir / Excluir">
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Employee Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-xl max-h-[90dvh] overflow-y-auto no-scrollbar">
            <h2 className="text-xl font-bold mb-4">Novo Colaborador</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input label="Nome Completo" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              <Input label="Cargo" required value={formData.role_title} onChange={e => setFormData({...formData, role_title: e.target.value})} />
              
              <div className="flex justify-end space-x-3 pt-4">
                <Button type="button" variant="ghost" onClick={() => setShowAddModal(false)}>Cancelar</Button>
                <Button type="submit">Adicionar Colaborador</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3-Stage Face Registration Modal */}
      {showFaceModal && selectedEmp && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[100] flex items-center justify-center p-2 sm:p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg p-4 sm:p-6 shadow-xl text-center max-h-[90dvh] overflow-y-auto no-scrollbar">
            
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-800">Biometria: {selectedEmp.name}</h2>
            </div>
            
            {faceDataArrays.length === 0 && !scanning && (
               <div className="bg-primary-50 text-primary-800 p-3 rounded-xl mb-4 text-sm font-medium border border-primary-100">
                 <p className="uppercase text-xs text-primary-500 font-bold tracking-wider mb-1">Instruções</p>
                 <p>Olhe para a câmera e mova o rosto levemente para os lados ao iniciar.</p>
               </div>
            )}
            
            <div className="relative w-full aspect-[3/4] sm:aspect-video rounded-2xl overflow-hidden bg-slate-900 mb-6 flex items-center justify-center border-4 border-slate-100 shadow-inner">
              {loadingCamera && <span className="text-primary-500 animate-pulse">Iniciando câmera...</span>}
              <video 
                ref={videoRef} 
                autoPlay 
                muted 
                playsInline
                className={`w-full h-full object-cover -scale-x-100 transition-opacity duration-500 ${loadingCamera ? 'opacity-0' : 'opacity-100'}`} 
              />
              
              {faceDataArrays.length === 10 && (
                <div className="absolute inset-0 bg-green-500/90 flex flex-col items-center justify-center">
                  <Check size={64} className="text-green-50" />
                  <span className="text-white font-bold text-xl mt-2">Mapeamento 3D Concluído!</span>
                  <p className="text-green-100 text-sm mt-1">Este funcionário já está pronto para bater ponto.</p>
                </div>
              )}
              
              {scanning && (
                <div className="absolute bottom-6 left-6 right-6 bg-slate-900/80 backdrop-blur-md rounded-xl p-4 shadow-xl border border-white/10 z-10 animate-in slide-in-from-bottom-4">
                   <p className="text-white font-bold text-sm mb-3 tracking-wide">{instruction}</p>
                   <div className="flex justify-between items-end mb-2">
                     <span className="text-slate-300 font-bold tracking-widest uppercase text-[10px]">Mapeamento</span>
                     <span className="text-primary-400 font-black text-sm">{scanProgress}%</span>
                   </div>
                   <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
                      <div className="bg-primary-500 h-2.5 rounded-full transition-all duration-300" style={{ width: `${scanProgress}%` }}></div>
                   </div>
                </div>
              )}
            </div>

            {cameraError && (
              <div className="mb-4 text-red-500 bg-red-50 p-3 rounded-xl text-sm flex items-center justify-center">
                <AlertCircle size={18} className="mr-2" /> {cameraError}
              </div>
            )}

            <div className="flex justify-between items-center mt-2">
              <Button variant="ghost" onClick={closeFaceModal}>Cancelar</Button>
              
              {faceDataArrays.length < 10 ? (
                <Button onClick={captureFacePoint} disabled={loadingCamera || scanning}>
                  {scanning ? 'Mapeando...' : 'Escanear Rosto'}
                </Button>
              ) : (
                <Button className="!bg-green-600 hover:!bg-green-500" onClick={saveFace}>
                  Finalizar e Salvar
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Configure Workload Modal */}
      {showWorkloadModal && (selectedEmp || isMassEdit) && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-5 sm:p-6 shadow-xl max-h-[90dvh] overflow-y-auto no-scrollbar">
            <h2 className="text-xl font-bold mb-1">Carga Horária Padrão</h2>
            <p className="text-sm text-slate-500 mb-5">
              {isMassEdit ? `Configurar expediente para ${selectedEmployees.length} funcionário(s)` : `Configurar expediente de ${selectedEmp?.name}`}
            </p>
            
            <form onSubmit={handleSaveWorkload} className="space-y-4 mt-2">
              <div className="space-y-3">
                {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((dayName, index) => {
                   const config = workSchedule[index] || { active: false, start: '09:00', end: '18:00', lunch: 60 };
                   return (
                     <div key={index} className={`flex flex-col p-3 rounded-xl transition-colors ${config.active ? 'bg-slate-50 border border-slate-100 shadow-sm' : 'opacity-50 grayscale border border-transparent'}`}>
                       <div className="flex items-center gap-2 mb-3">
                         <input 
                           type="checkbox" 
                           className="w-4 h-4 rounded text-primary-600 accent-primary-500 cursor-pointer"
                           checked={config.active}
                           onChange={(e) => handleScheduleChange(index, 'active', e.target.checked)}
                         />
                         <span className="font-bold text-sm text-slate-700">{dayName}</span>
                       </div>
                       
                       <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
                         <div>
                           <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Entrada</label>
                           <input 
                             type="time" 
                             disabled={!config.active}
                             className="w-full max-w-full text-xs sm:text-sm p-1.5 sm:p-2 border border-slate-200 rounded-lg outline-none bg-white text-slate-700 focus:border-primary-400 transition-colors appearance-none"
                             value={config.start}
                             onChange={(e) => handleScheduleChange(index, 'start', e.target.value)}
                           />
                         </div>
                         
                         <div>
                           <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Saída</label>
                           <input 
                             type="time" 
                             disabled={!config.active}
                             className="w-full max-w-full text-xs sm:text-sm p-1.5 sm:p-2 border border-slate-200 rounded-lg outline-none bg-white text-slate-700 focus:border-primary-400 transition-colors appearance-none"
                             value={config.end}
                             onChange={(e) => handleScheduleChange(index, 'end', e.target.value)}
                           />
                         </div>
                         
                         <div className="col-span-2 sm:col-span-1">
                           <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Almoço (min)</label>
                           <input 
                             type="number" 
                             disabled={!config.active}
                             className="w-full max-w-full text-xs sm:text-sm p-1.5 sm:p-2 border border-slate-200 rounded-lg outline-none text-center bg-white text-slate-700 focus:border-primary-400 transition-colors"
                             value={config.lunch}
                             onChange={(e) => handleScheduleChange(index, 'lunch', parseInt(e.target.value))}
                           />
                         </div>
                       </div>
                     </div>
                   );
                })}
              </div>
              
              <div className="flex justify-end space-x-3 pt-5 mt-4 border-t border-slate-100">
                <Button type="button" variant="ghost" onClick={() => setShowWorkloadModal(false)}>Cancelar</Button>
                <Button type="submit">Salvar Escala</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
