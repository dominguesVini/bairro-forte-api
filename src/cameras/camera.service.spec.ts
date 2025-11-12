import { Test, TestingModule } from '@nestjs/testing';
import { CameraService } from './camera.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Cameras } from './entities/camera.entity';
import { User } from 'src/user/entities/user.entity';
import { UserSetting } from 'src/user-settings/entities/user-setting.entity';
import { NotificationService } from 'src/notifications/notification.service';

describe('CamerasService', () => {
  let service: CameraService;
  let dataSource: { createQueryBuilder: jest.Mock };
  let userRepo: jest.Mocked<Repository<User>>;

  beforeEach(async () => {
    dataSource = { createQueryBuilder: jest.fn() } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CameraService,
        {
          provide: getRepositoryToken(Cameras),
          useValue: {} as Partial<Repository<Cameras>>,
        },
        { provide: DataSource, useValue: dataSource as Partial<DataSource> },
        {
          provide: getRepositoryToken(User),
          useValue: { findOne: jest.fn() } as Partial<
            jest.Mocked<Repository<User>>
          >,
        },
        {
          provide: getRepositoryToken(UserSetting),
          useValue: {} as Partial<Repository<UserSetting>>,
        },
        {
          provide: NotificationService,
          useValue: { createNotification: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<CameraService>(CameraService);
    userRepo = module.get(getRepositoryToken(User));
  });

  it('deve ser definido', () => {
    expect(service).toBeDefined();
  });

  it('delete com dono autorizado retorna sucesso', async () => {
    (userRepo.findOne as jest.Mock).mockResolvedValue({ user_id: 10 } as any);

    // Builder para checar dono
    const ownerBuilder = {
      select: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getRawOne: jest.fn().mockResolvedValue({ created_by: 10 }),
    };
    // Builder para deletar
    const deleteBuilder = {
      delete: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({ affected: 1 }),
    };

    dataSource.createQueryBuilder
      .mockReturnValueOnce(ownerBuilder as any)
      .mockReturnValueOnce(deleteBuilder as any);

    const res = await service.delete(5, 'user@mail.com');
    expect(res).toEqual({
      message: 'Câmera removida com sucesso!',
      status: true,
    });
    expect(deleteBuilder.execute).toHaveBeenCalled();
  });

  it('delete nega quando não é dono', async () => {
    (userRepo.findOne as jest.Mock).mockResolvedValue({ user_id: 10 } as any);

    const ownerBuilder = {
      select: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getRawOne: jest.fn().mockResolvedValue({ created_by: 99 }),
    };
    dataSource.createQueryBuilder.mockReturnValueOnce(ownerBuilder as any);

    const res = await service.delete(5, 'user@mail.com');
    expect(res.status).toBe(false);
    expect(res.message).toContain('Permissão negada');
    // Apenas uma chamada e nenhuma chamada de delete
    expect(dataSource.createQueryBuilder).toHaveBeenCalledTimes(1);
  });

  it('delete sem email remove por id', async () => {
    const deleteBuilder = {
      delete: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    dataSource.createQueryBuilder.mockReturnValueOnce(deleteBuilder as any);

    const res = await service.delete(7);
    expect(res).toEqual({
      message: 'Câmera removida com sucesso!',
      status: true,
    });
    expect(deleteBuilder.execute).toHaveBeenCalled();
  });

  it('delete retorna não encontrada quando affected = 0', async () => {
    const deleteBuilder = {
      delete: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({ affected: 0 }),
    };
    dataSource.createQueryBuilder.mockReturnValueOnce(deleteBuilder as any);

    const res = await service.delete(9);
    expect(res).toEqual({ message: 'Câmera não encontrada.', status: false });
  });
});
