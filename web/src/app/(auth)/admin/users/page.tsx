'use client';

import { useEffect, useState } from 'react';
import { Users, Plus, Trash2, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import toast from 'react-hot-toast';

const ROLES = [
  { value: 'GUARD', label: '🚪 Porteiro' },
  { value: 'RESPONSIBLE', label: '✍️ Responsável' },
  { value: 'ADMIN', label: '🔧 Admin' },
  { value: 'SUPER_ADMIN', label: '🛡️ Super Admin' },
];

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'GUARD', phone: '', whatsapp: '' });
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
      await api.post('/users', form);
      toast.success('Usuário criado com sucesso!');
      setShowForm(false);
      setForm({ name: '', email: '', password: '', role: 'GUARD', phone: '', whatsapp: '' });
      loadUsers();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erro ao criar usuário');
    } finally { setSaving(false); }
  };

  const handleDeactivate = async (id: string, name: string) => {
    if (!confirm(`Desativar ${name}?`)) return;
    try {
      await api.delete(`/users/${id}`);
      toast.success('Usuário desativado');
      loadUsers();
    } catch { toast.error('Erro'); }
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
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">
          <Plus className="w-4 h-4" /> Novo Usuário
        </button>
      </div>

      {showForm && (
        <div className="card p-6 animate-slide-up">
          <h2 className="font-semibold text-slate-100 mb-5">Novo Usuário</h2>
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
              <label className="input-label">Senha *</label>
              <input value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="input" type="password" placeholder="Mínimo 6 caracteres" required minLength={6} />
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
            <div className="col-span-2 flex gap-3 justify-end">
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancelar</button>
              <button type="submit" disabled={saving} className="btn-primary">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Criar Usuário'}
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
                <th className="table-header text-left">Ações</th>
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
                    <span className={`text-xs font-medium ${u.active ? 'text-success' : 'text-danger'}`}>
                      {u.active ? '● Ativo' : '● Inativo'}
                    </span>
                  </td>
                  <td className="table-cell">
                    {u.id !== user?.id && (
                      <button onClick={() => handleDeactivate(u.id, u.name)} className="btn-ghost p-2 text-danger" title="Desativar">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
