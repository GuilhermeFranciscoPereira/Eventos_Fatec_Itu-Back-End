import { Course, Semester } from '@prisma/client';

export class ParticipantResponseDto {
    id!: number;
    name!: string;
    email!: string;
    course: Course | null;
    semester: Semester | null;
    ra: string | null;
    isPresent!: boolean;
    createdAt!: Date;
    updatedAt!: Date;
    eventId!: number;
}
