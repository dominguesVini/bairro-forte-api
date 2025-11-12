import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateLocationNotificationDto {
  @IsString()
  type: string;

  @IsString()
  message: string;

  @IsNumber()
  latitude: number;

  @IsNumber()
  longitude: number;

  @IsOptional()
  @IsNumber()
  maxDistanceKm?: number;

  @IsOptional()
  @IsNumber()
  incidentId?: number;

  @IsOptional()
  @IsNumber()
  cameraId?: number;

  @IsOptional()
  @IsEnum(['incident', 'camera'])
  reportType?: 'incident' | 'camera';
}
