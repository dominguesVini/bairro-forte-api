import { IsString, IsInt, IsOptional, IsBoolean } from 'class-validator';
import { Column } from 'typeorm';

export class CreateGroupDto {
  @IsString()
  name: string;

  @IsInt()
  @IsOptional()
  created_by?: number;

  @IsBoolean()
  @IsOptional()
  private?: boolean = false;

  @IsInt()
  @IsOptional()
  city_id?: number;
}
