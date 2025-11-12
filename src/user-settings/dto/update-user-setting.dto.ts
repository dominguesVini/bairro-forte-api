import { IsEnum, IsNumber, IsBoolean, IsOptional, IsString, Max, Min, IsArray, ArrayNotEmpty, ArrayUnique, ValidateIf } from 'class-validator';
import { NotificationCategory } from '../entities/user-setting.entity';
import { Transform } from 'class-transformer';

export class UpdateUserSettingDto {
  @IsOptional()
  @IsNumber()
  @Min(0.1, { message: 'Raio mínimo é 0.1 km' })
  @Max(999.99, { message: 'Raio máximo é 999.99 km' })
  radius_km?: number;

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsEnum(NotificationCategory, { each: true })
  category?: NotificationCategory[];

  @IsOptional()
  @ValidateIf((o, v) => v !== null && v !== undefined)
  @IsString()
  @Transform(({ value }) => (value === '' || value === 'null') ? null : value)
  period_start?: string | null;

  @IsOptional()
  @ValidateIf((o, v) => v !== null && v !== undefined)
  @IsString()
  @Transform(({ value }) => (value === '' || value === 'null') ? null : value)
  period_end?: string | null;

  @IsOptional()
  @IsBoolean()
  group_only?: boolean;
}
