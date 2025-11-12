import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CameraModule } from './cameras/camera.module';
import { Cameras } from './cameras/entities/camera.entity';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { OneSignalService } from './notifications/onesignal.service';
import { IncidenteService } from './incidente/incidente.service';
import { IncidenteController } from './incidente/incidente.controller';
import { IncidenteModule } from './incidente/incidente.module';
import { Incidents } from './incidente/entities/incidente.entity';
import { UserModule } from './user/user.module';
import { User } from './user/entities/user.entity';
import { SecurityGroup } from './group/entities/group.entity';
import { UserSecurityGroup } from './group/entities/user_security_groups';
import { GroupModule } from './group/group.module';
import { UserSettingsModule } from './user-settings/user-settings.module';
import { UserSetting } from './user-settings/entities/user-setting.entity';
import { Notification } from './notifications/entities/notification.entity';
import { NotificationRecipient } from './notifications/entities/notification-recipient.entity';
import { NotificationModule } from './notifications/notification.module';
import { ReportModule } from './report/report.module';
import { City } from './cities/city.entity';
import { Uf } from './cities/uf.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        type: 'mysql',
        host: config.get('DB_HOST'),
        port: +config.get<number>('DB_PORT')! || 3306,
        username: config.get('DB_USERNAME'),
        password: config.get('DB_PASSWORD'),
        database: config.get('DB_NAME'),
        entities: [
          Cameras,
          Incidents,
          User,
          SecurityGroup,
          UserSecurityGroup,
          UserSetting,
          Notification,
          NotificationRecipient,
          City,
          Uf,
        ],
        ssl: {
          //ca: fs.readFileSync('./certs/CAdb.pem'),
          rejectUnauthorized: false, // Para garantir que apenas conexões seguras sejam aceitas
        },
        logging: true,
        legacySpatialSupport: false,
      }),
      inject: [ConfigService],
    }),
    CameraModule,
    IncidenteModule,
    UserModule,
    GroupModule,
    UserSettingsModule,
    NotificationModule,
    ReportModule,
  ],
  providers: [OneSignalService],
})
export class AppModule {}
