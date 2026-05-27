import React, { useEffect, useRef, useState } from 'react';
import { human, initHuman } from '../../utils/humanConfig';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Camera, CheckCircle2, ShieldAlert } from 'lucide-react';

export const FaceRegistration = () => {
  const videoRef = useRef(null);
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [instruction, setInstruction] = useState("Siga as instruções");
  const [faceData, setFaceData] = useState(null); // Now stores an array of descriptors
  const [error, setError] = useState('');

  // Use a ref to store collected descriptors during the scan loop without triggering re-renders that break the loop
  const collectedDescriptorsRef = useRef([]);
  const scanLoopRef = useRef(null);
  const phaseRef = useRef(0);
  const sideSignRef = useRef(0);
  const phaseCountRef = useRef(0);

  useEffect(() => {
    const loadModels = async () => {
      try {
        await initHuman();
        setModelsLoaded(true);
      } catch (err) {
        console.error(err);
        setError("Erro ao carregar modelos de IA. Recarregue a página.");
      }
    };
    loadModels();
  }, []);

  const startCamera = async () => {
    try {
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
      setLoading(false);
    } catch (err) {
      setError("Por favor, permita o acesso à câmera para configurar sua biometria.");
    }
  };

  useEffect(() => {
    if (modelsLoaded) {
      startCamera();
    }
    
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      }
      if (scanLoopRef.current) cancelAnimationFrame(scanLoopRef.current);
    };
  }, [modelsLoaded]);

  const captureFace = async () => {
    if (!videoRef.current) return;
    setScanning(true);
    setScanProgress(0);
    setInstruction("Olhe diretamente para a câmera");
    setError('');
    collectedDescriptorsRef.current = [];
    phaseRef.current = 0;
    sideSignRef.current = 0;
    phaseCountRef.current = 0;

    const TOTAL_SAMPLES = 10;
    
    const scanFrame = async () => {
      if (!videoRef.current) return;
      
      try {
        const result = await human.detect(videoRef.current);
        const face = result.face[0];

        if (face && face.embedding && face.faceScore > 0.6) {
          // Extrai a rotação (yaw = esquerda/direita)
          const yaw = face.rotation?.angle?.yaw || 0;
          let validFrame = false;

          // Fase 0: Frente
          if (phaseRef.current === 0) {
             if (Math.abs(yaw) < 0.15) {
                validFrame = true;
             } else {
                setInstruction("Mantenha o rosto reto para a câmera");
             }
          }
          // Fase 1: Virar para um lado
          else if (phaseRef.current === 1) {
             if (Math.abs(yaw) > 0.20) {
                validFrame = true;
                if (sideSignRef.current === 0) {
                   sideSignRef.current = Math.sign(yaw); // Salva para qual lado virou
                }
             } else {
                setInstruction("Vire o rosto lentamente para um dos lados");
             }
          }
          // Fase 2: Virar para o outro lado
          else if (phaseRef.current === 2) {
             if (Math.abs(yaw) > 0.20 && Math.sign(yaw) !== sideSignRef.current) {
                validFrame = true;
             } else {
                setInstruction("Agora vire o rosto para o OUTRO lado");
             }
          }

          if (validFrame) {
             collectedDescriptorsRef.current.push(Array.from(face.embedding));
             phaseCountRef.current += 1;
             setScanProgress(Math.round((collectedDescriptorsRef.current.length / TOTAL_SAMPLES) * 100));

             // Avanço de Fases
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

      if (collectedDescriptorsRef.current.length < TOTAL_SAMPLES) {
        scanLoopRef.current = requestAnimationFrame(scanFrame);
      } else {
        // Done
        setFaceData(collectedDescriptorsRef.current);
        setScanning(false);
      }
    };
    
    // Start loop
    scanFrame();
  };

  const handleSave = () => {
    if (faceData && faceData.length > 0) {
      updateUser({
        hasBiometrics: true,
        biometricDescriptors: faceData // Saving the array of descriptors
      });
      navigate('/clock');
    }
  };

  return (
    <div className="min-h-[100dvh] bg-slate-900 flex flex-col pt-8 pb-safe relative overflow-hidden font-sans">
      
      {/* Background Decorativo */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute top-[20%] left-[50%] -translate-x-1/2 w-[120vw] h-[120vw] rounded-full bg-primary-600/10 blur-[100px]"></div>
      </div>

      <div className="relative z-10 flex-1 flex flex-col px-4 sm:px-6">
        <div className="text-center mb-6 animate-in slide-in-from-top-4 duration-700 fade-in">
          <div className="h-16 w-16 mx-auto bg-gradient-to-br from-primary-500 to-primary-600 rounded-[20px] flex items-center justify-center mb-4 shadow-lg shadow-primary-500/30 ring-4 ring-slate-800">
            <Camera size={32} className="text-white" strokeWidth={1.5} />
          </div>
          <h2 className="text-3xl font-black text-white tracking-tight drop-shadow-md mb-2">Configure sua Biometria</h2>
          <p className="text-slate-400 font-medium text-sm max-w-xs mx-auto leading-relaxed">
            Mapeie seu rosto para liberar o relógio de ponto no seu celular.
          </p>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center w-full max-w-sm mx-auto">
          <div className="relative w-full aspect-[3/4] rounded-[2.5rem] overflow-hidden bg-slate-950 border border-white/10 shadow-2xl shadow-primary-500/20 mb-6 ring-4 ring-slate-800 animate-in zoom-in-95 duration-700">
            {loading && !error && (
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                 <div className="w-12 h-12 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin mb-4"></div>
                 <span className="text-slate-400 font-medium text-sm">Iniciando Câmera...</span>
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
            <div className={`absolute inset-0 border-[24px] border-slate-900/40 pointer-events-none rounded-[2.5rem] transition-colors ${scanning ? 'border-primary-500/30' : ''}`}>
               <div className={`w-full h-full border-2 border-dashed rounded-[1.5rem] ${scanning ? 'border-primary-500 animate-pulse' : 'border-primary-500/50 animate-pulse-slow'}`}></div>
            </div>

            {/* Progress Bar inside Camera */}
            {scanning && (
              <div className="absolute bottom-6 left-6 right-6 bg-slate-900/80 backdrop-blur-md rounded-2xl p-4 shadow-xl border border-white/10 text-center z-10 animate-in slide-in-from-bottom-4">
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

            {faceData && (
              <div className="absolute inset-0 bg-green-500/90 backdrop-blur-lg flex items-center justify-center flex-col animate-in zoom-in duration-300">
                <CheckCircle2 size={72} strokeWidth={2.5} className="text-white mb-4 drop-shadow-md" />
                <span className="text-white font-black text-2xl tracking-tight">Rosto Mapeado!</span>
              </div>
            )}
          </div>

          {error && (
            <div className="mb-6 w-full flex items-start space-x-3 text-red-100 bg-red-500/20 border border-red-500/30 p-4 rounded-2xl text-sm text-left animate-in shake">
              <ShieldAlert size={20} className="shrink-0 text-red-400" />
              <span className="font-medium">{error}</span>
            </div>
          )}

          <div className="w-full mb-6">
            {!faceData ? (
              <Button 
                className="w-full h-16 text-lg shadow-lg shadow-primary-500/30 rounded-2xl font-bold uppercase tracking-widest" 
                onClick={captureFace} 
                disabled={loading || scanning}
              >
                {scanning ? 'Analisando...' : 'Escanear Rosto'}
              </Button>
            ) : (
              <Button 
                className="w-full h-16 text-lg shadow-lg shadow-green-500/30 rounded-2xl font-bold uppercase tracking-widest !bg-green-500 hover:!bg-green-400" 
                onClick={handleSave}
              >
                Confirmar e Avançar
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
