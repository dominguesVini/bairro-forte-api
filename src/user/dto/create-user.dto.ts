import { IsIn, IsOptional, IsString } from "class-validator";

export class CreateUserDto {
  name: string;
  email: string;
  
  @IsIn(['Morador', 'Segurança privada'])
  role: 'Morador' | 'Segurança privada';
  
  @IsIn(['Masculino', 'Feminino', 'Prefiro não dizer'])
  gender: 'Masculino' | 'Feminino' | 'Prefiro não dizer';
  
  latitude: number;
  longitude: number;
  show_info_in_groups: boolean;
  share_reported_info: boolean;
  notification_token: string;
  
  @IsOptional()
  @IsString()
  phone?: string;

  // Código da cidade (chave em cities.city_id)
  @IsOptional()
  city_id?: number;
}
