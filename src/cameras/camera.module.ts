import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Cameras } from './entities/camera.entity';
import { User } from 'src/user/entities/user.entity';
import { CameraService } from './camera.service';
import { CameraController } from './camera.controller';
import { UserSetting } from 'src/user-settings/entities/user-setting.entity';
import { NotificationModule } from 'src/notifications/notification.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Cameras, User, UserSetting]),
    NotificationModule,
  ],
  providers: [CameraService],
  controllers: [CameraController],
  exports: [CameraService],
})
export class CameraModule {}
