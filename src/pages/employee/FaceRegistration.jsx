import React, { useEffect, useRef, useState } from 'react';
import * as faceapi from 'face-api.js';
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
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
          faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
          faceapi.nets.faceRecognitionNet.loadFromUri('/models')
        ]);
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
      const detection = await faceapi.detectSingleFace(
        videoRef.current, 
        new faceapi.TinyFaceDetectorOptions()
      ).withFaceLandmarks().withFaceDescriptor();

      if (detection) {
        // Face detected and mapped correctly
        setFaceData(Array.from(detection.descriptor)); // Convert Float32Array to standard array for JSON localstorage
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
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 text-center relative overflow-hidden">
      
      <div className="relative z-10 max-w-md w-full mx-auto pb-10">
        <div className="mb-6">
          <div className="h-16 w-16 mx-auto bg-primary-500/20 text-primary-500 rounded-full flex items-center justify-center mb-4">
            <Camera size={32} />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Configure sua Biometria</h2>
          <p className="text-slate-400 text-sm">
            Para sua segurança, precisamos registrar seu rosto. Isso nos ajuda a validar que é você no momento de bater o ponto.
          </p>
        </div>

        <div className="bg-white/10 p-6 rounded-3xl backdrop-blur-md border border-white/10">
          <div className="relative w-full aspect-[3/4] mx-auto rounded-2xl overflow-hidden bg-black flex items-center justify-center border-2 border-primary-500/30">
            {loading && !error && <span className="text-primary-500 animate-pulse">Iniciando câmera...</span>}
            <video 
              ref={videoRef} 
              autoPlay 
              muted 
              playsInline
              className={`w-full h-full object-cover transition-opacity duration-500 ${loading ? 'opacity-0' : 'opacity-100'}`} 
            />
            
            {/* Overlay Grid */}
            <div className="absolute inset-0 border-[40px] border-black/40 pointer-events-none rounded-2xl">
               <div className="w-full h-full border-2 border-dashed border-primary-500/50 rounded-full animate-pulse-slow"></div>
            </div>

            {faceData && (
              <div className="absolute inset-0 bg-green-500/20 backdrop-blur-sm flex items-center justify-center flex-col">
                <CheckCircle2 size={64} className="text-green-500 mb-2" />
                <span className="text-white font-bold text-xl">Rosto Mapeado!</span>
              </div>
            )}
            
            {scanning && (
              <div className="absolute inset-0 bg-primary-500/20 backdrop-blur-sm flex items-center justify-center">
                <div className="w-16 h-16 border-4 border-white border-t-primary-500 rounded-full animate-spin"></div>
              </div>
            )}
          </div>

          {error && (
            <div className="mt-4 flex items-center space-x-2 text-red-400 bg-red-400/10 p-3 rounded-lg text-sm text-left">
              <ShieldAlert size={20} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="mt-6">
            {!faceData ? (
              <Button 
                className="w-full" 
                size="lg" 
                onClick={captureFace} 
                disabled={loading || scanning}
              >
                {scanning ? 'Escaneando...' : 'Escanear meu Rosto'}
              </Button>
            ) : (
              <Button 
                className="w-full !bg-green-600 hover:!bg-green-500" 
                size="lg" 
                onClick={handleSave}
              >
                Confirmar Configuração
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
