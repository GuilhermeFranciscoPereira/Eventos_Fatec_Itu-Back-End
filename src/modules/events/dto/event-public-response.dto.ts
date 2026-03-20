import { Semester } from '@prisma/client';

export class EventPublicResponseDto {
    id!: number;
    name!: string;
    description!: string;
    imageUrl!: string;
    courseId!: number | null;
    courseName!: string | null;
    semester!: Semester | null;
    maxParticipants!: number;
    currentParticipants!: number;
    isRestricted!: boolean;
    locationId!: number;
    locationName!: string;
    customLocation!: string | null;
    speakerName!: string;
    startDate!: Date;
    startTime!: Date;
    endTime!: Date;
    duration!: number | null;
    categoryId!: number | null;
}