import React, { useEffect, useRef, useState } from 'react';
import { human, initHuman } from '../utils/humanConfig';
import { usePonto } from '../contexts/PontoContext';
import { format } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';
import { CheckCircle2, UserCheck, ShieldAlert, LogOut, Camera, XCircle, History, Focus } from 'lucide-react';
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

  // 2. Transforma empregados em Descritores apenas APOS os modelos estarem prontos
  useEffect(() => {
    if (!modelsLoaded) return; // Só avança se a IA já baixou as redes neurais
    
    try {
      const profiles = [];
      employees
        .filter(emp => emp.hasBiometrics && (emp.biometricDescriptors?.length > 0 || emp.biometricDescriptor))
        .forEach(emp => {
           const dataArrays = emp.biometricDescriptors?.length > 0 ? emp.biometricDescriptors : [emp.biometricDescriptor];
           dataArrays.forEach(arr => {
              if (arr && arr.length > 500) { // Apenas os embeddings novos do Human (1024)
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

    // Sequential loop using requestAnimationFrame
    const scanFrame = async () => {
       if (foundMatch) return; // Exit if already resolved 
       if (!videoRef.current) return; // Camera element closed
       
       attempts++;

       try {
         const result = await human.detect(videoRef.current);
         const face = result.face[0];

         if (foundMatch) return; // double check after await chunk

         if (face && face.embedding) {
           let bestMatch = { id: 'unknown', similarity: 0.0 };
           
           for (const profile of faceMatcher) {
              const sim = human.match.similarity(face.embedding, profile.embedding);
              if (sim > bestMatch.similarity) {
                 bestMatch = { id: profile.id, similarity: sim };
              }
           }
           
           if (bestMatch.id !== 'unknown' && bestMatch.similarity > 0.55) { // strict match
              foundMatch = true;
              handleSuccessfulMatch(bestMatch.id, stream);
              return;
           } else {
              lastError = `Rosto desconhecido (${Math.round(bestMatch.similarity * 100)}% de precisão). Tente centralizar mais ou refaça a biometria.`;
           }
         } else {
           lastError = 'Centralize o rosto na câmera...';
         }
       } catch (error) {
         lastError = `Erro IA: ${error.message || 'Falha na leitura'}`;
         console.error(error);
         // Removido attempts-- para evitar loop infinito em caso de erros constantes
       }

       if (attempts >= 40 && !foundMatch) {
         handleError(lastError, stream);
         return;
       }

       // Atualiza a interface com o que a IA está pensando a cada frame
       setStatus({ type: 'idle', message: lastError });

       // Proceed to try next frame
       if (!foundMatch) {
          requestAnimationFrame(scanFrame);
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

  const handleSuccessfulMatch = async (userId, stream) => {
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
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 sm:p-8 relative overflow-hidden font-sans">
      
      {/* Elementos Decorativos Fundo Premium */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[20%] w-[60vw] h-[60vw] rounded-full bg-primary-600/10 blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[10%] w-[50vw] h-[50vw] rounded-full bg-blue-600/10 blur-[100px]"></div>
      </div>
      
      {/* Botões de Ação Topo */}
      <div className="absolute top-8 right-8 flex space-x-4 z-50">
        <button onClick={() => setShowHistory(true)} className="flex items-center space-x-2 bg-white/5 hover:bg-white/10 backdrop-blur-md border border-white/10 px-4 py-2 rounded-full text-white/80 hover:text-white transition-all shadow-lg text-sm font-medium">
          <History size={16} />
          <span>Ver Histórico</span>
        </button>
        <button onClick={logout} className="flex items-center space-x-2 bg-white/5 hover:bg-white/10 backdrop-blur-md border border-white/10 px-4 py-2 rounded-full text-white/80 hover:text-red-400 transition-all shadow-lg text-sm font-medium group">
          <LogOut size={16} className="group-hover:text-red-400 transition-colors" />
          <span>Sair</span>
        </button>
      </div>

      <div className="max-w-7xl w-full flex flex-col lg:flex-row items-center justify-center gap-12 lg:gap-24 relative z-10">
        
        {/* Lado Esquerdo: Relógio e Infos */}
        <div className="text-center lg:text-left flex-1 animate-in slide-in-from-left-8 duration-1000 fade-in">
          <div className="inline-flex items-center space-x-2 bg-white/5 backdrop-blur-md border border-white/10 px-4 py-2 rounded-full mb-6">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
            <span className="text-white/80 font-medium text-sm tracking-widest uppercase">Sistema Operacional</span>
          </div>
          
          <h1 className="text-8xl lg:text-[10rem] font-black text-white tracking-tighter drop-shadow-2xl leading-none mb-4 font-mono">
            {format(currentTime, "HH:mm")}
          </h1>
          <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 sm:gap-6">
             <p className="text-primary-400 font-medium text-2xl lg:text-3xl capitalize tracking-wide">{format(currentTime, "EEEE, d 'de' MMMM", { locale: ptBR })}</p>
             <span className="hidden sm:block w-2 h-2 rounded-full bg-slate-700"></span>
             <p className="text-white/40 font-mono text-2xl lg:text-3xl tracking-widest">{format(currentTime, "ss")}s</p>
          </div>
          
          <div className="mt-12 hidden lg:block">
            <h2 className="text-white text-3xl font-bold mb-4 tracking-tight">Bem-vindo(a)</h2>
            <p className="text-slate-400 text-lg max-w-md leading-relaxed">
              Posicione-se de frente para a câmera e aguarde o reconhecimento facial para registrar sua jornada.
            </p>
          </div>
        </div>

        {/* Lado Direito: Câmera / Área de Interação */}
        <div className="w-full max-w-md animate-in slide-in-from-right-8 duration-1000 fade-in">
          <div className="bg-white/10 p-2 sm:p-4 rounded-[3rem] backdrop-blur-xl border border-white/20 shadow-2xl shadow-black/50 relative transition-all duration-500">
             
             {!isActive ? (
               <div className="aspect-[4/5] flex flex-col items-center justify-center p-8 text-center bg-slate-900/40 rounded-[2.5rem] border border-white/5">
                   {!systemReady ? (
                      <div className="flex flex-col items-center text-primary-400">
                        <div className="w-16 h-16 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin mb-6"></div>
                        <p className="font-medium tracking-wide">Iniciando Motores de IA...</p>
                      </div>
                   ) : !faceMatcher && employees.length > 0 ? (
                      <div className="text-red-400 flex flex-col items-center bg-red-950/30 p-6 rounded-3xl border border-red-500/20">
                        <ShieldAlert size={56} className="mb-4 text-red-500 drop-shadow-md" />
                        <p className="text-xl font-bold mb-2">Nenhuma Biometria</p>
                        <p className="text-sm opacity-80">Peça ao RH para cadastrar as faces no painel administrativo.</p>
                      </div>
                   ) : (
                     <>
                       <div className="relative mb-8">
                         <div className="absolute inset-0 bg-primary-500 blur-xl opacity-30 rounded-full animate-pulse-slow"></div>
                         <div className="w-32 h-32 bg-gradient-to-br from-primary-500 to-primary-600 rounded-[2rem] flex items-center justify-center shadow-xl shadow-primary-500/20 ring-4 ring-slate-800 relative z-10 rotate-3 transition-transform hover:rotate-0">
                            <Focus size={56} strokeWidth={1.5} className="text-white" />
                         </div>
                       </div>
                       <div>
                         <h3 className="text-3xl font-black text-white mb-2 tracking-tight">Pronto</h3>
                         <p className="text-white/50 mb-8 font-medium">Toque no botão para iniciar.</p>
                       </div>
                       <Button 
                          onClick={handleStartScan} 
                          className="w-full h-20 text-2xl shadow-xl shadow-primary-500/30 uppercase font-black tracking-widest group relative overflow-hidden rounded-2xl"
                       >
                          <span className="relative z-10 transition-transform group-hover:scale-105 inline-block">BATER PONTO</span>
                          <div className="absolute inset-0 h-full w-0 bg-white/20 transition-[width] duration-300 ease-out group-hover:w-full"></div>
                       </Button>
                     </>
                   )}
               </div>
             ) : (
               <div className="relative w-full aspect-[4/5] rounded-[2.5rem] overflow-hidden bg-black flex items-center justify-center border-4 border-slate-900 shadow-inner">
                  <video 
                    ref={videoRef} 
                    autoPlay 
                    muted 
                    playsInline
                    className={`w-full h-full object-cover -scale-x-100 transition-opacity duration-300 ${status.type === 'success' || status.type === 'error' ? 'opacity-20 blur-md' : 'opacity-100'}`} 
                  />
                  
                  {/* Grid Overlay for Camera */}
                  <div className="absolute inset-0 border-[24px] border-slate-900/40 pointer-events-none rounded-[2.5rem]">
                     <div className="w-full h-full border-2 border-dashed border-primary-500/30 rounded-[1.5rem] animate-pulse-slow"></div>
                  </div>

                  {scanning && (
                     <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/60 backdrop-blur-md">
                        <div className="w-20 h-20 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin mb-6 shadow-lg shadow-primary-500/50"></div>
                        <p className="text-white font-bold tracking-widest uppercase text-sm drop-shadow-md">{status.message || 'Analisando Rosto...'}</p>
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
             )}
          </div>
        </div>
      </div>

      {/* History Modal for Totem */}
      {showHistory && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl p-6 shadow-2xl flex flex-col max-h-[80vh] border border-slate-100">
            <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-2xl font-black text-slate-800">Histórico Recente</h2>
                <p className="text-slate-500 font-medium text-sm">Últimos registros de ponto no sistema.</p>
              </div>
              <button onClick={() => setShowHistory(false)} className="text-slate-400 hover:text-slate-800 transition-colors bg-slate-50 hover:bg-slate-100 p-2 rounded-full">
                <XCircle size={28} />
              </button>
            </div>
            
            <div className="overflow-y-auto flex-1 rounded-2xl border border-slate-100">
              <table className="w-full text-left border-collapse bg-white">
                <thead className="sticky top-0 bg-slate-50 z-10 border-b border-slate-200">
                  <tr className="text-xs uppercase tracking-wider text-slate-500 font-bold">
                    <th className="p-4">Data</th>
                    <th className="p-4">Funcionário</th>
                    <th className="p-4">Tipo</th>
                    <th className="p-4 text-right">Horário</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {logs.length === 0 && (
                    <tr>
                      <td colSpan="4" className="p-12 text-center text-slate-500 font-medium text-lg">Nenhum registro ainda.</td>
                    </tr>
                  )}
                  {logs.sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 50).map(log => (
                    <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4 text-slate-600 font-medium text-sm">
                        {format(new Date(log.timestamp), "dd/MM/yyyy")}
                      </td>
                      <td className="p-4 font-bold text-slate-800 text-base">
                        {getUserName(log.userId)}
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                          log.type === 'Entrada' || log.type === 'Saida' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
                        }`}>
                          {log.type}
                        </span>
                      </td>
                      <td className="p-4 text-slate-800 font-black whitespace-nowrap text-right text-lg">
                        {format(new Date(log.timestamp), 'HH:mm:ss')} 
                        {log.manual && <span className="ml-3 text-[9px] bg-primary-100 text-primary-700 px-2 py-0.5 rounded uppercase font-black tracking-widest">Editado</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-6 text-center">
              <p className="text-xs text-slate-400 font-medium">Mostrando os últimos 50 registros. Edições apenas via painel Admin/RH.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
