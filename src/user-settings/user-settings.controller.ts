import { Controller, Get, Post, Body, Param, Delete, Put, ParseIntPipe, UseGuards, UsePipes, ValidationPipe, Req } from '@nestjs/common';
import { UserSettingsService } from './user-settings.service';
import { CreateUserSettingDto } from './dto/create-user-setting.dto';
import { UpdateUserSettingDto } from './dto/update-user-setting.dto';
import { UserSetting } from './entities/user-setting.entity';
import { FirebaseAuthGuard } from 'src/auth/firebase-auth.guard';

@Controller('user-settings')
export class UserSettingsController {
  constructor(private readonly userSettingsService: UserSettingsService) {}
  @UseGuards(FirebaseAuthGuard)
  @Get('user')
  findAllByUser(@Req() req: any): Promise<UserSetting[]> {
    const email = req.user?.email;
    return this.userSettingsService.findAllByEmail(email);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number): Promise<UserSetting> {
    return this.userSettingsService.findOne(id);
  }

  @UseGuards(FirebaseAuthGuard)
  @Post()
  @UsePipes(new ValidationPipe({ transform: true }))
  create(@Body() createUserSettingDto: CreateUserSettingDto, @Req() req: any): Promise<UserSetting> {
    const email = req.user?.email;
    return this.userSettingsService.create(createUserSettingDto, email);
  }

  @UseGuards(FirebaseAuthGuard)
  @Put(':id')
  @UsePipes(new ValidationPipe({ transform: true }))
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUserSettingDto: UpdateUserSettingDto,
    @Req() req: any,
  ): Promise<UserSetting> {
    const email = req.user?.email;
    return this.userSettingsService.update(id, updateUserSettingDto, email);
  }

  @UseGuards(FirebaseAuthGuard)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @Req() req: any): Promise<void> {
    const email = req.user?.email;
    return this.userSettingsService.remove(id, email);
  }
}
