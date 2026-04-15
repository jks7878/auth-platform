import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

/** Services */
import { PrismaService } from '@/modules/prisma/prisma.service';
import { RefreshService } from './refresh.service';
import { TokenService } from '@/modules/token/token.service';
/** DTO */
import { SignUpDto } from './dto/sign-up.dto';
import { SignInDto } from './dto/sign-in.dto';


@Injectable()
export class AuthService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly refreshService: RefreshService,
    private readonly tokenService: TokenService
  ) {}

  async signup(signUpDto: SignUpDto) {
    const { username, password } = signUpDto;

    const existingUser = await this.prismaService.user.findUnique({
      where: { username },
    });

    if (existingUser) {
      throw new ConflictException('이미 사용 중인 사용자명입니다.');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await this.prismaService.user.create({
      data: {
        username,
        password: hashedPassword,
      },
      select: {
        id: true,
        createdAt: true,
      },
    });

    return user;
  }

  async signIn(signInDto: SignInDto) {
    const { username, password } = signInDto;

    const user = await this.prismaService.user.findUnique({
      where: {
        username,
      },
    });

    if (!user) {
      throw new UnauthorizedException("아이디 또는 비밀번호가 올바르지 않습니다.");
    }

    const isPasswordMatched = await bcrypt.compare(password, user.password);

    if (!isPasswordMatched) {
      throw new UnauthorizedException("아이디 또는 비밀번호가 올바르지 않습니다.");
    }
    
    const tokens = await this.tokenService.createAuthTokens(user.id, user.username);

    await this.refreshService.saveRefreshToken(user.id, tokens.refreshToken);

    return tokens;
  }
}
