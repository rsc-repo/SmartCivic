import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../../common/enums';

export const ROLES_KEY = 'roles';

/**
 * Restrict a route to one or more roles, e.g.:
 *   @Roles(UserRole.OFFICER, UserRole.DEPT_ADMIN)
 *   @UseGuards(JwtAuthGuard, RolesGuard)
 *   @Patch(':id/status')
 *   updateStatus() { ... }
 *
 * Must be paired with RolesGuard (and JwtAuthGuard to populate
 * request.user in the first place).
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
