'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import SignatureCanvas from 'react-signature-canvas';
import {
  Shield, User, Package, CheckCircle2, XCircle, Loader2,
  RotateCcw, FileText, Calendar, MapPin, AlertTriangle, Pen,
} from 'lucide-react';
import { api } from '@/lib/api';
import { formatDate, categoryLabels } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function SignPage() {
  const { token } = useParams<{ token: string }>();
  const [visit, setVisit] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);
  const [done, setDone] = useState<'approved' | 'rejected' | null>(null);
  const [signerName, setSignerName] = useState('');
  const [signerEmail, setSignerEmail] = useState('');
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const sigPad = useRef<SignatureCanvas>(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || (typeof window !== 'undefined' ? window.location.origin + '/api' : 'http://api:4000');

  useEffect(() => {
    fetch(`${API_URL}/public/sign/${token}`)
      .then((r) => {
        if (!r.ok) throw new Error('Token inválido');
        return r.json();
      })
      .then((data) => {
        setVisit(data);
        setSignerName(data.responsibleName || '');
        setSignerEmail(data.responsibleEmail || '');
      })
      .catch(() => toast.error('Link inválido ou expirado'))
      .finally(() => setLoading(false));
  }, [token, API_URL]);

  const clearSignature = () => sigPad.current?.clear();

  const handleSign = async (approved: boolean) => {
    if (!signerName.trim()) { toast.error('Informe seu nome'); return; }
    if (sigPad.current?.isEmpty()) { toast.error('Assine o campo antes de confirmar'); return; }
    if (!approved && !reason.trim()) { toast.error('Informe o motivo da rejeição'); return; }

    setSigning(true);
    try {
      const signatureImage = sigPad.current?.toDataURL('image/png') || '';
      const signatureData = sigPad.current?.toData() || [];

      const res = await fetch(`${API_URL}/public/sign/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signerName,
          signerEmail,
          signatureImage,
          signatureData,
          approved,
          reason: approved ? undefined : reason,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Erro ao processar assinatura');

      setDone(approved ? 'approved' : 'rejected');
      toast.success(approved ? 'Visita aprovada com sucesso!' : 'Visita rejeitada.');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao processar assinatura');
    } finally {
      setSigning(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-dark flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-accent animate-spin" />
      </div>
    );
  }

  if (!visit) {
    return (
      <div className="min-h-screen bg-gradient-dark flex items-center justify-center p-4">
        <div className="card max-w-md w-full p-8 text-center">
          <AlertTriangle className="w-16 h-16 text-warning mx-auto mb-4" />
          <h1 className="text-xl font-bold text-slate-100 mb-2">Link inválido</h1>
          <p className="text-slate-400">Este link de assinatura é inválido ou já expirou.</p>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen bg-gradient-dark flex items-center justify-center p-4">
        <div className="card max-w-md w-full p-8 text-center animate-slide-up">
          {done === 'approved' ? (
            <>
              <div className="w-20 h-20 rounded-full bg-success/10 border-2 border-success flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-10 h-10 text-success" />
              </div>
              <h1 className="text-2xl font-bold text-slate-100 mb-2">Saída Autorizada!</h1>
              <p className="text-slate-400 mb-6">
                Você autorizou a saída de <strong className="text-slate-200">{visit.visitorName}</strong>.
                A portaria foi notificada.
              </p>
            </>
          ) : (
            <>
              <div className="w-20 h-20 rounded-full bg-danger/10 border-2 border-danger flex items-center justify-center mx-auto mb-6">
                <XCircle className="w-10 h-10 text-danger" />
              </div>
              <h1 className="text-2xl font-bold text-slate-100 mb-2">Saída Bloqueada</h1>
              <p className="text-slate-400 mb-6">
                A saída de <strong className="text-slate-200">{visit.visitorName}</strong> foi bloqueada.
                A portaria foi notificada.
              </p>
            </>
          )}
          <div className="bg-navy-800 rounded-xl p-4 text-xs text-slate-500 mb-6">
            <Shield className="w-4 h-4 inline mr-1 text-accent" />
            Assinatura registrada com hash SHA-256 pelo sistema Heimdall.
          </div>
          <button onClick={() => window.location.href = '/'} className="btn-secondary w-full">
            Ir para a Página Inicial
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-dark py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-accent/10 border border-accent/30 mb-4 shadow-glow">
            <Shield className="w-8 h-8 text-accent" />
          </div>
          <h1 className="text-2xl font-bold text-slate-100">Autorização de Saída</h1>
          <p className="text-slate-400 mt-1">{visit.tenant?.name}</p>
        </div>

        {/* Dados da visita */}
        <div className="card p-6 space-y-4">
          <h2 className="font-semibold text-slate-100 flex items-center gap-2">
            <User className="w-4 h-4 text-accent" /> Dados do Visitante
          </h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-slate-500">Nome</p>
              <p className="text-slate-100 font-medium">{visit.visitorName}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Documento</p>
              <p className="text-slate-100">{visit.visitorDoc}</p>
            </div>
            {visit.visitorCompany && (
              <div>
                <p className="text-xs text-slate-500">Empresa</p>
                <p className="text-slate-100">{visit.visitorCompany}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-slate-500 flex items-center gap-1"><MapPin className="w-3 h-3" /> Destino</p>
              <p className="text-slate-100">{visit.destination}</p>
            </div>
            <div className="col-span-2">
              <p className="text-xs text-slate-500">Motivo</p>
              <p className="text-slate-100">{visit.purpose}</p>
            </div>
          </div>
        </div>

        {/* Materiais */}
        {visit.materials?.length > 0 && (
          <div className="card p-6">
            <h2 className="font-semibold text-slate-100 flex items-center gap-2 mb-4">
              <Package className="w-4 h-4 text-accent" />
              Materiais ({visit.materials.length})
            </h2>
            <div className="space-y-2">
              {visit.materials.map((mat: any) => (
                <div key={mat.id} className="flex items-start justify-between py-2 border-b border-navy-600 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-slate-100">{mat.name}</p>
                    <p className="text-xs text-slate-500">
                      {categoryLabels[mat.category]} · Qtd: {mat.quantity}
                      {mat.serialNumber ? ` · Série: ${mat.serialNumber}` : ''}
                    </p>
                  </div>
                  {mat.photos?.length > 0 && (
                    <span className="text-xs text-slate-500">{mat.photos.length} foto{mat.photos.length !== 1 ? 's' : ''}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Alteração de Materiais */}
        {visit.materialChanges && (
          <div className="card p-6 border-warning/30 bg-warning/5">
            <h2 className="font-semibold text-warning flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4" /> Alteração de Materiais na Saída
            </h2>
            <p className="text-sm text-slate-300">
              Houve alteração nos materiais registrados durante a visita. A portaria registrou:
            </p>
            <div className="mt-3 p-3 bg-navy-900 rounded-lg border border-warning/20 text-slate-200 italic">
              "{visit.materialChanges}"
            </div>
          </div>
        )}

        {/* Assinatura */}
        <div className="card p-6 space-y-5">
          <h2 className="font-semibold text-slate-100 flex items-center gap-2">
            <Pen className="w-4 h-4 text-accent" /> Sua Assinatura
          </h2>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="input-label">Seu nome completo *</label>
              <input
                value={signerName}
                onChange={(e) => setSignerName(e.target.value)}
                className="input"
                placeholder="Nome do responsável"
              />
            </div>
            <div className="col-span-2">
              <label className="input-label">Seu e-mail</label>
              <input
                value={signerEmail}
                onChange={(e) => setSignerEmail(e.target.value)}
                className="input"
                type="email"
                placeholder="seu@email.com"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="input-label mb-0">Assine aqui *</label>
              <button onClick={clearSignature} className="btn-ghost text-xs py-1">
                <RotateCcw className="w-3 h-3" /> Limpar
              </button>
            </div>
            <div className="border-2 border-navy-500 rounded-xl overflow-hidden bg-slate-50">
              <SignatureCanvas
                ref={sigPad}
                penColor="#1e293b"
                canvasProps={{
                  width: 560,
                  height: 180,
                  className: 'w-full',
                  style: { background: '#f8fafc', touchAction: 'none' },
                }}
              />
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Use o mouse ou toque na tela para assinar • Assinatura registrada com hash SHA-256
            </p>
          </div>

          {/* Rejeição */}
          {rejecting && (
            <div>
              <label className="input-label">Motivo da rejeição *</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="input resize-none"
                rows={2}
                placeholder="Informe o motivo da rejeição..."
              />
            </div>
          )}

          {/* Botões */}
          <div className="flex gap-3">
            {!rejecting ? (
              <>
                <button
                  onClick={() => handleSign(true)}
                  disabled={signing}
                  className="btn-success flex-1 py-3"
                >
                  {signing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  Aprovar Saída
                </button>
                <button
                  onClick={() => setRejecting(true)}
                  disabled={signing}
                  className="btn-danger py-3 px-4"
                >
                  <XCircle className="w-4 h-4" /> Rejeitar
                </button>
              </>
            ) : (
              <>
                <button onClick={() => setRejecting(false)} className="btn-secondary py-3 px-4">
                  Cancelar
                </button>
                <button
                  onClick={() => handleSign(false)}
                  disabled={signing}
                  className="btn-danger flex-1 py-3"
                >
                  {signing ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                  Confirmar Rejeição
                </button>
              </>
            )}
          </div>

          <p className="text-xs text-slate-500 text-center">
            <Shield className="w-3 h-3 inline mr-1" />
            Ao assinar, você confirma estar ciente dos materiais listados.
            Essa assinatura é registrada com IP, data/hora e hash SHA-256.
          </p>
        </div>
      </div>
    </div>
  );
}
