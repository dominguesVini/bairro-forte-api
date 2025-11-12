import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
  Req,
} from '@nestjs/common';
import { IncidenteService } from './incidente.service';
import { Incidente } from './dto/create-incidente.dto';
import { FirebaseAuthGuard } from 'src/auth/firebase-auth.guard';

@Controller(['incidents', 'incidentes'])
export class IncidenteController {
  constructor(private readonly incidentService: IncidenteService) {}

  @UseGuards(FirebaseAuthGuard)
  @Get()
  findAll(@Query() query: any) {
    return this.incidentService.filtrarRegistros(query);
  }

  @UseGuards(FirebaseAuthGuard)
  @Post()
  @UsePipes(new ValidationPipe({ transform: true }))
  create(@Body() data: Incidente, @Req() req: any) {
    const email = req.user?.email;
    return this.incidentService.create(data, email);
  }

  @UseGuards(FirebaseAuthGuard)
  @Get('report')
  async report(
    @Query('start') start: string,
    @Query('end') end: string,
    @Req() req: any,
  ) {
    const email = req.user?.email;
    return this.incidentService.generateUserReport(email, start, end);
  }

  @UseGuards(FirebaseAuthGuard)
  @Get('me')
  async myIncidents(@Req() req: any) {
    const email = req.user?.email;
    const incidents = await this.incidentService.findMine(email);
    // Quando não houver incidentes, retornar um array vazio
    return { incidents: Array.isArray(incidents) ? incidents : [] };
  }

  // Get incident details by id: GET /incidentes/:idIncidente
  @UseGuards(FirebaseAuthGuard)
  @Get(':incidentId')
  async getById(@Param('incidentId', ParseIntPipe) incidentId: number) {
    return this.incidentService.findById(incidentId);
  }

  @UseGuards(FirebaseAuthGuard)
  @Delete(':incidentId')
  delete(@Param('incidentId', ParseIntPipe) incidentId: number) {
    return this.incidentService.delete(incidentId);
  }

  @UseGuards(FirebaseAuthGuard)
  @Put(':incidenteId')
  async updateUser(
    @Param('incidenteId', ParseIntPipe) incidenteId: number,
    @Body() updateData: Partial<Incidente>,
  ) {
    return this.incidentService.update(incidenteId, updateData);
  }

  @UseGuards(FirebaseAuthGuard)
  @Post('cancelar')
  async cancelar(
    @Body('incidentId', ParseIntPipe) incidentId: number,
    @Req() req: any,
  ) {
    const email = req.user?.email;
    return this.incidentService.cancelIncident(incidentId, email);
  }
}
