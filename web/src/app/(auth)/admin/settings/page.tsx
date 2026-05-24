'use client';

import { useState, useEffect } from 'react';
import { 
  Settings, Save, Upload, Shield, 
  Clock, Bell, Loader2, Camera 
} from 'lucide-react';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<any>({
    sessionTimeout: 8,
    notificationsEnabled: true,
  });
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const res = await api.get('/tenants/current/settings');
      if (res.data.settings) setSettings(res.data.settings);
      if (res.data.logoPath) {
        const urlRes = await api.get(`/tenants/current/logo/url`);
        setLogoUrl(urlRes.data.url);
      }
    } catch {
      toast.error('Erro ao carregar configurações');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.patch('/tenants/current/settings', settings);
      toast.success('Configurações salvas!');
    } catch {
      toast.error('Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      await api.post('/tenants/current/logo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success('Logo atualizada com sucesso!');
      loadSettings();
    } catch {
      toast.error('Erro ao fazer upload da logo');
    }
  };

  const [showLdapModal, setShowLdapModal] = useState(false);
  const [ldapTestUser, setLdapTestUser] = useState('');
  const [ldapTestPass, setLdapTestPass] = useState('');
  const [testingLdap, setTestingLdap] = useState(false);

  const handleTestLdap = async () => {
    if (!ldapTestUser || !ldapTestPass) {
      toast.error('Preencha usuário e senha para testar');
      return;
    }
    setTestingLdap(true);
    try {
      await api.post('/tenants/current/ldap/test', {
        ...settings,
        testUser: ldapTestUser,
        testPassword: ldapTestPass
      });
      toast.success('Conexão LDAP bem sucedida!');
      setShowLdapModal(false);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Falha na conexão LDAP');
    } finally {
      setTestingLdap(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-accent animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
          <Settings className="w-6 h-6 text-accent" />
          Configurações do Sistema
        </h1>
        <p className="text-slate-400 text-sm mt-1">Gerencie as preferências globais do seu estabelecimento.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Lado Esquerdo: Logo */}
        <div className="md:col-span-1 space-y-6">
          <div className="card p-6 text-center">
            <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4">Logotipo</h2>
            <div className="relative w-32 h-32 mx-auto mb-4 bg-navy-800 rounded-xl border-2 border-dashed border-navy-600 flex items-center justify-center overflow-hidden group">
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" />
              ) : (
                <Shield className="w-12 h-12 text-navy-600" />
              )}
              <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                <Camera className="w-6 h-6 text-white" />
                <input type="file" className="hidden" onChange={handleLogoUpload} accept="image/*" />
              </label>
            </div>
            <p className="text-xs text-slate-500">Recomendado: PNG ou SVG, fundo transparente.</p>
          </div>
        </div>

        {/* Lado Direito: Opções */}
        <div className="md:col-span-2 space-y-6">
          <div className="card p-6 space-y-6">
            {/* Sessão */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Clock className="w-4 h-4 text-accent" /> Sessão e Segurança
              </h3>
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <label className="input-label">Tempo de Sessão (horas)</label>
                  <input 
                    type="number" 
                    value={settings.sessionTimeout || 8}
                    onChange={(e) => setSettings({ ...settings, sessionTimeout: parseInt(e.target.value) })}
                    className="input" 
                    min="1" 
                    max="72"
                  />
                  <p className="text-xs text-slate-500">Tempo máximo de inatividade antes de deslogar automaticamente.</p>
                </div>
              </div>
            </div>

            <div className="h-px bg-navy-600" />

            {/* Notificações e Fluxo */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Bell className="w-4 h-4 text-accent" /> Notificações e Fluxo
              </h3>
              <div className="space-y-3">
                <label className="flex items-center gap-3 p-3 rounded-lg bg-navy-800/50 cursor-pointer hover:bg-navy-800 transition-colors">
                  <input 
                    type="checkbox" 
                    checked={settings.notificationsEnabled || false}
                    onChange={(e) => setSettings({ ...settings, notificationsEnabled: e.target.checked })}
                    className="checkbox" 
                  />
                  <div>
                    <p className="text-sm font-medium text-slate-200">Habilitar Notificações via WhatsApp/E-mail</p>
                    <p className="text-xs text-slate-500">Envia alertas automáticos para os responsáveis nas visitas.</p>
                  </div>
                </label>
              </div>
            </div>

            <div className="h-px bg-navy-600" />

            {/* Configurações LDAP */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-100">Integração LDAP / AD</h3>
                <label className="flex items-center gap-2 cursor-pointer">
                  <span className="text-xs text-slate-400">Ativar LDAP</span>
                  <input 
                    type="checkbox" 
                    checked={settings.ldapEnabled || false}
                    onChange={(e) => setSettings({ ...settings, ldapEnabled: e.target.checked })}
                    className="checkbox" 
                  />
                </label>
              </div>
              
              {settings.ldapEnabled && (
                <div className="grid grid-cols-2 gap-4 bg-navy-800/30 p-4 rounded-lg">
                  <div className="space-y-1 col-span-2">
                    <label className="text-xs text-slate-400">URL do Servidor (ex: ldap://10.0.0.1:389)</label>
                    <input type="text" value={settings.ldapUrl || ''} onChange={e => setSettings({...settings, ldapUrl: e.target.value})} className="input text-sm" />
                  </div>
                  <div className="space-y-1 col-span-2">
                    <label className="text-xs text-slate-400">Base DN de Busca (ex: dc=fab,dc=mil,dc=br)</label>
                    <input type="text" value={settings.ldapSearchBase || ''} onChange={e => setSettings({...settings, ldapSearchBase: e.target.value})} className="input text-sm" />
                  </div>
                  <div className="space-y-1 col-span-2">
                    <label className="text-xs text-slate-400">Filtro de Busca (ex: (mail={'{username}'}))</label>
                    <input type="text" value={settings.ldapSearchFilter || ''} onChange={e => setSettings({...settings, ldapSearchFilter: e.target.value})} className="input text-sm" />
                  </div>
                  <div className="space-y-1 col-span-2">
                    <label className="text-xs text-slate-400">Bind DN (Usuário de Serviço)</label>
                    <input type="text" value={settings.ldapBindDn || ''} onChange={e => setSettings({...settings, ldapBindDn: e.target.value})} className="input text-sm" />
                  </div>
                  <div className="space-y-1 col-span-2">
                    <label className="text-xs text-slate-400">Bind Credentials (Senha)</label>
                    <input type="password" value={settings.ldapBindCredentials || ''} onChange={e => setSettings({...settings, ldapBindCredentials: e.target.value})} className="input text-sm" />
                  </div>
                  <div className="col-span-2 mt-2">
                    <button type="button" onClick={() => setShowLdapModal(true)} className="btn-secondary w-full text-sm">
                      Testar Conexão LDAP
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="h-px bg-navy-600" />

            {/* Configurações E-mail SMTP */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-100">Configuração de E-mail (SMTP)</h3>
              <p className="text-xs text-slate-500">Deixe em branco para usar o SMTP padrão do sistema.</p>
              <div className="grid grid-cols-2 gap-4 bg-navy-800/30 p-4 rounded-lg">
                <div className="space-y-1 col-span-2 md:col-span-1">
                  <label className="text-xs text-slate-400">Host SMTP</label>
                  <input type="text" value={settings.smtpHost || ''} onChange={e => setSettings({...settings, smtpHost: e.target.value})} className="input text-sm" placeholder="smtp.gmail.com" />
                </div>
                <div className="space-y-1 col-span-1">
                  <label className="text-xs text-slate-400">Porta</label>
                  <input type="number" value={settings.smtpPort || ''} onChange={e => setSettings({...settings, smtpPort: parseInt(e.target.value)})} className="input text-sm" placeholder="587" />
                </div>
                <div className="space-y-1 col-span-1 flex flex-col justify-end">
                  <label className="flex items-center gap-2 cursor-pointer h-10 px-3 bg-navy-800 rounded-lg">
                    <input type="checkbox" checked={settings.smtpSecure || false} onChange={e => setSettings({...settings, smtpSecure: e.target.checked})} className="checkbox" />
                    <span className="text-xs text-slate-400">Usa SSL/TLS</span>
                  </label>
                </div>
                <div className="space-y-1 col-span-2">
                  <label className="text-xs text-slate-400">Usuário</label>
                  <input type="text" value={settings.smtpUser || ''} onChange={e => setSettings({...settings, smtpUser: e.target.value})} className="input text-sm" />
                </div>
                <div className="space-y-1 col-span-2">
                  <label className="text-xs text-slate-400">Senha</label>
                  <input type="password" value={settings.smtpPass || ''} onChange={e => setSettings({...settings, smtpPass: e.target.value})} className="input text-sm" />
                </div>
                <div className="space-y-1 col-span-2">
                  <label className="text-xs text-slate-400">Remetente (From)</label>
                  <input type="text" value={settings.smtpFrom || ''} onChange={e => setSettings({...settings, smtpFrom: e.target.value})} className="input text-sm" placeholder="Heimdall <noreply@gov.br>" />
                </div>
              </div>
            </div>

            <div className="h-px bg-navy-600" />

            {/* Configurações WhatsApp */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-100">Configuração de WhatsApp (Evolution API)</h3>
              <p className="text-xs text-slate-500">Deixe em branco para usar o número padrão do sistema.</p>
              <div className="grid grid-cols-1 gap-4 bg-navy-800/30 p-4 rounded-lg">
                <div className="space-y-1">
                  <label className="text-xs text-slate-400">URL da Evolution API</label>
                  <input type="text" value={settings.evolutionUrl || ''} onChange={e => setSettings({...settings, evolutionUrl: e.target.value})} className="input text-sm" placeholder="http://evolution:8080" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-400">Global API Key</label>
                  <input type="password" value={settings.evolutionKey || ''} onChange={e => setSettings({...settings, evolutionKey: e.target.value})} className="input text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-400">Nome da Instância</label>
                  <input type="text" value={settings.evolutionInstance || ''} onChange={e => setSettings({...settings, evolutionInstance: e.target.value})} className="input text-sm" placeholder="heimdall" />
                </div>
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <button onClick={handleSave} disabled={saving} className="btn-primary gap-2 min-w-[140px]">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Salvar Alterações
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal LDAP Test */}
      {showLdapModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-navy-900 rounded-xl max-w-md w-full p-6 border border-navy-700 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-100 mb-2">Testar Conexão LDAP</h3>
            <p className="text-sm text-slate-400 mb-6">Insira um usuário e senha válidos do LDAP para validar as regras de busca e conexão. Lembre-se de salvar as configurações antes caso queira testar modificações persistidas, ou as atuais da tela serão usadas.</p>
            
            <div className="space-y-4 mb-6">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300">Usuário</label>
                <input 
                  type="text" 
                  value={ldapTestUser}
                  onChange={e => setLdapTestUser(e.target.value)}
                  className="input" 
                  placeholder="ex: usuario@fab.mil.br" 
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300">Senha</label>
                <input 
                  type="password" 
                  value={ldapTestPass}
                  onChange={e => setLdapTestPass(e.target.value)}
                  className="input" 
                />
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowLdapModal(false)} className="btn-secondary">
                Cancelar
              </button>
              <button onClick={handleTestLdap} disabled={testingLdap} className="btn-primary min-w-[100px]">
                {testingLdap ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Testar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
