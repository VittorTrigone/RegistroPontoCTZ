import React, { useState, useRef, useEffect } from 'react';
import * as faceapi from 'face-api.js';
import { usePonto } from '../../contexts/PontoContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Plus, Check, Camera, AlertCircle, Trash2 } from 'lucide-react';

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
  
  // NEW: Multi-stage Capture
  const [captureStage, setCaptureStage] = useState(0); 
  const [faceDataArrays, setFaceDataArrays] = useState([]);
  
  const STAGES = [
    { title: 'Frente', desc: 'Olhe diretamente para a câmera' },
    { title: 'Esquerda', desc: 'Vire o rosto levemente para a ESQUERDA' },
    { title: 'Direita', desc: 'Vire o rosto levemente para a DIREITA' }
  ];

  // 1. Carrega modelos uma única vez ao montar o componente
  useEffect(() => {
    const loadModels = async () => {
      try {
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
          faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
          faceapi.nets.faceRecognitionNet.loadFromUri('/models')
        ]);
      } catch (err) {
        console.error("Erro ao carregar modelos na página de Equipe:", err);
      }
    };
    loadModels();
  }, []);

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
    setCaptureStage(0);
    setFaceDataArrays([]);
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 }
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
    setShowFaceModal(false);
    setSelectedEmp(null);
  };

  const captureFacePoint = async () => {
    if (!videoRef.current) return;
    setScanning(true);
    setCameraError('');

    try {
      const detection = await faceapi.detectSingleFace(
        videoRef.current, 
        new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 })
      ).withFaceLandmarks().withFaceDescriptor();

      if (detection) {
        setFaceDataArrays(prev => [...prev, Array.from(detection.descriptor)]);
        setCaptureStage(prev => prev + 1);
        setScanning(false);
      } else {
        setCameraError("Não detectamos o rosto nesta posição. Centralize e tente de novo.");
        setScanning(false);
      }
    } catch (err) {
      setCameraError("Erro crítico ao escanear o rosto.");
      setScanning(false);
    }
  };

  const saveFace = async () => {
    if (faceDataArrays.length === 3 && selectedEmp) {
      try {
        setScanning(true);
        await editEmployee(selectedEmp.id, { 
          hasBiometrics: true, 
          biometricDescriptors: faceDataArrays 
        });
        setScanning(false);
        closeFaceModal();
      } catch (err) {
        alert("Erro ao salvar biometria. Tente novamente.");
        setScanning(false);
      }
    }
  };

  const handleDeleteEmployee = (emp) => {
    if (confirm(`Deseja demitir/excluir o cadastro de ${emp.name}?`)) {
      deleteEmployee(emp.id);
    }
  };

  return (
    <div className="p-4 md:p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold text-slate-800">Equipe</h1>
        <Button onClick={() => setShowAddModal(true)} className="w-full md:w-auto">
          <Plus size={18} className="mr-2" /> Novo Colaborador
        </Button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-sm text-slate-500">
                <th className="p-4 font-medium">Nome</th>
                <th className="p-4 font-medium hidden md:table-cell">Cargo</th>
                <th className="p-4 font-medium">Biometria</th>
                <th className="p-4 font-medium text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {employees.length === 0 && (
                <tr>
                  <td colSpan="4" className="p-8 text-center text-slate-500">Nenhum funcionário cadastrado.</td>
                </tr>
              )}
              {employees.map(emp => (
                <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4">
                    <div className="font-medium text-slate-800">{emp.name}</div>
                    <div className="text-xs text-slate-500 md:hidden">{emp.role_title || 'Não definido'}</div>
                  </td>
                  <td className="p-4 text-slate-500 hidden md:table-cell">{emp.role_title || 'Não definido'}</td>
                  <td className="p-4">
                    {emp.hasBiometrics ? (
                      <span className="inline-flex items-center text-green-600 bg-green-50 px-2.5 py-1 rounded-full text-[10px] md:text-xs font-semibold">
                        <Check size={12} className="mr-1" /> OK
                      </span>
                    ) : (
                      <span className="inline-flex items-center text-orange-600 bg-orange-50 px-2.5 py-1 rounded-full text-[10px] md:text-xs font-semibold">
                        <AlertCircle size={12} className="mr-1" /> Pendente
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button size="sm" variant={emp.hasBiometrics ? 'secondary' : 'primary'} onClick={() => openFaceRegistration(emp)} className="!px-3 md:!px-4">
                        <Camera size={16} className={emp.hasBiometrics ? "" : "mr-1 md:mr-2"} />
                        <span className="hidden md:inline">{emp.hasBiometrics ? 'Refazer' : 'Capturar'}</span>
                      </Button>
                      <Button size="sm" variant="danger" className="!px-2" onClick={() => handleDeleteEmployee(emp)} title="Excluir">
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
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-xl">
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
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm z-50 flex items-center justify-center p-2 md:p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg p-4 md:p-6 shadow-xl text-center max-h-[95vh] overflow-y-auto">
            
            <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-2">
              <h2 className="text-xl md:text-2xl font-bold text-slate-800 truncate max-w-full">{selectedEmp.name}</h2>
              <div className="flex space-x-1">
                 {[0,1,2].map(step => (
                    <div key={step} className={`h-1.5 w-6 md:h-2 md:w-8 rounded-full ${captureStage > step ? 'bg-green-500' : captureStage === step ? 'bg-primary-500' : 'bg-slate-200'}`} />
                 ))}
              </div>
            </div>

            {captureStage < 3 && (
               <div className="bg-primary-50 text-primary-800 p-2 md:p-3 rounded-xl mb-4 text-[10px] md:text-sm font-medium border border-primary-100">
                 <p className="uppercase text-[9px] md:text-xs text-primary-500 font-bold tracking-wider mb-0.5 md:mb-1">Passo {captureStage + 1} de 3: {STAGES[captureStage].title}</p>
                 <p>{STAGES[captureStage].desc}</p>
               </div>
            )}
            
            <div className="relative w-full aspect-[4/3] md:aspect-video rounded-2xl overflow-hidden bg-slate-900 mb-4 md:mb-6 flex items-center justify-center border-2 md:border-4 border-slate-100 shadow-inner">
              {loadingCamera && <span className="text-primary-500 animate-pulse text-sm">Iniciando câmera...</span>}
              <video 
                ref={videoRef} 
                autoPlay 
                muted 
                playsInline
                className={`w-full h-full object-cover transition-opacity duration-500 ${loadingCamera ? 'opacity-0' : 'opacity-100'}`} 
              />
              
              {captureStage === 3 && (
                <div className="absolute inset-0 bg-green-500/90 flex flex-col items-center justify-center p-4">
                  <Check size={48} className="text-green-50 md:w-16 md:h-16" />
                  <span className="text-white font-bold text-lg md:text-xl mt-2">Mapeamento Concluído!</span>
                  <p className="text-green-100 text-xs md:text-sm mt-1">Este funcionário já está pronto para o Totem.</p>
                </div>
              )}
              
              {scanning && (
                <div className="absolute inset-0 bg-primary-500/20 backdrop-blur-sm flex items-center justify-center">
                  <div className="w-12 h-12 md:w-16 md:h-16 border-4 border-white border-t-primary-500 rounded-full animate-spin"></div>
                </div>
              )}
            </div>

            {cameraError && (
              <div className="mb-4 text-red-500 bg-red-50 p-2 md:p-3 rounded-xl text-xs md:text-sm flex items-center justify-center">
                <AlertCircle size={16} className="mr-2" /> {cameraError}
              </div>
            )}

            <div className="flex justify-between items-center mt-2">
              <Button variant="ghost" onClick={closeFaceModal} size="sm" className="md:text-base">Cancelar</Button>
              
              {captureStage < 3 ? (
                <Button onClick={captureFacePoint} disabled={loadingCamera || scanning} size="sm" className="md:text-base">
                  {scanning ? 'Mapeando...' : `Capturar`}
                </Button>
              ) : (
                <Button className="!bg-green-600 hover:!bg-green-500 md:text-base" onClick={saveFace} size="sm">
                  Salvar
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
