import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserSettingsService } from './user-settings.service';
import { UserSetting } from './entities/user-setting.entity';
import { User } from 'src/user/entities/user.entity';

describe('UserSettingsService', () => {
  let service: UserSettingsService;
  let settingRepo: jest.Mocked<Repository<UserSetting>>;
  let userRepo: jest.Mocked<Repository<User>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserSettingsService,
        { provide: getRepositoryToken(UserSetting), useValue: { find: jest.fn(), findOne: jest.fn(), save: jest.fn(), remove: jest.fn() } },
        { provide: getRepositoryToken(User), useValue: { findOne: jest.fn() } },
      ],
    }).compile();

    service = module.get<UserSettingsService>(UserSettingsService);
    settingRepo = module.get(getRepositoryToken(UserSetting));
    userRepo = module.get(getRepositoryToken(User));
  });

  it('deve ser definido', () => {
    expect(service).toBeDefined();
  });

  it('findAllByUser mapeia os campos de período', async () => {
    (settingRepo.find as jest.Mock).mockResolvedValue([
      { setting_id: 1, period_start: '08:00:00', period_end: '18:00:00', user: { user_id: 1 } } as any,
    ]);
    const res = await service.findAllByUser(1);
    expect(res[0]).toHaveProperty('period_start_iso');
    expect(res[0]).toHaveProperty('period_end_iso');
  });
});
