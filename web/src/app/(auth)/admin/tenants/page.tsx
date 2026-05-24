'use client';

import { useEffect, useState } from 'react';
import { Building2, Plus, Trash2, Loader2, Link as LinkIcon } from 'lucide-react';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

export default function AdminTenantsPage() {
  const [tenants, setTenants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', slug: '', cnpj: '', email: '', phone: '', address: '' });
  const [saving, setSaving] = useState(false);

  const loadTenants = async () => {
    try {
      const res = await api.get('/tenants');
      setTenants(res.data);
    } catch { toast.error('Erro ao carregar estabelecimentos'); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadTenants(); }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/tenants', form);
      toast.success('Estabelecimento criado com sucesso!');
      setShowForm(false);
      setForm({ name: '', slug: '', cnpj: '', email: '', phone: '', address: '' });
      loadTenants();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erro ao criar estabelecimento');
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <Building2 className="w-6 h-6 text-accent" /> Estabelecimentos
          </h1>
          <p className="text-slate-400 text-sm mt-1">Gerencie as empresas e condomínios cadastrados (Multi-Tenant)</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">
          <Plus className="w-4 h-4" /> Novo Estabelecimento
        </button>
      </div>

      {showForm && (
        <div className="card p-6 animate-slide-up">
          <h2 className="font-semibold text-slate-100 mb-5">Novo Estabelecimento</h2>
          <form onSubmit={handleSave} className="grid grid-cols-2 gap-4">
            <div>
              <label className="input-label">Nome *</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="input" placeholder="Nome do estabelecimento" required />
            </div>
            <div>
              <label className="input-label">Identificador (Slug) *</label>
              <input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                className="input" placeholder="ex: empresa-xyz" required />
            </div>
            <div>
              <label className="input-label">CNPJ</label>
              <input value={form.cnpj} onChange={(e) => setForm({ ...form, cnpj: e.target.value })}
                className="input" placeholder="00.000.000/0000-00" />
            </div>
            <div>
              <label className="input-label">E-mail de Contato</label>
              <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="input" type="email" placeholder="contato@empresa.com" />
            </div>
            <div>
              <label className="input-label">Telefone</label>
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="input" placeholder="(11) 9999-9999" />
            </div>
            <div>
              <label className="input-label">Endereço</label>
              <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="input" placeholder="Rua, número, bairro..." />
            </div>
            <div className="col-span-2 flex gap-3 justify-end mt-2">
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancelar</button>
              <button type="submit" disabled={saving} className="btn-primary">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Criar Estabelecimento'}
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
        ) : tenants.length === 0 ? (
          <div className="text-center py-16">
            <Building2 className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400">Nenhum estabelecimento cadastrado</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-navy-800">
                <tr>
                  <th className="table-header text-left">Estabelecimento</th>
                  <th className="table-header text-left">URL (Slug)</th>
                  <th className="table-header text-left">Contato</th>
                  <th className="table-header text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {tenants.map((t) => (
                  <tr key={t.id} className="table-row">
                    <td className="table-cell">
                      <div>
                        <span className="font-medium text-slate-100">{t.name}</span>
                        {t.cnpj && <p className="text-xs text-slate-500">CNPJ: {t.cnpj}</p>}
                      </div>
                    </td>
                    <td className="table-cell">
                      <span className="flex items-center gap-1 text-xs font-mono text-slate-400 bg-navy-800 px-2 py-1 rounded inline-flex">
                        <LinkIcon className="w-3 h-3" /> {t.slug}
                      </span>
                    </td>
                    <td className="table-cell">
                      <div className="text-xs text-slate-400">
                        {t.email && <p>{t.email}</p>}
                        {t.phone && <p>{t.phone}</p>}
                        {!t.email && !t.phone && '-'}
                      </div>
                    </td>
                    <td className="table-cell">
                      <span className={`text-xs font-medium ${t.active ? 'text-success' : 'text-danger'}`}>
                        {t.active ? '● Ativo' : '● Inativo'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
