import { Body, Controller, Post, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { CreateAppFailureDto } from './dto/create-app-failure.dto';
import { ReportService } from './report.service';
import { FirebaseAuthGuard } from 'src/auth/firebase-auth.guard';

@Controller('reports')
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  // Rota pública para receber falhas do app e enviar email via SendGrid
  @UseGuards(FirebaseAuthGuard)
  @Post('app-failure')
  @UsePipes(new ValidationPipe({ transform: true }))
  async appFailure(@Body() body: CreateAppFailureDto) {
    await this.reportService.sendAppFailureReport(body);
    return { message: 'Reporte recebido e e-mail enviado.' };
  }
}
