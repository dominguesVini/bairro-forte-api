import { IsBoolean, IsEmail, IsIn, IsOptional, IsString, IsNumber } from 'class-validator';

export class UpdateUserDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsEmail()
  @IsOptional()
  email?: string;
  
  @IsIn(['Morador', 'Segurança privada'])
  @IsOptional()
  role?: 'Morador' | 'Segurança privada';
  
  @IsIn(['Masculino', 'Feminino', 'Prefiro não dizer'])
  @IsOptional()
  gender?: 'Masculino' | 'Feminino' | 'Prefiro não dizer';
  
  @IsNumber()
  @IsOptional()
  latitude?: number;
  
  @IsNumber()
  @IsOptional()
  longitude?: number;
  
  @IsBoolean()
  @IsOptional()
  show_info_in_groups?: boolean;
  
  @IsBoolean()
  @IsOptional()
  share_reported_info?: boolean;
  
  @IsString()
  @IsOptional()
  notification_token?: string;
  
  @IsString()
  @IsOptional()
  phone?: string;
}
