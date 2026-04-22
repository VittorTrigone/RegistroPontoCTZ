import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Clock } from 'lucide-react';

export const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    const result = await login(email, password);
    if (result.success) {
      if (result.user.role === 'admin') {
        navigate('/dashboard');
      } else {
        navigate('/totem');
      }
    } else {
      setError(result.message);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center text-primary-600 mb-2">
          <Clock size={48} strokeWidth={2.5} />
        </div>
        <h2 className="text-center text-3xl font-bold tracking-tight text-slate-900">
          FacePoint
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600">
          O ponto eletrônico ágil e seguro.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl shadow-slate-200/50 sm:rounded-2xl sm:px-10 border border-slate-100">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <Input
              label="E-mail"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ex: admin@facepoint.com"
            />

            <Input
              label="Senha"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />

            {error && (
              <div className="p-3 rounded-xl bg-red-50 text-red-600 text-sm font-medium border border-red-100">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" size="lg">
              Entrar no sistema
            </Button>
          </form>
          
          <div className="mt-6 text-center space-y-4">
            <p className="text-xs text-slate-400">
              Uso interno exclusivo para colaboradores.
            </p>
            <button 
              type="button" 
              onClick={() => navigate('/solicitar-acesso')}
              className="text-sm font-medium text-primary-600 hover:text-primary-500 block w-full"
            >
              Sua empresa é nova? Solicite um acesso
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
