import { IsInt, IsNotEmpty, IsString } from 'class-validator';

export class InviteUserByPhoneDto {
  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsInt()
  @IsNotEmpty()
  group_id: number;
}
