'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Shield, LayoutDashboard, PlusCircle, Users,
  Building2, LogOut, Bell, ChevronRight, Clock, FileText, Loader2, Settings,
} from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', roles: ['GUARD', 'ADMIN', 'SUPER_ADMIN', 'RESPONSIBLE'] },
  { href: '/visits/new', icon: PlusCircle, label: 'Nova Visita', roles: ['GUARD', 'ADMIN', 'SUPER_ADMIN'] },
  { href: '/visits/review', icon: Clock, label: 'Em Análise', roles: ['GUARD', 'ADMIN', 'SUPER_ADMIN', 'RESPONSIBLE'] },
  { href: '/reports', icon: FileText, label: 'Relatórios', roles: ['ADMIN', 'SUPER_ADMIN', 'RESPONSIBLE'] },
  { href: '/admin/users', icon: Users, label: 'Usuários', roles: ['ADMIN', 'SUPER_ADMIN'] },
  { href: '/admin/tenants', icon: Building2, label: 'OM', roles: ['SUPER_ADMIN'] },
  { href: '/admin/settings', icon: Settings, label: 'Configurações', roles: ['SUPER_ADMIN'] },
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, token, logout } = useAuthStore();
  const [hydrated, setHydrated] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    setHydrated(true);
    if (token) {
      api.get('/tenants/current/logo/url').then(res => setLogoUrl(res.data.url)).catch(() => null);
    }
  }, [token]);

  useEffect(() => {
    if (hydrated && !token) {
      router.push('/login');
    }
  }, [token, router, hydrated]);

  useEffect(() => {
    if (!token || !user) return;

    const timeoutMinutes = user.sessionTimeout || 480;
    const timeoutMs = timeoutMinutes * 60 * 1000;
    
    let inactivityTimer: ReturnType<typeof setTimeout>;

    const resetTimer = () => {
      clearTimeout(inactivityTimer);
      inactivityTimer = setTimeout(() => {
        toast.error('Sessão expirada por inatividade');
        logout();
      }, timeoutMs);
    };

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => document.addEventListener(event, resetTimer));
    
    resetTimer();

    return () => {
      clearTimeout(inactivityTimer);
      events.forEach(event => document.removeEventListener(event, resetTimer));
    };
  }, [token, user, logout]);

  if (!hydrated || !token || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-navy-900 text-accent">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  const visibleNav = navItems.filter((item) => item.roles.includes(user.role));

  const PasswordChangeModal = () => {
    const [newPassword, setNewPassword] = useState('');
    const [saving, setSaving] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setSaving(true);
      try {
        await api.post('/auth/change-password', { password: newPassword });
        toast.success('Senha atualizada com sucesso!');
        useAuthStore.setState({ user: { ...user, forcePasswordChange: false } });
      } catch (err: any) {
        toast.error(err.response?.data?.message || 'Erro ao alterar senha');
      } finally {
        setSaving(false);
      }
    };

    if (!user.forcePasswordChange) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-900/90 backdrop-blur-sm">
        <div className="card p-8 max-w-md w-full mx-4 shadow-glow-lg border-accent/30">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center">
              <Shield className="w-8 h-8 text-accent" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-center text-slate-100 mb-2">Atualização de Senha</h2>
          <p className="text-slate-400 text-center text-sm mb-6">
            Por questões de segurança, é necessário definir uma nova senha para o seu primeiro acesso ou porque sua senha foi redefinida pelo administrador.
          </p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="input-label">Nova Senha</label>
              <input
                type="password"
                className="input w-full"
                placeholder="Mínimo 6 caracteres"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <button type="submit" disabled={saving || newPassword.length < 6} className="btn-primary w-full justify-center">
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Atualizar e Continuar'}
            </button>
          </form>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen flex bg-navy-900">
      <PasswordChangeModal />
      
      {/* ─── Sidebar ─────────────────────────────────────────────── */}
      <aside className="w-64 min-h-screen bg-navy-800 border-r border-navy-600 flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-navy-600">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/30 flex items-center justify-center shadow-glow-sm overflow-hidden">
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" />
              ) : (
                <Shield className="w-5 h-5 text-accent" />
              )}
            </div>
            <div>
              <p className="font-bold text-slate-100 text-lg leading-tight">Heimdall</p>
              <p className="text-xs text-slate-500 truncate max-w-[130px]">{user.tenantName}</p>
            </div>
          </div>
        </div>

        {/* Navegação */}
        <nav className="flex-1 p-4 space-y-1">
          {visibleNav.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link key={item.href} href={item.href} className={`sidebar-link ${active ? 'active' : ''}`}>
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1">{item.label}</span>
                {active && <ChevronRight className="w-3 h-3 text-accent/50" />}
              </Link>
            );
          })}
        </nav>

        {/* Usuário */}
        <div className="p-4 border-t border-navy-600">
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-navy-700 mb-2">
            <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-accent font-bold text-sm">
              {user.name[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-100 truncate">{user.name}</p>
              <p className="text-xs text-slate-500">{user.role}</p>
            </div>
          </div>
          <button
            onClick={() => { logout(); toast.success('Sessão encerrada'); }}
            className="sidebar-link w-full text-danger hover:bg-danger/10"
          >
            <LogOut className="w-4 h-4" />
            <span>Sair</span>
          </button>
        </div>
      </aside>

      {/* ─── Conteúdo Principal ───────────────────────────────────── */}
      <main className="flex-1 overflow-auto">
        <div className="p-6 animate-fade-in">
          {children}
        </div>
      </main>
    </div>
  );
}
