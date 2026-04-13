import { Controller, Post, Body } from '@nestjs/common';

/** Service */
import { AuthService } from './auth.service';
/** DTO */
import { SignUpDto } from './dto/sign-up.dto';
import { SignInDto } from './dto/sign-in.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('sign-up')
  signUp(@Body() signUpdto: SignUpDto) {
    return this.authService.signup(signUpdto);
  }

  @Post('sign-in')
  signIn(@Body() signInDto: SignInDto) {
    return this.authService.signIn(signInDto);
  }
}
