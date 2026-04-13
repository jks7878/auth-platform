import { IsNotEmpty, IsString } from "class-validator";
import { AuthCredentialsDto } from "./auth-credentials.dto";

export class SignInDto implements AuthCredentialsDto {
    @IsNotEmpty()
    @IsString()
    username!: string;

    @IsNotEmpty()
    @IsString()
    password!: string;
}
