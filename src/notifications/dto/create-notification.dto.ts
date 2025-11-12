import { IsString, IsNumber, IsOptional, IsArray } from 'class-validator';

export class CreateNotificationDto {
  @IsString()
  type: string;

  @IsString()
  message: string;

  @IsArray()
  recipientIds: number[];

  @IsOptional()
  @IsNumber()
  incidentId?: number;

  @IsOptional()
  @IsNumber()
  forUserPrivateId?: number;
}
