import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class ApiKeyAuthGuard implements CanActivate {
  private readonly API_KEY = process.env.API_KEY;

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const apiKey = this.extractApiKeyFromHeader(request);
    
    if (!apiKey) {
      throw new UnauthorizedException('API key is missing');
    }
    
    if (apiKey !== this.API_KEY) {
      throw new UnauthorizedException('Invalid API key');
    }
    
    return true;
  }

  private extractApiKeyFromHeader(request: Request): string | undefined {
    const authHeader = request.header('X-API-Key');
    return authHeader;
  }
}
