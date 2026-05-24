import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';

@Injectable()
export class MaterialsService {
  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
  ) {}

  async findByVisit(visitId: string) {
    return this.prisma.material.findMany({
      where: { visitId },
      include: { photos: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  async create(visitId: string, data: any) {
    return this.prisma.material.create({
      data: {
        visitId,
        name: data.name,
        description: data.description,
        quantity: data.quantity || 1,
        category: data.category || 'OUTRO',
        serialNumber: data.serialNumber,
        brand: data.brand,
      },
    });
  }

  async createMany(visitId: string, items: any[]) {
    // Criar todos os materiais de uma visita de uma vez
    const created = [];
    for (const item of items) {
      const mat = await this.create(visitId, item);
      created.push(mat);
    }
    return created;
  }

  async delete(id: string) {
    const mat = await this.prisma.material.findUnique({
      where: { id },
      include: { photos: true },
    });
    if (!mat) throw new NotFoundException('Material não encontrado');

    // Deletar fotos do MinIO
    for (const photo of mat.photos) {
      await this.storage.delete(photo.storagePath).catch(() => null);
    }

    return this.prisma.material.delete({ where: { id } });
  }

  async addPhoto(materialId: string, file: Express.Multer.File) {
    const path = `materials/${materialId}/${Date.now()}-${file.originalname}`;
    await this.storage.upload(path, file.buffer, file.mimetype);

    return this.prisma.materialPhoto.create({
      data: {
        materialId,
        storagePath: path,
        filename: file.originalname,
        mimeType: file.mimetype,
        sizeBytes: file.size,
      },
    });
  }

  async getPhotoUrl(photoId: string) {
    const photo = await this.prisma.materialPhoto.findUnique({ where: { id: photoId } });
    if (!photo) throw new NotFoundException('Foto não encontrada');
    const url = await this.storage.getPresignedUrl(photo.storagePath);
    return { url };
  }

  async getPhotoFile(photoId: string) {
    const photo = await this.prisma.materialPhoto.findUnique({ where: { id: photoId } });
    if (!photo) throw new NotFoundException('Foto não encontrada');
    const buffer = await this.storage.get(photo.storagePath);
    return { buffer, mimeType: photo.mimeType };
  }

  async deletePhoto(photoId: string) {
    const photo = await this.prisma.materialPhoto.findUnique({ where: { id: photoId } });
    if (!photo) throw new NotFoundException('Foto não encontrada');
    await this.storage.delete(photo.storagePath).catch(() => null);
    return this.prisma.materialPhoto.delete({ where: { id: photoId } });
  }
}
