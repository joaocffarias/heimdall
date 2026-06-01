'use client';

import { useEffect, useState } from 'react';
import { Users, Plus, Trash2, Loader2, Pencil, CheckCircle, Ban } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import toast from 'react-hot-toast';

const ROLES = [
  { value: 'GUARD', label: '🚪 Porteiro' },
  { value: 'RESPONSIBLE', label: '✍️ Responsável' },
  { value: 'ADMIN', label: '🔧 Admin' },
  { value: 'SUPER_ADMIN', label: '🛡️ Super Admin' },
];

const INITIAL_FORM = { name: '', email: '', password: '', role: 'GUARD', phone: '', whatsapp: '', forcePasswordChange: false, changePassword: false, isChiefOfStaff: false };

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const [saving, setSaving] = useState(false);
  const { user } = useAuthStore();

  const loadUsers = async () => {
    try {
      const res = await api.get('/users');
      setUsers(res.data);
    } catch { toast.error('Erro ao carregar usuários'); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadUsers(); }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: any = { ...form };
      if (editingUserId && !form.changePassword) {
        delete payload.password;
        delete payload.forcePasswordChange;
      }
      delete payload.changePassword;
      
      if (editingUserId) {
        await api.patch(`/users/${editingUserId}`, payload);
        toast.success('Usuário atualizado com sucesso!');
      } else {
        await api.post('/users', payload);
        toast.success('Usuário criado com sucesso!');
      }
      
      setShowForm(false);
      setEditingUserId(null);
      setForm(INITIAL_FORM);
      loadUsers();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erro ao salvar usuário');
    } finally { setSaving(false); }
  };

  const handleEdit = (u: any) => {
    setEditingUserId(u.id);
    setForm({
      name: u.name,
      email: u.email,
      password: '',
      role: u.role,
      phone: u.phone || '',
      whatsapp: u.whatsapp || '',
      forcePasswordChange: u.forcePasswordChange || false,
      changePassword: false,
      isChiefOfStaff: u.isChiefOfStaff || false,
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleToggleStatus = async (id: string, name: string, currentStatus: boolean) => {
    const action = currentStatus ? 'Desativar' : 'Ativar';
    if (!confirm(`${action} ${name}?`)) return;
    try {
      await api.patch(`/users/${id}/status`, { active: !currentStatus });
      toast.success(`Usuário ${currentStatus ? 'desativado' : 'ativado'}`);
      loadUsers();
    } catch { toast.error('Erro'); }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Excluir ${name} permanentemente? Essa ação não pode ser desfeita.`)) return;
    try {
      await api.delete(`/users/${id}`);
      toast.success('Usuário excluído');
      loadUsers();
    } catch (err: any) { 
      toast.error(err.response?.data?.message || 'Erro ao excluir usuário'); 
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <Users className="w-6 h-6 text-accent" /> Usuários
          </h1>
          <p className="text-slate-400 text-sm mt-1">Gerencie os usuários do estabelecimento</p>
        </div>
        <button onClick={() => { setEditingUserId(null); setForm(INITIAL_FORM); setShowForm(!showForm); }} className="btn-primary">
          <Plus className="w-4 h-4" /> Novo Usuário
        </button>
      </div>

      {showForm && (
        <div className="card p-6 animate-slide-up">
          <h2 className="font-semibold text-slate-100 mb-5">{editingUserId ? 'Editar Usuário' : 'Novo Usuário'}</h2>
          <form onSubmit={handleSave} className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="input-label">Nome *</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="input" placeholder="Nome completo" required />
            </div>
            <div>
              <label className="input-label">E-mail *</label>
              <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="input" type="email" placeholder="email@empresa.com" required />
            </div>
            <div>
              <label className="input-label">Perfil *</label>
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="input">
                {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <div>
              <label className="input-label">WhatsApp</label>
              <input value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
                className="input" placeholder="(11) 9 9999-9999" />
            </div>
            <div className="col-span-2"></div>
            
            {editingUserId && (
              <div className="col-span-2">
                <label className="flex items-center gap-2 text-sm text-slate-300">
                  <input type="checkbox" checked={form.changePassword} onChange={(e) => setForm({ ...form, changePassword: e.target.checked })} className="rounded bg-navy-900 border-navy-700 text-accent" />
                  Alterar senha do usuário
                </label>
              </div>
            )}

            {(!editingUserId || form.changePassword) && (
              <>
                <div>
                  <label className="input-label">Nova Senha *</label>
                  <input value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="input" type="password" placeholder="Mínimo 6 caracteres" required minLength={6} />
                </div>
                <div className="flex items-center">
                  <label className="flex items-center gap-2 text-sm text-slate-300 mt-6 cursor-pointer hover:text-white transition-colors">
                    <input type="checkbox" checked={form.forcePasswordChange} onChange={(e) => setForm({ ...form, forcePasswordChange: e.target.checked })} className="rounded bg-navy-900 border-navy-700 text-accent w-4 h-4 cursor-pointer" />
                    Exigir alteração de senha no 1º acesso
                  </label>
                </div>
              </>
            )}

            {(form.role === 'ADMIN' || form.role === 'SUPER_ADMIN') && (
              <div className="col-span-2">
                <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer hover:text-white transition-colors">
                  <input type="checkbox" checked={form.isChiefOfStaff} onChange={(e) => setForm({ ...form, isChiefOfStaff: e.target.checked })} className="rounded bg-navy-900 border-navy-700 text-accent w-4 h-4 cursor-pointer" />
                  <span className="font-semibold text-accent">É Autoridade Liberadora?</span> (Chefe de Depto, Encarregado de Divisão ou Imediato)
                </label>
              </div>
            )}

            <div className="col-span-2 flex gap-3 justify-end mt-4">
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancelar</button>
              <button type="submit" disabled={saving} className="btn-primary">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : (editingUserId ? 'Salvar Alterações' : 'Criar Usuário')}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 text-accent animate-spin" />
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-navy-800">
              <tr>
                <th className="table-header text-left">Usuário</th>
                <th className="table-header text-left">E-mail</th>
                <th className="table-header text-left">Perfil</th>
                <th className="table-header text-left">Status</th>
                <th className="table-header text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="table-row">
                  <td className="table-cell">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-accent font-bold text-sm">
                        {u.name?.[0]?.toUpperCase() || 'U'}
                      </div>
                      <span className="font-medium text-slate-100">{u.name}</span>
                    </div>
                  </td>
                  <td className="table-cell text-slate-400">{u.email}</td>
                  <td className="table-cell">
                    <span className="text-xs font-medium text-slate-300">{ROLES.find((r) => r.value === u.role)?.label || u.role}</span>
                  </td>
                  <td className="table-cell">
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${u.active ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>
                      {u.active ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="table-cell">
                    {u.id !== user?.id && (
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => handleEdit(u)} className="btn-ghost p-2 text-slate-300 hover:text-accent" title="Editar">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleToggleStatus(u.id, u.name, u.active)} className={`btn-ghost p-2 ${u.active ? 'text-warning hover:text-warning' : 'text-success hover:text-success'}`} title={u.active ? 'Desativar' : 'Ativar'}>
                          {u.active ? <Ban className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                        </button>
                        <button onClick={() => handleDelete(u.id, u.name)} className="btn-ghost p-2 text-danger hover:bg-danger/10" title="Excluir Permanentemente">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={5} className="table-cell text-center text-slate-400 py-8">Nenhum usuário encontrado.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
