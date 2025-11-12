import { IncidentType, IncidentStatus } from '../entities/incidente.entity';
import { IsOptional, IsDateString, IsNumber, Min, Max } from 'class-validator';
import { Transform } from 'class-transformer';

export class Incidente {
  type: IncidentType;
  description: string;

  @IsNumber()
  @Min(-90, { message: 'Latitude deve estar entre -90 e 90' })
  @Max(90, { message: 'Latitude deve estar entre -90 e 90' })
  latitude: number;

  @IsNumber()
  @Min(-180, { message: 'Longitude deve estar entre -180 e 180' })
  @Max(180, { message: 'Longitude deve estar entre -180 e 180' })
  longitude: number;

  status: IncidentStatus;

  @IsOptional()
  @IsDateString()
  @Transform(({ value }) => value || new Date().toISOString())
  created_at?: string;
}
