import React, { useState, useEffect } from 'react';
import { supabase } from '../../utils/supabase';
import emailjs from '@emailjs/browser';
import { Button } from '../../components/ui/Button';
import { Mail, Check, X, Building2 } from 'lucide-react';

export const AccessRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('access_requests')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (data) setRequests(data);
    setLoading(false);
  };

  const handleApprove = async (request) => {
    const adminPassword = Math.random().toString(36).slice(-8); // Random 8-char pass
    const totemPassword = Math.random().toString(36).slice(-8); // Different pass for totem
    const adminEmail = `${request.company_email}.adm`;
    const totemEmail = `${request.company_email}.totem`;

    // Create Admin User
    const adminUser = {
      id: `admin_${Date.now()}`,
      name: `Admin (${request.company_email})`,
      email: adminEmail,
      role: 'admin',
      password: adminPassword,
      hasBiometrics: false
    };

    // Create Totem User
    const totemUser = {
      id: `totem_${Date.now()}`,
      name: `Totem (${request.company_email})`,
      email: totemEmail,
      role: 'totem',
      password: totemPassword,
      hasBiometrics: false
    };

    // 1. Insert Users
    const { error: insertError } = await supabase.from('users').insert([adminUser, totemUser]);
    
    if (insertError) {
      alert(`Erro ao criar usuários no banco: ${insertError.message}`);
      console.error(insertError);
      return;
    }

    // 2. Mark as approved
    await supabase.from('access_requests').update({ status: 'approved' }).eq('id', request.id);

    // 3. Send email to the applicant
    try {
      await emailjs.send(
        import.meta.env.VITE_EMAILJS_SERVICE_ID,
        import.meta.env.VITE_EMAILJS_TEMPLATE_APPROVED_ID,
        {
          empresa_email: request.company_email,
          admin_email: adminEmail,
          totem_email: totemEmail,
          senha_admin: adminPassword,
          senha_totem: totemPassword
        },
        import.meta.env.VITE_EMAILJS_PUBLIC_KEY
      );
      alert('Aprovado! E-mail com credenciais enviado com sucesso.');
    } catch (err) {
      alert(`Erro EmailJS: ${err.text || err.message || JSON.stringify(err)}\n\nCopie as senhas manualmente:\nSenha Admin: ${adminPassword}\nSenha Totem: ${totemPassword}`);
      console.error(err);
    }

    fetchRequests();
  };

  const handleReject = async (id) => {
    if(!confirm("Deseja rejeitar esta solicitação?")) return;
    await supabase.from('access_requests').update({ status: 'rejected' }).eq('id', id);
    fetchRequests();
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Solicitações B2B</h1>
        <p className="text-slate-500">Gerencie empresas solicitando acesso ao sistema.</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-6 py-4 font-semibold text-sm text-slate-600">Empresa</th>
              <th className="px-6 py-4 font-semibold text-sm text-slate-600">Data</th>
              <th className="px-6 py-4 font-semibold text-sm text-slate-600">Status</th>
              <th className="px-6 py-4 font-semibold text-sm text-slate-600 text-right">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan="4" className="text-center py-10 text-slate-500">Carregando solicitações...</td>
              </tr>
            ) : requests.length === 0 ? (
              <tr>
                <td colSpan="4" className="text-center py-10 text-slate-500">
                  <div className="flex flex-col items-center">
                    <Building2 size={40} className="text-slate-300 mb-3" />
                    <p>Nenhuma solicitação encontrada.</p>
                  </div>
                </td>
              </tr>
            ) : (
              requests.map((req) => (
                <tr key={req.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-600">
                        <Mail size={18} />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">{req.company_email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-500 text-sm">
                    {new Date(req.created_at).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                      req.status === 'approved' ? 'bg-green-100 text-green-700' :
                      req.status === 'rejected' ? 'bg-red-100 text-red-700' :
                      'bg-orange-100 text-orange-700'
                    }`}>
                      {req.status === 'approved' ? 'Aprovado' : req.status === 'rejected' ? 'Rejeitado' : 'Pendente'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {req.status === 'pending' && (
                      <div className="flex items-center justify-end gap-2">
                        <Button 
                          icon={X} 
                          variant="danger"
                          className="!p-2.5 rounded-xl border border-red-600"
                          onClick={() => handleReject(req.id)}
                        />
                        <Button 
                          icon={Check} 
                          variant="success"
                          className="!p-2.5 rounded-xl border border-emerald-600"
                          onClick={() => handleApprove(req)}
                        />
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
