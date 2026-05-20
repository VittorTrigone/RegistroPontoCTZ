import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabase';
import emailjs from '@emailjs/browser';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Building2, ArrowLeft, CheckCircle2 } from 'lucide-react';

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
      console.error("Supabase Error:", dbError);
      setStatus(dbError.message || dbError.code || 'Erro desconhecido no banco de dados');
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
      setStatus(`Erro EmailJS: ${emailError.text || emailError.message}`);
    }
  };

  return (
    <div className="min-h-[100dvh] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-900 relative overflow-hidden font-sans">
      
      {/* Background Decorativo */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[70vw] h-[70vw] rounded-full bg-primary-600/20 blur-[100px]"></div>
        <div className="absolute top-[40%] -right-[20%] w-[60vw] h-[60vw] rounded-full bg-primary-500/10 blur-[80px]"></div>
      </div>

      <div className="relative z-10 sm:mx-auto sm:w-full sm:max-w-sm animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl flex items-center justify-center shadow-xl shadow-primary-500/30 ring-4 ring-slate-800">
            <Building2 size={32} className="text-white" strokeWidth={1.5} />
          </div>
        </div>
        <h2 className="text-center text-2xl font-black tracking-tight text-white mb-2">
          Uso Corporativo
        </h2>
        <p className="text-center text-slate-400 font-medium px-6 mb-8 text-sm">
          Preencha o e-mail da sua empresa e nós analisaremos a disponibilização de uma área isolada.
        </p>

        <div className="bg-white/95 backdrop-blur-xl py-8 px-6 shadow-2xl sm:rounded-3xl sm:px-8 border border-white/20 mx-2">
          {status === 'success' ? (
            <div className="text-center space-y-6 animate-in zoom-in-95 duration-500">
              <div className="flex justify-center mb-4">
                 <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center text-green-600">
                    <CheckCircle2 size={32} strokeWidth={2.5} />
                 </div>
              </div>
              <div className="p-4 bg-green-50/80 text-green-700 rounded-2xl text-sm border border-green-200 font-medium">
                Solicitação recebida com sucesso! Fique de olho na sua caixa de entrada, logo enviaremos seus acessos.
              </div>
              <Button onClick={() => navigate('/login')} className="w-full h-12 font-bold shadow-lg shadow-green-500/30" variant="success">
                Voltar para o Início
              </Button>
            </div>
          ) : (
            <form className="space-y-4" onSubmit={handleSubmit}>
              <Input
                label="E-mail Corporativo"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="contato@suaempresa.com"
                className="h-12 bg-white"
              />

              {status !== 'idle' && status !== 'loading' && status !== 'success' && (
                <div className="p-3 rounded-xl bg-red-50/80 text-red-600 text-sm font-semibold border border-red-100 flex items-center space-x-2 animate-in shake">
                  <span>⚠️</span>
                  <span>Erro: {status}</span>
                </div>
              )}

              <Button type="submit" className="w-full h-12 font-bold shadow-lg shadow-primary-500/30 mt-2" disabled={status === 'loading'}>
                {status === 'loading' ? 'Enviando...' : 'Solicitar Ambiente'}
              </Button>

              <button 
                type="button" 
                onClick={() => navigate('/login')}
                className="w-full text-center text-sm font-bold text-slate-500 hover:text-slate-700 flex items-center justify-center gap-2 mt-6 py-3 rounded-2xl hover:bg-slate-100 transition-colors"
              >
                <ArrowLeft size={18} /> Voltar para o Login
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
