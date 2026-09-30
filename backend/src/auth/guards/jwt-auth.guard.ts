import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Requires a valid `Authorization: Bearer <token>` header. Populates
 * request.user with the JwtPayload on success (see JwtStrategy.validate).
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
