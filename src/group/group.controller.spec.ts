import { Test, TestingModule } from '@nestjs/testing';
import { GroupController } from './group.controller';
import { GroupService } from './group.service';

describe('GroupController - /groups/available', () => {
  let controller: GroupController;
  let service: GroupService;

  const mockService = {
    findAvailableGroups: jest.fn(),
  } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GroupController],
      providers: [
        { provide: GroupService, useValue: mockService },
      ],
    }).compile();

    controller = module.get<GroupController>(GroupController);
    service = module.get<GroupService>(GroupService);
  });

  afterEach(() => jest.clearAllMocks());

  it('chama service.findAvailableGroups com email do request', async () => {
    mockService.findAvailableGroups.mockResolvedValueOnce([{ group_id: 1 }]);
    const req: any = { user: { email: 'test@mail.com' } };
    const res = await controller.listAvailableGroups(req);
    expect(mockService.findAvailableGroups).toHaveBeenCalledWith('test@mail.com');
    expect(res).toEqual([{ group_id: 1 }]);
  });
});
