import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CreateAppFailureDto } from './dto/create-app-failure.dto';

@Injectable()
export class ReportService {
  private sgMail: any;
  private readonly fromEmail: string;
  private readonly toEmail: string;

  constructor(private readonly config: ConfigService) {
    // Carrega @sendgrid/mail dinamicamente para facilitar mock em testes

    this.sgMail = require('@sendgrid/mail');
    const apiKey = this.config.get<string>('SENDGRID_API_KEY');
    this.fromEmail = this.config.get<string>('SENDGRID_FROM') || '';
    this.toEmail = this.config.get<string>('SENDGRID_TO') || '';
    if (apiKey) {
      this.sgMail.setApiKey(apiKey);
    }
  }

  // Envia um e-mail de reporte de falha do app
  async sendAppFailureReport(payload: CreateAppFailureDto) {
    const subject = `[Falha no app] ${payload.message?.slice(0, 80)}`;
    const html = `
      <h2>Falha reportada no app</h2>
      <p><strong>Mensagem:</strong> ${this.escape(payload.message)}</p>
      ${payload.stack ? `<pre style="white-space:pre-wrap">${this.escape(payload.stack)}</pre>` : ''}
      <ul>
        ${payload.appVersion ? `<li><strong>Versão:</strong> ${this.escape(payload.appVersion)}</li>` : ''}
        ${payload.platform ? `<li><strong>Plataforma:</strong> ${this.escape(payload.platform)}</li>` : ''}
        ${payload.userEmail ? `<li><strong>Usuário:</strong> ${this.escape(payload.userEmail)}</li>` : ''}
      </ul>
      ${payload.extra ? `<details><summary>Extra</summary><pre>${this.escape(payload.extra)}</pre></details>` : ''}
    `;

    const msg = {
      to: this.toEmail,
      from: this.config.get<string>('SENDGRID_FROM'),
      subject,
      text: `${payload.message}\n\n${payload.stack || ''}`.trim(),
      html,
    };

    await this.sgMail.send(msg);
    return { ok: true };
  }

  private escape(s: string) {
    return (s || '').replace(
      /[&<>]/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c] as string,
    );
  }
}
