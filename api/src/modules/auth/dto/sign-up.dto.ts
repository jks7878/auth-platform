import { IsString, MinLength, MaxLength, Matches } from 'class-validator';
import { AuthCredentialsDto } from './auth-credentials.dto';

export class SignUpDto implements AuthCredentialsDto {
    @IsString()
    @MinLength(4)
    @MaxLength(20)
    @Matches(/^[a-zA-Z0-9_]+$/, {
    message: 'username은 영문, 숫자, underscore(_)만 사용할 수 있습니다.',
    })
    username!: string;

    @IsString()
    @MinLength(8)
    @MaxLength(64)
    password!: string;
}
