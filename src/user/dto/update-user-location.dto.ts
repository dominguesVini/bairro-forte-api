import { IsNumber, IsInt } from 'class-validator';

export class UpdateUserLocationDto {
  @IsInt()
  userId: number;

  @IsNumber()
  latitude: number;

  @IsNumber()
  longitude: number;
}
