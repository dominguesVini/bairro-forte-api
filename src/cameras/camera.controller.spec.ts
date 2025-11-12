import { Test, TestingModule } from '@nestjs/testing';
import { CameraController } from './camera.controller';
import { CameraService } from './camera.service';

describe('CamerasController', () => {
  let controller: CameraController;

  let serviceMock: { delete: jest.Mock };

  beforeEach(async () => {
    serviceMock = { delete: jest.fn().mockResolvedValue({ status: true }) };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CameraController],
      providers: [
        { provide: CameraService, useValue: serviceMock },
      ],
    }).compile();

    controller = module.get<CameraController>(CameraController);
  });

  it('deve ser definido', () => {
    expect(controller).toBeDefined();
  });

  it('delete deve encaminhar cameraId e email', async () => {
    const req: any = { user: { email: 'mail@test.com' } };
    await controller.delete(123, req);
    expect(serviceMock.delete).toHaveBeenCalledWith(123, 'mail@test.com');
  });
});
