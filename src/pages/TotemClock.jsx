import React, { useEffect, useRef, useState } from 'react';
import * as faceapi from 'face-api.js';
import { usePonto } from '../contexts/PontoContext';
import { format } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';
import { CheckCircle2, UserCheck, ShieldAlert, LogOut, Camera, XCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';

export const TotemClock = () => {
  const videoRef = useRef(null);
  
  const { employees, logs, logTime, getTodayLogs } = usePonto();
  const { logout } = useAuth();
  
  const [systemReady, setSystemReady] = useState(false);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [faceMatcher, setFaceMatcher] = useState(null);
  
  const [isActive, setIsActive] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [status, setStatus] = useState({ type: 'idle', message: '' });
  const [showHistory, setShowHistory] = useState(false);

  const getUserName = (id) => {
    const emp = employees.find(e => e.id === id);
    return emp ? emp.name : 'Desconhecido';
  };

  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // 1. Carrega os modelos estáticos (APENAS UMA VEZ na vida do App)
  useEffect(() => {
    const carregarMotores = async () => {
      try {
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
          faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
          faceapi.nets.faceRecognitionNet.loadFromUri('/models')
        ]);
        setModelsLoaded(true);
      } catch (err) {
        console.error("Erro critico ao carregar IA:", err);
      }
    };
    
    if (!modelsLoaded) {
      carregarMotores();
    }
  }, [modelsLoaded]);

  // 2. Transforma empregados em Descritores apenas APOS os modelos estarem prontos
  useEffect(() => {
    if (!modelsLoaded) return; // Só avança se a IA já baixou as redes neurais
    
    try {
      const labeledDescriptors = employees
        .filter(emp => emp.hasBiometrics && (emp.biometricDescriptors?.length > 0 || emp.biometricDescriptor))
        .map(emp => {
           const dataArrays = emp.biometricDescriptors?.length > 0 ? emp.biometricDescriptors : [emp.biometricDescriptor];
           const float32Arrays = dataArrays.map(arr => new Float32Array(arr));
           return new faceapi.LabeledFaceDescriptors(emp.id, float32Arrays);
        });
        
      if (labeledDescriptors.length > 0) {
         setFaceMatcher(new faceapi.FaceMatcher(labeledDescriptors, 0.55));
      } else {
         setFaceMatcher(null);
      }
      
      setSystemReady(true);
    } catch (err) {
      console.error("Erro ao mapear descritores da IA:", err);
    }
  }, [employees, modelsLoaded]);

  // Handle Manual Totem Click
  const handleStartScan = async () => {
    if (!faceMatcher) {
      alert("Aviso: Nenhum funcionário com biometria ativa foi encontrado. Vá na aba de Equipe e cadastre o rosto de alguém antes de bater o ponto.");
      return;
    }

    setIsActive(true);
    setScanning(true);
    setStatus({ type: 'idle', message: 'Localizando Rosto...' });

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      if (videoRef.current) {
         videoRef.current.srcObject = stream;
         videoRef.current.onplaying = () => {
           // Começa a escanear apenas quando a câmera confirmar que ligou
           setTimeout(() => startScanLoop(stream), 800);
         };
      }
    } catch (err) {
      handleError('Câmera indisponível ou permissão negada.');
    }
  };

  const startScanLoop = async (stream) => {
    if (!videoRef.current || !faceMatcher) {
      handleError('Sistema não pronto.');
      shutdownCamera(stream);
      return;
    }

    let attempts = 0;
    let foundMatch = false;
    let lastError = 'Rosto não encontrado.';

    // Sequential loop instead of setInterval to prevent Promise overlapping!
    const scanFrame = async () => {
       if (foundMatch) return; // Exit if already resolved 
       if (!videoRef.current) return; // Camera element closed
       
       attempts++;

       try {
         const detection = await faceapi.detectSingleFace(
           videoRef.current, 
           new faceapi.TinyFaceDetectorOptions()
         ).withFaceLandmarks().withFaceDescriptor();

         if (foundMatch) return; // double check after await chunk

         if (detection) {
           const bestMatch = faceMatcher.findBestMatch(detection.descriptor);
           
           if (bestMatch.label !== 'unknown' && bestMatch.distance < 0.55) { // tolerant match
              foundMatch = true;
              handleSuccessfulMatch(bestMatch.label, stream);
              return;
           } else {
              lastError = 'Rosto desconhecido. Já cadastrou no RH?';
           }
         } else {
           lastError = 'Centralize o rosto na câmera...';
         }
       } catch (error) {
         lastError = 'Aguardando Lente da Câmera...';
         attempts--; // Don't count hardware/canvas errors towards the 15 attempts
       }

       if (attempts >= 15 && !foundMatch) {
         handleError(lastError, stream);
         return;
       }

       // Proceed to try next frame
       if (!foundMatch) {
          setTimeout(scanFrame, 200);
       }
    };
    
    // Fire the first frame
    scanFrame();
  };

  const handleError = (msg, stream = null) => {
     setScanning(false);
     setStatus({ type: 'error', message: msg });
     shutdownCamera(stream);
     
     // Reset
     setTimeout(() => {
        setIsActive(false);
        setStatus({ type: 'idle', message: '' });
     }, 4000);
  }

  const handleSuccessfulMatch = (userId, stream) => {
    setScanning(false);
    const matchedEmployee = employees.find(e => e.id === userId);
    
    // 4 Shift States Cycle
    const shiftCycle = ['Entrada', 'Inicio do Almoço', 'Fim do Almoço', 'Saida'];
    
    // Check 5m anti-spam dynamically inside logTime Context
    const todayLogs = getTodayLogs().filter(log => log.userId === userId).sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));
    let lastState = todayLogs.length > 0 ? todayLogs[0].type : null;
    
    let nextState = 'Entrada';
    if (lastState) {
       const cycleIndex = shiftCycle.indexOf(lastState);
       if (cycleIndex >= 0 && cycleIndex < 3) {
          nextState = shiftCycle[cycleIndex + 1];
       } else {
          nextState = 'Entrada'; // Reset cycle
       }
    }
    
    const result = logTime(userId, nextState, null);
    
    if (!result.success) {
      handleError(result.message, stream);
      return;
    }
    
    setStatus({ 
      type: 'success', 
      message: `Ponto de ${nextState} Registrado!`,
      userName: matchedEmployee.name
    });
    
    shutdownCamera(stream);

    // Turn off screen
    setTimeout(() => {
       setIsActive(false);
       setStatus({ type: 'idle', message: '' });
    }, 4000);
  };
  
  const shutdownCamera = (stream) => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    if (videoRef.current && videoRef.current.srcObject) {
       videoRef.current.srcObject.getTracks().forEach(track => track.stop());
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      
      <button onClick={logout} className="absolute top-6 right-6 text-white/20 hover:text-white/50 transition-colors p-2 z-50">
        <LogOut size={24} />
      </button>

      <div className="max-w-2xl w-full flex flex-col items-center">
        
        <div className="text-center mb-10">
          <h1 className="text-4xl font-extrabold text-white tracking-tight mb-2">Relógio de Ponto</h1>
          <p className="text-primary-500 font-medium text-xl capitalize">{format(currentTime, "EEEE, d 'de' MMMM", { locale: ptBR })}</p>
          <div className="text-6xl font-black text-white mt-4 tracking-tighter opacity-80 font-mono">
            {format(currentTime, "HH:mm:ss")}
          </div>
        </div>

        <div className="bg-white/10 p-4 pt-4 pb-8 rounded-[40px] backdrop-blur-xl border border-white/20 w-full max-w-md shadow-2xl relative transition-all duration-500">
           
           {!isActive ? (
             <div className="aspect-[4/5] flex flex-col items-center justify-center space-y-8 p-6 text-center">
                 {!systemReady ? (
                    <div className="flex flex-col items-center text-primary-400">
                      <div className="w-12 h-12 border-4 border-current border-t-transparent rounded-full animate-spin mb-4"></div>
                      <p>Inicializando Motores IA...</p>
                    </div>
                 ) : !faceMatcher && employees.length > 0 ? (
                    <div className="text-red-400 flex flex-col items-center">
                      <ShieldAlert size={48} className="mb-4" />
                      <p className="text-lg font-bold">Nenhuma biometria válida no banco.</p>
                      <p className="text-sm opacity-80 mt-2">Peça ao RH para cadastrar as faces.</p>
                    </div>
                 ) : (
                   <>
                     <div className="w-32 h-32 bg-primary-500 rounded-full flex items-center justify-center shadow-lg shadow-primary-500/30 animate-pulse">
                        <Camera size={48} className="text-white" />
                     </div>
                     <div>
                       <h3 className="text-2xl font-bold text-white mb-2">Pronto para Registrar</h3>
                       <p className="text-white/60">Toque no botão abaixo quando estiver de frente para a tela.</p>
                     </div>
                     <Button 
                        onClick={handleStartScan} 
                        className="w-full h-16 text-2xl shadow-xl uppercase font-black tracking-wider group relative overflow-hidden mb-4"
                     >
                        <span className="relative z-10 transition-transform group-hover:scale-105 inline-block">BATER PONTO</span>
                     </Button>
                     <button 
                        onClick={() => setShowHistory(true)} 
                        className="px-4 py-2 mt-2 rounded-xl text-white/50 hover:text-white hover:bg-white/10 transition-colors font-medium"
                     >
                        Ver Histórico Recente
                     </button>
                   </>
                 )}
             </div>
           ) : (
             <div className="relative w-full aspect-[4/5] rounded-3xl overflow-hidden bg-black flex items-center justify-center border-4 border-slate-800 shadow-inner">
                <video 
                  ref={videoRef} 
                  autoPlay 
                  muted 
                  playsInline
                  className={`w-full h-full object-cover transition-opacity duration-300 ${status.type === 'success' || status.type === 'error' ? 'opacity-20 blur-md' : 'opacity-100'}`} 
                />

                {scanning && (
                   <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm">
                      <div className="w-16 h-16 border-4 border-white border-t-primary-500 rounded-full animate-spin mb-4"></div>
                      <p className="text-white font-bold text-xl drop-shadow-md">Analisando Rosto...</p>
                   </div>
                )}

                {status.type === 'success' && (
                   <div className="absolute inset-0 bg-green-500/80 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in duration-300">
                      <div className="bg-white text-green-600 rounded-full p-4 mb-4 shadow-lg shadow-green-900/20">
                        <CheckCircle2 size={64} strokeWidth={2.5} />
                      </div>
                      <h2 className="text-3xl font-bold text-white mb-1 shadow-black/50 drop-shadow-sm">{status.message}</h2>
                      <p className="text-xl text-green-50 font-medium">{status.userName}</p>
                   </div>
                )}

                {status.type === 'error' && (
                   <div className="absolute inset-0 bg-red-600/80 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in duration-300">
                      <div className="bg-white text-red-600 rounded-full p-4 mb-4 shadow-lg shadow-red-900/20">
                        <XCircle size={64} strokeWidth={2.5} />
                      </div>
                      <h2 className="text-2xl font-bold text-white mb-1 shadow-black/50 drop-shadow-sm">Erro de Leitura</h2>
                      <p className="text-lg text-red-50 font-medium">{status.message}</p>
                   </div>
                )}
             </div>
           )}
        </div>
      </div>

      {/* History Modal for Totem */}
      {showHistory && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl p-6 shadow-xl flex flex-col max-h-[80vh]">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-slate-800">Histórico Recente</h2>
              <button onClick={() => setShowHistory(false)} className="text-slate-400 hover:text-slate-700">
                <XCircle size={24} />
              </button>
            </div>
            
            <div className="overflow-y-auto flex-1 border border-slate-100 rounded-xl">
              <table className="w-full text-left border-collapse bg-white">
                <thead className="sticky top-0 bg-slate-50 z-10 shadow-sm border-b border-slate-200">
                  <tr className="text-sm text-slate-500">
                    <th className="p-4 font-medium">Data</th>
                    <th className="p-4 font-medium">Funcionário</th>
                    <th className="p-4 font-medium">Tipo</th>
                    <th className="p-4 font-medium">Horário</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {logs.length === 0 && (
                    <tr>
                      <td colSpan="4" className="p-8 text-center text-slate-500">Nenhum registro ainda.</td>
                    </tr>
                  )}
                  {logs.sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 50).map(log => (
                    <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4 text-slate-800">
                        {format(new Date(log.timestamp), "dd/MM/yyyy")}
                      </td>
                      <td className="p-4 font-medium text-slate-800">
                        {getUserName(log.userId)}
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          log.type === 'Entrada' || log.type === 'Saida' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
                        }`}>
                          {log.type}
                        </span>
                      </td>
                      <td className="p-4 text-slate-800 font-bold whitespace-nowrap">
                        {format(new Date(log.timestamp), 'HH:mm:ss')} 
                        {log.manual && <span className="ml-2 text-[10px] bg-primary-100 text-primary-700 px-1.5 rounded uppercase font-bold tracking-wider">RH Ed</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 text-center">
              <p className="text-xs text-slate-400">Mostrando os últimos 50 registros. Edições apenas via painel Admin/RH.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
