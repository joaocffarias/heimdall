import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { Client as MinioClient } from 'minio';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class StorageService implements OnModuleInit {
  private client: MinioClient;
  private bucket: string;
  private logger = new Logger(StorageService.name);

  constructor(private config: ConfigService) {}

  async onModuleInit() {
    this.bucket = this.config.get('MINIO_BUCKET', 'heimdall');

    this.client = new MinioClient({
      endPoint: this.config.get('MINIO_ENDPOINT', 'minio'),
      port: Number(this.config.get('MINIO_PORT', 9000)),
      useSSL: this.config.get('MINIO_USE_SSL') === 'true',
      accessKey: this.config.get('MINIO_ROOT_USER'),
      secretKey: this.config.get('MINIO_ROOT_PASSWORD'),
    });

    // Criar bucket se não existir
    try {
      const exists = await this.client.bucketExists(this.bucket);
      if (!exists) {
        await this.client.makeBucket(this.bucket, 'us-east-1');
        // Política pública de leitura para acesso direto a fotos
        const policy = JSON.stringify({
          Version: '2012-10-17',
          Statement: [
            {
              Effect: 'Allow',
              Principal: { AWS: ['*'] },
              Action: ['s3:GetObject'],
              Resource: [`arn:aws:s3:::${this.bucket}/*`],
            },
          ],
        });
        await this.client.setBucketPolicy(this.bucket, policy);
        this.logger.log(`✅ Bucket '${this.bucket}' criado no MinIO`);
      }
    } catch (err) {
      this.logger.error('❌ Erro ao conectar ao MinIO:', err.message);
    }
  }

  async upload(objectPath: string, buffer: Buffer, mimeType: string): Promise<void> {
    await this.client.putObject(this.bucket, objectPath, buffer, buffer.length, {
      'Content-Type': mimeType,
    });
  }

  async getPresignedUrl(objectPath: string, expires = 3600): Promise<string> {
    return this.client.presignedGetObject(this.bucket, objectPath, expires);
  }

  async delete(objectPath: string): Promise<void> {
    await this.client.removeObject(this.bucket, objectPath);
  }

  async get(objectPath: string): Promise<Buffer> {
    const stream = await this.client.getObject(this.bucket, objectPath);
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      stream.on('data', (chunk) => chunks.push(chunk));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', reject);
    });
  }

  getPublicUrl(objectPath: string): string {
    const base = this.config.get('MINIO_PUBLIC_URL', 'http://localhost:9000');
    return `${base}/${this.bucket}/${objectPath}`;
  }
}
