import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserService } from './user.service';
import { User } from './entities/user.entity';

describe('UserService', () => {
  let service: UserService;
  let repo: jest.Mocked<Repository<User>>;

  beforeEach(async () => {
    const repoMock: Partial<jest.Mocked<Repository<User>>> = {
      findOne: jest.fn(),
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: getRepositoryToken(User),
          useValue: repoMock,
        },
        {
          // Mock mínimo do DataSource não utilizado pelos métodos testados
          provide: 'DataSource',
          useValue: {},
        },
      ],
    })
      // Mapeia corretamente o token do DataSource quando usado por injeção no construtor
      .useMocker((token) => {
        if (token === (require('typeorm') as any).DataSource) {
          return {};
        }
      })
      .compile();

    service = module.get<UserService>(UserService);
    repo = module.get(getRepositoryToken(User));
  });

  it('deve ser definido', () => {
    expect(service).toBeDefined();
  });

  describe('updatePrivacySettings', () => {
    it('atualiza e retorna as configurações de privacidade', async () => {
      const user: any = { user_id: 1, show_info_in_groups: false, share_reported_info: false };
      (repo.findOne as jest.Mock).mockResolvedValue(user);
      (repo.save as jest.Mock).mockResolvedValue(undefined);

      const result = await service.updatePrivacySettings(1, {
        show_info_in_groups: true,
        share_reported_info: true,
      });

      expect(repo.findOne).toHaveBeenCalledWith({
        where: { user_id: 1 }, select: [
          'user_id', 'name', 'email', 'role', 'gender', 'show_info_in_groups', 'share_reported_info', 'notification_token', 'phone'
        ]
      });
      expect(repo.save).toHaveBeenCalledWith({
        ...user,
        show_info_in_groups: true,
        share_reported_info: true,
      });
      expect(result).toEqual({
        message: expect.any(String),
        privacy_settings: {
          show_info_in_groups: true,
          share_reported_info: true,
        },
        user_id: 1,
      });
    });
  });

  describe('findOne', () => {
    it('busca por email em minúsculas', async () => {
      (repo.findOne as jest.Mock).mockResolvedValue({ user_id: 1 } as any);
      const user = await service.findOne('TEST@MAIL.COM');
      expect(repo.findOne).toHaveBeenCalledWith({ where: { email: 'test@mail.com' } });
      expect(user).toEqual({ user_id: 1 });
    });
  });
});
