'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ChevronLeft, Download, Send, DoorOpen, User, Package, FileText,
  CheckCircle2, XCircle, Clock, Loader2, Copy, ExternalLink,
  Shield, Calendar, Phone, Mail, Building2, Hash, Flag, UserCheck,
} from 'lucide-react';
import { api } from '@/lib/api';
import { Visit } from '@/lib/types';
import { getStatusLabel, getStatusClass, getStatusDot, formatDate, categoryLabels } from '@/lib/utils';
import toast from 'react-hot-toast';

import { useAuthStore } from '@/lib/auth-store';

export default function VisitDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuthStore();
  const [visit, setVisit] = useState<Visit | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState('');

  const [showExitModal, setShowExitModal] = useState(false);
  const [materialChanges, setMaterialChanges] = useState('');

  const loadVisit = useCallback(async () => {
    try {
      const res = await api.get(`/visits/${id}`);
      setVisit(res.data);
    } catch {
      toast.error('Visita não encontrada');
      router.back();
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => { loadVisit(); }, [loadVisit]);

  const handleExitSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading('exit');
    try {
      await api.post(`/visits/${id}/request-exit`, { materialChanges });
      toast.success('Solicitação de saída enviada!');

      setShowExitModal(false);
      setMaterialChanges('');
      loadVisit();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erro ao registrar saída');
    } finally {
      setActionLoading('');
    }
  };

  const handleFinalExit = async () => {
    setActionLoading('exit-final');
    try {
      await api.patch(`/visits/${id}/exit`);
      toast.success('Saída registrada com sucesso!');
      loadVisit();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erro ao registrar saída final');
    } finally {
      setActionLoading('');
    }
  };

  const handleDownloadPdf = async () => {
    setActionLoading('pdf');
    try {
      const res = await api.get(`/reports/visits/${id}/pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `visita-${id.slice(0, 8)}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch {
      toast.error('Erro ao gerar PDF');
    } finally {
      setActionLoading('');
    }
  };

  const copySignLink = () => {
    if (!visit?.signToken) return;
    const url = `${window.location.origin}/sign/${visit.signToken}`;
    navigator.clipboard.writeText(url);
    toast.success('Link de assinatura copiado!');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-accent animate-spin" />
      </div>
    );
  }

  if (!visit) return null;

  const signUrl = visit.signToken ? `${typeof window !== 'undefined' ? window.location.origin : ''}/sign/${visit.signToken}` : null;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="btn-ghost p-2">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-100">{visit.visitorName}</h1>
            <p className="text-slate-400 text-sm">{visit.visitorDoc} {visit.visitorCompany ? `· ${visit.visitorCompany}` : ''}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className={getStatusClass(visit.status)}>
            <span className={`w-2 h-2 rounded-full ${getStatusDot(visit.status)}`} />
            {getStatusLabel(visit.status)}
          </span>
        </div>
      </div>

      {/* Ações */}
      <div className="flex flex-wrap gap-3">
        {visit.status === 'UNDER_REVIEW' && signUrl && user?.role !== 'GUARD' && (
          <>
            <button onClick={copySignLink} className="btn-secondary">
              <Copy className="w-4 h-4" /> Copiar link de assinatura
            </button>
            <a href={signUrl} target="_blank" rel="noopener noreferrer" className="btn-secondary">
              <ExternalLink className="w-4 h-4" /> Abrir link
            </a>
          </>
        )}
        {visit.status === 'IN_PREMISES' && (
          <button onClick={() => setShowExitModal(true)} disabled={!!actionLoading} className="btn-success">
            {actionLoading === 'exit'
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <DoorOpen className="w-4 h-4" />}
            Solicitar autorização de saída
          </button>
        )}
        {visit.status === 'APPROVED' && (
          <button onClick={handleFinalExit} disabled={!!actionLoading} className="btn-primary">
            {actionLoading === 'exit-final'
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <CheckCircle2 className="w-4 h-4" />}
            Registrar saída
          </button>
        )}
        {['APPROVED', 'REJECTED', 'COMPLETED', 'IN_PREMISES', 'UNDER_REVIEW'].includes(visit.status) && (
          <button onClick={handleDownloadPdf} disabled={!!actionLoading} className="btn-secondary">
            {actionLoading === 'pdf'
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Download className="w-4 h-4" />}
            Baixar PDF
          </button>
        )}
      </div>

      {/* Banner de status */}
      {visit.status === 'IN_PREMISES' && (
        <div className="card border-blue-500/30 bg-blue-500/5 p-4 flex items-center gap-3">
          <UserCheck className="w-6 h-6 text-blue-400 flex-shrink-0" />
          <div>
            <p className="font-semibold text-blue-400">Dentro do Estabelecimento</p>
            <p className="text-sm text-slate-400">O visitante está nas dependências. Solicite autorização ao responsável quando ele for sair.</p>
          </div>
        </div>
      )}

      {visit.status === 'APPROVED' && (
        <div className="card border-success/30 bg-success/5 p-4 flex items-center gap-3">
          <CheckCircle2 className="w-6 h-6 text-success flex-shrink-0" />
          <div>
            <p className="font-semibold text-success">Saída Autorizada</p>
            <p className="text-sm text-slate-400">O responsável autorizou a saída. Registre a saída física no botão acima.</p>
          </div>
        </div>
      )}

      {visit.status === 'REJECTED' && (
        <div className="card border-danger/30 bg-danger/5 p-4 flex items-center gap-3">
          <XCircle className="w-6 h-6 text-danger flex-shrink-0" />
          <div>
            <p className="font-semibold text-danger">Visita rejeitada</p>
            <p className="text-sm text-slate-400">
              Motivo: {visit.signature?.reason || 'Não informado'}
            </p>
          </div>
        </div>
      )}

      {visit.status === 'UNDER_REVIEW' && (
        <div className="card border-purple-500/30 bg-purple-500/5 p-4 flex items-center gap-3">
          <Clock className="w-6 h-6 text-purple-400 animate-pulse flex-shrink-0" />
          <div>
            <p className="font-semibold text-purple-400">Aguardando autorização de saída</p>
            <p className="text-sm text-slate-400">Notificação enviada para {visit.responsibleName}. Aguarde a resposta.</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Dados da visita */}
        <div className="card p-6 space-y-4">
          <h2 className="font-semibold text-slate-100 flex items-center gap-2">
            <User className="w-4 h-4 text-accent" /> Dados da Visita
          </h2>
          <InfoRow icon={<User />} label="Visitante" value={visit.visitorName} />
          <InfoRow icon={<FileText />} label="Documento" value={visit.visitorDoc} />
          {visit.visitorCompany && <InfoRow icon={<Building2 />} label="Empresa" value={visit.visitorCompany} />}
          {visit.visitorPhone && <InfoRow icon={<Phone />} label="Telefone" value={visit.visitorPhone} />}
          <InfoRow icon={<Mail />} label="Destino" value={visit.destination} />
          <InfoRow icon={<FileText />} label="Motivo" value={visit.purpose} />
          <InfoRow icon={<Calendar />} label="Entrada" value={formatDate(visit.entryAt)} />
          <InfoRow icon={<Calendar />} label="Saída" value={formatDate(visit.exitAt)} />
        </div>

        {/* Responsável + assinatura */}
        <div className="space-y-4">
          <div className="card p-6 space-y-4">
            <h2 className="font-semibold text-slate-100 flex items-center gap-2">
              <Shield className="w-4 h-4 text-accent" /> Responsável
            </h2>
            <InfoRow icon={<User />} label="Nome" value={visit.responsibleName} />
            {visit.responsibleEmail && <InfoRow icon={<Mail />} label="E-mail" value={visit.responsibleEmail} />}
            {visit.responsiblePhone && <InfoRow icon={<Phone />} label="Telefone" value={visit.responsiblePhone} />}
            {visit.responsibleWhatsapp && <InfoRow icon={<Phone />} label="WhatsApp" value={visit.responsibleWhatsapp} />}
          </div>

          {visit.signature && (
            <div className="card p-6 space-y-4">
              <h2 className="font-semibold text-slate-100 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-accent" /> Assinatura Digital
              </h2>
              <InfoRow icon={<User />} label="Signatário" value={visit.signature.signerName} />
              <InfoRow icon={<Calendar />} label="Assinado em" value={formatDate(visit.signature.signedAt)} />
              <InfoRow icon={<Hash />} label="IP" value={visit.signature.signerIp} />
              <div>
                <p className="text-xs text-slate-500 mb-1">Hash SHA-256</p>
                <p className="text-xs font-mono text-slate-400 break-all bg-navy-800 p-2 rounded-lg">
                  {visit.signature.signatureHash}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Materiais */}
      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-navy-600">
          <h2 className="font-semibold text-slate-100 flex items-center gap-2">
            <Package className="w-4 h-4 text-accent" />
            Materiais ({visit.materials?.length || 0})
          </h2>
        </div>
        {visit.materials?.length === 0 ? (
          <p className="text-slate-500 text-center py-8">Nenhum material registrado</p>
        ) : (
          <div className="divide-y divide-navy-600">
            {visit.materials?.map((mat) => (
              <div key={mat.id} className="p-5 hover:bg-navy-700/30 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="font-medium text-slate-100">{mat.name}</p>
                    <div className="flex flex-wrap gap-2 text-xs text-slate-400">
                      <span>{categoryLabels[mat.category] || mat.category}</span>
                      <span>·</span>
                      <span>Qtd: {mat.quantity}</span>
                      {mat.serialNumber && <><span>·</span><span>Série: {mat.serialNumber}</span></>}
                      {mat.brand && <><span>·</span><span>{mat.brand}</span></>}
                    </div>
                    {mat.description && <p className="text-xs text-slate-500">{mat.description}</p>}
                  </div>
                </div>

                {mat.photos?.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {mat.photos.map((photo) => (
                      <PhotoThumb key={photo.id} photoId={photo.id} />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de Saída */}
      {showExitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="card w-full max-w-md p-6 animate-slide-up">
            <h2 className="text-lg font-bold text-slate-100 mb-2 flex items-center gap-2">
              <DoorOpen className="w-5 h-5 text-accent" />
              Registrar Saída
            </h2>
            <p className="text-sm text-slate-400 mb-6">
              Visitante: <strong>{visit.visitorName}</strong>
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
                  onClick={() => { setShowExitModal(false); setMaterialChanges(''); }} 
                  className="btn-secondary flex-1"
                >
                  Cancelar
                </button>
                <button type="submit" disabled={actionLoading === 'exit'} className="btn-primary flex-1">
                  {actionLoading === 'exit' ? (
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

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-lg bg-navy-800 flex items-center justify-center text-slate-500 flex-shrink-0">
        {icon}
      </div>
      <div>
        <p className="text-xs text-slate-500">{label}</p>
        <p className="text-sm text-slate-200">{value}</p>
      </div>
    </div>
  );
}

function PhotoThumb({ photoId }: { photoId: string }) {
  const url = `${api.defaults.baseURL}/public/sign/photos/${photoId}/file`;

  return (
    <div className="flex flex-col items-center gap-2">
      <img src={url} alt="material" className="w-20 h-20 object-cover rounded-lg border border-navy-500" />
      <a 
        href={url} 
        target="_blank" 
        rel="noopener noreferrer" 
        className="text-xs text-accent hover:text-white flex items-center gap-1 bg-accent/10 hover:bg-accent px-2 py-1 rounded-md transition-colors"
      >
        <ExternalLink className="w-3 h-3" />
        Visualizar
      </a>
    </div>
  );
}
