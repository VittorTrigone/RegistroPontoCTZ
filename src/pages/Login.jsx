import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Clock, Fingerprint } from 'lucide-react';

export const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    const result = await login(email, password);
    setIsLoading(false);
    
    if (result.success) {
      if (result.user.role === 'superadmin') {
        navigate('/solicitacoes');
      } else if (result.user.role === 'admin') {
        navigate('/dashboard');
      } else if (result.user.role === 'totem') {
        navigate('/totem');
      }
    } else {
      setError(result.message);
    }
  };

  return (
    <div className="min-h-[100dvh] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-900 relative overflow-hidden selection:bg-primary-500 selection:text-white font-sans">
      
      {/* Background Decorativo */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[70vw] h-[70vw] rounded-full bg-primary-600/20 blur-[100px]"></div>
        <div className="absolute top-[40%] -right-[20%] w-[60vw] h-[60vw] rounded-full bg-primary-500/10 blur-[80px]"></div>
      </div>

      <div className="relative z-10 sm:mx-auto sm:w-full sm:max-w-sm animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl flex items-center justify-center shadow-xl shadow-primary-500/30 ring-4 ring-slate-800">
             <Fingerprint size={32} className="text-white" strokeWidth={1.5} />
          </div>
        </div>
        <h2 className="text-center text-3xl font-black tracking-tight text-white mb-2">
          FacePoint
        </h2>
        <p className="text-center text-slate-400 font-medium px-4 mb-8 text-sm">
          O ponto eletrônico ágil, seguro e 100% digital.
        </p>

        <div className="bg-white/95 backdrop-blur-xl py-8 px-6 shadow-2xl sm:rounded-3xl sm:px-8 border border-white/20 mx-2">
          <form className="space-y-4" onSubmit={handleSubmit}>
            <Input
              label="E-mail"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              className="h-12 bg-white"
            />

            <Input
              label="Senha"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="h-12 bg-white"
            />

            {error && (
              <div className="p-3 rounded-xl bg-red-50/80 text-red-600 text-sm font-semibold border border-red-100 flex items-center space-x-2 animate-in shake">
                <span>⚠️</span>
                <span>{error}</span>
              </div>
            )}

            <Button type="submit" className="w-full h-12 font-bold shadow-lg shadow-primary-500/30 mt-2" disabled={isLoading}>
              {isLoading ? 'Autenticando...' : 'Acessar o Sistema'}
            </Button>
          </form>
          
          <div className="mt-8 text-center space-y-4 border-t border-slate-100 pt-6">
            <button 
              type="button" 
              onClick={() => navigate('/solicitar-acesso')}
              className="text-sm font-bold text-slate-500 hover:text-primary-600 block w-full transition-all duration-200 py-3 rounded-2xl hover:bg-primary-50 active:scale-95"
            >
              Sua empresa é nova? <span className="text-primary-600">Solicite um acesso</span>
            </button>
            <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">
              Uso interno exclusivo para colaboradores
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
