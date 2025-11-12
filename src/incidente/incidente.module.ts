import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Incidents } from './entities/incidente.entity';
import { User } from 'src/user/entities/user.entity';
import { UserSetting } from 'src/user-settings/entities/user-setting.entity';
import { IncidenteService } from './incidente.service';
import { IncidenteController } from './incidente.controller';
import { NotificationModule } from 'src/notifications/notification.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([Incidents, User, UserSetting]),
        NotificationModule
    ],
    providers: [IncidenteService],
    controllers: [IncidenteController],
    exports: [IncidenteService]
})
export class IncidenteModule { }
