import { Test, TestingModule } from '@nestjs/testing';
import { IncidenteService } from './incidente.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Incidents } from './entities/incidente.entity';
import { User } from 'src/user/entities/user.entity';
import { OneSignalService } from 'src/notifications/onesignal.service';
import { NotificationService } from 'src/notifications/notification.service';
import { UserSetting } from 'src/user-settings/entities/user-setting.entity';

describe('IncidenteService', () => {
  let service: IncidenteService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IncidenteService,
        { provide: getRepositoryToken(Incidents), useValue: {} as Partial<Repository<Incidents>> },
        { provide: DataSource, useValue: {} as Partial<DataSource> },
        { provide: getRepositoryToken(User), useValue: {} as Partial<Repository<User>> },
        { provide: OneSignalService, useValue: { sendNotification: jest.fn() } },
        { provide: NotificationService, useValue: { createNotification: jest.fn() } },
        { provide: getRepositoryToken(UserSetting), useValue: {} as Partial<Repository<UserSetting>> },
      ],
    }).compile();

    service = module.get<IncidenteService>(IncidenteService);
  });

  it('deve ser definido', () => {
    expect(service).toBeDefined();
  });
});
