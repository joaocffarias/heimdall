import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { Response } from 'express';
import * as archiver from 'archiver';
import * as AdmZip from 'adm-zip';

@Injectable()
export class SystemService {
  private logger = new Logger(SystemService.name);

  constructor(
    private prisma: PrismaService,
    private storage: StorageService
  ) {}


  async exportFullBackup(tenantId: string, res: Response) {
    const archive = archiver('zip', {
      zlib: { level: 9 } // Compression level
    });

    archive.on('error', (err) => {
      throw err;
    });

    // Enviar pro stream de resposta
    archive.pipe(res);

    // 1. Pegar dados do banco de dados (Usuários, Visitas, Materiais, Fotos, Assinaturas)
    const users = await this.prisma.user.findMany({
      where: { tenantId },
      select: {
        id: true,
        tenantId: true,
        name: true,
        email: true,
        phone: true,
        whatsapp: true,
        role: true,
        password: true,
        active: true,
        createdAt: true,
        updatedAt: true
      }
    });

    const visits = await this.prisma.visit.findMany({
      where: { tenantId },
      include: {
        materials: {
          include: {
            photos: true
          }
        },
        signature: true
      }
    });

    // 2. Adicionar o JSON ao zip
    const dbDump = JSON.stringify({ users, visits }, null, 2);
    archive.append(dbDump, { name: 'database.json' });

    // 3. Pegar arquivos do Storage (MinIO)
    for (const visit of visits) {
      if (visit.visitorPhoto) {
        try {
          const buffer = await this.storage.get(visit.visitorPhoto);
          archive.append(buffer, { name: `photos/${visit.visitorPhoto}` });
        } catch (e) {
          this.logger.warn(`Foto de visitante não encontrada no storage: ${visit.visitorPhoto}`);
        }
      }
      
      for (const material of visit.materials) {
        for (const photo of material.photos) {
          try {
            const buffer = await this.storage.get(photo.storagePath);
            archive.append(buffer, { name: `photos/${photo.storagePath}` });
          } catch (e) {
            this.logger.warn(`Foto de material não encontrada no storage: ${photo.storagePath}`);
          }
        }
      }

      if (visit.signature?.signatureImagePath) {
         try {
           const buffer = await this.storage.get(visit.signature.signatureImagePath);
           archive.append(buffer, { name: `photos/${visit.signature.signatureImagePath}` });
         } catch(e) {
           this.logger.warn(`Foto de assinatura não encontrada no storage: ${visit.signature.signatureImagePath}`);
         }
      }
    }

    // Finalizar e enviar
    await archive.finalize();
  }

  async restoreBackup(tenantId: string, file: Express.Multer.File) {
    let jsonData: any = null;

    // Se for um arquivo zip, tentamos extrair o database.json
    if (file.mimetype === 'application/zip' || file.mimetype === 'application/x-zip-compressed' || file.originalname.endsWith('.zip')) {
      const zip = new AdmZip(file.buffer);
      const zipEntries = zip.getEntries();
      
      // Procura database.json
      const dbEntry = zipEntries.find(e => e.entryName === 'database.json');
      if (dbEntry) {
        jsonData = JSON.parse(zip.readAsText(dbEntry));
      } else {
        throw new Error('O arquivo ZIP não contém database.json');
      }

      // Restaura imagens para o Storage
      for (const entry of zipEntries) {
        if (entry.entryName.startsWith('photos/') && !entry.isDirectory) {
          const buffer = zip.readFile(entry);
          if (buffer) {
            const objectPath = entry.entryName.replace('photos/', '');
            // Identificar mimeType primitivo pela extensao
            const ext = objectPath.split('.').pop()?.toLowerCase();
            let mimeType = 'image/jpeg';
            if (ext === 'png') mimeType = 'image/png';
            if (ext === 'svg') mimeType = 'image/svg+xml';
            
            await this.storage.upload(objectPath, buffer, mimeType);
          }
        }
      }
    } else if (file.mimetype === 'application/json' || file.originalname.endsWith('.json')) {
      // Se for JSON direto (apenas usuários ou backup de debug)
      jsonData = JSON.parse(file.buffer.toString('utf-8'));
    } else {
      throw new Error('Formato de arquivo não suportado');
    }

    // Se tiver visits e users, restaura ambos
    if (jsonData && (jsonData.visits || jsonData.users)) {
      if (jsonData.users && Array.isArray(jsonData.users)) {
        await this.restoreUsers(tenantId, jsonData.users);
      }
      if (jsonData.visits && Array.isArray(jsonData.visits)) {
        await this.restoreVisits(tenantId, jsonData.visits);
      }
      return { success: true, message: 'Backup completo (Usuários, Registros e Imagens) restaurado com sucesso' };
    }

    throw new Error('Formato de dados JSON não reconhecido');
  }

  private async restoreUsers(tenantId: string, users: any[]) {
    for (const user of users) {
      const existing = await this.prisma.user.findUnique({ where: { id: user.id } });
      if (existing) continue; // Pular se já existe

      await this.prisma.user.create({
        data: {
          ...user,
          tenantId
        }
      });
    }
  }

  private async restoreVisits(tenantId: string, visits: any[]) {
     for (const visit of visits) {
        // Verifica se visita existe
        const existing = await this.prisma.visit.findUnique({ where: { id: visit.id } });
        if (existing) continue; // Pular se já existe

        // Criar a visita sem as relações primeiro
        const { materials, signature, notificationLogs, createdBy, tenant, ...visitData } = visit;
        
        await this.prisma.visit.create({
          data: {
             ...visitData,
             tenantId
          }
        });

        // Criar materiais e fotos
        if (materials && materials.length > 0) {
           for (const material of materials) {
              const { photos, visit, ...materialData } = material;
              await this.prisma.material.create({
                 data: {
                    ...materialData,
                    visitId: visitData.id
                 }
              });

              if (photos && photos.length > 0) {
                 for (const photo of photos) {
                    const { material, ...photoData } = photo;
                    await this.prisma.materialPhoto.create({
                       data: {
                          ...photoData,
                          materialId: materialData.id
                       }
                    });
                 }
              }
           }
        }

        // Criar signature
        if (signature) {
           const { visit, user, ...signatureData } = signature;
           await this.prisma.signature.create({
              data: {
                 ...signatureData,
                 visitId: visitData.id
              }
           });
        }
     }
  }
}
