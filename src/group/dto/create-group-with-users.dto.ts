import { IsArray, IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateGroupWithUsersDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsBoolean()
  @IsOptional()
  private?: boolean = false;

  @IsArray()
  @IsString({ each: true })
  phones: string[]; // Lista de telefones dos usuários a serem adicionados
}
