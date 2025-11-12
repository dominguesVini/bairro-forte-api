import { IsInt, IsNotEmpty } from 'class-validator';

export class LeaveGroupDto {
  @IsInt()
  @IsNotEmpty()
  group_id: number;
}
