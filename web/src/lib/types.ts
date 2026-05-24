export type VisitStatus =
  | 'PENDING'
  | 'IN_PREMISES'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'COMPLETED'
  | 'CANCELLED';

export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'RESPONSIBLE' | 'GUARD';

export type MaterialCategory =
  | 'ELETRONICO'
  | 'FERRAMENTA'
  | 'DOCUMENTO'
  | 'EQUIPAMENTO'
  | 'VEICULO'
  | 'OUTRO';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
}

export interface MaterialPhoto {
  id: string;
  materialId: string;
  storagePath: string;
  filename: string;
  mimeType: string;
}

export interface Material {
  id: string;
  visitId: string;
  name: string;
  description?: string;
  quantity: number;
  category: MaterialCategory;
  serialNumber?: string;
  brand?: string;
  photos: MaterialPhoto[];
  createdAt: string;
}

export interface Signature {
  id: string;
  visitId: string;
  signerName: string;
  signerEmail?: string;
  signerIp: string;
  approved: boolean;
  reason?: string;
  signatureHash: string;
  signatureImagePath: string;
  signedAt: string;
}

export interface Visit {
  id: string;
  tenantId: string;
  visitorName: string;
  visitorDoc: string;
  visitorCompany?: string;
  visitorPhone?: string;
  visitorEmail?: string;
  visitorType: 'VISITANTE' | 'MILITAR' | 'SERVIDOR_CIVIL';
  isMaterialExitOnly: boolean;
  destination: string;
  purpose: string;
  responsibleName: string;
  responsibleEmail?: string;
  responsiblePhone?: string;
  responsibleWhatsapp?: string;
  status: VisitStatus;
  materialChanges?: string;
  signToken?: string;
  entryAt?: string;
  exitAt?: string;
  createdAt: string;
  materials: Material[];
  signature?: Signature;
}

export interface DailyStats {
  total: number;
  pending: number;
  inPremises: number;
  underReview: number;
  approved: number;
  rejected: number;
  completed: number;
}
