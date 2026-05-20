import React, { useEffect, useRef, useState } from 'react';
import { human, initHuman } from '../utils/humanConfig';
import { usePonto } from '../contexts/PontoContext';
import { format } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';
import { CheckCircle2, ShieldAlert, LogOut, XCircle, Calendar, Settings, History, ScanFace, Menu } from 'lucide-react';
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
  const [showMore, setShowMore] = useState(false);

  const getUserName = (id) => {
    const emp = employees.find(e => e.id === id);
    return emp ? emp.name : 'Desconhecido';
  };

  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // 1. Carrega os modelos estáticos
  useEffect(() => {
    const carregarMotores = async () => {
      try {
        await initHuman();
        setModelsLoaded(true);
      } catch (err) {
        console.error("Erro critico ao carregar IA:", err);
      }
    };
    
    if (!modelsLoaded) {
      carregarMotores();
    }
  }, [modelsLoaded]);

  // 2. Transforma empregados em Descritores
  useEffect(() => {
    if (!modelsLoaded) return;
    
    try {
      const profiles = [];
      employees
        .filter(emp => emp.hasBiometrics && (emp.biometricDescriptors?.length > 0 || emp.biometricDescriptor))
        .forEach(emp => {
           const dataArrays = emp.biometricDescriptors?.length > 0 ? emp.biometricDescriptors : [emp.biometricDescriptor];
           dataArrays.forEach(arr => {
              if (arr && arr.length > 500) {
                 profiles.push({ id: emp.id, embedding: arr });
              }
           });
        });
        
      if (profiles.length > 0) {
         setFaceMatcher(profiles);
      } else {
         setFaceMatcher(null);
      }
      
      setSystemReady(true);
    } catch (err) {
      console.error("Erro ao mapear descritores da IA:", err);
    }
  }, [employees, modelsLoaded]);

  const scanTimeoutRef = useRef(null);

  // Handle Manual Totem Click
  const handleStartScan = async () => {
    if (!faceMatcher) {
      alert("Aviso: Nenhum funcionário com biometria ativa foi encontrado. Vá na aba de Equipe e cadastre o rosto de alguém antes de bater o ponto.");
      return;
    }

    setIsActive(true);
    setScanning(true);
    setStatus({ type: 'idle', message: 'Localizando Rosto...' });
    if (scanTimeoutRef.current) clearTimeout(scanTimeoutRef.current);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      if (videoRef.current) {
         videoRef.current.srcObject = stream;
         videoRef.current.onplaying = () => {
           videoRef.current.onplaying = null; // Prevent multiple triggers
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

    const startTime = Date.now();
    let foundMatch = false;
    let lastError = 'Rosto não encontrado.';

    const scanFrame = async () => {
       if (foundMatch) return;
       if (!videoRef.current) return;
       
       try {
         const result = await human.detect(videoRef.current);
         const face = result.face[0];

         if (foundMatch) return;

         if (face && face.embedding) {
           let bestMatch = { id: 'unknown', similarity: 0.0 };
           
           for (const profile of faceMatcher) {
              const sim = human.match.similarity(face.embedding, profile.embedding);
              if (sim > bestMatch.similarity) {
                 bestMatch = { id: profile.id, similarity: sim };
              }
           }
           
           if (bestMatch.id !== 'unknown' && bestMatch.similarity > 0.60) {
              foundMatch = true;
              handleSuccessfulMatch(bestMatch.id, stream);
              return;
           } else {
              lastError = `Rosto não reconhecido (${Math.round(bestMatch.similarity * 100)}%).`;
           }
         } else {
           lastError = 'Centralize o rosto na câmera...';
         }
       } catch (error) {
         lastError = `Erro IA: ${error.message || 'Falha na leitura'}`;
       }

       // 15 seconds timeout instead of frame attempts
       if (Date.now() - startTime > 15000 && !foundMatch) {
         handleError(lastError, stream);
         return;
       }

       setStatus({ type: 'idle', message: lastError });

       if (!foundMatch) {
          requestAnimationFrame(scanFrame);
       }
    };
    
    scanFrame();
  };

  const handleError = (msg, stream = null) => {
     setScanning(false);
     setStatus({ type: 'error', message: msg });
     shutdownCamera(stream);
     
     if (scanTimeoutRef.current) clearTimeout(scanTimeoutRef.current);
     scanTimeoutRef.current = setTimeout(() => {
        setIsActive(false);
        setStatus({ type: 'idle', message: '' });
     }, 6000);
  }

  const handleSuccessfulMatch = async (userId, stream) => {
    setScanning(false);
    const matchedEmployee = employees.find(e => e.id === userId);
    
    const shiftCycle = ['Entrada', 'Inicio do Almoço', 'Fim do Almoço', 'Saida'];
    const todayLogs = getTodayLogs().filter(log => log.userId === userId).sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));
    let lastState = todayLogs.length > 0 ? todayLogs[0].type : null;
    
    let nextState = 'Entrada';
    if (lastState) {
       const cycleIndex = shiftCycle.indexOf(lastState);
       if (cycleIndex >= 0 && cycleIndex < 3) {
          nextState = shiftCycle[cycleIndex + 1];
       } else {
          nextState = 'Entrada';
       }
    }
    
    const result = await logTime(userId, nextState, null);
    
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

    if (scanTimeoutRef.current) clearTimeout(scanTimeoutRef.current);
    scanTimeoutRef.current = setTimeout(() => {
       setIsActive(false);
       setStatus({ type: 'idle', message: '' });
    }, 6000);
  };
  
  const shutdownCamera = (stream) => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    if (videoRef.current && videoRef.current.srcObject) {
       videoRef.current.srcObject.getTracks().forEach(track => track.stop());
    }
  }

  // --- RENDERS ---

  if (showMore) {
    return (
      <div className="flex flex-col min-h-[100dvh] bg-[#1a1b26] text-white relative">
        <div className="flex-1 flex flex-col pt-12 px-6 max-w-md mx-auto w-full z-10">
          
          {/* Logo */}
          <div className="flex items-center justify-center space-x-3 mb-10">
            <div className="flex flex-col space-y-1">
              <div className="w-6 h-1.5 bg-[#f97316] rounded-full"></div>
              <div className="w-6 h-1.5 bg-[#f97316] rounded-full"></div>
              <div className="w-6 h-1.5 bg-[#f97316] rounded-full"></div>
            </div>
            <span className="text-xl font-bold tracking-widest uppercase">FacePoint</span>
          </div>
  
          <h1 className="text-2xl font-bold mb-6">Mais opções</h1>
  
          <div className="space-y-3">
            <button 
              onClick={() => { setShowMore(false); setShowHistory(true); }}
              className="w-full bg-[#2a2b36] hover:bg-[#343644] rounded-2xl p-5 flex items-center transition-colors"
            >
              <History size={24} className="text-[#f97316] mr-4" />
              <span className="font-bold text-lg">Histórico</span>
            </button>
  
            <button 
              onClick={logout}
              className="w-full bg-[#2a2b36] hover:bg-[#343644] rounded-2xl p-5 flex items-center transition-colors mt-8"
            >
              <LogOut size={24} className="text-[#f97316] mr-4" />
              <span className="font-bold text-lg text-white">Sair do Totem</span>
            </button>
          </div>
        </div>

        {/* Navigation Bar */}
        <nav className="absolute bottom-0 left-0 right-0 bg-[#f5f5f7] rounded-t-3xl shadow-[0_-10px_40px_rgb(0,0,0,0.1)] z-50">
           <div className="flex items-center justify-around px-6 py-4 pb-8 max-w-md mx-auto">
              <button onClick={() => setShowMore(false)} className="flex flex-col items-center justify-center w-20 text-slate-400 hover:text-slate-600 transition-colors">
                <div className="p-1"><ScanFace size={26} strokeWidth={2} /></div>
                <span className="text-xs font-medium tracking-wide mt-1">Início</span>
              </button>
              <button className="flex flex-col items-center justify-center w-20 text-[#f97316] transition-colors">
                <div className="p-1"><Menu size={26} strokeWidth={2.5} /></div>
                <span className="text-xs font-bold tracking-wide mt-1">Mais</span>
              </button>
           </div>
        </nav>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-[100dvh] bg-[#f5f5f7] relative font-sans overflow-y-auto no-scrollbar">
      
      {/* Câmera Ativa / Fullscreen Overlay */}
      {isActive && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col">
          <button 
            onClick={() => { setIsActive(false); setScanning(false); shutdownCamera(); }}
            className="absolute top-8 right-8 z-50 bg-white/10 p-3 rounded-full text-white hover:bg-white/20"
          >
            <XCircle size={32} />
          </button>

          <div className="relative w-full h-full flex items-center justify-center bg-black overflow-hidden">
            <video 
              ref={videoRef} 
              autoPlay 
              muted 
              playsInline
              className={`w-full h-full object-cover -scale-x-100 transition-opacity duration-300 ${status.type === 'success' || status.type === 'error' ? 'opacity-20 blur-md' : 'opacity-100'}`} 
            />

            {/* Grid Overlay for Camera */}
            <div className="absolute inset-0 border-[24px] border-slate-900/60 pointer-events-none">
                <div className="w-full h-full border-2 border-dashed border-[#f97316]/50 rounded-[2rem] animate-pulse-slow"></div>
            </div>

            {scanning && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/40 backdrop-blur-sm">
                  <div className="w-20 h-20 border-4 border-[#f97316]/30 border-t-[#f97316] rounded-full animate-spin mb-6 shadow-lg shadow-[#f97316]/50"></div>
                  <p className="text-white font-bold tracking-widest uppercase text-sm drop-shadow-md text-center px-6">{status.message || 'Analisando Rosto...'}</p>
                </div>
            )}

            {status.type === 'success' && (
                <div className="absolute inset-0 bg-green-500/90 backdrop-blur-lg flex flex-col items-center justify-center p-8 text-center animate-in zoom-in duration-300">
                  <CheckCircle2 size={80} strokeWidth={2.5} className="text-white mb-6 drop-shadow-lg" />
                  <h2 className="text-3xl font-black text-white mb-2 shadow-black/50 drop-shadow-md uppercase tracking-wide">{status.message}</h2>
                  <p className="text-2xl text-green-50 font-bold">{status.userName}</p>
                </div>
            )}

            {status.type === 'error' && (
                <div className="absolute inset-0 bg-red-600/90 backdrop-blur-lg flex flex-col items-center justify-center p-8 text-center animate-in zoom-in duration-300">
                  <XCircle size={80} strokeWidth={2.5} className="text-white mb-6 drop-shadow-lg" />
                  <h2 className="text-3xl font-black text-white mb-2 shadow-black/50 drop-shadow-md uppercase tracking-wide">Erro</h2>
                  <p className="text-xl text-red-50 font-medium leading-snug">{status.message}</p>
                </div>
            )}
          </div>
        </div>
      )}

      {/* Main Dashboard UI */}
      <div className="absolute top-0 left-0 right-0 h-[40%] bg-[#1a1b26] z-0 rounded-b-[30px] lg:rounded-b-[40px]"></div>

      <div className="relative z-10 flex-1 flex flex-col pt-8 pb-[100px] px-5 max-w-md mx-auto w-full">
        {/* Logo and Date */}
        <div className="flex flex-col mb-5">
          <div className="flex items-center justify-center space-x-3 text-white mb-6 mt-2">
            <div className="flex flex-col space-y-1">
              <div className="w-5 h-1.5 bg-[#f97316] rounded-full"></div>
              <div className="w-5 h-1.5 bg-[#f97316] rounded-full"></div>
              <div className="w-5 h-1.5 bg-[#f97316] rounded-full"></div>
            </div>
            <span className="text-lg font-bold tracking-widest uppercase">FacePoint</span>
          </div>
          
          <div className="flex items-center text-slate-300 text-xs sm:text-sm font-medium w-full mb-3">
            <Calendar size={16} className="mr-2 opacity-80" />
            <span className="capitalize">{format(currentTime, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}</span>
          </div>

          <div className="w-full text-left">
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1">Bem-vindo(a)!</h1>
            <p className="text-slate-400 text-sm">Seu sistema de ponto digital.</p>
          </div>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-[28px] p-5 shadow-xl shadow-black/5 mb-6 w-full border border-slate-100">
          <div className="text-center mb-6 mt-1">
            <p className="text-slate-500 font-medium text-sm mb-1">Hora atual</p>
            <div className="text-[2.75rem] sm:text-[3.25rem] font-black text-slate-900 tracking-tighter tabular-nums leading-none">
              {format(currentTime, "HH:mm:ss")}
            </div>
          </div>
          
          <button 
            onClick={handleStartScan}
            disabled={!systemReady}
            className="w-full h-14 rounded-[20px] bg-[#f97316] hover:bg-[#e66a14] text-white text-lg font-bold shadow-lg shadow-[#f97316]/30 transition-all active:scale-95 flex items-center justify-center"
          >
            {systemReady ? (
              <>
                <ScanFace size={24} className="mr-3" />
                Bater ponto
              </>
            ) : (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            )}
          </button>
        </div>

        {/* Shortcuts */}
        <div className="w-full px-1">
          <h2 className="text-slate-800 font-bold text-base mb-3">Seus atalhos</h2>
          
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <button 
              onClick={() => setShowHistory(true)}
              className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-sm border border-slate-100 flex flex-col items-start text-left hover:shadow-md transition-shadow"
            >
              <div className="text-[#f97316] mb-3">
                <History size={24} strokeWidth={2} />
              </div>
              <h3 className="font-bold text-slate-800 text-sm mb-1">Histórico</h3>
              <p className="text-[10px] sm:text-xs text-slate-500 font-medium leading-relaxed">Últimos registros</p>
            </button>

            <button 
              onClick={() => {
                if(window.confirm('Recarregar banco de faces da IA?')) {
                   window.location.reload();
                }
              }}
              className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-sm border border-slate-100 flex flex-col items-start text-left hover:shadow-md transition-shadow"
            >
              <div className="text-[#f97316] mb-3">
                <Settings size={24} strokeWidth={2} />
              </div>
              <h3 className="font-bold text-slate-800 text-sm mb-1">Sincronizar</h3>
              <p className="text-[10px] sm:text-xs text-slate-500 font-medium leading-relaxed">Atualizar biometria</p>
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-slate-100 rounded-t-[24px] shadow-[0_-10px_40px_rgb(0,0,0,0.04)] z-40">
         <div className="flex items-center justify-around px-4 py-2 pb-safe max-w-md mx-auto">
            <button className="flex flex-col items-center justify-center w-20 text-[#f97316] transition-colors">
              <div className="p-1"><ScanFace size={26} strokeWidth={2.5} /></div>
              <span className="text-xs font-bold tracking-wide mt-1">Início</span>
            </button>
            <button onClick={() => setShowMore(true)} className="flex flex-col items-center justify-center w-20 text-slate-400 hover:text-slate-600 transition-colors">
              <div className="p-1"><Menu size={26} strokeWidth={2} /></div>
              <span className="text-xs font-medium tracking-wide mt-1">Mais</span>
            </button>
         </div>
      </nav>

      {/* Modal Histórico (O mesmo que já existia, mas estilizado) */}
      {showHistory && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex flex-col p-4 animate-in fade-in duration-200">
          <div className="bg-[#f5f5f7] rounded-[32px] w-full max-w-md mx-auto mt-auto flex flex-col max-h-[85vh] overflow-hidden shadow-2xl">
            <div className="bg-white px-6 py-5 border-b border-slate-100 flex justify-between items-center z-10">
              <div>
                <h2 className="text-xl font-bold text-slate-800">Histórico Recente</h2>
                <p className="text-slate-500 text-xs mt-0.5">Últimos registros do Totem</p>
              </div>
              <button onClick={() => setShowHistory(false)} className="bg-slate-100 p-2 rounded-full text-slate-500 hover:bg-slate-200 transition-colors">
                <XCircle size={24} />
              </button>
            </div>
            
            <div className="overflow-y-auto flex-1 p-4 bg-[#f5f5f7]">
              <div className="space-y-3">
                {logs.length === 0 && (
                  <div className="text-center p-8 text-slate-500 font-medium bg-white rounded-2xl">Nenhum registro hoje.</div>
                )}
                {logs.sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 30).map(log => (
                  <div key={log.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex justify-between items-center">
                     <div>
                       <p className="font-bold text-slate-800">{getUserName(log.userId)}</p>
                       <p className="text-xs text-slate-500 mt-0.5">{format(new Date(log.timestamp), "dd/MM/yyyy")}</p>
                     </div>
                     <div className="text-right">
                       <p className="text-xl font-black text-slate-900">{format(new Date(log.timestamp), 'HH:mm')}</p>
                       <span className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          log.type === 'Entrada' || log.type === 'Saida' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                        }`}>
                          {log.type}
                        </span>
                     </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
