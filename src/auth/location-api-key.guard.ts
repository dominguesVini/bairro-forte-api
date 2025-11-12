import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class LocationApiKeyGuard implements CanActivate {
  private readonly expectedKey: string;

  constructor(private readonly config: ConfigService) {
    this.expectedKey = this.config.get<string>('API_KEY')!;
  }

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const headerKey = (req.headers['x-api-key'] || req.headers['X-API-Key']) as
      | string
      | undefined;
    if (!headerKey || headerKey !== this.expectedKey) {
      throw new UnauthorizedException('API key inválida');
    }
    return true;
  }
}
