import { Test, TestingModule } from '@nestjs/testing';
import { ReportController } from './report.controller';
import { ReportService } from './report.service';

describe('ReportController', () => {
  let controller: ReportController;
  let serviceMock: { sendAppFailureReport: jest.Mock };

  beforeEach(async () => {
    serviceMock = { sendAppFailureReport: jest.fn().mockResolvedValue({ ok: true }) };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReportController],
      providers: [{ provide: ReportService, useValue: serviceMock }],
    }).compile();
    controller = module.get(ReportController);
  });

  it('deve ser definido', () => {
    expect(controller).toBeDefined();
  });

  it('POST /reports/app-failure deve delegar para service e retornar mensagem', async () => {
    const body = { message: 'Falha X' } as any;
    const res = await controller.appFailure(body);
    expect(serviceMock.sendAppFailureReport).toHaveBeenCalledWith(body);
    expect(res).toEqual({ message: 'Reporte recebido e e-mail enviado.' });
  });
});
