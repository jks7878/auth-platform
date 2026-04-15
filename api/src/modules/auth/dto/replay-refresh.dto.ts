import { IsString, MinLength } from 'class-validator';

export class ReplayRefreshDto {
  @IsString()
  @MinLength(1)
  refreshToken!: string;
}
