import { Semester } from '@prisma/client';

export class EventPublicResponseDto {
    id!: number;
    name!: string;
    description!: string;
    imageUrl!: string;
    courseId!: number | null;
    courseName!: string | null;
    courseIds!: number[];
    courseNames!: string[];
    semester!: Semester | null;
    maxParticipants!: number;
    currentParticipants!: number;
    isRestricted!: boolean;
    locationId!: number;
    locationName!: string;
    customLocation!: string | null;
    speakerName!: string;
    startDate!: Date;
    endDate!: Date | null;
    startTime!: Date;
    endTime!: Date;
    duration!: number | null;
    categoryId!: number | null;
}
