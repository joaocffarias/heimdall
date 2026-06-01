'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import Webcam from 'react-webcam';
import {
  User, Building2, Phone, Mail, FileText, MapPin, Plus, Trash2,
  Camera, CameraOff, Upload, Loader2, ChevronLeft, CheckCircle2, Package,
} from 'lucide-react';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

type MaterialForm = {
  name: string;
  category: string;
  quantity: number;
  serialNumber?: string;
  brand?: string;
  description?: string;
  photos?: File[];
};

type VisitForm = {
  visitorName: string;
  visitorDoc: string;
  visitorType: 'VISITANTE' | 'MILITAR' | 'SERVIDOR_CIVIL';
  isMaterialExitOnly: boolean;
  visitorCompany?: string;
  visitorPhone?: string;
  visitorEmail?: string;
  destination: string;
  purpose: string;
  responsibleName: string;
  responsibleEmail?: string;
  responsiblePhone?: string;
  responsibleWhatsapp?: string;
  materials: MaterialForm[];
};

const CATEGORIES = [
  { value: 'ELETRONICO', label: '💻 Eletrônico' },
  { value: 'FERRAMENTA', label: '🔧 Ferramenta' },
  { value: 'DOCUMENTO', label: '📄 Documento' },
  { value: 'EQUIPAMENTO', label: '🖥️ Equipamento' },
  { value: 'VEICULO', label: '🚗 Veículo' },
  { value: 'OUTRO', label: '📦 Outro' },
];

