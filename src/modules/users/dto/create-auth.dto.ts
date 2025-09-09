import { Role } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsEmail, MinLength, MaxLength, Matches, IsEnum, IsString, IsNotEmpty } from 'class-validator';

export class CreateUserDto {
  @Transform(({ value }) => typeof value === 'string' ? value.trim().toLowerCase() : value)
  @IsEmail({}, { message: 'Formato de e-mail inválido' })
  @Matches(/@(?:fatec\.sp\.gov\.br|cms\.sp\.gov\.br)$/, { message: 'E-mail deve ser @fatec.sp.gov.br ou @cms.sp.gov.br' })
  @MaxLength(191, { message: 'E-mail deve ter no máximo 191 caracteres' })
  email!: string;

  @MinLength(6, { message: 'Senha deve ter ao menos 6 caracteres' })
  @MaxLength(10, { message: 'Senha deve ter no máximo 10 caracteres' })
  @Matches(/(?=.*[A-Z])/, { message: 'Senha deve conter ao menos uma letra maiúscula' })
  @Matches(/(?=.*[a-z])/, { message: 'Senha deve conter ao menos uma letra minúscula' })
  @Matches(/(?=.*\d)/, { message: 'Senha deve conter ao menos um número' })
  @Matches(/(?=.*[^A-Za-z0-9])/, { message: 'Senha deve conter ao menos um caractere especial' })
  password!: string;

  @IsEnum(Role, { message: 'Papel inválido' })
  role!: Role;

  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString({ message: 'Nome deve ser uma string' })
  @IsNotEmpty({ message: 'Nome não pode ser vazio' })
  @MinLength(3, { message: 'Nome deve ter ao menos 3 caracteres' })
  @MaxLength(120, { message: 'Nome deve ter no máximo 120 caracteres' })
  name!: string;

  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsNotEmpty({ message: 'URL da imagem não pode ser vazia' })
  @MaxLength(2048, { message: 'URL deve ter no máximo 2048 caracteres' })
  imageUrl?: string;
}
