import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class Users {
  @IsString({ each: true })
  @IsOptional()
  add_phones?: string[];

  @IsOptional()
  remove?: number[];
}

export class UpdateGroupDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsBoolean()
  @IsOptional()
  private?: boolean;

  @ValidateNested()
  @Type(() => Users)
  @IsOptional()
  users?: Users;
}
