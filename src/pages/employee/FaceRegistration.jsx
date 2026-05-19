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
  const [faceData, setFaceData] = useState(null);
  const [error, setError] = useState('');

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
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
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
    };
  }, [modelsLoaded]);

  const captureFace = async () => {
    if (!videoRef.current) return;
    setScanning(true);
    setError('');

    try {
      const result = await human.detect(videoRef.current);
      const face = result.face[0];

      if (face && face.embedding) {
        // Face detected and mapped correctly
        setFaceData(Array.from(face.embedding)); // Convert Float32Array to standard array for JSON localstorage
        setScanning(false);
      } else {
        setError("Não conseguimos detectar seu rosto com clareza. Tente iluminar bem o rosto e olhe para frente.");
        setScanning(false);
      }
    } catch (err) {
      setError("Erro ao escanear o rosto.");
      setScanning(false);
    }
  };

  const handleSave = () => {
    if (faceData) {
      updateUser({
        hasBiometrics: true,
        biometricDescriptor: faceData
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
            <div className="absolute inset-0 border-[24px] border-slate-900/40 pointer-events-none rounded-[2.5rem]">
               <div className="w-full h-full border-2 border-dashed border-primary-500/50 rounded-[1.5rem] animate-pulse-slow"></div>
            </div>

            {faceData && (
              <div className="absolute inset-0 bg-green-500/90 backdrop-blur-lg flex items-center justify-center flex-col animate-in zoom-in duration-300">
                <CheckCircle2 size={72} strokeWidth={2.5} className="text-white mb-4 drop-shadow-md" />
                <span className="text-white font-black text-2xl tracking-tight">Rosto Mapeado!</span>
              </div>
            )}
            
            {scanning && (
              <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md flex flex-col items-center justify-center">
                <div className="w-16 h-16 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin mb-4 shadow-lg shadow-primary-500/50"></div>
                <span className="text-white font-bold tracking-widest uppercase text-xs">Mapeando 3D...</span>
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
