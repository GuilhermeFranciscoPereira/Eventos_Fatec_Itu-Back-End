import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Semester } from '@prisma/client'

export class ParticipantResponseDto {
    @ApiProperty({ example: 1, description: 'Identificador do participante.' })
    id!: number

    @ApiProperty({ example: 'Maria Oliveira', description: 'Nome do participante.' })
    name!: string

    @ApiProperty({ example: 'maria@fatec.sp.gov.br', description: 'E-mail do participante.' })
    email!: string

    @ApiPropertyOptional({ example: 1, nullable: true, description: 'Identificador do curso.' })
    courseId!: number | null

    @ApiPropertyOptional({ enum: Semester, example: Semester.SEMESTER3, nullable: true, description: 'Semestre do participante.' })
    semester!: Semester | null

    @ApiPropertyOptional({ example: '1234567890123', nullable: true, description: 'RA do participante.' })
    ra!: string | null

    @ApiProperty({ example: false, description: 'Indica se a presença foi confirmada.' })
    isPresent!: boolean

    @ApiProperty({ example: false, description: 'Indica se o certificado já foi enviado.' })
    certificateSent!: boolean

    @ApiProperty({ example: '2026-06-30T12:00:00.000Z', description: 'Data de criação.' })
    createdAt!: Date

    @ApiProperty({ example: '2026-06-30T12:00:00.000Z', description: 'Data da última atualização.' })
    updatedAt!: Date

    @ApiProperty({ example: 1, description: 'Identificador do evento.' })
    eventId!: number
}
