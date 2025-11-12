// src/auth/firebase-auth.guard.ts
import {
    CanActivate,
    ExecutionContext,
    Injectable,
    UnauthorizedException,
  } from '@nestjs/common';
  import { firebaseAuth } from './firebase-admin.provider';
  
  @Injectable()
  export class FirebaseAuthGuard implements CanActivate {
    async canActivate(context: ExecutionContext): Promise<boolean> {
      const req = context.switchToHttp().getRequest();
      const authHeader = req.headers.authorization;
  
      if (!authHeader?.startsWith('Bearer ')) {
        throw new UnauthorizedException('Token ausente ou inválido');
      }
  
      const idToken = authHeader.split(' ')[1];
      try {
        const decoded = await firebaseAuth.verifyIdToken(idToken);
        req.user = decoded;
        return true;
      } catch (err) {
        throw new UnauthorizedException('Token inválido');
      }
    }
  }
  