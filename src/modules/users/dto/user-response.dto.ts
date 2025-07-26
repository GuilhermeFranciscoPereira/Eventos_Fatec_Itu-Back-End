import { Role } from '@prisma/client';

export class UserResponseDto {
    id: number;
    name: string;
    email: string;
    role: Role;
    createdAt: Date;
    updatedAt: Date;
}
