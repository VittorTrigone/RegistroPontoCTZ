import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabase';
import emailjs from '@emailjs/browser';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Building2, ArrowLeft } from 'lucide-react';

export const RequestAccess = () => {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle'); // idle, loading, success, error
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('loading');

    // 1. Insert into Supabase
    const { error: dbError } = await supabase
      .from('access_requests')
      .insert([{ company_email: email }]);

    if (dbError) {
      setStatus('error');
      return;
    }

    // 2. Alert via EmailJS
    try {
      await emailjs.send(
        import.meta.env.VITE_EMAILJS_SERVICE_ID,
        import.meta.env.VITE_EMAILJS_TEMPLATE_REQUEST_ID,
        { empresa_email: email },
        import.meta.env.VITE_EMAILJS_PUBLIC_KEY
      );
      setStatus('success');
    } catch (emailError) {
      console.error(emailError);
      // We still treat as success for the user if it hit the database
      setStatus('success');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center text-primary-600 mb-2">
          <Building2 size={48} strokeWidth={2.5} />
        </div>
        <h2 className="text-center text-3xl font-bold tracking-tight text-slate-900">
          Uso Corporativo
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600 px-6">
          Preencha o e-mail da sua empresa e nós analisaremos a disponibilização de uma área de trabalho isolada.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl shadow-slate-200/50 sm:rounded-2xl sm:px-10 border border-slate-100">
          {status === 'success' ? (
            <div className="text-center space-y-4">
              <div className="p-3 bg-green-50 text-green-700 rounded-xl mb-4 text-sm border border-green-200">
                ✔️ Solicitação recebida! Fique de olho na sua caixa de entrada, logo enviaremos seus acessos.
              </div>
              <Button onClick={() => navigate('/login')} className="w-full">
                Voltar para o Início
              </Button>
            </div>
          ) : (
            <form className="space-y-6" onSubmit={handleSubmit}>
              <Input
                label="E-mail Corporativo"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="contato@suaempresa.com"
              />

              {status === 'error' && (
                <div className="p-3 rounded-xl bg-red-50 text-red-600 text-sm font-medium border border-red-100">
                  Ocorreu um erro ao salvar o pedido. Tente mais tarde.
                </div>
              )}

              <Button type="submit" className="w-full" size="lg" disabled={status === 'loading'}>
                {status === 'loading' ? 'Enviando...' : 'Solicitar Ambiente'}
              </Button>

              <button 
                type="button" 
                onClick={() => navigate('/login')}
                className="w-full text-center text-sm text-slate-500 hover:text-slate-700 flex items-center justify-center gap-2 mt-4"
              >
                <ArrowLeft size={16} /> Voltar
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
