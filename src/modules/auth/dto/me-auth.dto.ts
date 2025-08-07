import { Role } from '@prisma/client';

export class MeResponseDto {
    sub: number;
    name: string;
    imageUrl?: string;
    email: string;
    role: Role;
    exp: number;
    iat: number;
    refreshToken?: string;
    refreshTokenExp?: number;
    refreshTokenIat?: number;
}
