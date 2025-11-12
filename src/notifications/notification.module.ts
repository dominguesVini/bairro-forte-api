import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification } from './entities/notification.entity';
import { NotificationRecipient } from './entities/notification-recipient.entity';
import { NotificationService } from './notification.service';
import { OneSignalService } from './onesignal.service';
import { NotificationController } from './notification.controller';
import { User } from 'src/user/entities/user.entity';
import { UserSecurityGroup } from 'src/group/entities/user_security_groups';
import { Cameras } from 'src/cameras/entities/camera.entity';
import { UserSetting } from 'src/user-settings/entities/user-setting.entity';
import { UserModule } from 'src/user/user.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Notification, 
      NotificationRecipient, 
      User, 
      UserSetting,
      UserSecurityGroup,
      Cameras
    ]),
    forwardRef(() => UserModule) // Usar forwardRef para evitar dependência circular
  ],
  controllers: [NotificationController],
  providers: [NotificationService, OneSignalService],
  exports: [NotificationService, OneSignalService],
})
export class NotificationModule {}
