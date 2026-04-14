import { Module } from '@nestjs/common';

/** Module */
import { JwtModule } from '@nestjs/jwt';
/** Serivce */
import { TokenService } from './token.service';

@Module({
  imports: [
    JwtModule.register({}),
  ],
  providers: [TokenService],
  exports: [TokenService]
})
export class TokenModule {}
