import { randomUUID } from 'node:crypto';

import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

import { AuthResponseDto, UserProfileDto } from './dto/auth-response.dto';
import { RegisterDto } from './dto/register.dto';
import { PasswordService } from './password.service';
import { SessionsService } from './sessions.service';
import { AccessTokenPayload, RefreshTokenPayload } from './types/jwt-payload.type';
import { parseDurationToMs } from './utils/parse-duration';
import { EnvironmentVariables } from '../config/env.validation';
import { User } from '../database/schema';
import { UsersService } from '../users/users.service';

export type RequestContext = {
  userAgent?: string;
  ipAddress?: string;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly sessionsService: SessionsService,
    private readonly passwordService: PasswordService,
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

    return this.issueTokensForNewSession(user, context);
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
    };
  }
}
