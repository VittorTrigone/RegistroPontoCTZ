import React, { useEffect, useRef, useState } from 'react';
import { human, initHuman } from '../../utils/humanConfig';
import { useAuth } from '../../contexts/AuthContext';
import { usePonto } from '../../contexts/PontoContext';
import { format } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';
import { Button } from '../../components/ui/Button';
import { CheckCircle2, XCircle, AlertTriangle, Clock, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const EmployeeClock = () => {
  const videoRef = useRef(null);
  const { user } = useAuth();
  const { logTime, getTodayLogs } = usePonto();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [result, setResult] = useState(null); // 'success' or 'error'
  const [message, setMessage] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  
  const todayLogs = getTodayLogs().filter(log => log.userId === user.id);
  const lastState = todayLogs.length > 0 ? (todayLogs[0].type === 'Entrada' ? 'Saida' : 'Entrada') : 'Entrada';

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        await initHuman();
        
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setLoading(false);
      } catch (err) {
        console.error(err);
        setResult('error');
        setMessage('Erro ao acessar câmera ou modelos.');
      }
    };
    init();
    
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const scanTimeoutRef = useRef(null);

  const handleClockInOut = async () => {
    if (!videoRef.current || verifying) return;
    setVerifying(true);
    setResult(null);
    setMessage('');
    if (scanTimeoutRef.current) clearTimeout(scanTimeoutRef.current);

    try {
      const result = await human.detect(videoRef.current);
      const face = result.face[0];

      if (!face || !face.embedding) {
        setResult('error');
        setMessage('Rosto não detectado. Olhe para a câmera.');
        setVerifying(false);
        return;
      }

      // Compare descriptors
      if (!user.biometricDescriptor && (!user.biometricDescriptors || user.biometricDescriptors.length === 0)) {
         setResult('error');
         setMessage('Sua biometria não está configurada no banco de dados.');
         setVerifying(false);
         return;
      }

      const storedDescriptors = Array.isArray(user.biometricDescriptors) && user.biometricDescriptors.length > 0 
          ? user.biometricDescriptors 
          : [user.biometricDescriptor];
          
      let bestSimilarity = 0.0;
      for (const stored of storedDescriptors) {
         if (stored && stored.length > 500) { // Apenas embeddings do Human
             const sim = human.match.similarity(face.embedding, stored);
             if (sim > bestSimilarity) {
                bestSimilarity = sim;
             }
         }
      }
      
      if (bestSimilarity > 0.70) {
        // Success
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            logTime(user.id, lastState, { lat: pos.coords.latitude, lng: pos.coords.longitude });
          },
          (err) => {
             // Location denied but clocked in anyway
             console.warn("Location denied by user");
             logTime(user.id, lastState, null);
          }
        );
        
        setResult('success');
        setMessage(`Ponto Registrado! Precisão: ${Math.round(bestSimilarity * 100)}%`);
        if (scanTimeoutRef.current) clearTimeout(scanTimeoutRef.current);
        scanTimeoutRef.current = setTimeout(() => {
           setResult(null);
           setMessage('');
           navigate('/app');
        }, 6000);
      } else {
        setResult('error');
        setMessage(`Rosto não reconhecido. (Similaridade: ${Math.round(bestSimilarity * 100)}%)`);
        if (scanTimeoutRef.current) clearTimeout(scanTimeoutRef.current);
        scanTimeoutRef.current = setTimeout(() => {
           setResult(null);
           setMessage('');
        }, 6000);
      }

    } catch(err) {
      setResult('error');
      setMessage('Erro no processamento facial.');
      if (scanTimeoutRef.current) clearTimeout(scanTimeoutRef.current);
      scanTimeoutRef.current = setTimeout(() => setResult(null), 5000);
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-slate-900 flex flex-col pt-8 pb-safe relative overflow-hidden font-sans">
      
      <button 
        onClick={() => navigate('/app')} 
        className="absolute top-6 left-6 text-white/50 hover:text-white transition-colors z-50 p-2 bg-white/5 rounded-full backdrop-blur-md border border-white/10"
      >
        <ArrowLeft size={24} />
      </button>

      {/* Elementos Decorativos Fundo */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute top-[10%] left-[50%] -translate-x-1/2 w-[120vw] h-[120vw] rounded-full bg-primary-600/10 blur-[100px]"></div>
      </div>

      <div className="relative z-10 flex-1 flex flex-col px-4 sm:px-6">
        
        <div className="text-center mb-8 animate-in slide-in-from-top-4 duration-700 fade-in">
          <div className="inline-flex items-center space-x-2 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full mb-6 border border-white/10">
             <Clock size={16} className="text-primary-400" />
             <span className="text-white/80 font-medium text-sm tracking-wide capitalize">{format(currentTime, "EEEE, d 'de' MMMM", { locale: ptBR })}</span>
          </div>
          <h1 className="text-6xl font-black text-white tracking-tighter drop-shadow-md">
            {format(currentTime, "HH:mm")}
          </h1>
          <p className="text-primary-400 font-bold tracking-widest uppercase mt-2 text-sm">N-Ponto Mobile</p>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center w-full max-w-sm mx-auto">
          <div className="relative w-full aspect-[3/4] rounded-[2.5rem] overflow-hidden bg-slate-950 border border-white/10 shadow-2xl shadow-primary-500/20 mb-8 ring-4 ring-slate-800 animate-in zoom-in-95 duration-700">
            {loading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                 <div className="w-12 h-12 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin mb-4"></div>
                 <span className="text-slate-400 font-medium text-sm">Preparando Câmera...</span>
              </div>
            )}
            
            <video 
              ref={videoRef} 
              autoPlay 
              muted 
              playsInline
              className={`w-full h-full object-cover -scale-x-100 transition-opacity duration-500 ${loading ? 'opacity-0' : 'opacity-100'}`} 
            />
            
            {/* Overlay Grid */}
            <div className="absolute inset-0 border-[24px] border-slate-900/40 pointer-events-none rounded-[2.5rem]">
               <div className="w-full h-full border-2 border-dashed border-primary-500/30 rounded-[1.5rem] animate-pulse-slow"></div>
            </div>
            
            {verifying && (
              <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md flex flex-col items-center justify-center">
                <div className="w-16 h-16 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin mb-4 shadow-lg shadow-primary-500/50"></div>
                <span className="text-white font-bold tracking-widest uppercase text-xs">Analisando Rosto...</span>
              </div>
            )}

            {result === 'success' && (
               <div className="absolute inset-0 bg-green-500/90 backdrop-blur-lg flex flex-col items-center justify-center text-white p-6 text-center animate-in zoom-in duration-300">
                 <CheckCircle2 size={72} strokeWidth={2.5} className="mb-4 drop-shadow-md" />
                 <p className="font-black text-2xl tracking-tight mb-2">Sucesso!</p>
                 <p className="font-medium text-green-50 text-sm leading-relaxed">{message}</p>
               </div>
            )}
            
            {result === 'error' && (
               <div className="absolute inset-0 bg-red-500/90 backdrop-blur-lg flex flex-col items-center justify-center text-white p-6 text-center animate-in zoom-in duration-300">
                 <XCircle size={72} strokeWidth={2.5} className="mb-4 drop-shadow-md" />
                 <p className="font-black text-2xl tracking-tight mb-2">Ops!</p>
                 <p className="font-medium text-red-50 text-sm leading-relaxed">{message}</p>
               </div>
            )}
          </div>

          <Button 
            className="w-full h-16 text-lg shadow-lg relative overflow-hidden group shadow-primary-500/30 rounded-2xl"
            onClick={handleClockInOut}
            disabled={loading || verifying || result === 'success'}
          >
            <span className="relative z-10 font-black uppercase tracking-widest flex items-center justify-center">
              Registrar <span className={`ml-2 px-2 py-0.5 rounded border border-white/30 bg-white/20 text-white ${lastState === 'Entrada' ? '' : ''}`}>{lastState}</span>
            </span>
            <div className="absolute inset-0 h-full w-0 bg-white/20 transition-[width] duration-300 ease-out group-hover:w-full"></div>
          </Button>
          
          <div className="mt-6 flex items-start space-x-3 text-slate-400 text-xs text-center justify-center px-4">
            <AlertTriangle className="shrink-0 text-slate-500 mt-0.5" size={14} />
            <p className="max-w-[260px] font-medium leading-relaxed">Certifique-se de estar em um ambiente iluminado e centralize seu rosto na marcação.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
