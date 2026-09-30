import { UserRole } from '../common/enums';

export interface JwtPayload {
  sub: number; // user id
  email: string;
  role: UserRole;
}
