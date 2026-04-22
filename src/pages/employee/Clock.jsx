import React, { useEffect, useRef, useState } from 'react';
import * as faceapi from 'face-api.js';
import { useAuth } from '../../contexts/AuthContext';
import { usePonto } from '../../contexts/PontoContext';
import { format } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';
import { Button } from '../../components/ui/Button';
import { CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';

export const EmployeeClock = () => {
  const videoRef = useRef(null);
  const { user } = useAuth();
  const { logTime, getTodayLogs } = usePonto();
  
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [result, setResult] = useState(null); // 'success' or 'error'
  const [message, setMessage] = useState('');
  
  const todayLogs = getTodayLogs().filter(log => log.userId === user.id);
  const lastState = todayLogs.length > 0 ? (todayLogs[0].type === 'Entrada' ? 'Saida' : 'Entrada') : 'Entrada';

  useEffect(() => {
    const init = async () => {
      try {
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
          faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
          faceapi.nets.faceRecognitionNet.loadFromUri('/models')
        ]);
        
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

  const handleClockInOut = async () => {
    if (!videoRef.current || verifying) return;
    setVerifying(true);
    setResult(null);
    setMessage('');

    try {
      const detection = await faceapi.detectSingleFace(
        videoRef.current, 
        new faceapi.TinyFaceDetectorOptions()
      ).withFaceLandmarks().withFaceDescriptor();

      if (!detection) {
        setResult('error');
        setMessage('Rosto não detectado. Olhe para a câmera.');
        setVerifying(false);
        return;
      }

      // Compare descriptors
      if (!user.biometricDescriptor) {
         setResult('error');
         setMessage('Sua biometria não está configurada no banco de dados.');
         setVerifying(false);
         return;
      }

      const storedDescriptor = new Float32Array(user.biometricDescriptor);
      const liveDescriptor = detection.descriptor;
      
      const distance = faceapi.euclideanDistance(storedDescriptor, liveDescriptor);
      
      // 0.6 is a common threshold for face-api.js. Lower is more strict.
      if (distance < 0.5) {
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
        setMessage(`Ponto de ${lastState} registrado com sucesso!`);
        
        setTimeout(() => {
          setResult(null);
        }, 4000);
      } else {
        setResult('error');
        setMessage('Autenticação falhou. O rosto não corresponde ao cadastrado.');
      }

    } catch(err) {
      setResult('error');
      setMessage('Erro no processamento facial.');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="max-w-md mx-auto flex flex-col space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-slate-800">Bater Ponto</h1>
        <p className="text-slate-500 capitalize">{format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}</p>
      </div>

      <div className="bg-white rounded-3xl p-4 shadow-sm border border-slate-100 relative overflow-hidden">
        
        <div className="relative w-full aspect-[4/5] rounded-2xl overflow-hidden bg-slate-900 mb-6 border border-slate-100 flex items-center justify-center">
          {loading && <span className="text-slate-400 animate-pulse text-sm">Preparando IA...</span>}
          
          <video 
            ref={videoRef} 
            autoPlay 
            muted 
            playsInline
            className={`w-full h-full object-cover transition-opacity duration-500 ${loading ? 'opacity-0' : 'opacity-100'}`} 
          />
          
          {verifying && (
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-primary-500"></div>
            </div>
          )}

          {result === 'success' && (
             <div className="absolute inset-0 bg-green-500/80 backdrop-blur-md flex flex-col items-center justify-center text-white p-4 text-center">
               <CheckCircle2 size={64} className="mb-2" />
               <p className="font-bold text-lg">{message}</p>
             </div>
          )}
          {result === 'error' && (
             <div className="absolute inset-0 bg-red-500/80 backdrop-blur-md flex flex-col items-center justify-center text-white p-4 text-center">
               <XCircle size={64} className="mb-2" />
               <p className="font-bold text-lg">{message}</p>
             </div>
          )}
        </div>

        <Button 
          className="w-full h-16 text-xl shadow-lg relative overflow-hidden group"
          onClick={handleClockInOut}
          disabled={loading || verifying || result === 'success'}
        >
          <span className="relative z-10 font-bold uppercase tracking-wide">
            Registrar {lastState}
          </span>
          <div className="absolute inset-0 h-full w-0 bg-white/20 transition-[width] duration-300 ease-out group-hover:w-full"></div>
        </Button>
      </div>
      
      <div className="bg-orange-50 rounded-2xl p-4 flex items-start space-x-3 text-orange-800 text-sm">
        <AlertTriangle className="shrink-0 text-orange-500 mt-0.5" size={18} />
        <p>Certifique-se de estar em um ambiente bem iluminado e sozinho na câmera para bater o ponto perfeitamente.</p>
      </div>
    </div>
  );
};
