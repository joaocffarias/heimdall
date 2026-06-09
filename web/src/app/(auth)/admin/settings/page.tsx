'use client';

import { useState, useEffect } from 'react';
import { 
  Settings, Save, Upload, Shield, 
  Clock, Bell, Loader2, Camera,
  Download, Database, Server, RefreshCw
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<any>({
    sessionTimeout: 8,
    notificationsEnabled: true,
  });
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  const [exportingFull, setExportingFull] = useState(false);
  const [restoringBackup, setRestoringBackup] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);

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

  const handleExportFull = async () => {
    setExportingFull(true);
    try {
      const res = await api.get('/system/backup/full', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'heimdall-full-backup.zip');
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      toast.success('Backup completo gerado com sucesso!');
    } catch {
      toast.error('Erro ao gerar backup completo');
    } finally {
      setExportingFull(false);
    }
  };

  const handleRestoreBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm('ATENÇÃO: A restauração de registros apagará conflitos atuais. Deseja continuar?')) {
      e.target.value = '';
      return;
    }

    setRestoringBackup(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      await api.post('/system/restore', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success('Backup restaurado com sucesso!');
    } catch {
      toast.error('Erro ao restaurar backup');
    } finally {
      setRestoringBackup(false);
      e.target.value = '';
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.patch('/tenants/current/settings', settings);
      
      useAuthStore.setState((state) => ({
        user: state.user ? { ...state.user, sessionTimeout: settings.sessionTimeout } : null
      }));

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

          {/* Card de Desenvolvedor */}
          <div className="card p-6 border-accent/20 border bg-gradient-to-br from-navy-800 to-navy-900">
            <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2 mb-4">
              <Shield className="w-4 h-4 text-accent" /> Sobre o Desenvolvedor
            </h2>
            <div className="space-y-4 text-sm text-slate-300">
              <p>Sistema idealizado e desenvolvido por <strong className="text-accent">João Carlos Farias</strong>.</p>
              <div className="flex flex-col gap-3 pt-2">
                <a href="https://github.com/joaocffarias" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 hover:text-accent transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd"></path></svg>
                  github.com/joaocffarias
                </a>
                <a href="mailto:jcarlos.farias@icloud.com" className="flex items-center gap-3 hover:text-accent transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                  jcarlos.farias@icloud.com
                </a>
              </div>
            </div>
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
                  <label className="input-label">Tempo de Sessão (minutos)</label>
                  <input 
                    type="number" 
                    value={settings.sessionTimeout || 480}
                    onChange={(e) => setSettings({ ...settings, sessionTimeout: parseInt(e.target.value) })}
                    className="input" 
                    min="1" 
                    max="1440"
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

            <div className="h-px bg-navy-600" />

            {/* Manutenção e Sistema */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Server className="w-4 h-4 text-accent" /> Manutenção e Sistema
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button 
                  onClick={handleExportFull} 
                  disabled={exportingFull}
                  className="p-4 rounded-xl border border-navy-600 bg-navy-800/30 hover:bg-navy-700/50 transition-colors flex flex-col gap-2 items-start text-left"
                >
                  <div className="flex items-center gap-2 text-slate-200 font-medium">
                    {exportingFull ? <Loader2 className="w-4 h-4 animate-spin text-accent" /> : <Database className="w-4 h-4 text-accent" />}
                    Gerar Backup Completo
                  </div>
                  <p className="text-xs text-slate-400">Gera um .zip único com histórico de visitas, usuários e imagens.</p>
                </button>

                <label className="p-4 rounded-xl border border-navy-600 bg-navy-800/30 hover:bg-navy-700/50 transition-colors flex flex-col gap-2 items-start text-left cursor-pointer group">
                  <div className="flex items-center gap-2 text-slate-200 font-medium">
                    {restoringBackup ? <Loader2 className="w-4 h-4 animate-spin text-accent" /> : <Upload className="w-4 h-4 text-accent group-hover:-translate-y-0.5 transition-transform" />}
                    Restaurar Backup
                  </div>
                  <p className="text-xs text-slate-400">Importe um arquivo .zip ou .json para restaurar.</p>
                  <input type="file" accept=".zip,.json" className="hidden" onChange={handleRestoreBackup} />
                </label>

                <button 
                  onClick={() => setShowUpdateModal(true)}
                  className="p-4 rounded-xl border border-navy-600 bg-navy-800/30 hover:bg-navy-700/50 transition-colors flex flex-col gap-2 items-start text-left"
                >
                  <div className="flex items-center gap-2 text-slate-200 font-medium">
                    <RefreshCw className="w-4 h-4 text-accent" />
                    Atualizar Sistema
                  </div>
                  <p className="text-xs text-slate-400">Ver como atualizar a plataforma via servidor.</p>
                </button>
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

      {/* Modal de Atualização */}
      {showUpdateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-navy-900 rounded-xl max-w-md w-full p-6 border border-navy-700 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-100 mb-2 flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-accent" /> 
              Atualização do Sistema
            </h3>
            <p className="text-sm text-slate-400 mb-4">
              Para garantir a segurança dos dados, a atualização completa do sistema deve ser disparada diretamente pelo terminal do servidor que o hospeda.
            </p>
            <div className="bg-black/50 p-4 rounded-lg font-mono text-xs text-slate-300 mb-6 border border-navy-800 select-all overflow-x-auto whitespace-pre">
              {`cd /usr/local/heimdall && \\\ngit pull && \\\n./install.sh`}
            </div>
            <div className="flex justify-end">
              <button onClick={() => setShowUpdateModal(false)} className="btn-primary min-w-[100px]">
                Entendi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
