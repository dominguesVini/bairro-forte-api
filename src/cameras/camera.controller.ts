import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Put,
  Query,
  Req,
  Param,
  ParseIntPipe,
  Delete,
} from '@nestjs/common';
import { CameraService } from './camera.service';
import { CreateCameraDto } from './dto/create-camera.dto';
import { FirebaseAuthGuard } from 'src/auth/firebase-auth.guard';

@Controller('cameras')
export class CameraController {
  constructor(private readonly cameraService: CameraService) {}

  @UseGuards(FirebaseAuthGuard)
  @Get()
  findAll() {
    return this.cameraService.findAll();
  }

  @Get('user/:userId')
  listCamerasByUser(@Param('userId', ParseIntPipe) userId: number) {
    return this.cameraService.findAllCamerasByUserId(userId);
  }

  @UseGuards(FirebaseAuthGuard)
  @Get('me')
  me(@Req() req: any) {
    const email = req.user?.email;
    return this.cameraService.findAllCamerasByEmail(email);
  }

  @UseGuards(FirebaseAuthGuard)
  @Post()
  create(@Body() data: CreateCameraDto, @Req() req: any) {
    const email = req.user?.email;
    return this.cameraService.create(data, email);
  }

  @UseGuards(FirebaseAuthGuard)
  @Put(':cameraId')
  async updateUser(
    @Param('cameraId', ParseIntPipe) cameraId: number,
    @Body() updateData: Partial<CreateCameraDto>,
    @Req() req: any,
  ) {
    const email = req.user?.email;
    return this.cameraService.update(cameraId, updateData, email);
  }

  @UseGuards(FirebaseAuthGuard)
  @Delete(':cameraId')
  async delete(
    @Param('cameraId', ParseIntPipe) cameraId: number,
    @Req() req: any,
  ) {
    const email = req.user?.email;
    return this.cameraService.delete(cameraId, email);
  }
}
