import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Put,
  Delete,
  ParseIntPipe,
  UseGuards,
  Req,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserPrivacySettingsDto } from './dto/update-user-privacy.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { FirebaseAuthGuard } from 'src/auth/firebase-auth.guard';
import { LocationApiKeyGuard } from 'src/auth/location-api-key.guard';
import { UpdateUserLocationDto } from './dto/update-user-location.dto';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  async create(@Body() createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto);
  }

  @UseGuards(FirebaseAuthGuard)
  @Put(':userId')
  async updateUser(
    @Param('userId', ParseIntPipe) userId: number,
    @Body() updateData: Partial<CreateUserDto>,
  ) {
    return this.userService.updateUser(userId, updateData);
  }

  @UseGuards(FirebaseAuthGuard)
  @Get()
  async findAll(@Query() query: any) {
    return this.userService.findAll();
  }

  @Get(':email')
  async findOne(@Param('email') email: string) {
    return this.userService.findOne(email);
  }

  @UseGuards(FirebaseAuthGuard)
  @Get('me/profile')
  async getMyProfile(@Req() req: any) {
    const email = req.user?.email;
    const user = await this.userService.findOne(email);

    if (!user) {
      return {
        message: 'Usuário não encontrado',
        status: false,
      };
    }

    return {
      status: true,
      user,
    };
  }

  @UseGuards(FirebaseAuthGuard)
  @Put('me/profile')
  async updateMyProfile(@Body() updateData: UpdateUserDto, @Req() req: any) {
    const email = req.user?.email;
    return this.userService.updateUserProfile(email, updateData);
  }

  @UseGuards(FirebaseAuthGuard)
  @Get('me/privacy')
  async getPrivacySettings(@Req() req: any) {
    // Obter o email do token
    const userEmail = req.user?.email;

    // Buscar o usuário pelo email
    const user = await this.userService.findOne(userEmail);

    if (!user) {
      return {
        message: 'Usuário não encontrado com este email',
        status: false,
      };
    }

    // Retornar apenas as configurações de privacidade
    return {
      privacy_settings: {
        show_info_in_groups: user.show_info_in_groups,
        share_reported_info: user.share_reported_info,
      },
      user_id: user.user_id,
    };
  }

  @UseGuards(FirebaseAuthGuard)
  @Put('me/privacy')
  async updatePrivacySettings(
    @Body() settings: UpdateUserPrivacySettingsDto,
    @Req() req: any,
  ) {
    // Obter o email do token
    const userEmail = req.user?.email;

    // Buscar o usuário pelo email
    const user = await this.userService.findOne(userEmail);

    if (!user) {
      return {
        message: 'Usuário não encontrado com este email',
        status: false,
      };
    }

    // Atualizar as configurações de privacidade usando o ID do usuário obtido do token
    return this.userService.updatePrivacySettings(user.user_id, settings);
  }

  @UseGuards(FirebaseAuthGuard)
  @Put('me/location')
  async updateMyLocation(
    @Body() locationData: UpdateLocationDto,
    @Req() req: any,
  ) {
    // Obter o email do token
    const userEmail = req.user?.email;

    // Buscar o usuário pelo email
    const user = await this.userService.findOne(userEmail);

    if (!user) {
      return {
        message: 'Usuário não encontrado com este email',
        status: false,
      };
    }

    // Atualizar a localização do usuário
    return this.userService.updateLocation(user.user_id, locationData);
  }

  @UseGuards(LocationApiKeyGuard)
  @Post('location/update')
  @UsePipes(new ValidationPipe({ transform: true }))
  async updateLocationWithApiKey(@Body() body: UpdateUserLocationDto) {
    const { userId, latitude, longitude } = body;
    return this.userService.updateLocation(userId, { latitude, longitude });
  }
}
