// src/auth/optional-firebase-auth.guard.ts
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { firebaseAuth } from './firebase-admin.provider';

@Injectable()
export class OptionalFirebaseAuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const authHeader = req.headers.authorization;

    // Se não tiver header de autorização, permite acesso mas sem user no request
    if (!authHeader?.startsWith('Bearer ')) {
      return true;
    }

    const idToken = authHeader.split('Bearer ')[1];
    try {
      const decoded = await firebaseAuth.verifyIdToken(idToken);
      req.user = decoded; // Define o usuário no request se o token for válido
    } catch (err) {
      // Se o token for inválido, apenas não define o usuário, mas permite acesso
      console.warn('Token inválido, mas permitindo acesso:', err.message);
    }

    // Sempre permite acesso
    return true;
  }
}
