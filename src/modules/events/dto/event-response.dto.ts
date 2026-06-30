import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Semester } from '@prisma/client';
import { ParticipantResponseDto } from '../../participants/dto/participant-response.dto';

export class EventResponseDto {
    @ApiProperty({ example: 1, description: 'Identificador do evento.' })
    id!: number;

    @ApiProperty({ example: 'Hackathon Fatec Itu', description: 'Nome do evento.' })
    name!: string;

    @ApiProperty({ example: 'Competição prática de desenvolvimento de soluções tecnológicas.', description: 'Descrição do evento.' })
    description!: string;

    @ApiProperty({ example: 'https://res.cloudinary.com/demo/image/upload/event.jpg', description: 'URL da imagem do evento.' })
    imageUrl!: string;

    @ApiPropertyOptional({ example: 1, nullable: true, description: 'Curso legado associado ao evento.' })
    courseId!: number | null;

    @ApiPropertyOptional({ example: 'Análise e Desenvolvimento de Sistemas', nullable: true, description: 'Nome do curso legado associado.' })
    courseName!: string | null;

    @ApiProperty({ example: [1, 2], type: [Number], description: 'Cursos associados ao evento.' })
    courseIds!: number[];

    @ApiProperty({ example: ['Análise e Desenvolvimento de Sistemas', 'Gestão da Tecnologia da Informação'], type: [String], description: 'Nomes dos cursos associados ao evento.' })
    courseNames!: string[];

    @ApiPropertyOptional({ enum: Semester, example: Semester.ALL, nullable: true, description: 'Semestre permitido, quando houver restrição.' })
    semester!: Semester | null;

    @ApiProperty({ example: 100, description: 'Quantidade máxima de participantes.' })
    maxParticipants!: number;

    @ApiProperty({ example: 40, description: 'Quantidade atual de participantes inscritos.' })
    currentParticipants!: number;

    @ApiProperty({ example: true, description: 'Indica se o evento possui restrições de inscrição.' })
    isRestricted!: boolean;

    @ApiProperty({ example: 1, description: 'Identificador do local.' })
    locationId!: number;

    @ApiProperty({ example: 'Auditório Principal', description: 'Nome do local.' })
    locationName!: string;

    @ApiPropertyOptional({ example: 'Pátio central', nullable: true, description: 'Local customizado, quando houver.' })
    customLocation!: string | null;

    @ApiProperty({ example: 'Prof. João Silva', description: 'Palestrante ou responsável.' })
    speakerName!: string;

    @ApiProperty({ example: '2026-06-29T00:00:00.000Z', description: 'Data inicial do evento.' })
    startDate!: Date;

    @ApiPropertyOptional({ example: '2026-07-03T00:00:00.000Z', nullable: true, description: 'Data final para eventos com mais de um dia.' })
    endDate!: Date | null;

    @ApiProperty({ example: '2026-06-29T08:00:00.000Z', description: 'Horário inicial.' })
    startTime!: Date;

    @ApiProperty({ example: '2026-06-29T18:00:00.000Z', description: 'Horário final.' })
    endTime!: Date;

    @ApiPropertyOptional({ example: 480, nullable: true, description: 'Duração em minutos, quando cadastrada.' })
    duration!: number | null;

    @ApiPropertyOptional({ example: 1, nullable: true, description: 'Identificador da categoria.' })
    categoryId!: number | null;

    @ApiProperty({ example: '2026-06-30T12:00:00.000Z', description: 'Data de criação.' })
    createdAt!: Date;

    @ApiProperty({ example: '2026-06-30T12:00:00.000Z', description: 'Data da última atualização.' })
    updatedAt!: Date;

    @ApiPropertyOptional({ type: () => [ParticipantResponseDto], description: 'Participantes vinculados ao evento, quando carregados.' })
    participants?: ParticipantResponseDto[];

    @ApiPropertyOptional({ example: 'presenca-hackathon', nullable: true, description: 'Palavra secreta de presença, visível apenas em rotas administrativas.' })
    presenceSecret!: string | null;
}
