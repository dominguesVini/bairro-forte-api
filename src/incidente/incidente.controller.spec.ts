import { Test, TestingModule } from '@nestjs/testing';
import { IncidenteController } from './incidente.controller';
import { IncidenteService } from './incidente.service';

describe('IncidenteController', () => {
  let controller: IncidenteController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [IncidenteController],
      providers: [{ provide: IncidenteService, useValue: {} }],
    }).compile();

    controller = module.get<IncidenteController>(IncidenteController);
  });

  it('deve ser definido', () => {
    expect(controller).toBeDefined();
  });
});
