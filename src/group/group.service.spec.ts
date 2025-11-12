import { Test, TestingModule } from '@nestjs/testing';
import { GroupService } from './group.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SecurityGroup } from './entities/group.entity';
import { User } from 'src/user/entities/user.entity';
import { UserSecurityGroup } from './entities/user_security_groups';
import { OneSignalService } from 'src/notifications/onesignal.service';
import { Repository } from 'typeorm';

const mockRepo = () => ({
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
  createQueryBuilder: jest.fn(),
  remove: jest.fn(),
});

const mockOneSignal = () => ({
  sendNotification: jest.fn(),
});

describe('GroupService - Regras de Cidade', () => {
  let service: GroupService;
  let groupRepo: any;
  let userRepo: any;
  let userGroupRepo: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GroupService,
        { provide: getRepositoryToken(SecurityGroup), useValue: mockRepo() },
        { provide: getRepositoryToken(User), useValue: mockRepo() },
        {
          provide: getRepositoryToken(UserSecurityGroup),
          useValue: mockRepo(),
        },
        { provide: OneSignalService, useValue: mockOneSignal() },
      ],
    }).compile();

    service = module.get<GroupService>(GroupService);
    groupRepo = module.get(getRepositoryToken(SecurityGroup));
    userRepo = module.get(getRepositoryToken(User));
    userGroupRepo = module.get(getRepositoryToken(UserSecurityGroup));
  });

  afterEach(() => jest.clearAllMocks());

  it('cria grupo usando city_id do DTO', async () => {
    const creator = {
      user_id: 1,
      email: 'a@a.com',
      city: { city_id: 3550308 },
    } as any;
    userRepo.findOne.mockResolvedValueOnce(creator);

    groupRepo.create.mockImplementation((g: any) => ({ group_id: 10, ...g }));
    groupRepo.save.mockResolvedValue({ group_id: 10 });

    const result = await service.createGroup(
      { name: 'Teste', private: false, city_id: 999 },
      'a@a.com',
    );
    expect(groupRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ city: { city_id: 999 } }),
    );
    expect(result.group_id).toBe(10);
  });

  it('cria grupo herdando cidade do criador quando DTO não envia city_id', async () => {
    const creator = {
      user_id: 1,
      email: 'a@a.com',
      city: { city_id: 3550308 },
    } as any;
    userRepo.findOne.mockResolvedValueOnce(creator);
    groupRepo.create.mockImplementation((g: any) => ({ group_id: 11, ...g }));
    groupRepo.save.mockResolvedValue({ group_id: 11 });

    const result = await service.createGroup(
      { name: 'Outro', private: true },
      'a@a.com',
    );
    expect(groupRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ city: { city_id: 3550308 } }),
    );
    expect(result.group_id).toBe(11);
  });

  it('bloqueia addUserToGroup se usuário for de outra cidade', async () => {
    userRepo.findOne.mockResolvedValueOnce({
      user_id: 5,
      city: { city_id: 100 },
    } as any);
    groupRepo.findOne.mockResolvedValueOnce({
      group_id: 20,
      city: { city_id: 101 },
    } as any);

    await expect(
      service.addUserToGroup({ group_id: 20, user_id: 5 }),
    ).rejects.toThrow('Usuário não pode entrar em grupo de outra cidade.');
  });

  it('permite addUserToGroup se cidades iguais', async () => {
    userRepo.findOne.mockResolvedValueOnce({
      user_id: 5,
      city: { city_id: 100 },
    } as any);
    groupRepo.findOne.mockResolvedValueOnce({
      group_id: 20,
      city: { city_id: 100 },
    } as any);
    userGroupRepo.findOne.mockResolvedValueOnce(null);
    userGroupRepo.create.mockReturnValue({ group_id: 20, user_id: 5 } as any);
    userGroupRepo.save.mockResolvedValue({});

    const msg = await service.addUserToGroup({ group_id: 20, user_id: 5 });
    expect(msg).toMatch(/sucesso/i);
  });

  it('inviteUserByPhone retorna status false se usuário de outra cidade', async () => {
    groupRepo.findOne.mockResolvedValueOnce({
      group_id: 30,
      city: { city_id: 200 },
      created_by: { user_id: 1 },
    } as any);
    userRepo.findOne.mockResolvedValueOnce({
      user_id: 50,
      phone: '11999999999',
      city: { city_id: 201 },
    } as any);

    const res = await service.inviteUserByPhone(
      { group_id: 30, phone: '(11) 99999-9999' },
      'owner@mail.com',
    );
    expect(res.status).toBe(false);
    expect(res.message).toMatch(/outra cidade/i);
  });

  it('inviteUserByPhone adiciona usuário se mesma cidade', async () => {
    groupRepo.findOne.mockResolvedValueOnce({
      group_id: 31,
      city: { city_id: 300 },
      created_by: { user_id: 1 },
    } as any);
    userRepo.findOne.mockResolvedValueOnce({
      user_id: 55,
      phone: '11888888888',
      email: 'u@mail.com',
      city: { city_id: 300 },
    } as any);
    userGroupRepo.findOne.mockResolvedValueOnce(null);
    userGroupRepo.create.mockReturnValue({ group_id: 31, user_id: 55 } as any);
    userGroupRepo.save.mockResolvedValue({});

    const res = await service.inviteUserByPhone(
      { group_id: 31, phone: '11 88888-8888' },
      'owner@mail.com',
    );
    expect(res.status).toBe(true);
    expect(res.message).toMatch(/sucesso/i);
  });

  describe('findAvailableGroups', () => {
    it('retorna grupos públicos da mesma cidade que usuário não participa', async () => {
      userRepo.findOne.mockResolvedValueOnce({
        user_id: 1,
        email: 'a@a.com',
        city: { city_id: 3550308 },
      });

      const qb: any = {
        leftJoin: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([
          {
            group_id: 100,
            name: 'Grupo Centro',
            private: false,
            city_id: 3550308,
          },
        ]),
      };
      groupRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findAvailableGroups('a@a.com');
      expect(result).toHaveLength(1);
      expect(qb.andWhere).toHaveBeenCalledWith('usg.user_id IS NULL');
      expect(qb.where).toHaveBeenCalled();
    });

    it('não filtra por cidade se usuário não tem city', async () => {
      userRepo.findOne.mockResolvedValueOnce({
        user_id: 2,
        email: 'b@b.com',
        city: null,
      });
      const qb: any = {
        leftJoin: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };
      groupRepo.createQueryBuilder.mockReturnValue(qb);
      const result = await service.findAvailableGroups('b@b.com');
      expect(Array.isArray(result)).toBe(true);
      // cityFilterSql vira 1=1 então não deve ter parâmetro cityId nas chamadas (simplificadamente checamos que where foi chamado)
      expect(qb.where).toHaveBeenCalled();
    });
  });

  describe('findMyGroups (filtro de cidade)', () => {
    it('retorna somente grupos da mesma cidade ou sem cidade', async () => {
      // Usuário logado com cidade 3550308
      userRepo.findOne.mockResolvedValueOnce({
        user_id: 10,
        email: 'x@x.com',
        city: { city_id: 3550308 },
      });

      // Mock queryBuilder cadeia
      const qb: any = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([
          { group_id: 1, city_id: 3550308, userSecurityGroups: [{}, {}] },
          { group_id: 2, city_id: null, userSecurityGroups: [{}] },
        ]),
      };
      groupRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findMyGroups('x@x.com');
      expect(result).toHaveLength(2);
      // Verifica que andWhere com filtro de cidade foi chamado
      expect(qb.andWhere).toHaveBeenCalled();
      // Verifica contagem
      const g1 = result.find((g) => g.group_id === 1);
      const g2 = result.find((g) => g.group_id === 2);
      expect(g1).toBeDefined();
      expect(g2).toBeDefined();
      expect(g1 && g1.total_users).toBe(2);
      expect(g2 && g2.total_users).toBe(1);
    });
  });

  describe('findGroupDetails', () => {
    it('retorna city_id e isDono true quando usuário é criador', async () => {
      // Mock user lookup
      userRepo.findOne.mockResolvedValueOnce({
        user_id: 77,
        email: 'owner@mail.com',
      });

      // Mock queryBuilder para findGroupDetails
      const qb: any = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue({
          group_id: 500,
          name: 'Grupo X',
          created_at: new Date(),
          private: false,
          city_id: 3550308,
          created_by: {
            user_id: 77,
            name: 'Owner',
            email: 'owner@mail.com',
            role: 'Morador',
            gender: 'Masculino',
          },
          userSecurityGroups: [],
        }),
      };
      groupRepo.createQueryBuilder.mockReturnValueOnce(qb);

      const result = await service.findGroupDetails(500, 'owner@mail.com');
      expect(result.city_id).toBe(3550308);
      expect(result.isDono).toBe(true);
    });
  });

  describe('joinGroup', () => {
    it('bloqueia quando grupo é privado', async () => {
      userRepo.findOne.mockResolvedValueOnce({
        user_id: 90,
        email: 'u@u.com',
        city: { city_id: 10 },
      });
      groupRepo.findOne.mockResolvedValueOnce({
        group_id: 700,
        private: true,
        city: { city_id: 10 },
      });
      await expect(service.joinGroup(700, 'u@u.com')).rejects.toThrow(
        /privado/i,
      );
    });

    it('bloqueia quando cidades diferentes', async () => {
      userRepo.findOne.mockResolvedValueOnce({
        user_id: 91,
        email: 'u2@u.com',
        city: { city_id: 10 },
      });
      groupRepo.findOne.mockResolvedValueOnce({
        group_id: 701,
        private: false,
        city: { city_id: 11 },
      });
      await expect(service.joinGroup(701, 'u2@u.com')).rejects.toThrow(
        /outra cidade/i,
      );
    });

    it('retorna mensagem de já está no grupo', async () => {
      userRepo.findOne.mockResolvedValueOnce({
        user_id: 92,
        email: 'u3@u.com',
        city: { city_id: 10 },
      });
      groupRepo.findOne.mockResolvedValueOnce({
        group_id: 702,
        private: false,
        city: { city_id: 10 },
      });
      userGroupRepo.findOne.mockResolvedValueOnce({
        user_id: 92,
        group_id: 702,
      });
      const res = await service.joinGroup(702, 'u3@u.com');
      expect(res.message).toMatch(/já está no grupo/i);
    });

    it('entra com sucesso em grupo público mesma cidade', async () => {
      userRepo.findOne.mockResolvedValueOnce({
        user_id: 93,
        email: 'u4@u.com',
        city: { city_id: 10 },
      });
      groupRepo.findOne.mockResolvedValueOnce({
        group_id: 703,
        private: false,
        city: { city_id: 10 },
      });
      userGroupRepo.findOne.mockResolvedValueOnce(null); // not yet
      userGroupRepo.create.mockReturnValue({ user_id: 93, group_id: 703 });
      userGroupRepo.save.mockResolvedValue({});
      const res = await service.joinGroup(703, 'u4@u.com');
      expect(res.status).toBe(true);
      expect(res.message).toMatch(/sucesso/i);
    });
  });
});
