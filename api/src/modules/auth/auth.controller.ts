import { Controller, UseGuards, Post, Get, Req, Res, Body, ForbiddenException } from '@nestjs/common';
import { Request, Response } from 'express';
import ms from 'ms';
import type { StringValue } from 'ms';

/** Guards */
import { JwtAccessGuard } from './guards/jwt-access.guard';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
/** Services */
import { AuthService } from './auth.service';
import { RefreshService } from './refresh.service';
import { TokenService } from '@/modules/token/token.service';
/** DTO */
import { SignUpDto } from './dto/sign-up.dto';
import { SignInDto } from './dto/sign-in.dto';
import { ReplayRefreshDto } from './dto/replay-refresh.dto';
/** Decorators */
import { CurrentUser } from './decorators/current-user.decorator';
import { ConfigService } from '@nestjs/config';


@Controller('auth')
export class AuthController {
  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
    private readonly refreshService: RefreshService,
    private readonly tokenService: TokenService
  ) {}

  @Post('sign-up')
  signUp(@Body() signUpDto: SignUpDto) {
    return this.authService.signup(signUpDto);
  }

  @Post('sign-in')
  async signIn(
    @Body() signInDto: SignInDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const createdTokens = await this.authService.signIn(signInDto);

    response.cookie('accessToken', createdTokens.accessToken, this.getAccessTokenCookieOptions());
    response.cookie('refreshToken', createdTokens.refreshToken, this.getRefreshTokenCookieOptions());

    return {
      success: true,
    };
  }

  @UseGuards(JwtAccessGuard)
  @Get('me')
  getMe(@CurrentUser() user: { userId: number, username: string }) {
    return user;
  }

  @UseGuards(JwtRefreshGuard)
  @Post('refresh')
  async refresh(
    @CurrentUser() user: { userId: number, username: string },
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const refreshToken = request.cookies?.refreshToken as string;
    
    const refreshedTokens = await this.refreshService.refresh(user.userId, user.username, refreshToken);

    response.cookie('accessToken', refreshedTokens.accessToken, this.getAccessTokenCookieOptions());
    response.cookie('refreshToken', refreshedTokens.refreshToken, this.getRefreshTokenCookieOptions());

    return {
      success: true,
    };
  }

  @Post('sign-out')
  async signOut(
    @Res({ passthrough: true }) response: Response,
    ) {
    response.clearCookie('accessToken', {
      httpOnly: true,
      secure: this.configService.get<string>('NODE_ENV') === 'production',
      sameSite: 'strict',
      path: '/',
    });
    response.clearCookie('refreshToken', {
      httpOnly: true,
      secure: this.configService.get<string>('NODE_ENV') === 'production',
      sameSite: 'strict',
      path: '/',
    });

  return {
    success: true,
    message: 'Signed out successfully',
  };
  }

  private getAccessTokenCookieOptions() {
    return {
      httpOnly: true,
      secure: this.configService.get<string>('NODE_ENV') === 'production',
      sameSite: 'strict' as const,
      path: '/',
      maxAge: ms(this.configService.get<StringValue>('JWT_ACCESS_EXPIRES_IN')!),
    };
  }

  private getRefreshTokenCookieOptions() {
    return {
      httpOnly: true,
      secure: this.configService.get<string>('NODE_ENV') === 'production',
      sameSite: 'strict' as const,
      path: '/',
      maxAge: ms(this.configService.get<StringValue>('JWT_REFRESH_EXPIRES_IN')!),
    };
  }

  @Post('test/capture-refresh-token')
  async getRefresh(   
    @Req() request: Request
  ) {
    const refreshToken = request.cookies?.refreshToken as string;

    return {
      success: true,
      refreshToken: refreshToken
    };
  }

  @Post('test/replay-refresh-token')
  async replayRefresh(
    @Body() replayRefreshDto: ReplayRefreshDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    if (this.configService.get<string>('NODE_ENV') === 'production') {
      throw new ForbiddenException('Replay endpoint is disabled in production.');
    }

    const payload = await this.tokenService.verifyRefreshToken(
      replayRefreshDto.refreshToken,
    );
    
    const refreshedTokens = await this.refreshService.refresh(
      payload.sub,
      payload.username,
      replayRefreshDto.refreshToken,
    );

    response.cookie('accessToken', refreshedTokens.accessToken, this.getAccessTokenCookieOptions());
    response.cookie('refreshToken', refreshedTokens.refreshToken, this.getRefreshTokenCookieOptions());

    return {
      success: true,
    };
  }
}
