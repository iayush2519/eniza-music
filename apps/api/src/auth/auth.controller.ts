import { Body, Controller, HttpCode, HttpStatus, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';

import { AuthService, RequestContext } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { AuthResponseDto, UserProfileDto } from './dto/auth-response.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { RegisterDto } from './dto/register.dto';
import { ResendOtpDto } from './dto/resend-otp.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { LocalAuthGuard } from './guards/local-auth.guard';
import type { User } from '../database/schema';

function contextFromRequest(request: Request): RequestContext {
  return {
    userAgent: request.headers['user-agent'],
    ipAddress: request.ip,
  };
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto, @Req() request: Request): Promise<AuthResponseDto> {
    return this.authService.register(dto, contextFromRequest(request));
  }

  @UseGuards(LocalAuthGuard)
  @Post('login')
  login(
    // `LoginDto` is declared as the body type purely for OpenAPI/typing
    // purposes and so a malformed request is still rejected by the global
    // ValidationPipe. The actual credential check happens earlier, inside
    // `LocalAuthGuard` (guards run before pipes in Nest's request
    // pipeline), which reads `email`/`password` off the raw request body
    // via `LocalStrategy` and attaches the resulting user to the request.
    @Body() _dto: LoginDto,
    @CurrentUser() user: User,
    @Req() request: Request,
  ): Promise<AuthResponseDto> {
    return this.authService.login(user, contextFromRequest(request));
  }

  @Post('refresh')
  refresh(@Body() dto: RefreshDto): Promise<AuthResponseDto> {
    return this.authService.refresh(dto.refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Body() dto: RefreshDto): Promise<void> {
    await this.authService.logout(dto.refreshToken);
  }

  @Post('verify-otp')
  verifyOtp(@Body() dto: VerifyOtpDto): Promise<UserProfileDto> {
    return this.authService.verifyRegistrationOtp(dto.email, dto.code);
  }

  @Post('resend-otp')
  @HttpCode(HttpStatus.NO_CONTENT)
  async resendOtp(@Body() dto: ResendOtpDto): Promise<void> {
    await this.authService.resendRegistrationOtp(dto.email);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  async forgotPassword(@Body() dto: ForgotPasswordDto): Promise<void> {
    await this.authService.requestPasswordReset(dto.email);
  }

  @Post('forgot-password/verify')
  verifyForgotPasswordOtp(@Body() dto: VerifyOtpDto): Promise<{ resetToken: string }> {
    return this.authService.verifyPasswordResetOtp(dto.email, dto.code);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  async resetPassword(@Body() dto: ResetPasswordDto): Promise<void> {
    await this.authService.resetPassword(dto);
  }
}
