import { IsOptional, IsString } from 'class-validator';

// DTO para receber o reporte de falha do app
export class CreateAppFailureDto {
  @IsString()
  message!: string; // mensagem resumida do erro

  @IsOptional()
  @IsString()
  stack?: string; // stacktrace, se houver

  @IsOptional()
  @IsString()
  appVersion?: string; // versão do app

  @IsOptional()
  @IsString()
  platform?: string; // android | ios | web

  @IsOptional()
  @IsString()
  userEmail?: string; // email do usuário, se disponível

  @IsOptional()
  @IsString()
  extra?: string; // qualquer informação adicional serializada
}
