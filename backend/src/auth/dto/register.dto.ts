import { IsEmail, IsString, MinLength } from 'class-validator';

// Public self-registration always creates a CITIZEN account. Elevated
// roles (OFFICER / DEPT_ADMIN / SYSTEM_ADMIN) are provisioned separately
// by an admin (see the admin user-management endpoints added in a later
// phase) — never accepted from this public-facing DTO, to avoid privilege
// escalation via the registration endpoint.
export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  password: string;

  @IsString()
  @MinLength(2)
  fullName: string;
}
