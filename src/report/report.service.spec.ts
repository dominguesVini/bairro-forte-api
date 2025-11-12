import { Test, TestingModule } from '@nestjs/testing';
import { ReportService } from './report.service';
import { ConfigService } from '@nestjs/config';

jest.mock('@sendgrid/mail', () => ({
  setApiKey: jest.fn(),
  send: jest.fn().mockResolvedValue({}),
}));

describe('ReportService', () => {
  let service: ReportService;
  const configMock = {
    get: (key: string) => {
      if (key === 'SENDGRID_API_KEY') return 'SG_KEY';
      if (key === 'SENDGRID_FROM') return 'from@test.com';
      if (key === 'SENDGRID_TO') return 'to@test.com';
      return undefined;
    },
  } as Partial<ConfigService> as ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ReportService, { provide: ConfigService, useValue: configMock }],
    }).compile();
    service = module.get(ReportService);
  });

  it('deve enviar email de falha com sucesso', async () => {
    const payload = {
      message: 'Erro X',
      stack: 'Stacktrace',
      appVersion: '1.0.0',
      platform: 'android',
      userEmail: 'user@mail.com',
      extra: '{"foo": "bar"}',
    };
    const res = await service.sendAppFailureReport(payload as any);
    expect(res).toEqual({ ok: true });
    const sg = require('@sendgrid/mail');
    expect(sg.send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'to@test.com',
        from: 'from@test.com',
        subject: expect.stringContaining('[App Failure]'),
      }),
    );
  });
});
