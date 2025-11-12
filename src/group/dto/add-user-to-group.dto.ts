import { IsInt } from 'class-validator';

export class AddUserToGroupDto {
  @IsInt()
  user_id: number;

  @IsInt()
  group_id: number;
}
