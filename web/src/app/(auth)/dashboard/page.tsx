'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  PlusCircle, RefreshCw, ClipboardList, Clock, CheckCircle2,
  XCircle, Flag, Archive, Eye, Send, DoorOpen, Loader2, UserCheck,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { Visit, DailyStats } from '@/lib/types';
import { getStatusLabel, getStatusClass, getStatusDot, formatDateShort } from '@/lib/utils';
import toast from 'react-hot-toast';
import { io } from 'socket.io-client';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || (typeof window !== 'undefined' ? (window.location.protocol === 'https:' ? 'wss://' : 'ws://') + window.location.host : 'ws://api:4000');

export default function DashboardPage() {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [stats, setStats] = useState<DailyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [exitModalVisit, setExitModalVisit] = useState<Visit | null>(null);
  const [materialChanges, setMaterialChanges] = useState('');
  
  const { user } = useAuthStore();
  const router = useRouter();

  const loadData = useCallback(async () => {
    try {
      const [visitsRes, statsRes] = await Promise.all([
        api.get('/visits', { params: { query: searchTerm } }),
        api.get('/visits/stats/today'),
      ]);
      setVisits(visitsRes.data);
      setStats(statsRes.data);
    } catch {
      toast.error('Erro ao carregar visitas');
    } finally {
      setLoading(false);
    }
  }, [searchTerm]);

  // WebSocket para atualizações em tempo real
  useEffect(() => {
    loadData();

    if (!user?.tenantId) return;
    const socket = io(WS_URL, { path: '/socket.io', transports: ['websocket'] });

    socket.on('connect', () => {
      socket.emit('join-tenant', user.tenantId);
    });

    socket.on('visit-updated', () => { loadData(); });

    socket.on('visit-approved', ({ visitorName }: any) => {
      toast.success(`✅ ${visitorName} — Visita APROVADA!`, { duration: 6000 });
      loadData();
    });

    socket.on('visit-rejected', ({ visitorName, reason }: any) => {
      toast.error(`❌ ${visitorName} — Visita REJEITADA${reason ? ': ' + reason : ''}`, { duration: 6000 });
      loadData();
    });

    return () => { socket.disconnect(); };
  }, [user?.tenantId, loadData]);

  const handleSubmit = async (visitId: string) => {
    setActionLoading(visitId);
    try {
      await api.post(`/visits/${visitId}/submit`);
      toast.success('Notificação enviada ao responsável!');
      loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erro ao enviar para análise');
    } finally {
      setActionLoading(null);
    }
  };

  const handleExitSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!exitModalVisit) return;
    
    setActionLoading(exitModalVisit.id);
    try {
      await api.post(`/visits/${exitModalVisit.id}/request-exit`, { materialChanges });
      toast.success('Solicitação de saída enviada ao responsável!');

      setExitModalVisit(null);
      setMaterialChanges('');
      loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erro ao solicitar autorização');
    } finally {
      setActionLoading(null);
    }
  };

  const handleFinalExit = async (id: string) => {
    setActionLoading(id);
    try {
      await api.patch(`/visits/${id}/exit`);
      toast.success('Saída registrada com sucesso!');
      loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erro ao registrar saída final');
    } finally {
      setActionLoading(null);
    }
  };

  const statCards = stats ? [
    { label: 'Total', value: stats.total, icon: ClipboardList, color: 'text-slate-400', bg: 'bg-slate-500/10' },
    { label: 'Aguardando', value: stats.pending, icon: Clock, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
    { label: 'Nas Dependências', value: stats.inPremises, icon: UserCheck, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { label: 'Em Análise', value: stats.underReview, icon: Flag, color: 'text-purple-400', bg: 'bg-purple-500/10' },
    { label: 'Saída Autorizada', value: stats.approved, icon: CheckCircle2, color: 'text-green-400', bg: 'bg-green-500/10' },
    { label: 'Rejeitados', value: stats.rejected, icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10' },
    { label: 'Concluídos', value: stats.completed, icon: Archive, color: 'text-gray-400', bg: 'bg-gray-500/10' },
  ] : [];

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Dashboard da Portaria</h1>
          <p className="text-slate-400 text-sm mt-1">
            {new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }).format(new Date())}
          </p>
        </div>
        <div className="flex gap-3">
          <button onClick={loadData} className="btn-secondary gap-2">
            <RefreshCw className="w-4 h-4" /> Atualizar
          </button>
          {['GUARD', 'ADMIN', 'SUPER_ADMIN'].includes(user?.role || '') && (
            <Link href="/visits/new" className="btn-primary">
              <PlusCircle className="w-4 h-4" /> Nova Visita
            </Link>
          )}
        </div>
      </div>

      {/* Cards de estatísticas */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {statCards.map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.label} className="card p-4">
                <div className={`w-10 h-10 rounded-xl ${card.bg} flex items-center justify-center mb-3`}>
                  <Icon className={`w-5 h-5 ${card.color}`} />
                </div>
                <p className="text-2xl font-bold text-slate-100">{card.value}</p>
                <p className="text-xs text-slate-500 mt-0.5">{card.label}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Grid Principal: Tabela de Visitas */}
      <div className="space-y-4">
        <div className="card overflow-hidden">
          <div className="px-6 py-4 border-b border-navy-600 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h2 className="font-semibold text-slate-100 flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-accent" />
              Visitas de Hoje
            </h2>
            
            <div className="relative flex-1 max-w-sm">
              <input 
                type="text"
                placeholder="Buscar por nome ou documento..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input pl-10 h-10 text-sm"
              />
              <Eye className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            </div>
            
            <span className="text-xs text-slate-500 whitespace-nowrap">{visits.length} registro{visits.length !== 1 ? 's' : ''}</span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 text-accent animate-spin" />
            </div>
          ) : visits.length === 0 ? (
            <div className="text-center py-16">
              <ClipboardList className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400">Nenhuma visita encontrada</p>
              {searchTerm && (
                <button onClick={() => setSearchTerm('')} className="btn-ghost text-xs mt-2 text-accent">Limpar busca</button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-navy-800">
                  <tr>
                    <th className="table-header text-left">Visitante</th>
                    <th className="table-header text-left">Destino</th>
                    <th className="table-header text-left">Materiais</th>
                    <th className="table-header text-left">Status</th>
                    <th className="table-header text-left">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {visits.map((visit) => (
                    <tr key={visit.id} className="table-row">
                      <td className="table-cell">
                        <div>
                          <p className="font-medium text-slate-100">{visit.visitorName}</p>
                          <p className="text-[10px] text-slate-500 uppercase">{visit.visitorType || 'VISITANTE'} • {visit.visitorDoc}</p>
                        </div>
                      </td>
                      <td className="table-cell text-slate-300 text-sm">{visit.destination}</td>
                      <td className="table-cell">
                        <span className="text-slate-300 text-sm">
                          {visit.isMaterialExitOnly ? (
                            <span className="text-warning font-semibold">SAÍDA APENAS</span>
                          ) : (
                            `${visit.materials?.length || 0} item${(visit.materials?.length || 0) !== 1 ? 's' : ''}`
                          )}
                        </span>
                      </td>
                      <td className="table-cell">
                        <span className={getStatusClass(visit.status)}>
                          <span className={`w-1.5 h-1.5 rounded-full ${getStatusDot(visit.status)}`} />
                          {getStatusLabel(visit.status)}
                        </span>
                      </td>
                      <td className="table-cell">
                        <div className="flex items-center gap-2">
                          <Link href={`/visits/${visit.id}`} className="btn-ghost p-2" title="Ver detalhes">
                            <Eye className="w-4 h-4" />
                          </Link>
                          {visit.status === 'PENDING' && (
                            <button
                              onClick={() => handleSubmit(visit.id)}
                              disabled={actionLoading === visit.id}
                              className="btn-secondary px-3 py-1.5 text-xs"
                            >
                              {actionLoading === visit.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                            </button>
                          )}
                          {visit.status === 'IN_PREMISES' && (
                            <button
                              onClick={() => setExitModalVisit(visit)}
                              disabled={actionLoading === visit.id}
                              className="btn-success px-3 py-1.5 text-xs"
                              title="Solicitar Autorização de Saída"
                            >
                              {actionLoading === visit.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <DoorOpen className="w-3 h-3" />}
                            </button>
                          )}
                          {visit.status === 'APPROVED' && (
                            <button
                              onClick={() => handleFinalExit(visit.id)}
                              disabled={actionLoading === visit.id}
                              className="btn-primary px-3 py-1.5 text-xs"
                              title="Registrar Saída (Finalizar)"
                            >
                              {actionLoading === visit.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      {/* Modal de Saída */}
      {exitModalVisit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="card w-full max-w-md p-6 animate-slide-up">
            <h2 className="text-lg font-bold text-slate-100 mb-2 flex items-center gap-2">
              <DoorOpen className="w-5 h-5 text-accent" />
              Registrar Saída
            </h2>
            <p className="text-sm text-slate-400 mb-6">
              Visitante: <strong>{exitModalVisit.visitorName}</strong>
            </p>

            <form onSubmit={handleExitSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="input-label flex items-center gap-1">
                  <Flag className="w-3 h-3" /> Observações da Portaria (opcional)
                </label>
                <textarea 
                  value={materialChanges}
                  onChange={(e) => setMaterialChanges(e.target.value)}
                  className="input resize-none" 
                  rows={3} 
                  placeholder="Ex: Visitante deixou o notebook na manutenção..."
                />
                <p className="text-xs text-slate-500 mt-1">
                  A saída será enviada para autorização do gestor responsável.
                </p>
              </div>

              <div className="flex gap-3 pt-4 border-t border-navy-600 mt-6">
                <button 
                  type="button" 
                  onClick={() => { setExitModalVisit(null); setMaterialChanges(''); }} 
                  className="btn-secondary flex-1"
                >
                  Cancelar
                </button>
                <button type="submit" disabled={actionLoading === exitModalVisit.id} className="btn-primary flex-1">
                  {actionLoading === exitModalVisit.id ? (
                    <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                  ) : (
                    'Solicitar Autorização'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
