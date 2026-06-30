import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsEmail, MinLength, MaxLength, Matches, IsEnum, IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateUserDto {
  @ApiProperty({
    example: 'coordenador@fatec.sp.gov.br',
    maxLength: 191,
    description: 'E-mail institucional do usuário.',
  })
  @Transform(({ value }) => typeof value === 'string' ? value.trim().toLowerCase() : value)
  @IsEmail({}, { message: 'Formato de e-mail inválido' })
  @Matches(/@(?:fatec\.sp\.gov\.br|cms\.sp\.gov\.br|cps\.sp\.gov\.br)$/, {
    message: 'E-mail deve ser @fatec.sp.gov.br, @cms.sp.gov.br ou @cps.sp.gov.br',
  })
  @MaxLength(191, { message: 'E-mail deve ter no máximo 191 caracteres' })
  email!: string;

  @ApiProperty({
    example: 'Senha@123',
    minLength: 6,
    writeOnly: true,
    description: 'Senha inicial do usuário. Não é retornada pela API.',
  })
  @MinLength(6, { message: 'Senha deve ter ao menos 6 caracteres' })
  @Matches(/(?=.*[A-Z])/, { message: 'Senha deve conter ao menos uma letra maiúscula' })
  @Matches(/(?=.*[a-z])/, { message: 'Senha deve conter ao menos uma letra minúscula' })
  @Matches(/(?=.*\d)/, { message: 'Senha deve conter ao menos um número' })
  @Matches(/(?=.*[^A-Za-z0-9])/, { message: 'Senha deve conter ao menos um caractere especial' })
  password!: string;

  @ApiProperty({
    enum: Role,
    example: Role.COORDENADOR,
    description: 'Perfil de acesso do usuário.',
  })
  @IsEnum(Role, { message: 'Papel inválido' })
  role!: Role;

  @ApiProperty({
    example: 'Coordenador Fatec',
    minLength: 3,
    maxLength: 120,
    description: 'Nome do usuário.',
  })
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString({ message: 'Nome deve ser uma string' })
  @IsNotEmpty({ message: 'Nome não pode ser vazio' })
  @MinLength(3, { message: 'Nome deve ter ao menos 3 caracteres' })
  @MaxLength(120, { message: 'Nome deve ter no máximo 120 caracteres' })
  name!: string;

  @ApiPropertyOptional({
    example: 'https://res.cloudinary.com/demo/image/upload/profile.jpg',
    description: 'URL da imagem de perfil, quando cadastrada.',
  })
  @IsOptional()
  imageUrl?: string;
}
