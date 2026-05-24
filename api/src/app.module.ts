import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { TenantsModule } from './tenants/tenants.module';
import { VisitsModule } from './visits/visits.module';
import { MaterialsModule } from './materials/materials.module';
import { SignaturesModule } from './signatures/signatures.module';
import { StorageModule } from './storage/storage.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ReportsModule } from './reports/reports.module';
import { EventsGateway } from './gateway/events.gateway';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    PrismaModule,
    AuthModule,
    UsersModule,
    TenantsModule,
    VisitsModule,
    MaterialsModule,
    SignaturesModule,
    StorageModule,
    NotificationsModule,
    ReportsModule,
  ],
  controllers: [HealthController],
  providers: [EventsGateway],
})
export class AppModule {}
