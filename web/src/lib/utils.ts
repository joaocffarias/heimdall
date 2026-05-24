import { VisitStatus } from './types';

export function getStatusLabel(status: VisitStatus): string {
  const labels: Record<VisitStatus, string> = {
    PENDING: 'Aguardando Envio',
    IN_PREMISES: 'Nas Dependências',
    UNDER_REVIEW: 'Em Análise',
    APPROVED: 'Saída Autorizada',
    REJECTED: 'Rejeitado',
    COMPLETED: 'Concluído',
    CANCELLED: 'Cancelado',
  };
  return labels[status] || status;
}

export function getStatusClass(status: VisitStatus): string {
  const classes: Record<VisitStatus, string> = {
    PENDING: 'badge-pending',
    IN_PREMISES: 'badge-in-premises',
    UNDER_REVIEW: 'badge-review',
    APPROVED: 'badge-approved',
    REJECTED: 'badge-rejected',
    COMPLETED: 'badge-completed',
    CANCELLED: 'badge-cancelled',
  };
  return classes[status] || 'badge-pending';
}

export function getStatusDot(status: VisitStatus): string {
  const dots: Record<VisitStatus, string> = {
    PENDING: 'bg-yellow-400',
    IN_PREMISES: 'bg-blue-400',
    UNDER_REVIEW: 'bg-purple-400 animate-pulse',
    APPROVED: 'bg-green-400',
    REJECTED: 'bg-red-400',
    COMPLETED: 'bg-gray-400',
    CANCELLED: 'bg-slate-400',
  };
  return dots[status] || 'bg-gray-400';
}

export function formatDate(date?: string | Date | null): string {
  if (!date) return '—';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  }).format(new Date(date));
}

export function formatDateShort(date?: string | Date | null): string {
  if (!date) return '—';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  }).format(new Date(date));
}

export const categoryLabels: Record<string, string> = {
  ELETRONICO: '💻 Eletrônico',
  FERRAMENTA: '🔧 Ferramenta',
  DOCUMENTO: '📄 Documento',
  EQUIPAMENTO: '🖥️ Equipamento',
  VEICULO: '🚗 Veículo',
  OUTRO: '📦 Outro',
};