export default function NewVisitPage() {
  const router = useRouter();
  const [step, setStep] = useState(1); // 1: visitante, 2: materiais, 3: responsável
  const [loading, setLoading] = useState(false);
  const [showCamera, setShowCamera] = useState<number | null>(null); // index do material
  const [capturedPhotos, setCapturedPhotos] = useState<Record<number, string[]>>({}); // idx -> base64[]
  const [chiefs, setChiefs] = useState<any[]>([]);
  const webcamRef = useRef<Webcam>(null);

  useEffect(() => {
    api.get('/users').then((res) => {
      setChiefs(res.data.filter((u: any) => u.isChiefOfStaff && u.active));
    }).catch(() => toast.error('Erro ao carregar autoridades'));
  }, []);

  const {
    register, control, handleSubmit, watch, setValue,
    formState: { errors },
  } = useForm<VisitForm>({
    defaultValues: {
      visitorType: 'VISITANTE',
      isMaterialExitOnly: false,
      materials: [{ name: '', category: 'OUTRO', quantity: 1 }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'materials' });

  const capturePhoto = useCallback((materialIndex: number) => {
    const screenshot = webcamRef.current?.getScreenshot();
    if (screenshot) {
      setCapturedPhotos((prev) => ({
        ...prev,
        [materialIndex]: [...(prev[materialIndex] || []), screenshot],
      }));
      toast.success('Foto capturada!');
    }
  }, []);

  const removePhoto = (materialIndex: number, photoIndex: number) => {
    setCapturedPhotos((prev) => ({
      ...prev,
      [materialIndex]: prev[materialIndex].filter((_, i) => i !== photoIndex),
    }));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, materialIndex: number) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      setCapturedPhotos((prev) => ({
        ...prev,
        [materialIndex]: [...(prev[materialIndex] || []), result],
      }));
      toast.success('Foto anexada!');
    };
    reader.readAsDataURL(file);
    e.target.value = ''; // Reset input
  };

  const onSubmit = async (data: VisitForm) => {
    setLoading(true);
    try {
      // 1. Criar a visita
      const visitRes = await api.post('/visits', {
        visitorName: data.visitorName,
        visitorDoc: data.visitorDoc,
        visitorType: data.visitorType,
        isMaterialExitOnly: data.isMaterialExitOnly,
        visitorCompany: data.visitorCompany,
        visitorPhone: data.visitorPhone,
        visitorEmail: data.visitorEmail,
        destination: data.destination,
        purpose: data.purpose,
        responsibleName: data.responsibleName,
        responsibleEmail: data.responsibleEmail,
        responsiblePhone: data.responsiblePhone,
        responsibleWhatsapp: data.responsibleWhatsapp,
      });

      const visitId = visitRes.data.id;

      // 2. Adicionar materiais em batch
      if (data.materials.length > 0) {
        await api.post(`/visits/${visitId}/materials/batch`, {
          materials: data.materials.map((m) => ({
            name: m.name,
            category: m.category,
            quantity: m.quantity,
            serialNumber: m.serialNumber,
            brand: m.brand,
            description: m.description,
          })),
        });
      }

      // 3. Upload de fotos (se houver)
      const materialsRes = await api.get(`/visits/${visitId}/materials`);
      const createdMaterials = materialsRes.data;

      for (let i = 0; i < createdMaterials.length; i++) {
        const photos = capturedPhotos[i] || [];
        for (const photo of photos) {
          const blob = await fetch(photo).then((r) => r.blob());
          const fd = new FormData();
          fd.append('photo', blob, `foto-${Date.now()}.jpg`);
          await api.post(`/visits/${visitId}/materials/${createdMaterials[i].id}/photos`, fd, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
        }
      }

      toast.success('Visita registrada com sucesso!');
      router.push(`/visits/${visitId}`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erro ao registrar visita');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()} className="btn-ghost p-2">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Nova Visita</h1>
          <p className="text-slate-400 text-sm">Registre os dados do visitante e seus materiais</p>
        </div>
      </div>

      {/* Steps */}
      <div className="flex items-center gap-2">
        {[
          { n: 1, label: 'Visitante' },
          { n: 2, label: 'Materiais' },
          { n: 3, label: 'Responsável' },
        ].map((s, idx) => (
          <div key={s.n} className="flex items-center gap-2 flex-1">
            <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-bold transition-all
              ${step > s.n ? 'bg-success border-success text-white' : step === s.n ? 'border-accent text-accent' : 'border-navy-500 text-slate-500'}`}>
              {step > s.n ? <CheckCircle2 className="w-4 h-4" /> : s.n}
            </div>
            <span className={`text-sm font-medium ${step === s.n ? 'text-slate-100' : 'text-slate-500'}`}>{s.label}</span>
            {idx < 2 && <div className="flex-1 h-px bg-navy-600 mx-2" />}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        {/* ─── Step 1: Dados do Visitante ────────────────────────── */}
        {step === 1 && (
          <div className="card p-6 space-y-5 animate-slide-up">
            <h2 className="font-semibold text-slate-100 flex items-center gap-2">
              <User className="w-4 h-4 text-accent" /> Dados do Visitante
            </h2>

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="input-label">Nome completo *</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input {...register('visitorName', { required: 'Nome obrigatório' })}
                    className="input pl-10" placeholder="Nome do visitante" />
                </div>
                {errors.visitorName && <p className="text-danger text-xs mt-1">{errors.visitorName.message}</p>}
              </div>

              <div>
                <label className="input-label">Tipo de Vínculo *</label>
                <select {...register('visitorType', { required: true })} className="input">
                  <option value="VISITANTE">Visitante</option>
                  <option value="MILITAR">Militar</option>
                  <option value="SERVIDOR_CIVIL">Servidor Civil</option>
                </select>
              </div>

              <div>
                <label className="input-label">CPF / NIP / RG *</label>
                <div className="relative">
                  <FileText className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input {...register('visitorDoc', { required: 'Documento obrigatório' })}
                    className="input pl-10" placeholder="Ex: 000.000.000-00 ou NIP" />
                </div>
                {errors.visitorDoc && <p className="text-danger text-xs mt-1">{errors.visitorDoc.message}</p>}
              </div>

              <div>
                <label className="input-label">Empresa</label>
                <div className="relative">
                  <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input {...register('visitorCompany')}
                    className="input pl-10" placeholder="Empresa do visitante" />
                </div>
              </div>

              <div>
                <label className="input-label">Telefone</label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input {...register('visitorPhone')}
                    className="input pl-10" placeholder="(11) 9 9999-9999" />
                </div>
              </div>

              <div>
                <label className="input-label">E-mail</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input {...register('visitorEmail')}
                    className="input pl-10" placeholder="email@empresa.com" type="email" />
                </div>
              </div>

              <div>
                <label className="input-label">Destino / Setor *</label>
                <div className="relative">
                  <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input {...register('destination', { required: 'Destino obrigatório' })}
                    className="input pl-10" placeholder="TI, RH, Sala 201..." />
                </div>
                {errors.destination && <p className="text-danger text-xs mt-1">{errors.destination.message}</p>}
              </div>

              <div className="col-span-2">
                <label className="input-label">Motivo da visita *</label>
                <textarea {...register('purpose', { required: 'Motivo obrigatório' })}
                  className="input resize-none" rows={2} placeholder="Descreva o motivo da visita..." />
                {errors.purpose && <p className="text-danger text-xs mt-1">{errors.purpose.message}</p>}
              </div>

              <div className="col-span-2 p-3 bg-navy-800 rounded-lg border border-navy-500 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-100">Procedimento apenas de Saída de Material?</p>
                  <p className="text-xs text-slate-400">A saída deverá ser autorizada obrigatoriamente pelo chefe.</p>
                </div>
                <input 
                  type="checkbox" 
                  {...register('isMaterialExitOnly')} 
                  className="w-5 h-5 rounded border-navy-500 text-accent focus:ring-accent bg-navy-900"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button type="button" onClick={() => setStep(2)} className="btn-primary">
                Próximo: Materiais →
              </button>
            </div>
          </div>
        )}

        {/* ─── Step 2: Materiais ──────────────────────────────────── */}
        {step === 2 && (
          <div className="space-y-4 animate-slide-up">
            <div className="card p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-semibold text-slate-100 flex items-center gap-2">
                  <Package className="w-4 h-4 text-accent" /> Lista de Materiais
                </h2>
                <button
                  type="button"
                  onClick={() => append({ name: '', category: 'OUTRO', quantity: 1 })}
                  className="btn-secondary text-xs"
                >
                  <Plus className="w-3 h-3" /> Adicionar
                </button>
              </div>

              <div className="space-y-4">
                {fields.map((field, idx) => (
                  <div key={field.id} className="bg-navy-800 rounded-xl border border-navy-500 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-accent">Material #{idx + 1}</span>
                      {fields.length > 1 && (
                        <button type="button" onClick={() => remove(idx)} className="btn-ghost p-1 text-danger">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2">
                        <label className="input-label">Nome do material *</label>
                        <input {...register(`materials.${idx}.name`, { required: true })}
                          className="input" placeholder="Ex: Notebook Dell, Chave de fenda..." />
                      </div>

                      <div>
                        <label className="input-label">Categoria</label>
                        <select {...register(`materials.${idx}.category`)} className="input">
                          {CATEGORIES.map((c) => (
                            <option key={c.value} value={c.value}>{c.label}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="input-label">Quantidade</label>
                        <input {...register(`materials.${idx}.quantity`, { valueAsNumber: true, min: 1 })}
                          type="number" min={1} className="input" />
                      </div>

                      <div>
                        <label className="input-label">Nº de Série / Patrimônio</label>
                        <input {...register(`materials.${idx}.serialNumber`)}
                          className="input" placeholder="Opcional" />
                      </div>

                      <div>
                        <label className="input-label">Marca / Modelo</label>
                        <input {...register(`materials.${idx}.brand`)}
                          className="input" placeholder="Opcional" />
                      </div>
                    </div>

                    {/* Câmera para fotos */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="input-label mb-0">Fotos do material</label>
                        <button
                          type="button"
                          onClick={() => setShowCamera(showCamera === idx ? null : idx)}
                          className="btn-secondary text-xs"
                        >
                          {showCamera === idx
                            ? <><CameraOff className="w-3 h-3" /> Fechar câmera</>
                            : <><Camera className="w-3 h-3" /> Abrir câmera web</>}
                        </button>
                        <label className="btn-secondary text-xs cursor-pointer ml-2">
                          <Upload className="w-3 h-3 mr-1" /> Anexar / Câmera nativa
                          <input 
                            type="file" 
                            accept="image/*" 
                            capture="environment"
                            className="hidden" 
                            onChange={(e) => handleFileUpload(e, idx)} 
                          />
                        </label>
                      </div>

                      {showCamera === idx && (
                        <div className="space-y-2">
                          <Webcam
                            ref={webcamRef}
                            screenshotFormat="image/jpeg"
                            className="w-full rounded-xl border border-navy-500"
                            videoConstraints={{ facingMode: 'environment' }}
                          />
                          <button
                            type="button"
                            onClick={() => capturePhoto(idx)}
                            className="btn-primary w-full"
                          >
                            <Camera className="w-4 h-4" /> Capturar foto
                          </button>
                        </div>
                      )}

                      {/* Preview das fotos capturadas */}
                      {(capturedPhotos[idx] || []).length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {capturedPhotos[idx].map((photo, pIdx) => (
                            <div key={pIdx} className="relative">
                              <img src={photo} alt="foto" className="w-16 h-16 object-cover rounded-lg border border-navy-500" />
                              <button
                                type="button"
                                onClick={() => removePhoto(idx, pIdx)}
                                className="absolute -top-1 -right-1 w-5 h-5 bg-danger rounded-full flex items-center justify-center text-white text-xs"
                              >
                                ×
                              </button>
                            </div>
                          ))}
                          <span className="text-xs text-slate-500 self-end">
                            {capturedPhotos[idx].length} foto{capturedPhotos[idx].length !== 1 ? 's' : ''}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-between">
              <button type="button" onClick={() => setStep(1)} className="btn-secondary">
                ← Voltar
              </button>
              <button type="button" onClick={() => setStep(3)} className="btn-primary">
                Próximo: Responsável →
              </button>
            </div>
          </div>
        )}

        {/* ─── Step 3: Responsável ────────────────────────────────── */}
        {step === 3 && (
          <div className="card p-6 space-y-5 animate-slide-up">
            <h2 className="font-semibold text-slate-100 flex items-center gap-2">
              <User className="w-4 h-4 text-accent" /> Responsável
            </h2>
            <p className="text-sm text-slate-400">
              Informe os dados do responsável (se houver alteração de materiais na saída, ele será notificado para autorizar).
            </p>

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="input-label">Autoridade Liberadora *</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <select
                    className="input pl-10"
                    {...register('responsibleName', { required: 'Autoridade responsável obrigatória' })}
                    onChange={(e) => {
                      register('responsibleName').onChange(e);
                      const chiefName = e.target.value;
                      const chief = chiefs.find((c) => c.name === chiefName);
                      if (chief) {
                        setValue('responsibleEmail', chief.email);
                        setValue('responsibleWhatsapp', chief.whatsapp || '');
                        setValue('responsiblePhone', chief.phone || '');
                      } else {
                        setValue('responsibleEmail', '');
                        setValue('responsibleWhatsapp', '');
                        setValue('responsiblePhone', '');
                      }
                    }}
                  >
                    <option value="">Selecione um responsável</option>
                    {chiefs.map((c) => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>
                {errors.responsibleName && <p className="text-danger text-xs mt-1">{errors.responsibleName.message}</p>}
              </div>

              <div>
                <label className="input-label">E-mail</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input {...register('responsibleEmail')}
                    className="input pl-10 bg-navy-800 text-slate-400 cursor-not-allowed" placeholder="Auto-preenchido" type="email" readOnly />
                </div>
              </div>

              <div>
                <label className="input-label">WhatsApp</label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input {...register('responsibleWhatsapp')}
                    className="input pl-10 bg-navy-800 text-slate-400 cursor-not-allowed" placeholder="Auto-preenchido" readOnly />
                </div>
              </div>

              <div>
                <label className="input-label">Telefone / SMS</label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input {...register('responsiblePhone')}
                    className="input pl-10 bg-navy-800 text-slate-400 cursor-not-allowed" placeholder="Auto-preenchido" readOnly />
                </div>
              </div>
            </div>

            {/* Resumo */}
            <div className="bg-navy-800 rounded-xl border border-navy-500 p-4 space-y-2">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Resumo da visita</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-slate-500">Visitante:</span> <span className="text-slate-200">{watch('visitorName') || '—'}</span></div>
                <div><span className="text-slate-500">Destino:</span> <span className="text-slate-200">{watch('destination') || '—'}</span></div>
                <div><span className="text-slate-500">Materiais:</span> <span className="text-slate-200">{fields.length} item{fields.length !== 1 ? 's' : ''}</span></div>
                <div><span className="text-slate-500">Fotos:</span> <span className="text-slate-200">{Object.values(capturedPhotos).flat().length}</span></div>
              </div>
            </div>

            <div className="flex justify-between">
              <button type="button" onClick={() => setStep(2)} className="btn-secondary">
                ← Voltar
              </button>
              <button type="submit" disabled={loading} className="btn-primary">
                {loading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Registrando...</>
                ) : (
                  <><CheckCircle2 className="w-4 h-4" /> Registrar Visita</>
                )}
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
