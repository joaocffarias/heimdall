import { Module } from '@nestjs/common';
import { VisitsController, PublicSignController } from './visits.controller';
import { VisitsService } from './visits.service';
import { PrismaModule } from '../prisma/prisma.module';
import { StorageModule } from '../storage/storage.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuthModule } from '../auth/auth.module';

import { MaterialsModule } from '../materials/materials.module';

@Module({
  imports: [PrismaModule, StorageModule, NotificationsModule, AuthModule, MaterialsModule],
  controllers: [VisitsController, PublicSignController],
  providers: [VisitsService],
  exports: [VisitsService],
})
export class VisitsModule {}
