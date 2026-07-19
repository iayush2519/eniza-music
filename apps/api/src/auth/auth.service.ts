import { randomUUID } from 'node:crypto';

import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

import { AuthResponseDto, UserProfileDto } from './dto/auth-response.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { OtpService } from './otp/otp.service';
import { PasswordService } from './password.service';
import { SessionsService } from './sessions.service';
import {
  AccessTokenPayload,
  PasswordResetTokenPayload,
  RefreshTokenPayload,
} from './types/jwt-payload.type';
import { parseDurationToMs } from './utils/parse-duration';
import { EnvironmentVariables } from '../config/env.validation';
import { User } from '../database/schema';
import { UsersService } from '../users/users.service';

export type RequestContext = {
  userAgent?: string;
  ipAddress?: string;
};

/** Reset tokens are single-purpose and short-lived by design (see
 * PasswordResetTokenPayload's doc comment) — 10 minutes gives a user
 * enough time to check their email and return without leaving a
 * long-lived credential-adjacent token outstanding. */
const PASSWORD_RESET_TOKEN_TTL = '10m';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly sessionsService: SessionsService,
    private readonly passwordService: PasswordService,
    private readonly otpService: OtpService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService<EnvironmentVariables, true>,
  ) {}

  async register(dto: RegisterDto, context: RequestContext): Promise<AuthResponseDto> {
    const existing = await this.usersService.findByEmail(dto.email);

    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    const passwordHash = await this.passwordService.hash(dto.password);
    const user = await this.usersService.create({
      email: dto.email,
      passwordHash,
      displayName: dto.displayName,
    });

    await this.otpService.issue({ userId: user.id, email: user.email, purpose: 'register' });

    return this.issueTokensForNewSession(user, context);
  }

  /**
   * Verifies the OTP sent on registration and marks the account
   * verified. Does not itself gate login/session issuance — an
   * unverified account can already authenticate (tokens were issued at
   * registration time above); verification status is enforced by the
   * mobile app's own navigation guard, not the API, per this module's
   * existing "endpoints stay minimal, client owns UX gating" pattern
   * (see users.schema.ts's `emailVerified` doc comment).
   */
  async verifyRegistrationOtp(email: string, code: string): Promise<UserProfileDto> {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new BadRequestException('Invalid verification code');
    }

    const isValid = await this.otpService.verify({ userId: user.id, purpose: 'register', code });
    if (!isValid) {
      throw new BadRequestException('Invalid or expired verification code');
    }

    const verifiedUser = await this.usersService.markEmailVerified(user.id);
    return this.toProfileDto(verifiedUser);
  }

  async resendRegistrationOtp(email: string): Promise<void> {
    const user = await this.usersService.findByEmail(email);
    // Deliberately silent on an unknown email (same reasoning as
    // `requestPasswordReset` below) — do not reveal account existence to
    // an unauthenticated caller.
    if (!user || user.emailVerified) {
      return;
    }

    await this.otpService.issue({ userId: user.id, email: user.email, purpose: 'register' });
  }

  /**
   * Starts the forgot-password flow: issues an OTP if the email belongs
   * to an account. Always resolves successfully regardless of whether
   * the email exists — revealing "this email has no account" to an
   * unauthenticated caller is an account-enumeration leak, so the same
   * generic outcome is returned either way, and the mobile client always
   * shows the same "check your email" state.
   */
  async requestPasswordReset(email: string): Promise<void> {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      return;
    }

    await this.otpService.issue({ userId: user.id, email: user.email, purpose: 'password_reset' });
  }

  /**
   * Verifies a password-reset OTP and, on success, returns a short-lived
   * reset token the client presents to `resetPassword` — the client
   * never handles the OTP again after this call, mirroring the
   * register-then-tokens shape of `register`/`login` above.
   */
  async verifyPasswordResetOtp(email: string, code: string): Promise<{ resetToken: string }> {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new BadRequestException('Invalid verification code');
    }

    const isValid = await this.otpService.verify({
      userId: user.id,
      purpose: 'password_reset',
      code,
    });
    if (!isValid) {
      throw new BadRequestException('Invalid or expired verification code');
    }

    const payload: PasswordResetTokenPayload = {
      sub: user.id,
      purpose: 'password_reset',
      jti: randomUUID(),
    };
    const resetToken = this.jwtService.sign(payload, {
      secret: this.config.get('JWT_ACCESS_SECRET', { infer: true }),
      expiresIn: PASSWORD_RESET_TOKEN_TTL,
    });

    return { resetToken };
  }

  /**
   * Completes a password reset. Revokes every session for the user (see
   * SessionsService.revokeAllForUser) — a password change should force
   * re-authentication everywhere, not just leave other logged-in devices
   * holding a now-orphaned credential.
   */
  async resetPassword(dto: ResetPasswordDto): Promise<void> {
    const payload = this.verifyPasswordResetToken(dto.resetToken);

    const user = await this.usersService.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('User no longer exists');
    }

    const passwordHash = await this.passwordService.hash(dto.newPassword);
    await this.usersService.updatePassword(user.id, passwordHash);
    await this.sessionsService.revokeAllForUser(user.id);
  }

  private verifyPasswordResetToken(token: string): PasswordResetTokenPayload {
    try {
      const payload = this.jwtService.verify<PasswordResetTokenPayload>(token, {
        secret: this.config.get('JWT_ACCESS_SECRET', { infer: true }),
      });
      if (payload.purpose !== 'password_reset') {
        throw new Error('wrong token purpose');
      }
      return payload;
    } catch {
      throw new UnauthorizedException('Reset token is invalid or has expired');
    }
  }

  /**
   * Called after `LocalAuthGuard` (via `LocalStrategy.validate`) has
   * already confirmed the email/password pair is correct. The controller
   * never sees the plaintext password beyond that point.
   */
  async login(user: User, context: RequestContext): Promise<AuthResponseDto> {
    return this.issueTokensForNewSession(user, context);
  }

  async refresh(refreshToken: string): Promise<AuthResponseDto> {
    const payload = this.verifyRefreshToken(refreshToken);

    const session = await this.sessionsService.findActiveById(payload.sessionId);

    if (!session) {
      throw new UnauthorizedException('Session not found or has been revoked');
    }

    const isTokenValid = await this.sessionsService.verifyRefreshToken(session, refreshToken);

    if (!isTokenValid) {
      // The presented token doesn't match what's on record for this
      // session. This can only happen if a previously-rotated (and
      // therefore stale) refresh token is being replayed — revoke the
      // session outright rather than silently rejecting, since this is a
      // strong signal of token theft.
      await this.sessionsService.revoke(session.id);
      throw new UnauthorizedException('Refresh token is invalid or has already been used');
    }

    const user = await this.usersService.findById(payload.sub);

    if (!user) {
      throw new UnauthorizedException('User no longer exists');
    }

    const accessToken = this.signAccessToken(user);
    const newRefreshToken = this.signRefreshToken(user, session.id);
    const refreshExpiresAt = this.computeExpiryDate('JWT_REFRESH_EXPIRES_IN');

    await this.sessionsService.rotateRefreshToken(session.id, newRefreshToken, refreshExpiresAt);

    return {
      accessToken,
      refreshToken: newRefreshToken,
      user: this.toProfileDto(user),
    };
  }

  async logout(refreshToken: string): Promise<void> {
    const payload = this.verifyRefreshToken(refreshToken);
    await this.sessionsService.revoke(payload.sessionId);
  }

  private async issueTokensForNewSession(
    user: User,
    context: RequestContext,
  ): Promise<AuthResponseDto> {
    // The session id is generated up front (rather than left to the DB's
    // default) so the refresh JWT can embed it in the same step the
    // session row is created — no placeholder token or follow-up rotation
    // needed to keep the token and the stored hash in sync.
    const sessionId = randomUUID();
    const accessToken = this.signAccessToken(user);
    const refreshToken = this.signRefreshToken(user, sessionId);
    const refreshExpiresAt = this.computeExpiryDate('JWT_REFRESH_EXPIRES_IN');

    await this.sessionsService.create({
      id: sessionId,
      userId: user.id,
      refreshToken,
      expiresAt: refreshExpiresAt,
      userAgent: context.userAgent,
      ipAddress: context.ipAddress,
    });

    return {
      accessToken,
      refreshToken,
      user: this.toProfileDto(user),
    };
  }

  private signAccessToken(user: User): string {
    return this.jwtService.sign({ sub: user.id } satisfies AccessTokenPayload, {
      secret: this.config.get('JWT_ACCESS_SECRET', { infer: true }),
      expiresIn: this.config.get('JWT_ACCESS_EXPIRES_IN', { infer: true }),
    });
  }

  private signRefreshToken(user: User, sessionId: string): string {
    const payload: RefreshTokenPayload = { sub: user.id, sessionId, jti: randomUUID() };
    return this.jwtService.sign(payload, {
      secret: this.config.get('JWT_REFRESH_SECRET', { infer: true }),
      expiresIn: this.config.get('JWT_REFRESH_EXPIRES_IN', { infer: true }),
    });
  }

  private verifyRefreshToken(refreshToken: string): RefreshTokenPayload {
    try {
      return this.jwtService.verify<RefreshTokenPayload>(refreshToken, {
        secret: this.config.get('JWT_REFRESH_SECRET', { infer: true }),
      });
    } catch {
      throw new UnauthorizedException('Refresh token is invalid or has expired');
    }
  }

  private computeExpiryDate(key: 'JWT_REFRESH_EXPIRES_IN'): Date {
    const durationMs = parseDurationToMs(this.config.get(key, { infer: true }));
    return new Date(Date.now() + durationMs);
  }

  private toProfileDto(user: User): UserProfileDto {
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      isArtist: user.isArtist,
      emailVerified: user.emailVerified,
    };
  }
}
