import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { JwtPayload } from '../jwt-payload.interface';

/**
 * Injects the authenticated user's JWT payload into a controller method,
 * e.g.: `whoAmI(@CurrentUser() user: JwtPayload) { ... }`
 * Only populated behind JwtAuthGuard.
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): JwtPayload => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
