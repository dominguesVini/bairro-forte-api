import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { User } from './entities/user.entity';
import { LocationApiKeyGuard } from 'src/auth/location-api-key.guard';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [UserController],
  providers: [UserService, LocationApiKeyGuard],
  exports: [UserService], // Exportar UserService para que outros módulos possam usá-lo
})
export class UserModule {}
