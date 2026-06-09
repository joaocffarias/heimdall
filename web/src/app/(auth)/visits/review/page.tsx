'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { RefreshCw, Clock, Eye, Loader2, Copy, ExternalLink } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { Visit } from '@/lib/types';
import { getStatusLabel, getStatusClass, getStatusDot, formatDateShort } from '@/lib/utils';
import toast from 'react-hot-toast';
import { io } from 'socket.io-client';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || (typeof window !== 'undefined' ? (window.location.protocol === 'https:' ? 'wss://' : 'ws://') + window.location.host : 'ws://api:4000');

export default function ReviewVisitsPage() {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuthStore();

  const loadData = useCallback(async () => {
    try {
      const res = await api.get('/visits?status=UNDER_REVIEW');
      setVisits(res.data);
    } catch {
      toast.error('Erro ao carregar solicitações em análise');
    } finally {
      setLoading(false);
    }
  }, []);

  // WebSocket para atualizações em tempo real
  useEffect(() => {
    loadData();

    if (!user?.tenantId) return;
    const socket = io(WS_URL, { path: '/socket.io', transports: ['websocket'] });

    socket.on('connect', () => {
      socket.emit('join-tenant', user.tenantId);
    });

    socket.on('visit-updated', () => { loadData(); });
    socket.on('visit-approved', () => { loadData(); });
    socket.on('visit-rejected', () => { loadData(); });

    return () => { socket.disconnect(); };
  }, [user?.tenantId, loadData]);

  const copySignLink = (token: string) => {
    const url = `${typeof window !== 'undefined' ? window.location.origin : ''}/sign/${token}`;
    navigator.clipboard.writeText(url);
    toast.success('Link de assinatura copiado!');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <Clock className="w-6 h-6 text-purple-400" />
            Solicitações em Análise
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Visitas aguardando aprovação do responsável
          </p>
        </div>
        <button onClick={loadData} className="btn-secondary gap-2">
          <RefreshCw className="w-4 h-4" /> Atualizar
        </button>
      </div>

      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-navy-600 flex items-center justify-between">
          <h2 className="font-semibold text-slate-100">Registros Pendentes</h2>
          <span className="text-xs text-slate-500">{visits.length} registro{visits.length !== 1 ? 's' : ''}</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 text-accent animate-spin" />
          </div>
        ) : visits.length === 0 ? (
          <div className="text-center py-16">
            <Clock className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400">Nenhuma solicitação aguardando análise no momento</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-navy-800">
                <tr>
                  <th className="table-header text-left">Visitante</th>
                  <th className="table-header text-left">Destino</th>
                  <th className="table-header text-left">Responsável</th>
                  <th className="table-header text-left">Entrada</th>
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
                        <p className="text-xs text-slate-500">{visit.visitorDoc}</p>
                      </div>
                    </td>
                    <td className="table-cell text-slate-300">{visit.destination}</td>
                    <td className="table-cell text-slate-300">{visit.responsibleName}</td>
                    <td className="table-cell text-slate-400 text-xs">{formatDateShort(visit.entryAt)}</td>
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
                        {visit.signToken && user?.role !== 'GUARD' && (
                          <>
                            <button
                              onClick={() => copySignLink(visit.signToken as string)}
                              className="btn-secondary px-2 py-1.5 text-xs"
                              title="Copiar Link"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                            <a
                              href={`/sign/${visit.signToken}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn-secondary px-2 py-1.5 text-xs"
                              title="Abrir Link"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </>
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
  );
}
