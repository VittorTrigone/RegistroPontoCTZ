import React, { useState, useEffect } from 'react';
import { supabase } from '../../utils/supabase';
import { Button } from '../../components/ui/Button';
import { Building2, Key, Trash2 } from 'lucide-react';
import emailjs from '@emailjs/browser';

export const ManageCompanies = () => {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    setLoading(true);
    // Busca apenas contas que são administradores de empresas (ignorando o superadmin local)
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('role', 'admin')
      .neq('email', 'admin@facepoint.com')
      .order('name', { ascending: true });
    
    if (data) setCompanies(data);
    setLoading(false);
  };

  const handleResetPassword = async (company) => {
    if (!confirm(`Deseja forçar a geração de novas senhas para ${company.email}?`)) return;

    const adminPassword = Math.random().toString(36).slice(-8);
    const totemPassword = Math.random().toString(36).slice(-8);

    // Update Admin pass
    const { error: adminError } = await supabase
      .from('users')
      .update({ password: adminPassword })
      .eq('email', company.email);
      
    // Update Totem pass (we derive totem email from admin email: email.adm -> email.totem)
    const baseEmail = company.email.replace('.adm', '');
    const totemEmail = `${baseEmail}.totem`;
    
    const { error: totemError } = await supabase
      .from('users')
      .update({ password: totemPassword })
      .eq('email', totemEmail);

    if (adminError || totemError) {
      alert("Erro ao redefinir a senha no banco de dados.");
      return;
    }

    try {
      await emailjs.send(
        import.meta.env.VITE_EMAILJS_SERVICE_ID,
        import.meta.env.VITE_EMAILJS_TEMPLATE_APPROVED_ID,
        {
          empresa_email: company.email,
          admin_email: company.email,
          totem_email: totemEmail,
          senha_admin: adminPassword,
          senha_totem: totemPassword
        },
        import.meta.env.VITE_EMAILJS_PUBLIC_KEY
      );
      alert(`Senhas redefinidas com sucesso!\nUm e-mail acabou de ser enviado para ${company.email} contendo as novas senhas.`);
    } catch (err) {
      console.error(err);
      alert(`Erro EmailJS: As senhas foram alteradas no banco, mas houve falha ao enviar o e-mail.\n\nCopie as senhas e envie manualmente:\nSenha Admin: ${adminPassword}\nSenha Totem: ${totemPassword}`);
    }
  };

  const handleDelete = async (company) => {
    if (!confirm(`⚠️ ATENÇÃO: Deseja realmente EXCLUIR o acesso da empresa ${company.email}?\nIsso apagará o login administrativo.`)) return;

    const baseEmail = company.email.replace('.adm', '');
    const totemEmail = `${baseEmail}.totem`;

    // Deleta os dois (Admin e Totem) - Note que em um sistema real precisaríamos apagar os time_logs tbm.
    await supabase.from('users').delete().in('email', [company.email, totemEmail]);
    
    alert('Acesso da empresa removido.');
    fetchCompanies();
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Empresas Clientes</h1>
        <p className="text-slate-500">Gerencie o acesso das empresas aprovadas na sua plataforma.</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-6 py-4 font-semibold text-sm text-slate-600">Identificação</th>
              <th className="px-6 py-4 font-semibold text-sm text-slate-600">E-mail Administrativo</th>
              <th className="px-6 py-4 font-semibold text-sm text-slate-600">Status da Conta</th>
              <th className="px-6 py-4 font-semibold text-sm text-slate-600 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan="4" className="text-center py-10 text-slate-500">Buscando empresas cadastradas...</td>
              </tr>
            ) : companies.length === 0 ? (
              <tr>
                <td colSpan="4" className="text-center py-10 text-slate-500">
                  <div className="flex flex-col items-center">
                    <Building2 size={40} className="text-slate-300 mb-3" />
                    <p>Nenhuma empresa cliente cadastrada ainda.</p>
                  </div>
                </td>
              </tr>
            ) : (
              companies.map((company) => (
                <tr key={company.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-600">
                        <Building2 size={18} />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">{company.name.replace('Admin (', '').replace(')', '')}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-500 text-sm">
                    {company.email}
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                      Ativa
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                       <Button 
                        size="sm"
                        variant="secondary"
                        icon={Key}
                        onClick={() => handleResetPassword(company)}
                        title="Gerar Nova Senha"
                      >Nova Senha</Button>
                      <Button 
                        size="sm"
                        variant="danger" 
                        icon={Trash2} 
                        className="!p-2.5 rounded-xl border border-red-600"
                        onClick={() => handleDelete(company)}
                        title="Excluir Empresa"
                      />
                    </div>
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
