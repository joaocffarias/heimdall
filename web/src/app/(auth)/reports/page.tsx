'use client';

import { useState, useCallback } from 'react';
import { 
  FileText, Search, Download, Calendar, 
  UserCheck, Shield, Clock, Loader2 
} from 'lucide-react';
import { api } from '@/lib/api';
import { Visit } from '@/lib/types';
import { getStatusLabel, getStatusClass, getStatusDot, formatDateShort } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function ReportsPage() {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  
  // Filtros
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  const loadReport = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/visits', { 
        params: { startDate, endDate } 
      });
      setVisits(res.data);
    } catch {
      toast.error('Erro ao gerar relatório');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  const downloadPdf = async () => {
    setDownloading(true);
    try {
      const response = await api.get('/reports/period/pdf', {
        params: { startDate, endDate },
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `relatorio-${startDate}-ate-${endDate}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      toast.error('Erro ao baixar PDF');
    } finally {
      setDownloading(false);
    }
  };

  // Estatísticas do período
  const stats = {
    total: visits.length,
    militares: visits.filter(v => v.visitorType === 'MILITAR').length,
    servidores: visits.filter(v => v.visitorType === 'SERVIDOR_CIVIL').length,
    visitantes: visits.filter(v => v.visitorType === 'VISITANTE').length,
    concluidos: visits.filter(v => v.status === 'COMPLETED').length,
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <FileText className="w-6 h-6 text-accent" />
            Relatórios de Acesso
          </h1>
          <p className="text-slate-400 text-sm mt-1">Consulte o histórico de visitas e exporte documentos.</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="card p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div className="space-y-2">
            <label className="input-label">Data Inicial</label>
            <div className="relative">
              <input 
                type="date" 
                value={startDate} 
                onChange={(e) => setStartDate(e.target.value)}
                className="input pl-10" 
              />
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            </div>
          </div>
          <div className="space-y-2">
            <label className="input-label">Data Final</label>
            <div className="relative">
              <input 
                type="date" 
                value={endDate} 
                onChange={(e) => setEndDate(e.target.value)}
                className="input pl-10" 
              />
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            </div>
          </div>
          <button onClick={loadReport} disabled={loading} className="btn-primary gap-2 h-11">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Gerar Relatório
          </button>
          <button onClick={downloadPdf} disabled={downloading || visits.length === 0} className="btn-secondary gap-2 h-11">
            {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Exportar PDF
          </button>
        </div>
      </div>

      {visits.length > 0 && (
        <>
          {/* Cards de Resumo */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="card p-4 bg-navy-800/50">
              <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Total</p>
              <p className="text-2xl font-bold text-slate-100">{stats.total}</p>
            </div>
            <div className="card p-4 bg-navy-800/50 border-l-4 border-l-accent">
              <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Militares</p>
              <p className="text-2xl font-bold text-slate-100">{stats.militares}</p>
            </div>
            <div className="card p-4 bg-navy-800/50 border-l-4 border-l-blue-500">
              <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Servidores</p>
              <p className="text-2xl font-bold text-slate-100">{stats.servidores}</p>
            </div>
            <div className="card p-4 bg-navy-800/50 border-l-4 border-l-slate-500">
              <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Visitantes</p>
              <p className="text-2xl font-bold text-slate-100">{stats.visitantes}</p>
            </div>
            <div className="card p-4 bg-navy-800/50 border-l-4 border-l-green-500">
              <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Concluídos</p>
              <p className="text-2xl font-bold text-slate-100">{stats.concluidos}</p>
            </div>
          </div>

          {/* Tabela de Resultados */}
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-navy-800">
                  <tr>
                    <th className="table-header text-left">Entrada / Saída</th>
                    <th className="table-header text-left">Visitante</th>
                    <th className="table-header text-left">Destino</th>
                    <th className="table-header text-left">Vínculo</th>
                    <th className="table-header text-left">Entrada por</th>
                    <th className="table-header text-left">Autorizado por</th>
                    <th className="table-header text-left">Itens / Qtd</th>
                    <th className="table-header text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {visits.map((visit: any) => (
                    <tr key={visit.id} className="table-row">
                      <td className="table-cell">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[10px] font-bold text-green-400 uppercase tracking-wide">↓ Entrada</span>
                          <span className="text-slate-300 text-xs">
                            {visit.entryAt ? formatDateShort(visit.entryAt) : formatDateShort(visit.createdAt)}
                          </span>
                          <span className="text-[10px] font-bold text-red-400 uppercase tracking-wide mt-1">↑ Saída</span>
                          <span className="text-slate-400 text-xs">
                            {visit.exitAt ? formatDateShort(visit.exitAt) : '—'}
                          </span>
                        </div>
                      </td>
                      <td className="table-cell font-medium text-slate-100">
                        {visit.visitorName}
                      </td>
                      <td className="table-cell text-slate-300">
                        {visit.destination}
                      </td>
                      <td className="table-cell">
                        <span className="text-[10px] bg-navy-600 px-2 py-0.5 rounded text-slate-300 uppercase font-bold">
                          {visit.visitorType || 'VISITANTE'}
                        </span>
                      </td>
                      <td className="table-cell text-slate-400">
                        {visit.createdBy?.name || '—'}
                      </td>
                      <td className="table-cell text-slate-400">
                        {visit.signature?.signerName || (visit.isMaterialExitOnly ? 'Aguardando' : 'N/A')}
                      </td>
                      <td className="table-cell">
                        {visit.materials && visit.materials.length > 0 ? (
                          <div className="flex flex-col gap-0.5">
                            {visit.materials.map((m: any, i: number) => (
                              <span key={i} className="text-xs text-slate-300">
                                {m.name}{' '}
                                <span className="text-[10px] bg-navy-600 px-1.5 py-0.5 rounded text-accent font-bold">
                                  ×{m.quantity}
                                </span>
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>
                      <td className="table-cell">
                        <span className={getStatusClass(visit.status)}>
                          <span className={`w-1.5 h-1.5 rounded-full ${getStatusDot(visit.status)}`} />
                          {getStatusLabel(visit.status)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {!loading && visits.length === 0 && (
        <div className="card p-12 text-center">
          <FileText className="w-12 h-12 text-slate-700 mx-auto mb-4" />
          <p className="text-slate-400">Selecione um período para visualizar os registros.</p>
        </div>
      )}
    </div>
  );
}
