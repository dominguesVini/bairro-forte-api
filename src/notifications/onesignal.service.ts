import { Injectable, Logger } from '@nestjs/common';
import fetch from 'node-fetch';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class OneSignalService {
  private readonly logger = new Logger(OneSignalService.name);
  private appId?: string;
  private apiKey?: string;

  constructor(private config: ConfigService) {
    this.appId =
      this.config.get('ONESIGNAL_APP_ID') || process.env.ONESIGNAL_APP_ID;
    this.apiKey =
      this.config.get('ONESIGNAL_API_KEY') || process.env.ONESIGNAL_API_KEY;
  }

  async sendNotification(opts: {
    title?: string;
    message?: string;
    data?: Record<string, any>;
    include_player_ids?: string[];
    include_external_user_ids?: string[];
    template_id?: string;
    channel_for_external_user_ids?: 'push' | 'email' | 'sms';
  }) {
    if (!this.appId || !this.apiKey) {
      this.logger.warn('OneSignal credentials not configured');
      return null;
    }

    const body: any = {
      app_id: this.appId,
      data: opts.data || {},
    };

    if (opts.template_id) {
      body.template_id = opts.template_id;
    } else {
      body.headings = { en: opts.title || '' };
      body.contents = { en: opts.message || '' };
    }

    if (opts.channel_for_external_user_ids) {
      body.channel_for_external_user_ids = opts.channel_for_external_user_ids;
    }

    if (opts.include_player_ids && opts.include_player_ids.length)
      body.include_player_ids = opts.include_player_ids;
    if (opts.include_external_user_ids && opts.include_external_user_ids.length)
      body.include_external_user_ids = opts.include_external_user_ids;
    console.log('body:', body);
    try {
      const res = await fetch('https://onesignal.com/api/v1/notifications', {
        method: 'POST',
        headers: {
          Authorization: `Basic ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) {
        this.logger.warn('OneSignal returned non-ok: ' + JSON.stringify(json));
        return json;
      }
      this.logger.log('OneSignal sent: ' + JSON.stringify(json));
      return json;
    } catch (err) {
      this.logger.error('OneSignal send failed: ' + err.message);
      return null;
    }
  }
}
