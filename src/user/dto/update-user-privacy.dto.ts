import { IsBoolean } from 'class-validator';

export class UpdateUserPrivacySettingsDto {
  @IsBoolean()
  show_info_in_groups: boolean;

  @IsBoolean()
  share_reported_info: boolean;
}
