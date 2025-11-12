import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/user/entities/user.entity';
import { SecurityGroup } from './entities/group.entity';
import { UserSecurityGroup } from './entities/user_security_groups';
import { GroupController } from './group.controller';
import { GroupService } from './group.service';
import { OneSignalService } from 'src/notifications/onesignal.service';

@Module({
  imports: [TypeOrmModule.forFeature([SecurityGroup, User, UserSecurityGroup])],
  controllers: [GroupController],
  providers: [GroupService, OneSignalService],
})
export class GroupModule {}
